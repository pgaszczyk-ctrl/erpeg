// Skala świata (wersja „B”, właściciel 5.10.2026; wyłączona tego samego dnia, zostaje pod `?swiat=15`): domy, drzewa i ulice 1,5 raza większe względem postaci.
// Ludziki zostają tej samej wielkości na ekranie, a świat jest rysowany w większej skali (więcej pikseli na metr),
// więc przy tych samych 60 km/h tło przesuwa się 1,5 raza szybciej. Odległości w metrach się nie zmieniają.
// Bez importów: czyta to też split-map w Node (tam zawsze 1).

/** Ile razy większy świat: `?swiat=15` włącza, `?swiat=1` wyłącza (zapamiętane w telefonie, localStorage `exp-swiat`). */
export const SKALA_SWIATA = (() => {
  if (typeof location === 'undefined' || typeof localStorage === 'undefined') return 1;
  try {
    const q = new URLSearchParams(location.search).get('swiat');
    if (q === '15') localStorage.setItem('exp-swiat', '15');
    else if (q !== null) localStorage.setItem('exp-swiat', '1');
    // Domyślnie wyłączone (właściciel 5.10.2026: dorysowywanie mapy za wolne) – zamiast tego mniejsze postacie.
    return localStorage.getItem('exp-swiat') === '15' ? 1.5 : 1;
  } catch {
    return 1;
  }
})();

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
    return import.meta.env.VITE_TEST === '1' && wyglad !== '0' ? 2 / 3 : 1;
  } catch {
    return 1;
  }
})();
