import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, ciemniej, Rodzaj, poleM2 } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
const S = (window as any).SCENA as { W: number; H: number; bud: any[]; areas: any[]; lines: any[] };
const { W, H } = S;
const RODZ: Rodzaj[] = ['trawa', 'plac', 'parking', 'bruk', 'chodnik', 'droga'];
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
g.fillStyle = 'rgb(4,0,0)'; g.fillRect(0, 0, W, H);
const kol = (k: string) => `rgb(${RODZ.indexOf(k as Rodzaj)},0,0)`;
for (const a of S.areas) { g.fillStyle = kol(a.k); g.beginPath(); a.r.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); }
for (const l of S.lines) { const k = ['primary', 'secondary', 'tertiary', 'residential', 'living_street', 'service'].includes(l.k) ? 'bruk' : ['footway', 'pedestrian', 'steps', 'cycleway'].includes(l.k) ? 'chodnik' : 'droga';
  g.strokeStyle = kol(k); g.lineWidth = l.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); l.p.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
const id = g.getImageData(0, 0, W, H).data; const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = Math.min(RODZ.length - 1, id[k * 4]);
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? null : RODZ[M[(y | 0) * W + (x | 0)]]);
const pieter = (b: any) => { const v = parseFloat(String(b.lv ?? '')); if (v > 0) return Math.round(v); return poleM2(b.r.flat()) > 300 ? 3 : 2; };
const WAR: Record<string, (n: number) => number> = {
  dzis: (n) => (n <= 1 ? 8 : n === 2 ? 12 : 16),
  do4: (n) => 8 + 4 * (Math.min(n, 4) - 1),
  do6: (n) => 8 + 4 * (Math.min(n, 6) - 1),
};
function scena(w: (n: number) => number): Obraz {
  const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(o, q.x, q.y, q.rodzaj, q.seed);
  const lista = S.bud.map((b, i) => ({ ...b, i, maxY: Math.max(...b.r.map((p: number[]) => p[1])) })).sort((a, b) => a.maxY - b.maxY);
  const cien = new Uint8Array(W * H); lista.forEach((b) => cienBudynku(b.r.flat(), w(pieter(b)), cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  lista.forEach((b) => { const r = budynek(b.r.flat(), { wysokosc: w(pieter(b)), dach: ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'blacha_zielona', 'papa'][b.i % 5], sciana: ['tynk_kremowy', 'tynk_zolty', 'tynk_szary', 'cegla', 'kamien'][b.i % 5], seed: b.i * 13, komin: b.i % 3 === 0 }); naloz(o, r.obraz, r.x0, r.y0); });
  return o;
}
function wyciete(o: Obraz, x: number, y: number, w: number, h: number) { const c = nowy(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.px[j * w + i] = o.px[(y + j) * o.w + x + i]; return c; }
const hero = document.getElementById('hero') as HTMLImageElement;
function pokaz(t: string, o: Obraz, k: number, hx: number, hy: number) {
  const c = doCanvas(o), b = document.createElement('canvas'); b.width = o.w * k; b.height = o.h * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, b.width, b.height);
  x.drawImage(hero, 32, 0, 32, 32, (hx - 24) * k, (hy - 46) * k, 48 * k, 48 * k);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
const start = () => {
  const cx = 1340, cy = 900, cw = 560, ch = 460; const P = (window as any).HERO || [250, 250];
  pokaz('Dziś: 1 piętro 8 px, 2 → 12, 3 i więcej → 16', wyciete(scena(WAR.dzis), cx, cy, cw, ch), 2, P[0], P[1]);
  pokaz('Do 4 pięter: +4 px na piętro (20 px)', wyciete(scena(WAR.do4), cx, cy, cw, ch), 2, P[0], P[1]);
  pokaz('Do 6 pięter: +4 px na piętro (28 px)', wyciete(scena(WAR.do6), cx, cy, cw, ch), 2, P[0], P[1]);
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
