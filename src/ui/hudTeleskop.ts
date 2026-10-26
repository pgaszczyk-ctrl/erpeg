// The telescopic HUD with the glass EXP reservoir (artist 39-G004/39-G005 „zbiornik_v3.1”, owner 18 Oct 2026; test
// server with turn fights). Everything at the top left, nothing in the thumb's zone at the bottom: the hero's portrait
// inside a brass ring whose glass chamber holds the EXP liquid (its share of the chamber's area = the share of EXP to
// the next level), the level plate under it. On a phone the liquid's surface stays level with the ground while the
// phone tilts (device orientation, a little inertia). A tap on the portrait slides four round buttons out downwards,
// one from under the other like the segments of a telescope (Menu → Plecak/Kufer → Aparat → Pojazd). A tap only
// opens; a button acts on the next tap, once the column has stopped. It folds back in reverse order after 4 s idle or
// after a choice. Life is not shown: healing happens only in turn fights, which have their own panel.
// Plain HTML outside #game, so no tap on it ever reaches the joystick or the map.

const BASE = (import.meta.env.BASE_URL || '/') + 'hud/zbiornik/';

/** The artist's layout.json (CSS px from the column's top-left corner; textures are @3x). */
const L = {
  portret: 56,
  /** The level plate: a small dark-glass pill with a brass rim like the purse on the right (owner, 19 Oct 2026: the
   * number didn't fit the artist's tiny light plate and floated over it), hanging from the ring's bottom. */
  poziom: { x: 15, y: 51, w: 26, h: 14 },
  /** Hit areas 44×44 (x 6), the 36×36 picture 4 px inside, the icon 8 px inside that. Closer than the artist's layout
   * (owner, 18 Oct 2026: „odległości od kulek są za duże”): 10 px between the pictures, bridged by a pipe joint. */
  kolo: { x: 6, hit: 44, art: 36, wciecie: 4, ikona: 20, ikonaOd: 8, pierwszeY: 66, skok: 46 },
  lacznik: { x: 24, w: 8, h: 16 },
  /** Phone margin from the screen's corner (plus the safe area). */
  margines: { x: 12, y: 16 },
  start: 55,
  ruch: 120,
};
/** The reservoir texture: 168×168, centre 84, chamber radii 56–74, portrait radius 47. */
const N = 168;
const C = 84;
const RI = 56;
const RO = 74;
const RP = 47;
const CALOSC = L.start * 3 + L.ruch;
const ZWIN_PO_MS = 4000;

export type AkcjaTeleskopu = 'menu' | 'plecak' | 'aparat' | 'transport';
const AKCJE: { a: AkcjaTeleskopu; ikona: string; nazwa: string }[] = [
  { a: 'menu', ikona: 'ikona_menu', nazwa: 'Menu i ustawienia' },
  { a: 'plecak', ikona: 'ikona_plecak', nazwa: 'Plecak – postać i ekwipunek' },
  { a: 'aparat', ikona: 'ikona_aparat', nazwa: 'Aparat – zrób zdjęcie' },
  { a: 'transport', ikona: 'ikona_welocyped', nazwa: 'Pojazd' },
];

export interface TeleskopObsluga {
  akcja(a: AkcjaTeleskopu): void;
}

export interface TeleskopStan {
  expShare: number;
  poziom: number;
  /** The transport button: which picture, ridden now, or nothing to ride. */
  pojazd: { ikona: 'welocyped' | 'hulajnoga'; jedzie: boolean; brak: boolean };
}

