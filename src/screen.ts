// How many canvas pixels per CSS pixel the game draws. 1 = like before (the
// browser enlarges the picture on phones); 2 = the phone's real pixels, so the
// detailed 64 px characters stay sharp. `?ostrosc=1|2` forces it (tests).
// Scenes lay out the HUD in CSS pixels: UIScene zooms its camera by OSTROSC,
// GameScene multiplies its zoom by it.

const forced = Number(new URLSearchParams(location.search).get('ostrosc'));
/** Remembered on a phone that was too slow at the sharper picture (see watchSpeed). A new key on 27 Oct 2026: the
 * game got much lighter, so phones that were switched to the plain picture before get measured once more. */
const SLOW_KEY = 'exp-ostrosc-2';
const slow = (() => {
  try {
    return localStorage.getItem(SLOW_KEY) === '1';
  } catch {
    return false;
  }
})();
/** A computer (mouse, no touch screen): its screen usually has 1–1.5 device px per CSS px. */
const komputer = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches;
/**
 * Computers draw at least 2 canvas px per CSS px (owner, 11 Oct 2026: on a computer the game looked
 * „poszarpana”): at 1 px the world's pixels landed on 2 or 3 screen px by turns; now every world pixel
 * is a whole number of canvas px and the browser shrinks the picture smoothly to the screen.
 */
/** A laptop running on battery (index.html asks the Battery API before the game loads; Chrome/Edge only). */
export const NA_BATERII = (globalThis as { __naBaterii?: boolean }).__naBaterii === true;
export const OSTROSC = forced >= 1 && forced <= 3 ? Math.floor(forced) : slow ? 1
  : komputer && !NA_BATERII ? Math.max(2, Math.min(3, Math.ceil(window.devicePixelRatio || 1)))
  : Math.max(1, Math.min(2, Math.floor(window.devicePixelRatio || 1)));

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
/** Third step (owner, 27 Oct 2026: „dodaj jeszcze jeden poziom zooma, 2x bliżej niż obecny default”). */
export const PRZYBLIZENIE_MOCNE = 2;
const ZOOM_KEY = 'exp-przyblizenie';
/** 0 = the usual picture, 1 = ~30 % closer, 2 = twice as close (remembered on this device). */
let zoomPoziom = (() => {
  try {
    const v = Number(localStorage.getItem(ZOOM_KEY));
    return v === 1 || v === 2 ? v : 0;
  } catch {
    return 0;
  }
})();
/** Is a bigger picture on (any step)? */
export const przyblizenie = () => zoomPoziom > 0;
export const poziomPrzyblizenia = () => zoomPoziom;
/** The game camera's zoom for the usual one `z` at the current step (whole canvas px per map px). */
export function zoomZPrzyblizeniem(z: number, krok = 1) {
  // `krok`: the zoom is kept a multiple of it – the 09 world is painted at 2 picture px per map px, and at an odd zoom
  // each of them fell on 1.5 or 2.5 screen px: the cobbles and roofs "crawled" and flickered while walking (owner,
  // 27 Oct 2026). Every step is at least one `krok` closer than the one before.
  const dol = (v: number) => Math.max(krok, Math.floor(v / krok) * krok);
  const gora = (v: number) => Math.max(krok, Math.ceil(v / krok) * krok);
  const z0 = dol(z);
  const z1 = Math.max(z0 + krok, gora(z0 * PRZYBLIZENIE));
  if (zoomPoziom === 1) return z1;
  if (zoomPoziom === 2) return Math.max(z1 + krok, gora(z0 * PRZYBLIZENIE_MOCNE));
  return z0;
}
/** The next step: 0 → 1 → 2 → 0. */
export function nastepnePrzyblizenie() {
  zoomPoziom = (zoomPoziom + 1) % 3;
  try {
    localStorage.setItem(ZOOM_KEY, String(zoomPoziom));
  } catch {
    /* no storage: only for this visit */
  }
  return zoomPoziom;
}
