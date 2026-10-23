import "./style.css";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { animate, material, person, sector, wolf, type Rig } from "./models";
import {
  RULES as R,
  clamp,
  distance,
  inArc,
  inPolygon,
  circleBlocked,
  segmentHitsCircle,
  deathExperience,
  type Point,
} from "./rules";

type Building = {
  rings: number[][][];
  height: number;
  name: string;
  address: string;
};
type Road = { pts: number[][]; width: number; path: boolean; name: string };
type MapData = {
  origin: { lat: number; lon: number };
  scale: number;
  radius: number;
  buildings: Building[];
  roads: Road[];
  areas: { rings: number[][][]; water: boolean; name: string }[];
};
type Enemy = {
  id: number;
  rig: Rig;
  spawn: Point;
  hp: number;
  maxHp: number;
  kind: "wolf" | "archer";
  elite: boolean;
  state: "idle" | "windup" | "strike" | "recover" | "dead";
  timer: number;
  heading: number;
  hit: boolean;
  flash: number;
  bar: T.Group;
  fill: T.Mesh;
  warning: T.Mesh;
  respawn: number;
};
type Shot = {
  node: T.Mesh;
  fromEnemy: boolean;
  vx: number;
  vz: number;
  life: number;
  damage: number;
};
type Particle = {
  node: T.Mesh;
  velocity: T.Vector3;
  life: number;
  total: number;
};
type Save = {
  v: 1;
  x: number;
  z: number;
  exp: number;
  fragments: number;
  kills: number;
  hp: number;
  weapon: "sword" | "magic";
  coins: number;
};
const $ = <E extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as E;
const SAVE_KEY = "exp-lore:combat3d:v1";
const scene = new T.Scene();
scene.background = new T.Color(0xcbd5b8);
scene.fog = new T.Fog(0xcbd5b8, 55, 115);
const canvas = $<HTMLCanvasElement>("world");
let renderer: T.WebGLRenderer;
const camera = new T.OrthographicCamera(-25, 25, 25, -25, 0.1, 220);
const hero = person(),
  player = { x: 0, z: 0, hp: 100, exp: 0, kills: 0, fragments: 0, coins: 40 };
const maxHp = () => 100 + Math.floor(player.exp / 60) * 8;
let weapon: "sword" | "magic" = "sword",
  map: MapData,
  home: Point = { x: 0, z: 0 },
  ready = false,
  started = false,
  paused = false,
  helpOpen = false;
let time = 0,
  lastCombat = -100,
  lastAttack = -100,
  sweepReady = 0,
  potionReady = 0,
  invincibleUntil = 0,
  deathUntil = 0,
  lastSave = 0;
let heading = Math.PI,
  attack: {
    t: number;
    duration: number;
    hit: boolean;
    sweep: boolean;
    heading: number;
    ranged: boolean;
  } | null = null;
let mouseAim: { x: number; y: number } | null = null;
let move = { x: 0, z: 0 },
  keys = new Set<string>(),
  aiming = false;
let shake = 0,
  flashUntil = 0,
  toastUntil = 0,
  frames: number[] = [],
  lastHud = 0,
  occlusionClock = 0;
const enemies: Enemy[] = [],
  shots: Shot[] = [],
  particles: Particle[] = [],
  floating: {
    el: HTMLSpanElement;
    p: T.Vector3;
    life: number;
    total: number;
  }[] = [];
