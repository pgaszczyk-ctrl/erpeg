// Podgląd śniegu z generatora (bez gry): node node_modules/rolldown/bin/cli.mjs scripts/podglad-sniegu.ts --file .cache/snieg.mjs --format esm --platform node && node .cache/snieg.mjs wynik.png
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { budynek } from '../src/gen/budynki';
import { malujPodloze, type Rodzaj } from '../src/gen/podloze';
import { osniezPodloze, osniezKorone, pokrycieZCm } from '../src/gen/snieg';
import { drzewoZ } from '../src/map/drzewa09';
import { nowy } from '../src/gen/wspolne';
const out = process.argv[2];
const CM = [0, 2, 6, 20];
const PW = 240, PH = 170, W = PW * CM.length, H = PH;
const px = new Uint32Array(W * H);
const blend = (d: number, c: number) => { const t = (c >>> 24) / 255, m = (s: number) => Math.round(((d >>> s) & 255) + (((c >>> s) & 255) - ((d >>> s) & 255)) * t); return ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0; };
CM.forEach((cm, n) => {
  const p = pokrycieZCm(cm), X0 = n * PW;
  const o = nowy(PW, PH);
  const rodzaj = (x: number, y: number): Rodzaj => { const lx = x - X0; return y > 120 && y < 138 ? 'droga' : y >= 138 && y < 144 ? 'chodnik' : lx > 170 && y < 110 ? 'las_iglasty' : 'trawa'; };
  malujPodloze(o, X0, 0, rodzaj);
  if (p) osniezPodloze(o, X0, 0, rodzaj, () => p);
  const put = (src: { w: number; h: number; px: Uint32Array }, x: number, y: number) => { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.px[j * src.w + i]; if (c >>> 24) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < PW && yy < PH) o.px[yy * PW + xx] = blend(o.px[yy * PW + xx], c); } } };
  const bud = (r: number[], op: any) => { const b = budynek(r.map((v, i) => v + (i % 2 ? 0 : X0)), { ...op, snieg: p ? Math.round(p * 10) / 10 : undefined }); put(b.obraz, b.x0 - X0, b.y0); };
  bud([20, 30, 80, 30, 80, 70, 20, 70], { wysokosc: 12, poziom: 12, dach: 'dachowka_czerwona', sciana: 'tynk_kremowy', seed: 3, drzwi: [50, 70] });
  bud([100, 40, 150, 40, 150, 90, 100, 90], { wysokosc: 12, poziom: 12, dach: 'lupek', sciana: 'cegla', seed: 8, drzwi: [125, 90] });
  for (const [g, x, y] of [['swierk', 185, 70], ['sosna', 215, 95], ['dab', 40, 118], ['swierk', 205, 40]] as [string, number, number][]) {
    let d; try { d = drzewoZ(g, 0); } catch { continue; }
    const kor = { w: d.korona.w, h: d.korona.h, px: d.korona.px.slice() };
    if (p) osniezKorone(kor, Math.round(p * 4) / 4);
    put(d.pien, x - d.kotwica[0], y - d.kotwica[1]);
    put(kor, x - d.kotwica[0], y - d.kotwica[1]);
  }
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) px[j * W + X0 + i] = o.px[j * PW + i] || 0xff000000;
});
const S = 3, w = W * S, h = H * S, raw = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const c = px[Math.floor(y / S) * W + Math.floor(x / S)], o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = 255; } }
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
