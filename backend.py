from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)

# load trained model
model = load_model("emotion_model.h5")

# emotion labels
labels = ["angry","disgust","fear","happy","sad","surprise","neutral"]


@app.route("/")
def home():
    return "Emotion Detection API Running"


@app.route("/predict", methods=["POST"])
def predict():

    file = request.files["image"]

    img = cv2.imdecode(
        np.frombuffer(file.read(), np.uint8),
        cv2.IMREAD_GRAYSCALE
    )

    img = cv2.resize(img,(48,48))
    img = img / 255.0
    img = img.reshape(1,48,48,1)

    preds = model.predict(img)[0]

    emotion = labels[np.argmax(preds)]

    confidence = float(np.max(preds))

    emotion_scores = {
        labels[i]: float(preds[i] * 100)
        for i in range(len(labels))
    }

    return jsonify({
        "face_found": True,
        "dominant_emotion": emotion,
        "confidence": confidence,
        "emotions": emotion_scores
    })


if __name__ == "__main__":
    app.run(port=5000,debug=True)