import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, ciemniej, Rodzaj, poziomSteampunku, poleM2, para, WielkoscMiasta } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
const S = (window as any).SCENA as { W: number; H: number; bud: any[]; areas: any[]; lines: any[] };
const { W, H } = S;
const RODZ: Rodzaj[] = ['trawa', 'plac', 'parking', 'bruk', 'chodnik', 'droga'];
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
g.fillStyle = 'rgb(1,0,0)'; g.fillRect(0, 0, W, H);
const kol = (k: string) => `rgb(${RODZ.indexOf(k as Rodzaj)},0,0)`;
for (const a of S.areas) { g.fillStyle = kol(a.k); g.beginPath(); a.r.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); }
for (const l of S.lines) { const k = ['primary', 'secondary', 'residential', 'construction', 'living_street', 'service'].includes(l.k) ? 'bruk' : ['footway', 'pedestrian', 'steps', 'cycleway'].includes(l.k) ? 'chodnik' : 'droga';
  g.strokeStyle = kol(k); g.lineWidth = l.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); l.p.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
const id = g.getImageData(0, 0, W, H).data; const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = Math.min(RODZ.length - 1, id[k * 4]);
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? null : RODZ[M[(y | 0) * W + (x | 0)]]);
const wys = (b: any) => (+(b.lv || 2) >= 3 ? 16 : +(b.lv || 2) >= 2 ? 12 : 8);
const klatki = [16, 24, 32].map((r) => Array.from({ length: 6 }, (_, k) => para(r, k)));
function scena(miasto: WielkoscMiasta | null): [Obraz, number[]] {
  const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(o, q.x, q.y, q.rodzaj, q.seed);
  const lista = S.bud.map((b, i) => ({ ...b, i, maxY: Math.max(...b.r.map((p: number[]) => p[1])) })).sort((a, b) => a.maxY - b.maxY);
  const cien = new Uint8Array(W * H); lista.forEach((b) => cienBudynku(b.r.flat(), wys(b), cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  const ile = [0, 0, 0, 0], pary: [number, number, number][] = [];
  lista.forEach((b) => { const ring = b.r.flat(), sp = miasto ? poziomSteampunku(miasto, poleM2(ring), b.i * 977) : 0; ile[sp]++;
    const dach = b.rc === 'green' ? 'miedz_patyna' : ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'blacha_zielona'][b.i % 4];
    const r = budynek(ring, { wysokosc: wys(b), dach, sciana: ['tynk_kremowy', 'tynk_zolty', 'tynk_szary', 'cegla', 'kamien'][b.i % 5], seed: b.i * 13, komin: sp > 0 || b.i % 3 === 0, steampunk: sp });
    naloz(o, r.obraz, r.x0, r.y0); pary.push(...r.para); });
  pary.sort((a, b) => a[1] - b[1]).forEach(([x, y, rr], k) => { const zest = klatki[rr === 16 ? 0 : rr === 24 ? 1 : 2]; for (let p = 2; p >= 0; p--) { const kl = zest[Math.min(5, p * 2 + (k % 2))]; naloz(o, kl, Math.round(x - rr / 2 + p * 3), Math.round(y - rr - p * rr * 0.55)); } }); // pióropusz: 3 obłoczki
  return [o, ile];
}
function wyciete(o: Obraz, x: number, y: number, w: number, h: number) { const c = nowy(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.px[j * w + i] = o.px[(y + j) * o.w + x + i]; return c; }
const hero = document.getElementById('hero') as HTMLImageElement;
function pokaz(t: string, o: Obraz, k: number) {
  const c = doCanvas(o), b = document.createElement('canvas'); b.width = o.w * k; b.height = o.h * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, b.width, b.height);
  x.drawImage(hero, 32, 0, 32, 32, (o.w * 0.5 - 24) * k, (o.h * 0.6 - 46) * k, 48 * k, 48 * k);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
function galeria() {
  const o = nowy(780, 300); malujPodloze(o, 0, 0, (x, y) => (x < 0 || y < 0 || x >= 780 || y >= 300 ? null : 'bruk'));
  const pary: [number, number, number][] = [];
  const ksz = [[0, 0, 74, 0, 74, 46, 0, 46], [0, 0, 60, 0, 60, 26, 30, 26, 30, 56, 0, 56], [0, 0, 84, 0, 84, 40, 0, 40]];
  let k = 0;
  for (let rz = 0; rz < 2; rz++) for (let i = 0; i < 6; i++) {
    const r = ksz[(i + rz) % 3].map((v, q) => v + (q % 2 ? 40 + rz * 140 : 20 + i * 122));
    const sp = (rz === 0 ? [1, 2, 2, 3, 3, 3] : [3, 3, 3, 2, 3, 1])[i] as 0 | 1 | 2 | 3;
    const b = budynek(r, { wysokosc: [12, 16, 16, 12, 16, 8][i], dach: ['lupek', 'dachowka_czerwona', 'blacha_zielona', 'dachowka_brazowa', 'miedz_patyna', 'gont'][i], sciana: ['cegla', 'tynk_kremowy', 'kamien', 'tynk_zolty', 'cegla', 'drewno'][i], seed: 300 + k++ * 37, komin: true, steampunk: sp });
    naloz(o, b.obraz, b.x0, b.y0); pary.push(...b.para);
  }
  pary.forEach(([x, y, rr], q) => { const kl = klatki[rr === 16 ? 0 : rr === 24 ? 1 : 2][q % 3]; naloz(o, kl, Math.round(x - rr / 2), Math.round(y - rr)); });
  return o;
}
const start = () => {
  const gal = galeria(); pokaz('Zbliżenie 1', wyciete(gal, 250, 0, 260, 150), 4); pokaz('Zbliżenie 2', wyciete(gal, 0, 140, 260, 160), 4); pokaz('Zbliżenie 3', wyciete(gal, 250, 140, 260, 160), 4); pokaz('Zbliżenie 4', wyciete(gal, 500, 0, 260, 150), 4);
  const cx = 0, cy = 830, cw = 520, ch = 440;
  for (const [nazwa, m] of [['Bez steampunku', null], ['Duże miasto', 'duze'], ['Średnie miasto', 'srednie'], ['Wieś', 'wies']] as [string, WielkoscMiasta | null][]) {
    const [o, ile] = scena(m); pokaz(`${nazwa} – budynki wg poziomu 0/1/2/3: ${ile.join(' / ')}`, wyciete(o, cx, cy, cw, ch), 3); }
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
