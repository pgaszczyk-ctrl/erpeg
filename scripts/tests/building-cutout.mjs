// Pixel-equivalence regression for moving cut-outs; no full-building copy is permitted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const source = p => stripTypeScriptTypes(readFileSync(p, 'utf8'), { mode: 'transform', disableExperimentalWarning: true }).replace(/^import .*$/mg, '').replaceAll('export ', '');
const P = { promien: 58, rozciag: 1.25, brzeg: 10, alfaWnetrza: 24, alfaKonturu: 176, srodekNadStopami: 22 };
const context = vm.createContext({ PRZESWIT_BUDYNKU: P, POZIOMY: { wzorBohatera: 48 }, SKALA_POSTACI: 2/3, GEN_DOTS: 2,
 ImageData: class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } } });
vm.runInContext(source('src/map/Wysokie.ts') + '\nglobalThis.Wysokie = Wysokie;', context);
const manager = new context.Wysokie({}, {});
const W = 2048, H = 1024;
const orig = Uint32Array.from({ length: W * H }, (_, k) => k % 17 === 0 ? 0 : k % 7 === 0 ? 0xff241a1e : 0xff916542);
const originalSlice = orig.slice.bind(orig);
orig.slice = () => { throw Error('A moving cut-out must not copy the whole building'); };
const actual = originalSlice(), expected = originalSlice();
let uploadedMax = 0;
const w = { orig, w: W, h: H, x0: -90, y0: -120, tex: { refresh() {}, getContext: () => ({ putImageData(image, x, y) {
 const px = new Uint32Array(image.data.buffer); uploadedMax = Math.max(uploadedMax, px.length);
 for (let j = 0; j < image.height; j++) actual.set(px.subarray(j * image.width, (j + 1) * image.width), (y + j) * W + x);
} }) } };
// Independent reference: full original restored, then an ellipse applied in world coordinates.
const K = (56 * .36 * (2/3) * 2) / 48;
const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16);
for (const [cx, cy] of [[-80,-110],[-60,-95],[0,0],[28,19],[550,450],[550,450],[1950,880],[1900,850]]) {
 manager.wytnij(w, cx, cy);
 expected.set(orig);
 const rx = P.promien * K, edge = P.brzeg * K;
 for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const k = j * W + i, c = orig[k]; if (!(c >>> 24)) continue;
  const X = w.x0 + i, Y = w.y0 + j;
  const dist = Math.hypot((X-cx)/P.rozciag, Y-cy);
  if (!(dist < rx || (dist < rx + edge && bayer[((Y&3)<<2)|(X&3)] < (rx+edge-dist)/edge))) continue;
  const ink = (c & 0xffffff) === 0x241a1e;
  const contour = [[1,0],[-1,0],[0,1],[0,-1]].some(([a,b]) => i+a<0 || j+b<0 || i+a>=W || j+b>=H || !(orig[(j+b)*W+i+a]>>>24) || (((orig[(j+b)*W+i+a]&0xffffff) === 0x241a1e) !== ink));
  expected[k] = ((c & 0xffffff) | ((contour ? P.alfaKonturu : P.alfaWnetrza) << 24)) >>> 0;
 }
 assert.deepEqual(actual, expected, `identical pixels at ${cx},${cy}`);
}
manager.przywroc(w);
assert.deepEqual(actual, originalSlice(), 'original wall restored after leaving');
assert(uploadedMax < orig.length / 100, 'each window is less than 1% of the building');
console.log(`PASS: 8 positions + restoration; full copy ${orig.byteLength} bytes -> window <= ${uploadedMax * 4} bytes`);
