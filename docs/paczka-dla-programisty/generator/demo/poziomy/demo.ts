import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, ciemniej, Rodzaj, poleM2, poziomSteampunku, przeswitWyciecie, ksztaltBudynku } from '../../index';
const S = (window as any).SCENA as { W: number; H: number; bud: any[]; areas: any[]; lines: any[] };
const { W, H } = S;
const RODZ: Rodzaj[] = ['trawa', 'plac', 'parking', 'bruk', 'chodnik', 'droga'];
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
g.fillStyle = 'rgb(0,0,0)'; g.fillRect(0, 0, W, H);
const kol = (k: string) => `rgb(${RODZ.indexOf(k as Rodzaj)},0,0)`;
for (const a of S.areas) { g.fillStyle = kol(a.k); g.beginPath(); a.r.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); }
for (const l of S.lines) { const k = ['primary', 'secondary', 'tertiary', 'residential', 'service', 'unclassified', 'living_street'].includes(l.k) ? 'bruk' : 'chodnik';
  g.strokeStyle = kol(k); g.lineWidth = l.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); l.p.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
const id = g.getImageData(0, 0, W, H).data; const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = Math.min(RODZ.length - 1, id[k * 4]);
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? null : RODZ[M[(y | 0) * W + (x | 0)]]);
const pieter = (b: any) => { const v = parseFloat(String(b.lv ?? '')); if (v > 0) return Math.round(v); return poleM2(b.r.flat()) > 300 ? 3 : 1; };
const dzis = (n: number) => (n <= 1 ? 8 : n === 2 ? 12 : 16);
const budynki = S.bud.filter((b) => b.r.length > 3 && poleM2(b.r.flat()) > 12).map((b, i) => ({ ...b, i, maxY: Math.max(...b.r.map((p: number[]) => p[1])), m2: poleM2(b.r.flat()) }));
const hero = document.getElementById('hero') as HTMLImageElement;
const ks = (b: any) => ksztaltBudynku(pieter(b), b.m2);
// bohaterka: przy południowej ścianie najdłuższego wysokiego bloku (na chodniku przed nim) i druga – za nim (prześwit)
const wnetrze = (r: number[][], x: number, y: number) => { let w = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w; } return w; };
const CEL = (window as any).CEL ?? [520, 660];
const srodek = (b: any) => [b.r.reduce((s: number, p: number[]) => s + p[0], 0) / b.r.length, b.r.reduce((s: number, p: number[]) => s + p[1], 0) / b.r.length];
const blok = budynki.filter((b) => pieter(b) >= 4).sort((a, b) => Math.hypot(srodek(a)[0] - CEL[0], srodek(a)[1] - CEL[1]) - Math.hypot(srodek(b)[0] - CEL[0], srodek(b)[1] - CEL[1]))[0];
const sc = ks(blok).wysokosc;
const dolKolumny = (x: number) => { let y = -1; for (let yy = 0; yy < H; yy++) if (wnetrze(blok.r, x, yy)) y = yy; return y; };
const mx = CEL[0], my = dolKolumny(CEL[0]);
const PRZED = [Math.round(mx - 30 + 0.35 * sc), my + sc + 16];
const x2 = mx + 40, ZA = [Math.round(x2 + 0.35 * sc * 0.55), dolKolumny(x2) + Math.round(sc * 0.55)];
console.log('blok', pieter(blok), blok.m2 | 0, JSON.stringify(ks(blok)), PRZED, ZA);
function scena(war: 'dzis' | 'nowa', noc = false): HTMLCanvasElement {
  const wys = (b: any) => (war === 'dzis' ? dzis(Math.min(3, pieter(b))) : ks(b).wysokosc);
  const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(o, q.x, q.y, q.rodzaj, q.seed);
  const cien = new Uint8Array(W * H); budynki.forEach((b) => cienBudynku(b.r.flat(), wys(b), cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  const lista = budynki.slice().sort((a, b) => a.maxY + wys(a) - b.maxY - wys(b));
  const obiekty: { im: Obraz; x: number; y: number; baza: number }[] = [];
  lista.forEach((b) => { const k = ks(b); const r = budynek(b.r.flat(), { wysokosc: wys(b), poziom: war === 'dzis' ? undefined : k.poziom, dach: ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'gont', 'blacha_zielona'][b.i % 5], sciana: ['tynk_kremowy', 'cegla', 'tynk_zolty', 'kamien', 'tynk_szary', 'drewno'][b.i % 6], seed: b.i * 13 + 1, steampunk: poziomSteampunku('duze', b.m2, b.i * 97), komin: true, noc,
      drzwi: war === 'nowa' ? [b.r[0][0] * 0.5 + b.r[1][0] * 0.5, b.r[0][1] * 0.5 + b.r[1][1] * 0.5] as [number, number] : undefined });
    obiekty.push({ im: r.obraz, x: r.x0, y: r.y0, baza: b.maxY + wys(b) }); });
  const c = doCanvas(o), x = c.getContext('2d')!;
  const ludzie: number[][] = [];
  const zakrywa = (w: typeof obiekty[number], hx: number, hy: number) => { const i = hx - w.x, j = hy - 3 - w.y; return i >= 0 && j >= 0 && i < w.im.w && j < w.im.h && (w.im.px[j * w.im.w + i] >>> 24) !== 0; };
  for (const w of obiekty) if (!ludzie.some(([hx, hy]) => zakrywa(w, hx, hy))) x.drawImage(doCanvas(w.im), w.x, w.y);
  for (const [hx, hy] of ludzie) x.drawImage(hero, 32, 0, 32, 32, hx - 24, hy - 46, 48, 48);
  for (const w of obiekty) for (const [hx, hy] of ludzie) if (zakrywa(w, hx, hy)) x.drawImage(doCanvas(war === 'nowa' ? przeswitWyciecie(w.im, w.x, w.y, hx, hy) : w.im), w.x, w.y);
  return c;
}
function pokaz(t: string, c: HTMLCanvasElement, k: number, kadr: number[]) {
  const b = document.createElement('canvas'); b.width = kadr[2] * k; b.height = kadr[3] * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false;
  x.drawImage(c, kadr[0], kadr[1], kadr[2], kadr[3], 0, 0, b.width, b.height);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
const start = () => {
  const cal = [0, 0, W, H];
  pokaz('Dziś: osiedle bloków w Lublinie (11–12 pięter = 16 px ściany, okienka co 7 px)', scena('dzis'), 1, cal);
  pokaz('Nowe: 1–3 piętra = 1 poziom, wyżej 2 poziomy; duże okna, drzwi, mur pruski, okiennice', scena('nowa'), 1, cal);
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
