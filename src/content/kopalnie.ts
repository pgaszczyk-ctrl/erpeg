// Jaskinie i kopalnie (właściciel, 25.11.2026: „w obozach wrogów lub nieopodal dodaj jaskinie/kopalnie; w jaskiniach
// potworki i materiały typu żelazo; na poziomach -2/-3 skarb chroniony w leżu; dungeony o nieregularnych kształtach,
// duże komnaty, dużo korytarzy; w losowych miejscach, a tam, gdzie są złoża naturalnie – 2× więcej, poziomy 5× większe
// i o 3 poziomy głębsze; albo tam, gdzie są kopalnie w realu; kopalnia w Bogdance – spora, ale nie największa; mała
// przy granicach Lublina – 1 poziom, nieregularny kształt”).
// Silnik ten sam co lochy (src/loch/plan.ts, rodzaje 'jaskinia' i 'kopalnia'); tu: skale, regiony złóż, stałe kopalnie,
// żyły rudy pod ziemią. WARTOŚCI DO TESTU – liczby ustawimy przy balansie.
import { tx } from '../i18n';

/** Surowce z żył pod ziemią (dobra w plecaku, grupa 'surowce' – content/sklepy.ts OWOCE). */
export type Surowiec = 'ruda_zelaza' | 'miedz' | 'wegiel';

/** Wielkość jaskini/kopalni: mała (1 poziom), zwykła, duża (region złóż), wielka (Bogdanka). Litera idzie do id mapy. */
export type SkalaLochu = 'maly' | 'zwykly' | 'duzy' | 'wielki';

export interface OpisSkali {
  litera: string;
  /** Pole poziomu względem zwykłego (mnoży liczbę węzłów labiryntu). */
  obszar: number;
  /** Siatka węzłów zamiast zakresu rodzaju (mała kopalnia). */
  wezly?: [[number, number], [number, number]];
  /** Ile poziomów: [min, max] (losowo z numeru miejsca, skrzynia w leżu na ostatnim). */
  poziomy: [number, number];
  /** Szansa grupy potworów w komnacie (duże poziomy – rzadziej, żeby nie zapchać sceny). */
  szansaGrupy: number;
}

export const SKALE: Record<SkalaLochu, OpisSkali> = {
  maly: { litera: 'm', obszar: 1, wezly: [[3, 2], [3, 3]], poziomy: [1, 1], szansaGrupy: 0.7 },
  zwykly: { litera: 'z', obszar: 1, poziomy: [1, 3], szansaGrupy: 0.75 },
  // Region złóż: poziomy 5× większe i o 3 głębsze (właściciel).
  duzy: { litera: 'd', obszar: 5, poziomy: [4, 6], szansaGrupy: 0.5 },
  // Bogdanka: spora, ale nie największa.
  wielki: { litera: 'w', obszar: 3, poziomy: [5, 5], szansaGrupy: 0.55 },
};

/** Najwięcej węzłów na boku (płótno poziomu ≤ ~2500 px, żeby telefony to udźwignęły). */
export const MAKS_WEZLOW: [number, number] = [10, 9];

/** Liczba poziomów w zwykłej skali: 20 % – 1, 40 % – 2, 40 % – 3 (skarb w leżu najczęściej na -2/-3). */
export const POZIOMY_ZWYKLE = [0.2, 0.4, 0.4];

/**
 * Regiony, gdzie naturalnie są złoża (przybliżone koła). W nich jaskiń i kopalń jest 2× więcej, są duże,
 * a żył rudy 2× więcej. Surowce z wagami.
 */