const CSS = `
#hud-tel { position: fixed; left: calc(env(safe-area-inset-left) + var(--tel-mx)); top: calc(env(safe-area-inset-top) + var(--tel-my));
  z-index: 6; pointer-events: none; transform-origin: 0 0; width: 56px; height: 272px; }
#hud-tel.off { display: none; }
#hud-tel.dim { opacity: 0.45; }
#hud-tel.dim * { pointer-events: none !important; }
#hud-tel img, #hud-tel canvas { position: absolute; pointer-events: none; display: block; }
#hud-tel button { position: absolute; padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; pointer-events: auto;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
#hud-tel button:focus-visible { outline: 2px solid #f1e3c2; outline-offset: 1px; border-radius: 50%; }
#hud-tel .tel-kolo { width: 44px; height: 44px; }
#hud-tel .tel-kolo[data-ukryty] { pointer-events: none; visibility: hidden; }
#hud-tel .tel-kolo .tlo { left: 4px; top: 4px; width: 36px; height: 36px; }
#hud-tel .tel-kolo .ik { left: 12px; top: 12px; width: 20px; height: 20px; }
#hud-tel .tel-kolo.wcisniety .ik { top: 13px; }
#hud-tel .tel-kolo[data-brak] .ik { opacity: 0.55; }
#hud-tel .tel-lacz { position: absolute; overflow: hidden; width: 8px; }
#hud-tel .tel-lacz img { left: 0; top: 0; width: 8px; height: 16px; }
#hud-tel .tel-poziom { position: absolute; width: 26px; height: 14px; display: flex; align-items: center; justify-content: center;
  font: 800 10px/1 'Alegreya Sans', sans-serif; color: #ffe2a0; padding: 0 0 0.5px; font-variant-numeric: lining-nums tabular-nums;
  text-shadow: 0 0.5px 0 #000a; border-radius: 999px;
  background: radial-gradient(120% 140% at 50% -20%, rgba(255,226,160,0.12), transparent 60%), linear-gradient(180deg, #2e2622, #161211);
  box-shadow: 0 0 0 0.5px #2a1a0c, 0 0 0 1.5px #c9953f, 0 0 0 2px #7a5220, 0 0 0 2.5px rgba(20,12,6,0.85),
    inset 0 0.5px 0 rgba(255,236,190,0.2), inset 0 -3px 4px rgba(0,0,0,0.35), 0 1.5px 3px rgba(0,0,0,0.4); box-sizing: border-box; pointer-events: none; z-index: 21; }
body.walka-tur #hud-tel { display: none; }

/* New-controls test (walka/live.ts, owner 26 Oct 2026: „użyj tego HUD-u, tylko dodaj 2 rurki”): two thin glass tubes right
   of the portrait – life (red, a potion's bonus blue on top) and stamina (gold; mana blue with a magic weapon) – fed by a
   short brass pipe from the ring. Code-drawn until the artist's version (order 43-P001). */
#hud-tel .tel-rurki { position: absolute; left: 58px; top: 2px; width: 30px; height: 62px; pointer-events: none; display: none; }
#hud-tel.rurki .tel-rurki { display: block; }
#hud-tel .tel-rura { position: absolute; top: 4px; width: 10px; height: 52px; border-radius: 5px; overflow: hidden;
  background: linear-gradient(90deg, rgba(20,14,10,0.92), rgba(48,38,32,0.88) 45%, rgba(20,14,10,0.92));
  box-shadow: 0 0 0 1px #2a1a0c, 0 0 0 2px #c9953f, 0 0 0 2.5px #7a5220, 0 1.5px 3px rgba(0,0,0,0.45); }
#hud-tel .tel-rura i { position: absolute; left: 0; right: 0; bottom: 0; transition: height .15s linear; }
#hud-tel .tel-rura.hp i.p { background: linear-gradient(90deg, #7d0e0a, #e33a2c 45%, #ff7a64 60%, #9a150f); }
#hud-tel .tel-rura.hp.zatruty i.p { background: linear-gradient(90deg, #2f5a14, #7fc84a 45%, #b8ec84 60%, #3a6a18); }
#hud-tel .tel-rura.hp i.b { background: linear-gradient(90deg, #1d4f9c, #4aa3ff 50%, #1d4f9c); }
#hud-tel .tel-rura.st i.p { background: linear-gradient(90deg, #8a5a0c, #f0b429 45%, #ffe48a 60%, #a8700f); }
#hud-tel .tel-rura.st.mana i.p { background: linear-gradient(90deg, #1d3f8c, #3d8fe0 45%, #bfe6ff 60%, #1d4f9c); }
#hud-tel .tel-rura.st.slabo i.p { background: linear-gradient(90deg, #8e2c10, #d2552a 45%, #ffb08a 60%, #8e2c10); }
#hud-tel .tel-rura::after { content: ''; position: absolute; left: 2px; top: 3px; width: 2px; bottom: 3px; border-radius: 1px; background: rgba(255,255,255,0.28); }
#hud-tel .tel-rura .kreski { position: absolute; inset: 0; background: repeating-linear-gradient(180deg, transparent 0 9px, rgba(255,226,160,0.35) 9px 10px); }
#hud-tel .tel-czapka { position: absolute; width: 14px; height: 5px; border-radius: 2px; background: linear-gradient(180deg, #f2cf7c, #a8722a 60%, #6a4416);
  box-shadow: 0 0 0 0.5px #2a1a0c; }
#hud-tel .tel-fajka { position: absolute; left: -4px; top: 26px; width: 8px; height: 5px; background: linear-gradient(180deg, #e8c070, #9a6424 70%, #5e3a12);
  box-shadow: 0 0 0 0.5px #2a1a0c; }
/* The plaque on the right in the reservoir's style (owner, 18 Oct 2026: the pixel plates didn't fit the new HUD):
   polished brass rims, dark glass, smooth icons, round buttons from the artist's set, a pipe joint between the plates. */
body.hud-teleskop #hud { font-family: 'Alegreya Sans', sans-serif; }
body.hud-teleskop #hud .hud-plate, body.hud-teleskop #hud .hud-money, body.hud-teleskop #hud .hud-quest {
  background: radial-gradient(120% 140% at 50% -20%, rgba(255,226,160,0.10), transparent 60%),
    linear-gradient(180deg, rgba(46,38,34,0.92), rgba(22,18,17,0.92)) !important;
  border: 0 !important; border-radius: 999px !important;
  box-shadow: 0 0 0 1px #2a1a0c, 0 0 0 3px #c9953f, 0 0 0 4px #7a5220, 0 0 0 5px rgba(20,12,6,0.85),
    inset 0 1px 0 rgba(255,236,190,0.18), inset 0 -6px 10px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.35) !important;
  color: #f6e6c2; }
body.hud-teleskop #hud .hud-plate { padding: 4px 16px 4px 5px; gap: 6px; margin: 5px 5px 0 0; }
body.hud-teleskop #hud .hud-money { padding: 4px 16px 4px 10px; gap: 14px; font-size: 18px; font-weight: 800; color: #ffe2a0; margin-right: 5px; }
body.hud-teleskop #hud .hud-money img, body.hud-teleskop #hud .hud-money svg { width: 24px; height: 24px; image-rendering: auto; }
body.hud-teleskop #hud .hud-quest { padding: 3px 14px 3px 6px !important; font-size: 14px; margin-right: 5px; }
body.hud-teleskop #hud .hud-quest .dot { box-shadow: 0 0 0 1px #2a1a0c, 0 0 0 2px #c9953f; }
body.hud-teleskop #hud .hud-town { font-size: 16px; font-weight: 800; letter-spacing: 0.01em; }
body.hud-teleskop #hud .hud-weather { font-size: 14px; color: #e6cf9c; }
body.hud-teleskop #hud .hud-l2 { font-size: 12.5px; color: #cdb88c; }
body.hud-teleskop #hud .hud-compass { width: 40px; height: 40px; border: 0 !important; border-radius: 50% !important; box-shadow: none !important;
  background: url(${BASE}przycisk_normalny.png) center / 100% 100% no-repeat !important; }
body.hud-teleskop #hud .hud-compass:active { background-image: url(${BASE}przycisk_wcisniety.png) !important; }
body.hud-teleskop #hud .hud-zoom.on { background-image: url(${BASE}przycisk_aktywny.png) !important; }
body.hud-teleskop #hud .hud-compass svg { width: 22px; height: 22px; }
body.hud-teleskop #hud .hud-money:not(.top)::before, body.hud-teleskop #hud .hud-quest::before {
  right: 26px; top: -15px; width: 8px; height: 16px; background: url(${BASE}lacznik.png) center / 100% 100% no-repeat; border: 0; z-index: -1; }
body.hud-teleskop #hud .hud-money:not(.top)::after, body.hud-teleskop #hud .hud-quest::after { display: none; }
body.hud-teleskop #hud .hud-pick { font-weight: 700; border-radius: 999px; box-shadow: 0 0 0 2px #c9953f, 0 0 0 3px #2a1a0c; }
body.hud-teleskop #hud .hud-pick img { image-rendering: auto; }
@media (pointer: coarse) {
  body.hud-teleskop #hud .hud-compass { width: 34px; height: 34px; }
  body.hud-teleskop #hud .hud-compass svg { width: 19px; height: 19px; }
  body.hud-teleskop #hud .hud-town { font-size: 13.5px; }
  body.hud-teleskop #hud .hud-weather { font-size: 12px; }
  body.hud-teleskop #hud .hud-l2 { font-size: 10.5px; }
  body.hud-teleskop #hud .hud-money { font-size: 16px; padding: 3px 13px 3px 8px; }
  body.hud-teleskop #hud .hud-money img, body.hud-teleskop #hud .hud-money svg { width: 21px; height: 21px; }
  body.hud-teleskop #hud .hud-quest { font-size: 12.5px; }
}
body.hud-teleskop #test-badge { top: auto; bottom: calc(4px + env(safe-area-inset-bottom)); }
`;

