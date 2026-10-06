import { nowy, naloz, doCanvas, malujPodloze, budynek, cienBudynku, ciemniej, Rodzaj, ksztaltBudynku, przeswitWyciecie, poleM2, hash, Obraz } from '../../index';
const W = 430, H = 250;
const rodzajW = (x: number, y: number): Rodzaj | null => (x < 0 || y < 0 || x >= W || y >= H ? null : y > 196 ? 'bruk' : y > 168 ? 'chodnik' : 'trawa');
const ziarno = (warunek: (s: number) => boolean, od: number) => { let s = od; while (!warunek(s)) s++; return s; };
const DOMY = [
  { n: 'blok 11 pięter', r: [16, 52, 250, 52, 250, 100, 16, 100], pietra: 11, dach: 'dachowka_brazowa', sciana: 'tynk_kremowy', seed: ziarno((s) => hash(s, 3, 11) < 0.45, 40), drzwi: [92, 100] },
  { n: 'kamienica 3 piętra', r: [268, 70, 336, 70, 336, 112, 268, 112], pietra: 3, dach: 'dachowka_czerwona', sciana: 'cegla', seed: 7, drzwi: [300, 112] },
  { n: 'domek', r: [354, 86, 404, 86, 404, 120, 354, 120], pietra: 1, dach: 'gont', sciana: 'tynk_zolty', seed: ziarno((s) => hash(s, 3, 11) >= 0.45 && hash(s, 5, 13) < 0.5, 3), drzwi: [372, 120] },
];
const hero = document.getElementById('hero') as HTMLImageElement;
const dzis = (n: number) => (n <= 1 ? 8 : n === 2 ? 12 : 16);
function scena(war: 'dzis' | 'nowa', noc = false, zaBlokiem = false) {
  const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW);
  const wl = DOMY.map((d) => { const k = ksztaltBudynku(d.pietra, poleM2(d.r)); return war === 'dzis' ? { wysokosc: dzis(Math.min(3, d.pietra)), poziom: undefined } : { wysokosc: k.wysokosc, poziom: k.poziom }; });
  const cien = new Uint8Array(W * H); DOMY.forEach((d, i) => cienBudynku(d.r, wl[i].wysokosc, cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  const ob = DOMY.map((d, i) => { const r = budynek(d.r, { ...wl[i], dach: d.dach, sciana: d.sciana, seed: d.seed, komin: true, noc, drzwi: d.drzwi as [number, number] }); return { im: r.obraz, x: r.x0, y: r.y0 }; });
  const c = doCanvas(o), x = c.getContext('2d')!;
  const blokH = wl[0].wysokosc, ludzie = zaBlokiem ? [[150, 186], [196, 100 + Math.round(blokH * 0.6)]] : [[150, 186]];
  const zakrywa = (w: { im: Obraz; x: number; y: number }, hx: number, hy: number) => { const i = hx - w.x, j = hy - 3 - w.y; return i >= 0 && j >= 0 && i < w.im.w && j < w.im.h && (w.im.px[j * w.im.w + i] >>> 24) !== 0; };
  for (const w of ob) if (!ludzie.some(([hx, hy]) => zakrywa(w, hx, hy))) x.drawImage(doCanvas(w.im), w.x, w.y);
  for (const [hx, hy] of ludzie) x.drawImage(hero, 32, 0, 32, 32, hx - 24, hy - 46, 48, 48);
  for (const w of ob) for (const [hx, hy] of ludzie) if (zakrywa(w, hx, hy)) x.drawImage(doCanvas(war === 'nowa' ? przeswitWyciecie(w.im, w.x, w.y, hx, hy) : w.im), w.x, w.y);
  if (noc) { x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(90,100,160)'; x.fillRect(0, 0, W, H); }
  return c;
}
function pokaz(t: string, c: HTMLCanvasElement, k = 3) {
  const b = document.createElement('canvas'); b.width = W * k; b.height = H * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, b.width, b.height);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
const start = () => {
  pokaz('Dziś: blok 11 pięter, kamienica, domek – małe okienka co 7 px', scena('dzis'));
  pokaz('Nowe: blok = 2 duże poziomy (tu: karczma z muru pruskiego), kamienica i domek = 1 poziom', scena('nowa'));
  pokaz('Nowe: druga bohaterka za blokiem – wycięcie z konturem (wariant E)', scena('nowa', false, true));
  pokaz('Nowe, noc', scena('nowa', true));
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
