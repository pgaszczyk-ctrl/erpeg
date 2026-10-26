// ============================================================================
//  ŁOWISKA — epicentryczne siedliska w otwartym terenie (właściciel, 26.10.2026;
//  brief „walka i łowiska” 5A). Cztery poziomy z briefu:
//    łowisko (stała kotwica + promień, trzy warstwy) → miejsce grupy (`Pakiet`,
//    stabilne id) → generacja (skład losowany na nowo po odnowieniu) → aktywne
//    modele (spawn/despawn zależnie od odległości od bohatera).
//
//  Kotwica: komórka LOWISKA_EPI.komorkaKm, ziarno = id mapy + komórka (bez
//  loginowego nonce'u – to samo łowisko dla każdej postaci i po każdym wejściu).
//  Warunki: otwarty teren (las/pole/łąka/zarośla/mokradła wg OSM, nie park
//  miejski), w promieniu `osadaM` najwyżej `maksDomow` budynków (1–2 samotne domy
//  są dopuszczalne, wieś wyklucza), z dala od drzwi/domu i od bardzo głównych dróg
//  (linie 'major': autostrady, ekspresówki, krajowe).
//
//  Warstwy: obrzeże – wilki; głębia – wargi; rdzeń – boss (zastępczy QA: Mosiężny
//  Kozioł, nie bazyliszek) z obstawą. Każde miejsce grupy sprawdzane osobno
//  (wolne, otwarty teren, z dala od budynków; głębia i rdzeń z dala od głównej
//  drogi). Zwykłe grupy odnawiają się po LOWISKA.odnowieniePoS sekundach
//  AKTYWNEJ gry, gdy bohater jest daleko; boss po bossOdnowienieS.
//
//  Czerwona mgiełka (ta sama co przy gangach, Ambient.ts mgielkaTekstury):
//  wnętrze każdej warstwy coraz gęstsze ku środkowi, kłęby dymu na granicy
//  łowiska i (rzadsze) na granicy głębi. Mgiełka nie zadaje obrażeń.
//
//  Stan generacji żyje w pamięci sesji (nie w zapisie) – znana różnica wobec
//  briefu: po nowym logowaniu grupy są pełne.
// ============================================================================

import Phaser from 'phaser';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { GROUND_DEPTH } from '../map/MapRenderer';
import { rng } from '../rng';
import type { RodzajWroga } from '../content/fabula';
import { LOWISKA, LOWISKA_EPI } from '../content/lowiska';
import { GANG_MGLA } from '../content/gangi';
import { mgielkaTekstury } from './Ambient';

const M = PX_PER_M;

export interface LowiskoSpawn {
  x: number;
  y: number;
  kind: RodzajWroga;
}

export type Warstwa = 'obrzeze' | 'glebia' | 'rdzen';

export interface Pakiet {
  id: string;
  x: number;
  y: number;
  /** Teren grupy (px) – za nim wilk przestaje gonić. */
  r: number;
  warstwa: Warstwa;
  /** Numer generacji – rośnie przy każdym odnowieniu. */
  gen: number;
  spots: LowiskoSpawn[] | null;
  alive: Set<number>;
  members: Map<number, unknown>;
  /** Wartość `czasAktywny()` w chwili rozbicia; null = grupa wciąż aktywna. */
  clearedAtS: number | null;
}

