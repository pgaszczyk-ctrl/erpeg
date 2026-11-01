// The artist's rotating passenger cannon (order 45, „armata C v1”, public/modele/armata_C.glb) drawn by three.js into a
// canvas texture per station. One shared renderer; a station is redrawn only while it moves (aim, shot, net bounce) or
// once when it appears. The cannon keeps the artist's scale (about four heroes tall), it is NOT fitted to a hero's height.
import Phaser from 'phaser';
import type * as THREE from 'three';
import { SKALA_POSTACI } from '../skala';

export const ARMATA_3D = {
  plik: 'modele/armata_C.glb',
  /** The guard model is 1.25 units tall; the hero is 56 × 0.36 × SKALA_POSTACI map px. */
  straznikJednostek: 1.25,
  /** Size multiplier over the artist's scale (1 = about four heroes tall). */
  skala: 1,
  /** Camera angle above the horizon. The artist previewed at 60°; characters use 22°, which hides the muzzle. */
  pochylenie: 50,
  /** Canvas px per map px. */
  gestosc: 2,
  /** Frame around the model's origin (base centre), in model units. */
  promien: 5.2,
  wysokosc: 5.6,
  /** Turning time to the target, seconds. */
  obrot: 0.65,
  /** The artist's launch moment inside the `fire` clip. */
  wylot: 0.12,
  klatekNaS: 24,
  obrys: '#1e1a24',
  /** Hard light bands (toon) instead of smooth 3D shading, so it reads like the pixel-art world (owner, 1 Nov 2026:
   * „wyglądają jak wklejone”). Shares of the base colour lit by the NW sun: shadow, middle, lit. */
  pasma: [0.62, 0.84, 1],
  /** Ground shadow cast to the south-east like the buildings' (alpha, how far per unit of height). */
  cien: { alfa: 0.5, kolor: '#14121a', wSkos: 0.75, wDol: 0.45 },
};

type Gotowy = {
  three: typeof THREE;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  gltf: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF;
  canvas: HTMLCanvasElement;
};

let wczytywanie: Promise<Gotowy | null> | null = null;
let wczytywanieGotowe: Gotowy | null = null;

