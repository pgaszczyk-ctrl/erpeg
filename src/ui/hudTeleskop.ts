// The telescopic HUD (artist 39-G002 „teleskop_v2”, owner 18 Oct 2026; test server with turn fights).
// Everything at the top left, nothing in the thumb's zone at the bottom: the hero's portrait with the EXP tube and the
// level plate; a tap on the portrait slides four round buttons out downwards, one from under the other like the
// segments of a telescope (Menu → Dziennik → Aparat → Transport), each pulled out by a short rigid rod. A tap only
// opens; a button acts on the next tap, once the column has stopped. It folds back in reverse order after 4 s idle or
// after a choice. Life is not shown while walking (turn fights have their own panel): only while hurt a small red tube
// under the EXP one appears, and a tap on it heals.
// Plain HTML outside #game, so no tap on it ever reaches the joystick or the map.

const BASE = (import.meta.env.BASE_URL || '/') + 'hud/teleskop/';

/** The artist's layout (layout.json), in phone CSS px from the portrait's top-left corner. */
const L = {
  portret: { x: 0, y: 0, w: 52, okno: 36 },
  exp: { x: 60, y: 8, w: 104, h: 16, fx: 68, fy: 12, fw: 88, fh: 8 },
  poziom: { x: 60, y: 30, w: 28, h: 14 },
  /** The life tube (only while hurt): the EXP tube's pictures, recoloured red, under the level plate. */
  zycie: { x: 60, y: 48 },
  kolo: { x: 4, w: 44, ikona: 10, pierwszeY: 60, skok: 52 },
  lacznik: { x: 20, w: 12, h: 8 },
  zaslepka: { x: 20, y: 52, w: 12, h: 6 },
  /** Phone margin from the screen's corner (plus the safe area). */
  margines: { x: 12, y: 20 },
  /** Starts of the four buttons, each one's travel and the whole opening (ms). */
  start: 55,
  ruch: 120,
};
const CALOSC = L.start * 3 + L.ruch;
const ZWIN_PO_MS = 4000;

export type AkcjaTeleskopu = 'menu' | 'dziennik' | 'aparat' | 'transport';
const AKCJE: { a: AkcjaTeleskopu; ikona: string; nazwa: string }[] = [
  { a: 'menu', ikona: 'D_menu', nazwa: 'Menu i Kufer' },
  { a: 'dziennik', ikona: 'D_dziennik', nazwa: 'Dziennik zadań' },
  { a: 'aparat', ikona: 'D_aparat', nazwa: 'Aparat – zrób zdjęcie' },
  { a: 'transport', ikona: 'D_welocyped', nazwa: 'Pojazd' },
];

export interface TeleskopObsluga {
  akcja(a: AkcjaTeleskopu): void;
  /** Tap on the life tube. */
  lecz(): void;
}

export interface TeleskopStan {
  expShare: number;
  poziom: number;
  hp: number;
  maxHp: number;
  extra: number;
  zatruty?: boolean;
  /** Nothing to heal with (the life tube is dimmed). */
  bezLeczenia: boolean;
  /** Potions or fruit portions left for the badge on the life tube. */
  leczen: number;
  /** The transport button: which picture, ridden now, or nothing to ride. */
  pojazd: { ikona: 'welocyped' | 'hulajnoga'; jedzie: boolean; brak: boolean };
}