export interface Lowisko {
  id: string;
  x: number;
  y: number;
  /** Promień całości (px). */
  r: number;
  pakiety: Pakiet[];
  mgla?: Phaser.GameObjects.Image[];
  kleby?: Phaser.GameObjects.Image[];
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class Lowiska {
  /** Wszystkie miejsca grup (płaska lista – też dla testów). */
  pakiety: Pakiet[] = [];
  lowiska: Lowisko[] = [];
  private planned = new Set<string>();
  private komorka = LOWISKA_EPI.komorkaKm * 1000 * M;
  private ostatniaWarstwa: Warstwa | null = null;

  constructor(
    private scene: Phaser.Scene,
    private city: CityMap,
    /** Miejsca, których należy unikać (drzwi, dom) – tak jak przy gangach. */
    private avoid: { x: number; y: number }[],
    private spawn: (s: LowiskoSpawn, p: Pakiet) => unknown,
    private despawn: (u: unknown) => boolean,
    private czasAktywny: () => number,
    /** Komunikat przy wejściu w mocniejszą warstwę. */
    private powiedz: (t: string) => void = () => {},
  ) {}

  private nearAvoid(x: number, y: number, m: number) {
    const d = m * M;
    return this.avoid.some((pt) => Math.abs(pt.x - x) < d && Math.abs(pt.y - y) < d && Math.hypot(pt.x - x, pt.y - y) < d);
  }

  private otwarte(x: number, y: number) {
    const k = this.city.areaKindsAt(x, y);
    if (k.includes('water') || k.includes('park') || k.includes('cemetery') || k.includes('allotments')) return false;
    return k.some((q) => LOWISKA_EPI.teren.includes(q));
  }

  private domyW(x: number, y: number, r: number) {
    let n = 0;
    for (const b of this.city.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }).buildings) {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      if (Math.hypot(cx - x, cy - y) < r) n++;
    }
    return n;
  }

  private glownaBlisko(x: number, y: number, r: number) {
    return this.city.query({ x0: x - r, y0: y - r, x1: x + r, y1: y + r }).lines.some((l) => l.kind === 'major');
  }

  /** Łowisko jednej komórki – stabilne ziarno (bez loginowego nonce'u). */
  private planCell(cx: number, cy: number) {
    const key = `${cx},${cy}`;
    if (this.planned.has(key)) return;
    this.planned.add(key);
    const E = LOWISKA_EPI;
    const r = rng(hashSeed(`${this.city.id}:lowisko-epi:${key}`));
    if (r() > E.szansa) return;
    const R = E.promienM * M;
    for (let t = 0; t < 24; t++) {
      const x = (cx + 0.15 + r() * 0.7) * this.komorka, y = (cy + 0.15 + r() * 0.7) * this.komorka;
      if (!this.otwarte(x, y) || this.city.isBlocked(x, y) || this.nearAvoid(x, y, E.odMiejscM)) continue;
      if (this.lowiska.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + R)) continue;
      if (this.domyW(x, y, E.osadaM * M) > E.maksDomow) continue;
      if (this.glownaBlisko(x, y, E.odGlownejM * M)) continue;
      // Enough open land around (a thin strip of field in a village is no hunting ground).
      let ok = 0;
      const prob = 24;
      for (let i = 0; i < prob; i++) {
        const a = (i / prob) * Math.PI * 2, d = R * (0.35 + 0.6 * ((i * 7) % 5) / 4);
        if (this.otwarte(x + Math.cos(a) * d, y + Math.sin(a) * d)) ok++;
      }
      if (ok / prob < E.minOtwartego) continue;
      this.lowiska.push(this.zbuduj(`${this.city.id}:lowisko:${key}`, x, y, R, r));
      return;
    }
  }

  /** Miejsca grup w trzech warstwach (każde sprawdzone osobno). */
  private zbuduj(id: string, x: number, y: number, R: number, r: () => number): Lowisko {
    const E = LOWISKA_EPI;
    const l: Lowisko = { id, x, y, r: R, pakiety: [] };
    const miejsce = (w: Warstwa, dMin: number, dMax: number, a0: number) => {
      for (let t = 0; t < 14; t++) {
        const a = a0 + (r() - 0.5) * 0.9, d = dMin + r() * (dMax - dMin);
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (!this.city.isFree(px, py, 6, 6) || !this.otwarte(px, py)) continue;
        if (this.domyW(px, py, E.grupaOdDomuM * M) > 0) continue;
        if (this.glownaBlisko(px, py, (w === 'obrzeze' ? E.grupaOdGlownejM : E.odGlownejM * 0.6) * M)) continue;
        if (l.pakiety.some((p) => Math.hypot(p.x - px, p.y - py) < E.grupaM * M * 0.9)) continue;
        return { x: px, y: py };
      }
      return null;
    };
    const dodaj = (w: Warstwa, n: number, dMin: number, dMax: number) => {
      const start = r() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const at = miejsce(w, dMin, dMax, start + (i / n) * Math.PI * 2);
        if (!at) continue;
        l.pakiety.push({ id: `${id}:${w}:${i}`, x: at.x, y: at.y, r: E.grupaM * M, warstwa: w, gen: 0, spots: null, alive: new Set(), members: new Map(), clearedAtS: null });
      }
    };
    dodaj('obrzeze', E.obrzeze.miejsc, R * (E.glebiaOd + 0.05), R * 0.95);
    dodaj('glebia', E.glebia.miejsc, R * (E.rdzenOd + 0.05), R * (E.glebiaOd - 0.05));
    dodaj('rdzen', 1, 0, R * E.rdzenOd * 0.6);
    this.pakiety.push(...l.pakiety);
    return l;
  }

  /** Skład nowej generacji grupy. */
  private makeSpots(p: Pakiet) {
    const E = LOWISKA_EPI;
    const r = rng(hashSeed(`${p.id}:${p.gen}`));
    const spots: LowiskoSpawn[] = [];
    const kinds: RodzajWroga[] = [];
    if (p.warstwa === 'rdzen') {
      kinds.push(E.rdzen.boss as RodzajWroga);
      for (let i = 0; i < E.rdzen.obstawa; i++) kinds.push('warg');
    } else {
      const [lo, hi] = p.warstwa === 'obrzeze' ? E.obrzeze.czlonkow : E.glebia.czlonkow;
      const n = lo + Math.floor(r() * (hi - lo + 1));
      for (let i = 0; i < n; i++) kinds.push(p.warstwa === 'obrzeze' ? 'wilk' : r() < 0.75 ? 'warg' : 'wilk');
    }
    for (let i = 0, t = 0; i < kinds.length && t < kinds.length * 40; t++) {
      const a = r() * Math.PI * 2, d = i === 0 && p.warstwa === 'rdzen' ? 0 : Math.sqrt(r()) * p.r * 0.45;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (!this.city.isFree(x, y, 4, 4)) continue;
      spots.push({ x, y, kind: kinds[i] });
      i++;
    }
    p.spots = spots;
    p.alive = new Set(spots.map((_, i) => i));
    p.members = new Map();
  }

  killed(e: unknown) {
    for (const p of this.pakiety) {
      for (const [i, m] of p.members) {
        if (m !== e) continue;
        p.members.delete(i);
        p.alive.delete(i);
        if (!p.alive.size) p.clearedAtS = this.czasAktywny();
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

  /** W której warstwie łowiska stoi punkt (null = poza łowiskami). */
  warstwaW(x: number, y: number): Warstwa | null {
    const E = LOWISKA_EPI;
    for (const l of this.lowiska) {
      const d = Math.hypot(l.x - x, l.y - y);
      if (d >= l.r) continue;
      return d < l.r * E.rdzenOd ? 'rdzen' : d < l.r * E.glebiaOd ? 'glebia' : 'obrzeze';
    }
    return null;
  }

  /** W czerwonej mgiełce łowiska. */
  wMgle(x: number, y: number) {
    return this.warstwaW(x, y) !== null;
  }

  private mgla(l: Lowisko) {
    mgielkaTekstury(this.scene);
    const E = LOWISKA_EPI;
    const d = GROUND_DEPTH + 1;
    const kolo = (rr: number, a: number) => this.scene.add.image(l.x, l.y, 'gang-wnetrze').setDisplaySize(rr * 2, rr * 2).setTint(GANG_MGLA.kolor).setAlpha(a).setDepth(d);
    l.mgla = [kolo(l.r, E.mgla.obrzeze), kolo(l.r * E.glebiaOd, E.mgla.glebia), kolo(l.r * E.rdzenOd, E.mgla.rdzen)];
    const r = rng(hashSeed(`${l.id}:mgla`));
    const kleby: Phaser.GameObjects.Image[] = [];
    for (const [rr, gest, alfa] of [[l.r, 1, 1], [l.r * E.glebiaOd, 0.45, 0.6]] as [number, number, number][]) {
      const n = Math.max(16, Math.round(((Math.PI * 2 * rr) / E.mgla.klebyCoPx) * gest));
      for (let i = 0; i < n; i++) {
        const a = ((i + r() * 0.8) / n) * Math.PI * 2;
        const q = rr + (r() * 2 - 1) * GANG_MGLA.klebyRozrzut;
        const size = GANG_MGLA.klebyPx[0] + r() * (GANG_MGLA.klebyPx[1] - GANG_MGLA.klebyPx[0]);
        const al = (GANG_MGLA.klebyAlfa[0] + r() * (GANG_MGLA.klebyAlfa[1] - GANG_MGLA.klebyAlfa[0])) * alfa;
        const p = this.scene.add.image(l.x + Math.cos(a) * q, l.y + Math.sin(a) * q, 'gang-klab')
          .setDisplaySize(size, size * (0.75 + r() * 0.3)).setTint(r() < 0.35 ? 0xff7a7a : GANG_MGLA.kolor).setAlpha(al).setDepth(d + 0.5);
        p.setData('a', al).setData('f', r() * Math.PI * 2).setData('t', 3 + r() * 3);
        kleby.push(p);
      }
    }
    l.kleby = kleby;
  }

  private bezMgly(l: Lowisko) {
    for (const o of l.mgla ?? []) o.destroy();
    for (const o of l.kleby ?? []) o.destroy();
    l.mgla = l.kleby = undefined;
  }

  /** Kłęby na granicy powoli oddychają; poza ekranem ukryte. */
  private oddychaj(now: number) {
    const v = this.scene.cameras.main.worldView;
    const t = now / 1000;
    for (const l of this.lowiska) {
      if (!l.kleby) continue;
      const near = l.x + l.r + 40 > v.x && l.x - l.r - 40 < v.right && l.y + l.r + 40 > v.y && l.y - l.r - 40 < v.bottom;
      for (const m of l.mgla!) m.setVisible(near);
      for (const p of l.kleby) {
        const on = near && p.x > v.x - 30 && p.x < v.right + 30 && p.y > v.y - 30 && p.y < v.bottom + 30;
        p.setVisible(on);
        if (on) p.setAlpha((p.getData('a') as number) * (0.8 + 0.2 * Math.sin((t * Math.PI * 2) / (p.getData('t') as number) + (p.getData('f') as number))));
      }
    }
  }

  update(px: number, py: number, now = this.scene.time.now) {
    const K = this.komorka;
    const cx = Math.floor(px / K), cy = Math.floor(py / K);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const ccx = cx + dx, ccy = cy + dy;
      // Only once that cell's tiles are loaded – else nothing is open land yet and the cell would stay empty for good.
      if (this.city.ready({ x0: ccx * K, y0: ccy * K, x1: (ccx + 1) * K, y1: (ccy + 1) * K })) this.planCell(ccx, ccy);
    }
    this.oddychaj(now);

    const czas = this.czasAktywny();
    const aktywacjaPx = LOWISKA.aktywacjaM * M;
    const widocznePx = LOWISKA.bezOdnowieniaWidoczneM * M;
    for (const l of this.lowiska) {
      const d = Math.hypot(l.x - px, l.y - py);
      if (d < l.r + 1500 * M) {
        if (!l.mgla) this.mgla(l);
      } else if (l.mgla) this.bezMgly(l);
    }
    for (const p of this.pakiety) {
      if (p.clearedAtS !== null) {
        const widoczna = Math.hypot(p.x - px, p.y - py) < widocznePx;
        const czekaj = p.warstwa === 'rdzen' ? LOWISKA_EPI.bossOdnowienieS : LOWISKA.odnowieniePoS;
        if (widoczna || czas - p.clearedAtS < czekaj) continue;
        p.spots = null; // nowa generacja przy następnym spawnAll
        p.clearedAtS = null;
      }
      const blisko = Math.hypot(p.x - px, p.y - py) < aktywacjaPx;
      if (blisko) this.spawnAll(p);
      else this.despawnAll(p);
    }

    // Wejście w mocniejszą warstwę: krótkie ostrzeżenie.
    const w = this.warstwaW(px, py);
    if (w !== this.ostatniaWarstwa) {
      const glebiej = (w === 'glebia' && this.ostatniaWarstwa !== 'rdzen') || w === 'rdzen' || (w === 'obrzeze' && this.ostatniaWarstwa === null);
      if (glebiej && w) this.powiedz(w === 'obrzeze' ? '🐺 Łowisko: wilki w okolicy. Głębiej będzie groźniej.' : w === 'glebia' ? '⚠ Głębia łowiska: wargi – silniejsze od wilków.' : '☠ Rdzeń łowiska: tu mieszka coś naprawdę groźnego!');
      if (!w && this.ostatniaWarstwa) this.powiedz('Wyszedłeś z łowiska – tu odpoczniesz.');
      this.ostatniaWarstwa = w;
    }
  }

  destroy() {
    for (const l of this.lowiska) this.bezMgly(l);
  }
}