function wczytaj(): Promise<Gotowy | null> {
  wczytywanie ??= (async () => {
    try {
      const three = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL || '/'}${ARMATA_3D.plik}`);
      const A = ARMATA_3D, k = jednostkaPx() * A.gestosc;
      const e = (A.pochylenie * Math.PI) / 180;
      const { gora, dol } = ramka();
      const w = Math.ceil(2 * A.promien * k), h = Math.ceil((gora + dol) * k);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = three.SRGBColorSpace;
      const scene = new three.Scene();
      // Ambient + one NW sun on toon materials: at most 3 tones per material, the lit one = the artist's palette colour.
      scene.add(new three.AmbientLight(0xffffff, Math.PI));
      const sun = new three.DirectionalLight(0xffffff, Math.PI);
      sun.position.set(-6, 12, 8); // north-west light, like the buildings
      scene.add(sun);
      zabarwPasmami(three, gltf.scene);
      const camera = new three.OrthographicCamera(-A.promien, A.promien, gora, -dol, 0.1, 60);
      camera.position.set(0, Math.sin(e) * 25, Math.cos(e) * 25);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      return (wczytywanieGotowe = { three, renderer, scene, camera, gltf, canvas });
    } catch (err) {
      console.warn('Armata 3D: nie udało się wczytać modelu', err);
      return null;
    }
  })();
  return wczytywanie;
}

/** Swaps the file's PBR materials for toon ones with hard bands (glowing parts – lamp, flash, smoke – stay flat). */
function zabarwPasmami(three: typeof THREE, root: THREE.Object3D) {
  const P = ARMATA_3D.pasma;
  // The toon gradient multiplies the sun; ambient 1 + sun × step: steps chosen so the totals are P (÷ the brightest).
  const max = P[P.length - 1];
  const kroki = new Uint8Array(P.map((v) => Math.round(Math.max(0, Math.min(1, (v / max) * 2 - 1)) * 255)));
  const grad = new three.DataTexture(kroki, P.length, 1, three.RedFormat);
  grad.minFilter = grad.magFilter = three.NearestFilter;
  grad.needsUpdate = true;
  const gotowe = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const zamien = (mat: THREE.Material) => {
      let nowy = gotowe.get(mat);
      if (!nowy) {
        const std = mat as THREE.MeshStandardMaterial;
        const swieci = /Flash|Smoke|Lamp/i.test(mat.name);
        // ambient π + sun π (three divides diffuse by π) = 2 at the lit step, so the colour is halved to land on the palette.
        const kolor = std.color ? std.color.clone() : new three.Color(1, 1, 1);
        nowy = swieci
          ? new three.MeshBasicMaterial({ color: kolor, transparent: mat.transparent, opacity: mat.opacity })
          : new three.MeshToonMaterial({ color: kolor.multiplyScalar(0.5 * max), gradientMap: grad, transparent: mat.transparent, opacity: mat.opacity });
        nowy.name = mat.name;
        gotowe.set(mat, nowy);
      }
      return nowy;
    };
    m.material = Array.isArray(m.material) ? m.material.map(zamien) : zamien(m.material);
  });
}

/** Map px per model unit. */
function jednostkaPx() {
  return (56 * 0.36 * SKALA_POSTACI * ARMATA_3D.skala) / ARMATA_3D.straznikJednostek;
}

/** The landing net and the exit spot as map offsets from the base (model: NetBounce/LandingSocket and ExitSocket;
 *  the net always points east). A point at height h shows h·cos(pitch) higher, one south by z shows z·sin(pitch) lower. */
export function punktySiatki() {
  const k = jednostkaPx(), e = (ARMATA_3D.pochylenie * Math.PI) / 180;
  return {
    siatka: { dx: 3.65 * k, dy: -(3.12 - 0.57) * k * Math.cos(e) },
    wyjscie: { dx: 4.65 * k, dy: 1.3 * k * Math.sin(e) },
  };
}

/** Visible extent above and below the base centre on screen, in units (orthographic camera tilted by `pochylenie`). */
function ramka() {
  const A = ARMATA_3D, e = (A.pochylenie * Math.PI) / 180;
  return { gora: A.wysokosc * Math.cos(e) + A.promien * Math.sin(e), dol: A.promien * Math.sin(e) + 0.3 };
}

/** One station on the map. */
export class Armata3D {
  image?: Phaser.GameObjects.Image;
  /** The cannon's shadow on the ground (south-east, like the buildings'). */
  private cien?: Phaser.GameObjects.Image;
  private cienTex?: Phaser.Textures.CanvasTexture;
  private root?: THREE.Object3D;
  private yaw?: THREE.Object3D;
  private mixer?: THREE.AnimationMixer;
  private aim: { start: number; delta: number; t: number; d: number; done: () => void } | null = null;
  private shot = -1;
  private onShot?: () => void;
  private ruch = 1; // seconds still to redraw after the last movement
  private odKlatki = Infinity;
  private textura?: Phaser.Textures.CanvasTexture;
  private tmp?: HTMLCanvasElement;
  private dead = false;
  private visible = true;
  private static nr = 0;
  private klucz = `armata3d-${++Armata3D.nr}`;
  ready: Promise<boolean>;

  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number) {
    this.ready = wczytaj().then((g) => (g && !this.dead ? this.zbuduj(g) : false));
  }

  private zbuduj(g: Gotowy) {
    const root = g.gltf.scene.clone(true);
    this.root = root;
    this.yaw = root.getObjectByName('TurretYaw') ?? undefined;
    this.mixer = new g.three.AnimationMixer(root);
    const { width: w, height: h } = g.canvas;
    this.textura = this.scene.textures.createCanvas(this.klucz, w, h) ?? undefined;
    if (!this.textura) return false;
    this.textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.tmp = document.createElement('canvas');
    this.tmp.width = w;
    this.tmp.height = h;
    const { gora, dol } = ramka();
    this.image = this.scene.add
      .image(this.x, this.y, this.klucz)
      .setOrigin(0.5, gora / (gora + dol))
      .setScale(1 / ARMATA_3D.gestosc)
      .setDepth(this.y)
      .setVisible(this.visible);
    // Shadow canvas: wide enough for the silhouette sheared south-east.
    const C = ARMATA_3D.cien, k = jednostkaPx() * ARMATA_3D.gestosc;
    const sw = Math.ceil(w + gora * k * C.wSkos + 4), sh = Math.ceil((dol + gora * C.wDol) * k + 4);
    this.cienTex = this.scene.textures.createCanvas(`${this.klucz}-cien`, sw, sh) ?? undefined;
    if (this.cienTex) {
      this.cienTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.cien = this.scene.add
        .image(this.x, this.y, `${this.klucz}-cien`)
        .setOrigin(w / 2 / sw, (dol * k) / sh)
        .setScale(1 / ARMATA_3D.gestosc)
        .setAlpha(C.alfa)
        .setDepth(-1e7 + 1) // just above the map, under every sprite (like creature shadows)
        .setVisible(this.visible);
    }
    this.ruch = 0.01;
    return true;
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.image?.setVisible(v);
    this.cien?.setVisible(v);
  }

  /** Where the cannon's picture lies on the map and its canvas, so the fog of war can leave it uncovered:
   * it is a tall landmark, seen from afar (owner, 1 Nov 2026). */
  get wyciecie(): { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null {
    const i = this.image;
    if (!i || !i.visible || !this.textura) return null;
    return { canvas: this.textura.canvas, x: i.x - i.displayOriginX * i.scaleX, y: i.y - i.displayOriginY * i.scaleY, w: i.displayWidth, h: i.displayHeight };
  }

  /** Turns the turret towards a map offset (target − station). Resolves when it points there. */
  celuj(dx: number, dy: number, natychmiast = false): Promise<void> {
    if (!this.yaw || Math.hypot(dx, dy) < 1e-6) return Promise.resolve();
    const start = this.yaw.rotation.y, cel = Math.atan2(dx, dy);
    const delta = Math.atan2(Math.sin(cel - start), Math.cos(cel - start));
    if (natychmiast) {
      this.yaw.rotation.y = start + delta;
      this.ruch = 0.01;
      return Promise.resolve();
    }
    return new Promise((done) => {
      this.aim?.done();
      this.aim = { start, delta, t: 0, d: ARMATA_3D.obrot, done };
    });
  }

  private grajRaz(nazwa: string) {
    const g = this.mixer, clip = this.clip(nazwa);
    if (!g || !clip) return 0;
    const a = g.clipAction(clip);
    a.reset();
    a.setLoop(wczytywanieGotowe!.three.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
    this.ruch = Math.max(this.ruch, clip.duration + 0.1);
    return clip.duration;
  }

  private clip(nazwa: string) {
    return wczytywanieGotowe?.gltf.animations.find((c) => c.name === nazwa);
  }

  /** Plays the shot; resolves at the moment the passenger leaves the barrel. */
  strzel(): Promise<void> {
    if (!this.mixer || this.shot >= 0) return Promise.resolve();
    this.grajRaz('fire');
    this.shot = 0;
    return new Promise((done) => (this.onShot = done));
  }

  /** The landing net bounces. */
  lap() {
    this.grajRaz('catch');
  }

  update(dt: number) {
    if (this.dead || !this.root || !this.textura) return;
    if (this.aim) {
      const a = this.aim;
      a.t += dt;
      const t = Math.min(1, a.t / a.d), s = t * t * (3 - 2 * t);
      this.yaw!.rotation.y = a.start + a.delta * s;
      this.ruch = Math.max(this.ruch, 0.05);
      if (t >= 1) {
        this.aim = null;
        a.done();
      }
    }
    if (this.mixer) this.mixer.update(dt);
    if (this.shot >= 0) {
      const przed = this.shot;
      this.shot += dt;
      if (przed < ARMATA_3D.wylot && this.shot >= ARMATA_3D.wylot) {
        this.onShot?.();
        this.onShot = undefined;
      }
      if (this.shot >= 0.9) this.shot = -1;
    }
    if (this.ruch <= 0 || !this.visible) return;
    this.ruch -= dt;
    this.odKlatki += dt;
    if (this.odKlatki < 1 / ARMATA_3D.klatekNaS && this.ruch > 0) return;
    this.odKlatki = 0;
    this.narysuj();
  }

  /** Renders the model and gives it the world's 1 map px dark outline. */
  private narysuj() {
    const g = wczytywanieGotowe;
    if (!g || !this.root || !this.textura || !this.tmp) return;
    g.scene.add(this.root);
    g.renderer.clear();
    g.renderer.render(g.scene, g.camera);
    g.scene.remove(this.root);
    const t = this.tmp.getContext('2d')!;
    t.globalCompositeOperation = 'copy';
    t.drawImage(g.canvas, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = ARMATA_3D.obrys;
    t.fillRect(0, 0, this.tmp.width, this.tmp.height);
    const c = this.textura.context, r = ARMATA_3D.gestosc;
    c.clearRect(0, 0, this.tmp.width, this.tmp.height);
    for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, r], [-r, r], [r, -r]]) c.drawImage(this.tmp, dx, dy);
    c.drawImage(g.canvas, 0, 0);
    this.textura.refresh();
    this.narysujCien();
  }

  /** The silhouette laid on the ground: the higher a point, the farther south-east its shadow. */
  private narysujCien() {
    const ct = this.cienTex, tmp = this.tmp, im = this.image;
    if (!ct || !tmp || !im) return;
    const C = ARMATA_3D.cien, c = ct.context;
    const bx = im.displayOriginX, by = im.displayOriginY; // base centre in the cannon canvas
    const ox = this.cien!.displayOriginX, oy = this.cien!.displayOriginY;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, ct.width, ct.height);
    c.imageSmoothingEnabled = false;
    // (x, y) relative to the base → (x − skos·y, −dol·y): y is negative above the base.
    c.setTransform(1, 0, -C.wSkos, -C.wDol, ox, oy);
    c.drawImage(tmp, -bx, -by);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = C.kolor;
    c.fillRect(0, 0, ct.width, ct.height);
    c.globalCompositeOperation = 'source-over';
    ct.refresh();
  }

  destroy() {
    this.dead = true;
    this.aim?.done();
    this.onShot?.();
    this.mixer?.stopAllAction();
    if (this.root) this.mixer?.uncacheRoot(this.root);
    this.image?.destroy();
    this.cien?.destroy();
    if (this.scene.textures.exists(this.klucz)) this.scene.textures.remove(this.klucz);
    if (this.scene.textures.exists(`${this.klucz}-cien`)) this.scene.textures.remove(`${this.klucz}-cien`);
  }
}
