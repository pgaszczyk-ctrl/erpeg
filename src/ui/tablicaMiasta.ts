// A city board's map (tablica z mapką miasta, owner 2 Nov 2026): the city drawn simply – boundary, main roads,
// railways, rivers – every way out with two names (a town on the way and the big city the road leads to), where the
// hero is, the stations and the municipal cannons. A tap on a dot (or a way out) shows its name, address and
// „🧭 Prowadź”, which sets the guiding arrow (GameScene.prowadzDo). Data: CityMap.plan (scripts/tablice/tablice.mjs).
// The world sleeps while it is open (UIScene.openTablica), so the pulsing „you are here” runs on its own frames.
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
  const karta = otwarta.querySelector('.tb-karta');
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
  font: 700 19px 'Playfair Display', 'Alegreya Sans', serif; letter-spacing: 2px; color: #3a2210; text-transform: uppercase;
  background: linear-gradient(180deg, #f5d98a, #d9a441 45%, #a8742a); border-radius: 3px;
  box-shadow: 0 0 0 2px #1e1a24, inset 0 1px 0 #fff3c4, inset 0 -2px 0 #7a5418; text-shadow: 0 1px 0 #f7e2a2; }
#tablica .tb-gora button { position: absolute; right: 0; top: -2px; width: 40px; height: 40px; border-radius: 50%; border: 2px solid #1e1a24;
  background: radial-gradient(circle at 35% 30%, #f5d98a, #c8962e 60%, #8a6020); color: #2a1808;
  font: 700 20px sans-serif; cursor: pointer; box-shadow: inset 0 -2px 0 #6a4a18; }
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
`;

export function otworzTablice(h: TablicaHost, onClose?: () => void) {
  if (otwarta) zamknijTablice();
  poZamknieciu = onClose ?? null;
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
  const W = Math.floor(Math.min(window.innerWidth - 30, 960));
  const H = Math.floor(Math.min(window.innerHeight - 76, 680));
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ramka.append(gora, canvas);
  root.append(ramka);
  root.onclick = (e) => { if (e.target === root) zamknijTablice(); };
  document.body.append(root);
  otwarta = root;
  window.addEventListener('keydown', klawisz, true);

  const rys = rysujPlan(h, W, H, dpr);
  // For browser tests: what can be tapped (CSS px on the canvas).
  (window as unknown as { __tablica: unknown }).__tablica = rys.cele.map((c) => ({ nazwa: c.p.nazwa, rodzaj: c.p.rodzaj, x: c.box ? (c.box[0] + c.box[2]) / 2 : c.sx, y: c.box ? (c.box[1] + c.box[3]) / 2 : c.sy }));
  const ctx = canvas.getContext('2d')!;
  // The pulse of „you are here” (the game loop sleeps meanwhile).
  const t0 = performance.now();
  const klatka = () => {
    if (otwarta !== root) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(rys.tlo, 0, 0);
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
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgb(${Math.round(120 * t)},${Math.round(78 * t)},${Math.round(44 * t)})`);
    g.addColorStop(1, `rgb(${Math.round(98 * t)},${Math.round(62 * t)},${Math.round(34 * t)})`);
    c.fillStyle = g;
    c.fillRect(0, y, W, h);
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

/** A brass plate with a riveted edge (way-out signs, legend). */
function mosiadz(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.fillStyle = '#1e1a24';
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f5d98a');
  g.addColorStop(0.45, '#d9a441');
  g.addColorStop(1, '#9c6a22');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,243,196,.8)';
  c.lineWidth = 1;
  c.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
}

/** A signpost arrow of brass pointing left or right (the way out's side), names engraved on it. */
function strzalkaMosiezna(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wPrawo: boolean) {
  const czub = Math.min(14, h * 0.6);
  const ksztalt = (o: number) => {
    c.beginPath();
    if (wPrawo) {
      c.moveTo(x - o, y - o); c.lineTo(x + w - czub + o, y - o); c.lineTo(x + w + o, y + h / 2); c.lineTo(x + w - czub + o, y + h + o); c.lineTo(x - o, y + h + o);
    } else {
      c.moveTo(x + w + o, y - o); c.lineTo(x + czub - o, y - o); c.lineTo(x - o, y + h / 2); c.lineTo(x + czub - o, y + h + o); c.lineTo(x + w + o, y + h + o);
    }
    c.closePath();
  };
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.save(); c.translate(3, 3); ksztalt(2); c.fill(); c.restore();
  c.fillStyle = '#1e1a24';
  ksztalt(2); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f8e09a');
  g.addColorStop(0.4, '#dcaa48');
  g.addColorStop(1, '#a06c22');
  c.fillStyle = g;
  ksztalt(0); c.fill();
  c.strokeStyle = 'rgba(255,243,196,.75)';
  c.lineWidth = 1;
  ksztalt(-2.5); c.stroke();
  // Rivets on the flat end.
  const rx = wPrawo ? x + 5 : x + w - 5;
  for (const ry of [y + 5, y + h - 5]) {
    c.fillStyle = '#7a5418'; c.beginPath(); c.arc(rx, ry, 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff1bf'; c.beginPath(); c.arc(rx - 0.5, ry - 0.5, 0.8, 0, Math.PI * 2); c.fill();
  }
}

/** A brass medallion with an icon (stations, cannons). */
function medalion(c: CanvasRenderingContext2D, x: number, y: number, ikona: string, zloty: boolean) {
  c.fillStyle = '#1e1a24';
  c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - 3, y - 4, 1, x, y, 11);
  g.addColorStop(0, zloty ? '#fff1bf' : '#f5e7c8');
  g.addColorStop(1, zloty ? '#c8962e' : '#b89a6a');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 10.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#7a5418';
  c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, 8.5, 0, Math.PI * 2); c.stroke();
  c.font = '12px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#1e1a24';
  c.fillText(ikona, x, y + 1);
}

