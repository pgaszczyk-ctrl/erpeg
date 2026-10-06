// How many canvas pixels per CSS pixel the game draws. 1 = like before (the
// browser enlarges the picture on phones); 2 = the phone's real pixels, so the
// detailed 64 px characters stay sharp. `?ostrosc=1|2` forces it (tests).
// Scenes lay out the HUD in CSS pixels: UIScene zooms its camera by OSTROSC,
// GameScene multiplies its zoom by it.

const forced = Number(new URLSearchParams(location.search).get('ostrosc'));
/** Remembered on a phone that was too slow at the sharper picture (see watchSpeed). */
const SLOW_KEY = 'exp-ostrosc';
const slow = (() => {
  try {
    return localStorage.getItem(SLOW_KEY) === '1';
  } catch {
    return false;
  }
})();
export const OSTROSC = forced >= 1 && forced <= 3 ? Math.floor(forced) : slow ? 1 : Math.max(1, Math.min(2, Math.floor(window.devicePixelRatio || 1)));

/** Below this many frames a second the sharper picture is too much for the phone. */
const MIN_FPS = 35;

/**
 * After 15 s of playing, measures the frame rate for 10 s; a phone that can't
 * keep up with the sharper picture gets the plain one from the next start.
 */
export function watchSpeed(fps: () => number, playing: () => boolean) {
  if (OSTROSC === 1 || forced) return;
  let played = 0;
  const samples: number[] = [];
  const t = setInterval(() => {
    if (document.hidden || !playing()) return;
    if (++played <= 15) return;
    samples.push(fps());
    if (samples.length < 10) return;
    clearInterval(t);
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (avg < MIN_FPS) {
      try {
        localStorage.setItem(SLOW_KEY, '1');
      } catch {
        /* private window: stays sharp */
      }
    }
  }, 1000);
}

/** Size of the game's box in CSS pixels. */
export function cssSize(el: HTMLElement) {
  return { w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight };
}

/** The bigger picture for children (owner, 6 Oct 2026: kids couldn't make out the details): ~30 % closer. */
export const PRZYBLIZENIE = 1.3;
const ZOOM_KEY = 'exp-przyblizenie';
let zoomOn = (() => {
  try {
    return localStorage.getItem(ZOOM_KEY) === '1';
  } catch {
    return false;
  }
})();
/** Is the bigger picture on (remembered on this device)? */
export const przyblizenie = () => zoomOn;
export function ustawPrzyblizenie(on: boolean) {
  zoomOn = on;
  try {
    localStorage.setItem(ZOOM_KEY, on ? '1' : '0');
  } catch {
    /* no storage: only for this visit */
  }
}
