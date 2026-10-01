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

/** Uproszczony kontur województwa lubelskiego (lon, lat) – tylko do rysunku. */
export const KONTUR_LUBELSKIE: [number, number][] = [
  [21.95, 52.1], [22.45, 52.05], [22.9, 52.28], [23.2, 52.23], [23.65, 52.0], [23.6, 51.65], [23.55, 51.5], [23.7, 51.4],
  [23.9, 51.0], [24.15, 50.85], [24.0, 50.6], [23.7, 50.38], [23.45, 50.25], [23.0, 50.35], [22.6, 50.35], [22.4, 50.55],
  [22.15, 50.8], [21.85, 50.95], [21.65, 51.2], [21.8, 51.45], [21.65, 51.6], [21.85, 51.85],
];

/** Uproszczony kontur Polski (lon, lat) – tylko do rysunku. */
export const KONTUR_POLSKI: [number, number][] = [
  [14.2, 53.9], [15.0, 54.15], [16.0, 54.3], [17.0, 54.7], [18.3, 54.83], [18.6, 54.4], [19.6, 54.45], [20.5, 54.4],
  [21.5, 54.33], [22.8, 54.36], [23.5, 54.0], [23.9, 53.15], [23.6, 52.6], [23.2, 52.3], [23.65, 52.0], [23.6, 51.65],
  [23.55, 51.5], [23.7, 51.4], [23.9, 51.0], [24.15, 50.85], [24.0, 50.6], [23.7, 50.38], [22.7, 49.6], [22.9, 49.05], [22.5, 49.1], [21.5, 49.45], [20.9, 49.3], [19.8, 49.2],
  [19.4, 49.6], [18.85, 49.5], [18.0, 50.0], [17.5, 50.3], [16.9, 50.45], [16.3, 50.7], [15.5, 50.8], [15.0, 51.0],
  [14.8, 51.6], [14.6, 52.6], [14.15, 52.95], [14.4, 53.3],
];

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