let root: HTMLDivElement | null = null;
let stan: TeleskopStan | null = null;
let obsl: TeleskopObsluga | null = null;
const el: {
  kola: { b: HTMLButtonElement; tlo: HTMLImageElement; ik: HTMLImageElement }[];
  lacz: HTMLDivElement[];
  zbiornik?: HTMLCanvasElement;
  poziom?: HTMLDivElement;
  portret?: HTMLButtonElement;
} = { kola: [], lacz: [] };

/** Pictures, loaded once. */
const obrazy = new Map<string, HTMLImageElement>();
function obraz(n: string) {
  let i = obrazy.get(n);
  if (!i) {
    i = new Image();
    i.src = `${BASE}${n}.png`;
    i.addEventListener('load', () => rysujZbiornik(), { once: true });
    obrazy.set(n, i);
  }
  return i;
}
const gotowy = (n: string) => {
  const i = obraz(n);
  return i.complete && i.naturalWidth > 0;
};
function img(n: string, cls = '') {
  const i = document.createElement('img');
  i.src = `${BASE}${n}.png`;
  i.alt = '';
  i.draggable = false;
  if (cls) i.className = cls;
  return i;
}

// ------------------------------------------------------------------ the telescope's motion

/** 0 = folded, CALOSC = fully out; `kierunek` +1 opening, −1 folding, 0 still. */
let t = 0;
let kierunek: 1 | -1 | 0 = 0;
let ostatniaKlatka = 0;
let raf = 0;
let zwin = 0;
/** The time a button may act: never the tap that opened the column (owner's rule: no action from the opening touch). */
let otwartoOd = 0;
const easeOutCubic = (u: number) => 1 - (1 - u) ** 3;
const bezRuchu = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where button i's hit area stands at the telescope's time t: slides from under the one above (the portrait for the first). */
function polozenie(i: number, czas: number) {
  const u = Math.min(1, Math.max(0, (czas - i * L.start) / L.ruch));
  const cel = L.kolo.pierwszeY + i * L.kolo.skok;
  const zrodlo = i === 0 ? (L.portret - L.kolo.hit) / 2 : L.kolo.pierwszeY + (i - 1) * L.kolo.skok;
  return { y: Math.round(zrodlo + (cel - zrodlo) * easeOutCubic(u)), u };
}

