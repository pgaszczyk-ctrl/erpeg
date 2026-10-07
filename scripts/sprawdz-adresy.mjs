// Checks mission addresses the way the game finds them (CityMap.findBuilding on the whole Lublin map):
//   node --experimental-strip-types scripts/sprawdz-adresy.mjs "Dworcowa 11" "Zamkowa 9" …
import { readFileSync } from 'node:fs';
import { CityMap } from '../src/map/CityMap.ts';

const full = JSON.parse(readFileSync(new URL('../.cache/lublin-full.json', import.meta.url), 'utf8'));
const city = new CityMap(full);
for (const a of process.argv.slice(2)) {
  const b = city.findBuilding(a);
  if (!b) {
    console.log(`✗ ${a}`);
    continue;
  }
  const d = city.entranceOf(b);
  const ll = city.toLatLon ? city.toLatLon(d.x, d.y) : null;
  console.log(`✓ ${a} → ${b.addr ?? ''} ${b.name ? `(${b.name})` : ''} drzwi ${Math.round(d.x)},${Math.round(d.y)}${ll ? ` = ${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)}` : ''}`);
}
