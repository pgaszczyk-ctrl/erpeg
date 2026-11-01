// Where Lublin's generated cannons stand under the spot rule (square/car park, ≥ 50 m from buildings):
//   node scripts/tests/armaty-miejsca.mjs   (needs .cache/lublin-full.json)
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'vite';
await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    outDir: '.cache/armaty-miejsca',
    lib: {
      entry: { city: 'src/map/CityMap.ts', gen: 'src/artillery/generator.ts', miejsce: 'src/artillery/miejsce.ts' },
      formats: ['es'],
      fileName: (_f, n) => n + '.mjs',
    },
  },
});
const { CityMap, PX_PER_M } = await import('../../.cache/armaty-miejsca/city.mjs');
const { generujSiec, miastoPrzy } = await import('../../.cache/armaty-miejsca/gen.mjs');
const { miejsceStacji, MIEJSCE, MIEJSCE_M } = await import('../../.cache/armaty-miejsca/miejsce.mjs');

const city = new CityMap(JSON.parse(readFileSync(new URL('../../.cache/lublin-full.json', import.meta.url), 'utf8')));
const swiat = JSON.parse(readFileSync(new URL('../../public/artillery/swiat.json', import.meta.url), 'utf8'));
const m = miastoPrzy(swiat, { lat: 51.2465, lon: 22.5684 });
assert(m, 'Lublin in swiat.json');
const siec = generujSiec(m, swiat.lotniska);
let jest = 0, na = 0;
for (const s of siec.stacje) {
  const g = city.hasLatLon(s.lat, s.lon) ? city.fromLatLon(s.lat, s.lon) : null;
  if (!g || !city.insideCity(g.x, g.y)) {
    console.log(`  ${s.id} ${s.rodzaj}: poza mapą Lublina (mapa świata)`);
    continue;
  }
  na++;
  const t0 = performance.now();
  const p = miejsceStacji(city, s.id, s.lat, s.lon);
  const ms = Math.round(performance.now() - t0);
  if (!p) {
    console.log(`✗ ${s.id} ${s.rodzaj}: brak placu/parkingu w ${MIEJSCE_M} m (${ms} ms)`);
    continue;
  }
  jest++;
  // The rule itself, checked again.
  assert(!city.buildingWithin(p.x, p.y, MIEJSCE.odBudynkowM * PX_PER_M - 1), `${s.id} too close to a building`);
  assert(city.areaKindsAt(p.x, p.y).some((k) => MIEJSCE.rodzaje.includes(k)), `${s.id} not on a square/car park`);
  const ll = city.toLatLon(p.x, p.y);
  const kind = city.areaKindsAt(p.x, p.y).filter((k) => MIEJSCE.rodzaje.includes(k)).join('/');
  console.log(
    `✓ ${s.id} ${s.rodzaj}: ${kind}, ${Math.round(Math.hypot(p.x - g.x, p.y - g.y) / PX_PER_M)} m od punktu, ` +
      `${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)} (${ms} ms)`,
  );
}
console.log(`${jest} z ${na} armat na mapie Lublina ma miejsce.`);
