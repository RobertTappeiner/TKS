import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/PLYLoader.js";

// ---------------------------
// KONSTANTEN
// ---------------------------
const CONFIG = {
    DEFAULT_FILE: "./cloud.ply",
    CAMERA_FOV: 60,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    POINT_SIZE: 0.01,
    BACKGROUND_COLOR: 0x222222,
    AXES_SCALE: 0.05,
    AXES_ARROW_HEAD_SCALE: 0.2,
    AXES_OFFSET_MULTIPLIER: 3,
    HEMISPHERE_LIGHT_INTENSITY: 1.2,
    HEMISPHERE_LIGHT_GROUND: 0x444444,
    DIRECTIONAL_LIGHT_INTENSITY: 1,
    DIRECTIONAL_LIGHT_POS: { x: 5, y: 10, z: 7 },
    AMBIENT_LIGHT_INTENSITY: 0.6,
    CAMERA_HEIGHT_OFFSET: 0.5,
    CAMERA_DISTANCE_MULTIPLIER: 2,
};

// WebGL Unterstützung prüfen
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl2 = canvas.getContext('webgl2');
        const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(gl2 || gl1);
    } catch (e) {
        return false;
    }
}

const hasWebGLSupport = checkWebGLSupport();

if (!hasWebGLSupport) {
    const loadingMessage = document.querySelector('.loading-text');
    if (loadingMessage) {
        loadingMessage.innerText = 'WebGL wird in diesem Browser/Gerät nicht unterstützt.';
    }
    console.error('WebGL nicht unterstützt');
}

if (hasWebGLSupport) {

// ---------------------------
// Szene Setup
// ---------------------------
const viewerElement = document.getElementById("viewer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.BACKGROUND_COLOR);

const camera = new THREE.PerspectiveCamera(
  CONFIG.CAMERA_FOV,
  viewerElement.clientWidth / viewerElement.clientHeight,
  CONFIG.CAMERA_NEAR,
  CONFIG.CAMERA_FAR
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewerElement.clientWidth, viewerElement.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewerElement.appendChild(renderer.domElement);

// ---------------------------
// Lichtz
// ---------------------------
scene.add(new THREE.HemisphereLight(0xffffff, CONFIG.HEMISPHERE_LIGHT_GROUND, CONFIG.HEMISPHERE_LIGHT_INTENSITY));

const dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.DIRECTIONAL_LIGHT_INTENSITY);
dirLight.position.set(CONFIG.DIRECTIONAL_LIGHT_POS.x, CONFIG.DIRECTIONAL_LIGHT_POS.y, CONFIG.DIRECTIONAL_LIGHT_POS.z);
scene.add(dirLight);

scene.add(new THREE.AmbientLight(0xffffff, CONFIG.AMBIENT_LIGHT_INTENSITY));

// ---------------------------
// Controls
// ---------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 2;
controls.enablePan = true;
controls.enableKeys = false;
controls.minDistance = 0.1;
controls.maxDistance = 500;

// ---------------------------
// Loader Referenzen
// ---------------------------
const loaderOverlay = document.getElementById("loader");
const loadingText = document.querySelector(".loading-text");
const viewer = document.getElementById("viewer");

// Viewer zunächst verstecken
viewer.style.display = "none";

// Speicher für aktuelle Punkte (für Cleanup)
let currentPoints = null;
let currentAxesGroup = null;
let currentObjectUrl = null;
let animationFrameId = null;
let isContextLost = false;

// Dateipath Variable
let currentFilePath = CONFIG.DEFAULT_FILE;

function disposeObject3D(root) {
    if (!root) return;

    root.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }

        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

function cleanupSceneObjects() {
    if (currentPoints) {
        scene.remove(currentPoints);
        disposeObject3D(currentPoints);
        currentPoints = null;
    }

    if (currentAxesGroup) {
        scene.remove(currentAxesGroup);
        disposeObject3D(currentAxesGroup);
        currentAxesGroup = null;
    }
}

function cleanupObjectUrl() {
    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
    }
}

// ---------------------------
// Funktion zum Laden von PLY-Dateien
// ---------------------------
function loadPointCloud(filePath) {
    if (isContextLost) return;

    loaderOverlay.style.display = "flex";
    loadingText.innerText = "Lade 3D Punktwolke…";
    viewer.style.display = "none";
    
    // Cleanup alter Punkte
    cleanupSceneObjects();

    const loader = new PLYLoader();
    
    loader.load(
        filePath,
        // SUCCESS
        geometry => {
            geometry.center();

            const material = new THREE.PointsMaterial({
                size: CONFIG.POINT_SIZE,
                vertexColors: true
            });

            const points = new THREE.Points(geometry, material);
            points.rotation.x = -Math.PI / 2;
            scene.add(points);
            currentPoints = points;

            // ---------------------------
            // Bounding Box
            // ---------------------------
            const box = new THREE.Box3().setFromObject(points);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3()).length();
            const base = new THREE.Vector3(
                (box.min.x + box.max.x) / 2,
                box.min.y,
                (box.min.z + box.max.z) / 2
            );

            // ---------------------------
            // Achsen mit Labels
            // ---------------------------
            const L = size * CONFIG.AXES_SCALE;
            const arrowHead = CONFIG.AXES_ARROW_HEAD_SCALE * L;
            const axesGroup = new THREE.Group();

            // Rote X-Achse
            const xArrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, 0),
                L,
                0xff0000,
                arrowHead,
                arrowHead * 0.5
            );

            // Grüne Y-Achse
            const yArrow = new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 0, 0),
                L,
                0x00ff00,
                arrowHead,
                arrowHead * 0.5
            );

            // Blaue Z-Achse
            const zArrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 0),
                L,
                0x0000ff,
                arrowHead,
                arrowHead * 0.5
            );

            axesGroup.add(xArrow, yArrow, zArrow);
            axesGroup.position.copy(base);
            axesGroup.position.x -= L * CONFIG.AXES_OFFSET_MULTIPLIER;
            axesGroup.position.z -= L * CONFIG.AXES_OFFSET_MULTIPLIER;

            scene.add(axesGroup);
            currentAxesGroup = axesGroup;

            // ---------------------------
            // Kamera
            // ---------------------------
            camera.position.set(
                center.x,
                center.y + size * CONFIG.CAMERA_HEIGHT_OFFSET,
                center.z + size * CONFIG.CAMERA_DISTANCE_MULTIPLIER
            );

            controls.target.copy(center);
            controls.update();

            // ---------------------------
            // Loader ausblenden
            // ---------------------------
            loaderOverlay.style.display = "none";
            viewer.style.display = "block";
        },
        // PROGRESS
        xhr => {
            if (xhr.lengthComputable) {
                const percent = ((xhr.loaded / xhr.total) * 100).toFixed(0);
                loadingText.innerText = `Lade 3D Punktwolke… ${percent}%`;
            }
        },
        // ERROR
        error => {
            loadingText.innerText = "Fehler beim Laden der Datei.";
            console.error("PLY Loading Error:", error);
            loaderOverlay.style.display = "none";
        }
    );
}