function ustawKolumne() {
  const otwarta = t >= CALOSC;
  let gornyDol = L.poziom.y + L.poziom.h; // bottom of the level plate under the portrait / the picture above
  el.kola.forEach((k, i) => {
    const { y, u } = polozenie(i, t);
    k.b.style.top = `${y}px`;
    if (u > 0) k.b.removeAttribute('data-ukryty');
    else k.b.setAttribute('data-ukryty', '');
    k.b.tabIndex = otwarta ? 0 : -1;
    k.b.setAttribute('aria-hidden', String(!otwarta));
    // The pipe joint between the picture above and this one, centred in the gap with its ends under both rims; it
    // shows only while there is a gap (the buttons, drawn over it, hide the rest).
    const gora = y + L.kolo.wciecie;
    const luz = gora - gornyDol;
    const sr = (gora + gornyDol) / 2;
    Object.assign(el.lacz[i].style, { top: `${Math.round(sr - L.lacznik.h / 2)}px`, height: `${luz > 0 && u > 0 ? L.lacznik.h : 0}px` });
    gornyDol = gora + L.kolo.art;
  });
  root?.classList.toggle('otwarta', otwarta);
  el.portret?.setAttribute('aria-expanded', String(t > 0 && kierunek !== -1));
}

function klatka(teraz: number) {
  const dt = Math.min(50, teraz - ostatniaKlatka);
  ostatniaKlatka = teraz;
  t = Math.min(CALOSC, Math.max(0, t + kierunek * dt));
  ustawKolumne();
  if ((kierunek === 1 && t >= CALOSC) || (kierunek === -1 && t <= 0)) {
    kierunek = 0;
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(klatka);
}

function rusz(k: 1 | -1) {
  kierunek = k;
  if (bezRuchu()) {
    t = k === 1 ? CALOSC : 0;
    kierunek = 0;
    ustawKolumne();
    return;
  }
  if (!raf) {
    ostatniaKlatka = performance.now();
    raf = requestAnimationFrame(klatka);
  }
}

function odliczZwiniecie() {
  window.clearTimeout(zwin);
  zwin = window.setTimeout(() => zwinTeleskop(), ZWIN_PO_MS);
}

export function rozwinTeleskop() {
  otwartoOd = performance.now() + 60;
  rusz(1);
  odliczZwiniecie();
}

export function zwinTeleskop() {
  window.clearTimeout(zwin);
  if (t > 0) rusz(-1);
}

const rozwiniety = () => (t > 0 && kierunek !== -1) || kierunek === 1;

// ------------------------------------------------------------------ the liquid's tilt (phones only)

/** The surface's angle on screen (degrees), smoothed with a little inertia, and where the sensors want it. */
let kat = 0;
let katCel = 0;
let katV = 0;
let katRaf = 0;
let katOstatni = 0;
let czujnikiOn = false;
let narysowanyKat = NaN;

const telefon = () => window.matchMedia('(pointer: coarse)').matches;

/** Device orientation → the down vector in screen axes (x right, y down) → the liquid surface's angle. */
function naOrientacje(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  const b = (e.beta * Math.PI) / 180;
  const g = (e.gamma * Math.PI) / 180;
  // Earth's down in the device's natural screen axes.
  let gx = Math.sin(g) * Math.cos(b);
  let gy = Math.sin(b);
  // Lying flat: no clear down on the screen – keep the last angle.
  if (Math.hypot(gx, gy) < 0.25) return;
  const a = (((screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number) * Math.PI) / 180;
  [gx, gy] = [gx * Math.cos(a) - gy * Math.sin(a), gx * Math.sin(a) + gy * Math.cos(a)];
  katCel = Math.max(-90, Math.min(90, (Math.atan2(-gx, gy) * 180) / Math.PI));
  if (!katRaf) {
    katOstatni = performance.now();
    katRaf = requestAnimationFrame(krokKata);
  }
}

/** A damped spring towards the sensors' angle; stops when settled. */
function krokKata(teraz: number) {
  const dt = Math.min(0.05, (teraz - katOstatni) / 1000);
  katOstatni = teraz;
  katV += ((katCel - kat) * 60 - katV * 9) * dt;
  kat += katV * dt;
  if (Math.abs(kat - narysowanyKat) > 0.4) rysujZbiornik();
  if (Math.abs(katCel - kat) < 0.3 && Math.abs(katV) < 0.5) {
    kat = katCel;
    katV = 0;
    katRaf = 0;
    rysujZbiornik();
    return;
  }
  katRaf = requestAnimationFrame(krokKata);
}

function wlaczCzujniki() {
  if (czujnikiOn || !telefon() || bezRuchu() || !('DeviceOrientationEvent' in window)) return;
  czujnikiOn = true;
  window.addEventListener('deviceorientation', naOrientacje);
}

function wylaczCzujniki() {
  window.removeEventListener('deviceorientation', naOrientacje);
  czujnikiOn = false;
  if (katRaf) cancelAnimationFrame(katRaf);
  katRaf = 0;
}

/** iPhones ask first, and only from a tap: the first tap on the portrait asks once (a refusal = a level surface). */
let pytano = false;
function zapytajOCzujniki() {
  if (pytano || !telefon() || bezRuchu()) return;
  pytano = true;
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (D?.requestPermission) D.requestPermission().then((s) => s === 'granted' && (czujnikiOn = false, wlaczCzujniki())).catch(() => {});
}

// ------------------------------------------------------------------ building it

export function zamontujTeleskop(on: TeleskopObsluga) {
  odmontujTeleskop();
  obsl = on;
  if (!document.getElementById('hud-tel-css')) {
    const st = document.createElement('style');
    st.id = 'hud-tel-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  document.body.classList.add('hud-teleskop');
  root = document.createElement('div');
  root.id = 'hud-tel';
  const stop = (b: HTMLElement) => b.addEventListener('pointerdown', (e) => e.stopPropagation());
  // Joints first (behind the buttons), then the buttons, each upper one over the one sliding out from under it.
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'tel-lacz';
    d.style.left = `${L.lacznik.x}px`;
    d.append(img('lacznik'));
    el.lacz.push(d);
  }
  root.append(...el.lacz);
  el.kola = AKCJE.map((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tel-kolo';
    b.setAttribute('aria-label', a.nazwa);
    b.title = a.nazwa;
    b.style.left = `${L.kolo.x}px`;
    b.style.zIndex = String(10 - i);
    const tlo = img('przycisk_normalny', 'tlo');
    const ik = img(a.ikona, 'ik');
    b.append(tlo, ik);
    stop(b);
    b.addEventListener('pointerdown', () => {
      if (b.dataset.brak === undefined) {
        b.classList.add('wcisniety');
        tlo.src = `${BASE}przycisk_wcisniety.png`;
      }
    });
    const pusc = () => {
      b.classList.remove('wcisniety');
      odswiezKola();
    };
    b.addEventListener('pointerup', pusc);
    b.addEventListener('pointerleave', pusc);
    b.addEventListener('pointercancel', pusc);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (t < CALOSC || kierunek !== 0 || performance.now() < otwartoOd) return;
      zwinTeleskop();
      obsl?.akcja(a.a);
    });
    return { b, tlo, ik };
  });
  root.append(...el.kola.map((k) => k.b));

  // The portrait with its reservoir: one canvas, drawn from the artist's layers.
  const p = document.createElement('button');
  p.type = 'button';
  p.className = 'tel-portret';
  Object.assign(p.style, { left: '0px', top: '0px', width: `${L.portret}px`, height: `${L.portret}px`, zIndex: '20', borderRadius: '50%' });
  p.setAttribute('aria-label', 'Menu postaci');
  p.title = 'Menu postaci';
  p.setAttribute('aria-expanded', 'false');
  const zb = document.createElement('canvas');
  Object.assign(zb.style, { left: '0px', top: '0px', width: `${L.portret}px`, height: `${L.portret}px` });
  el.zbiornik = zb;
  p.append(zb);
  stop(p);
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    zapytajOCzujniki();
    if (rozwiniety()) zwinTeleskop();
    else rozwinTeleskop();
  });
  el.portret = p;

  const poz = document.createElement('div');
  poz.className = 'tel-poziom';
  poz.style.left = `${L.poziom.x}px`;
  poz.style.top = `${L.poziom.y}px`;
  el.poziom = poz;

  root.append(p, poz);
  document.body.append(root);
  root.addEventListener('pointerdown', () => { if (rozwiniety()) odliczZwiniecie(); });
  for (const n of WARSTWY) obraz(n);
  for (const n of ['przycisk_wcisniety', 'przycisk_aktywny', 'przycisk_niedostepny', 'ikona_hulajnoga']) obraz(n);
  t = 0;
  kierunek = 0;
  ustawKolumne();
  uklad();
  window.addEventListener('resize', uklad);
  wlaczCzujniki();
  if (stan) ustawTeleskop(stan);
  rysujZbiornik();
}

