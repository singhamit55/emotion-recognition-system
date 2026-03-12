const API = "http://127.0.0.1:5000";

const EMOTION_META = {
  happy:    { emoji: "😄", color: "#FFD700", label: "Happy" },
  sad:      { emoji: "😢", color: "#4A90D9", label: "Sad" },
  angry:    { emoji: "😠", color: "#E74C3C", label: "Angry" },
  surprise: { emoji: "😲", color: "#FF8C00", label: "Surprised" },
  fear:     { emoji: "😨", color: "#9B59B6", label: "Fearful" },
  disgust:  { emoji: "🤢", color: "#27AE60", label: "Disgusted" },
  neutral:  { emoji: "😐", color: "#95A5A6", label: "Neutral" },
};

const TIPS = {
  happy:    "Happiness is contagious! Studies show smiling activates the same brain regions whether you see a smile or smile yourself.",
  sad:      "Sadness is a healthy emotion. It helps us process loss and connects us deeply to others.",
  angry:    "Anger has been shown to boost focus and energy. Channel it into something productive!",
  surprise: "Surprise lasts only 1–2 seconds — the shortest of all emotions — before morphing into something else.",
  fear:     "Fear activates your amygdala and releases adrenaline, sharpening reflexes in milliseconds.",
  disgust:  "Disgust evolved to protect us from contamination and social norm violations.",
  neutral:  "A neutral expression is actually the hardest emotion to fake — micro-expressions always leak through.",
};

//  DOM refs 
const dropZone    = document.getElementById("dropZone");
const fileInput   = document.getElementById("fileInput");
const dropInner   = document.getElementById("dropInner");
const previewWrap = document.getElementById("preview-wrap");
const previewImg  = document.getElementById("preview-img");
const detectBtn   = document.getElementById("detectBtn");
const resetBtn    = document.getElementById("resetBtn");
const loading     = document.getElementById("loading");
const loadingStep = document.getElementById("loadingStep");
const emptyState  = document.getElementById("emptyState");
const results     = document.getElementById("results");
const camBtn      = document.getElementById("camBtn");
const snapBtn     = document.getElementById("snapBtn");
const videoWrap   = document.getElementById("video-wrap");
const video       = document.getElementById("video");
const canvas      = document.getElementById("canvas");

let currentFile = null;
let stream      = null;

// ── Initial hidden states 
snapBtn.style.display  = "none";
results.style.display  = "none";
canvas.style.display   = "none";

// ── File upload 
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", e => loadFile(e.target.files[0]));

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("over");
  loadFile(e.dataTransfer.files[0]);
});

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  currentFile = file;
  previewImg.src = URL.createObjectURL(file);
  dropInner.style.display   = "none";
  previewWrap.style.display = "block";
}

// ── Reset 
resetBtn.addEventListener("click", reset);

function reset() {
  currentFile = null;
  previewImg.src = "";
  dropInner.style.display   = "flex";
  previewWrap.style.display = "none";
  loading.classList.remove("on");
  emptyState.style.display  = "flex";
  results.style.display     = "none";
  fileInput.value = "";
  stopCam();
}

// ── Webcam 
camBtn.addEventListener("click", async () => {
  if (stream) { stopCam(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    videoWrap.style.display = "block";
    camBtn.textContent      = "⏹ Stop Cam";
    snapBtn.style.display   = "flex";
  } catch {
    alert("Camera access denied.");
  }
});

snapBtn.addEventListener("click", () => {
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    currentFile = new File([blob], "webcam.png", { type: "image/png" });
    previewImg.src            = URL.createObjectURL(currentFile);
    dropInner.style.display   = "none";
    previewWrap.style.display = "block";
    stopCam();
  }, "image/png");
});

function stopCam() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  videoWrap.style.display = "none";
  snapBtn.style.display   = "none";
  camBtn.textContent      = "📷 Use Webcam";
}

