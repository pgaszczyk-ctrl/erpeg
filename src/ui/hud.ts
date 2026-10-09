// The HUD over the world (owner's spec "nowy HUD", 5 Oct 2026; mock-up from the 🎨 Grafika chat):
// - bottom right: one pixel-art "machine" (70×60 picture pixels shown ×4, NEAREST): two glass
//   tubes (life red, experience amber), a round heal button (potion, else fruit), a brass pipe
//   with a gauge, the hero's avatar above the heal button (= the Kufer) and two square buttons
//   at the bottom (camera, quest log) – v2, owner 5 Oct 2026;
// - top right: a plaque with a compass (= the map), the town + weather and where we are,
//   and one line of the current quest under it;
// - pickups: short "+1 marchewka" notes left of the machine, stacked, fading.
// Plain HTML (real buttons with labels for screen readers) outside #game, so touches on it
// never reach the joystick (controls.ts listens on #game only).

const BASE_URL = import.meta.env.BASE_URL || '/';

export interface HudView {
  hp: number;
  maxHp: number;
  /** Bonus half-hearts from a potion (blue, on top of the red). */
  extra: number;
  /** Poisoned by a dragon's smoke: the liquid in the life tube turns greenish (no new icons – minimal HUD). */
  zatruty?: boolean;
  /** Share of the way to the next level (1 at the top level). */
  expShare: number;
  potions: number;
  fruit: number;
  /** Nothing left to heal with (the button is dimmed). */
  noHeal: boolean;
  /** Prepared food selected after potions and edible harvests. */
  preparedFood?: { icon: string; n: number };
  town: string;
  weather: string;
  detail: string;
  quest: { text: string; color: string; more: number } | null;
  /** The purse and the diamonds (shown on the plaque at the top, owner 6 Oct 2026). */
  coins: number;
  diamonds: number;
  /** The weapon in hand for the window left of the heal button: picture, worn % or shots left, red when it needs care. */
  bron: { pic: string | null; label: string; warn: boolean; title: string };
}

export interface HudHandlers {
  heal: () => void;
  character: () => void;
  camera: () => void;
  map: () => void;
  quests: () => void;
  /** Bigger picture for children (+~30 %); returns whether it is on now. */
  zoom: () => boolean;
  /** Whether the bigger picture is on (the button's look at start). */
  zoomOn: boolean;
  vehicle?: (vehicle: 'rower' | 'hulajnoga') => void;
}

/** Picture pixels: the machine's grid (from the mock-up). */
/** v3 (owner, 6 Oct 2026): 16 columns more on the left, so the camera fits left of the avatar/heal/quest-log column. */
const L = 16;
const W = 70 + L;
/** v2 (owner, 5 Oct 2026): 30 rows taller – longer tubes, the avatar over the heal button (scripts/hud-maszynka.py). */
const E = 30;
const H = 60 + E;
/** Tube inside: 46 px high, bottom at y 52. */
const TUBA = 46 + E;
/** The tube's bottom (first row under the liquid). */
const DNO = 53 + E;
/** The column (avatar, heal button, quest log): left edge, and the tops with equal gaps (scripts/hud-maszynka.py). */
const CX = 11 + L;
const HY = 36;
const BY = 70;
/** Bottom buttons share the original 20 px frame and 8 px brass connector. */
const BUTTON = 20;
const STEP = BUTTON + 8;
const CAMERA_X = CX + 3 - STEP;