const CSS = `
#hud-tel { position: fixed; left: calc(env(safe-area-inset-left) + var(--tel-mx)); top: calc(env(safe-area-inset-top) + var(--tel-my));
  z-index: 6; pointer-events: none; transform-origin: 0 0; width: 164px; height: 260px; }
#hud-tel.off { display: none; }
#hud-tel.dim { opacity: 0.45; }
#hud-tel.dim * { pointer-events: none !important; }
#hud-tel img, #hud-tel canvas { position: absolute; image-rendering: pixelated; image-rendering: crisp-edges; pointer-events: none; display: block; }
#hud-tel button { position: absolute; padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; pointer-events: auto;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
#hud-tel button:focus-visible { outline: 2px solid #f1e3c2; outline-offset: 1px; border-radius: 50%; }
#hud-tel .tel-kolo { width: 44px; height: 44px; }
#hud-tel .tel-kolo[data-ukryty] { pointer-events: none; visibility: hidden; }
#hud-tel .tel-kolo img { left: 0; top: 0; }
#hud-tel .tel-kolo .ik { left: 10px; top: 10px; }
#hud-tel .tel-kolo.wcisniety .ik { top: 11px; }
#hud-tel .tel-lacz { overflow: hidden; width: 12px; }
#hud-tel .tel-lacz img { left: 0; top: 0; }
#hud-tel .tel-poziom { position: absolute; width: 28px; height: 14px; display: flex; align-items: center; justify-content: center;
  font: 700 10px/1 'Pixelify Sans', monospace; color: #f3dfb0; text-shadow: 0 1px 0 #1e1a24; pointer-events: none; }
#hud-tel .tel-zycie { width: 104px; height: 16px; }
#hud-tel .tel-zycie[hidden] { display: none; }
#hud-tel .tel-zycie.pusto { opacity: 0.6; }
#hud-tel .tel-zycie.nisko .tel-ciecz { animation: tel-puls 0.9s ease-in-out infinite; }
@keyframes tel-puls { 50% { filter: brightness(1.45); } }
#hud-tel .tel-licz { position: absolute; left: 106px; top: 1px; min-width: 14px; height: 14px; padding: 0 3px; box-sizing: border-box; background: #1a110b;
  border: 1px solid #b8893b; color: #f1e3c2; font: 700 10px/12px 'Pixelify Sans', monospace; text-align: center; pointer-events: none; }
body.walka-tur #hud-tel { display: none; }
body.hud-teleskop #test-badge { top: auto; bottom: calc(4px + env(safe-area-inset-bottom)); }
`;

let root: HTMLDivElement | null = null;
let stan: TeleskopStan | null = null;
let obsl: TeleskopObsluga | null = null;
const el: {
  kola: { b: HTMLButtonElement; tlo: HTMLImageElement; ik: HTMLImageElement }[];
  lacz: HTMLDivElement[];
  zaslepka?: HTMLImageElement;
  expFill?: HTMLCanvasElement;
  poziom?: HTMLDivElement;
  awans?: HTMLImageElement;
  av?: HTMLCanvasElement;
  zycie?: HTMLButtonElement;
  zycieFill?: HTMLCanvasElement;
  zycieLicz?: HTMLDivElement;
  portret?: HTMLButtonElement;
} = { kola: [], lacz: [] };

