// Ilustracja jest umowną mapą Ziemi. Punkty odniesienia wiążą rzeczywiste
// współrzędne z jej kontynentami; nie służy do wybierania miejsca w grze.
// x/y w źródłowym PNG 1731×909. GIF skaluje go do 1280×672, z pasem24px.
const PUNKTY = [
  [51.2465, 22.5684, 936, 280], // Lublin
  [51.5074, -0.1278, 768, 264], // Londyn
  [36.1699, -115.1398, 330, 333], // Las Vegas
  [40.7128, -74.006, 532, 327], // Nowy Jork
  [30.0444, 31.2357, 939, 394], // Kair
  [-33.9249, 18.4241, 880, 666], // Kapsztad
  [-22.9068, -43.1729, 631, 653], // Rio de Janeiro
  [-34.6037, -58.3816, 567, 704], // Buenos Aires
  [35.6762, 139.6503, 1510, 350], // Tokio
  [1.3521, 103.8198, 1317, 541], // Singapur
  [-33.8688, 151.2093, 1528, 727], // Sydney
] as const;

const bazowy = (lat: number, lon: number) => ({ x: 0.5 + lon / 360 * 0.9, y: 0.5 - lat / 180 * 0.9 });
const zakres = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Punkt na ilustracji, 0..1, z rzeczywistej lokalizacji wczytanej postaci. */
export function punktNaMapieWczytywania(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { x: 0.5, y: 0.5 };
  lat = zakres(lat, -90, 90);
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  const b = bazowy(lat, lon);
  let suma = 0, dx = 0, dy = 0;
  for (const [a, o, x, y] of PUNKTY) {
    const odLon = Math.min(Math.abs(lon - o), 360 - Math.abs(lon - o)) * Math.cos((lat + a) / 2 * Math.PI / 180);
    const d2 = (lat - a) ** 2 + odLon ** 2;
    const w = 1 / (0.0001 + d2) ** 2;
    const p = bazowy(a, o);
    suma += w;
    dx += w * (x / 1731 - p.x);
    dy += w * (y / 909 - p.y);
  }
  return { x: zakres(b.x + dx / suma, 0.05, 0.95), y: (24 + zakres(b.y + dy / suma, 0.05, 0.95) * 672) / 720 };
}
