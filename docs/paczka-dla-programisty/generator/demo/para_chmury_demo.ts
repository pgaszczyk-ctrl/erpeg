import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, ciemniej, Rodzaj, poziomSteampunku, poleM2, para, klatkaPary, teksturaChmur, ZrodloPary } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
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
const baza = nowy(W, H); malujPodloze(baza, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(baza, q.x, q.y, q.rodzaj, q.seed);
const lista = S.bud.map((b, i) => ({ ...b, i, maxY: Math.max(...b.r.map((p: number[]) => p[1])) })).sort((a, b) => a.maxY - b.maxY);
const cien = new Uint8Array(W * H); lista.forEach((b) => cienBudynku(b.r.flat(), wys(b), cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) baza.px[k] = ciemniej(baza.px[k]);
const zrodla: ZrodloPary[] = [];
lista.forEach((b) => { const ring = b.r.flat(), sp = poziomSteampunku('duze', poleM2(ring), b.i * 977);
  const dach = b.rc === 'green' ? 'miedz_patyna' : ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'blacha_zielona'][b.i % 4];
  const r = budynek(ring, { wysokosc: wys(b), dach, sciana: ['tynk_kremowy', 'tynk_zolty', 'tynk_szary', 'cegla', 'kamien'][b.i % 5], seed: b.i * 13, komin: sp > 0 || b.i % 3 === 0, steampunk: sp });
  naloz(baza, r.obraz, r.x0, r.y0); zrodla.push(...r.para); });
const chmury = teksturaChmur(0.45, 3);
const cx = 0, cy = 830, cw = 520, ch = 440;
(window as any).klatka = (t: number) => {
  const o = nowy(cw, ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) o.px[j * cw + i] = baza.px[(cy + j) * W + cx + i];
  for (const z of zrodla) { const k = klatkaPary(z, t); if (k < 0) continue; const rr = z.rozmiar; naloz(o, klatki[rr === 16 ? 0 : rr === 24 ? 1 : 2][k], Math.round(z.x - rr / 2 - cx), Math.round(z.y - rr - cy - k * 2)); }
  // cienie chmur: tekstura przesuwana z wiatrem (tu 9 px/s w prawo, 3 px/s w dół), mnożona
  const dx = Math.floor(t * 9), dy = Math.floor(t * 3), C = chmury.w;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const m = chmury.px[(((j + cy - dy) % C + C) % C) * C + (((i + cx - dx) % C + C) % C)]; if ((m & 255) === 255) continue;
    const c = o.px[j * cw + i], f = (m & 255) / 255, fb = ((m >>> 16) & 255) / 255; o.px[j * cw + i] = (255 << 24 | Math.round(((c >>> 16) & 255) * fb) << 16 | Math.round(((c >>> 8) & 255) * f) << 8 | Math.round((c & 255) * f)) >>> 0; }
  return doCanvas(o).toDataURL();
};
(window as any).__ok = true;
