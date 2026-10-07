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
  { k: 'gory_paralaksa', grupa: 'Góry (paralaksa)', nazwa: 'Ruch paralaksy w górach (0 = wyłączony, 1 = pełny)', domyslnie: 0.7, min: 0, max: 1, krok: 0.05 },
  { k: 'gory_paralaksa_od', grupa: 'Góry (paralaksa)', nazwa: 'Paralaksa od różnicy wysokości w okolicy (m)', domyslnie: 200, min: 0, max: 3000, krok: 10 },
  { k: 'gory_paralaksa_pelna', grupa: 'Góry (paralaksa)', nazwa: 'Pełna paralaksa od różnicy wysokości (m)', domyslnie: 400, min: 10, max: 3000, krok: 10 },
  { k: 'gory_przyciemnienie', grupa: 'Góry (paralaksa)', nazwa: 'Przyciemnienie terenu niżej (0,05 = 5 %)', domyslnie: 0.05, min: 0, max: 0.5, krok: 0.01 },
  { k: 'gory_przyciemnienie_szer', grupa: 'Góry (paralaksa)', nazwa: 'Przyciemnienie narasta przez tyle metrów spadku', domyslnie: 6, min: 1, max: 50, krok: 1 },
  { k: 'gory_rozmycie', grupa: 'Góry (paralaksa)', nazwa: 'Rozmycie terenu niżej od bohatera (0 = brak, 1 = mocne)', domyslnie: 0.5, min: 0, max: 1.5, krok: 0.05 },
  { k: 'gory_rzezba_od', grupa: 'Góry (paralaksa)', nazwa: 'Efekt gór od różnicy wysokości w okolicy (m)', domyslnie: 80, min: 0, max: 2000, krok: 10 },
  { k: 'gory_rzezba_pelna', grupa: 'Góry (paralaksa)', nazwa: 'Pełny efekt gór od różnicy wysokości (m)', domyslnie: 220, min: 10, max: 3000, krok: 10 },
  { k: 'gory_rzezba_promien', grupa: 'Góry (paralaksa)', nazwa: 'Promień, w którym liczy się różnicę wysokości (m)', domyslnie: 600, min: 100, max: 1500, krok: 50 },
  { k: 'gory_zabudowa_od', grupa: 'Góry (paralaksa)', nazwa: 'Efekt słabnie, gdy budynki zajmują (udział, 0,04 = 4 %)', domyslnie: 0.04, min: 0, max: 1, krok: 0.01 },
  { k: 'gory_zabudowa_pelna', grupa: 'Góry (paralaksa)', nazwa: 'Efekt najsłabszy, gdy budynki zajmują (udział)', domyslnie: 0.12, min: 0.01, max: 1, krok: 0.01 },
  { k: 'gory_zabudowa_zostaje', grupa: 'Góry (paralaksa)', nazwa: 'W gęstej zabudowie zostaje efektu (0 = nic, 1 = cały)', domyslnie: 0, min: 0, max: 1, krok: 0.05 },
  { k: 'kolczan', grupa: 'Zużycie broni', nazwa: 'Mieści się sztuk amunicji (każdego rodzaju)', domyslnie: 200, min: 5, max: 500 },
];
