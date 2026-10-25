// ============================================================================
//  ŁOWISKA — test pilota „walka i gęste łowiska” (brief właściciela, 25.10.2026).
//  Cztery poziomy z briefu: siedlisko (komórka 1 km lasu) → miejsce watahy
//  (`Pakiet`, stabilne id, bez loginowego seeda – przetrwa relogin) →
//  generacja (`gen`, skład losowany na nowo po odnowieniu) → aktywne modele
//  (spawn/despawn w zależności od odległości od bohatera).
//
//  Osobna, mała klasa – NIE rozszerza współdzielonego src/scenes/Ambient.ts
//  StreetEnemies (którego zmiana dotyczyłaby każdego innego potwora w grze).
//  Watahy żyją tylko w prawdziwych lasach OSM (CityMap.areaKindsAt zwraca
//  'forest' dla natural=wood/landuse=forest – ten sam adapter terenu, który
//  już dziś stawia driady w lesie, src/scenes/Ambient.ts kindAt()).
//
//  Odnawianie: zegar to SEKUNDY AKTYWNEJ SYMULACJI (nie zegar ścienny) –
//  dostarcza go z zewnątrz `czasAktywny()`, naliczany przez GameScene.update
//  tylko wtedy, gdy scena naprawdę działa (nie podczas pauzy/dialogu/karty
//  w tle – to już gwarantuje istniejący kod, patrz GameScene.update()).
//
//  Trwałość między sesjami: NIE jest jeszcze zapisywana na serwerze (to by
//  wymagało nowej kolumny w bazie – większa, osobna zmiana, patrz raport dla
//  właściciela). W tej wersji pilota siedliska/generacje żyją w pamięci sesji,
//  tak jak dziś gangi (Ambient.ts StreetEnemies) – to jest znana, opisana
//  różnica względem briefu, nie przeoczenie.
// ============================================================================

import { PX_PER_M, type CityMap } from '../map/CityMap';
import { rng } from '../rng';
import type { RodzajWroga } from '../content/fabula';
import { LOWISKA } from '../content/lowiska';

const KM = 1000 * PX_PER_M;

export interface LowiskoSpawn {
  x: number;
  y: number;
  kind: RodzajWroga;
}

