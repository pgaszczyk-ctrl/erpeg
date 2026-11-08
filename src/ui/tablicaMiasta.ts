// A city board's map (tablica z mapką miasta, owner 2 Nov 2026): the city drawn simply – boundary, main roads,
// railways, rivers – every way out with two names (a town on the way and the big city the road leads to), where the
// hero is, the stations and the municipal cannons. A tap on a dot (or a way out) shows its name, address and
// „🧭 Prowadź”, which sets the guiding arrow (GameScene.prowadzDo). Data: CityMap.plan (scripts/tablice/tablice.mjs).
// The world sleeps while it is open (UIScene.openTablica), so the pulsing „you are here” runs on its own frames.
import { przybijPomysl } from './pomysly';
import type { PlanMiasta } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import { lang, tx } from '../i18n';
import { resetKeys, resetTouch } from '../controls';
import { IKONA_HUBA, type RodzajHuba } from '../huby';

export interface PunktTablicy { nazwa: string; x: number; y: number; rodzaj: RodzajHuba | 'ty'; adres?: string }
export interface TablicaHost {
  plan: PlanMiasta;
  miasto: string;
  hero: { x: number; y: number };
  punkty: PunktTablicy[];
  adres: (x: number, y: number) => string;
  /** Is the arrow guiding to this spot now? */
  prowadzi: (x: number, y: number) => boolean;
  prowadz: (p: PunktTablicy | null) => void;
  /** Today's note pinned to this board (src/tablice/kartki.ts); none when nothing fits here. */
  kartka?: KartkaNaTablicy;
}

/** The note as the board shows it. `stan`: 'nowa' = can be taken, 'wzieta' = taken from this board today. */
export interface KartkaNaTablicy {
  rodzaj: 'zwykla' | 'gonczy' | 'urzedowa' | 'stara';
  tytul: string;
  tresc: string;
  zleca: string;
  stan: 'nowa' | 'wzieta';
  przyjmij: () => void;
}

let otwarta: HTMLDivElement | null = null;
let poZamknieciu: (() => void) | null = null;

export function tablicaOtwarta() {
  return !!otwarta;
}

export function zamknijTablice() {
  if (!otwarta) return;
  otwarta.remove();
  otwarta = null;
  window.removeEventListener('keydown', klawisz, true);
  resetKeys();
  resetTouch();
  const f = poZamknieciu;
  poZamknieciu = null;
  f?.();
}

function klawisz(e: KeyboardEvent) {
  if (!otwarta) return;
  e.stopPropagation();
  if (e.key !== 'Escape') return;
  e.preventDefault();
  const karta = otwarta.querySelector('.tb-karta, .tb-kartka-duza');
  if (karta) karta.remove();
  else zamknijTablice();
}

