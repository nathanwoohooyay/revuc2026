from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import json
import time
import shutil
import numpy as np
import librosa
import requests
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="PitchPurrfect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LIBRARY_PATH = os.path.join(os.path.dirname(__file__), "library")
TEMP_DIR     = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

app.mount("/audio", StaticFiles(directory=LIBRARY_PATH), name="audio")

sessions: Dict[str, Dict[str, Any]] = {}

# ─────────────────────────────────────────
# ENV / THIRD-PARTY CONFIG
# ─────────────────────────────────────────

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")

# ─────────────────────────────────────────
# AUDIO ANALYSIS
# ─────────────────────────────────────────

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def hz_to_note_name(freq_hz: float) -> Optional[str]:
    """Convert a frequency in Hz to the nearest note name (e.g. 'A4', 'C#3')."""
    if freq_hz <= 0:
        return None
    midi_num = 12 * np.log2(freq_hz / 440.0) + 69
    midi_int = int(round(midi_num))
    if midi_int < 0 or midi_int > 127:
        return None
    octave    = (midi_int // 12) - 1
    note      = NOTE_NAMES[midi_int % 12]
    return f"{note}{octave}"


def note_name_to_pitch_class(note_name: str) -> Optional[str]:
    """Strip octave from note name to get pitch class, e.g. 'A4' → 'A'."""
    if not note_name:
        return None
    # Remove trailing digits / minus sign for octave
    return note_name.rstrip('0123456789').rstrip('-')


def analyze_reference(audio_path: str):
    y, sr = librosa.load(audio_path, sr=None)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    return {
        "tempo":      float(tempo.item() if hasattr(tempo, "item") else tempo[0]),
        "beat_times": beat_times.tolist(),
    }


def detect_player_onsets(audio_path: str):
    y, sr = librosa.load(audio_path, sr=None)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times  = librosa.frames_to_time(onset_frames, sr=sr)
    return onset_times.tolist()


# ─────────────────────────────────────────
# PITCH / NOTE DETECTION
# ─────────────────────────────────────────

def detect_pitch_notes(audio_path: str, hop_length: int = 512) -> List[dict]:
    y, sr       = librosa.load(audio_path, sr=None)
    fmin        = librosa.note_to_hz('C2')
    fmax        = librosa.note_to_hz('C7')

    # pyin returns (f0, voiced_flag, voiced_probabilities)
    f0, voiced_flag, _ = librosa.pyin(y, fmin=fmin, fmax=fmax, sr=sr, hop_length=hop_length)

    frame_times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=hop_length)

    notes = []
    for i, freq in enumerate(f0):
        if not voiced_flag[i]:           # ← skip unvoiced frames
            continue
        if freq is None or np.isnan(freq):
            continue
        note = hz_to_note_name(float(freq))
        if note is None:
            continue
        notes.append({
            "time":    round(float(frame_times[i]), 3),
            "freq_hz": round(float(freq), 2),
            "note":    note,
        })
    return notes

def summarize_pitch_notes(note_events: List[dict], min_duration_frames: int = 8) -> List[dict]:
    """
    Collapse consecutive identical pitch-class frames into sustained note segments.
    Returns: [ { start_time, end_time, note, pitch_class } ]
    """
    if not note_events:
        return []

    summarized    = []
    current_note  = note_events[0]["note"]
    start_time    = note_events[0]["time"]
    count         = 1

    for i in range(1, len(note_events)):
        same = note_events[i]["note"] == current_note
        if same:
            count += 1
        else:
            if count >= min_duration_frames:
                summarized.append({
                    "start_time":  start_time,
                    "end_time":    note_events[i - 1]["time"],
                    "note":        current_note,
                    "pitch_class": note_name_to_pitch_class(current_note),
                })
            current_note = note_events[i]["note"]
            start_time   = note_events[i]["time"]
            count        = 1

    if count >= min_duration_frames:
        summarized.append({
            "start_time":  start_time,
            "end_time":    note_events[-1]["time"],
            "note":        current_note,
            "pitch_class": note_name_to_pitch_class(current_note),
        })

    return summarized


# ─────────────────────────────────────────
# CHORD DETECTION
# ─────────────────────────────────────────

