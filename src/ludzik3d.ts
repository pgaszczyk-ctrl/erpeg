// The hero as a live 3D model in the 2D world (owner, 27 Oct 2026: „świat 2d, ale ludzik 3d”).
// The artist's guard (public/modele/straznik.glb: 14 rigid parts + a sword, clips „walk” and „attack”) is drawn
// every frame by three.js into a small canvas at the characters' pixel density (64 px frame, feet on row 62,
// like the sheets in sprites.ts), outlined in the characters' ink colour and shown as a Phaser image in place
// of the hero's sprite. Unlike the sheets it turns smoothly to any angle. On by default on the test server, elsewhere with
// `?ludzik3d=1`; `?ludzik3d=0` switches it off (remembered in localStorage `exp-ludzik3d`). three.js is loaded only when it is on.
import Phaser from 'phaser';
import type * as THREE from 'three';
import type { Player } from './objects/Player';
import { SKALA_POSTACI } from './skala';
import { STOPY_PX } from './content/wyglad';
import { TEST } from './version';
import { testVehicle, hasTestVehicle } from './testTransport';

export const LUDZIK_3D = {
  plik: 'modele/straznik.glb',
  /** Frame side in canvas px (the sheets' 64) and the figure's height in it (the 25 heroes: 54). */
  ramka: 64,
  wysokosc: 54,
  /** Extra detail: the canvas is drawn this many times bigger and shown that much smaller. */
  gestosc: 2,
  /** Camera from the front, this many degrees from above (the drawn heroes are seen a little from above). */
  pochylenie: 22,
  /** How fast the body turns to the walking direction (1/s). */
  obrot: 14,
  /** Walking clip speed at the hero's normal pace (the clip's own pace looked like a march). */
  tempoChodu: 1.35,
  /** The artist's steps are gentle and from the front go into the screen: every walking move is made this many
   * times bigger (each part's turn about its own axis, so the parts stay joined), plus a small bob per step. */
  krokSila: 1.9,
  podskokPx: 1,
  /** Light from the north-west, like the world's buildings and trees (three.js units: ambient π = the flat palette). */
  swiatlo: 1.0,
  otoczenie: 2.4,
  obrys: [0x1e, 0x1a, 0x24] as const,
};

const KLUCZ = 'exp-ludzik3d';
(window as unknown as { __ludzik3d: typeof LUDZIK_3D }).__ludzik3d = LUDZIK_3D;
/** On by default on the test server; elsewhere only after `?ludzik3d=1` on this device. */
export function ludzik3d(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('ludzik3d');
    if (q === '0' || q === '1') localStorage.setItem(KLUCZ, q);
    const v = localStorage.getItem(KLUCZ);
    if (v === '0' || v === '1') return v === '1';
  } catch { /* storage blocked: default */ }
  return TEST;
}

type Gotowy = {
  three: typeof THREE;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  chod: THREE.AnimationAction;
  atak: THREE.AnimationAction;
  miecz?: THREE.Object3D;
  /** Canvas px per model unit. */
  jednostkaPx: number;
};

/**
 * Makes a clip's moves k times bigger: every key of a part is a rigid move (turn q + shift t) from the rest pose;
 * it is replaced by the same screw motion taken k times (k × the angle about the same axis through the same point,
 * k × the slide along it), so hip/knee pivots stay where they are and joined parts stay joined.
 */
function wzmocnij(three: typeof THREE, clip: THREE.AnimationClip, k: number) {
  const pos = new Map<string, THREE.KeyframeTrack>();
  const rot = new Map<string, THREE.KeyframeTrack>();
  for (const t of clip.tracks) {
    const [node, prop] = t.name.split('.');
    if (prop === 'position') pos.set(node, t);
    if (prop === 'quaternion') rot.set(node, t);
  }
  const q = new three.Quaternion(), a = new three.Vector3(), tv = new three.Vector3(), c = new three.Vector3();
  const tp = new three.Vector3(), cr = new three.Vector3(), rc = new three.Vector3();
  for (const [node, rt] of rot) {
    const pt = pos.get(node);
    if (!pt || pt.times.length !== rt.times.length) continue;
    for (let i = 0; i < rt.times.length; i++) {
      q.fromArray(rt.values, i * 4).normalize();
      if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      tv.fromArray(pt.values, i * 3);
      const th = 2 * Math.acos(Math.min(1, q.w));
      if (th < 1e-5) { tv.multiplyScalar(k).toArray(pt.values, i * 3); continue; }
      a.set(q.x, q.y, q.z).divideScalar(Math.sin(th / 2));
      const d = tv.dot(a);
      tp.copy(tv).addScaledVector(a, -d);
      // A point on the screw axis: c = ½ (t⊥ + cot(θ/2) · a × t⊥).
      c.copy(tp).add(cr.crossVectors(a, tp).multiplyScalar(1 / Math.tan(th / 2))).multiplyScalar(0.5);
      q.setFromAxisAngle(a, th * k);
      rc.copy(c).applyQuaternion(q);
      tv.copy(c).sub(rc).addScaledVector(a, d * k);
      q.toArray(rt.values, i * 4);
      tv.toArray(pt.values, i * 3);
    }
  }
}