const STYL = `
#tablica { position: fixed; inset: 0; z-index: 9; display: flex; align-items: center; justify-content: center; background: rgba(10,8,14,.55); }
#tablica .tb-ramka { position: relative; display: flex; flex-direction: column; padding: 8px;
  background: linear-gradient(180deg, #4a2c16, #3a2010); border-radius: 4px;
  box-shadow: 0 0 0 2px #1e1a24, 0 0 0 6px #b8862b, inset 0 0 0 1px #f2d488, 0 0 0 8px #1e1a24, 9px 9px 0 8px rgba(0,0,0,.45); }
#tablica .tb-gora { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 0 8px; position: relative; }
#tablica .tb-gora span { padding: 3px 26px; max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font: 700 19px 'Pixelify Sans', sans-serif; letter-spacing: 2px; color: #3a2210; text-transform: uppercase;
  background: #d9a441; box-shadow: 0 0 0 2px #1e1a24, inset 0 2px 0 #f5d98a, inset 0 -2px 0 #9c6a22, 4px 4px 0 2px rgba(0,0,0,.35); }
#tablica .tb-gora button { position: absolute; right: 0; top: -2px; width: 40px; height: 40px; border-radius: 50%; border: 2px solid #1e1a24;
  background: radial-gradient(circle at 35% 30%, #f5d98a, #c8962e 60%, #8a6020); color: #2a1808;
  font: 700 20px sans-serif; cursor: pointer; box-shadow: inset 0 -2px 0 #6a4a18; }
#tablica .tb-srodek { display:flex; gap:12px; }
#tablica .tb-ogloszenia { box-sizing:border-box; width:142px; flex:0 0 142px; display:flex; flex-direction:column; align-items:flex-start; gap:22px; padding:12px 28px 12px 8px; }
#tablica .tb-ogloszenia .tb-kartka { position:relative; left:auto; top:auto; flex:0 0 auto; width:104px; }
#tablica canvas { display: block; touch-action: none; cursor: pointer; box-shadow: 0 0 0 2px #1e1a24, inset 0 0 0 1px #000; }
#tablica .tb-karta { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(92%, 360px);
  background: linear-gradient(180deg, #5a3a1e, #3e2412); color: #f6e6c2; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
  font: 16px 'Alegreya Sans', sans-serif; border-radius: 3px;
  box-shadow: 0 0 0 2px #1e1a24, 0 0 0 4px #c8962e, 0 0 0 6px #1e1a24, 5px 5px 0 6px rgba(0,0,0,.4); }
#tablica .tb-karta b { font-size: 18px; color: #f5d98a; }
#tablica .tb-karta small { opacity: .85; font-size: 14px; }
#tablica .tb-karta div { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
#tablica .tb-karta button { font: 700 16px 'Alegreya Sans', sans-serif; min-height: 44px; padding: 0 14px; border: 2px solid #1e1a24; border-radius: 3px;
  background: linear-gradient(180deg, #f5d98a, #c8962e); color: #2a1808; cursor: pointer; box-shadow: inset 0 -3px 0 #8a6020; }
#tablica .tb-karta button.tb-cicho { background: linear-gradient(180deg, #8fb0a0, #5f8070); min-width: 44px; }
/* The note nailed over the board's top-left corner (code-drawn until the artist's order 47 part C). */
#tablica .tb-kartka { position: absolute; left: -14px; top: -12px; z-index: 2; width: 104px; min-height: 76px; padding: 14px 8px 8px; cursor: pointer;
  font: 600 12px 'Alegreya Sans', sans-serif; color: #3a2a1c; transform: rotate(-4deg); transition: transform .15s;
  box-shadow: 3px 4px 0 rgba(0,0,0,.35); background: #efe2c0; clip-path: polygon(0 3%, 12% 0, 30% 2%, 52% 0, 70% 3%, 88% 0, 100% 2%, 98% 30%, 100% 62%, 97% 100%, 74% 97%, 50% 100%, 26% 96%, 4% 100%, 2% 66%, 0 34%); }
#tablica .tb-kartka:hover, #tablica .tb-kartka:focus-visible { transform: rotate(-1deg) translateY(-4px) scale(1.05); outline: none; }
#tablica .tb-kartka b { display: block; font-size: 13px; line-height: 1.1; margin-bottom: 3px; }
#tablica .tb-kartka small { display: block; font-size: 10px; opacity: .75; }
#tablica .tb-kartka::before { content: ''; position: absolute; left: 7px; top: 5px; width: 9px; height: 9px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #f5d98a, #8a6020 70%); box-shadow: 0 0 0 1px #1e1a24; }
#tablica .tb-kartka.gonczy, #tablica .tb-kartka-duza.gonczy .tb-papier { background: #e6c98a; }
#tablica .tb-kartka.urzedowa, #tablica .tb-kartka-duza.urzedowa .tb-papier { background: #f6f1e4; }
#tablica .tb-kartka.stara, #tablica .tb-kartka-duza.stara .tb-papier { background: #dcc48e; }
#tablica .tb-kartka.wzieta { filter: saturate(.6) brightness(.85); }
#tablica .tb-pieczec { position: absolute; right: 6px; bottom: 6px; font: 700 11px 'Pixelify Sans', sans-serif; color: #b0262c;
  border: 2px solid #b0262c; padding: 1px 4px; transform: rotate(-12deg); opacity: .85; letter-spacing: 1px; }
#tablica .tb-kartka-duza { z-index:3; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10,8,14,.45); }
#tablica .tb-papier { position: relative; width: min(88%, 380px); max-height: 86%; overflow: auto; padding: 26px 20px 16px; background: #efe2c0; color: #3a2a1c;
  font: 16px 'Alegreya Sans', sans-serif; box-shadow: 6px 7px 0 rgba(0,0,0,.4); transform: rotate(-1.5deg);
  clip-path: polygon(0 2%, 12% 0, 30% 1.5%, 52% 0, 70% 2%, 88% 0, 100% 1.5%, 99% 30%, 100% 62%, 98.5% 100%, 74% 98%, 50% 100%, 26% 97.5%, 3% 100%, 1% 66%, 0 34%); }
#tablica .tb-papier::before { content: ''; position: absolute; left: 50%; top: 8px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #f5d98a, #8a6020 70%); box-shadow: 0 0 0 1px #1e1a24; }
#tablica .tb-papier h3 { margin: 0 0 8px; font: 700 20px 'Playfair Display', 'Alegreya Sans', serif; text-align: center; }
#tablica .tb-papier .tb-gonczy-naglowek { text-align: center; font: 700 13px 'Pixelify Sans', sans-serif; letter-spacing: 3px; color: #7a1a1e; margin-bottom: 4px; }
#tablica .tb-papier p { margin: 0 0 10px; line-height: 1.35; }
#tablica .tb-papier .tb-zleca { font-size: 14px; opacity: .8; }
#tablica .tb-papier div { display: flex; gap: 8px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
#tablica .tb-papier button { font: 700 16px 'Alegreya Sans', sans-serif; min-height: 44px; padding: 0 16px; border: 2px solid #1e1a24; border-radius: 3px;
  background: linear-gradient(180deg, #f5d98a, #c8962e); color: #2a1808; cursor: pointer; box-shadow: inset 0 -3px 0 #8a6020; }
#tablica .tb-papier button.tb-cicho { background: linear-gradient(180deg, #8fb0a0, #5f8070); }
`;