def build_chord_templates():
    templates = {}
    major_intervals = [0, 4, 7]
    minor_intervals = [0, 3, 7]
    for root in range(12):
        major_tpl = np.zeros(12)
        minor_tpl = np.zeros(12)
        for i in major_intervals:
            major_tpl[(root + i) % 12] = 1
        for i in minor_intervals:
            minor_tpl[(root + i) % 12] = 1
        templates[NOTE_NAMES[root]]       = major_tpl
        templates[f"{NOTE_NAMES[root]}m"] = minor_tpl
    return templates


CHORD_TEMPLATES = build_chord_templates()


def detect_chords(audio_path: str, hop_length: int = 512):
    y, sr    = librosa.load(audio_path, sr=None)
    chroma   = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)
    frame_times = librosa.frames_to_time(
        np.arange(chroma.shape[1]), sr=sr, hop_length=hop_length
    )
    chords = []
    for i in range(chroma.shape[1]):
        vec = chroma[:, i]
        if np.max(vec) < 0.35:
            chords.append({"time": round(float(frame_times[i]), 3), "chord": "N"})
            continue
        best_chord, best_score = None, -1
        for name, tpl in CHORD_TEMPLATES.items():
            score = np.dot(vec, tpl)
            if score > best_score:
                best_score = score
                best_chord = name
        # NEW: even if a chord "won", reject it if the match is too weak
        if best_score < 1.5:
            chords.append({"time": round(float(frame_times[i]), 3), "chord": "N"})
        else:
            chords.append({"time": round(float(frame_times[i]), 3), "chord": best_chord})
    return chords


def summarize_chords(chord_events, min_duration_frames: int = 16):
    if not chord_events:
        return []
    summarized    = []
    current_chord = chord_events[0]["chord"]
    start_time    = chord_events[0]["time"]
    count         = 1
    for i in range(1, len(chord_events)):
        if chord_events[i]["chord"] == current_chord:
            count += 1
        else:
            if count >= min_duration_frames:
                summarized.append({
                    "start_time": start_time,
                    "end_time":   chord_events[i - 1]["time"],
                    "chord":      current_chord,
                })
            current_chord = chord_events[i]["chord"]
            start_time    = chord_events[i]["time"]
            count         = 1
    if count >= min_duration_frames:
        summarized.append({
            "start_time": start_time,
            "end_time":   chord_events[-1]["time"],
            "chord":      current_chord,
        })
    return summarized


# ─────────────────────────────────────────
# CHORD COMPARISON
# ─────────────────────────────────────────

def chord_root(chord_name: str) -> Optional[str]:
    """
    Extract the root note from a chord name.
    'Cm' → 'C', 'F#m' → 'F#', 'A#' → 'A#', 'N' → None
    Handles sharps (C#, F#, etc.) correctly.
    """
    if not chord_name or chord_name == "N":
        return None
    # Two-char root (e.g. C#, F#, A#, D#, G#)
    if len(chord_name) >= 2 and chord_name[1] == '#':
        return chord_name[:2]
    # Single-char root
    return chord_name[0]


def compare_chords(
    reference_summary: List[dict],
    player_summary: List[dict],
) -> dict:
    MIN_REF_DUR = 0.3   # ignore reference segments shorter than 300ms
    MIN_OVERLAP = 0.05  # require at least 50ms of real overlap

    ref_chords = [
        s for s in reference_summary
        if s.get("chord") not in ("N", None)
        and (s["end_time"] - s["start_time"]) >= MIN_REF_DUR
    ]
    player_chords = [s for s in player_summary if s.get("chord") not in ("N", None)]

    if not ref_chords or not player_chords:
        return {"accuracy_pct": 0.0, "correct": 0, "total": len(ref_chords),
                "no_signal": len(ref_chords), "mismatches": []}

    correct    = 0
    mismatches = []

    for ref_seg in ref_chords:
        r_start  = ref_seg["start_time"]
        r_end    = ref_seg["end_time"]
        ref_root = chord_root(ref_seg["chord"])

        best_overlap = 0.0   # ← start at 0, not 0.1
        best_player  = None
        for p_seg in player_chords:
            overlap = min(r_end, p_seg["end_time"]) - max(r_start, p_seg["start_time"])  # ← no max() clamp
            if overlap > best_overlap:
                best_overlap = overlap
                best_player  = p_seg

        if best_player is None or best_overlap < MIN_OVERLAP:
            mismatches.append({
                "start_time": r_start,
                "end_time":   r_end,
                "expected":   ref_seg["chord"],
                "played":     "?",
            })
            continue

        played_root = chord_root(best_player["chord"])
        if ref_root and played_root and ref_root == played_root:
            correct += 1
        else:
            mismatches.append({
                "start_time": r_start,
                "end_time":   r_end,
                "expected":   ref_seg["chord"],
                "played":     best_player["chord"],
            })

    total     = len(ref_chords)
    no_signal = sum(1 for m in mismatches if m["played"] == "?")

    return {
        "accuracy_pct": round((correct / total) * 100, 1) if total > 0 else 0.0,
        "correct":      correct,
        "total":        total,
        "no_signal":    no_signal,
        "mismatches":   mismatches,
    }


