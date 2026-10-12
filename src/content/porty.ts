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

/** Linie, których brakuje w OSM, dopisane ręcznie: [port A (lat, lon, nazwa), port B, km po wodzie, nazwa]. */
export const LINIE_DOPISANE: [{ nazwa: string; lat: number; lon: number }, { nazwa: string; lat: number; lon: number }, number, string][] = [];
