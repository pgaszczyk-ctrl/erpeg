// Podgląd budynków z generatora (bez gry): node node_modules/rolldown/bin/cli.mjs scripts/podglad-budynkow.ts --file .cache/podglad.mjs --format esm --platform node && node .cache/podglad.mjs wynik.png
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { budynek, MATERIALY, tonyZKoloru } from '../src/gen/budynki';
const blend = (d: number, c: number) => { const t = (c >>> 24) / 255, m = (s: number) => Math.round(((d >>> s) & 255) + (((c >>> s) & 255) - ((d >>> s) & 255)) * t); return ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0; };
import { hex, ciemniej, jasniej } from '../src/gen/wspolne';
const out = process.argv[2];
const W = 360, H = 200, px = new Uint32Array(W * H).fill(hex('#5f8a3a'));
for (let i = 0; i < px.length; i++) if (((i % W) >> 3) % 5 === 0) px[i] = hex('#9a7b52');
const hl = (c: string, k: string, w: 'dachowka'|'gladki') => { const kk = `hl_${w}_${c}`; MATERIALY[kk] = { ...tonyZKoloru(hex(c)), wzor: w } as any; return kk; };
const put = (r: number[], o: any) => { const b = budynek(r, o); for (let j = 0; j < b.obraz.h; j++) for (let i = 0; i < b.obraz.w; i++) { const c = b.obraz.px[j * b.obraz.w + i]; if (c >>> 24) { const x = b.x0 + i, y = b.y0 + j; if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = blend(px[y * W + x], c); } } };
const P = 10;
put([20, 30, 70, 30, 70, 64, 20, 64], { wysokosc: P, poziom: P, dach: 'dachowka_czerwona', sciana: 'tynk_kremowy', seed: 3, drzwi: [45, 64] });
put([95, 20, 160, 20, 160, 44, 125, 44, 125, 80, 95, 80], { wysokosc: P, poziom: P, dach: 'lupek', sciana: 'cegla', seed: 8, drzwi: [110, 80] });
put([185, 25, 260, 25, 260, 90, 185, 90], { wysokosc: 2 * P, poziom: P, dach: hl('#3f7fd8', '', 'dachowka'), sciana: hl('#dbe6f5', '', 'gladki'), seed: 5, drzwi: [220, 90] });
put([285, 40, 340, 40, 340, 75, 285, 75], { wysokosc: P, poziom: P, dach: 'dachowka_brazowa', sciana: 'drewno', seed: 11, drzwi: [310, 75] });
put([30, 120, 100, 120, 100, 175, 30, 175], { wysokosc: 2 * P, poziom: P, dach: 'gont', sciana: 'tynk_zolty', seed: 2, drzwi: [65, 175] });
put([140, 125, 230, 125, 230, 150, 200, 150, 200, 180, 140, 180], { wysokosc: P, poziom: P, dach: hl('#2b3f8a', '', 'dachowka'), sciana: hl('#d7def2', '', 'gladki'), seed: 7, drzwi: [170, 180] });
put([260, 120, 330, 120, 330, 170, 260, 170], { wysokosc: 3 * P, poziom: P, dach: 'papa', sciana: 'tynk_szary', seed: 4, drzwi: [295, 170] });
// PNG ×3 nearest
const S = 3, w = W * S, h = H * S, raw = Buffer.alloc((w * 4 + 1) * h);
for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const c = px[Math.floor(y / S) * W + Math.floor(x / S)], o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = c & 255; raw[o + 1] = (c >>> 8) & 255; raw[o + 2] = (c >>> 16) & 255; raw[o + 3] = 255; } }
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