# ─────────────────────────────────────────
# PERFORMANCE COMPARISON  (timing)
# ─────────────────────────────────────────

def classify_timing(player_onsets, beat_times, tolerance_ms: int = 80):
    if not beat_times:
        return {"error": "No beat times detected in reference audio."}
    if not player_onsets:
        return {"error": "No player onsets detected."}
    results = []
    for onset in player_onsets:
        nearest_beat = min(beat_times, key=lambda b: abs(b - onset))
        offset_ms    = (onset - nearest_beat) * 1000
        if abs(offset_ms) <= tolerance_ms:
            status = "on-time"
        elif offset_ms < 0:
            status = "ahead"
        else:
            status = "behind"
        results.append({
            "player_onset": round(onset, 4),
            "nearest_beat": round(nearest_beat, 4),
            "offset_ms":    round(offset_ms, 2),
            "status":       status,
        })
    return results


def summarize_performance(comparison_results):
    if isinstance(comparison_results, dict) and "error" in comparison_results:
        return comparison_results
    if not comparison_results:
        return {"summary": "No comparison results available."}
    offsets    = [item["offset_ms"] for item in comparison_results]
    avg_offset = sum(offsets) / len(offsets)
    on_time    = sum(1 for i in comparison_results if i["status"] == "on-time")
    ahead      = sum(1 for i in comparison_results if i["status"] == "ahead")
    behind     = sum(1 for i in comparison_results if i["status"] == "behind")
    if avg_offset > 200:
        overall = "mostly behind"
    elif avg_offset < -200:
        overall = "mostly ahead"
    else:
        overall = "mostly on-time"
    return {
        "average_offset_ms": round(avg_offset, 2),
        "overall_status":    overall,
        "counts":            {"on_time": on_time, "ahead": ahead, "behind": behind},
    }


# ─────────────────────────────────────────
# AI COACHING  (Gemini + ElevenLabs)
# ─────────────────────────────────────────

class PerformanceSummary(BaseModel):
    average_offset_ms:  float
    overall_status:     str
    tempo:              Optional[float] = None
    on_time_count:      Optional[int]   = None
    ahead_count:        Optional[int]   = None
    behind_count:       Optional[int]   = None
    chord_summary:      Optional[list]  = None
    # ── NEW chord correction fields ──────
    chord_accuracy_pct: Optional[float] = None   # 0–100
    chord_mismatches:   Optional[list]  = None   # [{start_time, expected, played}]
    include_voice:      bool            = False


