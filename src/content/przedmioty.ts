// ============================================================================
//  PRZEDMIOTY I UMIEJĘTNOŚCI
//  Gracz zaczyna jako wojownik z kijkiem. W bibliotece może nauczyć się
//  magii. Łuk można kupić w sklepie (albo dostać w nagrodę od policji).
//  Ręka główna: miecz, łuk albo różdżka (klik = szybki atak, przytrzymanie
//  = celowanie i mocny atak). Druga ręka: tylko rzeczy do obrony i wsparcia –
//  szklana kula / księga (mocniejsze czary), później tarcza i kołczan.
// ============================================================================

export type Miejsce = 'bron' | 'dystans' | 'zbroja' | 'helm' | 'buty' | 'amulet' | 'talizman' | 'talizman2' | 'talizman3';
/** Trzy miejsca na talizmany (przedmioty z miejsce: 'talizman' idą do pierwszego wolnego). */
export const TALIZMANY: Miejsce[] = ['talizman', 'talizman2', 'talizman3'];
import type { Amunicja } from './zuzycie';
import { POJAZDY } from './sklepy';
import { WYTWORCY } from './wytworcy';

export type Umiejetnosc = 'miecz' | 'luk' | 'magia';

export interface Przedmiot {
  id: string;
  nazwa: string;
  /** Gdzie się go zakłada. */
  miejsce: Miejsce;
  /** Obrażenia (broń; kijek na 10. poziomie ≈ stalowy miecz 7 na 1.) albo obrona (zbroja, hełm, buty). */
  moc: number;
  /** Cena w sklepie (0 = nie do kupienia). */
  cena: number;
  /** Premium price; charged instead of coins. */
  cenaDiamenty?: number;
  /** Łuk albo magia (różdżka w ręce; kula/księga w drugiej ręce wzmacniają czary). */
  rodzaj?: 'luk' | 'magia';
  /** What a ranged weapon shoots (default arrows). */
  amunicja?: Amunicja;
  /** Gdzie się go kupuje: sklep (domyślnie) albo biblioteka. */
  gdzie?: 'sklep' | 'biblioteka';
  /**
   * Moc specjalna (przedmioty mityczne, tylko z tajnych haseł):
   * 'swiatlo' = świeci i widać dalej, 'pioruny' = sam razi pioruny wrogów w pobliżu,
   * 'szczescie' = więcej monet za potwory i rozbite bandy (PODKOWA),
   * 'szybkosc' = szybsze chodzenie (SZYBKOSC_TALIZMANU, talizmany „Serca Zębatka”),
   * 'zycie' = więcej życia (ZYCIE_PRZEDMIOTU, Cukierniczy Cylinder),
   * 'celnosc' = łatwiej trafić (CELNOSC_PRZEDMIOTU punktów procentowych, Zegarek czeladnika),
   * 'obrona' = talizman liczony do obrony jak zbroja (jego `moc`, Filtr aetherowy).
   */
  efekt?: 'swiatlo' | 'pioruny' | 'szczescie' | 'szybkosc' | 'zycie' | 'celnosc' | 'obrona';
  /** Przedmiot fabularny (np. pączek dla herszta): nic nie daje, służy do misji. */
  fabularny?: boolean;
  /** Prepared food: heals this many hearts, after potions and edible harvests. */
  leczenie?: number;
  /** Krótki opis pokazywany w karcie postaci. */
  opis?: string;
  /** Ile ciosów/strzałów wytrzyma, zanim się zepsuje (content/zuzycie.ts); brak = nie zużywa się. */
  wytrzymalosc?: number;
  /** Szkło: zużywa się na każdym poziomie trudności i po ostatnim ciosie pęka (znika). */
  szklany?: boolean;
  /** A tool: works from the backpack too (the axe turns felled trees into wood instead of brushwood). */
  narzedzie?: 'siekiera';
  /** Vehicles stay in the backpack; their HUD buttons toggle riding. */
  pojazd?: 'rower' | 'hulajnoga';
}

