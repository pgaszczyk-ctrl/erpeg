// Preview of the 3D hero's running pose, old pivots (node origins at the feet) vs real joints (src/ludzik3dPoza.ts).
// Run: npx vite --port 5179, open /scripts/podglad-ludzik3d/?plik=modele/straznik.glb ; window.__gotowe = true when drawn.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { wzmocnij, stawyModelu, receWBiegu, obroc, biodra, poprawSylwetke, podniesGlowe, SYLWETKA } from '../../src/ludzik3dPoza';

const q = new URLSearchParams(location.search);
const plik = q.get('plik') ?? 'modele/straznik.glb';
const tryby = (q.get('tryby') ?? 'stary,nowy').split(',');
const FAZ = 6, CELL = Number(q.get('cell') ?? 220);
const U = { rece: Number(q.get('rece') ?? 0.72), lokiec: Number(q.get('lokiec') ?? 0.7), skret: Number(q.get('skret') ?? 0.1) };
const POCHYL = Number(q.get('pochyl') ?? 0.08);
const gltf = await new GLTFLoader().loadAsync('/' + plik);
const model = gltf.scene;
model.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = o.name === 'head' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); });
const scene = new THREE.Scene(); scene.add(model);
scene.add(new THREE.AmbientLight(0xffffff, 2.4));
const sun = new THREE.DirectionalLight(0xfff1dc, 1); sun.position.set(-1, 2, 1.2); scene.add(sun);
const walk = gltf.animations.find((a) => a.name === 'walk')!;
wzmocnij(THREE, walk, 1.9);
const mixer = new THREE.AnimationMixer(model);
const act = mixer.clipAction(walk); act.play();
const reszta: { o: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion }[] = [];
model.traverse((o) => { if (o !== model && o.parent !== model) reszta.push({ o, p: o.position.clone(), q: o.quaternion.clone() }); });
for (const k of ['szyja', 'barkiNizej', 'barkiWezej', 'szyjaPromien', 'ramionaNizej'] as const) if (q.get(k)) SYLWETKA[k] = Number(q.get(k));
const zSylwetka = q.get('sylwetka') !== '0';
const stawy0 = stawyModelu(THREE, model);
if (zSylwetka) poprawSylwetke(THREE, model);
model.traverse((o) => { if (o.name === 'szyja3d') reszta.push({ o, p: o.position.clone(), q: o.quaternion.clone() }); });
const stawy = stawyModelu(THREE, model); void stawy0;
console.log('stawy', JSON.stringify(Object.fromEntries(Object.entries(stawy).map(([k, v]) => [k, v!.toArray().map((x) => +x.toFixed(2))]))));
const box = new THREE.Box3().setFromObject(model);
const H = box.max.y - box.min.y;
const widoki = [{ n: 'gra 22°', kat: 22, yaw: 0.6 }, { n: 'bok', kat: 0, yaw: Math.PI / 2 }];
const canvas = document.getElementById('c') as HTMLCanvasElement;
const W = FAZ * CELL, Hc = tryby.length * widoki.length * CELL;
canvas.width = W; canvas.height = Hc;
const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
r.outputColorSpace = THREE.LinearSRGBColorSpace; r.setClearColor(0xc9b48a); r.autoClear = false; r.clear();
const gora = ['core', 'head', 'upperL', 'foreL', 'handL', 'upperR', 'foreR', 'handR', 'WeaponMesh', 'BowStringTop', 'BowStringBottom'];
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
function stary() {
  // The pre-fix code: pivots = node positions (≈ the feet).
  const pos = (n: string) => model.getObjectByName(n)?.position.clone() ?? new THREE.Vector3();
  const bd = pos('thighL').add(pos('thighR')).multiplyScalar(0.5);
  let skret = 0;
  for (const s of ['L', 'R']) {
    const udo = pos('thigh' + s), kolano = pos('shin' + s), bark = pos('upper' + s);
    const noga = Math.max(-1, Math.min(1, (kolano.z - udo.z) / Math.max(1e-3, udo.distanceTo(kolano)) * 1.6));
    const reka = ['upper' + s, 'fore' + s, 'hand' + s];
    obroc(THREE, model, reka, X, U.rece * noga, bark);
    obroc(THREE, model, reka.slice(1), X, -U.lokiec, pos('fore' + s));
    skret += (s === 'L' ? 1 : -1) * noga;
  }
  obroc(THREE, model, gora, Y, U.skret * skret * 0.5, bd);
  obroc(THREE, model, gora, X, POCHYL, bd);
}
function nowy() {
  receWBiegu(THREE, model, stawy, 1, U, gora);
  obroc(THREE, model, gora, X, POCHYL, biodra(THREE, model, stawy));
}
tryby.forEach((tryb, ti) => widoki.forEach((w, wi) => {
  for (let f = 0; f < FAZ; f++) {
    for (const x of reszta) { x.o.position.copy(x.p); x.o.quaternion.copy(x.q); }
    act.time = (f / FAZ) * walk.duration; mixer.update(0);
    if (tryb === 'nowy' && zSylwetka) podniesGlowe(model);
    if (tryb === 'stary') stary(); else if (tryb === 'nowy') nowy();
    model.rotation.y = w.yaw;
    const half = H * 0.62, p = (w.kat * Math.PI) / 180, ty = H * 0.45;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 500);
    cam.position.set(0, ty + Math.sin(p) * 100, Math.cos(p) * 100); cam.lookAt(0, ty, 0);
    const row = ti * widoki.length + wi;
    r.setViewport(f * CELL, Hc - (row + 1) * CELL, CELL, CELL);
    r.render(scene, cam);
  }
}));
const ctx2 = document.createElement('canvas');
(window as unknown as { __gotowe: boolean }).__gotowe = true;
void ctx2;