/** Pictures, loaded once. */
const obrazy = new Map<string, HTMLImageElement>();
function obraz(n: string) {
  let i = obrazy.get(n);
  if (!i) {
    i = new Image();
    i.src = `${BASE}${n}.png`;
    obrazy.set(n, i);
  }
  return i;
}
function img(n: string, x: number, y: number) {
  const i = document.createElement('img');
  i.src = `${BASE}${n}.png`;
  i.alt = '';
  i.draggable = false;
  Object.assign(i.style, { left: `${x}px`, top: `${y}px` });
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

/** Where button i stands at the telescope's time t: slides from under the one above (the portrait for the first). */
function polozenie(i: number, czas: number) {
  const u = Math.min(1, Math.max(0, (czas - i * L.start) / L.ruch));
  const cel = L.kolo.pierwszeY + i * L.kolo.skok;
  // Hidden start: centred under the element above (portrait centre for the first one).
  const zrodlo = i === 0 ? L.portret.w / 2 - L.kolo.w / 2 : L.kolo.pierwszeY + (i - 1) * L.kolo.skok;
  return { y: Math.round(zrodlo + (cel - zrodlo) * easeOutCubic(u)), u };
}

function ustawKolumne() {
  const otwarta = t >= CALOSC;
  let gornyDol = L.portret.w; // bottom of the portrait / the button above
  el.kola.forEach((k, i) => {
    const { y, u } = polozenie(i, t);
    k.b.style.top = `${y}px`;
    const widac = u > 0;
    if (widac) k.b.removeAttribute('data-ukryty');
    else k.b.setAttribute('data-ukryty', '');
    // Taps only once the column has stopped.
    k.b.tabIndex = otwarta ? 0 : -1;
    k.b.setAttribute('aria-hidden', String(!otwarta));
    // The rod between the one above and this one: as long as the gap it bridges (pulled out with the button).
    const lacz = el.lacz[i];
    const h = Math.max(0, Math.min(L.lacznik.h, y - gornyDol));
    Object.assign(lacz.style, { top: `${gornyDol}px`, height: `${h}px` });
    gornyDol = y + L.kolo.w;
  });
  // The cap under the portrait shows only while folded (the first rod takes its place).
  if (el.zaslepka) el.zaslepka.style.visibility = t <= 0 ? 'visible' : 'hidden';
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

/** Open or opening = true. */
const rozwiniety = () => (t > 0 && kierunek !== -1) || kierunek === 1;

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
  const stop = (b: HTMLElement) => {
    // pointerdown, not click: the game's own touch handling must never see it.
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
  };
  // Rods first (drawn behind the buttons), then the buttons from the bottom one up, so each upper one covers the one
  // sliding out from under it; the portrait last, on top of the first.
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'tel-lacz';
    d.style.left = `${L.lacznik.x}px`;
    d.append(img('E_lacznik_12x8', 0, 0));
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
    const tlo = img('C_normalny', 0, 0);
    const ik = img(a.ikona, L.kolo.ikona, L.kolo.ikona);
    ik.className = 'ik';
    b.append(tlo, ik);
    stop(b);
    b.addEventListener('pointerdown', () => {
      if (b.dataset.brak === undefined) {
        b.classList.add('wcisniety');
        tlo.src = `${BASE}C_wcisniety.png`;
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
      // Only a fully open column acts, and never on the touch that opened it.
      if (t < CALOSC || kierunek !== 0 || performance.now() < otwartoOd) return;
      zwinTeleskop();
      obsl?.akcja(a.a);
    });
    return { b, tlo, ik };
  });
  root.append(...el.kola.map((k) => k.b));
  el.zaslepka = img('E_zaslepka_12x6', L.zaslepka.x, L.zaslepka.y);
  root.append(el.zaslepka);

  // The portrait: the face (drawn by the game) in the window, the frame over it, the level-up glint over that.
  const p = document.createElement('button');
  p.type = 'button';
  p.className = 'tel-portret';
  Object.assign(p.style, { left: '0px', top: '0px', width: `${L.portret.w}px`, height: `${L.portret.w}px`, zIndex: '20', borderRadius: '50%' });
  p.setAttribute('aria-label', 'Menu postaci');
  p.title = 'Menu postaci';
  p.setAttribute('aria-expanded', 'false');
  const av = document.createElement('canvas');
  const o = (L.portret.w - L.portret.okno) / 2;
  Object.assign(av.style, { left: `${o}px`, top: `${o}px`, width: `${L.portret.okno}px`, height: `${L.portret.okno}px`, borderRadius: '50%' });
  el.av = av;
  const awans = img('A_awans_1', 0, 0);
  awans.style.visibility = 'hidden';
  el.awans = awans;
  p.append(av, img('A_portret_oprawa', 0, 0), awans);
  stop(p);
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    if (rozwiniety()) zwinTeleskop();
    else rozwinTeleskop();
  });
  el.portret = p;

  // EXP: the empty tube, the fill cut to the progress (never stretched), the level plate with the game's digits.
  const exp = img('A_exp_obudowa', L.exp.x, L.exp.y);
  const fill = document.createElement('canvas');
  fill.width = L.exp.fw;
  fill.height = L.exp.fh;
  Object.assign(fill.style, { left: `${L.exp.fx}px`, top: `${L.exp.fy}px`, width: `${L.exp.fw}px`, height: `${L.exp.fh}px` });
  el.expFill = fill;
  const poz = document.createElement('div');
  poz.className = 'tel-poziom';
  poz.style.left = `${L.poziom.x}px`;
  poz.style.top = `${L.poziom.y}px`;
  const pozImg = img('A_poziom_pusty', L.poziom.x, L.poziom.y);
  el.poziom = poz;

  // Life (only while hurt): the same tube in red; a tap heals.
  const zy = document.createElement('button');
  zy.type = 'button';
  zy.className = 'tel-zycie';
  zy.hidden = true;
  Object.assign(zy.style, { left: `${L.zycie.x}px`, top: `${L.zycie.y}px` });
  zy.setAttribute('aria-label', 'Życie – dotknij, żeby się wyleczyć');
  zy.title = 'Życie – dotknij, żeby się wyleczyć (H)';
  const zf = document.createElement('canvas');
  zf.className = 'tel-ciecz';
  zf.width = L.exp.fw;
  zf.height = L.exp.fh;
  Object.assign(zf.style, { left: `${L.exp.fx - L.exp.x}px`, top: `${L.exp.fy - L.exp.y}px`, width: `${L.exp.fw}px`, height: `${L.exp.fh}px` });
  el.zycieFill = zf;
  const zl = document.createElement('div');
  zl.className = 'tel-licz';
  el.zycieLicz = zl;
  zy.append(img('A_exp_obudowa', 0, 0), zf, zl);
  stop(zy);
  zy.addEventListener('click', (e) => {
    e.stopPropagation();
    obsl?.lecz();
  });
  el.zycie = zy;

  root.append(exp, fill, pozImg, poz, zy, p);
  document.body.append(root);
  // Any touch elsewhere keeps an open column for a while (the 4 s count from the last use of the HUD).
  root.addEventListener('pointerdown', () => { if (rozwiniety()) odliczZwiniecie(); });
  for (const n of ['A_exp_wypelnienie', 'C_normalny', 'C_aktywny', 'C_niedostepny', 'C_wcisniety', 'A_awans_1', 'A_awans_2', 'A_awans_3', 'D_hulajnoga']) obraz(n);
  obraz('A_exp_wypelnienie').addEventListener('load', () => rysujPaski(), { once: true });
  t = 0;
  kierunek = 0;
  ustawKolumne();
  uklad();
  window.addEventListener('resize', uklad);
  if (stan) ustawTeleskop(stan);
}