const CSS = `
#hud { position: fixed; inset: 0; pointer-events: none; z-index: 5; font-family: 'Pixelify Sans', monospace; }
#hud.off { display: none; }
#hud.dim .hud-m, #hud.dim .hud-plate, #hud.dim .hud-quest, #hud.dim .hud-picks { opacity: 0.45; }
#hud.dim, #hud.dim * { pointer-events: none !important; }
#hud button { pointer-events: auto; position: absolute; padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; border-radius: 4px; -webkit-tap-highlight-color: transparent; }
#hud button:focus-visible { outline: 2px solid #f1e3c2; }
@media (hover: hover) { #hud .hud-m button:hover { background: rgba(255,240,200,0.12); } }
#hud .hud-m { position: absolute; }
#hud .hud-m canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; }
#hud .hud-count { position: absolute; box-sizing: border-box; background: #1a110b; color: #f1e3c2; text-align: center; font-weight: 700; pointer-events: none; }
#hud .hud-wpn img { position: absolute; image-rendering: pixelated; pointer-events: none; }
#hud .hud-vehicle[hidden] { display: none; }
#hud .hud-vehicle img { position: absolute; object-fit: contain; image-rendering: pixelated; pointer-events: none; }
#hud .hud-wcount { position: absolute; box-sizing: border-box; background: #1a110b; color: #f1e3c2; text-align: center; font-weight: 700; pointer-events: none;
  border: 1px solid #b8893b; font: 700 11px/12px 'Pixelify Sans', monospace; height: 14px; min-width: 16px; padding: 0 3px; white-space: nowrap; }
#hud .hud-wcount.warn { background: #7a1e14; color: #ffe0d8; }
#hud .hud-wcount:empty { display: none; }
#hud .hud-heal.low { animation: hud-pulse 0.9s ease-in-out infinite; }
@keyframes hud-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(232,100,90,0); } 50% { box-shadow: 0 0 14px 6px rgba(232,100,90,0.75); } }
#hud .hud-p { position: absolute; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
#hud .hud-plate { pointer-events: auto; display: flex; align-items: center; gap: 9px; padding: 6px 11px 6px 6px; box-sizing: border-box; max-width: 100%;
  background: rgba(28,20,14,0.82); border: 2px solid #b8893b; border-radius: 10px; box-shadow: 0 0 0 2px #1a110b; color: #f3dfb0; }
#hud .hud-compass { position: relative !important; flex-shrink: 0; width: 44px; height: 44px; box-sizing: border-box; border-radius: 8px !important;
  background: #3d2e22 !important; border: 2px solid #b8893b !important; display: flex; align-items: center; justify-content: center; }
#hud .hud-zoom.on { background: #6b4a1f !important; }
#hud .hud-lines { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
#hud .hud-l1 { display: flex; align-items: baseline; gap: 9px; white-space: nowrap; min-width: 0; overflow: hidden; }
#hud .hud-weather { flex-shrink: 0; }
#hud .hud-town { font-size: 17px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
#hud .hud-weather { font-size: 14px; color: #d9c49a; }
#hud .hud-l2 { font-size: 13px; color: #c9b48a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#hud .hud-quest { position: relative !important; display: flex; align-items: center; gap: 7px; max-width: 100%; padding: 4px 10px 4px 4px !important;
  background: rgba(28,20,14,0.72) !important; border-radius: 8px !important; color: #f3dfb0; font: inherit; font-size: 14px; text-align: left; }
#hud .hud-quest .dot { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; color: #3a2a1c; display: flex; align-items: center; justify-content: center; font-weight: 700; }
#hud .hud-quest .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#hud .hud-quest .more { color: #c9b48a; font-size: 12px; flex-shrink: 0; }
#hud .hud-money { display: flex; align-items: center; gap: 16px; padding: 5px 14px 5px 9px; background: rgba(28,20,14,0.88); border: 2px solid #b8893b;
  border-radius: 10px; box-shadow: 0 0 0 2px #1a110b; color: #ffe9a8; font-size: 21px; font-weight: 700; white-space: nowrap; }
#hud .hud-money span { display: flex; align-items: center; gap: 6px; }
#hud .hud-money img, #hud .hud-money svg { width: 30px; height: 30px; image-rendering: pixelated; flex-shrink: 0; }
/* On a computer: top edge, centred over the hero (owner, 6 Oct 2026). */
#hud .hud-money.top { position: absolute; left: 50%; transform: translateX(-50%); }
#hud .hud-picks { position: absolute; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
#hud .hud-pick { display: flex; align-items: center; gap: 7px; padding: 5px 11px; background: rgba(28,20,14,0.85); border-radius: 8px; color: #ffe9a8; font-size: 15px;
  transition: opacity 0.5s; white-space: nowrap; }
#hud .hud-pick img { width: 18px; height: 18px; image-rendering: pixelated; object-fit: contain; }
`;

