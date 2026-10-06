import { nowy, naloz, doCanvas, malujPodloze, budynek, cienBudynku, ciemniej, Rodzaj } from '../../index';
const W = 240, H = 170;
const rodzajW = (x: number, y: number): Rodzaj | null => (x < 0 || y < 0 || x >= W || y >= H ? null : y > 118 ? 'bruk' : y > 96 ? 'chodnik' : 'plac');
const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW);
const domy = [
  { r: [14, 22, 112, 22, 112, 70, 14, 70], h: 16, dach: 'dachowka_brazowa', sciana: 'tynk_kremowy', seed: 7 },
  { r: [128, 30, 226, 30, 226, 74, 128, 74], h: 12, dach: 'lupek', sciana: 'cegla', seed: 21 },
];
const cien = new Uint8Array(W * H); for (const d of domy) cienBudynku(d.r, d.h, cien, W, H, 0, 0);
for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
for (const d of domy) { const b = budynek(d.r, { wysokosc: d.h, dach: d.dach as any, sciana: d.sciana as any, seed: d.seed, komin: true }); naloz(o, b.obraz, b.x0, b.y0); }
const c = doCanvas(o); c.id = 'scena'; document.body.appendChild(c); (window as any).__ok = true;