// ------------------------------------------------------------------ the two tubes (new-controls test)

const rurki: { hp?: HTMLDivElement; st?: HTMLDivElement; hpP?: HTMLElement; hpB?: HTMLElement; stP?: HTMLElement } = {};

function zbudujRurki() {
  if (!root || rurki.hp) return;
  const box = document.createElement('div');
  box.className = 'tel-rurki';
  const rura = (cls: string, x: number, tytul: string) => {
    const r = document.createElement('div');
    r.className = `tel-rura ${cls}`;
    r.style.left = `${x}px`;
    r.title = tytul;
    const p = document.createElement('i');
    p.className = 'p';
    const b = document.createElement('i');
    b.className = 'b';
    const k = document.createElement('span');
    k.className = 'kreski';
    r.append(p, b, k);
    const czapka = (top: number) => {
      const c = document.createElement('div');
      c.className = 'tel-czapka';
      Object.assign(c.style, { left: `${x - 2}px`, top: `${top}px` });
      return c;
    };
    box.append(czapka(1), czapka(54));
    box.append(r);
    return { r, p, b };
  };
  const fajka = document.createElement('div');
  fajka.className = 'tel-fajka';
  box.append(fajka);
  const fajka2 = document.createElement('div');
  fajka2.className = 'tel-fajka';
  Object.assign(fajka2.style, { left: '10px', width: '6px' });
  box.append(fajka2);
  const h = rura('hp', 2, 'Życie');
  const st = rura('st', 16, 'Siły');
  rurki.hp = h.r;
  rurki.hpP = h.p;
  rurki.hpB = h.b;
  rurki.st = st.r;
  rurki.stP = st.p;
  root.append(box);
}

