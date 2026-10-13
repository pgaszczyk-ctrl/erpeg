// ============================================================================
//  EKRAN MAPY (🗺 albo M): przybliżenia i kontury do widoku województwa i kraju.
// ============================================================================

/** Przybliżenia od najbliższego. `r` = promień widoku w metrach (miasto), albo widok województwa / kraju. */
export const SKALE_MAPY: ({ rodzaj: 'miasto'; r: number; nazwa?: string } | { rodzaj: 'wojewodztwo' | 'kraj' })[] = [
  { rodzaj: 'miasto', r: 600 },
  { rodzaj: 'miasto', r: 1500 },
  // Całe miasto (Lublin ma ok. 12–14 km średnicy); podpis = nazwa mapy, na której jesteśmy.
  { rodzaj: 'miasto', r: 7000, nazwa: 'miasto' },
  { rodzaj: 'wojewodztwo' },
  { rodzaj: 'kraj' },
];

/**
 * Widoki „Okolica” i „Kraj / świat” (właściciel, 13.10.2026: „ma się centrować na fragment mapy, w którym
 * jesteśmy i który znamy”): okolica = koło `km` wokół bohatera; kraj = tyle, by zmieścić wszystko, co
 * znamy (najmniej `minKm`, najwyżej `maksKm`), ze środkiem pośrodku poznanych miejsc.
 * Poznany teren pokazujemy orientacyjnie – plamami w kratkach `kratkaKm`, nie dokładną trasą.
 */
export const OKOLICA = { km: 135, kratkaKm: 2 };
export const KRAJ_WIDOK = { minKm: 400, maksKm: 6000, zapas: 1.25, kratkaKm: 8 };

/** Miasta wojewódzkie (widok kraju: kropka, gdy bohater tam był – w promieniu `odwiedzoneKm`). */
export const MIASTA_WOJEWODZKIE: { nazwa: string; lat: number; lon: number }[] = [
  { nazwa: 'Warszawa', lat: 52.2297, lon: 21.0122 },
  { nazwa: 'Kraków', lat: 50.0647, lon: 19.945 },
  { nazwa: 'Łódź', lat: 51.7592, lon: 19.456 },
  { nazwa: 'Wrocław', lat: 51.1079, lon: 17.0385 },
  { nazwa: 'Poznań', lat: 52.4064, lon: 16.9252 },
  { nazwa: 'Gdańsk', lat: 54.352, lon: 18.6466 },
  { nazwa: 'Szczecin', lat: 53.4285, lon: 14.5528 },
  { nazwa: 'Bydgoszcz', lat: 53.1235, lon: 18.0084 },
  { nazwa: 'Toruń', lat: 53.0138, lon: 18.5984 },
  { nazwa: 'Lublin', lat: 51.2465, lon: 22.5684 },
  { nazwa: 'Białystok', lat: 53.1325, lon: 23.1688 },
  { nazwa: 'Katowice', lat: 50.2649, lon: 19.0238 },
  { nazwa: 'Kielce', lat: 50.8661, lon: 20.6286 },
  { nazwa: 'Olsztyn', lat: 53.7784, lon: 20.4801 },
  { nazwa: 'Opole', lat: 50.6751, lon: 17.9213 },
  { nazwa: 'Rzeszów', lat: 50.0412, lon: 21.9991 },
  { nazwa: 'Zielona Góra', lat: 51.9356, lon: 15.5062 },
  { nazwa: 'Gorzów Wielkopolski', lat: 52.7368, lon: 15.2288 },
];
export const ODWIEDZONE_KM = 20;

/**
 * Pieszo między mapą Lublina a mapą świata (zgłoszenia 45, 47, 48, 50): kto dojdzie do Lublina z innego
 * miasta, wchodzi na prawdziwą mapę Lublina (bruk, zadania, stałe postacie), gdy jest `wejscieM` za jej
 * granicą; kto pcha się przez granicę Lublina na zewnątrz (punkt `wyjscieM` przed nim jest poza nią),
 * po `wyjscieS` sekundach wychodzi na mapę świata.
 */
export const GRANICA = { wejscieM: 80, wyjscieM: 15, wyjscieS: 1 };

/**
 * HUD, plakietka w prawym górnym rogu (spec. „nowy HUD”, 5.10.2026): druga linia mówi, gdzie jesteśmy.
 * Konkretne miejsce (ulica) tylko po rozmowie z kimś – ważne do `wiedzaM` od miejsca rozmowy;
 * inaczej „w mieście / za miastem · gdzieś na północy” od środka miejscowości.
 * Promienie „w mieście” (metry): Lublin, wsie i miasteczka z mapy Lublina, duże miasta z mapy świata, mapy stacji.
 */
/**
 * Mapy świata (zgłoszenie 67): nazwę miejscowości gra sprawdza dopiero, gdy bohater zagada przechodnia.
 * Pamięta ją, dopóki jest w jej granicach albo `pamietajM` od miejsca pytania; na odpowiedź czeka najwyżej `czekajMs`.
 */
export const MIEJSCOWOSC = { pamietajM: 2500, czekajMs: 3000 };

export const MIEJSCE_HUD = {
  wiedzaM: 300, lublinM: 5500, wsM: 900, miastoM: 4000, miasteczkoM: 1000, centrum: 0.15,
  /** Miejscowości z mapy Lublina, które są miastami (reszta to wsie: „we wsi / za wsią”). */
  miasta: ['Nałęczów'],
};

/**
 * MAPA PODRÓŻNIKA (właściciel, 13.10.2026): kupiona u woźnicy/konduktora, kapitana portu albo w bibliotece
 * dokłada do ekranu mapy ikonki dworców kolejowych, autobusowych i portów w promieniu `promienKm` od MIEJSCA
 * ZAKUPU (mapa tej okolicy – kupiona w Lublinie nie powie nic o dworcu w Lęborku; tam kupuje się następną).
 * Dotknięcie ikonki → „Prowadź” = strzałka do tego miejsca (nie liczy się do limitu zadań).
 * Dane dworców doczytywane tylko dla posiadaczy mapy (src/huby.ts).
 */
export const MAPA_PODROZNIKA = {
  cena: 300,
  promienKm: 50,
  /** Nową mapę można kupić, gdy bohater jest dalej niż ta część promienia od środka każdej posiadanej. */
  nowaOd: 0.6,
  /** Ile miejsc z jednej mapy (właściciel: „max 6, najlepiej oddalonych od siebie, przynajmniej 1 z każdego rodzaju”). */
  maksIkon: 6,
  /** Doszedłeś do celu, gdy jesteś tyle metrów od niego. */
  doszedlM: 60,
  kolor: '#ffffff',
};
