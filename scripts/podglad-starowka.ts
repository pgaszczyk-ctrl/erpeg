// Podgląd budynków Starego Miasta z surowych obrysów OSM (bez łączenia z build-map), generatorem 09.
// Dane: python (wycinek .cache/starowka.json), potem: rolldown → node .cache/starowka.mjs wynik.png
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { budynek, ksztaltBudynku } from '../src/gen/budynki';
const blend = (d: number, c: number) => { const t = (c >>> 24) / 255, m = (s: number) => Math.round(((d >>> s) & 255) + (((c >>> s) & 255) - ((d >>> s) & 255)) * t); return ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0; };
import { stylPoId } from '../src/content/styleRegionow';
import { hex, hash } from '../src/gen/wspolne';
const G = 3.84, X0 = -110 * G, Y0 = -77 * G, W = Math.round(220 * G), H = Math.round(154 * G);
const px = new Uint32Array(W * H).fill(hex('#7d7a74'));
const bud = JSON.parse(readFileSync('.cache/starowka.json', 'utf8')) as { rings: number[][][]; lv?: string }[];
const DACH = ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'gont', 'blacha_zielona'], SCI = ['tynk_kremowy', 'tynk_zolty', 'tynk_szary', 'cegla', 'kamien'];
const items = bud.map((b, i) => ({ b, i, r: b.rings.map((r) => r.flatMap(([x, y]) => [x * G, y * G])) })).sort((a, c) => Math.max(...a.r[0].filter((_, k) => k % 2)) - Math.max(...c.r[0].filter((_, k) => k % 2)));
for (const { b, i, r } of items) {
  let a = 0; const o = b.rings[0]; for (let k = 0; k < o.length; k++) { const p = o[k], q = o[(k + 1) % o.length]; a += p[0] * q[1] - q[0] * p[1]; }
  const k = ksztaltBudynku(Number(b.lv) || 3, Math.abs(a) / 2), poziom = Math.max(13, Math.round(k.poziom * 0.56 * 1.3));
  const ring = r[0].slice(0, -2), pts = ring; let cx = 0, cy = 0, best = -1e9; for (let j = 0; j < pts.length; j += 2) if (pts[j + 1] > best) { best = pts[j + 1]; cx = pts[j]; cy = pts[j + 1]; }
  const R = stylPoId(process.env.REGION), pick = (l: [string, number][], u: number) => { let t = u * l.reduce((a, [, w]) => a + w, 0); for (const [k, w] of l) if ((t -= w) < 0) return k; return l[0][0]; };
  const plaski = hash(i * 7 + 1, 11, 7) < R.plaskie ? true : undefined;
  const img = budynek(ring, { wysokosc: k.poziomy * poziom, poziom, dach: process.env.REGION ? pick(R.dachy, hash(i, 3, 91)) : DACH[i % 5], sciana: process.env.REGION ? pick(R.sciany, hash(i, 5, 17)) : SCI[(i * 3) % 5], plaski, dachPlaski: plaski ? R.dachPlaski : undefined, okap: plaski ? 0 : R.okap, azja: !plaski && !!R.drewnianeLaczniki, seed: i * 7 + 1, drzwi: [cx, cy], dziury: r.slice(1).map((h) => h.slice(0, -2)), komin: i % 3 === 0 });
  for (let j = 0; j < img.obraz.h; j++) for (let x = 0; x < img.obraz.w; x++) { const c = img.obraz.px[j * img.obraz.w + x]; if (c >>> 24) { const X = Math.round(img.x0 + x - X0), Y = Math.round(img.y0 + j - Y0 - k.poziomy * poziom); if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = blend(px[Y * W + X], c); } }
}
const S = 2, w = W * S, h = H * S, raw = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = px[Math.floor(y / S) * W + Math.floor(x / S)], o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = 255; }
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
