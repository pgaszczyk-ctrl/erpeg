import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const fixture = JSON.parse(readFileSync('scripts/tests/fixtures/warsaw-platform.json'));
const source = p => stripTypeScriptTypes(readFileSync(p, 'utf8'), { mode: 'transform', disableExperimentalWarning: true }).replace(/^import .*$/mg, '').replaceAll('export ', '');
class VectorTile {
 constructor() {
  this.layers = Object.fromEntries(Object.entries(fixture.layers).map(([name,l]) => [name, {
   extent:l.extent, length:l.features.length, feature:i => ({ ...l.features[i], loadGeometry:() => l.features[i].geometry.map(r => r.map(([x,y])=>({x,y}))) })
  }]));
 }
}
const context = vm.createContext({ console, Math, Promise, setTimeout, VectorTile, PbfReader: class {},
 PMTiles: class { async getZxy(z,x,y) { return z===fixture.z && x===fixture.x && y===fixture.y ? {data:new ArrayBuffer(0)} : null; } },
 Terrain: class { maxSlope=1; slopeAt() { return 0; } async load() {} }, SZOPY:{usunM2:30,przejscieM2:60,domyslniePieter:2} });
vm.runInContext(source('src/map/CityMap.ts'), context);
vm.runInContext(source('src/map/world.ts'), context);
context.useWorldSource({});
const map = context.worldMap(52.2300,21.0000);
const hero = map.fromLatLon(52.2275002186,21.0000883283);
await map.ensure(hero.x,hero.y,250);
const platforms = map.areas.filter(a=>a.kind==='platform');
assert(platforms.length, 'real Warsaw WKD platform imported');
assert(map.buildings.length, 'ordinary buildings retained');
assert(!map.buildings.some(b=>b.architecture?.tags.building==='roof'), 'roof-tagged parts cannot become walls');
const raised = map.buildings.find(b=>b.architecture?.sourceId.startsWith('feature:35185801135317'));
// A raised roof currently has kind_detail=yes and min_height=3 in this extract, so it too is open below.
if (raised) assert(raised.open, 'elevated building parts must allow ground-level passage');
assert(!map.isBlocked(hero.x,hero.y), 'reported standing point on the platform remains walkable');
console.log(`PASS: Warsaw fixture, ${platforms.length} real platforms, ${map.buildings.length} solid buildings retained`);
