import { punktNaMapieWczytywania } from '../content/mapaWczytywania';
import { tx } from '../i18n';
import { resetTouch, resetKeys } from '../controls';
import { pixelLogo } from './logo';

// Ekran pozostaje nad grą aż do narysowania pierwszego widoku. Oglądanie
// animacji i przygotowanie terenu biegną równolegle.
let fade: Promise<void> = Promise.resolve();
let flight: Animation | null = null;
let point: { x: number; y: number } | null = null;
let finished = false;
let menu: HTMLElement | null = null;
let video: HTMLVideoElement | null = null;
let poster: HTMLImageElement | null = null;
let resize: (() => void) | null = null;
let overviewOffset = 0.08;
const EUROPE = { x: 655 / 1280, y: 211 / 720 };

const root = () => document.getElementById('loading-map');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const asset = (file: string) => new URL(`loading36/${file}`, document.baseURI).href;

export function loadingMapVisible() {
  const r = root();
  return !!r && !r.hidden;
}

/** GameScene can prepare/draw the map, but cannot move or hurt the player yet. */
export function loadingGame() {
  const r = root();
  return !!r && !r.hidden && r.dataset.phase !== 'menu' && r.dataset.phase !== 'boot';
}

function stopMedia() {
  if (resize) window.removeEventListener('resize', resize);
  resize = null;
  flight?.cancel();
  flight = null;
  video?.pause();
  if (video) { video.removeAttribute('src'); video.load(); video.remove(); }
  video = null;
  poster?.remove();
  poster = null;
}

export function showLoginMap() {
  const r = root();
  if (!r) return;
  stopMedia();
  r.getAnimations().forEach((animation) => animation.cancel());
  menu?.remove();
  menu = null;
  point = null;
  finished = false;
  fade = Promise.resolve();
  r.hidden = false;
  r.setAttribute('aria-busy', 'true');
  r.style.opacity = '';
  r.dataset.phase = 'menu';
  r.querySelector('.lm-error')?.remove();
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  plate.style.transform = initialFrame(r);
  plate.style.opacity = '';
  resize = () => {
    if (flight) (flight.effect as KeyframeEffect).setKeyframes(flightFrames(r));
    else plate.style.transform = point ? frame(r, point, finalScale(r)) : initialFrame(r);
  };
  window.addEventListener('resize', resize);
  preparePoster(r);
}

function preparePoster(r: HTMLElement) {
  if (poster || !loadingMapVisible()) return;
  poster = new Image();
  poster.alt = '';
  poster.src = asset('map-poster.webp');
  r.querySelector('.lm-plate')!.append(poster);
}

function startMedia(r: HTMLElement) {
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  // Decode the still map while the player fills in the form. It also covers
  // the first video frame on slow connections and stays steady during zoom.
  preparePoster(r);
  if (reduced()) return;
  video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('error', () => preparePoster(r), { once: true });
  video.src = asset('map-animation.mp4');
  plate.append(video);
  void video.play().catch(() => preparePoster(r));
}

/** Called after successful login/creation, before the real map is loaded. */
export function beginMapIntro(login: HTMLElement) {
  const r = root();
  if (!r) { login.remove(); return; }
  finished = false;
  menu = login;
  login.inert = true;
  (document.activeElement as HTMLElement | null)?.blur();
  resetTouch();
  resetKeys();
  r.dataset.phase = 'fading';
  startMedia(r);
  const ms = reduced() ? 150 : 650;
  r.querySelector<HTMLElement>('.lm-plate')!.style.opacity = '1';
  fade = login.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished
    .catch(() => {})
    .then(() => { login.remove(); if (menu === login) menu = null; });
}

const portrait = (r: HTMLElement) => r.clientHeight > r.clientWidth;
const initialScale = (r: HTMLElement) => portrait(r)
  ? Math.max(r.clientWidth / 1280, r.clientHeight / 720) * 1.8
  : Math.min(r.clientWidth / 1280, r.clientHeight / 720);
const finalScale = (r: HTMLElement) => initialScale(r) * (portrait(r) ? 3.2 : 14);

