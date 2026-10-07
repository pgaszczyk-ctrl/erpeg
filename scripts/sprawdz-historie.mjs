// Checks every address and stage place of a mission file the way the game resolves them:
//   node --experimental-strip-types scripts/sprawdz-historie.mjs docs/historie/stary-grod.json …
import { readFileSync } from 'node:fs';
import { CityMap, PX_PER_M } from '../src/map/CityMap.ts';

const city = new CityMap(JSON.parse(readFileSync(new URL('../.cache/lublin-full.json', import.meta.url), 'utf8')));
const spot = (m) => {
  const g = /^\s*(-?\d{1,2}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)\s*$/.exec(m);
  if (g) {
    const p = city.fromLatLon(+g[1], +g[2]);
    return city.isBlocked(p.x, p.y) ? null : p;
  }
  const b = city.findBuilding(m);
  return b ? city.entranceOf(b) : null;
};
let bad = 0;
for (const file of process.argv.slice(2)) {
  for (const m of JSON.parse(readFileSync(file, 'utf8'))) {
    const door = spot(m.adres);
    if (!door) { bad++; console.log(`✗ ${m.id}: drzwi „${m.adres}”`); }
    const stages = m.etapy ?? [m.zadanie];
    stages.forEach((e, i) => {
      if (!e.miejsce || e.typ === 'brak') return;
      const p = spot(e.miejsce);
      if (!p) { bad++; console.log(`✗ ${m.id} etap ${i + 1}: „${e.miejsce}”`); }
      else if (door) console.log(`  ${m.id} etap ${i + 1} ${e.typ}: ${Math.round(Math.hypot(p.x - door.x, p.y - door.y) / PX_PER_M)} m od drzwi`);
    });
  }
}
console.log(bad ? `${bad} błędów` : 'Wszystkie miejsca są na mapie.');