def _gemini_feedback(summary: PerformanceSummary) -> str:
    if not GEMINI_API_KEY:
        return "Keep your eyes on the beat and stay relaxed — you've got this!"

    # ── Timing counts ────────────────────────────────────────────────────────
    count_info = ""
    if summary.on_time_count is not None:
        total = (summary.on_time_count or 0) + (summary.ahead_count or 0) + (summary.behind_count or 0)
        count_info = (
            f"- On-time notes: {summary.on_time_count}/{total}\n"
            f"- Early: {summary.ahead_count}, Late: {summary.behind_count}\n"
        )

    # ── Chord accuracy ───────────────────────────────────────────────────────
    chord_info = ""
    if summary.chord_accuracy_pct is not None:
        chord_info += f"- Chord accuracy: {summary.chord_accuracy_pct:.1f}%\n"

    if summary.chord_mismatches:
        # Show up to 3 specific wrong chords to keep prompt concise
        examples = summary.chord_mismatches[:3]
        lines = [
            f"  {m['expected']} played as {m['played']} at {m['start_time']:.1f}s"
            for m in examples
        ]
        chord_info += "- Chord mistakes:\n" + "\n".join(lines) + "\n"
    elif summary.chord_summary:
        chord_names = list({seg["chord"] for seg in summary.chord_summary if seg.get("chord") != "N"})
        if chord_names:
            chord_info += f"- Chords detected in reference: {', '.join(chord_names[:8])}\n"

    prompt = f"""You are an encouraging AI music coach reviewing a live performance.

Player stats:
- Average timing offset: {summary.average_offset_ms:.1f} ms
- Overall timing feel: {summary.overall_status}
- Tempo reference: {summary.tempo or 'unknown'} BPM
{count_info}{chord_info}
Give 2-3 sentences of specific, actionable coaching feedback.
Be warm, honest, and sound like a real bandmate — not a robot.
Start with something positive, then give one concrete improvement tip based on the chord or timing data above.
Keep it under 50 words."""

    url  = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    body = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        res  = requests.post(url, json=body, timeout=10)
        data = res.json()
        print("GEMINI STATUS:", res.status_code)
        print("GEMINI RESPONSE:", data)
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print("GEMINI ERROR:", e)
        return "Great effort! Focus on locking in those chord changes and your timing will follow."


def _elevenlabs_tts(text: str) -> Optional[bytes]:
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        return None
    url     = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}
    body    = {
        "text":           text,
        "model_id":       "eleven_flash_v2_5",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8},
    }
    try:
        res = requests.post(url, json=body, headers=headers, timeout=15)
        print("EL STATUS:", res.status_code)
        print("EL RESPONSE:", res.text[:200])
        return res.content if res.status_code == 200 else None
    except Exception as e:
        print("EL ERROR:", e)
        return None


# ─────────────────────────────────────────
# SONG LIBRARY HELPERS
# ─────────────────────────────────────────

def load_song_metadata(folder: str) -> dict:
    meta_path = os.path.join(LIBRARY_PATH, folder, "metadata.json")
    defaults  = {
        "title":  folder.replace("_", " ").replace("-", " ").title(),
        "artist": "Unknown Artist",
    }
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("title"):
                defaults["title"] = data["title"]
            if data.get("artist"):
                defaults["artist"] = data["artist"]
        except (json.JSONDecodeError, OSError):
            pass
    return defaults


# ─────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "PitchPurrfect API", "status": "running"}


# ─────────────────────────────────────────
# SONG LIBRARY
# ─────────────────────────────────────────

@app.get("/api/songs")
def get_songs():
    songs = []
    idx   = 1
    for folder in sorted(os.listdir(LIBRARY_PATH)):
        song_path = os.path.join(LIBRARY_PATH, folder)
        if not os.path.isdir(song_path):
            continue
        meta = load_song_metadata(folder)
        has_audio = any(
            f.endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac"))
            for f in os.listdir(song_path)
        )
        cover_url = None
        for f in os.listdir(song_path):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                cover_url = f"http://localhost:8000/audio/{folder}/{f.replace(' ', '%20')}"
                break
        songs.append({
            "id":       idx,
            "folderId": folder,
            "title":    meta["title"],
            "artist":   meta["artist"],
            "coverUrl": cover_url,
            "hasAudio": has_audio,
        })
        idx += 1
    return songs


@app.get("/api/songs/{folder_id}/stems")
def get_stems(folder_id: str):
    song_path = os.path.join(LIBRARY_PATH, folder_id)
    if not os.path.exists(song_path):
        raise HTTPException(status_code=404, detail=f"Song folder '{folder_id}' not found")
    stems = {}
    for file in sorted(os.listdir(song_path)):
        if not file.endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac')):
            continue
        lower = file.lower()
        url   = f"http://localhost:8000/audio/{folder_id}/{file.replace(' ', '%20')}"
        if "drum" in lower:
            stems["drums"]  = {"active": True, "volume": 80, "url": url}
        elif "bass" in lower:
            stems["bass"]   = {"active": True, "volume": 75, "url": url}
        elif "vocal" in lower:
            stems["vocals"] = {"active": True, "volume": 85, "url": url}
        elif "instrumental" in lower or "other" in lower:
            stems["other"]  = {"active": True, "volume": 70, "url": url}
        else:
            key = os.path.splitext(file)[0].lower().split()[0]
            stems[key] = {"active": True, "volume": 75, "url": url}
    return stems


