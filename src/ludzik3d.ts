// The hero as a live 3D model in the 2D world (owner, 27 Oct 2026: „świat 2d, ale ludzik 3d”).
// The artist's guard (public/modele/straznik.glb: 14 rigid parts + a sword, clips „walk” and „attack”) is drawn
// every frame by three.js into a small canvas at the characters' pixel density (64 px frame, feet on row 62,
// like the sheets in sprites.ts), outlined in the characters' ink colour and shown as a Phaser image in place
// of the hero's sprite. Unlike the sheets it turns smoothly to any angle. On by default on the test server, elsewhere with
// `?ludzik3d=1`; `?ludzik3d=0` switches it off (remembered in localStorage `exp-ludzik3d`). three.js is loaded only when it is on.
import { makieta } from './ui/makieta';
import Phaser from 'phaser';
import type * as THREE from 'three';
import type { Player } from './objects/Player';
import { SKALA_POSTACI, POWIEKSZENIE_3D } from './skala';
import { przebarwModel, przebarwGeometrie, koloryZWygladu, type KoloryPostaci } from './przebarwienie3d';
import { STOPY_PX } from './content/wyglad';
import { session } from './quests';
import { gear, item } from './inventory';
import { testVehicle, hasTestVehicle } from './testTransport';
import { wyrazistyMaterial } from './wyrazistosc3d';

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
  /** During a blow more pictures a second, so the swing reads as a swing (owner, 20 Nov 2026). */
  klatekNaSWAtaku: 30,
  /** Blows within this long count as one series: A → B → C, then again; after a pause the series starts anew. */
  seriaMs: 1100,
  /** The visual step into the blow (sheet px) – the hero's position in the world never moves. */
  wykrokPx: 1.2,
  wykrokMocnyPx: 2.4,
  /** Where in the donor clips the arrow leaves the string / the spell leaves the hand (share of the clip; measured from
   * the files: bowstring snaps back at 0.70–0.74 s of 1.19 s, the mage's hand thrusts at ~0.45 s of 1.51 s).
   * A shot starts its clip just before that moment, so the release shows as the projectile appears. */
  /** Running (owner, 21 Nov 2026: „wszystko chodzi sztywno”): the chest leans forward at full speed (radians), the bob
   * per step grows from podskokPx to biegPodskokPx, and on starting/stopping the body leans a moment more. */
  biegPochylenie: 0.08,
  biegPodskokPx: 2,
  rozpedPochylenie: 0.07,
  /** Arms in the run's rhythm (owner, 21 Nov 2026: „sztywny, musi ruszać rękami w rytm biegu”): each arm swings about
   * its shoulder opposite to its leg (radians at full speed), the forearm bends at the elbow while running, and the
   * chest turns a little against the hips with every step. */
  biegRece: 0.72,
  biegLokiec: 0.7,
  biegSkret: 0.1,
  /** Standing still the chest breathes (radians, seconds per breath; drawn in a few steps only, to spare phones). */
  oddech: 0.035,
  oddechS: 2.8,
  oddechKrokow: 6,
  lukWypuszczenie: 0.6,
  lukStart: 0.53,
  magiaWypuszczenie: 0.31,
  magiaStart: 0.2,
  /** While the model loads the hero is hidden at most this long; then the drawn hero shows until it's in. */
  czekajMs: 12000,
};

const KLUCZ = 'exp-ludzik3d';
(window as unknown as { __ludzik3d: typeof LUDZIK_3D }).__ludzik3d = LUDZIK_3D;
/** On by default on every server since 1.034; `?ludzik3d=0` switches it off on this device. */
export function ludzik3d(): boolean {
  if (makieta) return true;
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
  /** The rigid parts' rest pose (every frame starts from it, so the procedural turns never pile up). */
  reszta: { o: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion }[];
  /** The weapon's grip and blade tip (its own space), for the blade trail. */
  ostrze?: { mesh: THREE.Object3D; czubek: THREE.Vector3; srodek: THREE.Vector3 };
};

/** One blow being played (the clip is driven by hand: `p` 0 → 1 over `D` seconds). */
type Cios = { rodzaj: 'miecz' | 'luk' | 'magia'; wariant: 0 | 1 | 2; p: number; D: number; gora: boolean; kat: number };
/** A point of the blade trail: blade tip and the blade's middle in map px, when, in front of the body or behind. */
export type PunktSmugi = { x: number; y: number; ix: number; iy: number; t: number; przod: boolean };

