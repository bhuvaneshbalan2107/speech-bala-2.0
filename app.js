const video = document.getElementById("inputVideo");
const canvas = document.getElementById("outputCanvas");
const context = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const placeholder = document.getElementById("placeholder");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const currentAlphabet = document.getElementById("currentAlphabet");
const currentWord = document.getElementById("currentWord");
const currentSentence = document.getElementById("currentSentence");
const speakButton = document.getElementById("speakButton");
const resetButton = document.getElementById("resetButton");
const fpsLabel = document.getElementById("fpsLabel");
const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .".split("");
let word = "";
let sentence = "";
let lastCharacter = null;
let candidate = null;
let candidateCount = 0;
let lastRegistered = 0;
let frameCount = 0;
let lastFpsTime = performance.now();

function setStatus(text, ready = false) { statusText.textContent = text; statusDot.classList.toggle("ready", ready); }
function resetTranscript() { word = ""; sentence = ""; lastCharacter = null; candidate = null; candidateCount = 0; currentAlphabet.textContent = "—"; currentWord.textContent = "—"; currentSentence.textContent = "Your sentence will appear here."; speakButton.disabled = true; }
function speak(text) { if (text && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }
function registerCharacter(character) {
  currentAlphabet.textContent = character === " " ? "SPACE" : character === "." ? "FULL STOP" : character;
  if (character === " ") { if (word.trim()) { sentence += `${word} `; speak(word); } word = ""; }
  else if (character === ".") { if (word.trim()) { sentence += `${word}.`; speak(word); } word = ""; }
  else { word += character; }
  currentWord.textContent = word || "—"; currentSentence.textContent = sentence.trim() || "Your sentence will appear here."; speakButton.disabled = !sentence.trim();
}
async function predict(features) {
  const response = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ features }) });
  if (!response.ok) throw new Error("Prediction request failed");
  return (await response.json()).label;
}
function featuresFromLandmarks(landmarks) {
  const x = landmarks.map((point) => point.x); const y = landmarks.map((point) => point.y); const minX = Math.min(...x); const minY = Math.min(...y); const features = [];
  landmarks.forEach((point) => { features.push(point.x - minX, point.y - minY); }); return features;
}
async function onResults(results) {
  canvas.width = video.videoWidth; canvas.height = video.videoHeight; context.save(); context.clearRect(0, 0, canvas.width, canvas.height);
  if (results.multiHandLandmarks?.length) {
    const landmarks = results.multiHandLandmarks[0]; drawConnectors(context, landmarks, HAND_CONNECTIONS, { color: "#b9e6c5", lineWidth: 3 }); drawLandmarks(context, landmarks, { color: "#f27d52", lineWidth: 1, radius: 3 });
    try {
      const label = await predict(featuresFromLandmarks(landmarks));
      if (label !== candidate) { candidate = label; candidateCount = 1; } else candidateCount += 1;
      if (candidateCount > 8 && label !== lastCharacter && performance.now() - lastRegistered > 900) { lastCharacter = label; lastRegistered = performance.now(); registerCharacter(label); }
    } catch (error) { setStatus("Prediction unavailable"); }
  }
  context.restore(); frameCount += 1; const now = performance.now(); if (now - lastFpsTime > 1000) { fpsLabel.textContent = `${frameCount} FPS`; frameCount = 0; lastFpsTime = now; }
}
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: .6, minTrackingConfidence: .6 }); hands.onResults(onResults);
let camera;
startButton.addEventListener("click", async () => { startButton.disabled = true; startButton.textContent = "Starting..."; try { camera = new Camera(video, { onFrame: async () => { await hands.send({ image: video }); }, width: 960, height: 600 }); await camera.start(); placeholder.classList.add("hidden"); startButton.textContent = "Camera active"; setStatus("Camera online", true); } catch (error) { startButton.disabled = false; startButton.textContent = "Start camera"; setStatus("Camera permission needed"); } });
resetButton.addEventListener("click", resetTranscript); speakButton.addEventListener("click", () => speak(sentence));