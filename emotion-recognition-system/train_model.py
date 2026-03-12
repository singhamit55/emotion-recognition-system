import pandas as pd
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense
from tensorflow.keras.utils import to_categorical

# Load dataset
data = pd.read_csv("fer2013.csv")

pixels = data["pixels"].tolist()

faces = []

for pixel_sequence in pixels:
    face = [int(pixel) for pixel in pixel_sequence.split()]
    face = np.asarray(face).reshape(48,48)
    faces.append(face)

faces = np.asarray(faces)

# Normalize
faces = faces / 255.0

# reshape for CNN
faces = faces.reshape(-1,48,48,1)

# labels
labels = data["emotion"].values
labels = to_categorical(labels)

print("Dataset Loaded Successfully")

# CNN Model
model = Sequential()

model.add(Conv2D(32,(3,3),activation="relu",input_shape=(48,48,1)))
model.add(MaxPooling2D(2,2))

model.add(Conv2D(64,(3,3),activation="relu"))
model.add(MaxPooling2D(2,2))

model.add(Flatten())

model.add(Dense(128,activation="relu"))

model.add(Dense(7,activation="softmax"))

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print("Training started...")

model.fit(
    faces,
    labels,
    epochs=10,
    batch_size=64
)

model.save("emotion_model.h5")

print("Model saved as emotion_model.h5")