# ─────────────────────────────────────────
# PRACTICE SESSIONS
# ─────────────────────────────────────────

@app.post("/api/sessions")
async def start_session(request: Request):
    data       = await request.json()
    session_id = f"session_{int(time.time() * 1000)}"
    sessions[session_id] = {
        "sessionId":  session_id,
        "songId":     data.get("songId"),
        "instrument": data.get("instrument"),
        "startedAt":  time.time(),
        "status":     "active",
        "chunks":     0,
    }
    return sessions[session_id]


@app.post("/api/sessions/{session_id}/stop")
def stop_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions[session_id]["status"]  = "completed"
    sessions[session_id]["endedAt"] = time.time()
    return {"sessionId": session_id, "status": "completed", "endedAt": sessions[session_id]["endedAt"]}


@app.post("/api/sessions/{session_id}/audio")
async def send_audio_chunk(session_id: str, request: Request):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions[session_id]["chunks"] = sessions[session_id].get("chunks", 0) + 1
    return {"received": True, "timestamp": time.time()}


@app.get("/api/sessions/{session_id}/analysis")
def get_live_analysis(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    import random
    timing = random.choices(["on_tempo", "early", "late"], weights=[0.7, 0.15, 0.15])[0]
    pitch  = random.choices(["correct", "wrong_note", "wrong_chord"], weights=[0.75, 0.15, 0.10])[0]
    score  = random.randint(78, 96)
    return {
        "timing":  {"status": timing, "deviation": round(random.uniform(0.01, 0.08), 3), "confidence": round(random.uniform(0.85, 0.98), 2)},
        "pitch":   {"status": pitch, "currentNote": "C4", "targetNote": "C4", "confidence": round(random.uniform(0.85, 0.98), 2)},
        "rhythm":  {"consistency": round(random.uniform(0.80, 0.95), 2), "score": score},
        "overall": {"score": score, "trend": "improving"},
    }


@app.get("/api/sessions/{session_id}/coach")
def get_coach_feedback(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    import random
    messages = [
        {"message": "Great timing! You're locking in with the groove perfectly.",          "type": "encouragement"},
        {"message": "Watch your pitch on the higher notes — try to relax your technique.", "type": "correction"},
        {"message": "Excellent dynamics! Keep that energy going through the bridge.",      "type": "encouragement"},
        {"message": "Try to stay consistent with your tempo during chord transitions.",    "type": "tip"},
        {"message": "You're improving! Focus on a steady rhythm through the chorus.",      "type": "tip"},
    ]
    fb = random.choice(messages)
    return {"message": fb["message"], "type": fb["type"], "priority": "normal", "voiceUrl": None}


@app.get("/api/sessions/{session_id}/summary")
def get_session_summary(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session  = sessions[session_id]
    duration = int(time.time() - session.get("startedAt", time.time()))
    return {
        "sessionId":         session_id,
        "duration":          duration,
        "overallScore":      87,
        "timingAccuracy":    {"onTempo": 78, "early": 15, "late": 7},
        "noteAccuracy":      {"correct": 82, "wrongNote": 12, "wrongChord": 6},
        "rhythmConsistency": 0.85,
        "coachingPoints": [
            "Excellent rhythm on the chorus section",
            "Great dynamic control throughout",
            "Strong note accuracy on verses",
        ],
        "improvementAreas": [
            "Practice chord transitions at 0:45-1:15",
            "Focus on maintaining tempo during solos",
        ],
    }


# ─────────────────────────────────────────
# AUDIO INTELLIGENCE (librosa endpoints)
# ─────────────────────────────────────────

@app.post("/analyze-reference")
async def analyze_reference_endpoint(file: UploadFile = File(...)):
    path = os.path.join(TEMP_DIR, file.filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return analyze_reference(path)


@app.post("/analyze-player")
async def analyze_player_endpoint(file: UploadFile = File(...)):
    path = os.path.join(TEMP_DIR, file.filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"player_onsets": detect_player_onsets(path)}


@app.post("/detect-chords")
async def detect_chords_endpoint(file: UploadFile = File(...)):
    path = os.path.join(TEMP_DIR, file.filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    chord_events  = detect_chords(path)
    chord_summary = summarize_chords(chord_events)
    return {"chord_events": chord_events, "chord_summary": chord_summary}


# ── NEW: standalone pitch/note detection endpoint ────────────────────────────

@app.post("/detect-notes")
async def detect_notes_endpoint(file: UploadFile = File(...)):
    """
    Detect the pitched notes played in an audio file.
    Returns raw per-frame notes and a summarized list of sustained notes.
    """
    path = os.path.join(TEMP_DIR, file.filename)
    with open(path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    note_events   = detect_pitch_notes(path)
    note_summary  = summarize_pitch_notes(note_events)
    return {
        "note_events":  note_events,   # every detected frame
        "note_summary": note_summary,  # collapsed sustained notes
    }


# ── UPDATED: /compare-performance now includes chord + pitch analysis ─────────

@app.post("/compare-performance")
async def compare_performance(
    reference_file: UploadFile = File(...),
    player_file:    UploadFile = File(...),
    tolerance_ms:   int        = Form(200),
):
    ref_path    = os.path.join(TEMP_DIR, f"ref_{reference_file.filename}")
    player_path = os.path.join(TEMP_DIR, f"player_{player_file.filename}")
    with open(ref_path,    "wb") as buf: shutil.copyfileobj(reference_file.file, buf)
    with open(player_path, "wb") as buf: shutil.copyfileobj(player_file.file,    buf)

    # ── Timing ───────────────────────────────────────────────────────────────
    ref_result   = analyze_reference(ref_path)
    player_onset = detect_player_onsets(player_path)
    comparison   = classify_timing(player_onset, ref_result["beat_times"], tolerance_ms)
    summary      = summarize_performance(comparison)

    # ── Chord comparison ─────────────────────────────────────────────────────
    ref_chord_events    = detect_chords(ref_path)
    ref_chord_summary   = summarize_chords(ref_chord_events, min_duration_frames=16)

    player_chord_events  = detect_chords(player_path)
    player_chord_summary = summarize_chords(player_chord_events, min_duration_frames=16)

    chord_comparison = compare_chords(ref_chord_summary, player_chord_summary)

    # ── Pitch / note detection (player only) ─────────────────────────────────
    player_note_events  = detect_pitch_notes(player_path)
    player_note_summary = summarize_pitch_notes(player_note_events)

    return {
        # timing
        "tempo":              ref_result["tempo"],
        "beat_times":         ref_result["beat_times"],
        "player_onsets":      player_onset,
        "comparison":         comparison,
        "summary":            summary,
        # chords
        "ref_chord_summary":    ref_chord_summary,
        "player_chord_summary": player_chord_summary,
        "chord_comparison":     chord_comparison,   # accuracy_pct, mismatches
        # notes / pitch
        "player_note_summary":  player_note_summary,
    }


# ─────────────────────────────────────────
# AI COACH ENDPOINT
# ─────────────────────────────────────────

@app.post("/api/coach/feedback")
def ai_coach_feedback(summary: PerformanceSummary):
    """
    Accepts a PerformanceSummary (built from /compare-performance output),
    calls Gemini for text feedback, optionally calls ElevenLabs for audio,
    and returns { feedback, audio_url }.

    New fields accepted:
        chord_accuracy_pct  – float 0-100
        chord_mismatches    – list of { start_time, expected, played }
    """
    feedback  = _gemini_feedback(summary)
    audio_url = None

    if summary.include_voice:
        audio_bytes = _elevenlabs_tts(feedback)
        if audio_bytes:
            filename  = f"feedback_{int(time.time())}.mp3"
            file_path = os.path.join(TEMP_DIR, filename)
            with open(file_path, "wb") as f:
                f.write(audio_bytes)
            audio_url = f"http://localhost:8000/api/coach/audio/{filename}"

    return {"feedback": feedback, "audio_url": audio_url}


@app.get("/api/coach/audio/{filename}")
def get_coach_audio(filename: str):
    path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path, media_type="audio/mpeg")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)