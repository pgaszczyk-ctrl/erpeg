// On-screen touch controls, read by the player alongside the keyboard.
//
// Touches are handled with native DOM events instead of Phaser pointers:
// every touch event carries the full list of fingers on the screen, so the
// state is rebuilt from it each time and can never get stuck if a single
// touchend goes missing (system gestures, finger sliding off the screen...).
// Phaser's own touch input is disabled in main.ts.

export const JOY_RADIUS = 56;

export const touchInput = {
  x: 0, // -1..1
  y: 0, // -1..1
  attack: false, // set on press, cleared by the game once handled
  attackHeld: false,
  joyActive: false,
  joyOriginX: 0,
  joyOriginY: 0,
  joyX: 0,
  joyY: 0,
};

type TapListener = (x: number, y: number) => void;
const tapListeners = new Set<TapListener>();

/** Called with screen coordinates on every new finger; returns an unsubscribe function. */
export function onTap(fn: TapListener) {
  tapListeners.add(fn);
  return () => tapListeners.delete(fn);
}

let joyId: number | null = null;
let attackIds = new Set<number>();

export function resetTouch() {
  joyId = null;
  attackIds = new Set();
  touchInput.x = touchInput.y = 0;
  touchInput.attack = false;
  touchInput.attackHeld = false;
  touchInput.joyActive = false;
}

export function installTouchControls(el: HTMLElement) {
  const local = (t: Touch) => {
    const r = el.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const sync = (e: TouchEvent) => {
    const alive = new Set(Array.from(e.touches, (t) => t.identifier));
    if (joyId !== null && !alive.has(joyId)) {
      joyId = null;
      touchInput.x = touchInput.y = 0;
    }
    for (const id of attackIds) if (!alive.has(id)) attackIds.delete(id);
    touchInput.joyActive = joyId !== null;
    touchInput.attackHeld = attackIds.size > 0;
  };

  const start = (e: TouchEvent) => {
    e.preventDefault();
    sync(e);
    const half = el.getBoundingClientRect().width / 2;
    for (const t of Array.from(e.changedTouches)) {
      const p = local(t);
      tapListeners.forEach((fn) => fn(p.x, p.y));
      if (p.x >= half) {
        attackIds.add(t.identifier);
        touchInput.attack = true;
      } else if (joyId === null) {
        // The joystick appears where the thumb lands.
        joyId = t.identifier;
        touchInput.joyOriginX = touchInput.joyX = p.x;
        touchInput.joyOriginY = touchInput.joyY = p.y;
      }
    }
    sync(e);
  };

  const move = (e: TouchEvent) => {
    e.preventDefault();
    sync(e);
    for (const t of Array.from(e.touches)) {
      if (t.identifier !== joyId) continue;
      const p = local(t);
      let dx = p.x - touchInput.joyOriginX;
      let dy = p.y - touchInput.joyOriginY;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx = (dx / len) * JOY_RADIUS;
        dy = (dy / len) * JOY_RADIUS;
      }
      touchInput.joyX = touchInput.joyOriginX + dx;
      touchInput.joyY = touchInput.joyOriginY + dy;
      touchInput.x = dx / JOY_RADIUS;
      touchInput.y = dy / JOY_RADIUS;
    }
  };

  const end = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    sync(e);
  };

  const opts = { passive: false };
  el.addEventListener('touchstart', start, opts);
  el.addEventListener('touchmove', move, opts);
  // Fingers can be lifted outside the game element, so listen on window too.
  window.addEventListener('touchend', end, opts);
  window.addEventListener('touchcancel', end, opts);
  window.addEventListener('blur', resetTouch);
  document.addEventListener('visibilitychange', resetTouch);
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
