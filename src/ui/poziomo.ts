// Phones play landscape, held like a game pad (owner, 26 Oct 2026; new-controls test, walka/live.ts). While a touch
// phone stands upright the game is shown turned on its side (obrot.ts; owner, 27 Oct 2026: no „turn your phone”
// card – the player sees the sideways game and turns the phone). On the first touch the game asks for full screen
// and locks landscape where the browser allows it (Android Chrome).
import type Phaser from 'phaser';
import { resetTouch, resetKeys } from '../controls';
import { ustawObrot, ekranPionowo, jestObrocone } from '../obrot';

let gra: Phaser.Game | null = null;
let zablokowano = false;
let sluchacze = false;

const telefon = () => window.matchMedia('(pointer: coarse)').matches;

function sprawdz() {
  if (!gra) return;
  const obroc = telefon() && ekranPionowo();
  if (obroc === jestObrocone()) {
    if (obroc) ustawObrot(true); // keeps the turned size up to date
    return;
  }
  resetTouch();
  resetKeys();
  ustawObrot(obroc);
}

/** Full screen + landscape lock, from a user's touch (browsers allow it only then). */
async function zablokuj() {
  if (zablokowano || !telefon()) return;
  zablokowano = true;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* not allowed here (iPhone): the turned page shows the way */
  }
}

/**
 * Full screen at once on phones (owner, 26 Oct 2026: „od razu rób full screen”): browsers allow it only from a touch,
 * so the very first touch on the page – also on the start menu – asks for it. After the phone leaves full screen by
 * itself (the app was in the background), the next touch asks again; when the player closes it on purpose (the
 * browser's back gesture) we don't fight it until the page is hidden and shown again.
 */
export function pelnyEkranOdDotyku() {
  let prosic = true;
  const tap = () => {
    if (!prosic || !telefon() || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    prosic = false;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      if (gra) void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    }).catch(() => {});
  };
  window.addEventListener('touchend', tap, { passive: true, capture: true });
  window.addEventListener('pointerup', tap, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prosic = true; });
}

export function wymusPoziom(game: Phaser.Game) {
  gra = game;
  if (!sluchacze) {
    sluchacze = true;
    window.addEventListener('resize', sprawdz);
    window.addEventListener('orientationchange', () => setTimeout(sprawdz, 150));
    window.addEventListener('touchend', () => { if (gra) void zablokuj(); }, { passive: true });
  }
  sprawdz();
}

/** Leaving the game (menu): the page upright again. */
export function zwolnijPoziom() {
  gra = null;
  ustawObrot(false);
}