// Ceny są wysokie celowo: tanie rzeczy ok. 20× więcej niż na początku, najlepsze
// ok. 50×, żeby na dobry sprzęt trzeba było popracować (owoce, zlecenia).
export const PRZEDMIOTY: Przedmiot[] = [
  ...(import.meta.env?.VITE_TEST === '1' ? [
    { id: 'rower', nazwa: 'Welocyped parowy', miejsce: 'talizman', moc: 0, cena: POJAZDY.rower.monet, pojazd: 'rower', opis: 'Jazda o 25% szybciej. Trzymaj w plecaku. Obrazek na mapie pozwala wsiąść lub zejść.' },
    { id: 'hulajnoga_parowa', nazwa: 'Hulajnoga parowa', miejsce: 'talizman', moc: 0, cena: 0, cenaDiamenty: POJAZDY.hulajnoga.diamenty, pojazd: 'hulajnoga', opis: 'Jazda o 40% szybciej. Trzymaj w plecaku. Obrazek na mapie pozwala wsiąść lub zejść.' },
  ] as Przedmiot[] : []),
  // Broń do ręki (klik)
  { id: 'kijek', nazwa: 'Kijek', miejsce: 'bron', moc: 1, cena: 0 },
  // Owner, 5 Oct 2026 (docs/ekonomia.md: „Bez narzędzia: chrust. Siekiera → drewno”): sold in DIY shops and in
  // every 3rd ordinary shop (SIEKIERA). Wears one point per felled tree; a blunt one gives brushwood again.
  { id: 'siekiera', nazwa: 'Siekiera', miejsce: 'bron', moc: 3, cena: 1500, wytrzymalosc: 200, narzedzie: 'siekiera',
    opis: 'Ścięte drzewo daje drewno zamiast chrustu – wystarczy mieć ją w plecaku. Można też nią walczyć.' },
  { id: 'zelazny', nazwa: 'Żelazny miecz', miejsce: 'bron', moc: 4, cena: 1500, wytrzymalosc: 600 },
  // Drabinka z docs/ekonomia.md (kij → żelazo → mosiądz → stal → stal hartowana → damasceńska); ikony z paczki ikony12 B1.
  // Liczby tymczasowe, wpasowane między stare szczeble – do przeliczenia z nową gospodarką.
  { id: 'miecz_mosiezny', nazwa: 'Mosiężny miecz', miejsce: 'bron', moc: 5, cena: 3000, wytrzymalosc: 750, opis: 'Złocisty, z nitami i trybikiem przy jelcu.' },
  { id: 'stalowy', nazwa: 'Stalowy miecz', miejsce: 'bron', moc: 7, cena: 6000, wytrzymalosc: 900 },
  { id: 'szabla_hartowana', nazwa: 'Szabla hartowana', miejsce: 'bron', moc: 10, cena: 12000, wytrzymalosc: 1050, opis: 'Polska szabla; ostrze z tęczowym nalotem po hartowaniu.' },
  { id: 'rycerski', nazwa: 'Rycerski miecz', miejsce: 'bron', moc: 12, cena: 22500, wytrzymalosc: 1200 },
  { id: 'karabela_damascenska', nazwa: 'Karabela damasceńska', miejsce: 'bron', moc: 15, cena: 50000, wytrzymalosc: 1500, opis: 'Szlachecka karabela ze stali damasceńskiej, z odrobiną odłamka komety.' },
  { id: 'szklany_miecz', nazwa: 'Szklany miecz', miejsce: 'bron', moc: 16, cena: 4000, wytrzymalosc: 15, szklany: true, opis: 'Bardzo mocny, ale kruchy: pęka po 15 trafionych ciosach – na każdym poziomie trudności.' },
  // Broń dystansowa (przytrzymaj i celuj)
  { id: 'luk', nazwa: 'Łuk', miejsce: 'bron', rodzaj: 'luk', moc: 4, cena: 3000, wytrzymalosc: 800 },
  { id: 'luk_refleksyjny', nazwa: 'Łuk refleksyjny', miejsce: 'bron', rodzaj: 'luk', moc: 5, cena: 6000, wytrzymalosc: 900 },
  { id: 'dlugi_luk', nazwa: 'Długi łuk', miejsce: 'bron', rodzaj: 'luk', moc: 7, cena: 12000, wytrzymalosc: 1000 },
  // ikony12 C1: temporary numbers. Crossbow shoots bolts, the steam pistol bullets (AMUNICJA in zuzycie.ts).
  { id: 'kusza', nazwa: 'Kusza', miejsce: 'bron', rodzaj: 'luk', amunicja: 'belty', moc: 10, cena: 25000, wytrzymalosc: 1200 },
  { id: 'pistolet_parowy', nazwa: 'Pistolet parowy', miejsce: 'bron', rodzaj: 'luk', amunicja: 'naboje', moc: 14, cena: 60000, wytrzymalosc: 1400 },
  { id: 'rozdzka', nazwa: 'Różdżka', miejsce: 'bron', rodzaj: 'magia', moc: 4, cena: 2000, gdzie: 'biblioteka' },
  { id: 'kula', nazwa: 'Szklana kula', miejsce: 'dystans', rodzaj: 'magia', moc: 3, cena: 9000, gdzie: 'biblioteka', opis: 'W drugiej ręce: czary z różdżki są mocniejsze.' },
  { id: 'ksiega', nazwa: 'Księga zaklęć', miejsce: 'dystans', rodzaj: 'magia', moc: 6, cena: 26000, gdzie: 'biblioteka', opis: 'W drugiej ręce: czary z różdżki są dużo mocniejsze.' },
  // Ochrona: każdy punkt obrony to 6% szans, że cios nie zrani (najwyżej 60%)
  // Tarcze (paczka ikony12 B2): w drugiej ręce, dodają obronę jak zbroja. Liczby tymczasowe.
  { id: 'tarcza_drewniana', nazwa: 'Tarcza drewniana', miejsce: 'dystans', moc: 1, cena: 700, opis: 'Okrągła, z desek. W drugiej ręce: +1 do obrony.' },
  { id: 'tarcza_okuta', nazwa: 'Tarcza okuta', miejsce: 'dystans', moc: 3, cena: 4500, opis: 'Z żelaznym obrzeżem i mosiężnym umbem. W drugiej ręce: +3 do obrony.' },
  { id: 'skorzana_zbroja', nazwa: 'Skórzana zbroja', miejsce: 'zbroja', moc: 2, cena: 1600 },
  { id: 'kolczuga', nazwa: 'Kolczuga', miejsce: 'zbroja', moc: 4, cena: 9600 },
  { id: 'skorzany_helm', nazwa: 'Skórzany hełm', miejsce: 'helm', moc: 1, cena: 800 },
  { id: 'zelazny_helm', nazwa: 'Żelazny hełm', miejsce: 'helm', moc: 2, cena: 5200 },
  // Nakrycia głowy widać na ludziku (rysunki w look.ts).
  { id: 'kapelusz', nazwa: 'Kapelusz Robin Hooda', miejsce: 'helm', moc: 1, cena: 900 },
  { id: 'czapka_maga', nazwa: 'Magiczna czapka', miejsce: 'helm', moc: 1, cena: 2500, gdzie: 'biblioteka' },
  { id: 'korona', nazwa: 'Korona', miejsce: 'helm', moc: 3, cena: 0, opis: 'Królewska! Tylko za tajne hasło albo w nagrodę.' },
  { id: 'skorzane_buty', nazwa: 'Skórzane buty', miejsce: 'buty', moc: 1, cena: 600 },
  { id: 'zelazne_buty', nazwa: 'Żelazne buty', miejsce: 'buty', moc: 2, cena: 4400 },
  // Mityczne: nie ma ich w sklepach, dostaje się je za tajne hasło (np. z ulotki
  // w prawdziwym miejscu). Hasła i nagrody ustawia się w panelu admina.
  { id: 'swietlisty', nazwa: 'Świetlisty miecz', miejsce: 'bron', moc: 9, cena: 0, efekt: 'swiatlo', opis: 'Świeci – widzisz o połowę dalej.' },
  // Talizmany (miejsce na szyi): tylko w nagrodę za misje.
  { id: 'podkowa_szczescia', nazwa: 'Podkowa Szczęścia', miejsce: 'talizman', moc: 0, cena: 0, efekt: 'szczescie', opis: 'Dopóki ją nosisz, każdy potwór i każda rozbita banda dają 10% więcej monet.' },
  { id: 'gromowladny', nazwa: 'Gromowładny miecz', miejsce: 'bron', moc: 7, cena: 0, efekt: 'pioruny', opis: 'Sam razi piorunami wrogów w pobliżu.' },
  // „Serce Zębatka” (owner's quest chain, 6 Oct 2026): rewards of its missions, made in the admin panel.
  { id: 'gwizdek_maszynisty', nazwa: 'Gwizdek Maszynisty', miejsce: 'talizman', moc: 0, cena: 0, efekt: 'szybkosc', opis: 'Mosiężny gwizdek z parowozu. Noszony jako talizman: chodzisz o 4% szybciej.' },
  { id: 'kluczyk_nakrecacz', nazwa: 'Kluczyk Nakręcacz', miejsce: 'talizman', moc: 0, cena: 0, efekt: 'szybkosc', opis: 'Kluczyk do nakręcania mechanizmów. Noszony jako talizman: chodzisz o 4% szybciej.' },
  { id: 'kieszonkowy_chronometr', nazwa: 'Kieszonkowy Chronometr', miejsce: 'talizman', moc: 0, cena: 0, efekt: 'szybkosc', opis: 'Tyka równo jak serce Zębatka. Noszony jako talizman: chodzisz o 4% szybciej.' },
  { id: 'cukierniczy_cylinder', nazwa: 'Cukierniczy Cylinder', miejsce: 'helm', moc: 1, cena: 0, efekt: 'zycie', opis: 'Pachnie lukrem. Daje jedno serce życia więcej.' },
  // „Przebudzenie Starego Grodu” (owner's spec, 6 Oct 2026): rewards of its chain; numbers as in the spec.
  { id: 'zegarek_czeladnika', nazwa: 'Zegarek czeladnika', miejsce: 'talizman', moc: 0, cena: 0, efekt: 'celnosc', opis: 'Tyka równo jak serce. Z nim trafiasz, w co celujesz (+10% trafień).' },
  { id: 'filtr_aetherowy', nazwa: 'Filtr aetherowy', miejsce: 'talizman', moc: 1, cena: 0, efekt: 'obrona', opis: 'Od Pustelnika ze Starego Gaju. Dziki aether omija cię bokiem (obrona +1).' },
  { id: 'klasztorny_pochlaniacz', nazwa: 'Klasztorny pochłaniacz', miejsce: 'zbroja', moc: 5, cena: 0, opis: 'Nosili go dominikanie w czasach Wielkiej Wojny o Tryby.' },
  { id: 'plaszcz_cechmistrza', nazwa: 'Płaszcz Cechmistrza', miejsce: 'zbroja', moc: 6, cena: 0, opis: 'Dla Strażnika Serca Miasta.' },
  { id: 'karabin_trybunal', nazwa: 'Karabin „Trybunał”', miejsce: 'bron', rodzaj: 'luk', amunicja: 'naboje', moc: 16, cena: 0, wytrzymalosc: 1600, opis: 'Parowy karabin wyborowy. Wyrok zapada z daleka.' },
  { id: 'paczek', nazwa: 'Pączek', miejsce: 'talizman', moc: 0, cena: 0, fabularny: true,
    ...(import.meta.env?.VITE_TEST === '1' ? { leczenie: WYTWORCY.paczkarnia.hearts } : {}),
    opis: 'Pączek z Dobrej Cukierni. Ktoś łasy na słodycze na pewno go zechce.' },
  ...(import.meta.env?.VITE_TEST === '1' ? [{
    id: 'hamburger', nazwa: 'Burger warzywny', miejsce: 'talizman', moc: 0, cena: 0,
    leczenie: WYTWORCY.mcdonalds.hearts,
    opis: 'Przygotowany wyłącznie z warzyw. Leczenie zużywa go po miksturach i jadalnych zbiorach.',
  }] as Przedmiot[] : []),
];

