// ----------------------------------------------------------------------------
// POKRĘTŁA – liczby gry, które właściciel zmienia w panelu admina
// (⚙ Ustawienia → „Pokrętła gry”), bez nowej wersji gry. Serwer trzyma tylko
// zmienione wartości (tabela `game_settings`, RPC `game_settings`); gra
// wczytuje je przy starcie (src/settings.ts `loadSettings`) i wpisuje w zwykłe
// stałe z plików content/. Wartości domyślne są tutaj – „przywróć” w panelu
// usuwa zmianę z serwera. Nowe pokrętło = wpis tutaj + jak je wpisać w grę
// (USTAW w src/settings.ts).
// ----------------------------------------------------------------------------

export interface Pokretlo {
  /** Nazwa w tabeli game_settings (bez polskich liter). */
  k: string;
  /** Opis dla właściciela. */
  nazwa: string;
  grupa: string;
  domyslnie: number;
  min: number;
  max: number;
  krok?: number;
}

export const POKRETLA: Pokretlo[] = [
  { k: 'predkosc_kmh', grupa: 'Ruch', nazwa: 'Prędkość pieszo (km/h)', domyslnie: 70, min: 20, max: 150 },
  { k: 'wskrzeszenie_diamenty', grupa: 'Diamenty', nazwa: 'Wskrzeszenie kosztuje (💎)', domyslnie: 10, min: 1, max: 1000 },
  { k: 'diament_monet', grupa: 'Diamenty', nazwa: 'Diament w banku kosztuje (monet)', domyslnie: 1_000_000, min: 1000, max: 1e9, krok: 1000 },
  { k: 'ceny_przedmiotow', grupa: 'Ceny', nazwa: 'Ceny przedmiotów w sklepach (× mnożnik)', domyslnie: 1, min: 0.1, max: 10, krok: 0.05 },
  { k: 'ceny_zbiorow', grupa: 'Ceny', nazwa: 'Skup owoców, warzyw, grzybów, drewna (× mnożnik)', domyslnie: 1, min: 0.1, max: 10, krok: 0.05 },
  { k: 'namiot_pole', grupa: 'Ceny', nazwa: 'Nocleg na polu namiotowym (monet)', domyslnie: 50, min: 0, max: 100000 },
  { k: 'alchemik_owocow', grupa: 'Leczenie', nazwa: 'Mikstura u alchemika kosztuje (owoców)', domyslnie: 50, min: 1, max: 1000 },
  { k: 'leczenie_owocow', grupa: 'Leczenie', nazwa: 'Jedno serduszko = tyle zjedzonych owoców', domyslnie: 20, min: 1, max: 200 },
  { k: 'grzybow_na_kratke', grupa: 'Zbieranie', nazwa: 'Grzybów na kratkę lasu (30 m) najwyżej', domyslnie: 3, min: 0, max: 10 },
  { k: 'uderzen_na_drzewo', grupa: 'Zbieranie', nazwa: 'Uderzeń w sosnę na jedno drewno', domyslnie: 4, min: 1, max: 30 },
  { k: 'pola_dojrzale', grupa: 'Zbieranie', nazwa: 'Dojrzałe warzywa na polach (udział, 0,035 = 3,5 %)', domyslnie: 0.035, min: 0, max: 0.5 },
  { k: 'wytrzymalosc_mnoznik', grupa: 'Zużycie broni', nazwa: 'Wytrzymałość broni (× mnożnik; szklany miecz bez zmian)', domyslnie: 1, min: 0.1, max: 20, krok: 0.1 },
  { k: 'naprawa_czesc_ceny', grupa: 'Zużycie broni', nazwa: 'Pełna naprawa kosztuje tyle ceny broni (0.3 = 30%)', domyslnie: 0.3, min: 0, max: 2, krok: 0.05 },
  { k: 'strzala_cena', grupa: 'Zużycie broni', nazwa: 'Strzała kosztuje (monet)', domyslnie: 3, min: 0, max: 1000 },
  { k: 'kolczan', grupa: 'Zużycie broni', nazwa: 'Mieści się sztuk amunicji (każdego rodzaju)', domyslnie: 200, min: 5, max: 500 },
];