// ── Detect 
detectBtn.addEventListener("click", async () => {
  if (!currentFile) return;
  startLoading();
  try {
    const fd = new FormData();
    fd.append("image", currentFile);
    const res  = await fetch(`${API}/predict`, {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    renderResults(data);
  } catch {
    demoResults();  // fallback when backend is offline
  }
});

// ── Demo fallback 
function demoResults() {
  const keys = Object.keys(EMOTION_META);
  const dom  = keys[Math.floor(Math.random() * keys.length)];
  const conf = 0.6 + Math.random() * 0.37;

  let probs = keys.map(() => Math.random());
  const sum = probs.reduce((a, b) => a + b, 0);
  probs     = probs.map(p => p / sum);
  probs[keys.indexOf(dom)] = conf;
  const normalSum = probs.reduce((a, b) => a + b, 0);
  probs = probs.map(p => p / normalSum);

  renderResults({
    face_found:        true,
    dominant_emotion:  dom,
    label:             EMOTION_META[dom].label,
    emoji:             EMOTION_META[dom].emoji,
    color:             EMOTION_META[dom].color,
    message:           "Demo mode — connect backend to get real predictions!",
    emotions:          Object.fromEntries(keys.map((k, i) => [k, +(probs[i] * 100).toFixed(1)])),
    confidence:        conf,
    demo:              true,
  });
}

// ── Render results 
function renderResults(data) {
  stopLoading();

  if (!data.face_found && data.error) {
    alert(data.error || "No face detected. Try a clearer photo.");
    return;
  }

  const dom  = (data.dominant_emotion || "neutral").toLowerCase();
  const meta = EMOTION_META[dom] || EMOTION_META.neutral;
  const conf = data.confidence || (data.emotions?.[dom] / 100) || 0.7;

  // Dominant card
  const card = document.getElementById("domCard");
  card.style.color        = meta.color;
  card.style.borderColor  = meta.color + "33";

  document.getElementById("domName").textContent  = meta.label;
  document.getElementById("domMsg").textContent   = data.message || "";
  document.getElementById("domEmoji").textContent = meta.emoji;
  document.getElementById("confLabel").textContent = `Confidence: ${Math.round(conf * 100)}%`;

  const fill = document.getElementById("confFill");
  fill.style.background = meta.color;
  setTimeout(() => { fill.style.width = `${Math.round(conf * 100)}%`; }, 100);

  // Emotion bars
  const barsEl = document.getElementById("emoBars");
  barsEl.innerHTML = "";
  const emotionsArr = Object.entries(data.emotions || {}).sort((a, b) => b[1] - a[1]);

  emotionsArr.forEach(([key, pct]) => {
    const m     = EMOTION_META[key.toLowerCase()] || EMOTION_META.neutral;
    const isTop = key.toLowerCase() === dom;
    const row   = document.createElement("div");
    row.className = "emo-row";
    row.innerHTML = `
      <span class="emo-icon">${m.emoji}</span>
      <span class="emo-name" style="color:${isTop ? m.color : ''}">${m.label}</span>
      <div class="emo-track">
        <div class="emo-fill" style="background:${m.color};width:0%"></div>
      </div>
      <span class="emo-pct" style="color:${isTop ? m.color : ''}">${pct.toFixed(1)}%</span>
    `;
    barsEl.appendChild(row);
    setTimeout(() => { row.querySelector(".emo-fill").style.width = `${pct}%`; }, 150);
  });

  // Fun fact
  document.getElementById("tipText").textContent = TIPS[dom] || TIPS.neutral;

  // Show results
  emptyState.style.display = "none";
  results.style.display    = "flex";
  results.style.flexDirection = "column";
  results.style.gap        = "20px";
}

// Loading helpers...................................... 
const STEPS = [
  "Detecting facial landmarks...",
  "Running DeepFace CNN...",
  "Classifying AU patterns...",
  "Mapping micro-expressions...",
  "Computing emotion scores...",
];
let stepInterval;

function startLoading() {
  detectBtn.disabled        = true;
  previewWrap.style.display = "none";
  emptyState.style.display  = "none";
  results.style.display     = "none";
  loading.classList.add("on");

  let i = 0;
  loadingStep.textContent = STEPS[0];
  stepInterval = setInterval(() => {
    i = (i + 1) % STEPS.length;
    loadingStep.textContent = STEPS[i];
  }, 700);
}

function stopLoading() {
  clearInterval(stepInterval);
  loading.classList.remove("on");
  previewWrap.style.display = "block";
  detectBtn.disabled        = false;
}
