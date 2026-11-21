// ============================================================================
//  DROGOWSKAZY NIEBEZPIECZEŃSTWA (właściciel, 21.11.2026: „na dużych skrzyżowaniach drogowskaz z oznaczonym
//  niebezpieczeństwem i strzałka do najbliższego średniego obozu danych stworków… drewniany znak, niedbale narysowany
//  ten stwór i strzałka w danym kierunku, żeby gracz nie krążył w kółko; jeden na kilometr kwadratowy miasta,
//  na skrzyżowaniach/rondach”).
//  Logika: src/drogowskazy/Drogowskazy.ts. WARTOŚCI DO TESTU.
// ============================================================================

import type { RodzajWroga } from './fabula';
import type { TypSiedliska, RozmiarSiedliska } from './siedliska';

export const DROGOWSKAZY = {
  /** Komórka planu (m): w każdej najwyżej jeden znak – przy najważniejszym skrzyżowaniu. */
  komorkaM: 1000,
  /** „Miasto”: komórka ma co najmniej tyle budynków (pola i lasy nie dostają znaków). */
  minBudynkow: 40,
  /** Rodzaje dróg liczone do skrzyżowania; duże = te, które czynią je ważnym. */
  drogi: ['major', 'medium', 'minor'],
  duze: ['major', 'medium'],
  /** Obozy, na które wskazuje znak (właściciel: „średniego” – czyli średni i większe). */
  rozmiary: ['sredni', 'duzy', 'warownia', 'wielki', 'twierdza'] as RozmiarSiedliska[],
  /** Jak daleko szukać obozu (m). Dalej znak nie staje wcale. */
  zasiegM: 3500,
  /** Znaki są stawiane / liczone w promieniu (m) od bohatera; szukanie celu tylko dla znaku bliżej niż `szukajM`. */
  widacM: 900,
  szukajM: 450,
  /** Napis nad znakiem, gdy bohater stoi bliżej niż (m). */
  napisM: 28,
};

/** Kto mieszka – jak go nazwać (dopełniacz liczby mnogiej) i który niedbały rysunek namalować. */
export const STWORY_ZNAKU: Partial<Record<RodzajWroga, { pl: string; en: string; rys: RysunekZnaku }>> = {
  bandyta: { pl: 'bandytów', en: 'bandits', rys: 'bandyta' },
  herszt: { pl: 'bandytów', en: 'bandits', rys: 'bandyta' },
  wielki_herszt: { pl: 'bandytów', en: 'bandits', rys: 'bandyta' },
  wilk: { pl: 'wilków', en: 'wolves', rys: 'wilk' },
  warg: { pl: 'wargów', en: 'wargs', rys: 'wilk' },
  szkielet: { pl: 'szkieletów', en: 'skeletons', rys: 'czaszka' },
  upior: { pl: 'upiorów', en: 'wraiths', rys: 'czaszka' },
  zombie: { pl: 'topielców', en: 'drowners', rys: 'topielec' },
  driada: { pl: 'driad', en: 'dryads', rys: 'driada' },
  blob: { pl: 'wodnych bańek', en: 'water blobs', rys: 'kropla' },
  wodnik: { pl: 'wodników', en: 'water spirits', rys: 'kropla' },
  glut: { pl: 'chochlików', en: 'imps', rys: 'chochlik' },
  wielki_glut: { pl: 'chochlików', en: 'imps', rys: 'chochlik' },
  koziol: { pl: 'kozłów', en: 'goats', rys: 'chochlik' },
};
export const STWOR_DOMYSLNY = { pl: 'potworów', en: 'monsters', rys: 'czaszka' as RysunekZnaku };

export const NAZWA_SIEDLISKA: Record<TypSiedliska, { pl: string; en: string }> = {
  oboz: { pl: 'Obóz', en: 'Camp of' },
  rumowisko: { pl: 'Legowisko', en: 'Lair of' },
  bagno: { pl: 'Bagno', en: 'Swamp of' },
};

export type RysunekZnaku = 'bandyta' | 'wilk' | 'czaszka' | 'topielec' | 'driada' | 'kropla' | 'chochlik';

/** Niedbałe rysunki farbą (12×12, X = farba). Celowo koślawe – malował je ktoś w pośpiechu. */
export const RYSUNKI_ZNAKU: Record<RysunekZnaku, string[]> = {
  bandyta: [
    '....XXXX....',
    '...XXXXXX...',
    '..XXXXXXXX..',
    '..XX....XX..',
    '..X.XX.X.X..',
    '..XX....XX..',
    '..XXX..XXX..',
    '...XXXXXX...',
    '.X..XXXX..X.',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXX.',
    '.XXXXXXXXX..',
  ],
  wilk: [
    '.X........X.',
    '.XX......XX.',
    '.XXX....XXX.',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XX..XXXX..XX',
    'XXXXXXXXXXXX',
    '.XXXXXXXXXX.',
    '..XXX..XXX..',
    '...X.XX.X...',
    '...XXXXXX...',
    '....XXXX....',
  ],
  czaszka: [
    '...XXXXXX...',
    '..XXXXXXXX..',
    '.XXXXXXXXXX.',
    '.XXXXXXXXXX.',
    '.XX..XX..XX.',
    '.XX..XX..XX.',
    '.XXXXXXXXXX.',
    '..XXXX.XXX..',
    '...XXXXXX...',
    '...X.X.X.X..',
    '...XXXXXXX..',
    '............',
  ],
  topielec: [
    '...XXXXX....',
    '..XXXXXXX...',
    '..X.X.X.X...',
    '..XX.XX.X...',
    '..X.X.X.XX..',
    '..XXXXXXXX..',
    '...XX..XX...',
    'X..XXXXXX..X',
    'XX.XXXXXX.XX',
    '.XXXXXXXXXX.',
    '...XXXXXX...',
    '...X.XX.X...',
  ],
  driada: [
    '..X.XXX.X...',
    '.XXXXXXXXX..',
    'XXXXXXXXXXX.',
    'XXX.XXX.XXX.',
    'XXXXXXXXXXX.',
    '.XXX...XXX..',
    '..XXXXXXX...',
    '....XXX.....',
    '....XXX.....',
    '...XXXXX....',
    '..XX.X.XX...',
    '.X...X...X..',
  ],
  kropla: [
    '.....X......',
    '.....XX.....',
    '....XXXX....',
    '...XXXXXX...',
    '..XXXXXXXX..',
    '..X..XX..X..',
    '.XX..XX..XX.',
    '.XXXXXXXXXX.',
    '.XXX....XXX.',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '............',
  ],
  chochlik: [
    'X..........X',
    'XX........XX',
    '.XX.XXXX.XX.',
    '..XXXXXXXX..',
    '..XX.XX.XX..',
    '..XXXXXXXX..',
    '..XX....XX..',
    '...XXXXXX...',
    '....XXXX....',
    '...X.XX.X...',
    '..X..XX..X..',
    '.....XX.....',
  ],
};
