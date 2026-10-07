/// <reference types="vite/client" />
// The game's version, shown in the menu. Production (exp-lore.app) is built
// from the commit named in PRODUKCJA (repo root); every release to production
// adds 0.001. The test server (exp-lore.app/test/) is built from the newest
// code with VITE_TEST=1 and says so on screen.

export const WERSJA = '1.014';

/** Built for the test server? */
export const TEST = import.meta.env.VITE_TEST === '1';

declare const __BUILD__: string;
/** Commit and build time (UTC), put in by vite.config.ts. */
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : '';

/** The test server runs what will become the next release: WERSJA + 0.001 (the number itself changes only on release). */
export const WERSJA_TEST = (Number(WERSJA) + 0.001).toFixed(3);

export const wersjaNapis = () => (TEST ? `🧪 SERWER TESTOWY · wersja ${WERSJA_TEST}-test (${BUILD})` : `wersja ${WERSJA}`);

/** The only characters that can play on the test server (names). */
export const TEST_POSTACIE = ['Arceus', 'Jam'];