export interface RegionZloz { nazwa: string; lat: number; lon: number; km: number; surowce: [Surowiec, number][] }
export const REGIONY_ZLOZ: RegionZloz[] = [
  { nazwa: 'Lubelskie Zagłębie Węglowe', lat: 51.33, lon: 23.05, km: 22, surowce: [['wegiel', 6], ['ruda_zelaza', 2]] },
  { nazwa: 'Górnośląskie Zagłębie Węglowe', lat: 50.25, lon: 18.95, km: 45, surowce: [['wegiel', 6], ['ruda_zelaza', 2], ['miedz', 1]] },
  { nazwa: 'Legnicko-Głogowski Okręg Miedziowy', lat: 51.48, lon: 16.1, km: 30, surowce: [['miedz', 6], ['ruda_zelaza', 1]] },
  { nazwa: 'Góry Świętokrzyskie', lat: 50.88, lon: 20.85, km: 35, surowce: [['ruda_zelaza', 5], ['miedz', 2]] },
  { nazwa: 'Częstochowskie rudy', lat: 50.8, lon: 19.15, km: 25, surowce: [['ruda_zelaza', 6]] },
  { nazwa: 'Sudety', lat: 50.75, lon: 16.3, km: 45, surowce: [['ruda_zelaza', 3], ['miedz', 3], ['wegiel', 2]] },
  { nazwa: 'Bełchatów', lat: 51.25, lon: 19.32, km: 15, surowce: [['wegiel', 6], ['ruda_zelaza', 1]] },
  { nazwa: 'Konin', lat: 52.3, lon: 18.25, km: 18, surowce: [['wegiel', 6]] },
  { nazwa: 'Turów', lat: 50.92, lon: 14.92, km: 12, surowce: [['wegiel', 6]] },
  { nazwa: 'Zagłębie Ruhry', lat: 51.48, lon: 7.2, km: 40, surowce: [['wegiel', 6], ['ruda_zelaza', 2]] },
  { nazwa: 'Ostrawa', lat: 49.83, lon: 18.3, km: 25, surowce: [['wegiel', 5], ['ruda_zelaza', 2]] },
  { nazwa: 'Krzywy Róg', lat: 47.91, lon: 33.39, km: 30, surowce: [['ruda_zelaza', 6]] },
  { nazwa: 'Donbas', lat: 48.0, lon: 38.0, km: 90, surowce: [['wegiel', 6], ['ruda_zelaza', 2]] },
  { nazwa: 'Kiruna', lat: 67.85, lon: 20.22, km: 30, surowce: [['ruda_zelaza', 6]] },
  { nazwa: 'Walia', lat: 51.7, lon: -3.4, km: 30, surowce: [['wegiel', 5], ['ruda_zelaza', 2]] },
  { nazwa: 'Kornwalia', lat: 50.25, lon: -5.2, km: 30, surowce: [['miedz', 4], ['ruda_zelaza', 2]] },
  { nazwa: 'Rudawy', lat: 50.55, lon: 12.9, km: 35, surowce: [['ruda_zelaza', 3], ['miedz', 3]] },
];

/** Gdzie indziej (poza regionami): przeważa żelazo, trochę miedzi i węgla. */
export const SUROWCE_DOMYSLNE: [Surowiec, number][] = [['ruda_zelaza', 6], ['miedz', 2], ['wegiel', 2]];

/** Stałe kopalnie (prawdziwe miejsca i te ustawione przez właściciela). Wejście stoi w najbliższym wolnym miejscu. */
export interface KopalniaStala {
  id: string;
  /** Stałe ziarno (układ ten sam dla każdego). */
  seed: number;
  nazwa: { pl: string; en: string };
  lat: number;
  lon: number;
  skala: SkalaLochu;
  rodzaj: 'kopalnia' | 'jaskinia';
}
export const KOPALNIE_STALE: KopalniaStala[] = [
  // Właściciel: „kopalnia w Bogdance obok Lublina – spora, ale nie największa”.
  { id: 'bogdanka', seed: 512_017, nazwa: { pl: 'Kopalnia Bogdanka', en: 'Bogdanka Mine' }, lat: 51.3822, lon: 23.0025, skala: 'wielki', rodzaj: 'kopalnia' },
  // Właściciel: „mała przy granicach miasta – 1 poziom, nieregularny kształt” (las Stary Gaj, zachodni skraj Lublina).
  { id: 'stary-gaj', seed: 512_031, nazwa: { pl: 'Stara sztolnia w Starym Gaju', en: 'Old adit in Stary Gaj' }, lat: 51.2058, lon: 22.4890, skala: 'maly', rodzaj: 'kopalnia' },
  // Prawdziwe kopalnie (każda w swoim regionie złóż – duże i głębokie jak tamte).
  { id: 'wieliczka', seed: 512_043, nazwa: { pl: 'Kopalnia w Wieliczce', en: 'Wieliczka Mine' }, lat: 49.9833, lon: 20.0547, skala: 'wielki', rodzaj: 'kopalnia' },
  { id: 'rudna', seed: 512_057, nazwa: { pl: 'Kopalnia Rudna', en: 'Rudna Mine' }, lat: 51.5071, lon: 16.2458, skala: 'duzy', rodzaj: 'kopalnia' },
  { id: 'guido', seed: 512_069, nazwa: { pl: 'Kopalnia Guido', en: 'Guido Mine' }, lat: 50.3007, lon: 18.7718, skala: 'duzy', rodzaj: 'kopalnia' },
  { id: 'krzemionki', seed: 512_081, nazwa: { pl: 'Krzemionki Opatowskie', en: 'Krzemionki flint mines' }, lat: 50.9725, lon: 21.4931, skala: 'zwykly', rodzaj: 'kopalnia' },
  { id: 'zloty-stok', seed: 512_093, nazwa: { pl: 'Kopalnia złota w Złotym Stoku', en: 'Złoty Stok gold mine' }, lat: 50.4436, lon: 16.8742, skala: 'zwykly', rodzaj: 'kopalnia' },
];