/** Place a point on the actual image at the viewport's centre. */
function frame(r: HTMLElement, p: { x: number; y: number }, scale: number, crop = false) {
  let x = (0.5 - p.x) * 1280 * scale, y = (0.5 - p.y) * 720 * scale;
  if (crop) {
    // Keep the image covering portrait screens during the pan, even near its edges.
    const mx = Math.max(0, (1280 * scale - r.clientWidth) / 2);
    const my = Math.max(0, (720 * scale - r.clientHeight) / 2);
    x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
  }
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}
function initialFrame(r: HTMLElement) {
  return frame(r, portrait(r) ? EUROPE : { x: 0.5, y: 0.5 }, initialScale(r), portrait(r));
}
/**
 * One movement (owner, 11 Oct 2026: „nie centruj najpierw, tylko centruj zoomując”): after a short
 * look at the whole map the zoom starts from its middle and the destination glides to the centre while
 * the picture grows – no separate pan. Geometric zoom; the target's distance from the screen centre
 * shrinks as (1 − u)², so it moves steadily inwards and never swings out.
 */
function flightFrames(r: HTMLElement) {
  const from = portrait(r) ? EUROPE : { x: 0.5, y: 0.5 };
  const s0 = initialScale(r), s1 = finalScale(r), crop = portrait(r);
  const frames: Keyframe[] = [
    { offset: 0, transform: initialFrame(r), easing: 'linear' },
  ];
  const N = 40;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const u = t ** 1.7; // slow start, then faster – as the old zoom felt
    const scale = s0 * (s1 / s0) ** u;
    const f = 1 - (1 - u) ** 2 * (s0 / scale);
    const p = { x: from.x + (point!.x - from.x) * f, y: from.y + (point!.y - from.y) * f };
    frames.push({ offset: overviewOffset + (1 - overviewOffset) * t, transform: frame(r, p, scale, crop && k < N), easing: 'linear' });
  }
  return frames;
}