/** Shows the two tubes (life, stamina/mana) beside the portrait. */
export function teleskopRurki(on: boolean) {
  if (!root) return;
  if (on) zbudujRurki();
  root.classList.toggle('rurki', on);
}

/** Fills the tubes: `hp`/`extra` in half-hearts of `hpMax`; stamina or mana `s` of `sMax`. Missing parts stay. */
export function ustawRurki(v: { hp?: number; hpMax?: number; extra?: number; zatruty?: boolean; s?: number; sMax?: number; mana?: boolean; slabo?: boolean }) {
  if (!rurki.hp) return;
  if (v.hp !== undefined && v.hpMax) {
    const f = Math.max(0, Math.min(1, v.hp / v.hpMax));
    const e = Math.max(0, Math.min(1 - f, (v.extra ?? 0) / v.hpMax));
    rurki.hpP!.style.height = `${f * 100}%`;
    Object.assign(rurki.hpB!.style, { bottom: `${f * 100}%`, height: `${e * 100}%` });
    rurki.hp.classList.toggle('zatruty', !!v.zatruty);
    rurki.hp.title = `Życie ${Math.round((v.hp / 2) * 10) / 10} / ${v.hpMax / 2}`;
  }
  if (v.s !== undefined && v.sMax) {
    rurki.stP!.style.height = `${Math.max(0, Math.min(1, v.s / v.sMax)) * 100}%`;
    rurki.st!.classList.toggle('mana', !!v.mana);
    rurki.st!.classList.toggle('slabo', !v.mana && !!v.slabo);
    rurki.st!.title = `${v.mana ? 'Mana' : 'Siły'} ${Math.round(v.s)} / ${Math.round(v.sMax)}`;
  }
}

export function odmontujTeleskop() {
  rurki.hp = rurki.st = undefined;
  window.removeEventListener('resize', uklad);
  window.clearTimeout(zwin);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  wylaczCzujniki();
  root?.remove();
  root = null;
  el.kola = [];
  el.lacz = [];
  el.zbiornik = undefined;
  document.body.classList.remove('hud-teleskop');
}

/** Phone ×1, computer ×2 … ×3 by the window's height (owner, 19 Oct 2026: „na komputerze może być większe”;
 * the @3x pictures stay smooth at any of these). */
let skala = 1;
function uklad() {
  if (!root) return;
  skala = telefon() || window.innerHeight < 560 ? 1 : Math.min(3, Math.max(2, Math.round(window.innerHeight / 330 * 4) / 4));
  root.style.setProperty('--tel-mx', `${L.margines.x}px`);
  root.style.setProperty('--tel-my', `${L.margines.y}px`);
  root.style.transform = skala === 1 ? '' : `scale(${skala})`;
  rysujZbiornik();
}

export const szerokoscTeleskopu = () => (root ? root.getBoundingClientRect().right : 0);

export function teleskopWidoczny(tryb: 'on' | 'dim' | 'off') {
  root?.classList.toggle('off', tryb === 'off');
  root?.classList.toggle('dim', tryb === 'dim');
  if (tryb !== 'on') zwinTeleskop();
}

// ------------------------------------------------------------------ the reservoir (artist's renderer.js, in TypeScript)

const WARSTWY = ['portret_oprawa', 'portret_maska', 'zbiornik_tlo', 'zbiornik_maska', 'zbiornik_plyn', 'zbiornik_szklo', 'zbiornik_tafla'];

function kolkoPod(r: number, h: number) {
  if (h <= -r) return Math.PI * r * r;
  if (h >= r) return 0;
  return r * r * Math.acos(h / r) - h * Math.sqrt(Math.max(0, r * r - h * h));
}

