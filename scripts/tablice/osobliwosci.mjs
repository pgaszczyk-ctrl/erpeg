// Odd places for the board notes' scouting jobs (owner, 2 Nov 2026: „eksploracja ruin/dziwnych miejsc”): ruins,
// abandoned buildings, water towers, mills, old chimneys, gasholders, wayside shrines, viewpoints, forts and
// archaeological sites from the raw OSM extract. Index field `osobliwe` = [x, y, kind, name] in file px.
// World maps read the same kinds from the world tiles' pois (src/map/world.ts `rodzajOsobliwosci`).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/** OSM tags → the game's kind (keep in step with RODZAJE_OSOBLIWOSCI in src/content/kartki.ts). */
function rodzaj(t) {
  if (t.historic === 'ruins' || t.ruins === 'yes') return 'ruiny';
  if (t.historic === 'archaeological_site') return 'stanowisko';
  if (t.historic === 'fort' || t.military === 'bunker' || t.historic === 'fortification') return 'fort';
  if (t.man_made === 'water_tower') return 'wieza';
  if (t.man_made === 'windmill' || t.historic === 'windmill') return 'wiatrak';
  if (t.man_made === 'watermill' || t.historic === 'watermill') return 'mlyn';
  if (t.man_made === 'gasometer') return 'gazometr';
  if (t.man_made === 'chimney') return 'komin';
  if (t.historic === 'wayside_shrine' || t.historic === 'wayside_cross') return 'kapliczka';
  if (t.tourism === 'viewpoint') return 'widok';
  if (t.abandoned === 'yes' && t.building) return 'opuszczony';
  return null;
}

export function osobliwosci(city, src) {
  const out = [];
  const r = (v) => Math.round(v * 10) / 10;
  for (const line of gunzipSync(readFileSync(src)).toString('utf8').split('\n')) {
    if (!/historic|ruins|man_made|abandoned|viewpoint|bunker/.test(line)) continue;
    let f;
    try { f = JSON.parse(line.replace(/^\x1e/, '')); } catch { continue; }
    const t = f.properties || {}, g = f.geometry;
    const k = g && rodzaj(t);
    if (!k) continue;
    const pts = g.type === 'Point' ? [g.coordinates] : g.type === 'LineString' ? g.coordinates : g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0][0] : [];
    if (!pts.length) continue;
    const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length, lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const p = city.fromLatLon(lat, lon);
    if (!(p.x >= city.minX && p.y >= city.minY && p.x <= city.width && p.y <= city.height)) continue;
    // One per spot (a shrine mapped as point and as building, a mill and its ruin…).
    if (out.some((o) => Math.hypot(o[0] - p.x, o[1] - p.y) < 40)) continue;
    out.push([r(p.x), r(p.y), k, t['name:pl'] || t.name || '']);
  }
  return out;
}
