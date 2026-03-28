from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import time
from typing import Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LIBRARY_PATH = os.path.join(os.path.dirname(__file__), "library")

app.mount("/audio", StaticFiles(directory=LIBRARY_PATH), name="audio")

sessions: Dict[str, Dict[str, Any]] = {}


def load_song_metadata(folder: str) -> dict:
    """
    Reads metadata.json from a song folder if it exists.
    Only reads title and artist — falls back to folder name / Unknown Artist.
    """
    meta_path = os.path.join(LIBRARY_PATH, folder, "metadata.json")
    defaults = {
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
        except (json.JSONDecodeError, OSError) as e:
            print(f"Warning: could not read metadata for '{folder}': {e}")
    return defaults


@app.get("/api/songs")
def get_songs():
    songs = []
    idx = 1
    for folder in sorted(os.listdir(LIBRARY_PATH)):
        song_path = os.path.join(LIBRARY_PATH, folder)
        if not os.path.isdir(song_path):
            continue

        meta = load_song_metadata(folder)
        has_audio = any(
            f.endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac"))
            for f in os.listdir(song_path)
        )

        # Look for a cover image (any .png/.jpg/.jpeg/.webp in the folder)
        cover_url = None
        for f in os.listdir(song_path):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                encoded = f.replace(" ", "%20")
                cover_url = f"http://localhost:8000/audio/{folder}/{encoded}"
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
        # Skip non-audio files (including metadata.json)
        if not file.endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac')):
            continue

        lower = file.lower()
        encoded_file = file.replace(" ", "%20")
        url = f"http://localhost:8000/audio/{folder_id}/{encoded_file}"

        if "drum" in lower:
            stems["drums"] = {"active": True, "volume": 80, "url": url}
        elif "bass" in lower:
            stems["bass"] = {"active": True, "volume": 75, "url": url}
        elif "vocal" in lower:
            stems["vocals"] = {"active": True, "volume": 85, "url": url}
        elif "instrumental" in lower or "other" in lower:
            stems["other"] = {"active": True, "volume": 70, "url": url}
        else:
            key = os.path.splitext(file)[0].lower().split()[0]
            stems[key] = {"active": True, "volume": 75, "url": url}

    return stems


@app.post("/api/sessions")
async def start_session(request: Request):
    data = await request.json()
    session_id = f"session_{int(time.time() * 1000)}"
    sessions[session_id] = {
        "sessionId":   session_id,
        "songId":      data.get("songId"),
        "instrument":  data.get("instrument"),
        "startedAt":   time.time(),
        "status":      "active",
        "chunks":      0,
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
        "pitch":   {"status": pitch,  "currentNote": "C4", "targetNote": "C4",           "confidence": round(random.uniform(0.85, 0.98), 2)},
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
        "sessionId":          session_id,
        "duration":           duration,
        "overallScore":       87,
        "timingAccuracy":     {"onTempo": 78, "early": 15, "late": 7},
        "noteAccuracy":       {"correct": 82, "wrongNote": 12, "wrongChord": 6},
        "rhythmConsistency":  0.85,
        "coachingPoints":     [
            "Excellent rhythm on the chorus section",
            "Great dynamic control throughout",
            "Strong note accuracy on verses",
        ],
        "improvementAreas":   [
            "Practice chord transitions at 0:45-1:15",
            "Focus on maintaining tempo during solos",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)