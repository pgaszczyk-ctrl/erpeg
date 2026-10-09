import { punktNaMapieWczytywania } from '../content/mapaWczytywania';
import { tx } from '../i18n';
import { resetTouch, resetKeys } from '../controls';

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
let panOffset = 0.12;
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
function flightFrames(r: HTMLElement) {
  return [
    { offset: 0, transform: initialFrame(r), easing: 'linear' },
    { offset: overviewOffset, transform: initialFrame(r), easing: 'cubic-bezier(.4, 0, .2, 1)' },
    { offset: panOffset, transform: frame(r, point!, initialScale(r), portrait(r)), easing: 'cubic-bezier(.6, 0, .9, .4)' },
    { offset: 1, transform: frame(r, point!, finalScale(r)) },
  ];
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
    const from = portrait(r) ? EUROPE : { x: 0.5, y: 0.5 };
    const distance = Math.hypot((point.x - from.x) * 1280, (point.y - from.y) * 720);
    const panMs = Math.min(650, Math.max(250, distance * 1.6));
    const overviewMs = 1000, zoomMs = 10_000, zoomStart = overviewMs + panMs;
    const duration = zoomStart + zoomMs;
    overviewOffset = overviewMs / duration;
    panOffset = zoomStart / duration;
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