/** The destination is resolved by travel.ts from this character's real save. */
export async function flyToGameLocation(lat: number, lon: number, mapReady: Promise<void>) {
  const r = root();
  if (!r || r.hidden || !loadingGame()) return;
  point = punktNaMapieWczytywania(lat, lon);
  r.style.setProperty('--target-x', String(point.x));
  r.style.setProperty('--target-y', String(point.y));
  if (r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'pan';
  // The supplied movie runs at 9 fps. During movement use its still frame,
  // then resume the lamp animation if terrain preparation takes longer.
  video?.pause();
  await fade;
  if (r.hidden || finished || r.dataset.phase === 'error') return;
  if (!reduced()) {
    // A short look at the whole map, then one zoom that also brings the destination to the centre.
    const overviewMs = 700, zoomMs = 10_000, zoomStart = overviewMs;
    const duration = zoomStart + zoomMs;
    overviewOffset = overviewMs / duration;
    flight = r.querySelector<HTMLElement>('.lm-plate')!.animate(flightFrames(r), { duration, easing: 'linear', fill: 'forwards' });
    const current = flight, done = current.finished.catch(() => {});
    let terrainReady = false, finishing = false;
    void mapReady.then(() => { terrainReady = true; });
    const began = performance.now();
    while (flight === current && current.playState !== 'finished' && current.playState !== 'idle' && !finished && r.dataset.phase !== 'error') {
      const time = Number(current.currentTime ?? 0);
      if (time >= zoomStart && !finishing) {
        const progress = Math.max(0, Math.min(1, (time - zoomStart) / zoomMs));
        if (terrainReady) {
          // A gentle tail towards the destination once the actual first view is painted.
          const remaining = Math.max(1800, (1-progress)*3600, zoomStart+3600-(performance.now()-began));
          current.updatePlaybackRate((duration-time)/remaining);
          finishing = true;
        } else if (progress > 0.6) {
          // Keep approaching instead of parking at maximum zoom while workers are busy.
          current.updatePlaybackRate(Math.max(0.001, (1-progress)*0.8));
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    await done;
  } else {
    r.querySelector<HTMLElement>('.lm-plate')!.style.transform = frame(r, point, finalScale(r));
  }
  await fade;
  if (!r.hidden && !finished && r.dataset.phase === 'pan') {
    r.dataset.phase = 'waiting';
    void video?.play().catch(() => {});
  }
}

/**
 * QR demo (owner, 11 Oct 2026: no „Rozwijasz mapę…”/„Budzisz się…” texts and no green screen): the sharp world
 * map is shown at once, as the page starts. `demoIntro` then plays the opening over it.
 */
export function demoMapAtOnce() {
  const r = root();
  if (!r) return;
  stopMedia();
  finished = false;
  point = null;
  r.hidden = false;
  r.dataset.phase = 'demo';
  r.setAttribute('aria-busy', 'true');
  r.querySelector<HTMLElement>('.lm-lamp')?.style.setProperty('display', 'none');
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  plate.style.transform = initialFrame(r);
  plate.style.opacity = '1';
  resize = () => {
    if (flight) (flight.effect as KeyframeEffect).setKeyframes(flightFrames(r));
    else plate.style.transform = initialFrame(r);
  };
  window.addEventListener('resize', resize);
  preparePoster(r);
}

/**
 * The demo's opening: a moment of the world map, then it blurs and the game's logo fades in in the middle,
 * spins and vanishes, and a fast zoom flies to the dream's spot (Wawel). Resolves once the zoom is over and
 * the first view of the game is ready (`mapReady`).
 */
export async function demoIntro(lat: number, lon: number, mapReady: Promise<void>) {
  const r = root();
  if (!r || r.hidden || finished) return;
  point = punktNaMapieWczytywania(lat, lon);
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
  if (reduced()) {
    plate.style.transform = frame(r, point, finalScale(r));
    await mapReady;
    return;
  }
  await wait(1000);
  plate.style.transition = 'opacity .45s, filter .8s';
  plate.style.filter = 'blur(7px) brightness(.75)';
  const logo = pixelLogo(undefined, 8);
  logo.style.cssText = 'position:absolute;left:50%;top:46%;max-width:86vw;height:auto;image-rendering:pixelated;opacity:0;transform:translate(-50%,-50%);filter:drop-shadow(0 6px 0 #1e1a24);';
  r.append(logo);
  const centre = 'translate(-50%,-50%)';
  await logo.animate([{ opacity: 0, transform: `${centre} scale(.8)` }, { opacity: 1, transform: `${centre} scale(1)` }], { duration: 800, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
  await wait(800);
  await logo.animate([
    { opacity: 1, transform: `${centre} rotate(0deg) scale(1)` },
    { opacity: 1, transform: `${centre} rotate(200deg) scale(1.08)`, offset: 0.45 },
    { opacity: 0, transform: `${centre} rotate(720deg) scale(0)` },
  ], { duration: 1000, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  logo.remove();
  plate.style.filter = '';
  // A quick zoom straight onto the dream's spot.
  overviewOffset = 0;
  flight = plate.animate(flightFrames(r), { duration: 1700, easing: 'ease-in-out', fill: 'forwards' });
  await flight.finished.catch(() => {});
  await mapReady;
}

/** Reveal only after both the flight and actual terrain rendering are ready. */
export async function revealLoadedGame() {
  const r = root();
  if (!r || r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'revealing';
  resetTouch();
  await r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 100 : 250, fill: 'forwards' }).finished.catch(() => {});
  hideLoadingMap();
}

/** Demos skip character login; they already have their own awakening sequence. */
export function hideLoadingMap() {
  finished = true;
  const r = root();
  if (r) {
    r.hidden = true;
    r.dataset.phase = 'hidden';
    r.getAnimations().forEach((animation) => animation.cancel());
    r.style.opacity = '';
    r.setAttribute('aria-busy', 'false');
  }
  menu?.remove();
  menu = null;
  stopMedia();
  resetTouch();
  resetKeys();
}

/** Keep the illustration on a loading failure, with a working recovery action. */
export function loadingMapError(message: string, retry: () => void) {
  const r = root();
  if (!r) return;
  r.hidden = false;
  r.dataset.phase = 'error';
  // An inert login still covers pointer hits while fading; remove it on failure.
  menu?.getAnimations().forEach((animation) => animation.cancel());
  menu?.remove();
  menu = null;
  stopMedia();
  r.getAnimations().forEach((animation) => animation.cancel());
  r.style.opacity = '';
  r.querySelector<HTMLElement>('.lm-plate')!.style.opacity = '0';
  r.querySelector('.lm-error')?.remove();
  const box = document.createElement('div');
  box.className = 'lm-error';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = `${tx('Nie udało się przygotować mapy.', 'Could not prepare the map.')}\n${message}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = tx('Wczytaj ponownie', 'Reload');
  button.onclick = retry;
  box.append(text, button);
  r.append(box);
}