export function odmontujTeleskop() {
  window.removeEventListener('resize', uklad);
  window.clearTimeout(zwin);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  root?.remove();
  root = null;
  el.kola = [];
  el.lacz = [];
  document.body.classList.remove('hud-teleskop');
}

/** Phone ×1, computer ×2 (nearest neighbour), whole steps only. */
function uklad() {
  if (!root) return;
  const telefon = window.matchMedia('(pointer: coarse)').matches;
  const s = telefon || window.innerHeight < 560 ? 1 : 2;
  root.style.setProperty('--tel-mx', `${L.margines.x}px`);
  root.style.setProperty('--tel-my', `${L.margines.y}px`);
  root.style.transform = s === 1 ? '' : `scale(${s})`;
}

export const szerokoscTeleskopu = () => (root ? root.getBoundingClientRect().right : 0);

export function teleskopWidoczny(tryb: 'on' | 'dim' | 'off') {
  root?.classList.toggle('off', tryb === 'off');
  root?.classList.toggle('dim', tryb === 'dim');
  if (tryb !== 'on') zwinTeleskop();
}

// ------------------------------------------------------------------ what it shows

let ostatniPoziom = 0;
let ostatnieKola = '';

function odswiezKola() {
  if (!stan) return;
  const v = stan.pojazd;
  const k = el.kola[3];
  if (!k) return;
  k.ik.src = `${BASE}D_${v.ikona}.png`;
  if (v.brak) k.b.dataset.brak = '';
  else delete k.b.dataset.brak;
  const nazwa = v.brak ? 'Nie masz pojazdu' : v.jedzie ? `Zsiądź z ${v.ikona === 'welocyped' ? 'roweru' : 'hulajnogi'}` : `Wsiądź na ${v.ikona === 'welocyped' ? 'rower' : 'hulajnogę'}`;
  k.b.setAttribute('aria-label', nazwa);
  k.b.title = nazwa;
  for (const [i, x] of el.kola.entries()) {
    if (x.b.classList.contains('wcisniety')) continue;
    const plik = i === 3 ? (v.brak ? 'C_niedostepny' : v.jedzie ? 'C_aktywny' : 'C_normalny') : 'C_normalny';
    if (!x.tlo.src.endsWith(`${plik}.png`)) x.tlo.src = `${BASE}${plik}.png`;
  }
}

