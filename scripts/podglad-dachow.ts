// Podgląd form dachów (bez gry): node node_modules/rolldown/bin/cli.mjs scripts/podglad-dachow.ts --file .cache/dachy.mjs --format esm --platform node && node .cache/dachy.mjs wynik.png
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { obrazBudynku, type Budynek09 } from '../src/map/ziemia09';
import { hex } from '../src/gen/wspolne';
const out = process.argv[2];
const W = 980, H = 470, px = new Uint32Array(W * H).fill(hex('#5f8a3a'));
for (let i = 0; i < px.length; i++) if ((Math.floor(i / W) >> 3) % 9 === 0) px[i] = hex('#9a7b52');
const blend = (d: number, c: number) => { const t = (c >>> 24) / 255, m = (s: number) => Math.round(((d >>> s) & 255) + (((c >>> s) & 255) - ((d >>> s) & 255)) * t); return ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0; };
const prost = (x: number, y: number, w: number, h: number, kat = 0) => {
  const c = Math.cos(kat), s = Math.sin(kat), cx = x + w / 2, cy = y + h / 2, r: number[] = [];
  for (const [a, b] of [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]) r.push(cx + (a - cx) * c - (b - cy) * s, cy + (a - cx) * s + (b - cy) * c);
  return r;
};
let seed = 1;
const put = (r: number[], forma: Budynek09['forma'], poziomy = 1) => {
  const b: Budynek09 = { r, h: 24 * poziomy, poziom: 24, seed: seed++ * 7919, forma, region: 'umiarkowany' } as Budynek09;
  const o = obrazBudynku(b, false, 'duze');
  for (let j = 0; j < o.obraz.h; j++) for (let i = 0; i < o.obraz.w; i++) {
    const c = o.obraz.px[j * o.obraz.w + i];
    if (c >>> 24) { const x = o.x0 + i, y = o.y0 + j; if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = blend(px[y * W + x], c); }
  }
};
put(prost(40, 120, 120, 80), 'biblioteka');
put(prost(220, 130, 110, 80), 'obserwatorium');
put(prost(390, 120, 130, 90), 'ratusz');
put(prost(580, 150, 90, 80), 'antena', 3);
put([720, 40, 960, 40, 960, 230, 900, 230, 900, 100, 780, 100, 780, 230, 720, 230], 'biblioteka');
put(prost(40, 340, 50, 40), 'stromy');
put(prost(110, 330, 40, 54, 0.4), 'stromy');
put(prost(190, 350, 56, 38), 'dwuspadowy');
put(prost(265, 330, 38, 56), 'dwuspadowy');
put(prost(340, 330, 140, 70), 'mansarda', 2);
put(prost(520, 320, 180, 110), 'szed');
put([730, 300, 830, 300, 830, 340, 770, 340, 770, 440, 730, 440], 'obserwatorium');
put(prost(850, 330, 56, 40), 'dwuspadowy');
const S = 2, w = W * S, h = H * S, raw = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const c = px[Math.floor(y / S) * W + Math.floor(x / S)], o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = 255; } }
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
