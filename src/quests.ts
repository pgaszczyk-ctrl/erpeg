import type { CityMap, Building } from './map/CityMap';
import { MISJE, type Miejsce, type Misja } from './content/fabula';
import { api, type LoginResult, type SaveData, type Snapshot } from './api';
import { PX_PER_M } from './map/CityMap';
import { BRONIE, WALKA_MIECZEM } from './content/sklepy';

// The logged-in character: progress lives here during play and is sent to the
// server only at save points (entering a mission building, finishing a
// mission). Dying or leaving without "Wyjdź" loses anything not yet saved.

export type MissionState = 'new' | 'active' | 'goal' | 'done';

export const MAX_HP = 6;

export const session = {
  token: '',
  name: '',
  idik: '',
  startX: 0,
  startY: 0,
  coins: 0,
  exp: 0,
  hp: MAX_HP,
  missions: {} as Record<string, MissionState>,
  fog: undefined as SaveData['fog'],
  sword: BRONIE[0].id,
  swordSkill: 0,
  /** Last known state of a session that was closed without "Wyjdź". */
  abandoned: null as Snapshot | null,
};

export function startSession(r: LoginResult) {
  const p = r.player;
  session.token = r.token ?? '';
  session.name = p.name;
  session.idik = p.idik;
  // Convert from the map scale the start was stored in.
  const k = PX_PER_M / (p.map_scale ?? 4);
  session.startX = p.start_x * k;
  session.startY = p.start_y * k;
  session.fog = p.save.fog;
  session.coins = p.save.coins ?? 0;
  session.sword = BRONIE.some((b) => b.id === p.save.sword) ? p.save.sword! : BRONIE[0].id;
  session.swordSkill = Math.max(0, Math.min(WALKA_MIECZEM.length - 1, p.save.swordSkill ?? 0));
  session.exp = p.exp;
  session.hp = Math.max(1, Math.min(MAX_HP, p.save.hp ?? MAX_HP));
  session.missions = { ...(p.save.missions ?? {}) };
  const a = r.abandoned ?? null;
  if (a) {
    const ka = PX_PER_M / (a.s ?? 4);
    a.x *= ka;
    a.y *= ka;
    for (const e of a.enemies ?? []) {
      e.x *= ka;
      e.y *= ka;
    }
  }
  session.abandoned = a;
}

/** Sends the current progress to the server. */
export function saveNow(hp: number) {
  session.hp = hp;
  const data: SaveData = {
    coins: session.coins, hp, missions: session.missions, fog: session.fog,
    sword: session.sword, swordSkill: session.swordSkill,
  };
  return api.save(session.token, data, session.exp);
}

export function currentSword() {
  return BRONIE.find((b) => b.id === session.sword) ?? BRONIE[0];
}

export function currentSwordSkill() {
  return WALKA_MIECZEM[session.swordSkill] ?? WALKA_MIECZEM[0];
}

export function missionState(m: Misja): MissionState {
  return session.missions[m.id] ?? 'new';
}

export function setMissionState(m: Misja, s: MissionState) {
  session.missions[m.id] = s;
}

/** Experience for finishing a mission (defaults to its coin reward). */
export function missionExp(m: Misja) {
  return m.doswiadczenie ?? m.nagroda;
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
