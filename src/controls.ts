// On-screen touch controls, read by the player alongside the keyboard.
//
// Touches are handled with native DOM events instead of Phaser pointers:
// every touch event carries the full list of fingers on the screen, so the
// state is rebuilt from it each time and can never get stuck if a single
// touchend goes missing (system gestures, finger sliding off the screen...).
// Phaser's own touch input is disabled in main.ts.
//
// The keyboard is handled the same way for a similar reason: Phaser skips
// keyup events that another listener (e.g. a browser extension) already
// handled, or that share a timestamp with the previous one, which left keys
// "held" forever. Here any keyup releases the key, whatever happened to it.

export const JOY_RADIUS = 56;

export const touchInput = {
  x: 0, // -1..1
  y: 0, // -1..1
  attack: false, // set on press, cleared by the game once handled
  attackHeld: false,
  joyActive: false,
  used: false, // a real touch happened, so show the on-screen controls
  joyOriginX: 0,
  joyOriginY: 0,
  joyX: 0,
  joyY: 0,
};

// Called on every new finger, mouse click (with coordinates) or attack
// key (with -1, -1); used e.g. to leave the game-over screen.
type TapListener = (x: number, y: number) => void;
const tapListeners = new Set<TapListener>();

/** Subscribes to taps/clicks/attack keys; returns an unsubscribe function. */
export function onTap(fn: TapListener) {
  tapListeners.add(fn);
  return () => tapListeners.delete(fn);
}

let joyId: number | null = null;
let attackIds = new Set<number>();

const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const ATTACK_KEYS = new Set(['Space', 'KeyJ', 'Enter']);
const heldKeys = new Set<string>();

/** Keyboard direction from the held arrow/WASD keys, each axis -1..1. */
export function keyboardDir() {
  let x = 0;
  let y = 0;
  for (const code of heldKeys) {
    const d = KEY_DIRS[code];
    if (d) {
      x += d[0];
      y += d[1];
    }
  }
  return { x: Math.sign(x), y: Math.sign(y) };
}

/** True once per attack press (key, click or tap on the right side). */
export function consumeAttack() {
  const a = touchInput.attack;
  touchInput.attack = false;
  return a;
}

export function resetKeys() {
  heldKeys.clear();
}

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
    touchInput.used = true;
    sync(e);
    const half = el.getBoundingClientRect().width / 2;
    for (const t of Array.from(e.changedTouches)) {
      const p = local(t);
      tapListeners.forEach((fn) => fn(p.x, p.y));
      if (p.x >= half) {
        attackIds.add(t.identifier);
        touchInput.attack = true;
      } else if (joyId === null && p.y > 70) {
        // (the top band is the HUD: menu button, hearts)
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
    // Only swallow touches on the game itself, so taps on HTML menus still click.
    if (e.cancelable && el.contains(e.target as Node)) e.preventDefault();
    sync(e);
  };

  const opts = { passive: false };
  el.addEventListener('touchstart', start, opts);
  el.addEventListener('touchmove', move, opts);
  // Fingers can be lifted outside the game element, so listen on window too.
  window.addEventListener('touchend', end, opts);
  window.addEventListener('touchcancel', end, opts);
  const resetAll = () => {
    resetTouch();
    resetKeys();
  };
  window.addEventListener('blur', resetAll);
  document.addEventListener('visibilitychange', resetAll);

  // Capture phase on window so we see keys before anything else can
  // swallow them; defaultPrevented is deliberately ignored.
  // While an HTML screen (start menu) is open, keys belong to it.
  const menuOpen = () => !!document.getElementById('menu');
  window.addEventListener(
    'keydown',
    (e) => {
      if (menuOpen()) return;
      const code = e.code || e.key;
      if (KEY_DIRS[code]) {
        heldKeys.add(code);
        e.preventDefault();
      } else if (ATTACK_KEYS.has(code)) {
        if (!e.repeat) {
          touchInput.attack = true;
          tapListeners.forEach((fn) => fn(-1, -1));
        }
        e.preventDefault();
      }
    },
    true,
  );
  window.addEventListener(
    'keyup',
    (e) => {
      heldKeys.delete(e.code || e.key);
      // A released modifier or unknown key can hide other keyups on some
      // systems; with no direction keys reported down we start clean.
      if (e.key === 'Meta' || e.key === 'Alt' || e.key === 'Control') heldKeys.clear();
    },
    true,
  );

  // Mouse: a left click on the game swings the sword too.
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    touchInput.attack = true;
    tapListeners.forEach((fn) => fn(e.offsetX, e.offsetY));
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
