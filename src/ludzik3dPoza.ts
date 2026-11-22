// Joints of the 3D hero (owner, 22 Nov 2026: „ręce rozrywają się w połowie, przechylony ludzik”).
// The artist's GLBs keep every part's origin at the model's feet (0, 0, 0): the geometry carries the shape, the node
// only moves/turns the part. Turning an arm about its node's position therefore swung it about a point by the feet –
// the arm flew off the shoulder and the forearm off the elbow, and the chest leaned about the ground, not the hips.
// Here the real shoulders, elbows, hips and knees are read from the parts' geometry once, and followed every frame
// through each part's current (animated, already turned) position/rotation. Pure: no Phaser, so a preview page can use
// the very same code (scripts/podglad-ludzik3d/).
import type * as THREE from 'three';

export type Stawy = Partial<Record<string, THREE.Vector3>>;
export type NazwaStawu = `${'bark' | 'lokiec' | 'biodro' | 'kolano' | 'szyja'}${'L' | 'R' | ''}`;

/** A part's box in its own frame (node with a mesh, or a group of meshes). */
function pudlo(three: typeof THREE, o: THREE.Object3D): THREE.Box3 | undefined {
  const box = new three.Box3();
  const m = o as THREE.Mesh;
  if (m.isMesh && m.geometry) {
    m.geometry.computeBoundingBox();
    if (m.geometry.boundingBox) box.union(m.geometry.boundingBox);
  }
  for (const c of o.children) {
    const cm = c as THREE.Mesh;
    if (!cm.isMesh || !cm.geometry) continue;
    cm.geometry.computeBoundingBox();
    if (!cm.geometry.boundingBox) continue;
    c.updateMatrix();
    box.union(cm.geometry.boundingBox.clone().applyMatrix4(c.matrix));
  }
  return box.isEmpty() ? undefined : box;
}

/** Where two parts meet: the middle of their boxes' overlap (or the first one's end towards the second). */
function styk(three: typeof THREE, a: THREE.Box3, b: THREE.Box3): THREE.Vector3 {
  const i = a.clone().intersect(b);
  if (!i.isEmpty()) return i.getCenter(new three.Vector3());
  const ca = a.getCenter(new three.Vector3()), cb = b.getCenter(new three.Vector3());
  return ca.lerp(cb, 0.5);
}

/** Joint points in each part's own frame, read once after loading (rest pose). */
export function stawyModelu(three: typeof THREE, model: THREE.Object3D): Stawy {
  const p = (n: string) => { const o = model.getObjectByName(n); return o ? pudlo(three, o) : undefined; };
  const s: Stawy = {};
  for (const k of ['L', 'R'] as const) {
    const upper = p('upper' + k), fore = p('fore' + k), thigh = p('thigh' + k), shin = p('shin' + k);
    if (upper) {
      // The shoulder: the upper arm's top, a little in from its end (the arm hangs from it).
      const c = upper.getCenter(new three.Vector3());
      s['bark' + k] = new three.Vector3(c.x, upper.max.y - (upper.max.y - upper.min.y) * 0.15, c.z);
    }
    if (upper && fore) s['lokiec' + k] = styk(three, upper, fore);
    if (thigh) {
      const c = thigh.getCenter(new three.Vector3());
      s['biodro' + k] = new three.Vector3(c.x, thigh.max.y - (thigh.max.y - thigh.min.y) * 0.15, c.z);
    }
    if (thigh && shin) s['kolano' + k] = styk(three, thigh, shin);
  }
  const head = p('head'), core = p('core');
  if (head && core) s.szyja = styk(three, head, core);
  return s;
}

/** Which part carries a joint (the point follows that part's current pose). */
const NOSI: Record<string, string> = {
  barkL: 'upperL', barkR: 'upperR', lokiecL: 'foreL', lokiecR: 'foreR',
  biodroL: 'thighL', biodroR: 'thighR', kolanoL: 'shinL', kolanoR: 'shinR', szyja: 'core',
};

/** A joint where it is now, in model space. Without the joint (another model) the part's origin, as before. */
export function staw(three: typeof THREE, model: THREE.Object3D, stawy: Stawy, nazwa: NazwaStawu): THREE.Vector3 {
  const o = model.getObjectByName(NOSI[nazwa] ?? nazwa);
  if (!o) return new three.Vector3();
  const l = stawy[nazwa];
  if (!l) return o.position.clone();
  return l.clone().applyQuaternion(o.quaternion).add(o.position);
}

