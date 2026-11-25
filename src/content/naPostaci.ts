// ============================================================================
//  JAK PRZEDMIOT WYGLĄDA NA LUDZIKU (właściciel, 25.11.2026)
//  „Złoty rogaty hełm ma być rogatym złotym hełmem, a nie szarą czapką”; szeroki miecz z niebieską poświatą
//  ma być szeroki i świecić także w miniaturce. Bez detali – zdobienie to 1 px, symboliczne.
//
//  Ludzik-chibi jest bryłą rysowaną kodem w 64 kierunkach (chibi/rysownik.ts), więc płaskiej ikony grafika nie da się
//  na nim nakleić. Każdy przedmiot do założenia ma tu krótki opis z gotowych klocków: kształt + kolory wzięte
//  z obrazka grafika. Nowy przedmiot = nowy wpis (zwykle bez nowego kodu); nowy klocek dopisuje się w rysowniku.
//  Warianty jakości (baza) dziedziczą opis swojej bazy.
//  Sprawdzanie braków: node --experimental-strip-types scripts/sprawdz-miniatury.mjs
// ============================================================================

export type KsztaltHelmu = 'kopula' | 'skorzany' | 'kaszkiet' | 'spiczasta' | 'kapelusz' | 'korona' | 'cylinder';
export type KsztaltBroni = 'miecz' | 'szabla' | 'galaz' | 'rozdzka' | 'kostur' | 'siekiera' | 'kilof' | 'luk' | 'kusza' | 'pistolet' | 'karabin';
export type KsztaltDrugiej = 'tarcza_okragla' | 'tarcza_herbowa' | 'kula' | 'ksiega' | 'kolczan';
export type KsztaltZbroi = 'skora' | 'kolczuga' | 'szata' | 'plaszcz';

/** Kolory jako '#rrggbb' (ton środkowy – rysownik sam dorabia cień i światło). */
export interface NaPostaci {
  typ: 'helm' | 'bron' | 'druga' | 'zbroja' | 'buty';
  ksztalt?: KsztaltHelmu | KsztaltBroni | KsztaltDrugiej | KsztaltZbroi;
  /** Główny kolor: ostrze, czasza hełmu, okładka, tkanina… */
  kolor: string;
  /** Drugi kolor: rękojeść/drzewce, obrzeże tarczy, strony księgi, owijka, tułów pod płaszczem. */
  kolor2?: string;
  /** Zdobienie 1 px: pas hełmu, jelec, klejnoty, okucia, lamówka. */
  zdobienie?: string;
  /** Hełm: rogi w tym kolorze. */
  rogi?: string;
  /** Hełm/kapelusz: pióro. */
  pioro?: string;
  /** Hełm: nosal (pionowa listwa na nos). */
  nosal?: boolean;
  /** Kostur/różdżka: kryształ na szczycie. */
  krysztal?: string;
  /** Świeci tym kolorem (ostrze, kryształ, kula): poświata dookoła w każdej klatce. */
  poswiata?: string;
  /** Szerokość ostrza (1 = zwykłe) i długość (1 = zwykła). */
  szer?: number;
  dl?: number;
  /** Kołczan: lotki strzał. */
  strzaly?: string;
  /** Zbroja: mosiężny naramiennik. */
  naramiennik?: boolean;
  /** Buty: wysoka cholewa; małe skrzydełka. */
  cholewa?: boolean;
  skrzydelka?: string;
}

const MOSIADZ = '#d0a548', ZLOTO = '#e0b048', DREWNO = '#7b4a2b', DREWNO_J = '#9a6232', STAL = '#b3b9c2', SKORA = '#8a5530';

