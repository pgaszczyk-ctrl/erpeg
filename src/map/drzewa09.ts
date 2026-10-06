import { drzewo, hash, szum, GATUNKI, type Rodzaj, type Drzewo } from '../gen';

// Drzewa overhaulu 09 (docs/paczka-dla-programisty/dane/gatunki_osm.json, SPEC_09 punkt 3): rozmieszczenie gęste
// i deterministyczne we współrzędnych świata (px generatora = px mapy × 2), więc każdy kawałek mapy i każdy telefon
// widzi te same drzewa w tych samych miejscach. Bez DOM-u (liczy się też w Web Workerze).

/** Dlaczego drzewa nie wolno ściąć (SPEC_09 punkt 4); sad = owocowe, potrząsa się nimi. */
export type Ochrona = 'park' | 'ozdobne' | 'sad' | 'gruby';
interface Regula { odstep: number; gestosc: number; wagi: [string, number][]; skraj?: boolean; chop?: number; ochrona?: Ochrona }

/**
 * Reguły po rodzaju podłoża; odstęp w px mapy (z gatunki_osm.json, już ×0,55), gęstość = szansa w kratce.
 * Lasy, zarośla i mokradła o połowę rzadsze (właściciel 6.10.2026: drzewa zagradzały drogę, w lesie trudno walczyć).
 */
const REGULY: Partial<Record<Rodzaj, Regula>> = {
  park: { odstep: 12, gestosc: 0.63, ochrona: 'park', wagi: [['lipa', 0.3], ['dab', 0.25], ['buk', 0.15], ['brzoza', 0.15], ['krzak', 0.15]] },
  cmentarz: { odstep: 11, gestosc: 0.42, ochrona: 'park', wagi: [['lipa', 0.4], ['brzoza', 0.2], ['swierk', 0.2], ['krzak', 0.2]] },
  // Działki (w mapie rodzajów jako łąka): drzewa owocowe.
  laka: { odstep: 9, gestosc: 0.49, ochrona: 'sad', wagi: [['jablon', 0.45], ['sliwa', 0.25], ['grusza', 0.15], ['krzak', 0.15]] },
  mokradlo: { odstep: 9, gestosc: 0.28, chop: 0.2, wagi: [['olcha', 0.4], ['wierzba', 0.4], ['brzoza', 0.2]] },
  zarosla: { odstep: 6, gestosc: 0.45, chop: 0.2, wagi: [['krzak', 0.7], ['brzoza', 0.15], ['sosna', 0.15]] },
  las_iglasty: { odstep: 9, gestosc: 0.5, chop: 0.3, wagi: [['sosna', 0.65], ['swierk', 0.3], ['brzoza', 0.05]], skraj: true },
  // Lasy bez rodzaju liści w danych: las mieszany.
  las_lisciasty: { odstep: 9, gestosc: 0.5, chop: 0.3, wagi: [['sosna', 0.35], ['dab', 0.2], ['brzoza', 0.2], ['swierk', 0.15], ['buk', 0.1]], skraj: true },
  trawa: { odstep: 16, gestosc: 0.17, ochrona: 'ozdobne', wagi: [['lipa', 0.3], ['brzoza', 0.3], ['krzak', 0.4]] },
};
/** Bliżej wody (gatunki_osm.json biomy.przyWodzieZamien). */
const PRZY_WODZIE: Record<string, string> = { dab: 'olcha', buk: 'olcha', lipa: 'wierzba', sosna: 'olcha' };
/** Kratka losowania (px generatora); gęstość reguły przeliczona na nią. */
const KRATKA = 12;
/** Kępy i polany (gatunki_osm.json kepy: szum w skali 120 px mapy, poniżej progu polana). */
const KEPY_SKALA = 240, PROG_POLANY = 0.32;
/** Ile wariantów każdego gatunku. */
export const WARIANTY = 3;

/**
 * Drzewo: podstawa pnia (px generatora), gatunek, wariant; `c` = da się ściąć (ma zacios), `o` = dlaczego nie
 * (owocowe: 'sad'). Krzaki nie mają ani jednego, ani drugiego.
 */
export interface Drzewo09 { x: number; y: number; g: string; w: number; c?: 1; o?: Ochrona }

/** Stały identyfikator drzewa (to samo miejsce = to samo drzewo w każdym kawałku i na każdym telefonie). */
export const idDrzewa = (t: { x: number; y: number }) => `${t.x},${t.y}`;
/** Gatunki z owocami (potrząsanie zamiast ścinania). */
export const OWOCOWE = new Set(['jablon', 'grusza', 'sliwa']);

