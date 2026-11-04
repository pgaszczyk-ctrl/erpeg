import assert from 'node:assert/strict';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url), { createCanvas } = require('@napi-rs/canvas');
const context = vm.createContext({ console, URLSearchParams, location: { search: '' },
  localStorage: { getItem: () => null }, arenaOn: () => false, hex: () => 0,
  document: { createElement: () => createCanvas(1, 1) },
});
function readModule(path, names) {
  const source = stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'transform', disableExperimentalWarning: true })
    .replace(/^import .*$/mg, '').replaceAll('export ', '').replaceAll('import.meta.url', "'file:///test/'");
  return vm.runInContext(`(() => { ${source}; return {${names.join(',')}}; })()`, context, { filename: path });
}
Object.assign(context, readModule('src/map/ziemia09.ts', ['GEN_DOTS', 'MARGINES', 'RODZAJE']));
// The shared policy is absent before the fix; exercising the old raster still demonstrates the failure.
try { Object.assign(context, readModule('src/map/nawierzchnia.ts', ['nawierzchniaDrogi'])); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const { mapaRodzajow } = readModule('src/map/Podloze09.ts', ['mapaRodzajow']);
const { ROAD } = readModule('src/map/world.ts', ['ROAD']);
const line = (kind, pts = [0, 64, 128, 64]) => ({ kind, pts, width: 14, id: 1 });
const draw = (areas, lines) => mapaRodzajow(areas, lines, l => l.width + 6, null, 0, 0, 128);
const at = (r, x, y) => context.RODZAJE[r.ids[(y * context.GEN_DOTS + context.MARGINES) * r.S + x * context.GEN_DOTS + context.MARGINES]];
const paved = { id: 1, kind: 'paved', rings: [[0, 50, 128, 50, 128, 78, 0, 78]], x0: 0, y0: 50, x1: 128, y1: 78 };
for (const kind of ['major', 'medium', 'minor']) {
  assert.equal(at(draw([], [line(kind)]), 64, 64), 'bruk', `${kind}: world roads must have the same cobbles as Lublin`);
  assert.equal(at(draw([paved], [line(kind)]), 64, 64), 'bruk', `${kind}: prepared polygon stays cobbled`);
}
for (const kind of ['track', 'path', 'service', 'steps']) assert.equal(at(draw([], [line(kind)]), 64, 64), 'droga', `${kind}: dirt roads remain dirt`);
assert.equal(at(draw([], [line('pedestrian')]), 64, 64), 'chodnik');
const crossing = [line('minor'), line('path', [64, 0, 64, 128])];
assert.equal(at(draw([], crossing), 64, 64), 'bruk', 'crossing path cannot paint a dirt stripe across the street');
assert.equal(at(draw([], crossing.reverse()), 64, 64), 'bruk', 'material priority is independent of feature order');
assert.equal(at(draw([], crossing), 64, 16), 'droga', 'the off-street path remains dirt');
const fixture = JSON.parse(readFileSync('scripts/tests/fixtures/warsaw-roads.json'));
const roads = fixture.layers.roads.features.filter(f => f.type === 2 && ROAD[f.properties.kind_detail])
  .flatMap((f, id) => f.geometry.map(g => ({ ...line(ROAD[f.properties.kind_detail], g.flatMap(([x, y]) => [x / 32, y / 32])), id })));
const atlas = draw([], roads);
assert([...atlas.ids].filter(id => context.RODZAJE[id] === 'bruk').length > 1000, 'actual Warsaw road geometry gets cobbles without prepared paving polygons');
console.log('PASS common street cobbles, dirt paths, pedestrian pavement, crossing priority and real Warsaw geometry');
