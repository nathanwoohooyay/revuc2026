import librosa
import numpy as np

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F',
              'F#', 'G', 'G#', 'A', 'A#', 'B']


def analyze_reference(audio_path: str):
    y, sr = librosa.load(audio_path, sr=None)

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    return {
        "tempo": float(tempo),
        "beat_times": beat_times.tolist()
    }


def detect_player_onsets(audio_path: str):
    y, sr = librosa.load(audio_path, sr=None)

    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    return onset_times.tolist()


def build_chord_templates():
    templates = {}

    major_intervals = [0, 4, 7]
    minor_intervals = [0, 3, 7]

    for root in range(12):
        major_template = np.zeros(12)
        minor_template = np.zeros(12)

        for interval in major_intervals:
            major_template[(root + interval) % 12] = 1

        for interval in minor_intervals:
            minor_template[(root + interval) % 12] = 1

        templates[f"{NOTE_NAMES[root]}"] = major_template
        templates[f"{NOTE_NAMES[root]}m"] = minor_template

    return templates


CHORD_TEMPLATES = build_chord_templates()


def detect_chords(audio_path: str, hop_length: int = 512):
    y, sr = librosa.load(audio_path, sr=None)

    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)

    frame_times = librosa.frames_to_time(
        np.arange(chroma.shape[1]),
        sr=sr,
        hop_length=hop_length
    )

    chords = []

    for i in range(chroma.shape[1]):
        chroma_vector = chroma[:, i]

        if np.max(chroma_vector) < 0.2:
            chords.append({
                "time": round(float(frame_times[i]), 3),
                "chord": "N"
            })
            continue

        best_chord = None
        best_score = -1

        for chord_name, template in CHORD_TEMPLATES.items():
            score = np.dot(chroma_vector, template)
            if score > best_score:
                best_score = score
                best_chord = chord_name

        chords.append({
            "time": round(float(frame_times[i]), 3),
            "chord": best_chord
        })

    return chords


def summarize_chords(chord_events, min_duration_frames: int = 4):
    if not chord_events:
        return []

    summarized = []
    current_chord = chord_events[0]["chord"]
    start_time = chord_events[0]["time"]
    count = 1

    for i in range(1, len(chord_events)):
        if chord_events[i]["chord"] == current_chord:
            count += 1
        else:
            if count >= min_duration_frames:
                summarized.append({
                    "start_time": start_time,
                    "end_time": chord_events[i - 1]["time"],
                    "chord": current_chord
                })
            current_chord = chord_events[i]["chord"]
            start_time = chord_events[i]["time"]
            count = 1

    if count >= min_duration_frames:
        summarized.append({
            "start_time": start_time,
            "end_time": chord_events[-1]["time"],
            "chord": current_chord
        })

    return summarized