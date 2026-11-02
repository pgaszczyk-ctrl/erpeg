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
#tablica .tb-ramka { position: relative; display: flex; flex-direction: column; background: #5a3a22; padding: 6px;
  box-shadow: 0 0 0 2px #1e1a24, 0 0 0 5px #c8a24a, 0 0 0 7px #1e1a24, 8px 8px 0 7px rgba(0,0,0,.45); }
#tablica .tb-gora { display: flex; align-items: center; gap: 8px; color: #f6e6c2; font: 700 18px 'Alegreya Sans', sans-serif; padding: 0 2px 6px 6px; }
#tablica .tb-gora span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#tablica .tb-gora button { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #1e1a24; background: #c8a24a; color: #1e1a24;
  font: 700 20px sans-serif; cursor: pointer; box-shadow: inset 0 -3px 0 #8a6a2a, inset 0 2px 0 #f2d488; }
#tablica canvas { display: block; touch-action: none; cursor: pointer; box-shadow: 0 0 0 2px #1e1a24; }
#tablica .tb-karta { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); width: min(92%, 360px);
  background: #3a2a1c; color: #f6e6c2; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
  font: 16px 'Alegreya Sans', sans-serif; box-shadow: 0 0 0 2px #1e1a24, 0 0 0 4px #c8a24a, 0 0 0 6px #1e1a24, 5px 5px 0 6px rgba(0,0,0,.4); }
#tablica .tb-karta b { font-size: 18px; }
#tablica .tb-karta small { opacity: .8; font-size: 14px; }
#tablica .tb-karta div { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
#tablica .tb-karta button { font: 700 16px 'Alegreya Sans', sans-serif; min-height: 44px; padding: 0 14px; border: 2px solid #1e1a24;
  background: #c8a24a; color: #1e1a24; cursor: pointer; box-shadow: inset 0 -3px 0 #8a6a2a; }
