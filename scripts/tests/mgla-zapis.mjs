// node --experimental-strip-types scripts/tests/mgla-zapis.mjs
// Fog chunks in the save (src/map/mglaZapis.ts): every chunk reads back bit for bit, old saves too.
import { kodujKawalek, dekodujKawalek, scisnijMgle, KOMORKI_KAWALKA } from '../../src/map/mglaZapis.ts';

let rng = 12345;
const los = () => ((rng = (rng * 1103515245 + 12345) >>> 0) / 2 ** 32);
const bityZ = (f) => {
  const b = new Uint8Array(KOMORKI_KAWALKA / 8);
  for (let i = 0; i < KOMORKI_KAWALKA; i++) if (f(i % 64, Math.floor(i / 64))) b[i >> 3] |= 1 << (i & 7);
  return b;
};
const surowy = (b) => btoa(String.fromCharCode(...b));
const wzory = [
  () => false,
  () => true,
  (x, y) => x + y > 70,
  (x, y) => (x - 30) ** 2 + (y - 20) ** 2 < 400,
  (x) => x % 2 === 0,
  () => los() < 0.5,
  () => los() < 0.03,
  (x, y) => !(x === 5 && y === 7),
];
let ileRaz = 0, przed = 0, po = 0;
for (let n = 0; n < 4000; n++) {
  const w = wzory[n % wzory.length];
  const b = bityZ(w);
  const s = kodujKawalek(b);
  const z = dekodujKawalek(s);
  if (z.length !== b.length || z.some((v, i) => v !== b[i])) throw new Error(`wzór ${n % wzory.length}: odczyt różny`);
  // an old (raw base64) chunk still reads
  const stary = dekodujKawalek(surowy(b));
  if (stary.some((v, i) => v !== b[i])) throw new Error('stary format: odczyt różny');
  if (s.length > surowy(b).length) throw new Error('nowy dłuższy niż stary');
  przed += surowy(b).length;
  po += s.length;
  ileRaz++;
}
if (kodujKawalek(bityZ(() => true)) !== '~AIAg') throw new Error('pełny kawałek ≠ ~AIAg');
// a damaged string never throws
dekodujKawalek('~@@@');
dekodujKawalek('~');
dekodujKawalek('');
// scisnijMgle: old → new once, then nothing to do
const mapa = { s: 1.92, chunks: { '0,0': surowy(bityZ(() => true)), '1,0': surowy(bityZ((x, y) => x > y)) } };
const sc = scisnijMgle(mapa);
if (!sc || sc.chunks['0,0'] !== '~AIAg') throw new Error('scisnijMgle nie ścisnęła');
if (scisnijMgle(sc) !== null) throw new Error('scisnijMgle drugi raz coś zmieniła');
for (const k of Object.keys(mapa.chunks)) {
  const a = dekodujKawalek(mapa.chunks[k]), b = dekodujKawalek(sc.chunks[k]);
  if (a.some((v, i) => v !== b[i])) throw new Error('scisnijMgle zmieniła treść');
}
console.log(`OK: ${ileRaz} kawałków, ${przed} → ${po} znaków (${(przed / po).toFixed(1)}×)`);
