import { PX_PER_M, type CityMap } from '../map/CityMap';
import { rng } from '../rng';
import { SMOKI_NA_MAPIE as S, type GatunekId } from '../content/smoki';
import type { Slime } from '../objects/Slime';

// Smoki w terenie (właściciel 7.10.2026: „wg środowiska, rzadko”): w kratce 1 km z małą szansą, tylko poza centrum,
// w punkcie, którego teren pasuje do gatunku. Kratki i miejsca stałe (z id mapy i kratki); pokonany smok nie wraca
// do końca tej wizyty w grze. Smok pojawia się, gdy bohaterka jest w pobliżu, i znika, gdy odejdzie daleko.

const KRATKA_M = 1000;

interface Miejsce { key: string; x: number; y: number; g: GatunekId; s?: Slime }

export interface SmokiHost {
  city: CityMap;
  /** Dom (nie bliżej niż odDomuM). */
  home: { x: number; y: number } | null;
  spawn: (x: number, y: number, g: GatunekId) => Slime;
  despawn: (s: Slime) => void;
  /** Smoki w terenie dopiero od poziomu 5 i po odblokowaniu w historii (Mag wysłał na smoka). */
  odblokowane: () => boolean;
}

export class SmokiNaMapie {
  private kratki = new Map<string, Miejsce | null>();
  private pokonane = new Set<string>();
  private zywe = new Map<string, Miejsce>();
  private nastepne = 0;

  constructor(private host: SmokiHost) {}

  update(hx: number, hy: number) {
    const now = performance.now();
    if (now < this.nastepne) return;
    this.nastepne = now + 1000;
    if (!this.host.odblokowane()) return;
    const K = KRATKA_M * PX_PER_M;
    const cx = Math.floor(hx / K), cy = Math.floor(hy / K);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
      const key = `${this.host.city.id}|${x},${y}`;
      if (!this.kratki.has(key)) {
        const box = { x0: x * K, y0: y * K, x1: (x + 1) * K, y1: (y + 1) * K };
        if (!this.host.city.ready(box)) continue;
        this.kratki.set(key, this.zaplanuj(key, box));
      }
      const m = this.kratki.get(key);
      if (!m || m.s || this.pokonane.has(key)) continue;
      if (Math.hypot(m.x - hx, m.y - hy) > S.odRuchu * PX_PER_M * 0.6) continue;
      m.s = this.host.spawn(m.x, m.y, m.g);
      this.zywe.set(key, m);
    }
    // Daleko od bohaterki i nie w walce: znika (wróci, gdy podejdzie).
    for (const [key, m] of this.zywe) {
      if (!m.s || !m.s.active) { this.zywe.delete(key); m.s = undefined; continue; }
      if (m.s.chasing) continue;
      if (Math.hypot(m.x - hx, m.y - hy) > S.odRuchu * PX_PER_M) {
        this.host.despawn(m.s);
        m.s = undefined;
        this.zywe.delete(key);
      }
    }
  }

  /** Pokonany: nie wraca do końca tej wizyty. */
  pokonany(s: Slime) {
    for (const [key, m] of this.zywe) if (m.s === s) { this.pokonane.add(key); this.zywe.delete(key); m.s = undefined; }
  }

  private zaplanuj(key: string, box: { x0: number; y0: number; x1: number; y1: number }): Miejsce | null {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const r = rng(h >>> 0);
    if (r() >= S.szansa) return null;
    const c = this.host.city;
    // Poza centrum: mało miejsc (sklepów, szkół…) w kratce.
    const miejsca = c.places.filter((p) => p.door.x >= box.x0 && p.door.x < box.x1 && p.door.y >= box.y0 && p.door.y < box.y1);
    if (miejsca.length > S.maksMiejsc) return null;
    const M = PX_PER_M;
    for (let i = 0; i < S.prob; i++) {
      const x = box.x0 + r() * (box.x1 - box.x0), y = box.y0 + r() * (box.y1 - box.y0);
      if (c.isBlocked(x, y)) continue;
      const home = this.host.home;
      if (home && Math.hypot(home.x - x, home.y - y) < S.odDomuM * M) continue;
      if (miejsca.some((p) => Math.hypot(p.door.x - x, p.door.y - y) < S.odMiejscM * M)) continue;
      const g = this.gatunekW(x, y, r);
      if (g) return { key, x, y, g };
    }
    return null;
  }

  /** Teren → gatunek (tabela 2 zadania): góry, las/park, woda/bagno, cmentarz, tory (teren kolejowy, przemysł). */
  private gatunekW(x: number, y: number, r: () => number): GatunekId | null {
    const c = this.host.city, M = PX_PER_M;
    if (c.terrain && c.terrain.heightAt(x, y) > 700) return 'gorski';
    const kinds = c.areaKindsAt(x, y);
    if (kinds.includes('cemetery')) return 'trujacy';
    if (kinds.includes('wetland')) return r() < 0.5 ? 'kwasowy' : 'trujacy';
    if (c.nearWater(x, y, 30 * M)) return r() < 0.6 ? 'kwasowy' : 'trujacy';
    if (kinds.includes('forest') || kinds.includes('park') || kinds.includes('scrub')) return 'lesny';
    const tory = c.query({ x0: x - 60 * M, y0: y - 60 * M, x1: x + 60 * M, y1: y + 60 * M }).lines.some((l) => l.kind === 'rail');
    if (tory || kinds.includes('sand')) return 'ognisty';
    return null;
  }
}
