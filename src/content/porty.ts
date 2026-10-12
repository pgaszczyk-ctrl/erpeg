// ----------------------------------------------------------------------------
//  PORTY I PROMY (właściciel, 12 X 2026; na razie tylko serwer testowy)
//
//  Każdy prawdziwy port promowy świata z OpenStreetMap (public/porty.json,
//  automat „Ferry ports”, scripts/promy-osm.mjs) ma kapitana. Kapitan zna
//  stałe linie swojego portu – prom Gdynia–Karlskrona pływa zawsze tam samo,
//  nic się nie losuje. Rejs trwa naprawdę (zegar serwera, także przy
//  zamkniętej grze), jak jazda pociągiem; długość linii to jej prawdziwa
//  droga po wodzie z mapy. Port docelowy staje się punktem wczytania.
//  Liczby do późniejszego wyważenia (docs/ekonomia.md).
// ----------------------------------------------------------------------------

export const PROM = {
  /** Prędkość promu, km/h (ok. 19 węzłów). */
  kmh: 35,
  /** Cena: opłata portowa + za każdy km drogi po wodzie, zaokrąglona w górę. */
  oplata: 150,
  zaKm: 6,
  zaokraglenie: 10,
  /** Kapitan staje w porcie, gdy bohater jest bliżej niż tyle km (i mapa wokół jest wczytana). */
  widacKm: 2,
  /** Raz na mapę: podpowiedź, gdzie jest najbliższy port, jeśli jest bliżej niż tyle km. */
  wskazowkaKm: 30,
  /** Najwięcej linii na liście kapitana (najkrótsze; reszta po „Dalej…”). */
  naStronie: 6,
  /** Od którego poziomu postaci (0 = od razu). */
  odPoziomu: 0,
};

type P = { nazwa: string; lat: number; lon: number };
const p = (nazwa: string, lat: number, lon: number): P => ({ nazwa, lat, lon });
const GDYNIA = p('Gdynia', 54.535, 18.5), GDANSK = p('Gdańsk', 54.397, 18.679), SWINOUJSCIE = p('Świnoujście', 53.9093, 14.2647);
const KARLSKRONA = p('Karlskrona', 56.104, 15.635), NYNASHAMN = p('Nynäshamn', 58.903, 17.955), YSTAD = p('Ystad', 55.4281, 13.8253), TRELLEBORG = p('Trelleborg', 55.37, 13.153);
const HELSINKI = p('Helsinki', 60.1525, 24.92), TALLINN = p('Tallinn', 59.444, 24.763), SZTOKHOLM = p('Sztokholm', 59.35, 18.106);
const BARCELONA = p('Barcelona', 41.37, 2.178), PALMA = p('Palma', 39.56, 2.629), GENUA = p('Genua', 44.412, 8.918), PALERMO = p('Palermo', 38.129, 13.368);
const CIVITAVECCHIA = p('Civitavecchia', 42.096, 11.782), OLBIA = p('Olbia', 40.922, 9.517), PIREUS = p('Pireus', 37.942, 23.638);
const SANTORYN = p('Santoryn', 36.388, 25.429), HERAKLION = p('Heraklion', 35.342, 25.14), SPLIT = p('Split', 43.502, 16.442), ANKONA = p('Ankona', 43.62, 13.505);
const TARIFA = p('Tarifa', 36.009, -5.603), TANGER = p('Tanger', 35.788, -5.81), NAGAPATTINAM = p('Nagapattinam', 10.77, 79.848), KANKESANTHURAI = p('Kankesanthurai', 9.812, 80.047);

/**
 * Linie dopisane ręcznie – zapas, gdy w danych z OSM ich brakuje (prawdziwe linie promowe; współrzędne przystani
 * przybliżone, kapitan staje na najbliższym miejscu, skąd da się odejść). [port A, port B, km po wodzie, nazwa].
 * Port z OSM w promieniu 3 km jest tym samym portem (porty.ts znajdzLubDodaj).
 */
export const LINIE_DOPISANE: [P, P, number, string][] = [
  [GDYNIA, KARLSKRONA, 250, 'Gdynia – Karlskrona'],
  [GDANSK, NYNASHAMN, 520, 'Gdańsk – Nynäshamn'],
  [SWINOUJSCIE, YSTAD, 165, 'Świnoujście – Ystad'],
  [SWINOUJSCIE, TRELLEBORG, 180, 'Świnoujście – Trelleborg'],
  [HELSINKI, TALLINN, 82, 'Helsinki – Tallinn'],
  [SZTOKHOLM, HELSINKI, 450, 'Sztokholm – Helsinki'],
  [SZTOKHOLM, TALLINN, 390, 'Sztokholm – Tallinn'],
  [BARCELONA, PALMA, 210, 'Barcelona – Palma'],
  [GENUA, PALERMO, 860, 'Genua – Palermo'],
  [CIVITAVECCHIA, OLBIA, 230, 'Civitavecchia – Olbia'],
  [PIREUS, SANTORYN, 240, 'Pireus – Santoryn'],
  [PIREUS, HERAKLION, 320, 'Pireus – Heraklion'],
  [SPLIT, ANKONA, 220, 'Split – Ankona'],
  [TARIFA, TANGER, 35, 'Tarifa – Tanger'],
  [NAGAPATTINAM, KANKESANTHURAI, 111, 'Nagapattinam – Kankesanthurai (Indie – Sri Lanka)'],
];
