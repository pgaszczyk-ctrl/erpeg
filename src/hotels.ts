import { normAddress, PX_PER_M, type CityMap, type Place } from './map/CityMap';
import { HOTELE, HOTEL_KWADRAT_M } from './content/hotele';
import { rng } from './rng';

// Hotels are save and load points. Where they are dense (a city centre) only
// one per 300 m square stays, picked at random but always the same one;
// hotels listed in content/hotele.ts always stay and win their square.

const done = new WeakSet<CityMap>();

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function pickHotels(city: CityMap) {
  if (done.has(city)) return;
  done.add(city);
  const hotels = city.places.filter((p) => p.kind === 'hotel');
  const fixed: Place[] = [];
  for (const h of HOTELE) {
    const q = normAddress(h.adres);
    const named = hotels.find((p) => normAddress(p.name) === q);
    const b = named?.building ?? city.findBuilding(h.adres);
    if (!named && !b) continue; // not on this map
    const door = named?.door ?? city.entranceOf(b!);
    const p: Place = named ?? { kind: 'hotel', name: h.nazwa ?? h.adres, id: `${city.id === 'lublin' ? '' : `${city.id}/`}hotel:${q}`, building: b ?? null, door };
    if (h.nazwa) p.name = h.nazwa;
    if (!fixed.includes(p)) fixed.push(p);
  }
  const cell = HOTEL_KWADRAT_M * PX_PER_M;
  const key = (p: Place) => `${Math.floor(p.door.x / cell)}:${Math.floor(p.door.y / cell)}`;
  const taken = new Set(fixed.map(key));
  const byCell = new Map<string, Place[]>();
  for (const p of hotels) {
    if (fixed.includes(p) || taken.has(key(p))) continue;
    const list = byCell.get(key(p)) ?? [];
    list.push(p);
    byCell.set(key(p), list);
  }
  const keep = new Set<Place>(fixed);
  for (const [k, list] of byCell) {
    list.sort((a, b) => (a.id < b.id ? -1 : 1));
    keep.add(list[Math.floor(rng(hash(`${city.id}:${k}`))() * list.length)]);
  }
  const rest = city.places.filter((p) => p.kind !== 'hotel');
  city.places.length = 0;
  city.places.push(...rest, ...keep);
}

/**
 * A camp site in every village (unless a real one is near): a cheap save
 * point outside the city. Villages: CityMap.settlements().
 */
export function addVillageCamps(city: CityMap) {
  if (campsDone.has(city)) return;
  campsDone.add(city);
  const real = city.places.filter((p) => p.kind === 'camp');
  const near = 1500 * PX_PER_M;
  for (const s of city.settlements()) {
    if (real.some((p) => Math.hypot(p.door.x - s.x, p.door.y - s.y) < near)) continue;
    city.places.push({ kind: 'camp', name: `Pole namiotowe – ${s.name}`, id: `${city.id === 'lublin' ? '' : `${city.id}/`}camp:${s.name}`, building: null, door: { x: s.x, y: s.y } });
  }
}
const campsDone = new WeakSet<CityMap>();
