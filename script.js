import * as THREE from "three";                 // load the whole Three.js 3D library as "THREE"
import { buildMascot } from "./character.js";   // load the function that builds the girl

// SETTINGS (change values here) 
const CONFIG = {
  maxYaw: 0.45,           // max left/right head turn in radians (about 26 degrees)
  maxPitch: 0.25,         // max up/down head turn in radians (about 14 degrees)
  smoothing: 0.08,        // 0 to 1: smaller = slower, smoother head movement
  getStartedUrl: "home.html"      // where the button goes (replace with signup/dashboard URL)
};

const stage = document.getElementById("mascot");      // the empty div in index.html
const button = document.getElementById("get-started"); // the Get Started link
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// reducedMotion = true if the user turned off animations in their system

button.href = CONFIG.getStartedUrl;   // set the button's destination

//  RENDERER (draws 3D on a canvas) 
function createRenderer() {
  try {                                              // try, because WebGL may not exist
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // alpha: transparent background, so the cream page shows; antialias: smooth edges
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp, but capped at 2 for speed
    renderer.outputColorSpace = THREE.SRGBColorSpace;  // correct colors on screen
    renderer.shadowMap.enabled = true;                 // allow shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // soft shadow edges
    stage.appendChild(renderer.domElement);            // put the canvas inside the mascot div
    return renderer;                                   // give it back to init()
  } catch {
    return null;                                       // WebGL not available
  }
}

// LIGHTS 
function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfffdf0, 0xcfd8b0, 1.2));
  // soft all-around light: ivory from above, light sage from below

  const key = new THREE.DirectionalLight(0xfff4e0, 1.8);  // main light, like a studio lamp
  key.position.set(1.5, 2.5, 3);                          // front, right, above
  key.castShadow = true;                                  // this light makes shadows
  key.shadow.mapSize.set(1024, 1024);                     // shadow quality
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.5, far: 10 });
  // small shadow area = sharper shadows
  key.shadow.normalBias = 0.02;                           // prevents stripes on curved surfaces
  scene.add(key);                                         // add the light to the scene

  const rim = new THREE.DirectionalLight(0xe6f0cf, 0.8);  // weak light from behind
  rim.position.set(-2, 1.5, -2);                          // back-left: a soft glow on edges
  scene.add(rim);
}

// CAMERA FRAMING 
function frameModel(model, camera) {
  const box = new THREE.Box3().setFromObject(model);   // invisible box around the girl
  const size = box.getSize(new THREE.Vector3());       // its width/height/depth
  model.position.sub(box.getCenter(new THREE.Vector3())); // move her to the exact center
  const fovRad = THREE.MathUtils.degToRad(camera.fov / 2); // half the camera angle in radians
  camera.position.set(0, 0, (size.y / 2) / Math.tan(fovRad) * 1.2);
  // distance so the whole height fits, with a 20% margin
}

// CURSOR TRACKING 
function createHeadTracker(headBone) {
  const restQuat = headBone.quaternion.clone();  // remember the original (resting) rotation
  const target = { x: 0, y: 0 };    // where the head SHOULD look
  const current = { x: 0, y: 0 };   // where the head IS looking now
  const euler = new THREE.Euler();           // reusable rotation object (no new objects each frame)
  const offset = new THREE.Quaternion();     // reusable rotation object

  const setTarget = (clientX, clientY) => {
    const nx = THREE.MathUtils.clamp((clientX / window.innerWidth) * 2 - 1, -1, 1);
    // cursor X as a number from -1 (left) to +1 (right)
    const ny = THREE.MathUtils.clamp((clientY / window.innerHeight) * 2 - 1, -1, 1);
    // cursor Y as a number from -1 (top) to +1 (bottom)
    target.y = nx * CONFIG.maxYaw;     // left/right cursor turns the head sideways
    target.x = ny * CONFIG.maxPitch;   // up/down cursor nods the head
  };
  const reset = () => { target.x = 0; target.y = 0; };  // look straight ahead again

  if (!reducedMotion) {   // only listen if the user allows motion
    window.addEventListener("pointermove", e => setTarget(e.clientX, e.clientY), { passive: true });
    // mouse, trackpad or finger moves: update the target
    window.addEventListener("pointerup", e => { if (e.pointerType === "touch") reset(); });
    // finger lifted: return to center
    document.documentElement.addEventListener("pointerleave", reset);
    // cursor left the page: return to center
    window.addEventListener("blur", reset);
    // switched tab/window: return to center
  }

  return function update() {        // this runs once per frame
    current.x += (target.x - current.x) * CONFIG.smoothing;
    current.y += (target.y - current.y) * CONFIG.smoothing;
    // move a small step toward the target each frame = smooth easing
    euler.set(current.x, current.y, 0);   // build a rotation from the two values
    headBone.quaternion.copy(restQuat).multiply(offset.setFromEuler(euler));
    // start from the resting pose, then add the turn. Only the head bone rotates
  };
}

// START EVERYTHING 
function init() {
  const renderer = createRenderer();                       // try to create the canvas
  if (!renderer) return stage.classList.add("is-fallback"); // no WebGL: CSS hides the mascot box

  const scene = new THREE.Scene();                         // the 3D world
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // 30 degree view (looks like a real lens), aspect 1, near 0.1, far 100
  addLights(scene);                                        // add the lights

  const { model, headBone } = buildMascot();               // get the girl and her head bone
  scene.add(model);                                        // put her in the world
  frameModel(model, camera);                               // center her and place the camera

  const resize = () => {
    renderer.setSize(stage.clientWidth, stage.clientHeight);          // canvas = box size
    camera.aspect = stage.clientWidth / stage.clientHeight;           // match the proportions
    camera.updateProjectionMatrix();                                  // apply the change
  };
  new ResizeObserver(resize).observe(stage);   // run resize whenever the box size changes
  resize();                                    // and once at the start

  const updateHead = createHeadTracker(headBone);   // set up cursor tracking
  renderer.setAnimationLoop(() => {                 // runs every frame (about 60 times/second)
    if (document.hidden) return;                    // tab hidden: skip, saves battery
    updateHead();                                   // move the head a little
    renderer.render(scene, camera);                 // draw the picture
  });
}

init();   // run the whole thing