/** The fill pictures cut to their share (left part only, pixels never stretched); the red one recoloured from the EXP one. */
function rysujPaski() {
  if (!stan) return;
  const src = obraz('A_exp_wypelnienie');
  if (!src.complete || !src.naturalWidth) return;
  const rysuj = (c: HTMLCanvasElement | undefined, czesc: number, kolor: ((r: number, g: number, b: number) => [number, number, number]) | null) => {
    if (!c) return;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    const w = Math.round(c.width * Math.min(1, Math.max(0, czesc)));
    if (w <= 0) return;
    g.drawImage(src, 0, 0, w, c.height, 0, 0, w, c.height);
    if (!kolor) return;
    const d = g.getImageData(0, 0, w, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      [d.data[i], d.data[i + 1], d.data[i + 2]] = kolor(d.data[i], d.data[i + 1], d.data[i + 2]);
    }
    g.putImageData(d, 0, 0);
  };
  rysuj(el.expFill, stan.expShare, null);
  const v = stan;
  const czesc = v.maxHp > 0 ? v.hp / v.maxHp : 0;
  // Amber → red by brightness (the shading of the artist's liquid stays); poisoned = green.
  const na = v.zatruty ? [90, 200, 90] : [230, 64, 52];
  rysuj(el.zycieFill, czesc, (r, g, b) => {
    const j = (r + g + b) / 3 / 170;
    return [Math.min(255, na[0] * j), Math.min(255, na[1] * j), Math.min(255, na[2] * j)];
  });
}

export function ustawTeleskop(v: TeleskopStan) {
  const awans = stan && v.poziom > ostatniPoziom && ostatniPoziom > 0;
  stan = v;
  if (!root) return;
  ostatniPoziom = v.poziom;
  if (el.poziom && el.poziom.textContent !== String(v.poziom)) el.poziom.textContent = String(v.poziom);
  rysujPaski();
  // Life only while hurt.
  const ranny = v.hp < v.maxHp;
  if (el.zycie) {
    el.zycie.hidden = !ranny;
    el.zycie.classList.toggle('pusto', v.bezLeczenia);
    el.zycie.classList.toggle('nisko', v.hp <= v.maxHp / 3);
  }
  if (el.zycieLicz) el.zycieLicz.textContent = v.bezLeczenia ? '' : String(v.leczen);
  if (el.zycieLicz) el.zycieLicz.style.display = v.bezLeczenia ? 'none' : '';
  const klucz = `${v.pojazd.ikona}|${v.pojazd.jedzie}|${v.pojazd.brak}`;
  if (klucz !== ostatnieKola) {
    ostatnieKola = klucz;
    odswiezKola();
  }
  if (awans) blyskAwansu();
}

/** The artist's three glint frames over the portrait, played twice. */
function blyskAwansu() {
  const a = el.awans;
  if (!a) return;
  const kl = [1, 2, 3, 1, 2, 3];
  kl.forEach((n, i) => window.setTimeout(() => { a.src = `${BASE}A_awans_${n}.png`; a.style.visibility = 'visible'; }, i * 100));
  window.setTimeout(() => { a.style.visibility = 'hidden'; }, kl.length * 100);
}

/** The hero's head into the portrait's round window (the same crop the old HUD used). */
export function teleskopAwatar(src: CanvasImageSource | null, sx: number, sy: number, sw: number, sh: number) {
  const c = el.av;
  if (!c) return;
  const d = Math.max(1, Math.round(window.devicePixelRatio || 1)) * 2;
  c.width = L.portret.okno * d;
  c.height = L.portret.okno * d;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#3a2c22';
  g.fillRect(0, 0, c.width, c.height);
  if (src) g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
}

/** For tests: the column's time and buttons. */
export const teleskopStan = () => ({ t, kierunek, otwarta: t >= CALOSC, kola: el.kola.map((k) => ({ top: k.b.style.top, ukryty: k.b.hasAttribute('data-ukryty') })) });
(window as unknown as { __teleskop?: typeof teleskopStan }).__teleskop = teleskopStan;
