from fastapi import FastAPI
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

#from compare file
class PerformanceSummary(BaseModel):
    average_offset_ms: float
    overall_status: str   # "mostly behind", "mostly ahead", "mostly on-time"


#Gemini feedback
def generate_feedback(summary: PerformanceSummary):
    prompt = f"""
You are an AI music coach.

Player performance:
- Average timing offset: {summary.average_offset_ms} ms
- Overall timing: {summary.overall_status}

Give short, actionable feedback (max 15 words).
Be encouraging but honest.
Sound like a real bandmate.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"

    body = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    res = requests.post(url, json=body)
    data = res.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except:
        return "Stay locked in with the beat."


# eleven Labs
def text_to_speech(text):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }

    body = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.8
        }
    }

    response = requests.post(url, json=body, headers=headers)

    return response.content


# endpoints
@app.post("/coach")
def coach(summary: PerformanceSummary):
    # Generate feedback from Person 2 data
    feedback = generate_feedback(summary)

    # Convert to speech
    audio = text_to_speech(feedback)

    # Save file
    filename = "feedback.mp3"
    with open(filename, "wb") as f:
        f.write(audio)

    return {
        "feedback": feedback,
        "audio_file": filename
    }