export const NA_POSTACI: Record<string, NaPostaci> = {
  // ---- broń w ręce ----
  miecz_rekruta: { typ: 'bron', ksztalt: 'miecz', kolor: '#b8bec8', kolor2: DREWNO, zdobienie: '#8a8f99', dl: 0.9 },
  kijek: { typ: 'bron', ksztalt: 'galaz', kolor: DREWNO_J },
  kilof: { typ: 'bron', ksztalt: 'kilof', kolor: STAL, kolor2: '#8a5530' },
  siekiera: { typ: 'bron', ksztalt: 'siekiera', kolor: '#bfc5ce', kolor2: '#8a5530' },
  zelazny: { typ: 'bron', ksztalt: 'miecz', kolor: STAL, kolor2: DREWNO, zdobienie: '#7d828b' },
  miecz_mosiezny: { typ: 'bron', ksztalt: 'miecz', kolor: ZLOTO, kolor2: DREWNO, zdobienie: '#a8742a' },
  stalowy: { typ: 'bron', ksztalt: 'miecz', kolor: '#cfd5dd', kolor2: '#2c3566', zdobienie: '#a9b1bd' },
  szabla_hartowana: { typ: 'bron', ksztalt: 'szabla', kolor: '#dfe3ea', kolor2: '#5a3020', zdobienie: MOSIADZ },
  rycerski: { typ: 'bron', ksztalt: 'miecz', kolor: '#d5dae2', kolor2: DREWNO, zdobienie: MOSIADZ, szer: 1.2, dl: 1.1 },
  karabela_damascenska: { typ: 'bron', ksztalt: 'szabla', kolor: '#c9ccd4', kolor2: '#5b3620', zdobienie: MOSIADZ, dl: 1.05 },
  szklany_miecz: { typ: 'bron', ksztalt: 'miecz', kolor: '#8fe6f2', kolor2: '#5b3620', zdobienie: MOSIADZ },
  swietlisty: { typ: 'bron', ksztalt: 'miecz', kolor: '#86e6ff', kolor2: DREWNO, zdobienie: ZLOTO, poswiata: '#8fe8ff', szer: 1.15, dl: 1.05 },
  excalibur: { typ: 'bron', ksztalt: 'miecz', kolor: '#eef3ff', kolor2: '#2c3566', zdobienie: ZLOTO, poswiata: '#fff2b8', szer: 1.2, dl: 1.15 },
  gromowladny: { typ: 'bron', ksztalt: 'miecz', kolor: '#9aa3ae', kolor2: '#6a4024', zdobienie: ZLOTO, poswiata: '#ffe066' },
  luk_rekruta: { typ: 'bron', ksztalt: 'luk', kolor: '#8a5530' },
  luk: { typ: 'bron', ksztalt: 'luk', kolor: DREWNO },
  luk_refleksyjny: { typ: 'bron', ksztalt: 'luk', kolor: DREWNO_J, zdobienie: MOSIADZ },
  dlugi_luk: { typ: 'bron', ksztalt: 'luk', kolor: '#6e3e22', dl: 1.25 },
  kusza: { typ: 'bron', ksztalt: 'kusza', kolor: STAL, kolor2: '#8a5530' },
  pistolet_parowy: { typ: 'bron', ksztalt: 'pistolet', kolor: MOSIADZ, kolor2: DREWNO },
  karabin_trybunal: { typ: 'bron', ksztalt: 'karabin', kolor: MOSIADZ, kolor2: DREWNO },
  rozdzka_szkolna: { typ: 'bron', ksztalt: 'rozdzka', kolor: DREWNO_J, krysztal: '#7fc8ff' },
  rozdzka: { typ: 'bron', ksztalt: 'rozdzka', kolor: DREWNO_J, zdobienie: MOSIADZ, krysztal: '#3f8cff', poswiata: '#6fb4ff' },
  kostur_krysztalowy: { typ: 'bron', ksztalt: 'kostur', kolor: '#8e4a2a', kolor2: '#a03a2a', zdobienie: MOSIADZ, krysztal: '#b8b4f4', poswiata: '#b9a8ff' },
  // ---- druga ręka ----
  kula: { typ: 'druga', ksztalt: 'kula', kolor: '#a8c8ff', kolor2: MOSIADZ, poswiata: '#9cc0ff' },
  ksiega: { typ: 'druga', ksztalt: 'ksiega', kolor: '#8c2a2a', kolor2: '#efe3c8', zdobienie: MOSIADZ },
  ksiega_grimuar: { typ: 'druga', ksztalt: 'ksiega', kolor: '#6a3a9a', kolor2: '#efe3c8', zdobienie: MOSIADZ },
  tarcza_drewniana: { typ: 'druga', ksztalt: 'tarcza_okragla', kolor: DREWNO_J, kolor2: '#55555e', zdobienie: '#5a5a66' },
  tarcza_okuta: { typ: 'druga', ksztalt: 'tarcza_herbowa', kolor: DREWNO_J, kolor2: '#8a8f99', zdobienie: '#4a4a52' },
  kolczan_lowcy: { typ: 'druga', ksztalt: 'kolczan', kolor: '#5f7a34', kolor2: SKORA, strzaly: '#7fa848' },
  kolczan_zloty: { typ: 'druga', ksztalt: 'kolczan', kolor: '#d9a83a', kolor2: SKORA, strzaly: '#f0ead8' },
  // ---- zbroje ----
  skorzana_zbroja: { typ: 'zbroja', ksztalt: 'skora', kolor: SKORA, kolor2: '#5b3620' },
  kolczuga: { typ: 'zbroja', ksztalt: 'kolczuga', kolor: '#a9b1bd', kolor2: '#6b727c' },
  klasztorny_pochlaniacz: { typ: 'zbroja', ksztalt: 'szata', kolor: '#5a4234', kolor2: '#3a2a22', zdobienie: MOSIADZ, naramiennik: true },
  plaszcz_cechmistrza: { typ: 'zbroja', ksztalt: 'plaszcz', kolor: '#a02a2a', kolor2: '#3a2a3a', zdobienie: ZLOTO },
  // ---- nakrycia głowy ----
  kapelusz_szkolny: { typ: 'helm', ksztalt: 'spiczasta', kolor: '#5a7ab8', zdobienie: '#5b3620' },
  skorzany_helm: { typ: 'helm', ksztalt: 'skorzany', kolor: SKORA, zdobienie: '#5b3620' },
  zelazny_helm: { typ: 'helm', ksztalt: 'kopula', kolor: '#a9b1bd', zdobienie: '#7d828b', nosal: true },
  kapelusz: { typ: 'helm', ksztalt: 'kapelusz', kolor: '#4f7a2a', zdobienie: '#5b3620', pioro: '#efe3c8' },
  czapka_maga: { typ: 'helm', ksztalt: 'spiczasta', kolor: '#2a3a9a', zdobienie: ZLOTO },
  korona: { typ: 'helm', ksztalt: 'korona', kolor: ZLOTO, zdobienie: '#d0303a' },
  cukierniczy_cylinder: { typ: 'helm', ksztalt: 'cylinder', kolor: '#6e3e22', kolor2: '#f2ead8', zdobienie: '#a02a2a' },
  helm_rogaty: { typ: 'helm', ksztalt: 'kopula', kolor: ZLOTO, zdobienie: '#a8742a', rogi: '#ece4d4', nosal: true },
  // ---- buty ----
  skorzane_buty: { typ: 'buty', kolor: SKORA },
  zelazne_buty: { typ: 'buty', kolor: '#a9b1bd', cholewa: true },
  buty_biegacza: { typ: 'buty', kolor: '#9a5a2a', skrzydelka: '#efe3c8' },
};

/** Miejsca, które widać na ludziku (talizmany, amulety i pojazdy nie potrzebują opisu). */
export const MIEJSCA_NA_POSTACI = ['bron', 'dystans', 'zbroja', 'helm', 'buty'] as const;

/** The on-hero look of an item: its own entry, else its quality family's (baza). */
export function opisNaPostaci(id: string | null | undefined, baza?: string): NaPostaci | undefined {
  if (!id) return undefined;
  return NA_POSTACI[id] ?? (baza ? NA_POSTACI[baza] : undefined);
}
