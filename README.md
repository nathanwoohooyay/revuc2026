# 🐱 PitchPurrfect

**AI-Powered Music Practice Platform** — Play along to your favorite songs and get instant AI voice coaching on your timing, pitch, and chord accuracy.

---

## What It Does

PitchPurrfect lets you practice a real instrument against isolated song stems. It records your microphone, compares what you played against the reference stem, and delivers spoken feedback powered by Gemini AI and ElevenLabs voice synthesis.

- **Stem Mixer** — Each song is split into drums, bass, vocals, and other tracks. Mute the stem you're replacing and play along to the rest.
- **Chord Detection** — librosa analyzes both the reference stem and your recording, then compares chord progressions frame by frame.
- **Timing Analysis** — Your note onsets are compared against the song's beat grid with millisecond precision.
- **Pitch Detection** — pYIN detects the notes you're playing and filters out silence and noise.
- **AI Voice Coaching** — Gemini generates personalized feedback based on your chord accuracy and timing stats, narrated aloud by ElevenLabs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Audio Analysis | librosa, pYIN |
| Chord Detection | chroma_cqt + template matching |
| Beat Tracking | librosa.beat.beat_track + HPSS |
| AI Coaching | Google Gemini 2.5 Flash |
| Voice Synthesis | ElevenLabs eleven_flash_v2_5 |
| Audio Conversion | ffmpeg |

---

## Project Structure

```
REVUC2026/
├── backend/
│   ├── main.py              # FastAPI server — all audio analysis + API endpoints
│   ├── library/             # Song folders (stems + cover art + metadata.json)
│   │   └── tennessee/
│   │       ├── Bass - *.mp3
│   │       ├── Drums - *.mp3
│   │       ├── Vocals - *.mp3
│   │       ├── Other - *.mp3
│   │       ├── tennessee.jpeg
│   │       └── metadata.json
│   ├── temp_uploads/        # Auto-generated — gitignored
│   └── .env                 # API keys — never commit
├── pitchpurrfect-ui/
│   └── src/
│       └── App.jsx          # Full React frontend
├── package.json
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- ffmpeg (must be on PATH)

Install ffmpeg on Windows:
```powershell
winget install Gyan.FFmpeg
```
Then restart your terminal.

### Backend

```bash
cd backend
pip install fastapi uvicorn librosa numpy requests python-dotenv pydantic
```

Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

Start the server:
```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000`

### Frontend

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## Adding Songs

Each song needs its own folder inside `backend/library/`:

```
backend/library/your_song_name/
├── Bass - songname.mp3
├── Drums - songname.mp3
├── Vocals - songname.mp3
├── Other - songname.mp3
├── cover.jpeg
└── metadata.json
```

`metadata.json` format:
```json
{
  "title": "Song Title",
  "artist": "Artist Name"
}
```

The stem filenames are matched by keyword — any file with `drum` in the name maps to drums, `bass` to bass, `vocal` to vocals, and `instrumental` or `other` to the other track.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/songs` | List all songs in the library |
| GET | `/api/songs/{id}/stems` | Get stem URLs for a song |
| POST | `/api/sessions` | Start a practice session |
| POST | `/compare-performance` | Compare reference + player audio |
| POST | `/detect-chords` | Detect chords in an audio file |
| POST | `/detect-notes` | Detect pitched notes in an audio file |
| POST | `/api/coach/feedback` | Generate Gemini AI coaching + ElevenLabs audio |

---

## How the Comparison Works

1. User presses play — stems start, microphone starts recording
2. User presses pause — recording stops, comparison begins
3. Frontend sends the reference stem + player recording to `/compare-performance`
4. Backend runs:
   - `librosa.pyin` for pitch/note detection on player audio
   - `chroma_cqt` + chord templates for chord detection on both files
   - `librosa.beat.beat_track` + HPSS for timing analysis
   - `compare_chords()` matches player chords against reference with overlap scoring
5. Results displayed in the Chord Timeline, Performance Analysis, and Chord & Note Review cards
6. Gemini receives the stats and generates coaching text
7. ElevenLabs converts the text to audio and plays it back

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID to use for coaching |

Get your keys at:
- Gemini: https://aistudio.google.com
- ElevenLabs: https://elevenlabs.io
