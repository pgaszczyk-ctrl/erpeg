// Mozaiki w posadzce (wygląd 09): obrazek ułożony z kolorowej kostki na placu albo parkingu, obrócony wzdłuż placu.
// Właściciel 7.10.2026 (zgłoszenie 60): logo Targów Lublin zamiast parkingu przed halą A, bez napisu.
import { LOGO_TARGI } from './logoTargi';

export interface Mozaika {
  mapa: string;
  /** Środek obrazka. */
  lat: number;
  lon: number;
  /** Szerokość obrazka w metrach. */
  szerM: number;
  /** Obrót zgodnie z ruchem wskazówek zegara (stopnie), np. wzdłuż krawędzi placu. */
  katDeg: number;
  /** Wiersze pikseli: litera = kolor z KOLORY_MOZAIKI, '.' = puste. */
  obraz: string[];
  /** Bok kostki w metrach. */
  kostkaM: number;
}

/** Kolory kostki (RGB) dla liter obrazka. */
export const KOLORY_MOZAIKI: Record<string, [number, number, number]> = {
  g: [24, 122, 66], G: [40, 146, 82],
  r: [168, 38, 40], R: [192, 52, 48],
};

export const MOZAIKI: Mozaika[] = [
  // Parking przed halą A Targów Lublin (Dworcowa 11): środek parkingu, wzdłuż jego dłuższej krawędzi (ok. 37,6°).
  { mapa: 'lublin', lat: 51.23431, lon: 22.56649, szerM: 46, katDeg: 37.6, obraz: LOGO_TARGI, kostkaM: 0.9 },
];
