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
import { PX_PER_M, ROAD_KINDS, distToPolyline, type CityMap, type Line } from '../map/CityMap';
import { OBOZ, TEREN_SIEDLISK, WERSJA_SIEDLISK, ODNOWIENIE_SIEDLISK, TYPY_SIEDLISK, type TypSiedliska } from '../content/siedliska';
import { planujOboz } from '../siedliska/plan';
import { planujRumowisko, planujBagno } from '../siedliska/planTypy';
import { dodajSiedlisko } from '../siedliska/rejestr';
import { wWielokacie } from '../siedliska/kolizje';
import type { Siedlisko, TerenSiedliska } from '../siedliska/typy';
import { session } from '../quests';
import { tx } from '../i18n';
import { stylRegionu } from '../content/styleRegionow';
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
  /** Siedliska: szaleniec (czerwona aura) i mnożnik siły (Slime.power). */
  berserk?: boolean;
  moc?: number;
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
  /** Siedlisko (src/siedliska): stały skład i stałe punkty z planu (każda generacja taka sama). */
  stale?: LowiskoSpawn[];
  /** Grupa szefa siedliska: klucz w session.daily, pod którym zapisany jest czas pokonania szefa (przeżywa logowanie). */
  szef?: string;
  /** Własny czas odnowienia (s aktywnej gry). */
  odnowienieS?: number;
}