export class Ludzik3D {
  private g?: Gotowy;
  private laduje = false;
  private blad = false;
  private image?: Phaser.GameObjects.Image;
  private wyjscie = document.createElement('canvas');
  private kat = 0;
  private atakDo = 0;
  private klucz = 'ludzik3d';
  private pokazany = false;
  private swiatla?: { amb: THREE.AmbientLight; sun: THREE.DirectionalLight };

  constructor(private scene: Phaser.Scene) {
    const n = LUDZIK_3D.ramka * LUDZIK_3D.gestosc;
    this.wyjscie.width = this.wyjscie.height = n;
  }

  /** Is the 3D hero drawn now (for tests). */
  get widoczny() { return this.pokazany; }

  private async zaladuj() {
    this.laduje = true;
    try {
      const three = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL || '/'}${LUDZIK_3D.plik}`);
      const n = LUDZIK_3D.ramka * LUDZIK_3D.gestosc;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = n;
      const renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.setSize(n, n, false);
      renderer.setClearColor(0x000000, 0);
      // The file's vertex colours are the drawn palette as is: no sRGB conversion, or everything comes out pale.
      renderer.outputColorSpace = three.LinearSRGBColorSpace;
      const scene = new three.Scene();
      const model = gltf.scene;
      // The file's material is unlit (flat palette); a soft light makes the 3D shape read on a small figure.
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.material = new three.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      });
      scene.add(model);
      const amb = new three.AmbientLight(0xffffff, LUDZIK_3D.otoczenie);
      scene.add(amb);
      const sun = new three.DirectionalLight(0xfff1dc, LUDZIK_3D.swiatlo);
      sun.position.set(-1, 2, 1.2);
      scene.add(sun);
      // Size and feet from the rest pose: feet on row STOPY_PX, the figure LUDZIK_3D.wysokosc px tall.
      const box = new three.Box3().setFromObject(model);
      const k = (LUDZIK_3D.wysokosc * LUDZIK_3D.gestosc) / (box.max.y - box.min.y); // canvas px per unit
      const p = (LUDZIK_3D.pochylenie * Math.PI) / 180;
      const half = n / 2 / k;
      const camera = new three.OrthographicCamera(-half, half, half, -half, 0.01, 100);
      const ty = box.min.y + ((STOPY_PX + 1 - LUDZIK_3D.ramka / 2) * LUDZIK_3D.gestosc) / k / Math.cos(p);
      const d = 10;
      camera.position.set(0, ty + Math.sin(p) * d, Math.cos(p) * d);
      camera.lookAt(0, ty, 0);
      const mixer = new three.AnimationMixer(model);
      const clip = (name: string) => gltf.animations.find((a) => a.name === name) ?? gltf.animations[0];
      wzmocnij(three, clip('walk'), LUDZIK_3D.krokSila);
      const chod = mixer.clipAction(clip('walk'));
      const atak = mixer.clipAction(clip('attack'));
      atak.setLoop(three.LoopOnce, 1);
      atak.clampWhenFinished = false;
      const miecz = model.getObjectByName('Sword_at_hand_grip') ?? undefined;
      this.g = { three, renderer, scene, camera, model, mixer, chod, atak, miecz, jednostkaPx: k };
      this.swiatla = { amb, sun };
      this.scene.textures.addCanvas(this.klucz, this.wyjscie);
      this.scene.textures.get(this.klucz).setFilter(Phaser.Textures.FilterMode.NEAREST);
    } catch (e) {
      this.blad = true;
      console.warn('Ludzik 3D: nie udało się wczytać modelu', e);
    }
  }

  /** A melee swing: the model plays its blow, turned towards the aim (radians, screen axes). */
  atakuj(aim: number) {
    const g = this.g;
    if (!g) return;
    this.kat = Math.atan2(Math.cos(aim), Math.sin(aim));
    g.atak.reset().play();
    this.atakDo = performance.now() + g.atak.getClip().duration * 1000;
  }

  /** dt in seconds (GameScene.update's capped delta). */
  update(player: Player, dt: number) {
    if (!this.g && !this.laduje && !this.blad) void this.zaladuj();
    const riding = testVehicle !== 'pieszo' && hasTestVehicle(testVehicle);
    if (!this.g || riding || player.isDead || !this.scene.textures.exists(this.klucz)) {
      if (this.pokazany) player.setVisible(true);
      this.image?.setVisible(false);
      this.pokazany = false;
      return;
    }
    const g = this.g;
    const s = dt;
    // Turn towards the walking direction (screen down = towards the camera = model's +Z).
    const cel = Math.atan2(player.facing.x, player.facing.y);
    let d = cel - this.kat;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.kat += d * (1 - Math.exp(-s * LUDZIK_3D.obrot));
    this.kat = Math.atan2(Math.sin(this.kat), Math.cos(this.kat));
    g.model.rotation.y = this.kat;
    const idzie = player.vel.lengthSq() > 1;
    const atakuje = performance.now() < this.atakDo;
    if (idzie && !atakuje) {
      if (!g.chod.isRunning()) g.chod.reset().play();
      g.chod.timeScale = LUDZIK_3D.tempoChodu * Math.min(1.6, player.vel.length() / Math.max(1, player.speed));
    } else if (g.chod.isRunning()) g.chod.stop();
    if (!atakuje && g.atak.isRunning()) g.atak.stop();
    if (g.miecz) g.miecz.visible = atakuje;
    if (this.swiatla) { this.swiatla.amb.intensity = LUDZIK_3D.otoczenie; this.swiatla.sun.intensity = LUDZIK_3D.swiatlo; }
    g.mixer.update(s);
    // A small bob per step (two per walking cycle), in sheet pixels.
    const faza = g.chod.isRunning() ? g.chod.time / g.chod.getClip().duration : 0;
    g.model.position.y = (Math.abs(Math.sin(faza * Math.PI * 2)) * LUDZIK_3D.podskokPx * LUDZIK_3D.gestosc) / g.jednostkaPx;
    g.renderer.render(g.scene, g.camera);
    this.obrysuj(g.renderer.domElement);
    (this.scene.textures.get(this.klucz) as Phaser.Textures.CanvasTexture).refresh();

    const sc = 0.36 * SKALA_POSTACI;
    const F = LUDZIK_3D.ramka;
    if (!this.image) this.image = this.scene.add.image(player.x, player.y, this.klucz);
    this.image
      .setScale(sc / LUDZIK_3D.gestosc)
      .setOrigin(0.5, (STOPY_PX - (8 * SKALA_POSTACI) / sc) / F)
      .setPosition(player.x, player.y)
      .setDepth(player.depth)
      .setAlpha(player.alpha)
      .setVisible(true);
    if (player.isTinted) this.image.setTint(player.tintTopLeft);
    else this.image.clearTint();
    player.setVisible(false);
    this.pokazany = true;
  }

  /** Copies the render and closes a dark outline around the figure, as thick as one sheet pixel. */
  private obrysuj(src: HTMLCanvasElement) {
    const n = this.wyjscie.width;
    const ctx = this.wyjscie.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, n, n);
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, n, n);
    const a = img.data;
    const t = LUDZIK_3D.gestosc;
    const pelny = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) {
      pelny[i] = a[i * 4 + 3] > 110 ? 1 : 0;
      a[i * 4 + 3] = pelny[i] ? 255 : 0;
    }
    const [r, gg, b] = LUDZIK_3D.obrys;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (pelny[i]) continue;
      let blisko = false;
      for (let dy = -t; dy <= t && !blisko; dy++) for (let dx = -t; dx <= t; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > t) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < n && yy < n && pelny[yy * n + xx]) { blisko = true; break; }
      }
      if (!blisko) continue;
      a[i * 4] = r; a[i * 4 + 1] = gg; a[i * 4 + 2] = b; a[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  destroy() {
    this.image?.destroy();
    this.image = undefined;
    this.g?.renderer.dispose();
    this.g = undefined;
    this.laduje = false;
    if (this.scene.textures.exists(this.klucz)) this.scene.textures.remove(this.klucz);
  }
}