/** The surface's distance from the centre (along the tilted vertical) that leaves `p` of the chamber's area under it. */
function wysokoscTafli(p: number) {
  if (p <= 0) return RO + 1;
  if (p >= 1) return -RO - 1;
  const cel = p * Math.PI * (RO * RO - RI * RI);
  let lo = -RO;
  let hi = RO;
  for (let i = 0; i < 32; i++) {
    const m = (lo + hi) / 2;
    if (kolkoPod(RO, m) - kolkoPod(RI, m) > cel) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

const plotno = () => {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  return c;
};
let warstwy: { out: HTMLCanvasElement; ciecz: HTMLCanvasElement; twarz: HTMLCanvasElement } | null = null;

/** Portrait under its mask, the empty chamber, the liquid cut by the chamber and the tilted surface, glass, frame. */
function rysujZbiornik() {
  const c = el.zbiornik;
  if (!c || !stan) return;
  if (!WARSTWY.every(gotowy)) return;
  warstwy ??= { out: plotno(), ciecz: plotno(), twarz: plotno() };
  const { out, ciecz, twarz } = warstwy;
  const oc = out.getContext('2d')!;
  const lc = ciecz.getContext('2d')!;
  const fc = twarz.getContext('2d')!;
  const p = Math.min(1, Math.max(0, stan.expShare || 0));
  const h = wysokoscTafli(p);
  const a = (kat * Math.PI) / 180;
  narysowanyKat = kat;
  oc.clearRect(0, 0, N, N);
  // The face.
  fc.globalCompositeOperation = 'source-over';
  fc.clearRect(0, 0, N, N);
  fc.fillStyle = '#3a2c22';
  fc.fillRect(C - RP, C - RP, RP * 2, RP * 2);
  if (portretObraz) {
    fc.imageSmoothingEnabled = true;
    fc.imageSmoothingQuality = 'high';
    fc.drawImage(portretObraz, C - RP, C - RP, RP * 2, RP * 2);
  } else if (glowa) {
    fc.imageSmoothingEnabled = false;
    fc.drawImage(glowa[0], glowa[1], glowa[2], glowa[3], glowa[4], C - RP, C - RP, RP * 2, RP * 2);
  }
  fc.globalCompositeOperation = 'destination-in';
  fc.drawImage(obraz('portret_maska'), 0, 0);
  fc.globalCompositeOperation = 'source-over';
  oc.drawImage(twarz, 0, 0);
  oc.drawImage(obraz('zbiornik_tlo'), 0, 0);
  // The liquid.
  if (p > 0) {
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, N, N);
    lc.save();
    lc.translate(C, C);
    lc.rotate(a);
    lc.beginPath();
    lc.rect(-N * 2, h, N * 4, N * 4);
    lc.clip();
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.drawImage(obraz('zbiornik_plyn'), 0, 0);
    lc.restore();
    if (p < 1) {
      lc.save();
      lc.translate(C, C);
      lc.rotate(a);
      lc.drawImage(obraz('zbiornik_tafla'), -N / 2, h - 4.5);
      lc.restore();
    }
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(obraz('zbiornik_maska'), 0, 0);
    lc.globalCompositeOperation = 'source-over';
    oc.drawImage(ciecz, 0, 0);
  }
  oc.drawImage(obraz('zbiornik_szklo'), 0, 0);
  oc.drawImage(obraz('portret_oprawa'), 0, 0);
  // Onto the screen at device pixels.
  const d = Math.max(1, Math.min(3, Math.round((window.devicePixelRatio || 1) * skala)));
  const w = L.portret * d;
  if (c.width !== w) c.width = c.height = w;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, w);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(out, 0, 0, w, w);
}

// ------------------------------------------------------------------ what it shows

let ostatniPoziom = 0;
let ostatnieKola = '';
let ostatniExp = -1;

function odswiezKola() {
  if (!stan) return;
  const v = stan.pojazd;
  const k = el.kola[3];
  if (!k) return;
  k.ik.src = `${BASE}ikona_${v.ikona}.png`;
  if (v.brak) k.b.dataset.brak = '';
  else delete k.b.dataset.brak;
  const nazwa = v.brak ? 'Nie masz pojazdu' : v.jedzie ? `Zsiądź z ${v.ikona === 'welocyped' ? 'roweru' : 'hulajnogi'}` : `Wsiądź na ${v.ikona === 'welocyped' ? 'rower' : 'hulajnogę'}`;
  k.b.setAttribute('aria-label', nazwa);
  k.b.title = nazwa;
  for (const [i, x] of el.kola.entries()) {
    if (x.b.classList.contains('wcisniety')) continue;
    const plik = i === 3 ? (v.brak ? 'przycisk_niedostepny' : v.jedzie ? 'przycisk_aktywny' : 'przycisk_normalny') : 'przycisk_normalny';
    if (!x.tlo.src.endsWith(`${plik}.png`)) x.tlo.src = `${BASE}${plik}.png`;
  }
}

export function ustawTeleskop(v: TeleskopStan) {
  stan = v;
  if (!root) return;
  ostatniPoziom = v.poziom;
  if (el.poziom && el.poziom.textContent !== String(v.poziom)) el.poziom.textContent = String(v.poziom);
  if (Math.abs(v.expShare - ostatniExp) > 0.001) {
    ostatniExp = v.expShare;
    rysujZbiornik();
  }
  const klucz = `${v.pojazd.ikona}|${v.pojazd.jedzie}|${v.pojazd.brak}`;
  if (klucz !== ostatnieKola) {
    ostatnieKola = klucz;
    odswiezKola();
  }
}

/** The hero's painted portrait (public/portrety/bohater_NN.webp); while it is missing or loading, the sheet's head. */
let portretUrl: string | null = null;
let portretObraz: HTMLImageElement | null = null;
let glowa: [CanvasImageSource, number, number, number, number] | null = null;

export function teleskopPortret(url: string | null) {
  if (url === portretUrl) return;
  portretUrl = url;
  portretObraz = null;
  if (!url) return rysujZbiornik();
  const i = new Image();
  i.onload = () => {
    if (portretUrl !== url) return;
    portretObraz = i;
    rysujZbiornik();
  };
  i.src = url;
}

export function teleskopAwatar(src: CanvasImageSource | null, sx: number, sy: number, sw: number, sh: number) {
  glowa = src ? [src, sx, sy, sw, sh] : null;
  rysujZbiornik();
}