const img = (name: string) => {
  const i = new Image();
  i.src = `${BASE_URL}hud/maszynka_${name}.png`;
  return i;
};

let root: HTMLDivElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let pics: Record<'baza' | 'mikstura' | 'owoc', HTMLImageElement> | null = null;
/** The hero's head and shoulders for the avatar frame (null: the drawn frame stays empty). */
let avatar: { src: CanvasImageSource; sx: number; sy: number; sw: number; sh: number } | null = null;
let view: HudView | null = null;
let timer = 0;
let parts: {
  m: HTMLDivElement; count: HTMLDivElement; heal: HTMLButtonElement; hp: HTMLButtonElement; xp: HTMLButtonElement;
  p: HTMLDivElement; town: HTMLSpanElement; weather: HTMLSpanElement; detail: HTMLDivElement; quest: HTMLButtonElement;
  picks: HTMLDivElement; coins: HTMLSpanElement; diamonds: HTMLSpanElement;
  wpn: HTMLButtonElement; wpnImg: HTMLImageElement; wcount: HTMLDivElement; money: HTMLDivElement; avPic: HTMLCanvasElement;
  vehicles: Record<'rower' | 'hulajnoga', HTMLButtonElement>;
} | null = null;
let lastVehicles = '';
let scale = 4;
/** Room to the left for the longer bottom rail; the upper machine stays anchored on the right. */
let railExtra = 0;

function visibleVehicles() {
  return parts ? Object.values(parts.vehicles).filter((b) => !b.hidden) : [];
}

/** How big the machine is: ×2 on phones, ×3 on a computer (owner, 5 Oct 2026: ×4 from the spec was far too big). */
function pickScale() {
  return window.matchMedia('(pointer: coarse)').matches ? 2 : 3;
}

/** A folded paper map in pixels (the button for the map screen; a compass would always point north). */
const MAPA_SVG = (() => {
  const rows = [
    '..aaaa....aaaa..',
    '.abbbbaccabbbba.',
    '.abbbbacca bbba.',
    '.abrbbaccabbbba.',
    '.abbrbaccabbbba.',
    '.abbbbrccabbbba.',
    '.abbbbacrrbbbba.',
    '.abbbbaccarbbba.',
    '.abbbbaccabbxba.',
    '.abbbbaccabxbxa.',
    '.abbbbaccabbxba.',
    '.abbbbaccabbbba.',
    '.aaaaaaaaaaaaaa.',
  ];
  const col: Record<string, string> = { a: '#1a110b', b: '#f1e3c2', c: '#d9c49a', r: '#8a5a12', x: '#c0392b' };
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = col[ch] ?? (ch === ' ' ? col.b : '');
    if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  }));
  return `<svg width="32" height="26" viewBox="0 0 16 13" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
})();
/** A leather purse tied with a gold cord, in pixels (the coins on the top plaque). */
const SAKIEWKA_SVG = (() => {
  const rows = [
    '....aaaa....',
    '...accca....',
    '....aya.....',
    '...ayyya....',
    '..abbbbba...',
    '.abbcbbbba..',
    'abbcbbbbbba.',
    'abcbbbbbdba.',
    'abbbbbbbdba.',
    'abbbbbbddba.',
    '.abbddddba..',
    '..aaaaaaa...',
  ];
  const col: Record<string, string> = { a: '#1a110b', b: '#8a5a2b', c: '#b07a40', d: '#5e3b1c', y: '#e2b25a' };
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = col[ch];
    if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  }));
  return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
})();

/** A brass magnifier in pixels (the bigger-picture button): a "+" when off, a "−" when on. */
function lupaSvg(on: boolean) {
  const rows = [
    '...aaaa.....',
    '..abbbba....',
    '.abcccbba...',
    'abccccccba..',
    'abcccccc.ba.',
    'abccccccbba.',
    '.abccccbba..',
    '..abbbbaaa..',
    '...aaaaabda.',
    '........adda',
    '.........ada',
    '..........a.',
  ];
  const col: Record<string, string> = { a: '#1a110b', b: '#e2b25a', c: '#9cc8e0', d: '#8a5a12', '.': '' };
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = col[ch];
    if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
  }));
  // The sign inside the glass.
  r += `<rect x="2" y="4" width="5" height="1" fill="#1a110b"/>`;
  if (!on) r += `<rect x="4" y="2" width="1" height="5" fill="#1a110b"/>`;
  return `<svg width="28" height="28" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