export interface Pakiet {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Większe spotkanie (8–12) zamiast zwykłej watahy (3–6). */
  big: boolean;
  /** Numer generacji – rośnie przy każdym odnowieniu. */
  gen: number;
  spots: LowiskoSpawn[] | null;
  /** Indeksy w `spots` wciąż żywe w tej generacji. */
  alive: Set<number>;
  members: Map<number, unknown>;
  /** Wartość `czasAktywny()` w chwili rozbicia; null = wataha wciąż aktywna. */
  clearedAtS: number | null;
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class Lowiska {
  private pakiety: Pakiet[] = [];
  private planned = new Set<string>();

  constructor(
    private city: CityMap,
    /** Miejsca, których należy unikać (drzwi, dom) – tak jak przy gangach. */
    private avoid: { x: number; y: number }[],
    private spawn: (s: LowiskoSpawn, p: Pakiet) => unknown,
    private despawn: (u: unknown) => boolean,
    private czasAktywny: () => number,
    private events: { rozbity: (p: Pakiet) => void },
  ) {}

  private nearAvoid(x: number, y: number, m: number) {
    const d = m * PX_PER_M;
    return this.avoid.some((pt) => Math.abs(pt.x - x) < d && Math.abs(pt.y - y) < d && Math.hypot(pt.x - x, pt.y - y) < d);
  }

  /** Siedliska jednej komórki 1 km – stabilny seed (bez loginowego nonce'u), to samo miejsce po każdym wejściu. */
  private planCell(cx: number, cy: number) {
    const key = `${cx},${cy}`;
    if (this.planned.has(key)) return;
    this.planned.add(key);
    const r = rng(hashSeed(`${this.city.id}:lowisko:${key}`));
    const want = LOWISKA.naKm2Lasu;
    const n = Math.floor(want) + (r() < want % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 16; t++) {
        const x = (cx + r()) * KM, y = (cy + r()) * KM;
        if (!this.city.areaKindsAt(x, y).includes('forest')) continue;
        if (this.city.isBlocked(x, y) || this.nearAvoid(x, y, 120)) continue;
        const rr = LOWISKA.promienM * PX_PER_M;
        if (this.pakiety.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + rr) * 0.7)) continue;
        const big = r() < LOWISKA.wieksze.szansa;
        this.pakiety.push({ id: `${this.city.id}:lowisko:${key}:${i}`, x, y, r: rr, big, gen: 0, spots: null, alive: new Set(), members: new Map(), clearedAtS: null });
        break;
      }
    }
  }

  /** Losuje skład nowej generacji (miejsca w terytorium, kto jest wargiem). */
  private makeSpots(p: Pakiet) {
    const r = rng(hashSeed(`${p.id}:${p.gen}`));
    const [lo, hi] = p.big ? LOWISKA.wieksze.czlonkow : LOWISKA.pakiet;
    const want = lo + Math.floor(r() * (hi - lo + 1));
    const spots: LowiskoSpawn[] = [];
    for (let t = 0; spots.length < want && t < want * 40; t++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * p.r * 0.8;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (!this.city.isFree(x, y, 4, 4) || this.nearAvoid(x, y, 30)) continue;
      spots.push({ x, y, kind: 'wilk' });
    }
    // Warg: nigdy obowiązkowy (jedna watacha nie staje się przez to nieprzechodnia).
    if (spots.length && r() < LOWISKA.szansaWarga) spots[Math.floor(r() * spots.length)].kind = 'warg';
    p.spots = spots;
    p.alive = new Set(spots.map((_, i) => i));
    p.members = new Map();
  }

  /** Wataha rozbita: wszyscy jej aktywni członkowie zostali pokonani. */
  killed(e: unknown) {
    for (const p of this.pakiety) {
      for (const [i, m] of p.members) {
        if (m !== e) continue;
        p.members.delete(i);
        p.alive.delete(i);
        if (!p.alive.size) {
          p.clearedAtS = this.czasAktywny();
          this.events.rozbity(p);
        }
        return;
      }
    }
  }

  private spawnAll(p: Pakiet) {
    if (!p.spots) {
      if (!this.city.ready({ x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r })) return;
      p.gen++;
      this.makeSpots(p);
    }
    for (const i of p.alive) {
      if (p.members.has(i)) continue;
      p.members.set(i, this.spawn(p.spots![i], p));
    }
  }

  private despawnAll(p: Pakiet) {
    for (const [i, m] of [...p.members]) {
      if (this.despawn(m)) p.members.delete(i);
    }
  }

  update(px: number, py: number) {
    const cx = Math.floor(px / KM), cy = Math.floor(py / KM);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const ccx = cx + dx, ccy = cy + dy;
      // Only once that cell's tiles are actually loaded – else nothing is forest/free yet and the
      // cell would be marked "planned" with no habitat for good (same guard as StreetEnemies.update).
      if (this.city.ready({ x0: ccx * KM, y0: ccy * KM, x1: (ccx + 1) * KM, y1: (ccy + 1) * KM })) this.planCell(ccx, ccy);
    }

    const czas = this.czasAktywny();
    const aktywacjaPx = LOWISKA.aktywacjaM * PX_PER_M;
    const widocznePx = LOWISKA.bezOdnowieniaWidoczneM * PX_PER_M;
    for (const p of this.pakiety) {
      if (p.clearedAtS !== null) {
        const widoczna = Math.hypot(p.x - px, p.y - py) < widocznePx;
        const minelo = czas - p.clearedAtS >= LOWISKA.odnowieniePoS;
        if (widoczna || !minelo) continue; // czeka na odnowienie
        p.spots = null; // nowa generacja przy następnym spawnAll
        p.clearedAtS = null;
      }
      const blisko = Math.hypot(p.x - px, p.y - py) < aktywacjaPx;
      if (blisko) this.spawnAll(p);
      else this.despawnAll(p);
    }
  }
}