/** Drzewa, których podstawa leży w prostokącie świata (px generatora). `wolne` = czy nie stoi w budynku. */
export function rozstawDrzewa(x0: number, y0: number, w: number, h: number, rodzajW: (x: number, y: number) => Rodzaj | null, wolne: (x: number, y: number) => boolean): Drzewo09[] {
  const out: Drzewo09[] = [];
  const kx0 = Math.floor(x0 / KRATKA), ky0 = Math.floor(y0 / KRATKA), kx1 = Math.floor((x0 + w - 1) / KRATKA), ky1 = Math.floor((y0 + h - 1) / KRATKA);
  for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
    const x = kx * KRATKA + Math.floor((0.15 + hash(kx, ky, 501) * 0.7) * KRATKA);
    const y = ky * KRATKA + Math.floor((0.15 + hash(kx, ky, 502) * 0.7) * KRATKA);
    if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) continue;
    const r = rodzajW(x, y);
    const reg = r && REGULY[r];
    if (!reg) continue;
    const odstep = reg.odstep * 2;
    let szansa = reg.gestosc * Math.min(1, (KRATKA * KRATKA) / (odstep * odstep));
    const kepa = szum(x / KEPY_SKALA + 31, y / KEPY_SKALA + 17);
    if (r !== 'trawa') szansa *= kepa < PROG_POLANY ? 0.15 : 1;
    if (hash(kx, ky, 503) >= szansa) continue;
    // Pień na tym samym podłożu (nie na drodze, w wodzie ani przy samym brzegu) i nie w budynku.
    if (rodzajW(x - 3, y) !== r || rodzajW(x + 3, y) !== r || rodzajW(x, y - 3) !== r || rodzajW(x, y + 3) !== r) continue;
    if (!wolne(x, y)) continue;
    // Nie przy torach (trawa między torami na stacji to teren kolei).
    if ([[16, 0], [-16, 0], [0, 16], [0, -16], [12, 12], [-12, -12], [12, -12], [-12, 12]].some(([dx, dy]) => rodzajW(x + dx, y + dy) === 'tory')) continue;
    let g = losuj(reg.wagi, hash(kx, ky, 504));
    // Skraj lasu: częściej krzaki.
    if (reg.skraj && g !== 'krzak' && [[32, 0], [-32, 0], [0, 32], [0, -32]].some(([dx, dy]) => rodzajW(x + dx, y + dy) !== r) && hash(kx, ky, 505) < 0.4) g = 'krzak';
    // Przy wodzie olchy i wierzby.
    if (PRZY_WODZIE[g] && [[40, 0], [-40, 0], [0, 40], [0, -40], [28, 28], [-28, -28], [28, -28], [-28, 28]].some(([dx, dy]) => rodzajW(x + dx, y + dy) === 'woda')) g = PRZY_WODZIE[g];
    const t: Drzewo09 = { x, y, g, w: Math.floor(hash(kx, ky, 506) * WARIANTY) };
    if (OWOCOWE.has(g)) t.o = 'sad';
    else if (!g.startsWith('krzak')) {
      // Ścinalne tylko w lasach i zaroślach, część drzew (gatunki_osm.json chop), i tylko gatunki z zaciosem.
      if (reg.chop && GATUNKI[g].sciecie && hash(kx, ky, 507) < reg.chop) t.c = 1;
      else t.o = reg.ochrona ?? 'gruby';
    }
    out.push(t);
  }
  return out;
}

function losuj(wagi: [string, number][], u: number) {
  for (const [k, v] of wagi) if ((u -= v) < 0) return k;
  return wagi[wagi.length - 1][0];
}

/** Gotowe drzewa (gatunek × wariant), liczone raz. */
const gotowe = new Map<string, Drzewo>();
export function drzewoZ(g: string, w: number): Drzewo {
  const k = `${g}-${w}`;
  let d = gotowe.get(k);
  if (!d) {
    d = drzewo(g, 1000 + w * 77 + g.length * 13);
    gotowe.set(k, d);
  }
  return d;
}

/** Stan drzew na czas sesji: ścięte i strząśnięte drzewa wracają przy następnym logowaniu (jak dawniej). */
export const STAN = { sciete: new Set<string>(), owoce: new Map<string, number>(), zebrane: new Set<string>() };
/** Nowe logowanie: drzewa odrastają, owoce wracają, zebrane warzywa na polach odrastają. */
export function odrostDrzew() {
  STAN.sciete.clear();
  STAN.owoce.clear();
  STAN.zebrane.clear();
}