/** Losowe wejścia: komórki geograficzne 0.01° (~1,1 × 0,7 km). */
export const JASKINIE = {
  /** Szansa, że komórka ma wejście (poza regionem złóż; w regionie × wRegionie). */
  szansa: 0.045,
  wRegionie: 2,
  /** Udział kopalń (reszta: naturalne jaskinie) poza regionem i w regionie. */
  kopalnie: 0.35,
  kopalnieWRegionie: 0.7,
  /** Na czym może stać wejście (rodzaje obszarów mapy). */
  teren: ['forest', 'scrub', 'heath', 'grass', 'meadow', 'rock', 'bare_rock', 'wetland', 'farmland', 'park'],
  /** Bez budynku tak blisko (m). */
  odBudynkowM: 35,
  /** Obozy bez własnej jaskini: szansa na wejście tuż za palisadą (25–70 m od niej). */
  przyObozie: 0.4,
};

/** Żyły rudy pod ziemią (kilof jak przy złożach na powierzchni). */
export const ZYLY = {
  /** Ile żył na prawdziwą komnatę: jaskinia, kopalnia (w regionie złóż × wRegionie). */
  naKomnate: { jaskinia: 0.6, kopalnia: 1.2 } as Record<'jaskinia' | 'kopalnia', number>,
  wRegionie: 2,
  /** Ciosów kilofem na grudkę i grudek w żyle (do następnego logowania). */
  uderzen: 5,
  grudek: [2, 4] as [number, number],
  odstepMs: 400,
};

export const ZYLY_TEKSTY = {
  nazwa: (s: Surowiec) => s === 'miedz' ? tx('Żyła miedzi', 'Copper vein') : s === 'wegiel' ? tx('Pokład węgla', 'Coal seam') : tx('Żyła żelaza', 'Iron vein'),
  grudka: (s: Surowiec) => s === 'miedz' ? tx('+1 ruda miedzi', '+1 copper ore') : s === 'wegiel' ? tx('+1 węgiel', '+1 coal') : tx('+1 grudka żelaza', '+1 iron nugget'),
  get kilof() { return tx('Potrzebujesz sprawnego kilofa.', 'You need a working pickaxe.'); },
  get pelno() { return tx('Brak miejsca w plecaku.', 'No room in the backpack.'); },
  get pusta() { return tx('Żyła wyeksploatowana.', 'The vein is worked out.'); },
  get zuzycie() { return tx('Kilof się zużywa – napraw go w warsztacie.', 'The pickaxe is wearing out – repair it at a workshop.'); },
  get leze() { return tx('☠ Leże! Kości dookoła… Coś wielkiego pilnuje tu skarbu.', '☠ A lair! Bones all around… Something big guards a treasure here.'); },
};

const km = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const dy = (aLat - bLat) * 111.13, dx = (aLon - bLon) * 111.32 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

/** Region złóż w tym punkcie (null: poza regionami). */
export function regionZloz(lat: number, lon: number): RegionZloz | null {
  let best: RegionZloz | null = null, bd = Infinity;
  for (const r of REGIONY_ZLOZ) {
    const d = km(lat, lon, r.lat, r.lon) / r.km;
    if (d <= 1 && d < bd) { best = r; bd = d; }
  }
  return best;
}

export function surowceW(lat: number, lon: number): [Surowiec, number][] {
  return regionZloz(lat, lon)?.surowce ?? SUROWCE_DOMYSLNE;
}

/** Stała kopalnia po ziarnie (nazwa w HUD-zie i przy wejściu). */
export function kopalniaStala(seed: number) {
  return KOPALNIE_STALE.find((k) => k.seed === seed) ?? null;
}

export function skalaZLitery(l: string | undefined): SkalaLochu {
  for (const [k, v] of Object.entries(SKALE)) if (v.litera === l) return k as SkalaLochu;
  return 'zwykly';
}
