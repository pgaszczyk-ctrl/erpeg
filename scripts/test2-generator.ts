// Determinism, alpha/footprint safety and A/B timings for the procedural test2 architecture.
import assert from 'node:assert/strict';
import { budynek, type OpcjeBudynku } from '../src/gen/budynki';
import { stylizujBudynekTest2 } from '../src/gen/architekturaTest2';
import { obrazBudynku } from '../src/map/ziemia09';

const sum = (a: Uint32Array) => { let h = 2166136261; for (const n of a) h = Math.imul(h ^ n, 16777619); return h >>> 0; };
const shapes = [
  { name: 'dom', r: [0, 0, 100, 0, 100, 64, 0, 64], holes: [] },
  { name: 'hala', r: [0, 0, 420, 0, 420, 96, 0, 96], holes: [] },
  { name: 'skrzydla', r: [0, 0, 220, 0, 220, 60, 90, 60, 90, 170, 0, 170], holes: [] },
  { name: 'dziedziniec', r: [0, 0, 200, 0, 200, 160, 0, 160], holes: [[60, 50, 140, 50, 140, 110, 60, 110]] },
  { name: 'rotunda', r: Array.from({ length: 32 }, (_, i) => [Math.round(80 + 60 * Math.cos(i * Math.PI / 16)), Math.round(80 + 60 * Math.sin(i * Math.PI / 16))]).flat(), holes: [] },
];
const results: object[] = [];
for (const [seed, s] of shapes.entries()) {
  const op: OpcjeBudynku = { wysokosc: 24, poziom: 24, dach: 'dachowka_czerwona', sciana: 'tynk_kremowy', seed, dziury: s.holes, komin: true, steampunk: 2 };
  const base = budynek(s.r, op), a = budynek(s.r, op), b = budynek(s.r, op);
  stylizujBudynekTest2(s.r, op, a); stylizujBudynekTest2(s.r, op, b);
  assert.equal(sum(a.obraz.px), sum(b.obraz.px), `${s.name}: determinism`);
  assert.equal(a.obraz.w, base.obraz.w); assert.equal(a.obraz.h, base.obraz.h);
  assert.equal(a.x0, base.x0); assert.equal(a.y0, base.y0);
  assert.deepEqual(a.para, base.para);
  for (let i = 0; i < base.obraz.px.length; i++) assert.equal(a.obraz.px[i] >>> 24, base.obraz.px[i] >>> 24, `${s.name}: alpha at ${i}`);
  if (s.name !== 'rotunda') assert.notEqual(sum(a.obraz.px), sum(base.obraz.px), `${s.name}: new image`);
  // Both variants must coexist in the worker cache without cross-contamination.
  const data = { r: s.r, dziury: s.holes, seed: 43000 + seed, h: 24, poziom: 24 };
  const oldHash = sum(obrazBudynku(data, false, 'srednie').obraz.px);
  const newHash = sum(obrazBudynku({ ...data, test2: true }, false, 'srednie').obraz.px);
  assert.equal(sum(obrazBudynku(data, false, 'srednie').obraz.px), oldHash);
  assert.equal(sum(obrazBudynku({ ...data, test2: true }, false, 'srednie').obraz.px), newHash);
  const times: number[][] = [[], []];
  for (let round = 0; round < 18; round++) for (const mode of round % 2 ? [1, 0] : [0, 1]) {
    const start = performance.now(); const g = budynek(s.r, op);
    if (mode) stylizujBudynekTest2(s.r, op, g);
    if (round > 2) times[mode].push(performance.now() - start);
  }
  const median = (a: number[]) => +a.sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3);
  results.push({ shape: s.name, rgbaBytes: a.obraz.px.byteLength, currentMs: median(times[0]), test2Ms: median(times[1]), deterministic: true, alphaUnchanged: true });
}
console.log(JSON.stringify({ environment: 'Node, same process, warm generator, no GPU', results }, null, 2));
