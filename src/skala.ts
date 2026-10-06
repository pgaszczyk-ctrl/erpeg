// Skala świata (wersja „B”, właściciel 5.10.2026; wyłączona tego samego dnia, zostaje pod `?swiat=15`): domy, drzewa i ulice 1,5 raza większe względem postaci.
// Ludziki zostają tej samej wielkości na ekranie, a świat jest rysowany w większej skali (więcej pikseli na metr),
// więc przy tych samych 60 km/h tło przesuwa się 1,5 raza szybciej. Odległości w metrach się nie zmieniają.
// SKALA_SWIATA jest w CityMap.ts (split-map uruchamia go w Node, tam zawsze 1).

// SKALA_SWIATA lives in CityMap.ts (Node runs CityMap for split-map and can't import this file without an extension).
export { SKALA_SWIATA } from './map/CityMap';

/**
 * Wielkość postaci (wersja „A”, właściciel 5.10.2026): ludziki 2/3 dotychczasowej wielkości, świat bez zmian,
 * więc domy i drzewa są względem nich większe. `?ludziki=67` włącza, `?ludziki=100` wyłącza (localStorage
 * `exp-ludziki`); domyślnie na serwerze testowym razem z nowym wyglądem (overhaul 09).
 */
export const SKALA_POSTACI = (() => {
  if (typeof location === 'undefined' || typeof localStorage === 'undefined') return 1;
  try {
    const q = new URLSearchParams(location.search).get('ludziki');
    if (q === '67') localStorage.setItem('exp-ludziki', '67');
    else if (q !== null) localStorage.setItem('exp-ludziki', '100');
    const zapisany = localStorage.getItem('exp-ludziki');
    if (zapisany !== null) return zapisany === '67' ? 2 / 3 : 1;
    const wyglad = new URLSearchParams(location.search).get('wyglad') ?? localStorage.getItem('exp-wyglad');
    // Since 1.010 the default everywhere (with the new look), as on the test server before.
    return wyglad !== '0' ? 2 / 3 : 1;
  } catch {
    return 1;
  }
})();