// ---------------------------
// PLY Laden
// ---------------------------
loadPointCloud(currentFilePath);

// ---------------------------
// Resize Handling
// ---------------------------
window.addEventListener("resize", () => {
    if (isContextLost) return;

    const width = viewerElement.clientWidth;
    const height = viewerElement.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// ---------------------------
// Render Loop
// ---------------------------
function animate() {
  if (isContextLost) return;

  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    isContextLost = true;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    loaderOverlay.style.display = 'flex';
    loadingText.innerText = 'WebGL-Kontext verloren. Bitte Seite neu laden.';
});

renderer.domElement.addEventListener('webglcontextrestored', () => {
    isContextLost = false;
    loadPointCloud(currentFilePath);
    animate();
});

window.addEventListener('pagehide', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    cleanupSceneObjects();
    cleanupObjectUrl();
    controls.dispose();
    renderer.dispose();
});

// ---------------------------
// Upload-Funktionalität
// ---------------------------
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.querySelector(".upload-btn");
const dropdownContainer = document.querySelector(".upload-dropdown-container");

if (fileInput && uploadBtn) {
    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownContainer.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!dropdownContainer.contains(e.target)) {
            dropdownContainer.classList.remove("active");
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileName = file.name.toLowerCase();
            
            if (!fileName.endsWith('.ply')) {
                alert("Bitte nur PLY-Dateien hochladen.");
                return;
            }

            cleanupObjectUrl();
            const fileURL = URL.createObjectURL(file);
            currentObjectUrl = fileURL;
            currentFilePath = fileURL;
            loadPointCloud(fileURL);
            dropdownContainer.classList.remove("active");
        }
    });

    // Drag & Drop Support
    const dragZone = viewer;
    dragZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragZone.style.opacity = "0.7";
    });

    dragZone.addEventListener("dragleave", () => {
        dragZone.style.opacity = "1";
    });

    dragZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dragZone.style.opacity = "1";
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.ply')) {
                cleanupObjectUrl();
                const fileURL = URL.createObjectURL(file);
                currentObjectUrl = fileURL;
                currentFilePath = fileURL;
                loadPointCloud(fileURL);
            } else {
                alert("Bitte nur PLY-Dateien hochladen.");
            }
        }
    });
}

}
