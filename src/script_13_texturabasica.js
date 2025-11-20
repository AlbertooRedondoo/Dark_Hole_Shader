import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import starsImg from "./2k_stars.jpg?url";
import earthImg from "./earthmap1k.jpg?url";

// ==== CONFIG ====
const EARTH_RADIUS = 1.8;

let scene, renderer, camera, info, camcontrols1;
let backgroundMesh; // esfera de estrellas
let earth; // la Tierra "normal"
let blackHoleMesh; // plano con shader de agujero negro como fondo

const clock = new THREE.Clock();
let time = 0;

let objetos = []; // cosas que rotan (Tierra, etc.)

// Estado del agujero negro
let blackHoleAnimating = false;
let blackHoleTime = 0;
let earthEaten = false;

// Duraciones de la animación (segundos)
const BH_IN_DURATION = 2.0; // tiempo de "comerse" la Tierra
const BH_HOLD_DURATION = 0.5; // tiempo con la Tierra ya comida

// ====== SHADER AGUJERO NEGRO ======

const blackHoleVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fondo tipo túnel en negro y morado
const blackHoleFragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_strength;

varying vec2 vUv;

void main() {
  vec2 st = vUv * 2.0 - 1.0;

  float r = length(st);
  float angle = atan(st.y, st.x);

  // Patrón tipo túnel con bandas animadas
  float v = u_time * 4.0 + 8.0 / (r + 0.1);
  float bandas = abs(sin(v));

  vec3 purple = vec3(0.5, 0.0, 0.6);
  vec3 baseColor = mix(vec3(0.0), purple, bandas);

  float falloff = 1.0 - smoothstep(0.0, 1.2, r);
  baseColor *= falloff;

  float alpha = u_strength;

  gl_FragColor = vec4(baseColor, alpha);
}
`;

const blackHoleUniforms = {
  u_resolution: {
    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
  u_time: { value: 0.0 },
  u_strength: { value: 0.0 },
};

init();
animationLoop();

function init() {
  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "10px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "2";
  info.style.fontFamily = "Monospace";
  info.innerHTML = "Agujero negro Alberto Redondo";
  document.body.appendChild(info);

  // Botones
  createButtons();

  // Escena y cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("app").appendChild(renderer.domElement);

  camcontrols1 = new OrbitControls(camera, renderer.domElement);

  // Fondo estrellado
  const starsTexture = new THREE.TextureLoader().load(starsImg);
  const starsGeometry = new THREE.SphereGeometry(200, 64, 64);
  const starsMaterial = new THREE.MeshBasicMaterial({
    map: starsTexture,
    side: THREE.BackSide,
  });
  backgroundMesh = new THREE.Mesh(starsGeometry, starsMaterial);
  scene.add(backgroundMesh);

  // Tierra
  const earthTexture = new THREE.TextureLoader().load(earthImg);
  const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
  const earthMat = new THREE.MeshBasicMaterial({ map: earthTexture });
  earth = new THREE.Mesh(earthGeom, earthMat);
  scene.add(earth);
  objetos.push(earth);

  // Plano de agujero negro
  const bhGeom = new THREE.PlaneGeometry(400, 400, 1, 1);
  const bhMat = new THREE.ShaderMaterial({
    uniforms: blackHoleUniforms,
    vertexShader: blackHoleVertexShader,
    fragmentShader: blackHoleFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  blackHoleMesh = new THREE.Mesh(bhGeom, bhMat);
  blackHoleMesh.position.set(0, 0, -100); // dentro de la esfera de estrellas
  blackHoleMesh.visible = false; // empieza apagado
  scene.add(blackHoleMesh);

  // Eventos
  window.addEventListener("resize", onWindowResize);
}

function createButtons() {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.bottom = "20px";
  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";
  container.style.display = "flex";
  container.style.gap = "10px";
  container.style.zIndex = "3";
  document.body.appendChild(container);

  const btnBH = document.createElement("button");
  btnBH.textContent = "Agujero negro";
  styleButton(btnBH);
  btnBH.addEventListener("click", () => {
    startBlackHole();
  });
  container.appendChild(btnBH);

  const btnReset = document.createElement("button");
  btnReset.textContent = "Reset";
  styleButton(btnReset);
  btnReset.addEventListener("click", () => {
    resetEarth();
  });
  container.appendChild(btnReset);
}

function styleButton(btn) {
  btn.style.padding = "8px 14px";
  btn.style.borderRadius = "6px";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.fontFamily = "Monospace";
  btn.style.fontSize = "14px";
  btn.style.background = "#222";
  btn.style.color = "#fff";
  btn.style.opacity = "0.9";
  btn.onmouseenter = () => (btn.style.opacity = "1");
  btn.onmouseleave = () => (btn.style.opacity = "0.9");
}

// LÓGICA AGUJERO NEGRO

function startBlackHole() {
  blackHoleAnimating = true;
  blackHoleTime = 0;
  earthEaten = false;

  blackHoleMesh.visible = true;
  blackHoleUniforms.u_strength.value = 0.0;
}

function resetEarth() {
  earth.visible = true;
  earth.scale.set(1, 1, 1);
  earth.position.set(0, 0, 0);

  blackHoleAnimating = false;
  blackHoleTime = 0;
  earthEaten = false;
  blackHoleUniforms.u_strength.value = 0.0;
  blackHoleMesh.visible = false;
}

function updateBlackHole(delta) {
  if (!blackHoleAnimating) return;

  blackHoleTime += delta;

  if (blackHoleTime <= BH_IN_DURATION) {
    const p = blackHoleTime / BH_IN_DURATION;
    const s = 1.0 - p;

    if (earth.visible) {
      earth.scale.setScalar(Math.max(s, 0.001));
    }
    blackHoleUniforms.u_strength.value = p;
  } else if (blackHoleTime <= BH_IN_DURATION + BH_HOLD_DURATION) {
    blackHoleUniforms.u_strength.value = 1.0;
    if (!earthEaten) {
      earth.visible = false;
      earthEaten = true;
    }
  } else {
    blackHoleAnimating = false;
    blackHoleUniforms.u_strength.value = 1.0;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  blackHoleUniforms.u_resolution.value.set(
    window.innerWidth,
    window.innerHeight
  );
}

function animationLoop() {
  requestAnimationFrame(animationLoop);

  const delta = clock.getDelta();
  time += delta;

  blackHoleUniforms.u_time.value = time;

  updateBlackHole(delta);

  for (let object of objetos) object.rotation.y += 0.003;
  if (backgroundMesh) backgroundMesh.rotation.y += 0.0005;

  renderer.render(scene, camera);
}
