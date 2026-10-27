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
import { session } from './quests';
import { gear, item } from './inventory';
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
  /** At most this many new pictures a second (owner, 27 Oct 2026: the game stuttered on phones; every picture is a
   * render, a read-back from the graphics card and an upload). The drawn heroes walk at 5–8 frames a second. */
  klatekNaS: 20,
};

const KLUCZ = 'exp-ludzik3d';
(window as unknown as { __ludzik3d: typeof LUDZIK_3D }).__ludzik3d = LUDZIK_3D;
/** On by default on every server since 1.034; `?ludzik3d=0` switches it off on this device. */
export function ludzik3d(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('ludzik3d');
    if (q === '0' || q === '1') localStorage.setItem(KLUCZ, q);
    const v = localStorage.getItem(KLUCZ);
    if (v === '0' || v === '1') return v === '1';
  } catch { /* storage blocked: default */ }
  return true;
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
  /** What the last picture showed, and the time since it was drawn (s). */
  private podpis = '';
  private odKlatki = Infinity;
  private swiatla?: { amb: THREE.AmbientLight; sun: THREE.DirectionalLight };

  constructor(private scene: Phaser.Scene) {}

  /** Is the 3D hero drawn now (for tests). */
  get widoczny() { return this.pokazany; }

  private equipmentKey = '';
  private changing = false;
  private disposed = false;
  private pendingAim: number | null = null;
  private baseHead?: THREE.BufferGeometry;
  private donors = new Map<string, Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>>();

  /** Keep the guard's body and identity; only weapon, attack pose and the matching headwear change. */
  private async equipment() {
    const g=this.g;
    if(!g || !session.story.prolog || this.changing || this.disposed)return;
    const female=session.look.modul?.p==='k';
    const kind=item(gear.equip.bron)?.rodzaj ?? 'miecz';
    const hat=gear.equip.helm==='kapelusz_szkolny';
    const key=`${kind}:${hat}`;
    if(key===this.equipmentKey)return;
    this.changing=true;
    try {
      const load=(id:string)=>{
        if(!this.donors.has(id))this.donors.set(id,import('three/examples/jsm/loaders/GLTFLoader.js').then(({GLTFLoader})=>new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}modele/postacie3d/${id}.glb`)));
        return this.donors.get(id)!;
      };
      const id=kind==='luk'?(female?'18':'12'):kind==='magia'?(female?'mage_f':'11'):(female?'01':'16');
      const donor=await load(id);
      const headDonor=await load(hat?(female?'mage_f':'11'):(female?'01':'16'));
      if(this.disposed || this.g!==g)return;
      g.mixer.stopAllAction();
      const walkLegs=g.chodNogi.getClip(), walkUpper=g.chodGora.getClip();
      g.mixer.uncacheRoot(g.model);
      g.mixer=new g.three.AnimationMixer(g.model);
      g.chodNogi=g.mixer.clipAction(walkLegs);g.chodGora=g.mixer.clipAction(walkUpper);
      if(g.miecz){g.miecz.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats)mat.dispose();}});g.miecz.removeFromParent();}
      const weapon=donor.scene.getObjectByName('Weapon')!.clone(true);
      g.model.children[0].add(weapon);
      g.miecz=weapon;
      weapon.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)m.material=new g.three.MeshLambertMaterial({vertexColors:true,flatShading:true});});
      const head=g.model.getObjectByName('head') as THREE.Mesh;
      const dh=headDonor.scene.getObjectByName('head') as THREE.Mesh;
      this.baseHead ??= head.geometry;
      head.geometry=dh.geometry; // the pack's male/female mage has exactly the same face and hair as its guard
      const c=donor.animations.find(c=>c.name==='attack')!.clone();
      const legs=(t:THREE.KeyframeTrack)=>/^(thigh|shin|foot)/.test(t.name);
      g.atak=g.mixer.clipAction(c);
      g.atakGora=g.mixer.clipAction(new g.three.AnimationClip(`attack-upper-${id}`,c.duration,c.tracks.filter(t=>!legs(t))));
      for(const a of [g.atak,g.atakGora]){a.setLoop(g.three.LoopOnce,1);a.clampWhenFinished=false;a.timeScale=LUDZIK_3D.tempoAtaku;}
      this.equipmentKey=key;
    } catch(e) { console.warn('Ludzik 3D: wyposażenie',e); }
    finally {this.changing=false;if(this.pendingAim!==null){const aim=this.pendingAim;this.pendingAim=null;this.atakuj(aim);}}
  }

  private async zaladuj() {
    this.laduje = true;
    try {
      const three = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const file=session.story.prolog ? `modele/postacie3d/${session.look.modul?.p==='k'?'01':'16'}.glb` : LUDZIK_3D.plik;
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL || '/'}${file}`);
      if(this.disposed)return;
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
        m.material = o.name === 'head' ? new three.MeshBasicMaterial({vertexColors:true}) : new three.MeshLambertMaterial({ vertexColors: true, flatShading: true });
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
      const miecz = model.getObjectByName('Weapon') ?? model.getObjectByName('Sword_at_hand_grip') ?? undefined;
      renderer.autoClear = false;
      this.g = { three, renderer, scene, camera, model, mixer, chodNogi, chodGora, atak, atakGora, miecz, jednostkaPx: k };
      this.swiatla = { amb, sun };
      this.podpis = '';
      // The game's texture reads the 3D canvas straight away (no copy through the processor, see narysuj).
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
    if(this.changing){this.pendingAim=aim;return;}
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
      this.ustawObrys(0, 0, player, false);
      this.pokazany = false;
      return;
    }
    const g = this.g;
    void this.equipment();
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
    // A new picture only when it would look different (turned, a step further, a blow), at most klatekNaS a second;
    // standing still nothing is drawn at all.
    const podpis = `${this.equipmentKey}|${Math.round(this.kat * 40)}|${g.chodNogi.isRunning() ? Math.round(g.chodNogi.time * 24) : '-'}|${g.chodGora.isRunning() ? Math.round(g.chodGora.time * 24) : '-'}|${g.atak.isRunning() ? Math.round(g.atak.time * 30) : '-'}|${g.atakGora.isRunning() ? Math.round(g.atakGora.time * 30) : '-'}|${atakuje}|${this.swiatla?.amb.intensity}|${this.swiatla?.sun.intensity}`;
    this.odKlatki += s;
    if (podpis !== this.podpis && (this.odKlatki >= 1 / LUDZIK_3D.klatekNaS || !this.pokazany)) {
      this.podpis = podpis;
      this.odKlatki = 0;
      this.narysuj(g);
      this.scene.textures.get(this.klucz).source[0].update();
    }

    const sc = 0.36 * SKALA_POSTACI;
    const F = LUDZIK_3D.ramka;
    const oy = (STOPY_PX - (8 * SKALA_POSTACI) / sc) / F;
    if (!this.image) this.image = this.scene.add.image(player.x, player.y, this.klucz);
    this.ustawObrys(sc, oy, player, true);
    this.image
      .setScale(sc / LUDZIK_3D.gestosc)
      .setOrigin(0.5, oy)
      .setPosition(player.x, player.y)
      .setDepth(player.depth)
      .setAlpha(player.alpha)
      .setVisible(true);
    if (player.isTinted) this.image.setTint(player.tintTopLeft);
    else this.image.clearTint();
    player.setVisible(false);
    this.pokazany = true;
  }

  /**
   * Draws the figure (one render). Its dark outline, one sheet pixel thick, is made by the game itself: copies of the
   * same picture filled with the outline's colour, shifted by every offset within that thickness, lie under it
   * (`obrysy`). It used to be read back to the processor and outlined pixel by pixel – on phones every picture stalled
   * the game for a few ms (owner, 27 Oct 2026).
   */
  private narysuj(g: Gotowy) {
    g.renderer.clear();
    g.renderer.render(g.scene, g.camera);
  }

  /** The outline's copies under the figure (see narysuj): offsets in canvas px. */
  private obrysy: { im: Phaser.GameObjects.Image; dx: number; dy: number }[] = [];

  private ustawObrys(sc: number, oy: number, player: Player, widac: boolean) {
    if (!this.obrysy.length && widac) {
      const t = LUDZIK_3D.gestosc;
      const [r, g, b] = LUDZIK_3D.obrys;
      for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) {
        if ((!dx && !dy) || Math.abs(dx) + Math.abs(dy) > t) continue;
        const im = this.scene.add.image(0, 0, this.klucz).setTint((r << 16) | (g << 8) | b).setTintMode(Phaser.TintModes.FILL);
        this.obrysy.push({ im, dx, dy });
      }
    }
    const u = sc / LUDZIK_3D.gestosc; // world px per canvas px
    for (const o of this.obrysy) {
      if (!widac) {
        o.im.setVisible(false);
        continue;
      }
      o.im.setScale(u).setOrigin(0.5, oy).setPosition(player.x + o.dx * u, player.y + o.dy * u)
        .setDepth(player.depth - 0.001).setAlpha(player.alpha).setVisible(true);
    }
  }

  destroy() {
    this.disposed = true;
    for (const o of this.obrysy) o.im.destroy();
    this.obrysy = [];
    this.podpis = '';
    this.odKlatki = Infinity;
    this.image?.destroy();
    this.image = undefined;
    this.g?.mixer.stopAllAction();
    this.g?.renderer.dispose();
    this.g?.renderer.forceContextLoss();
    this.g = undefined;
    this.laduje = false;
    if (this.scene.textures.exists(this.klucz)) this.scene.textures.remove(this.klucz);
  }
}
