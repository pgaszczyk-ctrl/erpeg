// Loch jako mała osobna mapa (jak mapy miasteczek): ściany to „budynki” (zatrzymują bohatera, potwory, pociski
// i wzrok – mgła wojny działa sama), podłoga to jeden utwardzony obszar (pełna prędkość). MapRenderer jej nie
// maluje: rysunek robi scenes/Lochy.ts (LochWnetrze). Id mapy niesie wszystko, co potrzebne do odtworzenia:
//   loch:<rodzaj>:<seed>:<lat>:<lon>
import { CityMap, PX_PER_M } from '../map/CityMap';
import type { RodzajLochu } from '../content/lochy';
import { planLochu, type PlanLochu } from './plan';

export interface IdLochu { rodzaj: RodzajLochu; seed: number; lat: number; lon: number; tutorial?: boolean }

export const jestLochem = (id: string) => id.startsWith('loch:');

export function idLochu(l: IdLochu) {
  return `loch:${l.tutorial ? 'prolog:' : ''}${l.rodzaj}:${l.seed}:${l.lat.toFixed(5)}:${l.lon.toFixed(5)}`;
}

export function czytajIdLochu(id: string): IdLochu | null {
  const m = /^loch:(prolog:)?(krypta|podziemia):(\d+):(-?[\d.]+):(-?[\d.]+)$/.exec(id);
  if (!m) return null;
  return { tutorial: !!m[1], rodzaj: m[2] as RodzajLochu, seed: Number(m[3]), lat: Number(m[4]), lon: Number(m[5]) };
}

/** Mapa lochu z jej planem (`city.loch`). */
export function mapaLochu(id: string): CityMap {
  const l = czytajIdLochu(id);
  if (!l) throw new Error('Nieznany loch');
  const plan = planLochu(l.rodzaj, l.seed, l.tutorial);
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