/**
 * The screen changed size while the board is open (owner, 8 Nov 2026: a turned iPhone kept the old layout, the ✕
 * could end up above the screen): build the window again for the new size, keeping the same close callback.
 */
let otwartyHost: TablicaHost | null = null;
let przeloz: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  if (!otwarta) return;
  clearTimeout(przeloz);
  przeloz = setTimeout(() => {
    if (!otwarta || !otwartyHost) return;
    const f = poZamknieciu;
    poZamknieciu = null;
    zamknijTablice();
    otworzTablice(otwartyHost, f ?? undefined);
  }, 200);
});

export function otworzTablice(h: TablicaHost, onClose?: () => void) {
  if (otwarta) zamknijTablice();
  poZamknieciu = onClose ?? null;
  otwartyHost = h;
  if (!document.getElementById('tablica-styl')) {
    const st = document.createElement('style');
    st.id = 'tablica-styl';
    st.textContent = STYL;
    document.head.append(st);
  }
  const root = document.createElement('div');
  root.id = 'tablica';
  const ramka = document.createElement('div');
  ramka.className = 'tb-ramka';
  ramka.setAttribute('role', 'dialog');
  ramka.setAttribute('aria-modal', 'true');
  const gora = document.createElement('div');
  gora.className = 'tb-gora';
  const tytul = document.createElement('span');
  tytul.textContent = `🗺 ${h.miasto} – ${tx('plan miasta', 'city map')}`;
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '✕';
  x.setAttribute('aria-label', tx('Zamknij', 'Close'));
  x.onclick = zamknijTablice;
  gora.append(tytul, x);
  const W = Math.floor(Math.min(window.innerWidth - 184, 960));
  const H = Math.floor(Math.min(window.innerHeight - 76, 680));
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const srodek = document.createElement('div'); srodek.className = 'tb-srodek';
  const ogloszenia = document.createElement('aside'); ogloszenia.className = 'tb-ogloszenia';
  ogloszenia.setAttribute('aria-label', tx('Ogłoszenia i pomysły', 'Notices and ideas'));
  srodek.append(canvas, ogloszenia); ramka.append(gora, srodek);
  if (h.kartka) przybijKartke(ramka, h.kartka, ogloszenia);
  przybijPomysl(ramka, ogloszenia);
  root.append(ramka);
  root.onclick = (e) => { if (e.target === root) zamknijTablice(); };
  document.body.append(root);
  otwarta = root;
  window.addEventListener('keydown', klawisz, true);

  let rys = rysujPlan(h, W, H, dpr);
  // The game's pixel font may still be on its way: draw again once it's in.
  if (document.fonts && !document.fonts.check("16px 'Pixelify Sans'"))
    void Promise.all([document.fonts.load("700 16px 'Pixelify Sans'"), document.fonts.load("500 14px 'Pixelify Sans'")]).then(() => {
      if (otwarta === root) { rys = rysujPlan(h, W, H, dpr); ustawCele(); }
    }).catch(() => {});
  // For browser tests: what can be tapped (CSS px on the canvas).
  const ustawCele = () => { (window as unknown as { __tablica: unknown }).__tablica = rys.cele.map((c) => ({ nazwa: c.p.nazwa, rodzaj: c.p.rodzaj, x: c.box ? (c.box[0] + c.box[2]) / 2 : c.sx, y: c.box ? (c.box[1] + c.box[3]) / 2 : c.sy })); };
  ustawCele();
  const ctx = canvas.getContext('2d')!;
  // The pulse of „you are here” (the game loop sleeps meanwhile).
  const t0 = performance.now();
  const klatka = () => {
    if (otwarta !== root) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rys.tlo, 0, 0, rys.tlo.width * PIKSEL * dpr, rys.tlo.height * PIKSEL * dpr);
    ctx.drawImage(rys.nakladka, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [hx, hy] = rys.naEkran(h.hero.x, h.hero.y);
    const f = ((performance.now() - t0) % 1400) / 1400;
    ctx.strokeStyle = `rgba(228,59,68,${1 - f})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, 7 + f * 16, 0, Math.PI * 2);
    ctx.stroke();
    requestAnimationFrame(klatka);
  };
  requestAnimationFrame(klatka);

  // A tap: the nearest dot or way-out sign within reach.
  canvas.addEventListener('click', (e) => {
    const k = W / (canvas.clientWidth || W);
    const px = e.offsetX * k, py = e.offsetY * k;
    let best: { p: PunktTablicy; d: number } | null = null;
    for (const c of rys.cele) {
      const d = c.box ? (px >= c.box[0] && px <= c.box[2] && py >= c.box[1] && py <= c.box[3] ? 0 : Infinity) : Math.hypot(c.sx - px, c.sy - py);
      if (d < (c.box ? 1 : 22) && (!best || d < best.d)) best = { p: c.p, d };
    }
    root.querySelector('.tb-karta')?.remove();
    if (best) karta(h, ramka, best.p);
  });
}

/** The little card: the dot's name, address, distance, and the guide button. */
function karta(h: TablicaHost, ramka: HTMLDivElement, p: PunktTablicy) {
  const box = document.createElement('div');
  box.className = 'tb-karta';
  const ikona = p.rodzaj === 'ty' ? '📍' : IKONA_HUBA[p.rodzaj];
  const b = document.createElement('b');
  b.textContent = `${ikona} ${p.nazwa}`;
  const a = document.createElement('span');
  a.textContent = p.adres ?? h.adres(p.x, p.y);
  const s = document.createElement('small');
  s.textContent = p.rodzaj === 'ty' ? tx('Tu jesteś', 'You are here') : kierunek(p.x - h.hero.x, p.y - h.hero.y);
  box.append(b, a, s);
  const row = document.createElement('div');
  const btn = (text: string, fn: () => void, cicho = false) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = text;
    if (cicho) x.className = 'tb-cicho';
    x.onclick = (e) => { e.stopPropagation(); fn(); };
    row.append(x);
  };
  if (p.rodzaj !== 'ty') {
    if (h.prowadzi(p.x, p.y)) btn(tx('✋ Przestań prowadzić', '✋ Stop guiding'), () => { h.prowadz(null); box.remove(); });
    else btn(tx('🧭 Prowadź', '🧭 Guide me'), () => { h.prowadz(p); zamknijTablice(); });
  }
  btn('✕', () => box.remove(), true);
  box.append(row);
  ramka.append(box);
}

/** The note on the board: small and pinned; a tap/click opens it big with „Przyjmuję” / „Odejdź”. */
function przybijKartke(ramka: HTMLDivElement, k: KartkaNaTablicy, miejsce: HTMLElement = ramka) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `tb-kartka ${k.rodzaj}${k.stan === 'wzieta' ? ' wzieta' : ''}`;
  el.setAttribute('aria-label', tx(`Ogłoszenie: ${k.tytul}`, `Notice: ${k.tytul}`));
  const b = document.createElement('b');
  b.textContent = k.tytul;
  const s = document.createElement('small');
  s.textContent = k.stan === 'wzieta' ? tx('Przyjęte – wróć jutro po nowe', 'Taken – come back tomorrow') : tx('Stuknij, by przeczytać', 'Tap to read');
  el.append(b, s);
  if (k.stan === 'wzieta') el.append(pieczec());
  el.onclick = (e) => { e.stopPropagation(); otworzKartke(ramka, k); };
  miejsce.append(el);
}

function pieczec() {
  const p = document.createElement('span');
  p.className = 'tb-pieczec';
  p.textContent = tx('PRZYJĘTE', 'TAKEN');
  return p;
}

function otworzKartke(ramka: HTMLDivElement, k: KartkaNaTablicy) {
  ramka.querySelector('.tb-karta, .tb-kartka-duza')?.remove();
  const tlo = document.createElement('div');
  tlo.className = `tb-kartka-duza ${k.rodzaj}`;
  tlo.onclick = (e) => { if (e.target === tlo) tlo.remove(); };
  const papier = document.createElement('div');
  papier.className = 'tb-papier';
  papier.setAttribute('role', 'dialog');
  if (k.rodzaj === 'gonczy') {
    const g = document.createElement('div');
    g.className = 'tb-gonczy-naglowek';
    g.textContent = tx('POSZUKIWANY', 'WANTED');
    papier.append(g);
  }
  const h = document.createElement('h3');
  h.textContent = k.tytul;
  const p = document.createElement('p');
  p.textContent = k.tresc;
  const z = document.createElement('p');
  z.className = 'tb-zleca';
  z.textContent = tx(`Zgłoś się po zapłatę: ${k.zleca}`, `Collect your pay at: ${k.zleca}`);
  papier.append(h, p, z);
  const row = document.createElement('div');
  const btn = (t: string, fn: () => void, cicho = false) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = t;
    if (cicho) x.className = 'tb-cicho';
    x.onclick = (e) => { e.stopPropagation(); fn(); };
    row.append(x);
  };
  if (k.stan === 'nowa') {
    btn(tx('✅ Przyjmuję', '✅ Accept'), () => { k.przyjmij(); zamknijTablice(); });
    btn(tx('Odejdź', 'Walk away'), zamknijTablice, true);
  } else {
    papier.append(pieczec());
    btn(tx('Wróć do mapki', 'Back to the map'), () => tlo.remove(), true);
  }
  papier.append(row);
  tlo.append(papier);
  ramka.append(tlo);
}

const nazwa = (pl: string | 0, en: string | 0) => String((lang === 'en' ? en : pl) || pl || '');

/** „Daleko na północnym wschodzie” – the board speaks in directions, not kilometres. */
function kierunek(dx: number, dy: number) {
  const m = Math.hypot(dx, dy) / PX_PER_M;
  const k = ((Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) % 8) + 8) % 8;
  const pl = ['na północy', 'na północnym wschodzie', 'na wschodzie', 'na południowym wschodzie', 'na południu', 'na południowym zachodzie', 'na zachodzie', 'na północnym zachodzie'][k];
  const en = ['to the north', 'to the north-east', 'to the east', 'to the south-east', 'to the south', 'to the south-west', 'to the west', 'to the north-west'][k];
  if (m < 400) return tx('Tuż obok', 'Right here');
  return m < 2500 ? tx(`Niedaleko, ${pl}`, `Not far, ${en}`) : tx(`Daleko, ${pl}`, `Far away, ${en}`);
}

/** A tiny repeatable random for the wood grain (the board looks the same every time). */
function los(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dark wooden planks with grain, seams and nails. */
function deski(c: CanvasRenderingContext2D, W: number, H: number) {
  const r = los(7);
  const n = Math.max(4, Math.round(H / 70));
  const h = H / n;
  for (let i = 0; i < n; i++) {
    const y = i * h;
    const t = 0.85 + r() * 0.3;
    c.fillStyle = `rgb(${Math.round(110 * t)},${Math.round(70 * t)},${Math.round(40 * t)})`;
    c.fillRect(0, y, W, h);
    c.fillStyle = 'rgba(255,220,160,.08)';
    c.fillRect(0, y + 2, W, 2);
    // Grain.
    for (let k = 0; k < 7; k++) {
      const gy = y + 4 + r() * (h - 8), amp = 1 + r() * 3, faza = r() * 6, dl = 60 + r() * 120;
      c.strokeStyle = r() < 0.5 ? 'rgba(40,20,6,.28)' : 'rgba(200,150,90,.14)';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const yy = gy + Math.sin(x / dl * 6.28 + faza) * amp;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    // A knot now and then.
    if (r() < 0.6) {
      const kx = r() * W, ky = y + h * (0.3 + r() * 0.4);
      c.strokeStyle = 'rgba(40,20,6,.35)';
      for (let q = 1; q <= 3; q++) { c.beginPath(); c.ellipse(kx, ky, 6 * q, 2.5 * q, 0, 0, Math.PI * 2); c.stroke(); }
    }
    // Seam and nails.
    c.fillStyle = 'rgba(20,10,4,.75)';
    c.fillRect(0, y, W, 2);
    for (const nx of [10, W - 10]) {
      c.fillStyle = '#2a1a0c';
      c.beginPath(); c.arc(nx, y + h / 2, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c8962e';
      c.beginPath(); c.arc(nx - 0.6, y + h / 2 - 0.6, 1.6, 0, Math.PI * 2); c.fill();
    }
  }
}

/** A smoothed path through points (quadratic curves through the midpoints) – hand-carved, not surveyed. */
function gladko(c: CanvasRenderingContext2D, pts: (readonly [number, number])[], zamknij = false) {
  c.beginPath();
  if (pts.length < 2) return;
  if (zamknij) {
    const n = pts.length;
    const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
    const s = mid(pts[n - 1], pts[0]);
    c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    c.closePath();
    return;
  }
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

/** A flat brass plate (pixel style: no gradients – a light top edge, a dark bottom edge, ink outline, rivets). */
function mosiadz(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, nity = true) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.fillRect(x + 2, y + 2, w + 2, h + 2);
  c.fillStyle = '#1e1a24';
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  c.fillStyle = '#d9a441';
  c.fillRect(x, y, w, h);
  c.fillStyle = '#f5d98a';
  c.fillRect(x, y, w, 2);
  c.fillStyle = '#9c6a22';
  c.fillRect(x, y + h - 2, w, 2);
  if (!nity) return;
  for (const nx of [x + 4, x + w - 6]) {
    c.fillStyle = '#7a5418'; c.fillRect(nx, y + h / 2 - 1, 2, 2);
  }
}

/** A flat brass medallion with an icon (stations, cannons). */
function medalion(c: CanvasRenderingContext2D, x: number, y: number, ikona: string, zloty: boolean) {
  c.fillStyle = '#1e1a24';
  c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
  c.fillStyle = zloty ? '#d9a441' : '#e8d6a8';
  c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill();
  c.fillStyle = zloty ? '#f5d98a' : '#fff4d8';
  c.fillRect(x - 6, y - 9, 8, 2);
  c.font = '12px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#1e1a24';
  c.fillText(ikona, x, y + 1);
}

/** A wobbly blob round an ellipse (lakes are burnt-in stains, not compass-drawn ovals), always the same per lake. */
function plama(x: number, y: number, a: number, b: number, k: number): (readonly [number, number])[] {
  const r = los(Math.round(x * 7 + y * 13));
  const n = 14;
  const out: (readonly [number, number])[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, f = 0.78 + r() * 0.34;
    const ex = Math.cos(t) * a * f, ey = Math.sin(t) * b * f;
    out.push([x + ex * Math.cos(k) - ey * Math.sin(k), y + ex * Math.sin(k) + ey * Math.cos(k)] as const);
  }
  return out;
}

/** Water burnt into the plank: a darker stain with a charred rim and little wave marks. */
function wodaWpalona(c: CanvasRenderingContext2D, pts: (readonly [number, number])[], seed: number) {
  c.fillStyle = 'rgba(28,44,52,.55)';
  gladko(c, pts, true); c.fill();
  c.strokeStyle = 'rgba(20,10,4,.9)'; c.lineWidth = 2.5;
  gladko(c, pts, true); c.stroke();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const r = los(seed);
  const ile = Math.min(40, Math.round(((x1 - x0) * (y1 - y0)) / 500));
  const poly = [pts.flatMap((p) => [p[0], p[1]])];
  c.strokeStyle = 'rgba(120,170,190,.55)'; c.lineWidth = 1.2;
  for (let i = 0; i < ile; i++) {
    const wx = x0 + r() * (x1 - x0), wy = y0 + r() * (y1 - y0);
    if (!wewnatrz(poly, wx, wy) || !wewnatrz(poly, wx + 8, wy)) continue;
    c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 2, wy - 2, wx + 4, wy); c.quadraticCurveTo(wx + 6, wy + 2, wx + 8, wy); c.stroke();
  }
}

/** Even-odd point-in-polygon on flat rings. */
function wewnatrz(rings: number[][], x: number, y: number) {
  let w = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
      if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) w = !w;
  return w;
}

/** The still part of the board (drawn once) and where its dots and signs landed. */
/** CSS px per board pixel. */
const PIKSEL = 2;

function rysujPlan(h: TablicaHost, W: number, H: number, dpr: number) {
  const P = h.plan;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of P.granica) for (let i = 0; i < r.length; i += 2) {
    x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]);
  }
  // Room around the city for the way-out signs.
  const mx = Math.min(130, W * 0.2), my = Math.min(56, H * 0.13);
  const s = Math.min((W - 2 * mx) / (x1 - x0), (H - 2 * my) / (y1 - y0));
  const ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s;
  const naEkran = (x: number, y: number) => [x * s + ox, y * s + oy] as const;
  const punkty = (r: number[]) => { const out: (readonly [number, number])[] = []; for (let i = 0; i + 1 < r.length; i += 2) out.push(naEkran(r[i], r[i + 1])); return out; };
  // A little pixelated, like the rest of the game (owner, 2 Nov 2026): drawn at PIKSEL CSS px per pixel, shown
  // enlarged without smoothing.
  const tlo = document.createElement('canvas');
  tlo.width = Math.ceil(W / PIKSEL);
  tlo.height = Math.ceil(H / PIKSEL);
  const c = tlo.getContext('2d')!;
  c.setTransform(1 / PIKSEL, 0, 0, 1 / PIKSEL, 0, 0);
  c.imageSmoothingEnabled = false;
  deski(c, W, H);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // The city: a patch burnt into the wood.
  for (const r of P.granica) {
    const pts = punkty(r);
    c.save();
    c.shadowColor = 'rgba(20,8,2,.9)';
    c.shadowBlur = 14;
    c.fillStyle = 'rgba(46,22,8,.42)';
    gladko(c, pts, true); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(30,14,4,.85)'; c.lineWidth = 3;
    gladko(c, pts, true); c.stroke();
    c.strokeStyle = 'rgba(214,160,92,.35)'; c.lineWidth = 1;
    c.save(); c.translate(1.5, 1.5); gladko(c, pts, true); c.stroke(); c.restore();
  }
  // The sea, lakes and rivers: burnt into the plank like on an old map.
  (P.morza ?? []).forEach((r, i) => wodaWpalona(c, punkty(r), 900 + i));
  P.jeziora.forEach(([x, y, a, b, k], i) => {
    const [sx, sy] = naEkran(x, y);
    wodaWpalona(c, plama(sx, sy, Math.max(7, a * s), Math.max(5, b * s), k), 300 + i);
  });
  for (const r of P.rzeki) { const pts = punkty(r); c.strokeStyle = 'rgba(20,10,4,.85)'; c.lineWidth = 4.5; gladko(c, pts); c.stroke(); c.strokeStyle = 'rgba(70,110,128,.9)'; c.lineWidth = 2; gladko(c, pts); c.stroke(); }
  // Railways: a brass rail with sleepers.
  for (const t of P.tory) { const pts = punkty(t); c.strokeStyle = '#2a1608'; c.lineWidth = 4; gladko(c, pts); c.stroke(); }
  c.setLineDash([3, 4]);
  for (const t of P.tory) { const pts = punkty(t); c.strokeStyle = '#d9a441'; c.lineWidth = 2; gladko(c, pts); c.stroke(); }
  c.setLineDash([]);
  // Main roads: grooves carved into the wood, with a light edge.
  for (const d of P.drogi) { const pts = punkty(d); c.strokeStyle = 'rgba(20,10,4,.9)'; c.lineWidth = 5; gladko(c, pts); c.stroke(); }
  for (const d of P.drogi) { const pts = punkty(d); c.save(); c.translate(1, 1.2); c.strokeStyle = 'rgba(222,170,100,.45)'; c.lineWidth = 1.2; gladko(c, pts); c.stroke(); c.restore(); }

  // Signs, dots and labels go on a sharp layer over the pixelated map (small pixel text turned to mush there).
  const nakladka = document.createElement('canvas');
  nakladka.width = Math.floor(W * dpr);
  nakladka.height = Math.floor(H * dpr);
  const n = nakladka.getContext('2d')!;
  n.setTransform(dpr, 0, 0, dpr, 0, 0);
  n.lineCap = 'round';
  n.lineJoin = 'round';
  const cele: { p: PunktTablicy; sx: number; sy: number; box?: [number, number, number, number] }[] = [];
  // Low screens (phones sideways): smaller plates.
  const f = H < 420 ? 0.82 : 1;
  const duza = `700 ${Math.round(16 * f)}px 'Pixelify Sans', sans-serif`, mala = `500 ${Math.round(14 * f)}px 'Pixelify Sans', sans-serif`;
  const wiersz = 17 * f;
  // Dots on the board (the city and a little around it): the plates keep clear of them.
  const kropki: { p: PunktTablicy; sx: number; sy: number }[] = [];
  const [hx, hy] = naEkran(h.hero.x, h.hero.y);
  for (const p of h.punkty) {
    if (p.x < x0 - (x1 - x0) * 0.08 || p.x > x1 + (x1 - x0) * 0.08 || p.y < y0 - (y1 - y0) * 0.08 || p.y > y1 + (y1 - y0) * 0.08) continue;
    const [sx, sy] = naEkran(p.x, p.y);
    kropki.push({ p, sx, sy });
  }
  const przeszkody = [...kropki.map((k) => [k.sx - 13, k.sy - 13, k.sx + 13, k.sy + 13]), [hx - 36, hy - 26, hx + 36, hy + 10]];
  // Ways out: a rivet where the road leaves town and a plain brass info plate (the big city over the town).
  const tabliczki: { x: number; y: number; w: number; h: number; ax: number; ay: number; linie: string[]; w0: (typeof P.wyloty)[number] }[] = [];
  for (const w of P.wyloty) {
    const [ex, ey] = naEkran(w[0], w[1]);
    const dx = Math.cos(w[2]), dy = Math.sin(w[2]);
    const ax = ex + dx * 6, ay = ey + dy * 6;
    const linie: string[] = [];
    if (w[5]) linie.push(nazwa(w[5], w[6]));
    if (w[3]) linie.push(nazwa(w[3], w[4]));
    const tw = Math.max(...linie.map((l, i) => { n.font = i === 0 && w[5] ? duza : mala; return n.measureText(l).width; })) + 22;
    const th = linie.length * wiersz + 8;
    const cx = ax + dx * (26 + tw / 2 * Math.abs(dx)), cy = ay + dy * (22 + th / 2 * Math.abs(dy));
    tabliczki.push({ x: cx - tw / 2, y: cy - th / 2, w: tw, h: th, ax, ay, linie, w0: w });
  }
  // Plates don't overlap each other or the dots, and stay on the board.
  for (let it = 0; it < 30; it++) {
    for (const a of tabliczki) {
      a.x = Math.max(6, Math.min(W - 6 - a.w, a.x));
      a.y = Math.max(6, Math.min(H - 6 - a.h, a.y));
    }
    for (let i = 0; i < tabliczki.length; i++)
      for (let j = i + 1; j < tabliczki.length; j++) {
        const a = tabliczki[i], b = tabliczki[j];
        const ox2 = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + 4;
        const oy2 = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + 4;
        if (ox2 <= 0 || oy2 <= 0) continue;
        if (oy2 < ox2) { const d = oy2 / 2 * (a.y < b.y ? -1 : 1); a.y += d; b.y -= d; }
        else { const d = ox2 / 2 * (a.x < b.x ? -1 : 1); a.x += d; b.x -= d; }
      }
    for (const a of tabliczki)
      for (const [bx0, by0, bx1, by1] of przeszkody) {
        const ox2 = Math.min(a.x + a.w, bx1) - Math.max(a.x, bx0) + 2;
        const oy2 = Math.min(a.y + a.h, by1) - Math.max(a.y, by0) + 2;
        if (ox2 <= 0 || oy2 <= 0) continue;
        if (oy2 < ox2) a.y += a.y + a.h / 2 < (by0 + by1) / 2 ? -oy2 : oy2;
        else a.x += a.x + a.w / 2 < (bx0 + bx1) / 2 ? -ox2 : ox2;
      }
  }
  for (const t of tabliczki) {
    // A brass wire from where the road leaves town to its plate.
    const px = Math.max(t.x, Math.min(t.x + t.w, t.ax)), py = Math.max(t.y, Math.min(t.y + t.h, t.ay));
    n.strokeStyle = '#1e1a24'; n.lineWidth = 3.5;
    n.beginPath(); n.moveTo(t.ax, t.ay); n.lineTo(px, py); n.stroke();
    n.strokeStyle = '#d9a441'; n.lineWidth = 1.6;
    n.beginPath(); n.moveTo(t.ax, t.ay); n.lineTo(px, py); n.stroke();
    n.fillStyle = '#1e1a24'; n.fillRect(Math.round(t.ax) - 4, Math.round(t.ay) - 4, 8, 8);
    n.fillStyle = '#f5d98a'; n.fillRect(Math.round(t.ax) - 2, Math.round(t.ay) - 2, 4, 4);
    mosiadz(n, t.x, t.y, t.w, t.h);
    n.textAlign = 'center';
    n.textBaseline = 'middle';
    t.linie.forEach((l, i) => {
      n.font = i === 0 && t.w0[5] ? duza : mala;
      const ty = t.y + 4 + wiersz / 2 + i * wiersz;
      n.fillStyle = '#3a2210';
      n.fillText(l, t.x + t.w / 2, ty);
    });
    const w = t.w0;
    const imiona = [w[5] && nazwa(w[5], w[6]), w[3] && nazwa(w[3], w[4])].filter(Boolean).join(', ');
    cele.push({ p: { nazwa: tx(`Droga na: ${imiona}`, `Road to: ${imiona}`), x: w[0], y: w[1], rodzaj: 'wylot' }, sx: 0, sy: 0, box: [t.x, t.y, t.x + t.w, t.y + t.h] });
  }
  // Stations and cannons (the pinball „metro”).
  for (const { p, sx, sy } of kropki) {
    medalion(n, sx, sy, p.rodzaj === 'ty' ? '' : IKONA_HUBA[p.rodzaj], p.rodzaj === 'armata' || p.rodzaj === 'metro');
    cele.push({ p, sx, sy });
  }
  // You are here: a red enamel pin.
  n.fillStyle = '#1e1a24';
  n.beginPath(); n.arc(hx, hy, 8, 0, Math.PI * 2); n.fill();
  n.fillStyle = '#c4202c';
  n.beginPath(); n.arc(hx, hy, 6.5, 0, Math.PI * 2); n.fill();
  n.fillStyle = '#ff8a80';
  n.fillRect(hx - 3, hy - 4, 3, 2);
  const tu = tx('Tu jesteś', 'You are here');
  n.font = "700 15px 'Pixelify Sans', sans-serif";
  n.textAlign = 'center';
  n.textBaseline = 'middle';
  const tw = n.measureText(tu).width + 14;
  mosiadz(n, hx - tw / 2, hy - 31, tw, 18, false);
  n.fillStyle = '#7a1018';
  n.fillText(tu, hx, hy - 21);
  cele.push({ p: { nazwa: tu, x: h.hero.x, y: h.hero.y, rodzaj: 'ty' }, sx: hx, sy: hy });
  // Legend on a brass strip.
  const legenda = [`${IKONA_HUBA.kolej} ${tx('dworzec', 'station')}`];
  if (h.punkty.some((p) => p.rodzaj === 'armata')) legenda.push(`${IKONA_HUBA.armata} ${tx('armata', 'cannon')}`);
  if (h.punkty.some((p) => p.rodzaj === 'metro')) legenda.push(`${IKONA_HUBA.metro} ${tx('metro (pinball)', 'metro (pinball)')}`);
  legenda.push(tx('stuknij znak', 'tap a sign'));
  n.font = "500 14px 'Pixelify Sans', sans-serif";
  n.textAlign = 'left';
  const lt = legenda.join('   ·   ');
  const lw = n.measureText(lt).width + 18;
  mosiadz(n, 8, H - 30, lw, 22, false);
  n.fillStyle = '#3a2210';
  n.fillText(lt, 17, H - 19);
  return { tlo, nakladka, naEkran, cele };
}