/** Middle of the hips (the chest leans and twists about it). */
export function biodra(three: typeof THREE, model: THREE.Object3D, stawy: Stawy): THREE.Vector3 {
  return staw(three, model, stawy, 'biodroL').add(staw(three, model, stawy, 'biodroR')).multiplyScalar(0.5);
}

/** Turns rigid parts about a point (model space): the parts stay joined. */
export function obroc(three: typeof THREE, model: THREE.Object3D, nazwy: string[], os: THREE.Vector3, kat: number, srodek: THREE.Vector3) {
  if (Math.abs(kat) < 1e-4) return;
  const q = new three.Quaternion().setFromAxisAngle(os, kat);
  for (const n of nazwy) {
    const o = model.getObjectByName(n);
    if (!o) continue;
    o.position.sub(srodek).applyQuaternion(q).add(srodek);
    o.quaternion.premultiply(q);
  }
}

export type UstawieniaBiegu = { rece: number; lokiec: number; skret: number };

/** Running arms: each arm swings about its shoulder opposite to its own leg (read from the walk clip's live pose, so it
 * keeps the legs' rhythm), the forearm bends at the elbow, swings in a little on its way forward, and the
 * chest twists with the step. Held weapons follow the hand they're nearest. */
export function receWBiegu(three: typeof THREE, model: THREE.Object3D, stawy: Stawy, sila: number, u: UstawieniaBiegu, gora: string[]) {
  const X = new three.Vector3(1, 0, 0), Y = new three.Vector3(0, 1, 0), Z = new three.Vector3(0, 0, 1);
  const bron = ['WeaponMesh', 'BowStringTop', 'BowStringBottom'].filter((n) => model.getObjectByName(n));
  const hL = model.getObjectByName('handL'), hR = model.getObjectByName('handR'), w = model.getObjectByName('WeaponMesh');
  // Which hand holds the weapon: the weapon's box middle nearer to which hand's box middle.
  const srodek = (o: THREE.Object3D) => { const b = pudlo(three, o); return (b ? b.getCenter(new three.Vector3()) : new three.Vector3()).applyQuaternion(o.quaternion).add(o.position); };
  const bronL = !!(w && hL && hR && srodek(w).distanceTo(srodek(hL)) < srodek(w).distanceTo(srodek(hR)));
  let skret = 0;
  for (const k of ['L', 'R'] as const) {
    if (!model.getObjectByName('upper' + k) || !model.getObjectByName('thigh' + k)) continue;
    const biodro = staw(three, model, stawy, ('biodro' + k) as NazwaStawu), kolano = staw(three, model, stawy, ('kolano' + k) as NazwaStawu);
    // The leg's swing: how far the knee is ahead of the hip (+Z = forward), as a share of the thigh's length.
    const noga = Math.max(-1, Math.min(1, ((kolano.z - biodro.z) / Math.max(1e-3, biodro.distanceTo(kolano))) * 1.6));
    const reka = ['upper' + k, 'fore' + k, 'hand' + k, ...((k === 'L') === bronL ? bron : [])];
    // Positive turn about +X sends the hand back: arm back while its leg is forward.
    this_obroc(reka, X, u.rece * sila * noga, staw(three, model, stawy, ('bark' + k) as NazwaStawu));
    // The forearm bends forward at the elbow – a bit more while the arm swings forward.
    const zgiecie = u.lokiec * sila * (0.8 + 0.35 * Math.max(0, -noga));
    this_obroc(reka.slice(1), X, -zgiecie, staw(three, model, stawy, ('lokiec' + k) as NazwaStawu));
    // The arm swings in a little towards the body's middle on its way forward (not stiffly along the side).
    const doSrodka = (k === 'L' ? -1 : 1) * 0.12 * u.rece * sila * Math.max(0, -noga);
    this_obroc(reka, Z, doSrodka, staw(three, model, stawy, ('bark' + k) as NazwaStawu));
    skret += (k === 'L' ? 1 : -1) * noga;
  }
  this_obroc(gora, Y, u.skret * sila * skret * 0.5, biodra(three, model, stawy));

  function this_obroc(nazwy: string[], os: THREE.Vector3, kat: number, sr: THREE.Vector3) { obroc(three, model, nazwy, os, kat, sr); }
}


