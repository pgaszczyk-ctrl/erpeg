// Podgląd „stosu warstw” (bez gry): node node_modules/rolldown/bin/cli.mjs scripts/podglad-stosu.ts --file .cache/stos.mjs --format esm --platform node && node .cache/stos.mjs <katalog>
// Zapisuje PNG-i: <nazwa>_<kąt>.png (piksele świata, przezroczyste) + JSON z punktem podstawy.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { stos, type Obraz } from '../src/gen/stos';
import { glaz, zloze, woz } from '../src/gen/stosModele';
const dir = process.argv[2] ?? '.cache/stos';
mkdirSync(dir, { recursive: true });
const crc = (b: Buffer) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const png = (o: Obraz, f: string) => {
  const raw = Buffer.alloc((o.w * 4 + 1) * o.h);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const c = o.px[y * o.w + x], p = y * (o.w * 4 + 1) + 1 + x * 4;
    raw[p] = (c >>> 16) & 255; raw[p + 1] = (c >>> 8) & 255; raw[p + 2] = c & 255; raw[p + 3] = c >>> 24;
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(o.w, 0); ih.writeUInt32BE(o.h, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(f, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
};
const meta: Record<string, [number, number]> = {};
const zrob = (nazwa: string, r: (k: number) => Obraz, katy: number) => {
  const t = performance.now();
  for (let i = 0; i < katy; i++) { const o = r((i / katy) * Math.PI * 2); png(o, `${dir}/${nazwa}_${i}.png`); meta[`${nazwa}_${i}`] = [o.ox, o.oy]; }
  console.log(nazwa, katy, 'kątów', Math.round(performance.now() - t), 'ms');
};
let t = performance.now();
const w1 = stos(woz('beczki', 'brazowy')); console.log('przygotowanie wozu', Math.round(performance.now() - t), 'ms');
zrob('woz_beczki', w1, 32);
zrob('woz_worki', stos(woz('worki', 'szary', 2)), 32);
zrob('woz_pusty', stos(woz('pusty', 'czarny', 3)), 32);
zrob('glaz1', stos(glaz(11)), 16);
zrob('glaz2', stos(glaz(27, 0.7)), 16);
zrob('glaz3', stos(glaz(41, 1.4)), 16);
zrob('zloze', stos(zloze(5)), 16);
writeFileSync(`${dir}/meta.json`, JSON.stringify(meta));
