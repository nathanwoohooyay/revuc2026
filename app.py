from fastapi import FastAPI, UploadFile, File, Form
import shutil
import os

from analyzer import (
    analyze_reference,
    detect_player_onsets,
    detect_chords,
    summarize_chords
)
from compare import classify_timing, summarize_performance

app = FastAPI()

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


@app.get("/")
def home():
    return {"message": "AI Bandmate Audio Intelligence API is running"}


@app.post("/analyze-reference")
async def analyze_reference_endpoint(file: UploadFile = File(...)):
    file_path = os.path.join(TEMP_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = analyze_reference(file_path)
    return result


@app.post("/analyze-player")
async def analyze_player_endpoint(file: UploadFile = File(...)):
    file_path = os.path.join(TEMP_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = detect_player_onsets(file_path)
    return {"player_onsets": result}


@app.post("/detect-chords")
async def detect_chords_endpoint(file: UploadFile = File(...)):
    file_path = os.path.join(TEMP_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    chord_events = detect_chords(file_path)
    chord_summary = summarize_chords(chord_events)

    return {
        "chord_events": chord_events,
        "chord_summary": chord_summary
    }


@app.post("/compare-performance")
async def compare_performance(
    reference_file: UploadFile = File(...),
    player_file: UploadFile = File(...),
    tolerance_ms: int = Form(80)
):
    reference_path = os.path.join(TEMP_DIR, f"ref_{reference_file.filename}")
    player_path = os.path.join(TEMP_DIR, f"player_{player_file.filename}")

    with open(reference_path, "wb") as buffer:
        shutil.copyfileobj(reference_file.file, buffer)

    with open(player_path, "wb") as buffer:
        shutil.copyfileobj(player_file.file, buffer)

    reference_result = analyze_reference(reference_path)
    player_onsets = detect_player_onsets(player_path)
    comparison = classify_timing(
        player_onsets,
        reference_result["beat_times"],
        tolerance_ms
    )
    summary = summarize_performance(comparison)

    return {
        "tempo": reference_result["tempo"],
        "beat_times": reference_result["beat_times"],
        "player_onsets": player_onsets,
        "comparison": comparison,
        "summary": summary
    }