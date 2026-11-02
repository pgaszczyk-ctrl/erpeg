import { REGIONS, STYLES } from './catalog';
import { countryAt } from './countries';
import { centroid, contains, distance, nearestRoad, random } from './geometry';
import type { ArchitectureSource, ContextArea, Region, Road, RoofType, StyleDecision, StyleId } from './types';

const TEMPERATE: Region = {
  id: 'temperate', countries: [], bounds: [], default_style: 'half-timber', roofs: [], pitch_multiplier: 1,
  overhang: .35, subpalette: STYLES['half-timber'].subpalette, sparse_windows: false,
};
export function regionFor(source: ArchitectureSource, iso = ''): Region {
  iso ||= countryAt(source.lon,source.lat);
  // Country membership is authoritative; climate rectangles handle missing boundary data.
  return REGIONS.find(r => r.countries.includes(iso)) ?? REGIONS.find(r => r.bounds.some(([w,s,e,n]) => source.lon >= w && source.lon <= e && source.lat >= s && source.lat <= n)) ?? TEMPERATE;
}
export function weighted<T>(items: { value: T; weight: number }[], seed: number): T {
  let n = seed * items.reduce((s, item) => s + item.weight, 0);
  for (const item of items) if ((n -= item.weight) <= 0) return item.value;
  return items[items.length - 1].value;
}
export const isLandmark = (s: ArchitectureSource) => ['church','cathedral','chapel','synagogue','mosque','temple','castle','gatehouse'].includes(s.tags.building) || ['castle','fort','city_gate','citywalls','tower','monastery','church'].includes(s.tags.historic) || s.tags.amenity === 'place_of_worship';
export function decideStyle(s: ArchitectureSource, sources: ArchitectureSource[], roads: Road[], areas: ContextArea[], iso = ''): StyleDecision {
  const p = centroid(s.rings[0]), t = s.tags, region = regionFor(s, iso), road = nearestRoad(p, roads);
  const density = sources.reduce((n, other) => n + Number(distance(p, centroid(other.rings[0])) <= 200), 0);
  const area = areas.find(a => a.rings.length && contains(a.rings[0], p) && !a.rings.slice(1).some(r => contains(r,p)));
  const landuse = area?.kind ?? t.landuse;
  const year = Number((t.start_date ?? '').match(/\d{4}/)?.[0] ?? 0), levels = Number(t['building:levels']) || 0;
  const historicCenter = (year > 0 && year < 1900 && density >= 15) || Boolean(t.historic && t.historic !== 'no' && density >= 15);
  const zone = road.id === 'none' ? `cell:${Math.floor(s.lon * 250)}:${Math.floor(s.lat * 400)}` : `street:${road.id}`;
  const result = (style: StyleId, source: StyleDecision['source'], rule: string): StyleDecision => ({ style, source, rule, region: region.id, density, zone });
  if (isLandmark(s)) return result('landmark', 'tag OSM', 'building/historic/amenity: landmark');
  if (['industrial','warehouse','factory','manufacture'].includes(t.building)) return result('industrial','tag OSM','building: industrial/warehouse');
  if (t['building:material'] === 'wood' || ['barn','farm','farm_auxiliary','stable'].includes(t.building)) return result('wooden','tag OSM','wood / farm / barn');
  if (/half.timber|fachwerk|timber.fram/.test((t['building:architecture'] ?? '') + ' ' + (t['building:material'] ?? ''))) return result('half-timber','tag OSM','architecture/material: timber framing');
  if (t.building === 'apartments' && ((year >= 1950 && year <= 1990) || (levels >= 4 && !historicCenter))) return result('apartments','tag OSM','apartments + date/levels');
  if (historicCenter || /baroque|renaissance|neoclass|historic/.test(t['building:architecture'] ?? '')) return result('old-town','tag OSM','historic / start_date < 1900');
  if (year > 0 && year < 1900 && ['house','detached','residential'].includes(t.building)) return result('half-timber','tag OSM','old single-family building');
  if (year > 1990 || /modern|contemporary/.test(t['building:architecture'] ?? '')) return result('modern','tag OSM','start_date > 1990 / architecture');
  if (['commercial','retail'].includes(t.building)) return result('modern','tag OSM','building=commercial/retail');
  if (landuse === 'industrial') return result('industrial','kontekst','landuse=industrial');
  if (['farmyard','farmland'].includes(landuse ?? '') && density < 25) return result('wooden','kontekst','farmyard + low density');
  if (levels >= 4 && !historicCenter) return result('apartments','tag OSM','building:levels >= 4');
  // Zone decisions do not depend on which buildings have already been displayed.
  let dominant: StyleId = region.default_style;
  if (region.id === 'temperate') dominant = density >= 60 ? 'old-town' : density < 12 ? 'wooden' : 'half-timber';
  if (['commercial','retail'].includes(landuse ?? '')) dominant = 'modern';
  // Blend geographic cell weights across a 200 m band; no city-name conditionals.
  // WGS84 grid makes the transition invariant to the local CityMap origin.
  const gx = s.lon * 111320 * Math.cos(s.lat * Math.PI / 180) / 500, gy = s.lat * 111320 / 500;
  const edge = Math.min(gx - Math.floor(gx), 1 - gx + Math.floor(gx), gy - Math.floor(gy), 1 - gy + Math.floor(gy)) * 500;
  const mix = Math.max(0, 1 - edge / 200);
  const neighbours = STYLES[dominant].neighbours;
  const style = random(s.id, `zone:${zone}`) < .7 || !neighbours.length ? dominant : neighbours[Math.floor(random(s.id,'neighbour') * neighbours.length)];
  // Transition changes only the minority; a street retains its dominant architecture.
  const chosen = mix > 0 && random(s.id,'transition') < mix * .15 && style !== dominant ? region.default_style : style;
  return result(chosen, density ? 'kontekst' : region.id !== 'temperate' ? 'region' : 'fallback', `${landuse ?? 'settlement'}; density=${density}; dominant=${dominant}; transition=${mix.toFixed(2)}`);
}
export function chooseRoof(s: ArchitectureSource, decision: StyleDecision, region: Region): RoofType {
  const explicit: Record<string, RoofType> = { gabled:'gable', hipped:'hip', flat:'flat', sawtooth:'sawtooth', round:'barrel', half_hipped:'hip', gambrel:'steep', pyramidal:'hip', onion:'curved', dome:'barrel' };
  // A former flat-roofed apartment block is now a pitched-roof cottage, as requested by the owner.
  if (explicit[s.tags['roof:shape']] && !(decision.style === 'apartments' && s.tags['roof:shape'] === 'flat')) return explicit[s.tags['roof:shape']];
  const style = STYLES[decision.style];
  const roofs = region.id !== 'temperate' && !['industrial','apartments','landmark'].includes(style.id) ? region.roofs : style.roof_types;
  return weighted(roofs.map(r => ({value:r.type,weight:r.weight})), random(s.id,'roof'));
}