#tablica .tb-karta button.tb-cicho { background: #6f8f7a; min-width: 44px; }
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
  const m = Math.hypot(p.x - h.hero.x, p.y - h.hero.y) / PX_PER_M;
  const s = document.createElement('small');
  s.textContent = p.rodzaj === 'ty' ? tx('Tu jesteś', 'You are here') : m < 1000 ? tx(`${Math.round(m / 10) * 10} m stąd`, `${Math.round(m / 10) * 10} m away`) : tx(`${(m / 1000).toFixed(1).replace('.', ',')} km stąd`, `${(m / 1000).toFixed(1)} km away`);
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
  const tlo = document.createElement('canvas');
  tlo.width = Math.floor(W * dpr);
  tlo.height = Math.floor(H * dpr);
  const c = tlo.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Parchment.
  c.fillStyle = '#efe2b8';
  c.fillRect(0, 0, W, H);
  const sciezka = (pts: number[], od = 0) => {
    c.beginPath();
    for (let i = od; i + 1 < pts.length; i += 2) {
      const [a, b] = naEkran(pts[i], pts[i + 1]);
      if (i === od) c.moveTo(a, b); else c.lineTo(a, b);
    }
  };
  // The city.
  c.fillStyle = '#e2d1a2';
  for (const r of P.granica) { sciezka(r); c.closePath(); c.fill(); }
  c.setLineDash([6, 4]);
  c.strokeStyle = '#8a6a3a';
  c.lineWidth = 1.5;
  for (const r of P.granica) { sciezka(r); c.closePath(); c.stroke(); }
  c.setLineDash([]);
  // Water.
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const w of P.woda) {
    if (w.length % 2) { c.fillStyle = '#9cc8e0'; sciezka(w, 1); c.closePath(); c.fill(); }
    else { c.strokeStyle = '#5aa0d0'; c.lineWidth = 2.2; sciezka(w); c.stroke(); }
  }
  // Railways: a dark line with light dashes.
  for (const t of P.tory) { c.strokeStyle = '#4a3a30'; c.lineWidth = 3; sciezka(t); c.stroke(); }
  c.setLineDash([4, 4]);
  for (const t of P.tory) { c.strokeStyle = '#efe2b8'; c.lineWidth = 1.2; sciezka(t); c.stroke(); }
  c.setLineDash([]);
  // Roads: medium thin, then the main ones with an ink edge.
  for (const d of P.drogi) if (!d[0]) { c.strokeStyle = '#b89c66'; c.lineWidth = 1.4; sciezka(d, 1); c.stroke(); }
  for (const d of P.drogi) if (d[0]) { c.strokeStyle = '#1e1a24'; c.lineWidth = 4.6; sciezka(d, 1); c.stroke(); }
  for (const d of P.drogi) if (d[0]) { c.strokeStyle = '#f0c060'; c.lineWidth = 2.6; sciezka(d, 1); c.stroke(); }

  const cele: { p: PunktTablicy; sx: number; sy: number; box?: [number, number, number, number] }[] = [];
  // Low screens (phones sideways): smaller plates.
  const f = H < 420 ? 0.82 : 1;
  const duza = `700 ${Math.round(14 * f)}px 'Alegreya Sans', sans-serif`, mala = `600 ${Math.round(13 * f)}px 'Alegreya Sans', sans-serif`;
  const wiersz = 17 * f;
  // Dots on the board (the city and a little around it): the plates keep clear of them.
  const kropki: { p: PunktTablicy; sx: number; sy: number }[] = [];
  const [hx, hy] = naEkran(h.hero.x, h.hero.y);
  for (const p of h.punkty) {
    if (p.x < x0 - (x1 - x0) * 0.08 || p.x > x1 + (x1 - x0) * 0.08 || p.y < y0 - (y1 - y0) * 0.08 || p.y > y1 + (y1 - y0) * 0.08) continue;
    const [sx, sy] = naEkran(p.x, p.y);
    kropki.push({ p, sx, sy });
  }
  const przeszkody = [...kropki.map((k) => [k.sx - 12, k.sy - 12, k.sx + 12, k.sy + 12]), [hx - 36, hy - 26, hx + 36, hy + 10]];
  // Ways out: an arrow at the edge and a green plate with the big city over the town on the way.
  c.font = duza;
  const tabliczki: { x: number; y: number; w: number; h: number; ax: number; ay: number; linie: string[]; w0: (typeof P.wyloty)[number] }[] = [];
  for (const w of P.wyloty) {
    const [ex, ey] = naEkran(w[0], w[1]);
    const dx = Math.cos(w[2]), dy = Math.sin(w[2]);
    // Arrow.
    const ax = ex + dx * 16, ay = ey + dy * 16;
    c.fillStyle = '#c8a24a';
    c.strokeStyle = '#1e1a24';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ax + dx * 9, ay + dy * 9);
    c.lineTo(ax - dy * 7 - dx * 4, ay + dx * 7 - dy * 4);
    c.lineTo(ax + dy * 7 - dx * 4, ay - dx * 7 - dy * 4);
    c.closePath();
    c.fill();
    c.stroke();
    const linie: string[] = [];
    if (w[6]) linie.push(`${nazwa(w[6], w[7])} ${w[8]}`);
    if (w[3]) linie.push(`${nazwa(w[3], w[4])} ${w[5]}`);
    const tw = Math.max(...linie.map((l) => c.measureText(l).width)) + 14;
    const th = linie.length * wiersz + 6;
    // The plate's centre beyond the arrow, pushed out along it.
    const cx = ax + dx * (14 + tw / 2 * Math.abs(dx)), cy = ay + dy * (12 + th / 2 * Math.abs(dy));
    tabliczki.push({ x: cx - tw / 2, y: cy - th / 2, w: tw, h: th, ax, ay, linie, w0: w });
  }
  // Plates don't overlap each other and stay on the board.
  for (let it = 0; it < 30; it++) {
    for (const a of tabliczki) {
      a.x = Math.max(4, Math.min(W - 4 - a.w, a.x));
      a.y = Math.max(4, Math.min(H - 4 - a.h, a.y));
    }
    for (let i = 0; i < tabliczki.length; i++)
      for (let j = i + 1; j < tabliczki.length; j++) {
        const a = tabliczki[i], b = tabliczki[j];
        const ox2 = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + 3;
        const oy2 = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + 3;
        if (ox2 <= 0 || oy2 <= 0) continue;
        if (oy2 < ox2) { const d = oy2 / 2 * (a.y < b.y ? -1 : 1); a.y += d; b.y -= d; }
        else { const d = ox2 / 2 * (a.x < b.x ? -1 : 1); a.x += d; b.x -= d; }
      }
    // The dots stay put; a plate on one moves off it the short way.
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
    // A thin line from the arrow to its plate when they were pushed apart.
    const px = Math.max(t.x, Math.min(t.x + t.w, t.ax)), py = Math.max(t.y, Math.min(t.y + t.h, t.ay));
    if (Math.hypot(px - t.ax, py - t.ay) > 14) {
      c.strokeStyle = '#1e5a3a';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(t.ax, t.ay); c.lineTo(px, py); c.stroke();
    }
    c.fillStyle = '#1e1a24';
    c.fillRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4);
    c.fillStyle = '#1f6e43';
    c.fillRect(t.x, t.y, t.w, t.h);
    c.strokeStyle = '#f6e6c2';
    c.lineWidth = 1;
    c.strokeRect(t.x + 2.5, t.y + 2.5, t.w - 5, t.h - 5);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    t.linie.forEach((l, i) => {
      c.font = i === 0 && t.w0[6] ? duza : mala;
      c.fillText(l, t.x + 7, t.y + 3 + wiersz / 2 + i * wiersz);
    });
    const w = t.w0;
    const imiona = [w[6] && nazwa(w[6], w[7]), w[3] && nazwa(w[3], w[4])].filter(Boolean).join(', ');
    cele.push({ p: { nazwa: tx(`Droga na: ${imiona}`, `Road to: ${imiona}`), x: w[0], y: w[1], rodzaj: 'wylot' }, sx: 0, sy: 0, box: [t.x, t.y, t.x + t.w, t.y + t.h] });
  }
  // Stations and cannons.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const { p, sx, sy } of kropki) {
    c.fillStyle = p.rodzaj === 'armata' ? '#f2d488' : '#ffffff';
    c.strokeStyle = '#1e1a24';
    c.lineWidth = 2;
    c.beginPath(); c.arc(sx, sy, 10, 0, Math.PI * 2); c.fill(); c.stroke();
    c.font = '12px sans-serif';
    c.fillStyle = '#1e1a24';
    c.fillText(p.rodzaj === 'ty' ? '' : IKONA_HUBA[p.rodzaj], sx, sy + 1);
    cele.push({ p, sx, sy });
  }
  // You are here.
  c.fillStyle = '#e43b44';
  c.strokeStyle = '#1e1a24';
  c.lineWidth = 2;
  c.beginPath(); c.arc(hx, hy, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  c.font = "700 14px 'Alegreya Sans', sans-serif";
  c.lineWidth = 4;
  c.strokeStyle = '#efe2b8';
  c.fillStyle = '#9a1e28';
  const tu = tx('Tu jesteś', 'You are here');
  c.strokeText(tu, hx, hy - 16);
  c.fillText(tu, hx, hy - 16);
  cele.push({ p: { nazwa: tu, x: h.hero.x, y: h.hero.y, rodzaj: 'ty' }, sx: hx, sy: hy });
  // Legend.
  const legenda = [`● ${tu}`, `${IKONA_HUBA.kolej} ${tx('dworzec', 'station')}`];
  if (h.punkty.some((p) => p.rodzaj === 'armata')) legenda.push(`${IKONA_HUBA.armata} ${tx('armata', 'cannon')}`);
  legenda.push(tx('stuknij kropkę', 'tap a dot'));
  c.font = "600 13px 'Alegreya Sans', sans-serif";
  c.textAlign = 'left';
  const lt = legenda.join('   ');
  const lw = c.measureText(lt).width + 12;
  c.fillStyle = 'rgba(239,226,184,.9)';
  c.fillRect(6, H - 26, lw, 20);
  c.fillStyle = '#3a2a1c';
  c.fillText(lt, 12, H - 16);
  return { tlo, naEkran, cele };
}
