import * as THREE from "three";
import { CanvasRecorder } from './recorder.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';


let scene, camera, renderer;
let meteors = [];
const meteorCount = 30;

// text variables
let textMesh1, textMesh2;
let currentText1 = "";
let currentText2 = "";
const finalText1 = "A new kind of";
const finalText2 = "design tool";
let textAnimationStarted = false;

const recorder = new CanvasRecorder();

// Text creation functions
async function loadFont() {
  const loader = new FontLoader();
  return new Promise((resolve) => {
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', resolve);
  });
}

async function createText() {
  const font = await loadFont();

  const textMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
  });

  const textGeometry1 = new TextGeometry("", {
    font: font,
    size: 0.8,
    height: 0.1,
  });

  const textGeometry2 = new TextGeometry("", {
    font: font,
    size: 0.8,
    height: 0.1,
  });

  textMesh1 = new THREE.Mesh(textGeometry1, textMaterial);
  textMesh2 = new THREE.Mesh(textGeometry2, textMaterial);

  textMesh1.position.set(-4, 1, 0);
  textMesh2.position.set(-3, -0.5, 0);

  scene.add(textMesh1);
  scene.add(textMesh2);
}

async function updateTextGeometry(mesh, text) {
  const font = await loadFont();
  const newGeometry = new TextGeometry(text, {
    font: font,
    size: 0.8,
    height: 0.1,
  });

  mesh.geometry.dispose();
  mesh.geometry = newGeometry;

  // Center the text
  mesh.geometry.computeBoundingBox();
  const textWidth = mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x;
  mesh.position.x = -textWidth / 2;
}
let lastCharTime = 0;
const charDelay = 100; 
const lineDelay = 400; 

function updateText() {
  if (!textAnimationStarted) return;

  const currentTime = Date.now();

  // Check if enough time has passed since last character
  if (currentTime - lastCharTime < charDelay) return;

  if (currentText1.length < finalText1.length) {
    currentText1 += finalText1[currentText1.length];
    updateTextGeometry(textMesh1, currentText1);
    lastCharTime = currentTime;
  } else if (currentText1.length === finalText1.length &&
    currentText2.length === 0 &&
    currentTime - lastCharTime < lineDelay) {
    // Wait before starting second line
    return;
  } else if (currentText2.length < finalText2.length) {
    currentText2 += finalText2[currentText2.length];
    updateTextGeometry(textMesh2, currentText2);
    lastCharTime = currentTime;
  }
}

function setupControls() {
  const recordButton = document.getElementById('recordButton');
  const downloadWebM = document.getElementById('downloadWebM');

  recordButton.addEventListener('click', async () => {
    if (!recorder.isRecording) {
      try {
        // Reset text state before starting new recording
        currentText1 = "";
        currentText2 = "";
        if (textMesh1) updateTextGeometry(textMesh1, "");
        if (textMesh2) updateTextGeometry(textMesh2, "");
        lastCharTime = Date.now();
        
        // Start recording first
        await recorder.startRecording(renderer.domElement);
        
        // Then start text animation
        textAnimationStarted = true;
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      recorder.stopRecording();
      // Reset animation state when stopping recording
      textAnimationStarted = false;
    }
  });

  downloadWebM.addEventListener('click', async () => {
    try {
      await recorder.downloadVideo();
    } catch (error) {
      console.error('Failed to download WebM:', error);
    }
  });
}


function getRandomStartPosition() {
  const angle = Math.PI / 6;
  const laneCount = 15;
  const laneSpacing = 40 / laneCount;
  const randomLane = Math.floor(Math.random() * laneCount);
  const baseY = -20 + (randomLane * laneSpacing);
  const laneOffset = Math.random() * (laneSpacing * 0.5);
  const y = baseY + laneOffset;
  const x = -30 + (Math.random() * 5) - (y * Math.cos(angle) / Math.sin(angle));
  return { x, y };
}

function createMeteors() {
  const trailLength = 25;
  const meteorGeometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const indices = [];
  const initialPositions = [];

  for (let i = 0; i < meteorCount; i++) {
    const { x, y } = getRandomStartPosition();
    const z = 0;

    for (let j = 0; j < trailLength; j++) {
      const width = 0.12 * (1 - j / trailLength);
      positions.push(x - j * 0.3, y - j * 0.15 + width, z);
      positions.push(x - j * 0.3, y - j * 0.15 - width, z);

      const fade = Math.pow(1 - (j / trailLength), 1.5);
      const brightness = 1.8;
      colors.push(0.4 * fade * brightness, 0.6 * fade * brightness, 1.0 * fade * brightness);
      colors.push(0.4 * fade * brightness, 0.6 * fade * brightness, 1.0 * fade * brightness);

      if (j < trailLength - 1) {
        const baseIndex = i * trailLength * 2 + j * 2;
        indices.push(
          baseIndex, baseIndex + 1, baseIndex + 2,
          baseIndex + 1, baseIndex + 3, baseIndex + 2
        );
      }
    }

    initialPositions.push(x, y, z);
  }

  meteorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  meteorGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  meteorGeometry.setIndex(indices);

  const meteorMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const meteorMesh = new THREE.Mesh(meteorGeometry, meteorMaterial);
  scene.add(meteorMesh);

  meteors.push({
    mesh: meteorMesh,
    positions: initialPositions,
    speeds: Array(meteorCount).fill(0).map(() => THREE.MathUtils.randFloat(0.2, 0.3))
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Update meteors
  meteors.forEach(({ mesh, positions, speeds }) => {
    const posArray = mesh.geometry.attributes.position.array;
    const angle = Math.PI / 6;

    for (let i = 0; i < positions.length; i += 3) {
      const meteorIndex = i / 3;

      positions[i] += speeds[meteorIndex] * Math.cos(angle);
      positions[i + 1] += speeds[meteorIndex] * Math.sin(angle);

      if (positions[i] > 25 || positions[i + 1] > 20) {
        const { x, y } = getRandomStartPosition();
        positions[i] = x;
        positions[i + 1] = y;
      }

      for (let j = 0; j < 25; j++) {
        const idx = (meteorIndex * 50 + j * 2) * 3;
        const width = 0.12 * (1 - j / 25);
        const xPos = positions[i] - j * 0.3;
        const yPos = positions[i + 1] - j * 0.15;

        posArray[idx] = xPos;
        posArray[idx + 1] = yPos + width;
        posArray[idx + 2] = positions[i + 2];

        posArray[idx + 3] = xPos;
        posArray[idx + 4] = yPos - width;
        posArray[idx + 5] = positions[i + 2];
      }
    }

    mesh.geometry.attributes.position.needsUpdate = true;
  });

  updateText();

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000814);
  
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createMeteors();
  await createText(); 
  
  window.addEventListener("resize", onWindowResize, false);
  setupControls();
  
  animate();
}

init();