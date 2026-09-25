import type { CityMap, Building } from './map/CityMap';
import { MISJE, type Miejsce, type Misja } from './content/fabula';

// Mission progress and where things are on the map.

export type MissionState = 'new' | 'active' | 'goal' | 'done';

interface Save {
  coins: number;
  missions: Record<string, MissionState>;
}

const SAVE_KEY = 'erpeg-save-v1';

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { coins: 0, missions: {}, ...JSON.parse(raw) };
  } catch {
    // private mode / blocked storage: start fresh
  }
  return { coins: 0, missions: {} };
}

export const progress = loadSave();

export function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // ignore: the game still works, it just won't remember
  }
}

export function missionState(m: Misja): MissionState {
  return progress.missions[m.id] ?? 'new';
}

export function setMissionState(m: Misja, s: MissionState) {
  progress.missions[m.id] = s;
  saveProgress();
}

export interface Place {
  x: number;
  y: number;
  building?: Building;
}

/** Turns an address or lat/lon into a point on the map (a building's door for addresses). */
export function resolvePlace(city: CityMap, m: Miejsce): Place | null {
  if (typeof m !== 'string') {
    const p = city.fromLatLon(m.lat, m.lon);
    return { ...p };
  }
  const b = city.findBuilding(m);
  if (!b) return null;
  return { ...city.entranceOf(b), building: b };
}

export interface ResolvedMission {
  m: Misja;
  door: Place;
  target: Place | null;
}

/** Resolves every mission; addresses not found on the map are reported. */
export function resolveMissions(city: CityMap) {
  const ok: ResolvedMission[] = [];
  const missing: string[] = [];
  for (const m of MISJE) {
    const door = resolvePlace(city, m.adres);
    const target = resolvePlace(city, m.zadanie.miejsce);
    if (!door) missing.push(m.adres);
    if (!target) missing.push(typeof m.zadanie.miejsce === 'string' ? m.zadanie.miejsce : JSON.stringify(m.zadanie.miejsce));
    if (door) ok.push({ m, door, target });
  }
  return { missions: ok, missing };
}