/** The still part of the board (drawn once) and where its dots and signs landed. */
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
  const tlo = document.createElement('canvas');
  tlo.width = Math.floor(W * dpr);
  tlo.height = Math.floor(H * dpr);
  const c = tlo.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  // The sea (coastal towns): a big blue enamel patch, edges carved round.
  for (const r of P.morza ?? []) {
    const pts = punkty(r);
    c.fillStyle = '#2f6a92';
    gladko(c, pts, true); c.fill();
    c.strokeStyle = '#1e1a24'; c.lineWidth = 2.5;
    gladko(c, pts, true); c.stroke();
  }
  // Lakes: blue enamel patches inlaid in the wood.
  for (const [x, y, a, b, k] of P.jeziora) {
    const [sx, sy] = naEkran(x, y);
    const ra = Math.max(6, a * s), rb = Math.max(4, b * s);
    c.fillStyle = '#1e1a24';
    c.beginPath(); c.ellipse(sx, sy, ra + 2.5, rb + 2.5, k, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(sx - ra * 0.3, sy - rb * 0.4, 1, sx, sy, Math.max(ra, rb));
    g.addColorStop(0, '#8cc4de'); g.addColorStop(1, '#2f6a92');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(sx, sy, ra, rb, k, 0, Math.PI * 2); c.fill();
  }
  // Rivers: an enamel ribbon in a groove.
  for (const r of P.rzeki) { const pts = punkty(r); c.strokeStyle = '#1e1a24'; c.lineWidth = 5; gladko(c, pts); c.stroke(); c.strokeStyle = '#4f93bd'; c.lineWidth = 3; gladko(c, pts); c.stroke(); }
  // Railways: a brass rail with sleepers.
  for (const t of P.tory) { const pts = punkty(t); c.strokeStyle = '#2a1608'; c.lineWidth = 4; gladko(c, pts); c.stroke(); }
  c.setLineDash([3, 4]);
  for (const t of P.tory) { const pts = punkty(t); c.strokeStyle = '#d9a441'; c.lineWidth = 2; gladko(c, pts); c.stroke(); }
  c.setLineDash([]);
  // Main roads: grooves carved into the wood, with a light edge.
  for (const d of P.drogi) { const pts = punkty(d); c.strokeStyle = 'rgba(20,10,4,.9)'; c.lineWidth = 5; gladko(c, pts); c.stroke(); }
  for (const d of P.drogi) { const pts = punkty(d); c.save(); c.translate(1, 1.2); c.strokeStyle = 'rgba(222,170,100,.45)'; c.lineWidth = 1.2; gladko(c, pts); c.stroke(); c.restore(); }

  const cele: { p: PunktTablicy; sx: number; sy: number; box?: [number, number, number, number] }[] = [];
  // Low screens (phones sideways): smaller plates.
  const f = H < 420 ? 0.82 : 1;
  const duza = `700 ${Math.round(14 * f)}px 'Playfair Display', 'Alegreya Sans', serif`, mala = `600 ${Math.round(13 * f)}px 'Alegreya Sans', sans-serif`;
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
  // Ways out: a small gold arrow at the city's edge and a brass signpost arrow with the big city over the town.
  const tabliczki: { x: number; y: number; w: number; h: number; ax: number; ay: number; linie: string[]; w0: (typeof P.wyloty)[number]; prawo: boolean }[] = [];
  for (const w of P.wyloty) {
    const [ex, ey] = naEkran(w[0], w[1]);
    const dx = Math.cos(w[2]), dy = Math.sin(w[2]);
    const ax = ex + dx * 14, ay = ey + dy * 14;
    c.fillStyle = '#f5d98a';
    c.strokeStyle = '#1e1a24';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ax + dx * 9, ay + dy * 9);
    c.lineTo(ax - dy * 6 - dx * 4, ay + dx * 6 - dy * 4);
    c.lineTo(ax + dy * 6 - dx * 4, ay - dx * 6 - dy * 4);
    c.closePath();
    c.fill();
    c.stroke();
    const linie: string[] = [];
    if (w[5]) linie.push(nazwa(w[5], w[6]));
    if (w[3]) linie.push(nazwa(w[3], w[4]));
    c.font = duza;
    const tw = Math.max(...linie.map((l, i) => { c.font = i === 0 && w[5] ? duza : mala; return c.measureText(l).width; })) + 30;
    const th = linie.length * wiersz + 8;
    const cx = ax + dx * (14 + tw / 2 * Math.abs(dx)), cy = ay + dy * (12 + th / 2 * Math.abs(dy));
    tabliczki.push({ x: cx - tw / 2, y: cy - th / 2, w: tw, h: th, ax, ay, linie, w0: w, prawo: dx >= 0 });
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
    // A thin brass wire from the arrow to its sign when they were pushed apart.
    const px = Math.max(t.x, Math.min(t.x + t.w, t.ax)), py = Math.max(t.y, Math.min(t.y + t.h, t.ay));
    if (Math.hypot(px - t.ax, py - t.ay) > 14) {
      c.strokeStyle = '#1e1a24'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(t.ax, t.ay); c.lineTo(px, py); c.stroke();
      c.strokeStyle = '#d9a441'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(t.ax, t.ay); c.lineTo(px, py); c.stroke();
    }
    strzalkaMosiezna(c, t.x, t.y, t.w, t.h, t.prawo);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const srodekX = t.x + t.w / 2 + (t.prawo ? -4 : 4);
    t.linie.forEach((l, i) => {
      c.font = i === 0 && t.w0[5] ? duza : mala;
      const ty = t.y + 4 + wiersz / 2 + i * wiersz;
      // Engraved: a light line under the dark letters.
      c.fillStyle = 'rgba(255,240,190,.75)';
      c.fillText(l, srodekX, ty + 1);
      c.fillStyle = '#3a2210';
      c.fillText(l, srodekX, ty);
    });
    const w = t.w0;
    const imiona = [w[5] && nazwa(w[5], w[6]), w[3] && nazwa(w[3], w[4])].filter(Boolean).join(', ');
    cele.push({ p: { nazwa: tx(`Droga na: ${imiona}`, `Road to: ${imiona}`), x: w[0], y: w[1], rodzaj: 'wylot' }, sx: 0, sy: 0, box: [t.x, t.y, t.x + t.w, t.y + t.h] });
  }
  // Stations and cannons (the pinball „metro”).
  for (const { p, sx, sy } of kropki) {
    medalion(c, sx, sy, p.rodzaj === 'ty' ? '' : IKONA_HUBA[p.rodzaj], p.rodzaj === 'armata');
    cele.push({ p, sx, sy });
  }
  // You are here: a red enamel pin.
  c.fillStyle = '#1e1a24';
  c.beginPath(); c.arc(hx, hy, 8, 0, Math.PI * 2); c.fill();
  const pin = c.createRadialGradient(hx - 2, hy - 2, 1, hx, hy, 7);
  pin.addColorStop(0, '#ff8a80'); pin.addColorStop(1, '#a8141e');
  c.fillStyle = pin;
  c.beginPath(); c.arc(hx, hy, 6.5, 0, Math.PI * 2); c.fill();
  const tu = tx('Tu jesteś', 'You are here');
  c.font = "700 14px 'Alegreya Sans', sans-serif";
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(tu).width + 14;
  mosiadz(c, hx - tw / 2, hy - 30, tw, 18);
  c.fillStyle = '#7a1018';
  c.fillText(tu, hx, hy - 21);
  cele.push({ p: { nazwa: tu, x: h.hero.x, y: h.hero.y, rodzaj: 'ty' }, sx: hx, sy: hy });
  // Legend on a brass strip.
  const legenda = [`${IKONA_HUBA.kolej} ${tx('dworzec', 'station')}`];
  if (h.punkty.some((p) => p.rodzaj === 'armata')) legenda.push(`${IKONA_HUBA.armata} ${tx('metro armatnie', 'cannon metro')}`);
  legenda.push(tx('stuknij znak', 'tap a sign'));
  c.font = "600 13px 'Alegreya Sans', sans-serif";
  c.textAlign = 'left';
  const lt = legenda.join('   ·   ');
  const lw = c.measureText(lt).width + 18;
  mosiadz(c, 8, H - 30, lw, 22);
  c.fillStyle = '#3a2210';
  c.fillText(lt, 17, H - 19);
  return { tlo, naEkran, cele };
}
