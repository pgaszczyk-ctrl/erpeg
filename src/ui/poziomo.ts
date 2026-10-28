// Phones play landscape, held like a game pad (owner, 26 Oct 2026; new-controls test, walka/live.ts). While a touch
// phone stands upright the game is shown turned on its side (obrot.ts; owner, 27 Oct 2026: no „turn your phone”
// card – the player sees the sideways game and turns the phone). On the first touch the game asks for full screen
// and locks landscape where the browser allows it (Android Chrome).
import type Phaser from 'phaser';
import { resetTouch, resetKeys } from '../controls';
import { ustawObrot, ekranPionowo, jestObrocone } from '../obrot';
import { live } from '../walka/live';

let gra: Phaser.Game | null = null;
/** The login button was tapped: the page turns already under the loading cover (przedWejsciem). */
let wchodzi = false;
/** The full-screen request made by the first touch, so a lock in the same tap can wait for it. */
let wPelnym: Promise<void> | null = null;
/** A scene restart ends one game scene and starts the next one: the page stays turned in between. */
let zwolnij: ReturnType<typeof setTimeout> | null = null;
let zablokowano = false;
let sluchacze = false;

const telefon = () => window.matchMedia('(pointer: coarse)').matches;

function sprawdz() {
  if (!gra && !wchodzi) return;
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
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await (wPelnym ?? document.documentElement.requestFullscreen({ navigationUI: 'hide' }));
  } catch {
    /* no full screen here */
  }
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    // Not allowed here (iPhone; or no touch yet – a code link logs in by itself): the turned page shows the way,
    // and the next touch in the game asks again.
    zablokowano = false;
  }
}

function sluchaj() {
  if (sluchacze) return;
  sluchacze = true;
  window.addEventListener('resize', sprawdz);
  window.addEventListener('orientationchange', () => setTimeout(sprawdz, 150));
  window.addEventListener('touchend', () => { if (gra) void zablokuj(); }, { passive: true });
}

/**
 * Called from the tap on a login button (owner, 28 Oct 2026: the game started upright with the HUD in the wrong
 * place, then turned in the middle of play): full screen + landscape lock right in that tap, and the page turned
 * before the loading cover, so the game is laid out sideways from its first frame.
 */
export function przedWejsciem() {
  if (!telefon() || !live()) return;
  wchodzi = true;
  sluchaj();
  void zablokuj();
  sprawdz();
}

/** The login failed: the menu upright again. */
export function anulujWejscie() {
  if (!wchodzi) return;
  wchodzi = false;
  if (!gra) ustawObrot(false);
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
    wPelnym = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    wPelnym.then(() => {
      if (gra) void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    }).catch(() => {});
  };
  window.addEventListener('touchend', tap, { passive: true, capture: true });
  window.addEventListener('pointerup', tap, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prosic = true; });
}

export function wymusPoziom(game: Phaser.Game) {
  if (zwolnij) { clearTimeout(zwolnij); zwolnij = null; }
  gra = game;
  wchodzi = false;
  sluchaj();
  sprawdz();
}

/** Leaving the game (menu): the page upright again – a moment later, so a scene restart doesn't turn it back and forth. */
export function zwolnijPoziom() {
  gra = null;
  if (zwolnij) clearTimeout(zwolnij);
  zwolnij = setTimeout(() => { zwolnij = null; if (!gra && !wchodzi) ustawObrot(false); }, 400);
}