/** Redraws the magnifier button (after the Z key). */
let zoomBtn: ((on: boolean) => void) | null = null;
export const hudZoom = (on: boolean) => zoomBtn?.(on);

/** Touch targets stay at least this big (CSS px), reaching past the drawing if needed. */
const MIN_HIT = 44;
const margin = () => (window.matchMedia('(pointer: coarse)').matches ? 10 : 20);

export function mountHud(on: HudHandlers) {
  unmountHud();
  if (!document.getElementById('hud-css')) {
    const st = document.createElement('style');
    st.id = 'hud-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  pics ??= { baza: img('baza'), mikstura: img('mikstura'), owoc: img('owoc') };
  for (const p of Object.values(pics)) if (!p.complete) p.addEventListener('load', draw, { once: true });
  root = document.createElement('div');
  root.id = 'hud';
  const btn = (cls: string, label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.className = cls;
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    // pointerdown, not click: the game's own touch handling must not see it as a swing.
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };

  const m = document.createElement('div');
  m.className = 'hud-m';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  ctx = canvas.getContext('2d');
  const count = document.createElement('div');
  count.className = 'hud-count';
  const heal = btn('hud-heal', 'Wylecz się', on.heal);
  const hp = btn('', 'Zdrowie', on.character);
  const xp = btn('', 'Doświadczenie', on.character);
  // The weapon window (owner, 6 Oct 2026): sword → rough wear, bow/crossbow/gun → shots left, wand → magic.
  const wpn = btn('hud-wpn', 'Broń w ręce', on.character);
  const wpnImg = document.createElement('img');
  wpnImg.alt = '';
  wpn.append(wpnImg);
  const wcount = document.createElement('div');
  wcount.className = 'hud-wcount';
  // The avatar has its own canvas at the screen's real pixels (owner, 6 Oct 2026: shrunk into the machine's 18 px it was blurred).
  const avPic = document.createElement('canvas');
  avPic.className = 'hud-avpic';
  avPic.style.cssText = 'position:absolute;pointer-events:none';
  const vehicleButton = (vehicle: 'rower' | 'hulajnoga', pic: string) => {
    const b = btn(`hud-vehicle hud-${vehicle}`, '', () => on.vehicle?.(vehicle));
    b.hidden = true;
    const image = document.createElement('img');
    image.alt = '';
    if (on.vehicle) image.src = BASE_URL + pic;
    b.append(image);
    return b;
  };
  const vehicles = {
    rower: vehicleButton('rower', 'hud/welocyped_128.png'),
    hulajnoga: vehicleButton('hulajnoga', 'items/hulajnoga_parowa.png'),
  };
  m.append(canvas, avPic, heal, hp, xp, count, wpn, wcount,
    vehicles.rower, vehicles.hulajnoga,
    btn('hud-av', 'Twoja postać – kufer', on.character), btn('hud-b1', 'Aparat – zrób zdjęcie', on.camera), btn('hud-b2', 'Dziennik zadań', on.quests));

  const p = document.createElement('div');
  p.className = 'hud-p';
  const plate = document.createElement('div');
  plate.className = 'hud-plate';
  const compass = btn('hud-compass', 'Mapa', on.map);
  compass.innerHTML = MAPA_SVG;
  // Bigger picture for children (owner, 6 Oct 2026: kids can't make out the details).
  const lupa = btn('hud-compass hud-zoom', '', () => setZoomBtn(on.zoom()));
  const setZoomBtn = (zoomBtn = (z: boolean) => {
    lupa.innerHTML = lupaSvg(z);
    const label = z ? 'Pomniejsz widok' : 'Powiększ widok';
    lupa.setAttribute('aria-label', label);
    lupa.title = `${label} (Z)`;
    lupa.setAttribute('aria-pressed', String(z));
    lupa.classList.toggle('on', z);
  });
  setZoomBtn(on.zoomOn);
  const lines = document.createElement('div');
  lines.className = 'hud-lines';
  const l1 = document.createElement('div');
  l1.className = 'hud-l1';
  const town = document.createElement('span');
  town.className = 'hud-town';
  const weather = document.createElement('span');
  weather.className = 'hud-weather';
  l1.append(town, weather);
  const detail = document.createElement('div');
  detail.className = 'hud-l2';
  lines.append(l1, detail);
  plate.append(compass, lupa, lines);
  // The purse and the diamonds under the plaque.
  const money = document.createElement('div');
  money.className = 'hud-money';
  const coinsEl = document.createElement('span');
  const diamondsEl = document.createElement('span');
  money.append(coinsEl, diamondsEl);
  const quest = btn('hud-quest', 'Dziennik zadań', on.quests);
  p.append(plate, money, quest);

  const picks = document.createElement('div');
  picks.className = 'hud-picks';
  root.append(m, p, picks);
  document.body.append(root);
  parts = { m, count, heal, hp, xp, p, town, weather, detail, quest, picks, coins: coinsEl, diamonds: diamondsEl, wpn, wpnImg, wcount, money, avPic, vehicles };
  layout();
  window.addEventListener('resize', layout);
  // A slow bubble in each tube.
  timer = window.setInterval(draw, 140);
}

export function unmountHud() {
  window.removeEventListener('resize', layout);
  window.clearInterval(timer);
  root?.remove();
  root = null;
  parts = null;
  ctx = null;
  lastVehicles = '';
}

/** Only vehicles in the backpack get a button; clicking an active one means walking. */
export function setHudVehicles(rower: boolean, hulajnoga: boolean, active: 'pieszo' | 'rower' | 'hulajnoga') {
  if (!parts) return;
  const key = `${rower}:${hulajnoga}:${active}`;
  if (key === lastVehicles) return;
  lastVehicles = key;
  for (const vehicle of ['rower', 'hulajnoga'] as const) {
    const b = parts.vehicles[vehicle];
    b.hidden = !(vehicle === 'rower' ? rower : hulajnoga);
    const mounted = active === vehicle;
    const label = vehicle === 'rower' ? (mounted ? 'Zejdź z roweru' : 'Wsiądź na rower') : (mounted ? 'Zejdź z hulajnogi' : 'Wsiądź na hulajnogę');
    b.setAttribute('aria-pressed', String(mounted));
    b.setAttribute('aria-label', label);
    b.title = label;
  }
  layout();
}

/** Dimmed (still visible, taps go through) while a dialog is open; hidden behind the game-over screen (owner, 6 Oct 2026). */
export function showHud(mode: 'on' | 'dim' | 'off') {
  root?.classList.toggle('off', mode === 'off');
  root?.classList.toggle('dim', mode === 'dim');
}

function layout() {
  if (!parts) return;
  scale = pickScale();
  const s = scale;
  const M = margin();
  const vehicles = visibleVehicles();
  railExtra = vehicles.length * STEP;
  const width = W + railExtra;
  if (ctx && ctx.canvas.width !== width) ctx.canvas.width = width;
  const at = (el: HTMLElement, x: number, y: number, w: number, h: number) => {
    const gw = Math.max(0, MIN_HIT - w * s) / 2;
    const gh = Math.max(0, MIN_HIT - h * s) / 2;
    Object.assign(el.style, { left: `${x * s - gw}px`, top: `${y * s - gh}px`, width: `${w * s + 2 * gw}px`, height: `${h * s + 2 * gh}px` });
  };
  Object.assign(parts.m.style, { right: `${M}px`, bottom: `${M}px`, width: `${width * s}px`, height: `${H * s}px` });
  const g = Math.max(0, MIN_HIT - BUTTON * s) / 2;
  const insetIcon = (image: HTMLImageElement) => Object.assign(image.style, {
    left: `${g + 2 * s}px`, top: `${g + 2 * s}px`, width: `${16 * s}px`, height: `${16 * s}px`,
  });
  vehicles.forEach((b, i) => {
    at(b, CAMERA_X + (i + 2) * STEP, BY, BUTTON, BUTTON);
    insetIcon(b.querySelector<HTMLImageElement>('img')!);
  });
  at(parts.m.querySelector<HTMLButtonElement>('.hud-av')!, CX + railExtra, 2, 26, 26);
  Object.assign(parts.avPic.style, { left: `${(CX + railExtra + 4) * s}px`, top: `${6 * s}px`, width: `${18 * s}px`, height: `${18 * s}px` });
  drawAvatar();
  at(parts.heal, CX + railExtra, HY, 26, 26);
  parts.heal.style.borderRadius = '50%';
  at(parts.hp, 49 + L + railExtra, 1, 10, H - 2);
  at(parts.xp, 59 + L + railExtra, 1, 10, H - 2);
  at(parts.m.querySelector<HTMLButtonElement>('.hud-b1')!, CAMERA_X, BY, BUTTON, BUTTON);
  at(parts.m.querySelector<HTMLButtonElement>('.hud-b2')!, CAMERA_X + STEP, BY, BUTTON, BUTTON);
  // The weapon window: frame drawn in the machine picture (20×20 left of the heal button), the picture inside 16×16.
  const wx = CAMERA_X + railExtra, wy = HY + 3;
  at(parts.wpn, wx, wy, 20, 20);
  insetIcon(parts.wpnImg);
  Object.assign(parts.wcount.style, { left: `${wx * s}px`, top: `${(wy + 17) * s}px` });
  // The count stays readable however small the machine is.
  Object.assign(parts.count.style, {
    left: `${(CX + railExtra + 21) * s}px`, top: `${(HY + 18) * s}px`, minWidth: '16px', height: '14px', padding: '0 3px',
    border: '1px solid #b8893b', font: "700 11px/12px 'Pixelify Sans', monospace",
  });
  // The purse and diamonds: on a phone under the plaque; on a computer alone at the top edge, centred over the hero.
  const top = !window.matchMedia('(pointer: coarse)').matches;
  if (top && parts.money.parentElement !== root) root?.append(parts.money);
  if (!top && parts.money.parentElement !== parts.p) parts.p.insertBefore(parts.money, parts.quest);
  parts.money.classList.toggle('top', top);
  parts.money.style.top = top ? `${M}px` : '';
  const menuW = 64; // the ☰ button top left
  Object.assign(parts.p.style, { right: `${M}px`, top: `${M}px`, maxWidth: `${Math.min(320, Math.floor(window.innerWidth * 0.6), window.innerWidth - M - menuW)}px` });
  // Pickups: left of the machine on a wide screen, above it on a narrow one.
  const wide = window.innerWidth - width * s - 2 * M > 170;
  Object.assign(parts.picks.style, wide
    ? { right: `${M + width * s + 10}px`, bottom: `${M + 20 * s}px` }
    : { right: `${M}px`, bottom: `${M + H * s + 8}px` });
  draw();
}

let lastMoney = '';
export function setHud(v: HudView) {
  view = v;
  if (!parts) return;
  const money = `${v.coins}|${v.diamonds}`;
  if (money !== lastMoney) {
    lastMoney = money;
    const n = (x: number) => x.toLocaleString('pl-PL');
    parts.coins.innerHTML = `${SAKIEWKA_SVG}${n(v.coins)}`;
    parts.diamonds.innerHTML = `<img src="${BASE_URL}items/diament.png" alt="">${n(v.diamonds)}`;
    parts.coins.title = `Sakiewka: ${n(v.coins)} monet`;
    parts.diamonds.title = `Diamenty: ${n(v.diamonds)}`;
  }
  parts.count.textContent = String(v.potions > 0 ? v.potions : v.preparedFood ? v.preparedFood.n : v.fruit);
  if (v.bron.pic && !parts.wpnImg.src.endsWith(v.bron.pic)) parts.wpnImg.src = v.bron.pic;
  parts.wpnImg.style.visibility = v.bron.pic ? 'visible' : 'hidden';
  parts.wcount.textContent = v.bron.label;
  parts.wcount.classList.toggle('warn', v.bron.warn);
  parts.wpn.setAttribute('aria-label', v.bron.title);
  parts.wpn.title = v.bron.title;
  const label = v.potions > 0 ? `Wypij miksturę leczniczą (masz ${v.potions})`
    : v.preparedFood ? `Zjedz przygotowane jedzenie ${v.preparedFood.icon} (masz ${v.preparedFood.n})`
    : `Zjedz owoce, żeby się wyleczyć (masz ${v.fruit})`;
  parts.heal.setAttribute('aria-label', label);
  parts.heal.title = label;
  parts.heal.classList.toggle('low', v.hp * 2 <= v.maxHp && !v.noHeal);
  const hpPct = Math.round((100 * v.hp) / v.maxHp);
  parts.hp.setAttribute('aria-label', `Zdrowie ${hpPct}%`);
  parts.hp.title = `Zdrowie ${hpPct}%`;
  parts.xp.setAttribute('aria-label', `Doświadczenie ${Math.round(100 * v.expShare)}% do następnego poziomu`);
  parts.xp.title = parts.xp.getAttribute('aria-label')!;
  parts.town.textContent = v.town;
  parts.weather.textContent = v.weather;
  parts.detail.textContent = v.detail;
  parts.detail.style.display = v.detail ? '' : 'none';
  const q = v.quest;
  parts.quest.style.display = q ? '' : 'none';
  if (q) {
    parts.quest.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = '!';
    dot.style.background = q.color;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = q.text;
    parts.quest.append(dot, t);
    if (q.more) {
      const more = document.createElement('span');
      more.className = 'more';
      more.textContent = `+${q.more}`;
      parts.quest.append(more);
    }
    parts.quest.setAttribute('aria-label', `Bieżące zadanie: ${q.text}. Otwórz dziennik zadań`);
  }
  draw();
}

/** Liquid height in whole pixels (the spec: the level moves by whole pixels). */
const level = (share: number) => Math.round(Math.max(0, Math.min(1, share)) * TUBA);

function draw() {
  if (!ctx || !pics || !view) return;
  const v = view;
  const c = ctx;
  c.clearRect(0, 0, c.canvas.width, H);
  const ok = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
  c.save();
  c.translate(railExtra, 0);
  if (ok(pics.baza)) c.drawImage(pics.baza, 0, 0);
  const icon = v.potions > 0 ? pics.mikstura : pics.owoc;
  c.globalAlpha = v.noHeal ? 0.4 : 1;
  if (v.preparedFood && v.potions <= 0) {
    c.font = '16px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(v.preparedFood.icon, CX + 13, HY + 13);
  } else if (ok(icon)) c.drawImage(icon, 0, 0);
  c.globalAlpha = 1;
  const t = performance.now();
  const tube = (x: number, h: number, body: string, top: string, phase: number) => {
    if (h <= 0) return;
    const y = DNO - h;
    c.fillStyle = body;
    c.fillRect(x, y, 6, h);
    c.fillStyle = top;
    c.fillRect(x, y, 6, 1);
    // A bubble rising slowly through the liquid every few seconds.
    if (h > 5) {
      const k = ((t / 3600 + phase) % 1);
      const by = Math.round(DNO - 1 - k * (h - 3));
      c.fillRect(x + 2 + (Math.floor(t / 900 + phase * 7) % 2), by, 1, 1);
    }
  };
  // Life: red, with the potion's blue bonus on top (the tube holds life + bonus).
  const all = v.maxHp + v.extra;
  const red = level(v.hp / all);
  const blue = v.extra > 0 ? Math.min(TUBA - red, level((v.hp + v.extra) / all) - red) : 0;
  tube(51 + L, red, v.zatruty ? '#6a8a2a' : '#c0392b', v.zatruty ? '#a8c85a' : '#e8645a', 0);
  if (blue > 0) {
    c.fillStyle = '#3f7fd0';
    c.fillRect(51 + L, DNO - red - blue, 6, blue);
    c.fillStyle = '#9cc8ff';
    c.fillRect(51 + L, DNO - red - blue, 6, 1);
  }
  tube(61 + L, level(v.expShare), '#e0a020', '#fff1b0', 0.45);
  // Glass: a light streak and 4 marks = 5 parts (5 hearts / 5 stars) on each tube.
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(52 + L, 8, 1, TUBA - 2);
  c.fillRect(62 + L, 8, 1, TUBA - 2);
  c.fillStyle = '#1a110b';
  for (let k = 1; k < 5; k++) {
    const y = Math.round(DNO - (TUBA * k) / 5);
    c.fillRect(55 + L, y, 2, 1);
    c.fillRect(65 + L, y, 2, 1);
  }
  c.restore();
  if (railExtra > 0) drawBottomRail(c, ok(pics.baza));
}

/** Extend the original pipe and reuse its camera/quest frames, followed by the owned vehicles. */
function drawBottomRail(c: CanvasRenderingContext2D, baseLoaded: boolean) {
  const y = BY + BUTTON / 2 - 2;
  const pipe = ['#1a110b', '#e2b25a', '#b8893b', '#6b4a1f', '#1a110b'];
  pipe.forEach((color, k) => {
    c.fillStyle = color;
    c.fillRect(CAMERA_X + 2, y + k, railExtra, 1);
  });
  const vehicles = visibleVehicles();
  // Same collars as scripts/hud-maszynka.py, centred in each 8 px gap.
  for (let i = 0; i < vehicles.length + 1; i++) {
    const x = CAMERA_X + i * STEP + BUTTON + 3;
    c.fillStyle = pipe[0];
    c.fillRect(x, y - 1, 3, 7);
    c.fillStyle = pipe[1];
    c.fillRect(x + 1, y, 1, 5);
  }
  if (baseLoaded && pics) {
    for (let i = 0; i < 2; i++) {
      const x = CAMERA_X + i * STEP;
      c.drawImage(pics.baza, x, BY, BUTTON, BUTTON, x, BY, BUTTON, BUTTON);
    }
  }
  vehicles.forEach((b, n) => {
    const x = CAMERA_X + (n + 2) * STEP;
    const active = b.getAttribute('aria-pressed') === 'true';
    // The original pixel frame, including its clipped corners and lighter top/left edges.
    for (let j = 0; j < BUTTON; j++) for (let i = 0; i < BUTTON; i++) {
      const edge = Math.min(i, j, BUTTON - 1 - i, BUTTON - 1 - j);
      if (edge === 0 && (i === 0 || i === BUTTON - 1) && (j === 0 || j === BUTTON - 1)) continue;
      c.fillStyle = edge === 0 ? pipe[0]
        : edge === 1 ? (active ? '#ffe9a8' : (i === 1 || j === 1) && i < BUTTON - 2 && j < BUTTON - 2 ? pipe[1] : pipe[2])
        : active ? '#705021' : '#3d2e22';
      c.fillRect(x + i, BY + j, 1, 1);
    }
  });
}

/** The hero's picture for the avatar frame: a sprite sheet frame and the part to show (head and shoulders). */
export function setHudAvatar(src: CanvasImageSource | null, sx = 0, sy = 0, sw = 0, sh = 0) {
  avatar = src ? { src, sx, sy, sw, sh } : null;
  drawAvatar();
}

/** Paints the avatar into its own canvas at device pixels, enlarged blocky (never smoothed). */
function drawAvatar() {
  if (!parts) return;
  const cv = parts.avPic;
  const n = Math.max(1, Math.round(18 * scale * (window.devicePixelRatio || 1)));
  if (cv.width !== n) cv.width = cv.height = n;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, n, n);
  if (!avatar) return;
  g.imageSmoothingEnabled = false;
  g.drawImage(avatar.src, avatar.sx, avatar.sy, avatar.sw, avatar.sh, 0, 0, n, n);
}

/** "+1 marchewka" left of the machine for ~2 s; newer ones below, older ones fade. */
export function hudPickup(text: string, icon?: string) {
  if (!parts) return;
  const box = parts.picks;
  const el = document.createElement('div');
  el.className = 'hud-pick';
  const t = document.createElement('span');
  t.textContent = text;
  el.append(t);
  if (icon) {
    const i = document.createElement('img');
    i.src = icon;
    i.alt = '';
    el.append(i);
  }
  box.append(el);
  while (box.children.length > 5) box.firstElementChild!.remove();
  Array.from(box.children).forEach((c, i, a) => ((c as HTMLElement).style.opacity = i === a.length - 1 ? '1' : '0.55'));
  window.setTimeout(() => {
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 550);
  }, 2000);
}