/** Talizman szybkości (efekt 'szybkosc'): o tyle szybciej chodzisz za każdy noszony. */
export const SZYBKOSC_TALIZMANU = 0.04;
/** Przedmiot z efektem 'zycie': tyle połówek serca więcej (2 = jedno serce). */
export const ZYCIE_PRZEDMIOTU = 2;
/** Przedmiot z efektem 'celnosc': tyle punktów procentowych łatwiej trafić. */
export const CELNOSC_PRZEDMIOTU = 10;

/** Świetlisty miecz: o ile razy dalej widać. */
export const SWIATLO = 1.5;
/** Gromowładny miecz: co ile ms piorun, jak daleko (w metrach) i ile zabiera życia. */
export const PIORUNY = { co: 2200, zasiegM: 60, obrazenia: 8 };
/** Podkowa Szczęścia: mnożnik monet za potwory i bandy. */
export const PODKOWA = 1.1;

export const MIEJSCA: Record<Miejsce, string> = {
  bron: 'Broń',
  dystans: 'Druga ręka',
  zbroja: 'Zbroja',
  helm: 'Hełm',
  buty: 'Buty',
  amulet: 'Amulet',
  talizman: 'Talizman',
  talizman2: 'Talizman',
  talizman3: 'Talizman',
};

export const OBRONA_ZA_PUNKT = 0.06;
export const OBRONA_MAKS = 0.6;