const buildingViews: {
  data: Building;
  node: T.Mesh;
  materials: T.MeshStandardMaterial[];
  box: { x0: number; x1: number; z0: number; z1: number };
}[] = [];
const obstacleCells = new Map<string, typeof buildingViews>();
const cellKey = (x: number, z: number) =>
  `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
const scratch = new T.Vector3(),
  ray = new T.Raycaster(),
  ground = new T.Plane(new T.Vector3(0, 1, 0), 0),
  cameraTarget = new T.Vector3();
const aimView = sector(R.reach, R.halfArc, 0xffe6a3, 0.23);
aimView.position.y = 0.065;
scene.add(aimView);
aimView.visible = false;
const targetArrow = new T.Mesh(
  new T.ConeGeometry(0.33, 0.65, 3),
  material(0xf2bb55),
);
scene.add(targetArrow);
// Sound uses a small oscillator, no downloaded audio assets.
let audioContext: AudioContext | undefined,
  soundOn = false;

function notify(text: string) {
  $("toast").textContent = text;
  $("toast").classList.add("on");
  toastUntil = time + 3.2;
}
function sound(
  freq: number,
  duration = 0.06,
  type: OscillatorType = "triangle",
  volume = 0.055,
) {
  if (!soundOn || !audioContext) return;
  const ctx = audioContext,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    freq * 0.45,
    ctx.currentTime + duration,
  );
  g.gain.setValueAtTime(volume, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + duration);
}
function enableAudio() {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  } catch {
    soundOn = false;
  }
}
function persist() {
  if (!ready || deathUntil > time) return;
  try {
    const save: Save = {
      v: 1,
      x: player.x,
      z: player.z,
      exp: player.exp,
      kills: player.kills,
      fragments: player.fragments,
      hp: player.hp,
      weapon,
      coins: player.coins,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* Private browsers may disable storage. */
  }
}
function loadSave() {
  try {
    const s = JSON.parse(
      localStorage.getItem(SAVE_KEY) || "null",
    ) as Save | null;
    if (!s || s.v !== 1) return;
    for (const key of ["exp", "kills", "fragments", "coins"] as const)
      if (Number.isFinite(s[key])) player[key] = clamp(s[key], 0, 1e7);
    if (Number.isFinite(s.hp)) player.hp = clamp(s.hp, 1, maxHp());
    if (
      Number.isFinite(s.x) &&
      Number.isFinite(s.z) &&
      !blocked(s.x, s.z, R.radius)
    ) {
      player.x = s.x;
      player.z = s.z;
    }
    weapon = s.weapon === "magic" ? "magic" : "sword";
  } catch {
    /* A corrupt lab save never affects a real character. */
  }
}
function polyShape(rings: number[][][]) {
  const shape = new T.Shape(rings[0].map(([x, z]) => new T.Vector2(x, -z)));
  for (const r of rings.slice(1))
    shape.holes.push(new T.Path(r.map(([x, z]) => new T.Vector2(x, -z))));
  return shape;
}
function blocked(x: number, z: number, r = 0.4) {
  if (!map || Math.abs(x) > map.radius - 2 || Math.abs(z) > map.radius - 2)
    return true;
  for (const b of obstacleCells.get(cellKey(x, z)) ?? []) {
    const q = b.box;
    if (x < q.x0 - r || x > q.x1 + r || z < q.z0 - r || z > q.z1 + r) continue;
    if (circleBlocked({ x, z }, r, b.data.rings)) return true;
  }
  return map.areas.some((a) => a.water && circleBlocked({ x, z }, r, a.rings));
}
function lineClear(a: Point, b: Point) {
  const n = Math.ceil(distance(a, b) / 0.4);
  for (let i = 1; i < n; i++)
    if (blocked(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, 0.08))
      return false;
  return true;
}
function slide(p: Point, dx: number, dz: number, r: number) {
  if (!blocked(p.x + dx, p.z, r)) p.x += dx;
  if (!blocked(p.x, p.z + dz, r)) p.z += dz;
}
function safe(p: Point) {
  return distance(p, home) < R.safeRadius;
}
function findFree(wanted: Point) {
  if (!blocked(wanted.x, wanted.z, 0.7)) return { ...wanted };
  for (let r = 0.5; r < 30; r += 0.65)
    for (let a = 0; a < Math.PI * 2; a += 0.32) {
      const p = {
        x: wanted.x + Math.sin(a) * r,
        z: wanted.z + Math.cos(a) * r,
      };
      if (!blocked(p.x, p.z, 0.75)) return p;
    }
  throw new Error("Nie znaleziono przejścia na mapie");
}
function healthBar(width = 1.3, color = 0xb9d791) {
  const group = new T.Group(),
    back = new T.Mesh(
      new T.PlaneGeometry(width + 0.1, 0.18),
      new T.MeshBasicMaterial({ color: 0x25342d, depthTest: false }),
    ),
    fill = new T.Mesh(
      new T.PlaneGeometry(width, 0.1),
      new T.MeshBasicMaterial({ color, depthTest: false }),
    );
  fill.position.z = 0.01;
  group.add(back, fill);
  group.renderOrder = 10;
  return { group, fill };
}
const heroBar = healthBar(1.4);
scene.add(heroBar.group);
function buildWorld() {
  const sun = new T.DirectionalLight(0xffeed0, 2.4);
  sun.position.set(-28, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);
  scene.add(new T.HemisphereLight(0xe5f2df, 0x6b7557, 2));
  const land = new T.Mesh(
    new T.PlaneGeometry(map.radius * 2.2, map.radius * 2.2),
    material(0xb8c397),
  );
  land.rotation.x = -Math.PI / 2;
  land.receiveShadow = true;
  scene.add(land);
  for (const area of map.areas) {
    const m = new T.Mesh(
      new T.ShapeGeometry(polyShape(area.rings)),
      material(area.water ? 0x72acae : 0x96af78),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.014;
    m.receiveShadow = true;
    scene.add(m);
  }
  const roadGeos: T.BufferGeometry[] = [],
    pathGeos: T.BufferGeometry[] = [];
  for (const road of map.roads)
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1],
        b = road.pts[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 0.02) continue;
      const geo = new T.PlaneGeometry(road.width, len + 0.18);
      geo.rotateX(-Math.PI / 2);
      geo.rotateY(Math.atan2(dx, dz));
      geo.translate((a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2);
      (road.path ? pathGeos : roadGeos).push(geo);
    }
  for (const [geos, color] of [
    [roadGeos, 0xe1d5b9],
    [pathGeos, 0xcabd96],
  ] as const) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos);
    if (merged) {
      const m = new T.Mesh(merged, material(color));
      m.receiveShadow = true;
      scene.add(m);
    }
    geos.forEach((g) => g.dispose());
  }
  const wallColors = [0xd9c4a0, 0xd1b68e, 0xc0c7b0, 0xd8ccaf, 0xc7af8e],
    roofColors = [0x657e72, 0x7e8975, 0x9a7052, 0x586f6c];
  map.buildings.forEach((b, i) => {
    const g = new T.ExtrudeGeometry(polyShape(b.rings), {
      depth: b.height,
      bevelEnabled: false,
    });
    g.rotateX(-Math.PI / 2);
    const mats = [
      material(roofColors[i % 4]).clone(),
      material(wallColors[i % 5]).clone(),
    ];
    const node = new T.Mesh(g, mats);
    node.castShadow = true;
    node.receiveShadow = true;
    scene.add(node);
    const xs = b.rings[0].map((p) => p[0]),
      zs = b.rings[0].map((p) => p[1]);
    buildingViews.push({
      data: b,
      node,
      materials: mats,
      box: {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        z0: Math.min(...zs),
        z1: Math.max(...zs),
      },
    });
  });
  for (const b of buildingViews) {
    for (
      let x = Math.floor((b.box.x0 - 2) / 8);
      x <= Math.floor((b.box.x1 + 2) / 8);
      x++
    )
      for (
        let z = Math.floor((b.box.z0 - 2) / 8);
        z <= Math.floor((b.box.z1 + 2) / 8);
        z++
      ) {
        const key = `${x},${z}`;
        const cell = obstacleCells.get(key) ?? [];
        cell.push(b);
        obstacleCells.set(key, cell);
      }
  }
  // Sparse trees only on mapped green areas. Geometry is shared and instanced.
  let seed = 391;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  const trees: Point[] = [];
  for (let i = 0; i < 1900 && trees.length < 240; i++) {
    const x = (rand() * 2 - 1) * map.radius,
      z = (rand() * 2 - 1) * map.radius;
    if (
      !map.areas.some((a) => !a.water && inPolygon(x, z, a.rings)) ||
      blocked(x, z, 0.9)
    )
      continue;
    if (
      map.roads.some((r) =>
        r.pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 1.7),
      )
    )
      continue;
    trees.push({ x, z });
  }
  const trunks = new T.InstancedMesh(
      new T.CylinderGeometry(0.12, 0.17, 1.25, 5),
      material(0x756044),
      trees.length,
    ),
    crowns = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 0),
      material(0x56764d),
      trees.length,
    ),
    matrix = new T.Matrix4();
  trees.forEach((p, i) => {
    matrix.compose(
      new T.Vector3(p.x, 0.63, p.z),
      new T.Quaternion(),
      new T.Vector3(1, 1, 1),
    );
    trunks.setMatrixAt(i, matrix);
    matrix.compose(
      new T.Vector3(p.x, 2.1, p.z),
      new T.Quaternion(),
      new T.Vector3(
        0.85 + rand() * 0.35,
        1.3 + rand() * 0.7,
        0.85 + rand() * 0.35,
      ),
    );
    crowns.setMatrixAt(i, matrix);
    crowns.setColorAt(
      i,
      new T.Color().setHSL(0.23 + rand() * 0.04, 0.22, 0.31 + rand() * 0.12),
    );
  });
  crowns.castShadow = true;
  trunks.castShadow = true;
  scene.add(trunks, crowns);
  home = findFree({ x: 15, z: -13 });
  player.x = home.x;
  player.z = home.z;
  const safeDisc = new T.Mesh(
    new T.CircleGeometry(R.safeRadius, 64),
    new T.MeshBasicMaterial({
      color: 0x6ebcc1,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    }),
  );
  safeDisc.rotation.x = -Math.PI / 2;
  safeDisc.position.set(home.x, 0.05, home.z);
  scene.add(safeDisc);
  const safeRing = new T.Mesh(
    new T.RingGeometry(R.safeRadius - 0.055, R.safeRadius + 0.055, 64),
    new T.MeshBasicMaterial({
      color: 0xeff8d9,
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
    }),
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.copy(safeDisc.position);
  scene.add(safeRing);
  // The refuge is a prototype gameplay zone, not a claim about real-world safety.
  const beacon = new T.Mesh(
    new T.CylinderGeometry(0.23, 0.4, 2.8, 8),
    material(0x50766f),
  );
  beacon.position.set(home.x - 1.4, 1.4, home.z);
  beacon.castShadow = true;
  scene.add(beacon);
  const lamp = new T.Mesh(
    new T.IcosahedronGeometry(0.44, 1),
    new T.MeshStandardMaterial({
      color: 0xffd38b,
      emissive: 0xe7a847,
      emissiveIntensity: 1,
    }),
  );
  lamp.position.set(home.x - 1.4, 3, home.z);
  scene.add(lamp);
  scene.add(hero.root);
  addBlobShadow(hero);
  // Fixed deterministic encounters on traversable ground close to the refuge.
  const spots: Point[] = [];
  for (let radius = 12; radius < 37 && spots.length < 9; radius += 4)
    for (let a = 0.3; a < Math.PI * 2 && spots.length < 9; a += 0.68) {
      const p = {
        x: home.x + Math.sin(a) * radius,
        z: home.z + Math.cos(a) * radius,
      };
      if (blocked(p.x, p.z, 1.3) || spots.some((s) => distance(s, p) < 5))
        continue;
      spots.push(p);
    }
  spots.forEach((p, i) => spawnEnemy(p, i));
  if (!enemies.length)
    throw new Error("Brak miejsca na przeciwników w tym wycinku");
  loadSave();
  selectWeapon(weapon);
  cameraTarget.set(player.x, 0, player.z);
}
function addBlobShadow(rig: Rig) {
  rig.root.traverse((o) => {
    if (o instanceof T.Mesh) o.castShadow = false;
  });
  const m = new T.Mesh(
    new T.CircleGeometry(0.65, 16),
    new T.MeshBasicMaterial({
      color: 0x20382c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.045;
  rig.root.add(m);
}
function spawnEnemy(p: Point, id: number) {
  const kind = id % 3 === 2 ? "archer" : "wolf",
    elite = id === 8,
    rig = kind === "wolf" ? wolf() : person("archer");
  rig.root.position.set(p.x, 0, p.z);
  if (elite) rig.root.scale.setScalar(1.25);
  scene.add(rig.root);
  addBlobShadow(rig);
  const { group: bar, fill } = healthBar(
    elite ? 1.8 : 1.15,
    elite ? 0xf2bc68 : 0xd9a27e,
  );
  scene.add(bar);
  const warning =
    kind === "wolf"
      ? sector(elite ? 5 : 3.5, 0.38, 0xe66c43, 0.4)
      : sector(11, 0.08, 0xe66c43, 0.3);
  warning.position.y = 0.07;
  warning.visible = false;
  scene.add(warning);
  enemies.push({
    id,
    rig,
    spawn: { ...p },
    hp: elite ? 120 : kind === "wolf" ? 40 : 32,
    maxHp: elite ? 120 : kind === "wolf" ? 40 : 32,
    kind,
    elite,
    state: "idle",
    timer: 0,
    heading: 0,
    hit: false,
    flash: 0,
    bar,
    fill,
    warning,
    respawn: 0,
  });
}
function selectWeapon(w: "sword" | "magic") {
  weapon = w;
  hero.sword.visible = w === "sword";
  hero.wand.visible = w === "magic";
  $("attack-symbol").textContent = w === "sword" ? "⚔" : "✧";
  document
    .querySelectorAll<HTMLButtonElement>("[data-weapon]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.weapon === w));
  persist();
}
function floatingText(text: string, p: Point, color = "#fff1c8") {
  const el = document.createElement("span");
  el.className = "float-label";
  el.textContent = text;
  el.style.color = color;
  document.body.append(el);
  floating.push({ el, p: new T.Vector3(p.x, 2.5, p.z), life: 0.8, total: 0.8 });
}
function burst(p: Point, color: number, n = 8) {
  for (let i = 0; i < n; i++) {
    const node = new T.Mesh(
      new T.BoxGeometry(0.09, 0.09, 0.22),
      new T.MeshBasicMaterial({ color }),
    );
    node.position.set(p.x, 1, p.z);
    scene.add(node);
    const a = Math.random() * Math.PI * 2;
    particles.push({
      node,
      velocity: new T.Vector3(
        Math.sin(a) * (1 + Math.random() * 3),
        2 + Math.random() * 3,
        Math.cos(a) * (1 + Math.random() * 3),
      ),
      life: 0.35 + Math.random() * 0.2,
      total: 0.55,
    });
  }
}
function hurtEnemy(e: Enemy, damage: number) {
  if (e.state === "dead") return;
  e.hp -= damage;
  e.flash = 0.13;
  burst(e.rig.root.position, e.elite ? 0xffd270 : 0xf3e2ab);
  floatingText(String(damage), e.rig.root.position);
  shake = Math.max(shake, 0.07);
  sound(210, 0.06, "triangle");
  if (e.hp <= 0) {
    e.hp = 0;
    e.state = "dead";
    e.timer = 0;
    e.warning.visible = false;
    e.bar.visible = false;
    e.respawn = 30;
    player.kills++;
    player.exp += e.elite ? 32 : 12;
    player.fragments += e.elite ? 5 : 1;
    sound(640, 0.13, "sine");
    floatingText(
      e.elite ? "+32 EXP · 5 odłamków" : "+12 EXP",
      e.rig.root.position,
      "#e6f3be",
    );
    if (player.kills === 6)
      notify(
        "Wyprawa ukończona! Sprawdź magię lub poszukaj silniejszego przeciwnika.",
      );
    persist();
  }
}
function hurtPlayer(damage: number) {
  if (time < invincibleUntil || time < deathUntil || safe(player)) return;
  player.hp = Math.max(0, player.hp - damage);
  invincibleUntil = time + 0.35;
  lastCombat = time;
  shake = 0.2;
  flashUntil = time + 0.22;
  floatingText("−" + damage, player, "#ffbfa4");
  sound(95, 0.11, "sawtooth", 0.04);
  if (player.hp <= 0) {
    deathUntil = time + 1.1;
    player.exp = deathExperience(player.exp);
    player.coins = 0;
    attack = null;
    resetInput();
    notify("Pokonano Cię. Wracasz do schronienia — sprzęt i odkrycia zostają.");
  }
}
function nearestEnemy(range: number) {
  return enemies
    .filter(
      (e) =>
        e.state !== "dead" &&
        distance(player, e.rig.root.position) < range &&
        lineClear(player, e.rig.root.position),
    )
    .sort(
      (a, b) =>
        distance(player, a.rig.root.position) -
        distance(player, b.rig.root.position),
    )[0];
}
function beginAttack(sweep = false, autoAim = false) {
  if (!started || paused || helpOpen || deathUntil > time || attack) return;
  if (sweep ? time < sweepReady : time - lastAttack < R.attackCooldown) return;
  if (autoAim) {
    const e = nearestEnemy(weapon === "magic" ? 16 : 5);
    if (e)
      heading = Math.atan2(
        e.rig.root.position.x - player.x,
        e.rig.root.position.z - player.z,
      );
  }
  if (sweep) sweepReady = time + R.sweepCooldown;
  attack = {
    t: 0,
    duration: sweep ? 0.58 : R.attackDuration,
    hit: false,
    sweep,
    heading,
    ranged: weapon === "magic" && !sweep,
  };
  lastAttack = time;
  lastCombat = time;
  hero.sword.visible = weapon === "sword" || sweep;
  hero.wand.visible = weapon === "magic" && !sweep;
  sound(sweep ? 330 : 260, 0.09, "triangle", 0.03);
}
function fire(p: Point, dir: number, fromEnemy: boolean) {
  const node = new T.Mesh(
    new T.IcosahedronGeometry(fromEnemy ? 0.14 : 0.23, 1),
    new T.MeshBasicMaterial({ color: fromEnemy ? 0xea845a : 0x87edee }),
  );
  node.position.set(p.x, 1.1, p.z);
  scene.add(node);
  const speed = fromEnemy ? 10 : 23;
  shots.push({
    node,
    fromEnemy,
    vx: Math.sin(dir) * speed,
    vz: Math.cos(dir) * speed,
    life: fromEnemy ? 2.2 : 1.1,
    damage: fromEnemy ? 13 : 18 + Math.floor(player.exp / 60),
  });
}
function usePotion() {
  if (
    !started ||
    paused ||
    helpOpen ||
    deathUntil > time ||
    time < potionReady ||
    player.hp >= maxHp()
  )
    return;
  potionReady = time + R.potionCooldown;
  player.hp = Math.min(maxHp(), player.hp + 38);
  floatingText("+38", player, "#c8eea4");
  burst(player, 0xbce6a2);
  sound(540, 0.18, "sine");
  persist();
}
function updateEnemies(dt: number) {
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.state === "dead") {
      e.timer += dt;
      e.rig.root.rotation.z = Math.min(1, e.timer * 5) * Math.PI * 0.45;
      e.rig.root.scale.setScalar(
        (e.elite ? 1.25 : 1) * Math.max(0, 1 - Math.max(0, e.timer - 0.6) * 2),
      );
      e.respawn -= dt;
      if (e.respawn <= 0 && distance(player, e.spawn) > 10) {
        e.state = "idle";
        e.hp = e.maxHp;
        e.timer = 0;
        e.rig.root.position.set(e.spawn.x, 0, e.spawn.z);
        e.rig.root.rotation.z = 0;
        e.rig.root.scale.setScalar(e.elite ? 1.25 : 1);
      }
      continue;
    }
    const p = e.rig.root.position,
      d = distance(player, p);
    let moving = false;
    e.timer -= dt;
    if (e.state === "idle") {
      if (distance(p, e.spawn) > 13 || safe(player) || d > 17) {
        if (distance(p, e.spawn) > 0.5) {
          const a = Math.atan2(e.spawn.x - p.x, e.spawn.z - p.z);
          slide(p, Math.sin(a) * 2 * dt, Math.cos(a) * 2 * dt, 0.48);
          e.heading = a;
          moving = true;
        }
        if (d > 20) e.hp = Math.min(e.maxHp, e.hp + dt * 6);
      } else if (d < (e.kind === "wolf" ? 3.6 : 10) && lineClear(p, player)) {
        e.state = "windup";
        e.timer = e.kind === "wolf" ? 0.65 : 0.85;
        e.heading = Math.atan2(player.x - p.x, player.z - p.z);
        e.hit = false;
      } else {
        const a = Math.atan2(player.x - p.x, player.z - p.z);
        e.heading = a;
        const sign = e.kind === "archer" && d < 5 ? -1 : 1;
        slide(
          p,
          Math.sin(a) * 2.5 * dt * sign,
          Math.cos(a) * 2.5 * dt * sign,
          0.48,
        );
        moving = true;
      }
    } else if (e.state === "windup" && e.timer <= 0) {
      e.state = "strike";
      e.timer = e.kind === "wolf" ? 0.32 : 0.12;
      if (e.kind === "archer") fire(p, e.heading, true);
    } else if (e.state === "strike") {
      if (e.kind === "wolf") {
        const before = { x: p.x, z: p.z };
        slide(
          p,
          Math.sin(e.heading) * 10 * dt,
          Math.cos(e.heading) * 10 * dt,
          0.48,
        );
        if (!e.hit && segmentHitsCircle(before, p, player, 0.95)) {
          hurtPlayer(e.elite ? 25 : 15);
          e.hit = true;
        }
      }
      if (e.timer <= 0) {
        e.state = "recover";
        e.timer = e.elite ? 0.65 : 1;
      }
    } else if (e.state === "recover" && e.timer <= 0) e.state = "idle";
    e.rig.root.rotation.y = e.heading;
    e.warning.visible = e.state === "windup";
    e.warning.position.set(p.x, 0.065, p.z);
    e.warning.rotation.z = e.heading;
    // Shape lies in XY before rotation. Local Z rotation becomes a Y heading after projection.
    e.warning.rotation.set(-Math.PI / 2, 0, e.heading);
    animate(e.rig, dt, moving, e.state === "strike" ? 0.5 : 0, false);
    if (e.flash > 0) e.rig.body.position.y += 0.12;
    e.bar.visible = d < 20;
    e.bar.position.set(p.x, e.kind === "wolf" ? 1.8 : 2.8, p.z);
    e.bar.quaternion.copy(camera.quaternion);
    e.fill.scale.x = clamp(e.hp / e.maxHp, 0, 1);
  }
}
function updateAttack(dt: number) {
  if (!attack) return;
  attack.t += dt;
  heading = attack.heading;
  if (!attack.hit && attack.t >= R.attackHitAt) {
    attack.hit = true;
    if (attack.ranged) {
      fire(
        {
          x: player.x + Math.sin(heading) * 0.65,
          z: player.z + Math.cos(heading) * 0.65,
        },
        heading,
        false,
      );
    } else {
      let hit = false;
      for (const e of enemies)
        if (
          e.state !== "dead" &&
          inArc(
            player,
            e.rig.root.position,
            heading,
            attack.sweep ? R.sweepReach : R.reach,
            attack.sweep ? R.sweepHalfArc : R.halfArc,
          ) &&
          lineClear(player, e.rig.root.position)
        ) {
          hurtEnemy(e, (attack.sweep ? 24 : 16) + Math.floor(player.exp / 60));
          hit = true;
        }
      if (hit && attack.sweep) {
        shake = 0.16;
        sound(130, 0.15, "triangle");
      }
    }
  }
  if (attack.t >= attack.duration) {
    attack = null;
    hero.sword.visible = weapon === "sword";
    hero.wand.visible = weapon === "magic";
  }
}
function updateShots(dt: number) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i],
      p = s.node.position,
      before = { x: p.x, z: p.z };
    p.x += s.vx * dt;
    p.z += s.vz * dt;
    s.life -= dt;
    let hit = false;
    if (!lineClear(before, p)) hit = true;
    if (!hit && s.fromEnemy && segmentHitsCircle(before, p, player, 0.6)) {
      hurtPlayer(s.damage);
      hit = true;
    }
    if (!hit && !s.fromEnemy)
      for (const e of enemies)
        if (
          e.state !== "dead" &&
          segmentHitsCircle(before, p, e.rig.root.position, 0.7)
        ) {
          hurtEnemy(e, s.damage);
          hit = true;
          break;
        }
    if (hit || s.life <= 0) {
      burst(p, s.fromEnemy ? 0xe59a6b : 0xa4e8e4, 4);
      scene.remove(s.node);
      s.node.geometry.dispose();
      (s.node.material as T.Material).dispose();
      shots.splice(i, 1);
    }
  }
}
function updateEffects(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.velocity.y -= 12 * dt;
    p.node.position.addScaledVector(p.velocity, dt);
    p.node.rotation.x += dt * 10;
    p.node.scale.setScalar(Math.max(0, p.life / p.total));
    if (p.life <= 0) {
      scene.remove(p.node);
      p.node.geometry.dispose();
      (p.node.material as T.Material).dispose();
      particles.splice(i, 1);
    }
  }
  for (let i = floating.length - 1; i >= 0; i--) {
    const f = floating[i];
    f.life -= dt;
    f.p.y += dt * 1.6;
    const v = f.p.clone().project(camera);
    f.el.style.left = `${((v.x + 1) * innerWidth) / 2}px`;
    f.el.style.top = `${((1 - v.y) * innerHeight) / 2}px`;
    f.el.style.opacity = String(Math.min(1, f.life * 3));
    if (f.life <= 0) {
      f.el.remove();
      floating.splice(i, 1);
    }
  }
}
function updateHud() {
  const hp = clamp(player.hp / maxHp(), 0, 1);
  $("hp-fill").style.width = `${hp * 100}%`;
  $("hp-label").textContent = `${Math.ceil(player.hp)} / ${maxHp()}`;
  $("level").textContent = String(1 + Math.floor(player.exp / 60));
  $("xp-fill").style.width = `${((player.exp % 60) / 60) * 100}%`;
  const count = Math.min(6, player.kills);
  $("progress").textContent =
    count < 6
      ? `${count} / 6 · bursztynowy znacznik prowadzi do wroga`
      : "6 / 6 · eksploruj, ćwicz i porównaj bronie";
  $("goal").textContent =
    count < 6
      ? "Opuść schronienie i pokonaj 6 przeciwników"
      : "Pierwsza wyprawa ukończona";
  const inSafe = safe(player);
  $("zone").className = `zone ${inSafe ? "safe" : "danger"}`;
  $("zone").textContent = inSafe
    ? "SCHRONIENIE · regeneracja"
    : time - lastCombat < R.regenDelay
      ? "DZICZ · walka"
      : "DZICZ · poza walką";
  $("loot").textContent =
    `${player.fragments} odłamków · ${player.coins} złota`;
  const sweepLeft = Math.max(0, sweepReady - time),
    healLeft = Math.max(0, potionReady - time);
  $<HTMLButtonElement>("sweep").disabled = sweepLeft > 0 || paused || helpOpen;
  $("sweep-time").textContent = sweepLeft
    ? `${sweepLeft.toFixed(1)} s`
    : "GOTOWY";
  $<HTMLButtonElement>("heal").disabled =
    healLeft > 0 || player.hp >= maxHp() || paused || helpOpen;
  $("heal-time").textContent = healLeft
    ? `${Math.ceil(healLeft)} s`
    : "MIKSTURA";
  $("fps").textContent =
    `${Math.round(1 / (frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length) || 1))} FPS · ${map.buildings.length} brył OSM`;
  $("pause").textContent = paused ? "▶" : "Ⅱ";
  $("pause").setAttribute("aria-label", paused ? "Wznów grę" : "Pauza");
  if (time > toastUntil) $("toast").classList.remove("on");
  $("damage-vignette").style.opacity = time < flashUntil ? ".55" : "0";
}
function resetInput() {
  keys.clear();
  mouseAim = null;
  move = { x: 0, z: 0 };
  aiming = false;
  document
    .querySelectorAll<HTMLElement>(".stick i")
    .forEach((e) => (e.style.transform = ""));
  cancelSticks();
}
let cancelSticks = () => {};
function setPause(value: boolean) {
  paused = value;
  resetInput();
  persist();
  updateHud();
  if (value) notify("Pauza — świat i przeciwnicy czekają.");
  else $("toast").classList.remove("on");
}
function pointerAim(clientX: number, clientY: number) {
  ray.setFromCamera(
    new T.Vector2(
      (clientX / innerWidth) * 2 - 1,
      1 - (clientY / innerHeight) * 2,
    ),
    camera,
  );
  const p = ray.ray.intersectPlane(ground, scratch);
  if (p) heading = Math.atan2(p.x - player.x, p.z - player.z);
}
function bindControls() {
  const cancels: (() => void)[] = [];
  function stick(id: string, isAttack: boolean) {
    const el = $(id);
    let pointer: number | null = null,
      startX = 0,
      startY = 0,
      dragged = false;
    const nub = el.querySelector("i")!;
    const clear = () => {
      pointer = null;
      nub.style.transform = "";
      if (isAttack) aiming = false;
      else move = { x: 0, z: 0 };
    };
    cancels.push(clear);
    el.addEventListener("pointerdown", (e) => {
      if (!started || paused || helpOpen) return;
      pointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragged = false;
      el.setPointerCapture(pointer);
      if (isAttack) aiming = true;
      e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      if (pointer !== e.pointerId) return;
      const dx = e.clientX - startX,
        dy = e.clientY - startY,
        len = Math.hypot(dx, dy),
        r = el.clientWidth * 0.34,
        k = Math.min(1, r / (len || 1));
      nub.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      if (len > 7) dragged = true;
      if (isAttack) {
        if (len > 5) heading = Math.atan2(dx, dy);
      } else move = { x: (dx * k) / r, z: (dy * k) / r };
    });
    el.addEventListener("pointerup", (e) => {
      if (pointer !== e.pointerId) return;
      if (isAttack) beginAttack(false, !dragged);
      clear();
    });
    el.addEventListener("pointercancel", clear);
    el.addEventListener("lostpointercapture", clear);
  }
  stick("move-stick", false);
  stick("attack-stick", true);
  cancelSticks = () => cancels.forEach((fn) => fn());
  window.addEventListener("keydown", (e) => {
    if (!started || e.target instanceof HTMLInputElement) return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat && !helpOpen) setPause(!paused);
      return;
    }
    if (paused || helpOpen) return;
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === "Space") beginAttack(false, true);
    if (e.code === "KeyQ") beginAttack(true, true);
    if (e.code === "KeyH") usePotion();
    if (e.code === "Digit1") selectWeapon("sword");
    if (e.code === "Digit2") selectWeapon("magic");
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    if (started) setPause(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && started) setPause(true);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !paused && !helpOpen) {
      mouseAim = { x: e.clientX, y: e.clientY };
      pointerAim(e.clientX, e.clientY);
    }
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    pointerAim(e.clientX, e.clientY);
    beginAttack();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  $("sweep").onclick = () => beginAttack(true, true);
  $("heal").onclick = usePotion;
  $("pause").onclick = () => setPause(!paused);
  document.querySelectorAll<HTMLButtonElement>("[data-weapon]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!attack) selectWeapon(b.dataset.weapon as "sword" | "magic");
      }),
  );
  $("audio").onclick = () => {
    soundOn = !soundOn;
    if (soundOn) enableAudio();
    $("audio").setAttribute("aria-pressed", String(soundOn));
    $("audio").textContent = soundOn ? "♫" : "♩";
  };
  $("help-button").onclick = () => {
    helpOpen = true;
    resetInput();
    $("help").hidden = false;
    updateHud();
  };
  $("close-help").onclick = () => {
    helpOpen = false;
    $("help").hidden = true;
    resetInput();
  };
  $("reset").onclick = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    location.reload();
  };
  $("start").onclick = () => {
    started = true;
    $("loading").hidden = true;
    clock.start();
    soundOn = true;
    enableAudio();
    $("audio").setAttribute("aria-pressed", "true");
    notify("Witaj w Lublinie. Sprawdź miecz, potem przełącz na magię.");
  };
  window.addEventListener("pagehide", persist);
}
function resize() {
  const aspect = innerWidth / innerHeight,
    vertical = innerWidth < 700 ? 19 : 16;
  camera.left = -vertical * aspect;
  camera.right = vertical * aspect;
  camera.top = vertical;
  camera.bottom = -vertical;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
}
const clock = new T.Clock();
function tick() {
  requestAnimationFrame(tick);
  const raw = clock.getDelta(),
    dt = Math.min(raw, 0.075);
  frames.push(raw);
  if (frames.length > 90) frames.shift();
  if (ready && started && !paused && !helpOpen) {
    time += dt;
    if (deathUntil > 0) {
      if (time >= deathUntil) {
        deathUntil = 0;
        player.x = home.x;
        player.z = home.z;
        player.hp = maxHp();
        invincibleUntil = time + 2;
        shots.forEach((s) => {
          scene.remove(s.node);
          s.node.geometry.dispose();
          (s.node.material as T.Material).dispose();
        });
        shots.length = 0;
        cameraTarget.set(player.x, 0, player.z);
        persist();
      }
    } else {
      let dx =
          move.x +
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
        dz =
          move.z +
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0),
        len = Math.hypot(dx, dz);
      if (len > 1) {
        dx /= len;
        dz /= len;
      }
      if (len > 0.08) {
        slide(
          player,
          dx * R.speed * dt * (attack?.sweep ? 0.6 : 1),
          dz * R.speed * dt * (attack?.sweep ? 0.6 : 1),
          R.radius,
        );
        if (!aiming && !attack && !keys.has("Space"))
          heading = Math.atan2(dx, dz);
      }
      if (mouseAim && !attack) pointerAim(mouseAim.x, mouseAim.y);
      updateAttack(dt);
      animate(
        hero,
        dt,
        len > 0.08,
        attack ? attack.t / attack.duration : 0,
        attack?.sweep ?? false,
      );
      hero.root.position.set(player.x, 0, player.z);
      hero.root.rotation.y = heading;
      hero.root.rotation.z = 0;
      if (
        player.hp < maxHp() &&
        (safe(player) || time - lastCombat > R.regenDelay)
      )
        player.hp = Math.min(maxHp(), player.hp + dt * (safe(player) ? 22 : 4));
    }
    updateEnemies(dt);
    updateShots(dt);
    updateEffects(dt);
    if (deathUntil > time) {
      hero.root.rotation.z =
        Math.min(1, (1.1 - (deathUntil - time)) * 3) * Math.PI * 0.4;
      hero.root.position.y = -0.1;
    }
    if (time - lastSave > 2) {
      persist();
      lastSave = time;
    }
  }
  if (!ready) return;
  cameraTarget.lerp(
    new T.Vector3(player.x, 0, player.z),
    1 - Math.exp(-dt * 10),
  );
  camera.position.set(cameraTarget.x, 39, cameraTarget.z + 30);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
    if (!paused && !helpOpen) shake = Math.max(0, shake - dt);
  }
  heroBar.group.position.set(player.x, 2.9, player.z);
  heroBar.group.quaternion.copy(camera.quaternion);
  heroBar.fill.scale.x = clamp(player.hp / maxHp(), 0, 1);
  const activeAttack = attack && !attack.ranged;
  aimView.visible = aiming || !!activeAttack;
  aimView.position.set(player.x, 0.065, player.z);
  aimView.rotation.set(-Math.PI / 2, 0, heading);
  aimView.scale.setScalar(attack?.sweep ? R.sweepReach / R.reach : 1);
  (aimView.material as T.MeshBasicMaterial).opacity = activeAttack
    ? 0.35
    : 0.18;
  const target = enemies
    .filter((e) => e.state !== "dead")
    .sort(
      (a, b) =>
        distance(player, a.rig.root.position) -
        distance(player, b.rig.root.position),
    )[0];
  targetArrow.visible = !!target && player.kills < 6;
  if (target) {
    const p = target.rig.root.position,
      d = distance(player, p),
      k = Math.min(1, 6 / (d || 1));
    targetArrow.position.set(
      player.x + (p.x - player.x) * k,
      3.3 + Math.sin(time * 3) * 0.15,
      player.z + (p.z - player.z) * k,
    );
    targetArrow.rotation.z = Math.PI;
  }
  occlusionClock += dt;
  if (occlusionClock > 0.1) {
    occlusionClock = 0;
    const occluded = new Set<T.Object3D>();
    const actors = [
      hero.root.position,
      ...enemies
        .filter(
          (e) =>
            e.state !== "dead" && distance(player, e.rig.root.position) < 16,
        )
        .map((e) => e.rig.root.position),
    ];
    const nearbyBuildings = buildingViews
      .filter(
        (b) =>
          b.box.x0 < player.x + 23 &&
          b.box.x1 > player.x - 23 &&
          b.box.z0 < player.z + 23 &&
          b.box.z1 > player.z - 23,
      )
      .map((b) => b.node);
    const sight = new T.Raycaster();
    for (const actor of actors) {
      const target = actor.clone().add(new T.Vector3(0, 0.8, 0));
      const direction = target.clone().sub(camera.position);
      sight.set(camera.position, direction.clone().normalize());
      sight.far = direction.length() - 0.15;
      for (const hit of sight.intersectObjects(nearbyBuildings, false))
        occluded.add(hit.object);
    }
    for (const b of buildingViews) {
      const near = occluded.has(b.node);
      for (const m of b.materials) {
        m.transparent = near;
        m.opacity = near ? 0.15 : 1;
        m.depthWrite = !near;
      }
    }
  }
  if (time - lastHud > 0.1 || paused || helpOpen || !started) {
    updateHud();
    lastHud = time;
  }
  renderer.render(scene, camera);
}
async function init() {
  try {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const response = await fetch("combat3d/lublin.json");
    if (!response.ok) throw new Error(`Mapa: HTTP ${response.status}`);
    map = (await response.json()) as MapData;
    buildWorld();
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    bindControls();
    resize();
    window.addEventListener("resize", resize);
    ready = true;
    $("loading-text").textContent =
      "Prawdziwy układ Starego Miasta. Nowy bohater, miecz, magia i sweep. Sprawdź, czy walka daje frajdę.";
    $("start").hidden = false;
    updateHud();
    tick();
    // Read-only diagnostics. Optional QA fixtures are restricted to ?qa=1 in this local-only laboratory.
    Object.assign(window, {
      __combat3d: {
        snapshot: () => ({
          ready,
          started,
          paused,
          helpOpen,
          time,
          player: { ...player },
          home: { ...home },
          weapon,
          sweepReady,
          potionReady,
          attack: attack ? { ...attack } : null,
          enemies: enemies.map((e) => ({
            id: e.id,
            x: e.rig.root.position.x,
            z: e.rig.root.position.z,
            hp: e.hp,
            state: e.state,
            kind: e.kind,
          })),
          map: {
            buildings: map.buildings.length,
            roads: map.roads.length,
            source: "existing OSM extract",
          },
          drawCalls: renderer.info.render.calls,
        }),
        ...(new URLSearchParams(location.search).has("qa")
          ? {
              fixture: (name: string) => {
                resetInput();
                attack = null;
                shots.forEach((s) => scene.remove(s.node));
                shots.length = 0;
                for (const e of enemies) {
                  e.state = "dead";
                  e.hp = 0;
                  e.respawn = 9999;
                  e.rig.root.visible = false;
                  e.warning.visible = false;
                  e.bar.visible = false;
                }
                const open = findFree({ x: home.x + 10, z: home.z + 10 });
                player.x = open.x;
                player.z = open.z;
                player.hp = maxHp();
                lastCombat = time;
                invincibleUntil = 0;
                cameraTarget.set(player.x, 0, player.z);
                const e = enemies[0];
                if (name !== "empty") {
                  e.rig.root.visible = true;
                  e.rig.root.scale.setScalar(1);
                  e.rig.root.rotation.z = 0;
                  e.state = "idle";
                  e.hp = e.maxHp = 100;
                  e.spawn = findFree({ x: open.x, z: open.z - 2 });
                  for (let a = 0; a < Math.PI * 2; a += 0.2) {
                    const p = {
                      x: open.x + Math.sin(a) * 2,
                      z: open.z + Math.cos(a) * 2,
                    };
                    if (!blocked(p.x, p.z, 0.7) && lineClear(open, p)) {
                      e.spawn = p;
                      break;
                    }
                  }
                  e.rig.root.position.set(e.spawn.x, 0, e.spawn.z);
                  e.timer = name === "duel" ? 0 : 100;
                  e.state = name === "duel" ? "idle" : "recover";
                  e.hit = false;
                  heading = Math.atan2(e.spawn.x - open.x, e.spawn.z - open.z);
                }
                if (name === "hurt") {
                  player.hp = 25;
                }
                if (name === "death") {
                  hurtPlayer(999);
                }
                if (name === "wall") {
                  const b = buildingViews.find((b) => Math.abs(b.box.x0) < 30);
                  if (b) {
                    const p = findFree({
                      x: b.box.x0 - 1,
                      z: (b.box.z0 + b.box.z1) / 2,
                    });
                    player.x = p.x;
                    player.z = p.z;
                  }
                }
                return { x: player.x, z: player.z };
              },
              hurt: (n: number) => hurtPlayer(n),
              attack: (s = false) => beginAttack(s, true),
              potion: usePotion,
            }
          : {}),
      },
    });
  } catch (error) {
    $("loading-text").textContent =
      `Nie udało się uruchomić próby: ${error instanceof Error ? error.message : String(error)}. Wymagana jest przeglądarka z WebGL 2.`;
    console.error(error);
  }
}
void init();
