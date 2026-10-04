// In which country a place stands (two-letter ISO code), so school quizzes about one
// country's history or geography are asked only there (quizzes.country, admin tab 🧠 Quizy).
// Lublin and the town maps are always Poland; on world maps Poland is told by a rough
// outline, other countries by boxes (smaller ones first, so neighbours win over big ones).

/** Poland's outline (lon, lat), rough: a few km off at the border at most. */
const POLSKA: [number, number][] = [
  [14.2, 53.92], [15.0, 54.15], [16.0, 54.26], [16.9, 54.6], [17.9, 54.83], [18.4, 54.8], [18.85, 54.75], [19.6, 54.45],
  [22.8, 54.36], [23.5, 54.0], [23.9, 53.15], [23.6, 52.6], [23.2, 52.3], [23.6, 52.1], [23.5, 51.6], [23.7, 51.5],
  [24.1, 50.85], [24.0, 50.4], [23.5, 50.2], [22.6, 49.5], [22.9, 49.0], [22.55, 49.08], [21.6, 49.42], [20.9, 49.35],
  [20.0, 49.2], [19.4, 49.6], [18.85, 49.5], [18.6, 49.9], [17.9, 50.0], [17.6, 50.3], [16.9, 50.45], [16.6, 50.15],
  [16.2, 50.65], [15.0, 51.0], [14.8, 50.85], [14.95, 51.45], [14.6, 51.8], [14.75, 52.1], [14.55, 52.6], [14.1, 52.85],
  [14.4, 53.25],
];

/** Other countries: [code, south, north, west, east]. Checked in this order. */
const KRAJE: [string, number, number, number, number][] = [
  ['SI', 45.4, 46.9, 13.4, 16.6], ['LU', 49.4, 50.2, 5.7, 6.5], ['BE', 49.5, 51.5, 2.5, 6.4], ['NL', 50.75, 53.6, 3.3, 7.2],
  ['RU', 54.3, 55.3, 19.6, 22.9], ['CH', 45.8, 47.8, 5.95, 10.5], ['SK', 47.7, 49.6, 16.95, 22.6], ['AT', 46.4, 49.0, 9.5, 17.2], ['CZ', 48.55, 51.06, 12.1, 18.9],
  ['HU', 45.7, 48.6, 16.1, 22.9], ['LT', 53.9, 56.45, 21.0, 26.8], ['LV', 55.7, 58.1, 21.0, 28.2], ['EE', 57.5, 59.7, 21.8, 28.2],
  ['DK', 54.5, 57.8, 8.0, 12.7], ['IE', 51.4, 55.4, -10.5, -6.0], ['PT', 36.9, 42.2, -9.5, -6.2], ['HR', 42.4, 46.55, 13.5, 19.4],
  ['BY', 51.25, 56.2, 23.2, 32.8], ['MD', 45.5, 48.5, 26.6, 30.1], ['DE', 47.3, 55.1, 5.9, 15.0], ['GB', 49.9, 60.9, -8.2, 1.8],
  ['IT', 36.6, 47.1, 6.6, 18.5], ['FR', 42.3, 51.1, -4.8, 8.2], ['ES', 36.0, 43.8, -9.3, 3.3], ['RS', 42.2, 46.2, 18.8, 23.0],
  ['BG', 41.2, 44.2, 22.4, 28.6], ['RO', 43.6, 48.3, 20.2, 29.7], ['GR', 34.8, 41.8, 19.4, 28.3], ['UA', 44.4, 52.4, 22.1, 40.2],
  ['NO', 57.9, 71.2, 4.6, 31.1], ['SE', 55.3, 69.1, 11.1, 24.2], ['FI', 59.8, 70.1, 20.5, 31.6], ['TR', 35.8, 42.1, 26.0, 44.8],
  ['IL', 29.5, 33.3, 34.3, 35.9], ['EG', 22.0, 31.7, 24.7, 36.9], ['JP', 24.0, 45.6, 122.9, 146.0], ['KR', 33.1, 38.6, 124.6, 130.9],
  ['CN', 18.2, 53.6, 73.5, 134.8], ['IN', 6.7, 35.5, 68.1, 97.4], ['RU', 41.2, 81.9, 27.3, 180], ['MX', 14.5, 32.7, -118.4, -86.7],
  ['US', 24.5, 49.4, -125.0, -66.9], ['CA', 41.7, 83.1, -141.0, -52.6], ['BR', -33.8, 5.3, -74.0, -34.8], ['AR', -55.1, -21.8, -73.6, -53.6],
  ['AU', -43.7, -10.6, 113.2, 153.7],
];

function inside(lon: number, lat: number, ring: [number, number][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** The country code at a point, or null when unknown (then only general questions are asked). */
export function krajWPunkcie(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (inside(lon, lat, POLSKA)) return 'PL';
  for (const [k, s, n, w, e] of KRAJE) if (lat >= s && lat <= n && lon >= w && lon <= e) return k;
  return null;
}

/** The country of a map: Lublin and the station towns are Poland, a world map ('w:…') by its point. */
export function krajMapy(mapId: string, lat: number, lon: number) {
  return mapId.startsWith('w:') ? krajWPunkcie(lat, lon) : 'PL';
}
