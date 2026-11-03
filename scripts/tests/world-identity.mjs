// Real Warsaw geometry and native Lublin index; isolated network and player state.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const fixture = JSON.parse(readFileSync('scripts/tests/fixtures/warsaw-platform.json'));
Object.assign(fixture.layers, JSON.parse(readFileSync('scripts/tests/fixtures/warsaw-roads.json')).layers);
const source = p => stripTypeScriptTypes(readFileSync(p, 'utf8'), { mode: 'transform', disableExperimentalWarning: true })
  .replace(/^import .*$/mg, '').replaceAll('export ', '');
class VectorTile {
  constructor() {
    this.layers = Object.fromEntries(Object.entries(fixture.layers).map(([name, l]) => [name, {
      extent: l.extent, length: l.features.length,
      feature: i => ({ ...l.features[i], loadGeometry: () => l.features[i].geometry.map(r => r.map(([x, y]) => ({ x, y }))) }),
    }]));
  }
}
const state = { at: null, tu: null, abandoned: null, gen: {}, story: {}, byl: [], coins: 123, missions: { done: 'done' } };
let rejectIndex = false;
const ctx = vm.createContext({ console, Math, Promise, setTimeout, VectorTile, PbfReader: class {},
  PMTiles: class { async getZxy(z, x, y) { return z === fixture.z && x === fixture.x && y === fixture.y ? { data: new ArrayBuffer(0) } : null; } },
  Terrain: class { maxSlope = 1; slopeAt() { return 0; } async load() {} },
  SZOPY: { usunM2: 30, przejscieM2: 60, domyslniePieter: 2 }, session: state,
  pickHotels() {}, addVillageCamps() {}, jestLochem: id => id.startsWith('loch:'), czytajIdLochu: () => null,
  fetch: async path => {
    if (rejectIndex && path === 'map/world.json') return { ok: false };
    const raw = JSON.parse(readFileSync(`public/${path}`));
    // Prepared extraction metadata used by the canonical owner, regardless of arrival method.
    if (path === 'map/world.json') raw.towns = JSON.parse(readFileSync('data/towns.json')).towns.map(t => ({ ...t }));
    return { ok: true, json: async () => raw };
  },
});
for (const p of ['src/rng.ts', 'src/content/pociagi.ts', 'src/map/worldRules.ts', 'src/map/CityMap.ts', 'src/map/world.ts', 'src/travel.ts'])
  vm.runInContext(source(p), ctx, { filename: p });
ctx.useWorldSource({});
await ctx.loadWorld();

// Independent callers must receive the same object while a prepared index is loading.
const [lub1, lub2] = await Promise.all([ctx.getMap('lublin'), ctx.getMap('lublin')]);
assert.equal(lub1, lub2);
assert.equal((await ctx.getSurfaceMap(51.23471, 22.56526)), lub1, 'Targi always belongs to Lublin');
assert.equal((await ctx.getSurfaceMap(50.986117, 22.3294289)).id, 'wilkolaz', 'walking and a train use the same regional extract');

const target = { lat: 52.2275002186, lon: 21.0000883283 };
const arrivals = [
  { name: 'test character', origin: [52.2297, 21.0122] },
  { name: 'train', origin: [52.2289, 21.0030] },
  { name: 'cannon / walk', origin: [52.2, 21] },
];
const selected = [];
for (const a of arrivals) {
  const old = ctx.worldMap(...a.origin);
  const p = old.fromLatLon(target.lat, target.lon);
  const resolved = await ctx.surfacePosition({ m: old.id, ...p });
  selected.push(resolved);
  const ll = resolved.city.toLatLon(resolved.at.x, resolved.at.y);
  assert(Math.abs(ll.lat - target.lat) < 1e-10 && Math.abs(ll.lon - target.lon) < 1e-10, `${a.name}: no geographic teleport`);
}
assert(selected.every(r => r.city === selected[0].city), 'all routes share one canonical map/cache');
assert.equal(selected[0].city.id, 'w:52.2000,21.0000');
const city = selected[0].city, p = selected[0].at;
await city.ensure(p.x, p.y, 250);
assert(city.lines.length && city.buildings.length, 'real Warsaw roads and buildings present');
const geometry = m => JSON.stringify(m.query({ x0: p.x - 2000, y0: p.y - 2000, x1: p.x + 2000, y1: p.y + 2000 }));
const before = geometry(city);
const fresh = ctx.worldMap(52.2, 21);
await fresh.ensure(p.x, p.y, 250);
assert.equal(geometry(fresh), before, 'another player gets identical geometry, seeds and road order');
await city.ensure(p.x + 1500, p.y + 1500, 1500);
assert.equal(geometry(city), before, 'overlapping tile loads cannot replace/reassign buildings');

// Migrate a real saved position, unfinished snapshot and quest without changing progress.
const old = ctx.worldMap(52.2297, 21.0122), op = old.fromLatLon(target.lat, target.lon);
state.at = { m: old.id, ...op }; state.tu = { ...state.at };
state.abandoned = { ...state.at, hp: 12, enemies: [{ ...op, hp: 5 }] };
state.gen.quest = { id: 'quest', scenariusz: { mapId: old.id, anchors: [target], choices: { path: 'chosen' } } };
state.story.prolog = { originMapId: old.id, anchors: { mentor: target }, rewardsClaimed: ['bow'], dungeon: { id: 'stable-dungeon' } };
await ctx.normalizeSurfaceState();
assert.equal(state.tu.m, city.id); assert.equal(state.at.m, city.id);
assert.equal(state.abandoned.m, city.id); assert.equal(state.abandoned.hp, 12);
assert.equal(state.gen.quest.scenariusz.mapId, city.id);
assert.equal(state.gen.quest.scenariusz.choices.path, 'chosen');
assert.equal(state.story.prolog.dungeon.id, 'stable-dungeon');
assert.equal(state.coins, 123); assert.equal(state.missions.done, 'done');
const enemy = city.toLatLon(state.abandoned.enemies[0].x, state.abandoned.enemies[0].y);
assert(Math.abs(enemy.lat - target.lat) < 1e-10);
for (const [lat, lon, expected] of [[-33.94, -70.64, 'w:-33.9000,-70.6000'], [-0.05, -0.05, 'w:0.0000,0.0000'], [0, 0, 'w:0.0000,0.0000'], [52.249999, 21, 'w:52.2000,21.0000']])
  assert.equal(ctx.worldMapId(lat, lon), expected);
assert.notEqual(ctx.worldMapId(52.249999, 21), ctx.worldMapId(52.250001, 21), 'sector boundary explicit');
assert(ctx.surfaceBindingMatches(city.id, 'w:52.3000,21.0000', [{ lat: 52.26, lon: 21 }]), 'quest crosses sector edge');
assert.throws(() => ctx.worldMapId(NaN, 21));
rejectIndex = true;
await assert.rejects(ctx.loadWorld(), /zasad mapy/, 'an unavailable source cannot silently create another map');
console.log('PASS: transport-independent Warsaw, Lublin/region ownership, independent players, overlapping chunks, legacy positions and quest continuity');