/** For tests: the column's time and buttons, the liquid's angle and level. */
export const teleskopStan = () => ({
  t, kierunek, otwarta: t >= CALOSC, kat, poziom: ostatniPoziom, portret: !!portretObraz,
  kola: el.kola.map((k) => ({ top: k.b.style.top, ukryty: k.b.hasAttribute('data-ukryty') })),
  /** Tests: the reservoir's picture. */
  obraz: () => el.zbiornik?.toDataURL() ?? '',
  /** Tests on a desktop: pretend the phone is tilted (degrees of the surface on screen). */
  przechyl: (st: number) => { katCel = st; if (!katRaf) { katOstatni = performance.now(); katRaf = requestAnimationFrame(krokKata); } },
});
(window as unknown as { __teleskop?: typeof teleskopStan }).__teleskop = teleskopStan;

// ------------------------------------------------------------------ smooth icons for the plaque on the right

/** A folded paper map with a dotted route and a red cross. */
export const MAPA_GLADKA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.2l6-2.2 6 2.2 6-2.2v13.8l-6 2.2-6-2.2-6 2.2z" fill="#f3e6c4" stroke="#3a2614" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 4v13.8M15 6.2V20" stroke="#b39566" stroke-width="1.1"/><path d="M4.8 15.5c2-1.3 3.3-4.6 6-3.6s3.4 3.2 6.1.2" fill="none" stroke="#9a5a2a" stroke-width="1.2" stroke-dasharray="1.8 1.4" stroke-linecap="round"/><path d="M17 8.4l2.4 2.4m0-2.4L17 10.8" stroke="#c0392b" stroke-width="1.5" stroke-linecap="round"/></svg>`;

/** A brass magnifier: „+” off, „−” on. */
export const lupaGladka = (on: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.6 14.6l6 6" stroke="#3a2614" stroke-width="4.4" stroke-linecap="round"/><path d="M14.6 14.6l6 6" stroke="#8a5a26" stroke-width="2.6" stroke-linecap="round"/><circle cx="10" cy="10" r="6.4" fill="rgba(190,225,245,0.55)" stroke="#3a2614" stroke-width="2.2"/><circle cx="10" cy="10" r="6.4" fill="none" stroke="#e0b056" stroke-width="1"/><path d="M7 10h6${on ? '' : 'M10 7v6'}" stroke="#2a1a0c" stroke-width="1.8" stroke-linecap="round"/><path d="M6.6 7.6a4 4 0 0 1 2.4-2.2" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.1" stroke-linecap="round"/></svg>`;

/** A leather purse tied with a gold cord. */
export const SAKIEWKA_GLADKA = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="tel-sak" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#c08850"/><stop offset="1" stop-color="#6e4220"/></radialGradient></defs><path d="M8.2 3.4h7.6l-2.2 4.2h-3.2z" fill="#8a5a2b" stroke="#2a1a0c" stroke-width="1.1" stroke-linejoin="round"/><path d="M10 8.2c-5 1.8-7.4 6-6.4 9.4.8 2.8 4 3.6 8.4 3.6s7.6-.8 8.4-3.6c1-3.4-1.4-7.6-6.4-9.4z" fill="url(#tel-sak)" stroke="#2a1a0c" stroke-width="1.2"/><path d="M8.6 8.2h6.8" stroke="#e8bd62" stroke-width="2" stroke-linecap="round"/><path d="M7.4 13.2c.6-1.6 1.8-2.6 3-3" fill="none" stroke="#e7b77a" stroke-opacity="0.7" stroke-width="1.1" stroke-linecap="round"/></svg>`;

/** A cut diamond. */
export const DIAMENT_GLADKI = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 4h11.6l4 5.2L12 21 2.2 9.2z" fill="#8fe3f6" stroke="#174a5c" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.2 9.2h19.6M8.6 4L7 9.2 12 21l5-11.8L15.4 4M7 9.2L12 4l5 5.2" fill="none" stroke="#2c86a0" stroke-width="0.9" stroke-linejoin="round"/><path d="M7 9.2L12 4 8.6 4z" fill="#d8f8ff"/></svg>`;

// ------------------------------------------------------------------ the face for the coin (ui/monetaPortretu.ts)

/** Where the portrait's face is on screen and a copy of it (null while the telescope isn't shown). */
export function twarzTeleskopu(): { rect: DOMRect; twarz: HTMLCanvasElement | null; prawo?: number } | null {
  const p = el.portret;
  if (!root || !p || root.classList.contains('off')) return null;
  const r = p.getBoundingClientRect();
  if (!r.width) return null;
  const k = r.width / N;
  const rect = new DOMRect(r.left + (C - RP) * k, r.top + (C - RP) * k, RP * 2 * k, RP * 2 * k);
  let twarz: HTMLCanvasElement | null = null;
  if (warstwy) {
    twarz = document.createElement('canvas');
    twarz.width = twarz.height = RP * 2;
    twarz.getContext('2d')!.drawImage(warstwy.twarz, C - RP, C - RP, RP * 2, RP * 2, 0, 0, RP * 2, RP * 2);
  }
  // The note goes right of the whole column, tubes included.
  let prawo = r.right;
  for (const e of root.querySelectorAll('.tel-rurki *')) prawo = Math.max(prawo, (e as HTMLElement).getBoundingClientRect().right);
  return { rect, twarz, prawo };
}
