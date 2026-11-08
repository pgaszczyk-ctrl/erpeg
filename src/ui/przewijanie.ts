/**
 * Scrolling a window by sliding a finger (owner, 8 Nov 2026, a player on an iPhone 11 Pro: „nie działa przewijanie
 * w menu postaci, dotknięty guzik od razu się klika; ma się przewijać po suwaniu; wyczuj, kiedy ktoś klika,
 * a kiedy przesuwa”). The page may be turned −90° (obrot.ts), where the phone's own swipe-scroll goes the wrong way
 * or not at all, so touch scrolling is done here: a finger that moves more than PROG px mostly along the scroll
 * axis scrolls (with a short glide after letting go) and the tap that would follow is swallowed; a finger that
 * stays put is a tap as usual. Mouse and pen keep the browser's own behaviour.
 */
import { naEkranie } from '../obrot';

const PROG = 9; // px a finger may wobble and still tap
const TARCIE = 0.94; // glide slowdown per frame

/** True while a finger is scrolling (slot dragging waits for this to stay false). */
let przewija = false;
export const palecPrzewija = () => przewija;
/** Asked before a finger starts scrolling: true = it holds a thing to drag (ui/slots.ts), don't scroll. */
let trzymaRzecz: () => boolean = () => false;
export function ustawTrzymanie(f: () => boolean) { trzymaRzecz = f; }

export function przewijanieDotykiem(el: HTMLElement): () => void {
  el.style.touchAction = 'none';
  el.style.overscrollBehavior = 'contain';
  let p: { id: number; x: number; y: number; top: number; ruch: boolean; t: number; v: number; ly: number } | null = null;
  let polykaj = 0;
  let szybowanie = 0;
  const stop = () => { if (szybowanie) cancelAnimationFrame(szybowanie); szybowanie = 0; };
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || p) return;
    const q = naEkranie(e.clientX, e.clientY);
    // A tap that stops a glide only stops it.
    if (szybowanie) polykaj = performance.now() + 500;
    stop();
    p = { id: e.pointerId, x: q.x, y: q.y, top: el.scrollTop, ruch: false, t: performance.now(), v: 0, ly: q.y };
  };
  const move = (e: PointerEvent) => {
    if (!p || e.pointerId !== p.id) return;
    const q = naEkranie(e.clientX, e.clientY);
    const dx = q.x - p.x, dy = q.y - p.y;
    if (!p.ruch) {
      if (Math.abs(dy) < PROG || Math.abs(dy) < Math.abs(dx)) return;
      if (el.scrollHeight <= el.clientHeight + 1 || trzymaRzecz()) return;
      p.ruch = true;
      przewija = true;
    }
    const now = performance.now();
    const dt = Math.max(1, now - p.t);
    p.v = 0.8 * ((p.ly - q.y) / dt) + 0.2 * p.v;
    p.t = now;
    p.ly = q.y;
    el.scrollTop = p.top - dy;
  };
  const up = (e: PointerEvent) => {
    if (!p || e.pointerId !== p.id) return;
    const d = p;
    p = null;
    if (!d.ruch) return;
    przewija = false;
    polykaj = performance.now() + 500;
    let v = performance.now() - d.t > 80 ? 0 : d.v * 16; // px per frame
    const krok = () => {
      v *= TARCIE;
      if (Math.abs(v) < 0.4) { szybowanie = 0; return; }
      el.scrollTop += v;
      szybowanie = requestAnimationFrame(krok);
    };
    if (Math.abs(v) > 1) szybowanie = requestAnimationFrame(krok);
  };
  const click = (e: MouseEvent) => {
    if (performance.now() < polykaj) {
      polykaj = 0;
      e.preventDefault();
      e.stopPropagation();
    }
  };
  el.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
  el.addEventListener('click', click, true);
  return () => {
    stop();
    przewija = false;
    el.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
    el.removeEventListener('click', click, true);
  };
}