export interface Lowisko {
  id: string;
  x: number;
  y: number;
  /** Promień całości (px). */
  r: number;
  pakiety: Pakiet[];
  /** Małe łowisko w parku: sama warstwa zewnętrzna. */
  park?: boolean;
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
    // Siedlisko (obóz z palisadą) ma pierwszeństwo: komórka z obozem nie dostaje łowiska. Obóz leży w środkowej
    // części komórki, więc nigdy nie zachodzi na łowiska sąsiednich komórek (ich zasięg ≤ 0,15 komórki + promień).
    if (this.obozy && this.planujObozW(cx, cy, key)) return;
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
    this.planPark(cx, cy, r);
  }

  /** Drogowskazy (src/drogowskazy): cell size, whether a cell may hold a settlement at all (only the first roll of its
   * fixed seed, no terrain needed), planning a far cell on demand once its tiles are in, and the cell's settlement. */
  get komorkaPx() { return this.komorka; }
  mozeSiedlisko(cx: number, cy: number) {
    return this.obozy && rng(hashSeed(`${this.city.id}:siedlisko:v${WERSJA_SIEDLISK}:${cx},${cy}`))() <= OBOZ.szansa;
  }
  zaplanowana(cx: number, cy: number) { return this.planned.has(`${cx},${cy}`); }
  zaplanuj(cx: number, cy: number) {
    const K = this.komorka;
    if (!this.city.ready({ x0: cx * K, y0: cy * K, x1: (cx + 1) * K, y1: (cy + 1) * K })) return false;
    this.planCell(cx, cy);
    return true;
  }
  siedliskoKomorki(cx: number, cy: number) {
    const k = `:${cx},${cy}`;
    return this.siedliska.find((s) => s.id.endsWith(k)) ?? null;
  }

  /** Siedliska włączone (src/siedliska/wlacznik.ts) – ustawia GameScene. */
  obozy = false;
  /** Siedliska tej sceny (też dla testów). */
  siedliska: Siedlisko[] = [];
  private ostatnieSiedlisko: string | null = null;

  /** Pytania planera o teren – odpowiada prawdziwa mapa (te same co przy łowiskach, ale na całym obrysie). */
  private teren(): TerenSiedliska {
    const c = this.city;
    const linie = (x: number, y: number, r: number) => c.query({ x0: x - r - 30, y0: y - r - 30, x1: x + r + 30, y1: y + r + 30 }).lines;
    return {
      rodzaje: (x, y) => c.areaKindsAt(x, y),
      zablokowane: (x, y) => c.isBlocked(x, y),
      budynek: (x, y, r) => c.buildingWithin(x, y, r),
      linia: (x, y, r) => linie(x, y, r).some((l) => distToPolyline(l.pts, x, y) < r + l.width / 2),
      liniaTwarda: (x, y, r) => linie(x, y, r).some((l) => !OBOZ.przechodnie.includes(l.kind) && distToPolyline(l.pts, x, y) < r + l.width / 2),
      budynki: (x0, y0, x1, y1) => c.query({ x0, y0, x1, y1 }).buildings.filter((b) => !b.open).map((b) => ({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 })),
      przeciecia: (obrys) => {
        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        for (let i = 0; i < obrys.length; i += 2) { bx0 = Math.min(bx0, obrys[i]); by0 = Math.min(by0, obrys[i + 1]); bx1 = Math.max(bx1, obrys[i]); by1 = Math.max(by1, obrys[i + 1]); }
        const out: { x: number; y: number; szer: number }[] = [];
        const n = obrys.length / 2;
        for (const l of c.query({ x0: bx0, y0: by0, x1: bx1, y1: by1 }).lines) {
          if (!OBOZ.przechodnie.includes(l.kind)) continue;
          for (let k = 0; k + 3 < l.pts.length; k += 2) {
            const ax = l.pts[k], ay = l.pts[k + 1], bx = l.pts[k + 2], by = l.pts[k + 3];
            for (let i = 0; i < n; i++) {
              const cx = obrys[i * 2], cy = obrys[i * 2 + 1], dx = obrys[((i + 1) % n) * 2], dy = obrys[((i + 1) % n) * 2 + 1];
              const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
              if (Math.abs(den) < 1e-9) continue;
              const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
              if (u >= 0 && u <= 1 && v >= 0 && v <= 1) out.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u, szer: l.width });
            }
          }
        }
        // Stała kolejność (niezależna od kolejności kafli): po kącie wokół środka obrysu.
        const sx = (bx0 + bx1) / 2, sy = (by0 + by1) / 2;
        return out.sort((a, b) => Math.atan2(a.y - sy, a.x - sx) - Math.atan2(b.y - sy, b.x - sx));
      },
      glowna: (x, y, r) => this.glownaBlisko(x, y, r),
      droga: (x, y, r) => {
        let best: { x: number; y: number } | null = null, bd = r;
        for (const l of linie(x, y, r)) {
          if (!ROAD_KINDS.has(l.kind) || l.kind === 'major' || l.bridge) continue;
          const q = najblizszyNaLinii(l, x, y);
          const d = Math.hypot(q.x - x, q.y - y) - l.width / 2;
          if (d < bd) { bd = d; best = q; }
        }
        return best;
      },
    };
  }

  /** Obóz w komórce (stałe ziarno: mapa + komórka + wersja generatora); true = jest. */
  private planujObozW(cx: number, cy: number, key: string) {
    const r = rng(hashSeed(`${this.city.id}:siedlisko:v${WERSJA_SIEDLISK}:${key}`));
    if (r() > OBOZ.szansa) return false;
    const T = TEREN_SIEDLISK, teren = this.teren();
    for (let t = 0; t < 18; t++) {
      const x = (cx + 0.3 + r() * 0.4) * this.komorka, y = (cy + 0.3 + r() * 0.4) * this.komorka;
      if (this.nearAvoid(x, y, T.odMiejscM)) continue;
      // Typ wg terenu: przy mokradłach i wodzie najczęściej bagno, gdzie indziej obóz albo rumowisko (stałe ziarno komórki).
      const mokro = this.city.areaKindsAt(x, y).includes('wetland') || [60, 120].some((d) => [0, 1, 2, 3, 4, 5, 6, 7].some((k) => {
        const a = (k / 8) * Math.PI * 2, q = this.city.areaKindsAt(x + Math.cos(a) * d * M, y + Math.sin(a) * d * M);
        return q.includes('water') || q.includes('wetland');
      }));
      const wagi: [TypSiedliska, number][] = mokro ? [['bagno', 0.6], ['oboz', 0.25], ['rumowisko', 0.15]] : TYPY_SIEDLISK.filter(([k]) => k !== 'bagno');
      let u = r() * wagi.reduce((a, [, w]) => a + w, 0), typ: TypSiedliska = wagi[0][0];
      for (const [k, w] of wagi) if ((u -= w) < 0) { typ = k; break; }
      const id = `${this.city.id}:${typ === 'oboz' ? 'oboz' : typ}:${key}`;
      const ll = this.city.toLatLon(x, y);
      const region = Number.isFinite(ll.lat) ? stylRegionu(ll.lat, ll.lon).id : 'umiarkowany';
      const s = typ === 'bagno' ? planujBagno(id, x, y, teren, M) : typ === 'rumowisko' ? planujRumowisko(id, x, y, teren, M) : planujOboz(id, x, y, teren, M, region);
      if (!s) continue;
      this.dodajOboz(s);
      return true;
    }
    return false;
  }

  /** Obóz na mapie (rejestr → podłoże i kolizje) i jego dwie grupy: mieszkańcy i szef z obstawą. */
  private dodajOboz(s: Siedlisko) {
    dodajSiedlisko(this.city, s);
    this.siedliska.push(s);
    const R = Math.max(...s.obrys.map((v, i) => (i % 2 ? Math.abs(v - s.y) : Math.abs(v - s.x))));
    const wolne = s.spawny.filter((q) => q.rola === 'czlonek');
    const moc = s.stwory.moc;
    const czl: LowiskoSpawn[] = s.stwory.czlonkowie.map((kind, i) => ({ ...wolne[i % Math.max(1, wolne.length)], kind }))
      .map((q, i) => ({ x: q.x + (i >= wolne.length ? 2 * M : 0), y: q.y, kind: q.kind, berserk: s.stwory.berserk[i], moc }));
    const szef = s.spawny.find((q) => q.rola === 'szef')!;
    const obst = s.spawny.filter((q) => q.rola === 'obstawa');
    const grupaSzefa: LowiskoSpawn[] = [{ x: szef.x, y: szef.y, kind: s.stwory.szef }];
    for (let i = 0; i < s.stwory.ileObstawy; i++) {
      const o = obst[i] ?? { x: szef.x + (i ? 3 : -3) * M, y: szef.y + 2 * M };
      grupaSzefa.push({ x: o.x, y: o.y, kind: s.stwory.obstawa, moc });
    }
    grupaSzefa[0].moc = moc;
    const baza = { r: R * 1.7, warstwa: 'obrzeze' as Warstwa, gen: 0, spots: null, alive: new Set<number>(), members: new Map<number, unknown>(), clearedAtS: null };
    // Wielkie obozy: mieszkańcy w czterech ćwiartkach – budzą się ci, do których bohater podchodzi, nie cały obóz naraz.
    const cwiartki = R > 60 * M ? 4 : 1;
    for (let q = 0; q < cwiartki && wolne.length; q++) {
      const czesc = cwiartki === 1 ? czl : czl.filter((p) => Math.floor(((Math.atan2(p.y - s.y, p.x - s.x) + Math.PI) / (Math.PI * 2)) * 4) % 4 === q);
      if (!czesc.length) continue;
      const cx = czesc.reduce((a, p) => a + p.x, 0) / czesc.length, cy = czesc.reduce((a, p) => a + p.y, 0) / czesc.length;
      this.pakiety.push({ ...baza, alive: new Set(), members: new Map(), r: cwiartki === 1 ? baza.r : R * 1.1, id: `${s.id}:mieszkancy${cwiartki === 1 ? '' : q}`, x: cx, y: cy, stale: czesc, odnowienieS: ODNOWIENIE_SIEDLISK.zwykliS });
    }
    this.pakiety.push({ ...baza, alive: new Set(), members: new Map(), id: `${s.id}:szef`, x: s.x, y: s.y, stale: grupaSzefa, szef: `siedlisko:${s.id}`, odnowienieS: ODNOWIENIE_SIEDLISK.zwykliS });
  }

  /** Szef siedliska pokonany niedawno (czas rzeczywisty, z zapisu). */
  private szefOdpoczywa(klucz: string) {
    const d = session.daily[klucz];
    return !!d && Date.now() / 60000 - d.n < ODNOWIENIE_SIEDLISK.szefMin;
  }

  /** Siedlisko, w którego obrysie stoi punkt. */
  siedliskoW(x: number, y: number) {
    return this.siedliska.find((s) => x > s.ramka.x0 && x < s.ramka.x1 && y > s.ramka.y0 && y < s.ramka.y1 && wWielokacie(s.obrys, x, y)) ?? null;
  }

  /** Miejski park (owner: „nawet w miejskich parkach mogą czasem być”): małe łowisko z samym obrzeżem. */
  private planPark(cx: number, cy: number, r: () => number) {
    const P = LOWISKA_EPI.park;
    if (r() > P.szansa) return;
    const R = P.promienM * M;
    for (let t = 0; t < 30; t++) {
      const x = (cx + 0.1 + r() * 0.8) * this.komorka, y = (cy + 0.1 + r() * 0.8) * this.komorka;
      if (!this.city.areaKindsAt(x, y).includes('park') || this.city.isBlocked(x, y) || this.nearAvoid(x, y, P.odMiejscM)) continue;
      if (this.lowiska.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + R)) continue;
      let ok = 0;
      const prob = 16;
      for (let i = 0; i < prob; i++) {
        const a = (i / prob) * Math.PI * 2, d = R * (0.3 + 0.6 * ((i * 7) % 5) / 4);
        if (this.city.areaKindsAt(x + Math.cos(a) * d, y + Math.sin(a) * d).includes('park')) ok++;
      }
      if (ok / prob < P.minParku) continue;
      const id = `${this.city.id}:park:${cx},${cy}`;
      const l: Lowisko = { id, x, y, r: R, pakiety: [], park: true };
      const start = r() * Math.PI * 2;
      for (let i = 0; i < P.miejsc; i++) {
        for (let k = 0; k < 10; k++) {
          const a = start + (i / P.miejsc) * Math.PI * 2 + (r() - 0.5) * 0.8, d = R * (0.25 + r() * 0.45);
          const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
          if (!this.city.isFree(px, py, 6, 6) || !this.city.areaKindsAt(px, py).includes('park')) continue;
          l.pakiety.push({ id: `${id}:${i}`, x: px, y: py, r: R * 0.5, warstwa: 'obrzeze', gen: 0, spots: null, alive: new Set(), members: new Map(), clearedAtS: null });
          break;
        }
      }
      if (!l.pakiety.length) return;
      this.lowiska.push(l);
      this.pakiety.push(...l.pakiety);
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
    if (p.stale) {
      p.spots = p.stale.map((q) => ({ ...q }));
      p.alive = new Set(p.spots.map((_, i) => i));
      // Szef pokonany niedawno (zapis): grupa bez niego – sama obstawa.
      if (p.szef && this.szefOdpoczywa(p.szef)) p.alive.delete(0);
      p.members = new Map();
      return;
    }
    const E = LOWISKA_EPI;
    const r = rng(hashSeed(`${p.id}:${p.gen}`));
    const spots: LowiskoSpawn[] = [];
    const kinds: RodzajWroga[] = [];
    const ile = ([lo, hi]: [number, number]) => lo + Math.floor(r() * (hi - lo + 1));
    if (p.warstwa === 'rdzen') {
      kinds.push(E.rdzen.boss as RodzajWroga);
      for (let i = 0; i < E.rdzen.obstawa; i++) kinds.push('warg');
    } else if (p.id.includes(':park:')) {
      const imps = r() < E.park.chochliki;
      for (let i = ile(E.park.czlonkow); i > 0; i--) kinds.push(imps ? 'glut' : 'wilk');
    } else if (p.warstwa === 'obrzeze') {
      for (let i = ile(E.obrzeze.czlonkow); i > 0; i--) kinds.push('wilk');
    } else {
      // Głębia: wargi wręcz i chochliki leśne rzucające żołędziami z dystansu (bestiariusz: acorn).
      for (let i = ile(E.glebia.czlonkow); i > 0; i--) kinds.push(r() < 0.8 ? 'warg' : 'wilk');
      for (let i = ile(E.glebia.chochlikow); i > 0; i--) kinds.push('glut');
    }
    // Rozproszeni po całym terenie grupy, z odstępami (nie w jednym kłębku).
    const odstep = E.odstepM * M;
    const [r0, r1] = E.rozrzut;
    for (let i = 0, t = 0; i < kinds.length && t < kinds.length * 60; t++) {
      const boss = i === 0 && p.warstwa === 'rdzen';
      const a = r() * Math.PI * 2, d = boss ? 0 : p.r * (r0 + Math.sqrt(r()) * (r1 - r0)) * (kinds[i] === 'glut' ? 1 : 0.9);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (!this.city.isFree(x, y, 4, 4)) continue;
      if (!boss && spots.some((q) => Math.hypot(q.x - x, q.y - y) < odstep) && t < kinds.length * 40) continue;
      spots.push({ x, y, kind: kinds[i] });
      i++;
    }
    p.spots = spots;
    p.alive = new Set(spots.map((_, i) => i));
    p.members = new Map();
  }

  /** True when it was a settlement's leader (GameScene drops the camp's extra loot from the admin panel). */
  killed(e: unknown): boolean {
    for (const p of this.pakiety) {
      for (const [i, m] of p.members) {
        if (m !== e) continue;
        p.members.delete(i);
        p.alive.delete(i);
        const szef = !!p.szef && i === 0;
        if (szef) session.daily[p.szef!] = { d: 'szef', n: Math.floor(Date.now() / 60000), a: 0 };
        if (!p.alive.size) p.clearedAtS = this.czasAktywny();
        return szef;
      }
    }
    return false;
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
      if (l.park) return 'obrzeze';
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
    l.mgla = l.park ? [kolo(l.r, E.mgla.obrzeze)] : [kolo(l.r, E.mgla.obrzeze), kolo(l.r * E.glebiaOd, E.mgla.glebia), kolo(l.r * E.rdzenOd, E.mgla.rdzen)];
    const r = rng(hashSeed(`${l.id}:mgla`));
    const kleby: Phaser.GameObjects.Image[] = [];
    for (const [rr, gest, alfa] of (l.park ? [[l.r, 1, 1]] : [[l.r, 1, 1], [l.r * E.glebiaOd, 0.45, 0.6]]) as [number, number, number][]) {
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
        const czekaj = p.odnowienieS ?? (p.warstwa === 'rdzen' ? LOWISKA_EPI.bossOdnowienieS : LOWISKA.odnowieniePoS);
        if (widoczna || czas - p.clearedAtS < czekaj) continue;
        p.spots = null; // nowa generacja przy następnym spawnAll
        p.clearedAtS = null;
      }
      const blisko = Math.hypot(p.x - px, p.y - py) < aktywacjaPx;
      if (blisko) this.spawnAll(p);
      else this.despawnAll(p);
    }

    // Wejście do obozu: krótkie ostrzeżenie (raz na wejście).
    const sd = this.siedliska.length ? this.siedliskoW(px, py) : null;
    if ((sd?.id ?? null) !== this.ostatnieSiedlisko) {
      if (sd) this.powiedz(sd.typ === 'bagno' ? tx('🌫 Bagno – błoto spowalnia, a w głębokiej wodzie nie przejdziesz. W sercu mieszka wodnik.', '🌫 A swamp – mud slows you down and deep water blocks the way. A water spirit lives at its heart.')
        : sd.typ === 'rumowisko' ? tx('🪨 Rumowisko – między skałami czają się wargi, w środku coś stuka kopytami.', '🪨 A rubble field – wargs lurk between the rocks, and something clatters its hooves in the middle.')
        : tx('⛺ Obóz bandytów – herszt ma tu swój namiot. Uważaj!', '⛺ A bandit camp – the chieftain has his tent here. Careful!'));
      this.ostatnieSiedlisko = sd?.id ?? null;
    }
    // Wejście w mocniejszą warstwę: krótkie ostrzeżenie.
    const w = this.warstwaW(px, py);
    if (w !== this.ostatniaWarstwa) {
      const glebiej = (w === 'glebia' && this.ostatniaWarstwa !== 'rdzen') || w === 'rdzen' || (w === 'obrzeze' && this.ostatniaWarstwa === null);
      const park = this.lowiska.some((l) => l.park && Math.hypot(l.x - px, l.y - py) < l.r);
      if (glebiej && w) this.powiedz(park ? '🌳 W parku coś się czai – uważaj na czerwoną mgiełkę.' : w === 'obrzeze' ? '🐺 Łowisko: wilki w okolicy. Głębiej będzie groźniej.' : w === 'glebia' ? '⚠ Głębia łowiska: wargi i chochliki z żołędziami.' : '☠ Rdzeń łowiska: tu mieszka coś naprawdę groźnego!');
      if (!w && this.ostatniaWarstwa) this.powiedz('Wyszedłeś z łowiska – tu odpoczniesz.');
      this.ostatniaWarstwa = w;
    }
  }

  destroy() {
    for (const l of this.lowiska) this.bezMgly(l);
  }
}

/** Najbliższy punkt linii łamanej. */
function najblizszyNaLinii(l: Line, x: number, y: number) {
  let best = { x: l.pts[0], y: l.pts[1] }, bd = Infinity;
  for (let i = 0; i + 3 < l.pts.length; i += 2) {
    const ax = l.pts[i], ay = l.pts[i + 1], dx = l.pts[i + 2] - ax, dy = l.pts[i + 3] - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
    const qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - x, qy - y);
    if (d < bd) { bd = d; best = { x: qx, y: qy }; }
  }
  return best;
}
