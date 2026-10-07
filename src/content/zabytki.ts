// Zabytki od grafika na szkielecie z OSM (G12, docs/paczka-dla-programisty/ZABYTKI.md). Obraz grafika leży dokładnie na
// szkielecie: generator budynków ich nie rysuje (tylko cień), gra stawia obraz jako jeden obiekt sortowany z postaciami.

export interface Zabytek {
  id: string;
  /** Mapa (dziś tylko Lublin). */
  mapa: string;
  /** Budynek z mapy, po którego obrysie kładziemy obraz (nazwa z OSM). */
  budynek: string;
  /** Plik w public/ (px generatora: 2 na punkt mapy, czyli 3,84 na metr). */
  plik: string;
  /** Lewy-górny róg obrazu i środek prostokąta obrysu tego budynku w układzie szkieletu (px generatora). */
  rog: [number, number];
  srodek: [number, number];
  /** Wysokość ścian głównej bryły w szkielecie: obraz idzie o nią w górę, żeby ściany stały na obrysie (wygląd 09). */
  sciany: number;
  /** Przezroczystość, gdy bohater stoi za zabytkiem. */
  przeswit: number;
}

export const ZABYTKI: Zabytek[] = [
  {
    // Zamek Lubelski z kaplicą Świętej Trójcy, donżonem i budynkiem wystaw (zamówienie 13, paczka „zabytki_ozdoby” 6.10.2026);
    // w mapie zamek i kaplica są jednym budynkiem (scalone w build-map), środek ich wspólnego prostokąta.
    id: 'zamek_lublin',
    mapa: 'lublin',
    budynek: 'Zamek w Lublinie',
    plik: 'swiat/zabytki/zamek_lubelski.png',
    rog: [549, 508],
    srodek: [787.0, 653.95],
    sciany: 16,
    przeswit: 0.35,
  },
];
