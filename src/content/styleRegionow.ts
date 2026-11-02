// Style budynków według regionu świata (właściciel 2.11.2026: „inne w Azji, inne w Polsce, inne w Afryce”; inspiracja:
// regiony laboratorium /test2/ – src/architecture/regions). Generator wygląd 09 losuje dach i ścianę z listy regionu
// (wagi), a część parterowych domów dostaje płaski dach. Kształt budynku się nie zmienia.
import { krajWPunkcie } from '../kraj';

export interface StylRegionu {
  id: string;
  /** Kody krajów (jak w src/kraj.ts). */
  kraje: string[];
  /** Prostokąty [zach, płd, wsch, płn] w stopniach – gdy kraju nie znamy. */
  obszary: [number, number, number, number][];
  /** [klucz MATERIALY, waga]. */
  dachy: [string, number][];
  sciany: [string, number][];
  /** Jaka część budynków (0–1) ma dach płaski z attyką. */
  plaskie: number;
  /** Materiał płaskiego dachu (domyślnie żwir/papa). */
  dachPlaski?: string;
}

/** Polska i Europa Środkowa: dotychczasowy wygląd (domyślny). */
export const STYL_DOMYSLNY: StylRegionu = {
  id: 'umiarkowany', kraje: [], obszary: [],
  dachy: [['dachowka_czerwona', 34], ['dachowka_brazowa', 24], ['lupek', 16], ['gont', 9], ['blacha_zielona', 7], ['papa', 10]],
  sciany: [['tynk_kremowy', 30], ['tynk_zolty', 18], ['tynk_szary', 15], ['cegla', 27], ['kamien', 6], ['drewno', 4]],
  plaskie: 0,
};

export const STYLE_REGIONOW: StylRegionu[] = [
  { id: 'polnoc', kraje: ['NO', 'SE', 'FI', 'DK', 'IS'], obszary: [[-25, 58, 45, 85], [-170, 60, -50, 85]],
    dachy: [['dachowka_czerwona', 30], ['lupek', 25], ['blacha_falista', 20], ['papa', 15], ['blacha_zielona', 10]],
    sciany: [['drewno_czerwone', 40], ['drewno_zolte', 20], ['tynk_bialy', 20], ['drewno', 10], ['cegla', 10]], plaskie: 0 },
  { id: 'srodziemnomorski', kraje: ['ES', 'PT', 'IT', 'GR', 'MT', 'CY', 'HR'], obszary: [[-10, 34, 36, 44]],
    dachy: [['dachowka_terakota', 70], ['dachowka_czerwona', 20], ['dachowka_brazowa', 10]],
    sciany: [['tynk_bialy', 40], ['tynk_ochra', 25], ['tynk_kremowy', 15], ['tynk_zolty', 10], ['kamien', 10]], plaskie: 0.3, dachPlaski: 'tynk_bialy' },
  { id: 'suchy', kraje: ['EG', 'IL', 'SA', 'AE', 'QA', 'OM', 'JO', 'IQ', 'IR', 'MA', 'DZ', 'TN', 'LY'], obszary: [[-17, 15, 62, 34]],
    dachy: [['dachowka_terakota', 1]], sciany: [['tynk_piaskowy', 50], ['tynk_bialy', 25], ['tynk_ochra', 25]], plaskie: 0.9, dachPlaski: 'tynk_piaskowy' },
  { id: 'azja', kraje: ['JP', 'KR', 'CN', 'TW'], obszary: [[100, 18, 147, 46]],
    dachy: [['dachowka_glazura', 55], ['dachowka_glazura_zielona', 20], ['dachowka_brazowa', 15], ['papa', 10]],
    sciany: [['tynk_bialy', 35], ['drewno', 30], ['tynk_szary', 20], ['drewno_czerwone', 15]], plaskie: 0.1 },
  { id: 'afryka', kraje: [], obszary: [[-18, -35, 52, 15]],
    dachy: [['blacha_falista', 40], ['blacha_rdzawa', 30], ['strzecha', 20], ['dachowka_terakota', 10]],
    sciany: [['tynk_terakota', 35], ['tynk_ochra', 25], ['tynk_bialy', 20], ['tynk_piaskowy', 20]], plaskie: 0.15, dachPlaski: 'tynk_piaskowy' },
  { id: 'ameryka_lacinska', kraje: ['MX', 'BR', 'AR'], obszary: [[-118, -56, -34, 32]],
    dachy: [['dachowka_terakota', 50], ['blacha_falista', 25], ['papa', 25]],
    sciany: [['tynk_ochra', 20], ['tynk_blekitny', 20], ['tynk_rozowy', 20], ['tynk_bialy', 20], ['tynk_zolty', 20]], plaskie: 0.35, dachPlaski: 'tynk_bialy' },
];

/** Styl budynków w danym miejscu: najpierw kraj, potem obszar, inaczej domyślny (Polska). */
export function stylRegionu(lat: number, lon: number): StylRegionu {
  const kraj = krajWPunkcie(lat, lon);
  if (kraj) return STYLE_REGIONOW.find((r) => r.kraje.includes(kraj)) ?? STYL_DOMYSLNY;
  return STYLE_REGIONOW.find((r) => r.obszary.some(([w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n)) ?? STYL_DOMYSLNY;
}

export const stylPoId = (id?: string) => STYLE_REGIONOW.find((r) => r.id === id) ?? STYL_DOMYSLNY;
