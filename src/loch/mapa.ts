// Loch jako mała osobna mapa (jak mapy miasteczek): ściany to „budynki” (zatrzymują bohatera, potwory, pociski
// i wzrok – mgła wojny działa sama), podłoga to jeden utwardzony obszar (pełna prędkość). MapRenderer jej nie
// maluje: rysunek robi scenes/Lochy.ts (LochWnetrze). Id mapy niesie wszystko, co potrzebne do odtworzenia:
//   loch:<rodzaj>:<seed>:<lat>:<lon>
import { CityMap, PX_PER_M } from '../map/CityMap';
import type { RodzajLochu } from '../content/lochy';
import { planLochu, poziomyLochu, type PlanLochu } from './plan';

export interface IdLochu { rodzaj: RodzajLochu; seed: number; lat: number; lon: number; tutorial?: boolean; /** A mission stage's dungeon (Etap typ 'loch'). */ misja?: boolean; /** Level below the surface (1 = first, default). */ poziom?: number }

export const jestLochem = (id: string) => id.startsWith('loch:');

/** Names of mission dungeons by map id (set when going down; the HUD and map screen read them). */
export const nazwyLochow = new Map<string, string>();

export function idLochu(l: IdLochu) {
  const p = l.poziom && l.poziom > 1 ? `:p${l.poziom}` : '';
  return `loch:${l.tutorial ? 'prolog:' : l.misja ? 'misja:' : ''}${l.rodzaj}:${l.seed}:${l.lat.toFixed(5)}:${l.lon.toFixed(5)}${p}`;
}

/** The same dungeon, another level. */
export function idPoziomu(id: string, poziom: number) {
  const l = czytajIdLochu(id);
  return l ? idLochu({ ...l, poziom }) : id;
}

/** How many levels the dungeon has (missions and the prologue: one). */
export function poziomyId(l: IdLochu) {
  return l.tutorial || l.misja ? { normalne: 1, ukryty: false } : poziomyLochu(l.rodzaj, l.seed);
}

export function czytajIdLochu(id: string): IdLochu | null {
  const m = /^loch:(prolog:|misja:)?(krypta|podziemia|jaskinia):(\d+):(-?[\d.]+):(-?[\d.]+)(?::p(\d+))?$/.exec(id);
  if (!m) return null;
  return { tutorial: m[1] === 'prolog:', misja: m[1] === 'misja:', rodzaj: m[2] as RodzajLochu, seed: Number(m[3]), lat: Number(m[4]), lon: Number(m[5]), poziom: m[6] ? Number(m[6]) : 1 };
}

/** Mapa lochu z jej planem (`city.loch`). */
export function mapaLochu(id: string): CityMap {
  const l = czytajIdLochu(id);
  if (!l) throw new Error('Nieznany loch');
  const lv = poziomyId(l);
  const plan = planLochu(l.rodzaj, l.seed, l.tutorial, { poziom: Math.min(l.poziom ?? 1, lv.normalne + (lv.ukryty ? 1 : 0)), ...lv });
  const T = plan.T;
  const W = plan.w * T, H = plan.h * T;
  // Jednostki mapy = px (unitsPerM = PX_PER_M → k = 1); pierścienie zapisane różnicowo jak w plikach map.
  const prost = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1 - x0, 0, 0, y1 - y0, x0 - x1, 0];
  const dLat = H / PX_PER_M / 111_132, dLon = W / PX_PER_M / (111_320 * Math.cos((l.lat * Math.PI) / 180));
  const raw = {
    unitsPerM: PX_PER_M,
    bounds: { minLat: l.lat - dLat, maxLat: l.lat, minLon: l.lon, maxLon: l.lon + dLon },
    w: W / PX_PER_M,
    h: H / PX_PER_M,
    boundary: [prost(0, 0, W, H)],
    areas: [['paved', prost(T, T, W - T, H - T)]] as [string, ...number[][]][],
    lines: [] as [string, number, number[], string | 0][],
    buildings: plan.sciany.map(([x0, y0, x1, y1]) => [[prost(x0 * T, y0 * T, x1 * T, y1 * T)], 0, 0, 1]) as [number[][], string | 0, string | 0, number][],
  };
  const city = new CityMap(raw, id);
  city.loch = plan;
  return city;
}

export type { PlanLochu };
