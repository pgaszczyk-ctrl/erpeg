// Downloads raw OpenStreetMap data for Lublin from the Overpass API and
// saves it gzipped to data/lublin-osm.json.gz. Runs in GitHub Actions
// (see .github/workflows/fetch-map.yml); the game build then converts it
// with scripts/build-map.mjs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const QUERY = `
[out:json][timeout:900][maxsize:2000000000];
rel["boundary"="administrative"]["name"="Lublin"]["admin_level"~"^(6|7|8)$"]->.city;
.city out geom;
.city map_to_area->.a;
(
  way["building"](area.a);
  relation["building"](area.a);
  way["highway"](area.a);
  way["railway"~"^(rail|tram|light_rail)$"](area.a);
  way["waterway"](area.a);
  way["natural"~"^(water|wood|scrub|grassland|wetland)$"](area.a);
  relation["natural"~"^(water|wood|wetland)$"](area.a);
  way["landuse"~"^(grass|forest|meadow|recreation_ground|cemetery|allotments|village_green|farmland|orchard)$"](area.a);
  relation["landuse"~"^(grass|forest|meadow|cemetery|allotments)$"](area.a);
  way["leisure"~"^(park|garden|pitch|playground|stadium|track)$"](area.a);
  relation["leisure"~"^(park|garden)$"](area.a);
  way["amenity"="parking"](area.a);
  node["addr:housenumber"](area.a);
);
out tags geom qt;
`;

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function main() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    console.log(`Attempt ${attempt + 1}: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'erpeg-game-map-build' },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const text = await res.text();
      const json = JSON.parse(text);
      if (!json.elements?.length) throw new Error('No elements: ' + text.slice(0, 300));
      if (json.remark) console.log('Remark:', json.remark);
      const counts = {};
      for (const e of json.elements) counts[e.type] = (counts[e.type] || 0) + 1;
      console.log('Elements:', counts, 'raw MB:', (text.length / 1e6).toFixed(1));
      mkdirSync('data', { recursive: true });
      const gz = gzipSync(text, { level: 9 });
      writeFileSync('data/lublin-osm.json.gz', gz);
      console.log('Saved gz MB:', (gz.length / 1e6).toFixed(1));
      return;
    } catch (err) {
      console.error('Failed:', err.message);
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
  process.exit(1);
}

main();