const gladko = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 0 before a, up to 1 at b, back to 0 at c. */
const dzwon = (a: number, b: number, c: number, x: number) => x < b ? gladko(a, b, x) : 1 - gladko(b, c, x);
/** The moment of contact in every blow (the sound and the game's own timing have always used 40 %). */
const KONTAKT = 0.4;

/**
 * Clip time (share of the authored blow) for progress p of a blow. A = the artist's cut as drawn (right to left);
 * B = the same curve walked the other way: up along the recovery to the swing's end, across the swing backwards
 * (left to right) and home along the wind-up – every pose is the artist's, so nothing jumps; C = as drawn, with the
 * arm raised over the head and brought down by turns added in update().
 */
function czasKlipu(c: Cios): number {
  if (c.rodzaj !== 'miecz' || c.wariant !== 1) return c.p;
  const p = c.p;
  if (p < 0.22) return 0.7 - (0.7 - 0.36) * gladko(0, 0.22, p);
  if (p < 0.46) return 0.36 - (0.36 - 0.15) * gladko(0.22, 0.46, p);
  return 0.15 * (1 - gladko(0.46, 1, p));
}

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
  /** Rotate the whole equipped hero around his centre; restore the live rig even if an export fails. */
  flightPortrait(spin = false): string[] | undefined {
    const g = this.g;
    if (!g) return undefined;
    const joints = ['upperL', 'foreL', 'upperR', 'foreR'].map(name => g.model.getObjectByName(name));
    const saved = joints.map(j => j?.quaternion.clone());
    const frames: string[] = [];
    const parent = g.model.parent!;
    const position = g.model.position.clone(), rotation = g.model.quaternion.clone(), scale = g.model.scale.clone();
    const pivot = new g.three.Group();
    pivot.position.copy(new g.three.Box3().setFromObject(g.model).getCenter(new g.three.Vector3()));
    g.scene.add(pivot);
    pivot.attach(g.model);
    try {
      const count = spin ? 24 : 6;
      for (let i = 0; i < count; i++) {
        const phase = i * Math.PI * 2 / count;
        joints.forEach((joint, n) => {
          if (!joint || !saved[n]) return;
          joint.quaternion.copy(saved[n]!);
          joint.rotation.z += (n < 2 ? 1 : -1) * (.65 + .3 * Math.sin(phase + n % 2));
        });
        if (spin) pivot.rotation.set(.16 * Math.sin(phase), phase, .08 * Math.cos(phase));
        this.narysuj(g);
        frames.push(g.renderer.domElement.toDataURL('image/png'));
      }
    } finally {
      parent.add(g.model);
      g.model.position.copy(position); g.model.quaternion.copy(rotation); g.model.scale.copy(scale);
      pivot.removeFromParent();
      joints.forEach((joint, n) => { if (joint && saved[n]) joint.quaternion.copy(saved[n]!); });
      this.narysuj(g);
      this.scene.textures.get(this.klucz).source[0].update();
    }
    return frames;
  }

  private g?: Gotowy;
  private laduje = false;
  private blad = false;
  private image?: Phaser.GameObjects.Image;
  private kat = 0;
  private klucz = 'ludzik3d';
  private skala = 1;
  /** Where the hero stood last frame: scenes that move him by tweens (turn fights, arena) leave vel at 0. */
  private ostatnio?: { x: number; y: number };
  private pokazany = false;
  /** What the last picture showed, and the time since it was drawn (s). */
  private podpis = '';
  private odKlatki = Infinity;
  private swiatla?: { amb: THREE.AmbientLight; sun: THREE.DirectionalLight };

  /** When loading started (ms, performance.now). */
  private ladujeOd = 0;

  /** Loading starts at once, under the loading cover (owner, 28 Oct 2026: on phones the old drawn hero showed first
   * and the 3D one replaced him a moment later). */
  /** `klucz`: own texture key (a second scene – hall, arena – while the street's hero still exists);
   * `skala`: size multiplier (the hall draws everything 4× bigger: 1 hall px = 1 sheet px). */
  constructor(private scene: Phaser.Scene, opcje: { klucz?: string; skala?: number } = {}) {
    if (opcje.klucz) this.klucz = opcje.klucz;
    this.skala = opcje.skala ?? 1;
    void this.zaladuj();
  }

  /** Hides the drawn hero until the model is in (or LUDZIK_3D.czekajMs is up). */
  ukryjNaStart(player: Player) {
    if (this.g || this.blad) return;
    player.setVisible(false);
    this.pokazany = true;
  }

  /** Is the 3D hero drawn now (for tests). */
  get widoczny() { return this.pokazany; }

  /** The authored swing crosses its forward arc around 40% of the attack clip. */
  get attackEventMs(): number | undefined {
    return this.g && this.pokazany ? this.g.atak.getClip().duration * KONTAKT / this.g.atak.timeScale * 1000 : undefined;
  }

  private cios?: Cios;
  private ostatniCios = -Infinity;
  private wariant: 0 | 1 | 2 = 2;
  private zamrozDo = -Infinity;
  /** The blade's way through the air while it cuts (map px), read by walka/oprawa.ts for the trail. */
  readonly smuga: PunktSmugi[] = [];
  /** Called on every footfall (two per walking cycle): footstep sounds and dust (GameScene). */
  onKrok?: () => void;
  private ostatniaFaza = 0;
  private bylaSzybkosc = 0;
  private rozped = 0;
  /** Is a blow being played now (for the trail's and the effects' timing). */
  get atakuje() { return !!this.cios; }
  /** Hit stop: the blow holds its pose for ms (never stacks). */
  zamroz(ms: number) {
    const now = this.scene.time.now;
    if (ms > 0 && now >= this.zamrozDo) this.zamrozDo = now + ms;
  }

  private equipmentKey = '';
  private changing = false;
  private disposed = false;
  private pendingAim: number | null = null;
  private pendingSound?: { fn: (remainingMs: number) => void; leadMs: number };
  private pendingOpcje: { mocny?: boolean; strzal?: 'luk' | 'magia' } = {};

  /** The weapon's grip (its origin) and blade tip: the bounding box corner farthest from the grip. */
  private ostrzeZ(three: typeof THREE, bron: THREE.Object3D): Gotowy['ostrze'] {
    let mesh: THREE.Mesh | undefined;
    bron.traverse((o) => { const m = o as THREE.Mesh; if (!mesh && m.isMesh) mesh = m; });
    if (!mesh) return undefined;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!;
    let czubek = new three.Vector3(), d = -1;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const v = new three.Vector3(x, y, z);
      if (v.lengthSq() > d) { d = v.lengthSq(); czubek = v; }
    }
    return { mesh, czubek, srodek: czubek.clone().multiplyScalar(0.22) };
  }
  private attackSound?: { fn: (remainingMs: number) => void; leadMs: number };
  private baseHead?: THREE.BufferGeometry;
  private kolory?: KoloryPostaci;
  private donors = new Map<string, Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>>();

  /** Keep the guard's body and identity; only weapon, attack pose and the matching headwear change. */
  private async equipment() {
    const g=this.g;
    // Every character gets the bow / wand poses (they used to come only with the recruit prologue's weapons).
    if(!g || this.changing || this.disposed)return;
    const female=plec3d()==='k';
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
      const headDonor=hat ? await load(female?'mage_f':'11') : null;
      if(this.disposed || this.g!==g)return;
      g.mixer.stopAllAction();
      this.cios=undefined;
      const walkLegs=g.chodNogi.getClip(), walkUpper=g.chodGora.getClip();
      g.mixer.uncacheRoot(g.model);
      g.mixer=new g.three.AnimationMixer(g.model);
      g.chodNogi=g.mixer.clipAction(walkLegs);g.chodGora=g.mixer.clipAction(walkUpper);
      if(g.miecz){g.miecz.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats)mat.dispose();}});g.miecz.removeFromParent();}
      const weapon=donor.scene.getObjectByName('Weapon')!.clone(true);
      g.model.children[0].add(weapon);
      g.miecz=weapon;
      g.reszta=g.reszta.filter(r=>r.o.parent&&!/^(WeaponMesh|BowString)/.test(r.o.name));
      weapon.traverse(o=>{if(o!==weapon)g.reszta.push({o,p:o.position.clone(),q:o.quaternion.clone()});});
      g.ostrze=this.ostrzeZ(g.three,weapon);
      weapon.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)m.material=wyrazistyMaterial(new g.three.MeshLambertMaterial({vertexColors:true,flatShading:true}));});
      const head=g.model.getObjectByName('head') as THREE.Mesh;
      this.baseHead ??= head.geometry;
      if(headDonor){const geo=(headDonor.scene.getObjectByName('head') as THREE.Mesh).geometry.clone();if(this.kolory)przebarwGeometrie(geo,'head',this.kolory);head.geometry=geo;}
      else head.geometry=this.baseHead;
      const c=donor.animations.find(c=>c.name==='attack')!.clone();
      const legs=(t:THREE.KeyframeTrack)=>/^(thigh|shin|foot)/.test(t.name);
      g.atak=g.mixer.clipAction(c);
      g.atakGora=g.mixer.clipAction(new g.three.AnimationClip(`attack-upper-${id}`,c.duration,c.tracks.filter(t=>!legs(t))));
      for(const a of [g.atak,g.atakGora]){a.setLoop(g.three.LoopOnce,1);a.clampWhenFinished=false;a.timeScale=LUDZIK_3D.tempoAtaku;}
      this.equipmentKey=key;
    } catch(e) { console.warn('Ludzik 3D: wyposażenie',e); }
    finally {this.changing=false;if(this.pendingAim!==null){const aim=this.pendingAim,sound=this.pendingSound,o=this.pendingOpcje;this.pendingAim=null;this.pendingSound=undefined;this.atakuj(aim,sound?.fn,sound?.leadMs,o);}}
  }

  private async zaladuj() {
    if (this.laduje) return;
    this.laduje = true;
    this.ladujeOd = performance.now();
    try {
      const three = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const file=plec3d()==='k' ? 'modele/postacie3d/01.glb' : LUDZIK_3D.plik;
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
        m.material = wyrazistyMaterial(o.name === 'head' ? new three.MeshBasicMaterial({vertexColors:true}) : new three.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
      });
      // Own colours of this character (uniform, trousers, hair, skin) – everyone used to look the same.
      this.kolory = koloryZWygladu(session.look.modul, session.name);
      przebarwModel(model, this.kolory);
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
      const reszta: Gotowy['reszta'] = [];
      model.traverse((o) => { if (o !== model && o.parent !== model) reszta.push({ o, p: o.position.clone(), q: o.quaternion.clone() }); });
      this.g = { three, renderer, scene, camera, model, mixer, chodNogi, chodGora, atak, atakGora, miecz, jednostkaPx: k, reszta,
        ostrze: miecz ? this.ostrzeZ(three, miecz) : undefined };
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

  /**
   * A blow: the model plays it turned towards the aim (radians, screen axes). Melee swings go in series of three
   * different cuts (A right→left, B left→right, C over the head and down; a strong blow is always C); a shot
   * (`strzal`) plays the bow's draw and release or the mage's gesture, started so the release shows at once.
   */
  atakuj(aim: number, sound?: (remainingMs: number) => void, leadMs = 0, opcje: { mocny?: boolean; strzal?: 'luk' | 'magia' } = {}): boolean {
    const g = this.g;
    if (!g) return false;
    if(this.changing){this.pendingAim=aim;this.pendingSound=sound?{fn:sound,leadMs}:undefined;this.pendingOpcje=opcje;return true;}
    this.kat = Math.atan2(Math.cos(aim), Math.sin(aim));
    g.atak.stop();
    g.atakGora.stop();
    const dur = g.atak.getClip().duration;
    // A fast weapon must reach the audible part before the next legal attack restarts its clip.
    const pace = (this.scene as Phaser.Scene & { player?: Player }).player?.attackCooldown ?? 320;
    const speed = sound ? Math.max(LUDZIK_3D.tempoAtaku, dur * KONTAKT / (Math.max(80, pace) * .85 / 1000)) : LUDZIK_3D.tempoAtaku;
    g.atak.timeScale = g.atakGora.timeScale = speed;
    const now = this.scene.time.now;
    const rodzaj = opcje.strzal ?? 'miecz';
    let wariant: 0 | 1 | 2 = 0;
    if (rodzaj === 'miecz') {
      wariant = opcje.mocny ? 2 : now - this.ostatniCios > LUDZIK_3D.seriaMs ? 0 : ((this.wariant + 1) % 3) as 0 | 1 | 2;
      this.wariant = wariant;
      this.ostatniCios = now;
    }
    const p0 = rodzaj === 'luk' ? LUDZIK_3D.lukStart : rodzaj === 'magia' ? LUDZIK_3D.magiaStart : 0;
    const gora = g.chodNogi.isRunning();
    this.cios = { rodzaj, wariant, p: p0, D: dur / speed, gora, kat: this.kat };
    this.smuga.length = 0;
    const a = gora ? g.atakGora : g.atak;
    a.reset().play();
    a.paused = true; // the blow's clock is ours (update): hit stop, variant B, a shot started mid-clip
    a.time = czasKlipu(this.cios) * dur;
    this.attackSound = sound ? { fn: sound, leadMs } : undefined;
    this.emitAttackSound();
    return true;
  }

  private emitAttackSound() {
    const c = this.cios, sound = this.attackSound;
    if (!c || !sound) return;
    const remaining = Math.max(0, (KONTAKT - c.p) * c.D * 1000);
    if (remaining > sound.leadMs) return;
    this.attackSound = undefined;
    sound.fn(remaining);
  }

  /** Turns rigid parts about a point (model space): the parts stay joined. */
  private obroc(g: Gotowy, nazwy: string[], os: THREE.Vector3, kat: number, srodek: THREE.Vector3) {
    if (Math.abs(kat) < 1e-4) return;
    const q = new g.three.Quaternion().setFromAxisAngle(os, kat);
    for (const n of nazwy) {
      const o = g.model.getObjectByName(n);
      if (!o) continue;
      o.position.sub(srodek).applyQuaternion(q).add(srodek);
      o.quaternion.premultiply(q);
    }
  }

  /** Running arms: each arm swings opposite to its own leg (read from the walk clip's live pose, so it always keeps the
   * legs' rhythm), elbows bent, and the chest twists with the step. Held weapons follow the hand they're nearest. */
  private receWBiegu(g: Gotowy, sila: number, biodra: THREE.Vector3, gora: string[]) {
    const three = g.three;
    const pos = (n: string) => g.model.getObjectByName(n)?.position.clone();
    const X = new three.Vector3(1, 0, 0), Y = new three.Vector3(0, 1, 0);
    const bron = ['WeaponMesh', 'BowStringTop', 'BowStringBottom'].filter((n) => g.model.getObjectByName(n));
    const hL = pos('handL'), hR = pos('handR'), w = pos('WeaponMesh');
    const bronL = !!(w && hL && hR && w.distanceTo(hL) < w.distanceTo(hR));
    let skret = 0;
    for (const strona of ['L', 'R'] as const) {
      const udo = pos('thigh' + strona), kolano = pos('shin' + strona), bark = pos('upper' + strona), lokiec = pos('fore' + strona);
      if (!udo || !kolano || !bark) continue;
      // The leg's swing: how far the knee is ahead of the hip (+Z = forward), as a share of the thigh's length.
      const noga = Math.max(-1, Math.min(1, (kolano.z - udo.z) / Math.max(1e-3, udo.distanceTo(kolano)) * 1.6));
      const reka = ['upper' + strona, 'fore' + strona, 'hand' + strona, ...((strona === 'L') === bronL ? bron : [])];
      // Positive turn about +X sends the hand back: arm back while its leg is forward.
      this.obroc(g, reka, X, LUDZIK_3D.biegRece * sila * noga, bark);
      if (lokiec) {
        const l = g.model.getObjectByName('fore' + strona)!.position.clone();
        this.obroc(g, reka.slice(1), X, -LUDZIK_3D.biegLokiec * sila, l);
      }
      skret += (strona === 'L' ? 1 : -1) * noga;
    }
    this.obroc(g, gora, Y, LUDZIK_3D.biegSkret * sila * skret * 0.5, biodra);
  }

  /** The procedural part of a blow, on top of the clip's pose: chest turned with the cut, the arm over the head (C),
   * a small lean for the bow's recoil and the mage's push, and the visual step forward. */
  private ruchCiosu(g: Gotowy, c: Cios) {
    const three = g.three, p = c.p;
    const pos = (n: string) => g.model.getObjectByName(n)?.position.clone() ?? new three.Vector3();
    const biodra = pos('thighL').add(pos('thighR')).multiplyScalar(0.5);
    const gora = ['core', 'head', 'upperL', 'foreL', 'handL', 'upperR', 'foreR', 'handR', 'WeaponMesh', 'BowStringTop', 'BowStringBottom'];
    const ramie = ['upperR', 'foreR', 'handR', 'WeaponMesh'];
    const Y = new three.Vector3(0, 1, 0), X = new three.Vector3(1, 0, 0);
    let skret = 0, sklon = 0, krok = 0;
    if (c.rodzaj === 'miecz') {
      if (c.wariant === 2) {
        // Over the head: the arm goes up and back, then comes down hard; the chest leans into it.
        const bark = pos('upperR');
        this.obroc(g, ramie, X, -1.15 * dzwon(0, 0.24, 0.4, p) + 0.55 * dzwon(0.3, 0.44, 0.8, p), bark);
        sklon = -0.14 * dzwon(0, 0.24, 0.38, p) + 0.3 * dzwon(0.3, 0.44, 0.85, p);
        skret = 0.2 * dzwon(0, 0.22, 0.4, p) - 0.25 * dzwon(0.3, 0.45, 0.85, p);
        krok = LUDZIK_3D.wykrokMocnyPx * dzwon(0.22, 0.44, 0.85, p);
      } else {
        // The chest winds up towards where the blade starts and turns through with it.
        const s = c.wariant === 0 ? 1 : -1;
        skret = s * (0.4 * dzwon(0, 0.2, 0.36, p) - 0.5 * dzwon(0.24, 0.43, 0.85, p));
        sklon = 0.08 * dzwon(0.25, 0.42, 0.8, p);
        krok = LUDZIK_3D.wykrokPx * dzwon(0.22, 0.42, 0.85, p);
      }
    } else if (c.rodzaj === 'luk') {
      sklon = -0.14 * dzwon(LUDZIK_3D.lukWypuszczenie - 0.02, LUDZIK_3D.lukWypuszczenie + 0.06, 0.95, p);
    } else {
      sklon = 0.18 * dzwon(LUDZIK_3D.magiaStart, LUDZIK_3D.magiaWypuszczenie + 0.04, 0.8, p);
      krok = 0.8 * dzwon(LUDZIK_3D.magiaStart, LUDZIK_3D.magiaWypuszczenie + 0.04, 0.8, p);
    }
    this.obroc(g, gora, X, sklon, biodra);
    this.obroc(g, gora, Y, skret, biodra);
    const u = (krok * LUDZIK_3D.gestosc) / g.jednostkaPx;
    g.model.position.x += Math.sin(this.kat) * u;
    g.model.position.z += Math.cos(this.kat) * u;
  }

  /** Blade tip and middle where they are now, in map px (the picture's own transform), front or behind the body. */
  private punktOstrza(g: Gotowy, player: Player, sc: number, oy: number): PunktSmugi | undefined {
    const o = g.ostrze;
    if (!o || !o.mesh.visible || !g.miecz?.visible) return undefined;
    g.model.updateMatrixWorld(true);
    const n = LUDZIK_3D.ramka * LUDZIK_3D.gestosc, u = sc / LUDZIK_3D.gestosc;
    const rzut = (v: THREE.Vector3) => {
      const w = v.clone().applyMatrix4(o.mesh.matrixWorld).project(g.camera);
      return { x: player.x + ((w.x + 1) / 2 * n - n / 2) * u, y: player.y + ((1 - w.y) / 2 * n - oy * n) * u, z: w.z };
    };
    const t = rzut(o.czubek), m = rzut(o.srodek);
    const core = g.model.getObjectByName('core');
    const zc = core ? core.getWorldPosition(new g.three.Vector3()).project(g.camera).z : t.z;
    return { x: t.x, y: t.y, ix: m.x, iy: m.y, t: this.scene.time.now, przod: t.z <= zc };
  }

  /** dt in seconds (GameScene.update's capped delta). */
  update(player: Player, dt: number) {
    if (!this.g && !this.laduje && !this.blad) void this.zaladuj();
    const riding = testVehicle !== 'pieszo' && hasTestVehicle(testVehicle);
    if (!this.g || riding || player.isDead || !this.scene.textures.exists(this.klucz)) {
      // Still loading: no drawn hero meanwhile (he'd be swapped for the 3D one a moment later); after
      // LUDZIK_3D.czekajMs, or when the model failed, the drawn hero stays as the fallback.
      if (!this.g && !this.blad && !riding && !player.isDead && performance.now() - this.ladujeOd < LUDZIK_3D.czekajMs) {
        player.setVisible(false);
        this.pokazany = true;
        return;
      }
      if (this.pokazany) player.setVisible(true);
      this.image?.setVisible(false);
      this.ustawObrys(0, 0, player, false);
      this.pokazany = false;
      return;
    }
    const g = this.g;
    void this.equipment();
    const s = dt;
    // Moved without vel (tweened): walk and face that way anyway.
    let vx = player.vel.x, vy = player.vel.y, fx = player.facing.x, fy = player.facing.y;
    const o = this.ostatnio;
    this.ostatnio = { x: player.x, y: player.y };
    if (vx * vx + vy * vy <= 1 && o && s > 0) {
      const mx = (player.x - o.x) / this.skala / s, my = (player.y - o.y) / this.skala / s;
      if (mx * mx + my * my > 4 && mx * mx + my * my < 1e6) { vx = mx; vy = my; fx = mx; fy = my; }
    }
    const v2 = vx * vx + vy * vy;
    // Turn towards the walking direction (screen down = towards the camera = model's +Z); during a blow he keeps
    // facing where he strikes (owner, 20 Nov 2026: the cut must go at the enemy, not where he last walked).
    const cel = this.cios ? this.cios.kat : Math.atan2(fx, fy);
    let d = cel - this.kat;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.kat += d * (1 - Math.exp(-s * LUDZIK_3D.obrot));
    this.kat = Math.atan2(Math.sin(this.kat), Math.cos(this.kat));
    g.model.rotation.y = this.kat;
    const idzie = v2 > 1;
    const c = this.cios, dur = g.atak.getClip().duration;
    // A whole-body blow that starts walking goes on with the upper body only, at the same moment.
    if (idzie && c && !c.gora) {
      g.atak.stop();
      g.atakGora.reset().play();
      g.atakGora.paused = true;
      c.gora = true;
    }
    // The blow's own clock: held during a hit stop, ended at its last pose.
    if (c) {
      if (this.scene.time.now >= this.zamrozDo) c.p += s / c.D;
      if (c.p >= 1) {
        g.atak.stop();
        g.atakGora.stop();
        this.cios = undefined;
      } else (c.gora ? g.atakGora : g.atak).time = czasKlipu(c) * dur;
    }
    const atakuje = !!this.cios;
    if (idzie) {
      if (!g.chodNogi.isRunning()) g.chodNogi.reset().play();
      g.chodNogi.timeScale = Math.min(4, Math.sqrt(v2) * LUDZIK_3D.cyklNaPx * g.chodNogi.getClip().duration);
    } else if (g.chodNogi.isRunning()) g.chodNogi.stop();
    // Arms swing with the legs while walking, unless they are striking.
    if (idzie && !atakuje) {
      if (!g.chodGora.isRunning()) { g.chodGora.reset().play(); g.chodGora.time = g.chodNogi.time; }
      g.chodGora.timeScale = g.chodNogi.timeScale;
    } else if (g.chodGora.isRunning()) g.chodGora.stop();
    if (g.miecz) g.miecz.visible = atakuje;
    if (this.swiatla) { this.swiatla.amb.intensity = LUDZIK_3D.otoczenie; this.swiatla.sun.intensity = LUDZIK_3D.swiatlo; }
    // Every frame starts from the rest pose: the clips set what they animate, the blow's turns go on top.
    for (const r of g.reszta) { r.o.position.copy(r.p); r.o.quaternion.copy(r.q); }
    g.mixer.update(s);
    this.emitAttackSound();
    // A small bob per step (two per walking cycle), in sheet pixels.
    const faza = g.chodNogi.isRunning() ? g.chodNogi.time / g.chodNogi.getClip().duration : 0;
    // Share of the hero's base speed (1 = walking at 70 km/h, the run look comes in with it).
    const baza = (this.scene as Phaser.Scene & { player?: Player }).player?.speed ?? 37;
    const szyb = Math.min(1.3, Math.sqrt(v2) / Math.max(1, baza));
    // A start or a stop leans the body a moment (a quick change of speed), easing back.
    this.rozped += (Math.min(1, Math.abs(szyb - this.bylaSzybkosc) * 4) - this.rozped) * Math.min(1, s * 6);
    this.rozped *= Math.exp(-s * 5);
    this.bylaSzybkosc = szyb;
    const podskok = LUDZIK_3D.podskokPx + (LUDZIK_3D.biegPodskokPx - LUDZIK_3D.podskokPx) * Math.min(1, szyb);
    g.model.position.set(0, (Math.abs(Math.sin(faza * Math.PI * 2)) * podskok * LUDZIK_3D.gestosc) / g.jednostkaPx, 0);
    // Footfalls: the walking cycle crosses 0 and ½.
    if (g.chodNogi.isRunning()) {
      if (Math.floor(faza * 2) !== Math.floor(this.ostatniaFaza * 2)) this.onKrok?.();
      this.ostatniaFaza = faza;
    }
    let oddechKrok = -1;
    if (this.cios) this.ruchCiosu(g, this.cios);
    else {
      const pos = (n: string) => g.model.getObjectByName(n)?.position.clone() ?? new g.three.Vector3();
      const biodra = pos('thighL').add(pos('thighR')).multiplyScalar(0.5);
      const gora = ['core', 'head', 'upperL', 'foreL', 'handL', 'upperR', 'foreR', 'handR', 'WeaponMesh', 'BowStringTop', 'BowStringBottom'];
      let pochyl = LUDZIK_3D.biegPochylenie * Math.min(1, szyb) + LUDZIK_3D.rozpedPochylenie * this.rozped;
      if (idzie) this.receWBiegu(g, Math.min(1, szyb), biodra, gora);
      if (!idzie) {
        // Breathing in a few steps (each step is a new picture; a smooth breath would redraw all the time).
        const n = LUDZIK_3D.oddechKrokow;
        oddechKrok = Math.floor(((performance.now() / 1000 / LUDZIK_3D.oddechS) % 1) * n);
        pochyl += LUDZIK_3D.oddech * Math.sin((oddechKrok / n) * Math.PI * 2);
      }
      this.obroc(g, gora, new g.three.Vector3(1, 0, 0), pochyl, biodra);
    }
    // A new picture only when it would look different (turned, a step further, a blow), at most klatekNaS a second;
    // standing still nothing is drawn at all.
    const podpis = `${this.equipmentKey}|${Math.round(this.kat * 40)}|${g.chodNogi.isRunning() ? Math.round(g.chodNogi.time * 24) : '-'}|${g.chodGora.isRunning() ? Math.round(g.chodGora.time * 24) : '-'}|${this.cios ? `${this.cios.wariant}:${Math.round(this.cios.p * 60)}` : '-'}|${atakuje}|${oddechKrok}|${Math.round(this.rozped * 8)}|${this.swiatla?.amb.intensity}|${this.swiatla?.sun.intensity}`;
    this.odKlatki += s;
    const naS = atakuje ? LUDZIK_3D.klatekNaSWAtaku : LUDZIK_3D.klatekNaS;
    if (podpis !== this.podpis && (this.odKlatki >= 1 / naS || !this.pokazany)) {
      this.podpis = podpis;
      this.odKlatki = 0;
      this.narysuj(g);
      this.scene.textures.get(this.klucz).source[0].update();
    }

    const sc = 0.36 * SKALA_POSTACI * this.skala * POWIEKSZENIE_3D;
    const F = LUDZIK_3D.ramka;
    const oy = (STOPY_PX - (8 * SKALA_POSTACI * this.skala) / sc) / F;
    if (!this.image) this.image = this.scene.add.image(player.x, player.y, this.klucz);
    this.ustawObrys(sc, oy, player, true);
    // The blade trail: only while it cuts (the swing's active part), not in the wind-up or the way home.
    const cc = this.cios;
    const tnie = cc?.rodzaj === 'miecz' && cc.p > (cc.wariant === 1 ? 0.2 : 0.17) && cc.p < 0.5;
    const pt = tnie ? this.punktOstrza(g, player, sc, oy) : undefined;
    if (pt) { this.smuga.push(pt); if (this.smuga.length > 24) this.smuga.shift(); }
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
   * Draws the figure (one render). Its dark outline, two sheet pixels thick, is made by the game itself: copies of the
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
      for (const radius of [t, t * 2]) for (const y of [-1, 0, 1]) for (const x of [-1, 0, 1]) {
        if (!x && !y) continue;
        const dx = x * radius, dy = y * radius;
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

/** The hero's gender for the 3D model: the saved guard3d, else the modular look's gender (QR-demo characters made
 * before 22 Nov 2026 had no guard3d and showed the man's model even as women). */
function plec3d(): 'k' | 'm' {
  return session.look.guard3d ?? session.look.modul?.p ?? 'm';
}
