// ============================================================================
//  EKRAN MAPY (🗺 albo M): przybliżenia i kontury do widoku województwa i kraju.
// ============================================================================

/** Przybliżenia od najbliższego. `r` = promień widoku w metrach (miasto), albo widok województwa / kraju. */
export const SKALE_MAPY: ({ rodzaj: 'miasto'; r: number; nazwa?: string } | { rodzaj: 'wojewodztwo' | 'kraj' })[] = [
  { rodzaj: 'miasto', r: 600 },
  { rodzaj: 'miasto', r: 1500 },
  // Lublin ma ok. 12–14 km średnicy.
  { rodzaj: 'miasto', r: 7000, nazwa: 'Lublin' },
  { rodzaj: 'wojewodztwo' },
  { rodzaj: 'kraj' },
];

/** Środek i promień (km) widoku województwa lubelskiego. */
export const WOJEWODZTWO = { lat: 51.25, lon: 22.9, km: 135 };
/** Środek i promień (km) widoku Polski. */
export const KRAJ = { lat: 52.05, lon: 19.4, km: 400 };

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