/** Plecak: ile miejsc i ile owoców mieści się w jednym miejscu. */
/** Plecak: tyle miejsc; jedna grupa (owoce, warzywa…) mieści tyle sztuk na miejsce. */
export const PLECAK = { miejsc: 20, owocowNaMiejsce: 200 };

// ----------------------------------------------------------------------------
//  UMIEJĘTNOŚCI rosną od używania: każde trafienie (wroga, drzewa, lalki,
//  tarczy, kryształu) to 1 punkt. Poziom 2 wymaga 100 punktów, każdy kolejny
//  do 10. 1,5 raza więcej, a od 11. każdy kolejny MNOZNIK_PO_10 (1,25) raza więcej niż
//  poprzedni (poziom 10 ≈ 7 500 trafień, poziom 20 ≈ 114 000).
//  Najwyżej poziom 20. Przerwy, celność i obrażenia: content/walka.ts
//  (magia na razie po staremu: `przerwa` − poziom × `szybciejNaPoziom`).
// ----------------------------------------------------------------------------
export const UMIEJETNOSCI: Record<Umiejetnosc, { nazwa: string; przerwa: number; szybciejNaPoziom: number }> = {
  miecz: { nazwa: 'Walka wręcz', przerwa: 320, szybciejNaPoziom: 18 },
  luk: { nazwa: 'Łucznictwo', przerwa: 650, szybciejNaPoziom: 35 },
  magia: { nazwa: 'Magia', przerwa: 750, szybciejNaPoziom: 40 },
};
export const PIERWSZY_POZIOM = 100;
export const MNOZNIK_POZIOMU = 1.5;
export const MNOZNIK_PO_10 = 1.25;
export const MAKS_POZIOM = 20;
/** Points needed to go from level `level - 1` to `level` (level ≥ 2). */
export function kosztPoziomu(level: number) {
  const early = Math.min(level, 10) - 2;
  return Math.round(PIERWSZY_POZIOM * MNOZNIK_POZIOMU ** early * MNOZNIK_PO_10 ** Math.max(0, level - 10));
}

/** Nauka magii w bibliotece. */
export const NAUKA_MAGII = 150;
/** Lekcja w szkole: za tyle monet tyle punktów praktyki. */
export const LEKCJA = { cena: 50, punkty: 40 };