/**
 * Makes a clip's moves k times bigger: every key of a part is a rigid move (turn q + shift t) from the rest pose;
 * it is replaced by the same screw motion taken k times (k × the angle about the same axis through the same point,
 * k × the slide along it), so hip/knee pivots stay where they are and joined parts stay joined.
 */
export function wzmocnij(three: typeof THREE, clip: THREE.AnimationClip, k: number) {
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

/** The guard's silhouette (owner, 22 Nov 2026: „wysokie nieruchome barki”; then „szyi mi nie trzeba, tylko ramiona
 * niżej – chibi było okej”): the torso's top is lowered by `barkiNizej` units and narrowed by `barkiWezej` (share), so
 * the shoulders slope instead of standing square under the ears. `szyja` > 0 would lift the head and add a neck
 * (tried, the owner keeps the chibi head on the torso). The figure is 50 units tall. */
export const SYLWETKA = { szyja: 0, barkiNizej: 2.6, barkiWezej: 0.26, szyjaPromien: 2.1, ramionaNizej: 1.8 };

/** Done once after loading (and after recolouring): reshapes the torso's top and adds the neck under the core part.
 * The head's lift is applied every frame by `podniesGlowe` (its geometry is swapped for hats). */
export function poprawSylwetke(three: typeof THREE, model: THREE.Object3D, s = SYLWETKA) {
  const core = model.getObjectByName('core') as THREE.Mesh | undefined;
  const head = model.getObjectByName('head') as THREE.Mesh | undefined;
  if (!core?.isMesh || !head?.isMesh || core.userData.sylwetka) return;
  core.userData.sylwetka = true;
  const geo = core.geometry = core.geometry.clone();
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const yS = b.max.y - (b.max.y - b.min.y) * 0.32, cx = (b.min.x + b.max.x) / 2;
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y <= yS) continue;
    const t = (y - yS) / Math.max(1e-3, b.max.y - yS);
    p.setY(i, y - s.barkiNizej * t);
    p.setX(i, cx + (p.getX(i) - cx) * (1 - s.barkiWezej * t));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  if (s.szyja <= 0) return;
  // The neck: from inside the torso up into the (lifted) head, coloured like the face.
  head.geometry.computeBoundingBox();
  const hb = head.geometry.boundingBox!;
  const top = geo.boundingBox!.max.y, dol = top - 1.5, gora = hb.min.y + s.szyja + 1.5;
  const szyja = new three.Mesh(
    new three.CylinderGeometry(s.szyjaPromien, s.szyjaPromien * 1.1, Math.max(0.5, gora - dol), 8),
    new three.MeshLambertMaterial({ color: kolorTwarzy(three, head), flatShading: true }),
  );
  szyja.name = 'szyja3d';
  szyja.position.set(cx, (dol + gora) / 2, (hb.min.z + hb.max.z) / 2 - 0.4);
  core.add(szyja);
}

/** The face's colour: the head vertex nearest the middle of the face's front. */
function kolorTwarzy(three: typeof THREE, head: THREE.Mesh): THREE.Color {
  const g = head.geometry, p = g.getAttribute('position'), c = g.getAttribute('color');
  const b = g.boundingBox!;
  const cel = new three.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.3, b.max.z);
  let best = -1, d = Infinity;
  for (let i = 0; i < p.count; i++) {
    const dd = (p.getX(i) - cel.x) ** 2 + (p.getY(i) - cel.y) ** 2 + (p.getZ(i) - cel.z) ** 2;
    if (dd < d) { d = dd; best = i; }
  }
  return c && best >= 0 ? new three.Color(c.getX(best), c.getY(best), c.getZ(best)) : new three.Color(0xe8b48c);
}

/** Every frame, after the clips set the pose and before any procedural turn: the arms hang `ramionaNizej` units lower
 * (the shoulder caps sat right under the head – „ramiona niżej”), the held weapon with them; the head lifts by `szyja`. */
export function podniesGlowe(model: THREE.Object3D, s = SYLWETKA) {
  const h = model.getObjectByName('head');
  if (h && s.szyja > 0) h.position.y += s.szyja;
  if (s.ramionaNizej) {
    // The sword of the guard's own file hangs under handR and follows it; a donor's weapon is its own node.
    for (const n of ['upperL', 'foreL', 'handL', 'upperR', 'foreR', 'handR', 'Weapon']) {
      const o = model.getObjectByName(n);
      if (o) o.position.y -= s.ramionaNizej;
    }
  }
}
