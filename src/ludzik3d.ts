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
  /** Walking cycles (two steps each) per map px walked: the legs keep pace with the hero's real speed, also when he
   * is faster (level, hotel, boots). 0.064 ≈ 2.4 cycles a second at the base 70 km/h, like the drawn heroes. */
  cyklNaPx: 0.064,
  /** The artist's blow takes 1.27 s; this many times faster so it keeps up with quick swings. */
  tempoAtaku: 1.8,
  /** The artist's steps are gentle and from the front go into the screen: every walking move is made this many
   * times bigger (each part's turn about its own axis, so the parts stay joined), plus a small bob per step. */
  krokSila: 1.9,
  podskokPx: 1,
  /** Light from the north-west, like the world's buildings and trees (three.js units: ambient π = the flat palette). */
  swiatlo: 1.0,
  otoczenie: 2.4,
  obrys: [0x1e, 0x1a, 0x24] as const,
  /** At most this many new pictures a second (FPS log, 27 Oct 2026: rendering + reading the picture back from the
   * graphics card + outlining every frame cost phones ~10 % of each frame); standing still draws nothing new; the drawn heroes walk at 5–8 frames a second. */
  klatekNaS: 12,
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
  /** Walk split into legs and the rest, and the blow whole and without the legs: walking keeps the legs going while
   * the upper body strikes (owner, 27 Oct 2026: a swing while walking froze the legs). */
  chodNogi: THREE.AnimationAction;
  chodGora: THREE.AnimationAction;
  atak: THREE.AnimationAction;
  atakGora: THREE.AnimationAction;
  miecz?: THREE.Object3D;
  /** Canvas px per model unit. */
  jednostkaPx: number;
  /** The model goes into this picture first; a shader pass then closes the outline straight into the canvas. */
  rt: THREE.WebGLRenderTarget;
  obrysScena: THREE.Scene;
  obrysKamera: THREE.OrthographicCamera;
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
  private kat = 0;
  private klucz = 'ludzik3d';
  private pokazany = false;
  /** When the picture was last drawn, and what it showed (nothing new while standing still). */
  private narysowany = -1e9;
  private stanRysunku = '';
  private swiatla?: { amb: THREE.AmbientLight; sun: THREE.DirectionalLight };

  constructor(private scene: Phaser.Scene) {}

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
      const nogi = (t: THREE.KeyframeTrack) => /^(thigh|shin|foot)/.test(t.name);
      const czesc = (c: THREE.AnimationClip, nazwa: string, wez: (t: THREE.KeyframeTrack) => boolean) =>
        new three.AnimationClip(nazwa, c.duration, c.tracks.filter(wez));
      const walk = clip('walk'), attack = clip('attack');
      const chodNogi = mixer.clipAction(czesc(walk, 'walk-nogi', nogi));
      const chodGora = mixer.clipAction(czesc(walk, 'walk-gora', (t) => !nogi(t)));
      const atak = mixer.clipAction(attack);
      const atakGora = mixer.clipAction(czesc(attack, 'attack-gora', (t) => !nogi(t)));
      for (const a of [atak, atakGora]) {
        a.setLoop(three.LoopOnce, 1);
        a.clampWhenFinished = false;
        a.timeScale = LUDZIK_3D.tempoAtaku;
      }
      const miecz = model.getObjectByName('Sword_at_hand_grip') ?? undefined;
      // The outline on the graphics card (FPS log, 27 Oct 2026: reading the picture back to outline it on the CPU
      // stalled phones): hard alpha, then a dark rim LUDZIK_3D.gestosc px wide (4-neighbour distance) around the figure.
      const rt = new three.WebGLRenderTarget(n, n, { minFilter: three.NearestFilter, magFilter: three.NearestFilter, depthBuffer: true });
      const T = Math.round(LUDZIK_3D.gestosc);
      const [or, og, ob] = LUDZIK_3D.obrys;
      const obrysMat = new three.ShaderMaterial({
        uniforms: { tex: { value: rt.texture }, px: { value: new three.Vector2(1 / n, 1 / n) }, obrys: { value: new three.Vector3(or / 255, og / 255, ob / 255) } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          uniform sampler2D tex; uniform vec2 px; uniform vec3 obrys; varying vec2 vUv;
          void main() {
            vec4 c = texture2D(tex, vUv);
            if (c.a > ${(110 / 255).toFixed(4)}) { gl_FragColor = vec4(c.rgb, 1.0); return; }
            for (int dy = -${T}; dy <= ${T}; dy++) for (int dx = -${T}; dx <= ${T}; dx++) {
              if (abs(dx) + abs(dy) > ${T}) continue;
              if (texture2D(tex, vUv + vec2(float(dx), float(dy)) * px).a > ${(110 / 255).toFixed(4)}) { gl_FragColor = vec4(obrys, 1.0); return; }
            }
            gl_FragColor = vec4(0.0);
          }`,
        depthTest: false,
        depthWrite: false,
      });
      const obrysScena = new three.Scene();
      obrysScena.add(new three.Mesh(new three.PlaneGeometry(2, 2), obrysMat));
      const obrysKamera = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.g = { three, renderer, scene, camera, model, mixer, chodNogi, chodGora, atak, atakGora, miecz, jednostkaPx: k, rt, obrysScena, obrysKamera };
      this.swiatla = { amb, sun };
      // The WebGL canvas itself is the texture: uploaded graphics card to graphics card, never read back.
      this.scene.textures.addImage(this.klucz, canvas as unknown as HTMLImageElement);
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
    g.atak.stop();
    g.atakGora.stop();
    (g.chodNogi.isRunning() ? g.atakGora : g.atak).reset().play();
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
    // A whole-body blow that starts walking goes on with the upper body only, at the same moment.
    if (idzie && g.atak.isRunning()) {
      const t = g.atak.time;
      g.atak.stop();
      g.atakGora.reset().play();
      g.atakGora.time = t;
    }
    const atakuje = g.atak.isRunning() || g.atakGora.isRunning();
    if (idzie) {
      if (!g.chodNogi.isRunning()) g.chodNogi.reset().play();
      g.chodNogi.timeScale = Math.min(4, player.vel.length() * LUDZIK_3D.cyklNaPx * g.chodNogi.getClip().duration);
    } else if (g.chodNogi.isRunning()) g.chodNogi.stop();
    // Arms swing with the legs while walking, unless they are striking.
    if (idzie && !atakuje) {
      if (!g.chodGora.isRunning()) { g.chodGora.reset().play(); g.chodGora.time = g.chodNogi.time; }
      g.chodGora.timeScale = g.chodNogi.timeScale;
    } else if (g.chodGora.isRunning()) g.chodGora.stop();
    if (g.miecz) g.miecz.visible = atakuje;
    if (this.swiatla) { this.swiatla.amb.intensity = LUDZIK_3D.otoczenie; this.swiatla.sun.intensity = LUDZIK_3D.swiatlo; }
    g.mixer.update(s);
    // A small bob per step (two per walking cycle), in sheet pixels.
    const faza = g.chodNogi.isRunning() ? g.chodNogi.time / g.chodNogi.getClip().duration : 0;
    g.model.position.y = (Math.abs(Math.sin(faza * Math.PI * 2)) * LUDZIK_3D.podskokPx * LUDZIK_3D.gestosc) / g.jednostkaPx;
    // Draw only when the pose changed, and not more often than klatekNaS (the last still pose is drawn once).
    const rusza = idzie || atakuje || Math.abs(d) > 0.004;
    const stan = rusza ? 'ruch' : `stoi|${this.kat.toFixed(3)}|${g.miecz?.visible}`;
    const teraz = performance.now();
    if (rusza ? teraz - this.narysowany >= 1000 / LUDZIK_3D.klatekNaS : stan !== this.stanRysunku) {
      this.narysowany = teraz;
      this.stanRysunku = stan;
      g.renderer.setRenderTarget(g.rt);
      g.renderer.render(g.scene, g.camera);
      g.renderer.setRenderTarget(null);
      g.renderer.render(g.obrysScena, g.obrysKamera);
      this.scene.textures.get(this.klucz).source[0].update();
    }

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

  destroy() {
    this.image?.destroy();
    this.image = undefined;
    this.g?.rt.dispose();
    this.g?.renderer.dispose();
    this.g = undefined;
    this.laduje = false;
    if (this.scene.textures.exists(this.klucz)) this.scene.textures.remove(this.klucz);
  }
}
