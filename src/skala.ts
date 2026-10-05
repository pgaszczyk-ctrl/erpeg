// Skala świata (wersja „B”, właściciel 5.10.2026): domy, drzewa i ulice 1,5 raza większe względem postaci.
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
    const zapisany = localStorage.getItem('exp-swiat');
    if (zapisany !== null) return zapisany === '15' ? 1.5 : 1;
    // Domyślnie: na serwerze testowym razem z nowym wyglądem (overhaul 09).
    const wyglad = new URLSearchParams(location.search).get('wyglad') ?? localStorage.getItem('exp-wyglad');
    const test = import.meta.env.VITE_TEST === '1';
    return test && wyglad !== '0' ? 1.5 : 1;
  } catch {
    return 1;
  }
})();
