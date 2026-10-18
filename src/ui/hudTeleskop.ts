// The telescopic HUD (artist 39-G002 „teleskop_v2”, owner 18 Oct 2026; test server with turn fights).
// Everything at the top left, nothing in the thumb's zone at the bottom: the hero's portrait inside an EXP ring (the
// artist's ring from 39-G001 „proba_v1”, owner 18 Oct 2026: the tube took too much room at the top) and the level plate; a tap on the portrait slides four round buttons out downwards, one from under the other like the
// segments of a telescope (Menu → Dziennik → Aparat → Transport), each pulled out by a short rigid rod. A tap only
// opens; a button acts on the next tap, once the column has stopped. It folds back in reverse order after 4 s idle or
// after a choice. Life is not shown at all: healing happens only in turn fights, which have their own panel.
// Plain HTML outside #game, so no tap on it ever reaches the joystick or the map.

const BASE = (import.meta.env.BASE_URL || '/') + 'hud/teleskop/';

/** The artist's layout (layout.json), in phone CSS px from the portrait's top-left corner. */
const L = {
  portret: { x: 0, y: 0, w: 52, okno: 36 },
  /** The level plate: by the ring's lower right, clear of the button column's rods. */
  poziom: { x: 54, y: 38, w: 28, h: 14 },
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
}

export interface TeleskopStan {
  expShare: number;
  poziom: number;
  /** The transport button: which picture, ridden now, or nothing to ride. */
  pojazd: { ikona: 'welocyped' | 'hulajnoga'; jedzie: boolean; brak: boolean };
}

const CSS = `
#hud-tel { position: fixed; left: calc(env(safe-area-inset-left) + var(--tel-mx)); top: calc(env(safe-area-inset-top) + var(--tel-my));
  z-index: 6; pointer-events: none; transform-origin: 0 0; width: 82px; height: 260px; }
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
  pierscien?: HTMLCanvasElement;
  poziom?: HTMLDivElement;
  awans?: HTMLImageElement;
  av?: HTMLCanvasElement;
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
  // The EXP ring around the frame: the empty track, then the full ring cut to the progress (clockwise from the top).
  const ring = document.createElement('canvas');
  ring.width = ring.height = L.portret.w;
  Object.assign(ring.style, { left: '0px', top: '0px', width: `${L.portret.w}px`, height: `${L.portret.w}px` });
  el.pierscien = ring;
  p.append(av, img('A_pierscien_tor', 0, 0), ring, img('A_medalion_oprawa', 0, 0), awans);
  stop(p);
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    if (rozwiniety()) zwinTeleskop();
    else rozwinTeleskop();
  });
  el.portret = p;

  // The level plate with the game's digits.
  const poz = document.createElement('div');
  poz.className = 'tel-poziom';
  poz.style.left = `${L.poziom.x}px`;
  poz.style.top = `${L.poziom.y}px`;
  const pozImg = img('A_poziom_pusty', L.poziom.x, L.poziom.y);
  el.poziom = poz;

  root.append(pozImg, poz, p);
  document.body.append(root);
  // Any touch elsewhere keeps an open column for a while (the 4 s count from the last use of the HUD).
  root.addEventListener('pointerdown', () => { if (rozwiniety()) odliczZwiniecie(); });
  for (const n of ['A_pierscien_pelny', 'C_normalny', 'C_aktywny', 'C_niedostepny', 'C_wcisniety', 'A_awans_1', 'A_awans_2', 'A_awans_3', 'D_hulajnoga']) obraz(n);
  obraz('A_pierscien_pelny').addEventListener('load', () => rysujPierscien(), { once: true });
  t = 0;
  kierunek = 0;
  ustawKolumne();
  uklad();
  window.addEventListener('resize', uklad);
  rysujAwatar();
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

/** The full ring cut to the share of EXP: a pie slice from 12 o'clock clockwise (pixels never stretched). */
function rysujPierscien() {
  const c = el.pierscien;
  if (!stan || !c) return;
  const src = obraz('A_pierscien_pelny');
  if (!src.complete || !src.naturalWidth) return;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  const czesc = Math.min(1, Math.max(0, stan.expShare));
  if (czesc <= 0) return;
  const r = c.width / 2;
  g.save();
  g.beginPath();
  g.moveTo(r, r);
  g.arc(r, r, r * 2, -Math.PI / 2, -Math.PI / 2 + czesc * Math.PI * 2);
  g.closePath();
  g.clip();
  g.drawImage(src, 0, 0);
  g.restore();
}

export function ustawTeleskop(v: TeleskopStan) {
  const awans = stan && v.poziom > ostatniPoziom && ostatniPoziom > 0;
  stan = v;
  if (!root) return;
  ostatniPoziom = v.poziom;
  if (el.poziom && el.poziom.textContent !== String(v.poziom)) el.poziom.textContent = String(v.poziom);
  rysujPierscien();
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

/** The hero's illustrated portrait (public/portrety/bohater_NN.webp); while it is missing or loading, the sheet's head. */
let portretUrl: string | null = null;
let portretObraz: HTMLImageElement | null = null;
let glowa: [CanvasImageSource, number, number, number, number] | null = null;

export function teleskopPortret(url: string | null) {
  if (url === portretUrl) return;
  portretUrl = url;
  portretObraz = null;
  if (!url) return rysujAwatar();
  const i = new Image();
  i.onload = () => {
    if (portretUrl !== url) return;
    portretObraz = i;
    rysujAwatar();
  };
  i.src = url;
}

export function teleskopAwatar(src: CanvasImageSource | null, sx: number, sy: number, sw: number, sh: number) {
  glowa = src ? [src, sx, sy, sw, sh] : null;
  rysujAwatar();
}

function rysujAwatar() {
  const c = el.av;
  if (!c) return;
  const d = Math.max(1, Math.round(window.devicePixelRatio || 1)) * 2;
  c.width = L.portret.okno * d;
  c.height = L.portret.okno * d;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#3a2c22';
  g.fillRect(0, 0, c.width, c.height);
  if (portretObraz) {
    // A painted picture: shrunk smoothly, never blocky.
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(portretObraz, 0, 0, c.width, c.height);
  } else if (glowa) g.drawImage(glowa[0], glowa[1], glowa[2], glowa[3], glowa[4], 0, 0, c.width, c.height);
}

/** For tests: the column's time and buttons. */
export const teleskopStan = () => ({ t, kierunek, otwarta: t >= CALOSC, kola: el.kola.map((k) => ({ top: k.b.style.top, ukryty: k.b.hasAttribute('data-ukryty') })) });
(window as unknown as { __teleskop?: typeof teleskopStan }).__teleskop = teleskopStan;
