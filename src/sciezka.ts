/**
 * The game's own path (e.g. „/” or „/test/”). In the QR demo the address bar shows …/demo (index.html), but every
 * link the game builds (code link, Google return, reloads) must point to the game itself, not to the demo shortcut.
 */
export const sciezkaGry = () => location.pathname.replace(/demo\/?$/, '');
