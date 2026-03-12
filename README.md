# MoodLens — AI Emotion Detector 🎭

Detects 7 human emotions from a face photo using DeepFace deep learning.
**No training required** — uses a pre-trained model out of the box!

## Emotions Detected
😄 Happy · 😢 Sad · 😠 Angry · 😲 Surprised · 😨 Fearful · 🤢 Disgusted · 😐 Neutral

## Project Structure
```
emotion_detector/
├── app.py              ← Flask API backend
├── requirements.txt    ← Python dependencies
└── frontend/
    └── index.html      ← Web UI (open in browser)
```

## Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```
> First run downloads the DeepFace model (~500MB) automatically.

### 2. Start the API
```bash
python app.py
```

### 3. Open the web app
Double-click `frontend/index.html` — or open in browser.

## API
| Method | Endpoint  | Description |
|--------|-----------|-------------|
| GET    | /health   | Server status |
| POST   | /detect   | Upload image → emotion results |

```bash
curl -X POST http://localhost:5000/detect -F "image=@photo.jpg"
```
