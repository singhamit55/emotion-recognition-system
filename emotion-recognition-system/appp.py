"""
app.py — Emotion Detector Backend
Uses DeepFace (pre-trained model, no training needed!)
POST /detect  →  { emotions, dominant_emotion, face_found, face_region }
"""

import os
import io
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import cv2

app = Flask(__name__)
CORS(app)

# ── Emotion metadata 
EMOTION_META = {
    "happy":     { "emoji": "😄", "color": "#FFD700", "label": "Happy",     "message": "You look joyful!" },
    "sad":       { "emoji": "😢", "color": "#4A90D9", "label": "Sad",       "message": "Feeling blue today?" },
    "angry":     { "emoji": "😠", "color": "#E74C3C", "label": "Angry",     "message": "Take a deep breath!" },
    "surprise":  { "emoji": "😲", "color": "#FF8C00", "label": "Surprised", "message": "Something unexpected?" },
    "fear":      { "emoji": "😨", "color": "#9B59B6", "label": "Fearful",   "message": "It's going to be okay!" },
    "disgust":   { "emoji": "🤢", "color": "#27AE60", "label": "Disgusted", "message": "Something unpleasant?" },
    "neutral":   { "emoji": "😐", "color": "#95A5A6", "label": "Neutral",   "message": "Calm and composed." },
}

# ── Load model 
print("Loading DeepFace model...")
try:
    from deepface import DeepFace
    # Warm up — downloads model on first run
    print("✓ DeepFace loaded successfully")
    USE_DEEPFACE = True
except ImportError:
    print("[WARNING] DeepFace not installed. Run: pip install deepface")
    USE_DEEPFACE = False


# ── Helper: decode uploaded image 
def read_image(file_storage):
    img_bytes = file_storage.read()
    img_array = np.frombuffer(img_bytes, np.uint8)
    img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img_cv


def pil_to_base64(pil_img):
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ── Routes 
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "deepface": USE_DEEPFACE})


@app.route("/detect", methods=["POST"])
def detect():
    """
    Accepts: multipart/form-data with field 'image'
    Returns:
    {
        "face_found": true,
        "dominant_emotion": "happy",
        "emoji": "😄",
        "color": "#FFD700",
        "message": "You look joyful!",
        "emotions": { "happy": 92.3, "sad": 1.2, ... },
        "face_region": { "x": 100, "y": 80, "w": 200, "h": 200 }
    }
    """
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    try:
        img_cv = read_image(request.files["image"])
    except Exception as e:
        return jsonify({"error": f"Cannot read image: {e}"}), 400

    if not USE_DEEPFACE:
        return jsonify({"error": "DeepFace not installed. Run: pip install deepface tf-keras"}), 500

    try:
        results = DeepFace.analyze(
            img_path=img_cv,
            actions=["emotion"],
            enforce_detection=True,
            detector_backend="opencv",
        )

        result = results[0] if isinstance(results, list) else results
        emotions_raw = result["emotion"]                     # dict of emotion → float
        dominant     = result["dominant_emotion"].lower()
        region       = result.get("region", {})

        # Normalize to percentages
        total = sum(emotions_raw.values()) or 1
        emotions = {k.lower(): round(v / total * 100, 1) for k, v in emotions_raw.items()}

        meta = EMOTION_META.get(dominant, EMOTION_META["neutral"])

        return jsonify({
            "face_found":        True,
            "dominant_emotion":  dominant,
            "label":             meta["label"],
            "emoji":             meta["emoji"],
            "color":             meta["color"],
            "message":           meta["message"],
            "emotions":          emotions,
            "face_region":       region,
        })

    except Exception as e:
        err = str(e).lower()
        if "face" in err or "detection" in err:
            return jsonify({"face_found": False, "error": "No face detected in this image. Please use a clear frontal face photo."})
        return jsonify({"error": f"Analysis failed: {e}"}), 500


@app.route("/emotions", methods=["GET"])
def emotions_list():
    return jsonify(EMOTION_META)


# ── Main 
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🎭 Emotion Detector API → http://localhost:{port}")
    app.run(debug=False, host="0.0.0.0", port=port)
