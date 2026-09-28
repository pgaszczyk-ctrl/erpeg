/// <reference types="vite/client" />
// The game's version, shown in the menu. Production (exp-lore.app) is built
// from the commit named in PRODUKCJA (repo root); every release to production
// adds 0.001. The test server (exp-lore.app/test/) is built from the newest
// code with VITE_TEST=1 and says so on screen.

export const WERSJA = '1.002';

/** Built for the test server? */
export const TEST = import.meta.env.VITE_TEST === '1';

export const wersjaNapis = () => (TEST ? `🧪 SERWER TESTOWY · po wersji ${WERSJA}` : `wersja ${WERSJA}`);

/** The only characters that can play on the test server (names). */
export const TEST_POSTACIE = ['Arceus', 'Jam'];
