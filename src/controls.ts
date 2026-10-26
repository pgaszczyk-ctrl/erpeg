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

import { live } from './walka/live';

export const JOY_RADIUS = 56;

/**
 * New controls of the test package (walka/live.ts): the joystick stands still bottom-left, the right side has
 * HTML buttons (ui/sterowanie.ts: attack, strong attack/skill, heal) and talks, doors, rides and quest spots
 * start on a DOUBLE tap/click (owner, 26 Oct 2026: a ride or a quest went off by accident). `E` interacts near
 * the hero, `Q` is the strong attack.
 */
let interakcja: { x: number; y: number } | null = null;
/** A double tap/click since the last call: where (CSS px on the game), or (-1, -1) = near the hero (E key). */
export function consumeInteraction() {
  const i = interakcja;
  interakcja = null;
  return i;
}
let strongRequest = false;
/** The strong attack / skill button or Q since the last call. */
export function consumeStrong() {
  const s = strongRequest;
  strongRequest = false;
  return s;
}
export function requestStrong() {
  strongRequest = true;
}
export function requestHeal() {
  healRequest = true;
}
/** The HTML attack button (ui/sterowanie.ts): pressed (a swing; holding aims a bow/wand) and let go. */
export function pressAttack() {
  // The attack stick decides on release (exp-lore): a quick tap attacks, a drag aims, a long hold is the strong blow.
  touchInput.attackHeld = true;
  startHold('touch', -9);
  holdOrigin.x = 0;
  holdOrigin.y = 0;
}
export function dragAttack(dx: number, dy: number) {
  if (!hold.active || hold.id !== -9) return;
  hold.dx = dx;
  hold.dy = dy;
  if (Math.hypot(dx, dy) > 14) hold.dragged = true;
}
export function releaseAttack() {
  touchInput.attackHeld = false;
  if (!hold.active || hold.id !== -9) return;
  if (!hold.dragged && performance.now() - hold.start < TAP_ATAK_MS) touchInput.attack = true;
  endHold();
}
/** Shorter than this (and no drag) on the attack stick is a plain tap = attack (the game's AIM_DELAY). */
const TAP_ATAK_MS = 250;
const DBL_MS = 380;
const DBL_PX = 36;
let lastTap: { x: number; y: number; t: number } | null = null;
/** A short tap (or click) at (x, y): a second one soon after near the first is an interaction. */
function tapped(x: number, y: number) {
  const now = performance.now();
  if (lastTap && now - lastTap.t < DBL_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DBL_PX) {
    interakcja = { x, y };
    lastTap = null;
    return;
  }
  lastTap = { x, y, t: now };
}
const tapStarts = new Map<number, { x: number; y: number; t: number }>();
/** Where the joystick is shown while idle (a hint; set by UIScene's layout). */
export const joyHome = { x: 0, y: 0 };
/** The attack button (set by UIScene's layout): only a touch on it attacks. */
export const attackHome = { x: 0, y: 0, r: 40 };
/** The heal button (drawn by UIScene when there is something to heal with). */
export const healHome = { x: 0, y: 0, r: 20, on: false };
let healRequest = false;
/** A tap/click on the heal button or the H key since the last call. */
export function consumeHeal() {
  const h = healRequest;
  healRequest = false;
  return h;
}
const onHeal = (x: number, y: number) => healHome.on && Math.hypot(x - healHome.x, y - healHome.y) < healHome.r * 1.3;
/** Last time the player steered (for the "use the joystick" hint). */
export const activity = { last: 0 };

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

/**
 * Press-and-hold for ranged attacks. A press already swings the weapon in
 * hand; holding it longer (or dragging the finger) aims, and letting go
 * shoots. `dx/dy` is the drag (touch), the mouse position is in `mouse`.
 */
export const hold = {
  active: false,
  start: 0,
  mode: 'touch' as 'touch' | 'mouse' | 'key',
  dx: 0,
  dy: 0,
  dragged: false,
  id: -1,
};
export const mouse = { x: 0, y: 0 };

/**
 * The turn fight (walka/TuryWalki.ts): while set, a short tap or click on the map is a pick (target or spot)
 * – no joystick, no swing. A drag doesn't count (it isn't a tap).
 */
export const mapaWalki: {
  fn: ((x: number, y: number) => void) | null;
  /** A drag on the map (from where it began to where the finger is; `koniec` on release). */
  drag: ((x0: number, y0: number, x: number, y: number, koniec: boolean) => void) | null;
} = { fn: null, drag: null };
const pickDragged = new Set<number>();
const pickStarts = new Map<number, { x: number; y: number; t: number }>();
const PICK_DRAG = 12;
const PICK_MS = 700;

/**
 * A dialog too tall for the screen (UIScene.showDialog): its brass rail can be dragged or tapped to scroll,
 * like the Kufer's own rail (ui/character.ts). Set only while such a dialog is open; a mouse wheel over the
 * game scrolls it too. Touches/clicks the rail swallows never reach the joystick or a dialog button.
 */
export const dialogRail: {
  hit: ((x: number, y: number) => boolean) | null;
  set: ((y: number) => void) | null;
  wheel: ((dy: number) => void) | null;
} = { hit: null, set: null, wheel: null };
let railTouchId: number | null = null;
let railMouseDown = false;
/** Set when a hold ends; the game reads and clears it. */
export let release: { mode: 'touch' | 'mouse' | 'key'; dx: number; dy: number; dragged: boolean; held: number } | null = null;

export function consumeRelease() {
  const r = release;
  release = null;
  return r;
}

function startHold(mode: 'touch' | 'mouse' | 'key', id = -1) {
  Object.assign(hold, { active: true, start: performance.now(), mode, dx: 0, dy: 0, dragged: false, id });
}

function endHold() {
  if (!hold.active) return;
  hold.active = false;
  release = { mode: hold.mode, dx: hold.dx, dy: hold.dy, dragged: hold.dragged, held: performance.now() - hold.start };
}

// Called on every new finger, mouse click (with coordinates) or attack
// key (with -1, -1); used e.g. to leave the game-over screen.
type TapListener = (x: number, y: number) => void;
const tapListeners = new Set<TapListener>();

/** Subscribes to taps/clicks/attack keys; returns an unsubscribe function. */
/** A key pressed while typing in a text field (bug report, codes…) is the player's text, never a game key (report 58). */
export function typingInField(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

/** The ☰ menu button's corner of the screen (CSS px; UIScene opens the menu on a tap there). */
export const onMenuButton = (x: number, y: number) => x >= 0 && x < 60 && y >= 0 && y < 60;

export function onTap(fn: TapListener) {
  tapListeners.add(fn);
  return () => tapListeners.delete(fn);
}

let joyId: number | null = null;
/** A short touch that barely moves the joystick counts as an attack. */
const JOY_TAP_MS = 260;
const JOY_TAP_DRAG = 10;
const joyTap = { start: 0, maxDrag: 0 };
const holdOrigin = { x: 0, y: 0 };
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
/** Where the mouse clicked for the pending swing (screen px), if it was a click. */
let pendingAim: { x: number; y: number } | null = null;
/** After consumeAttack: the click position of that swing, or null (keyboard, touch). */
export let attackAim: { x: number; y: number } | null = null;

export function consumeAttack() {
  const a = touchInput.attack;
  touchInput.attack = false;
  attackAim = a ? pendingAim : null;
  pendingAim = null;
  return a;
}

/**
 * A press that belonged to a dialog (choosing an answer) is not an attack: no swing, no hold, no strong blow
 * after the dialog closes (owner, 12 Oct 2026). The joystick, if any, stays.
 */
export function cancelPress() {
  hold.active = false;
  release = null;
  pendingAim = null;
  touchInput.attack = false;
}

export function resetKeys() {
  heldKeys.clear();
}

export function resetTouch() {
  tapStarts.clear();
  hold.active = false;
  release = null;
  joyId = null;
  attackIds = new Set();
  railTouchId = null;
  railMouseDown = false;
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

  /** The knob follows the thumb (up to the rim); further out = faster. */
  const steer = (p: { x: number; y: number }) => {
    let dx = p.x - touchInput.joyOriginX;
    let dy = p.y - touchInput.joyOriginY;
    const len = Math.hypot(dx, dy);
    joyTap.maxDrag = Math.max(joyTap.maxDrag, len);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    touchInput.joyX = touchInput.joyOriginX + dx;
    touchInput.joyY = touchInput.joyOriginY + dy;
    touchInput.x = dx / JOY_RADIUS;
    touchInput.y = dy / JOY_RADIUS;
    activity.last = performance.now();
  };

  const sync = (e: TouchEvent) => {
    const alive = new Set(Array.from(e.touches, (t) => t.identifier));
    if (railTouchId !== null && !alive.has(railTouchId)) railTouchId = null;
    if (joyId !== null && !alive.has(joyId)) {
      joyId = null;
      touchInput.x = touchInput.y = 0;
      // A quick tap on the joystick (no steering) is a sword swing: one-handed play.
      if (!live() && performance.now() - joyTap.start < JOY_TAP_MS && joyTap.maxDrag < JOY_TAP_DRAG) touchInput.attack = true;
    }
    for (const id of attackIds) if (!alive.has(id)) attackIds.delete(id);
    if (hold.active && hold.mode === 'touch' && !alive.has(hold.id)) endHold();
    touchInput.joyActive = joyId !== null;
    touchInput.attackHeld = attackIds.size > 0;
  };

  const start = (e: TouchEvent) => {
    e.preventDefault();
    touchInput.used = true;
    sync(e);
    for (const t of Array.from(e.changedTouches)) {
      const p = local(t);
      if (dialogRail.hit?.(p.x, p.y)) {
        railTouchId = t.identifier;
        dialogRail.set?.(p.y);
        continue;
      }
      if (mapaWalki.fn) {
        // Turn fight: remember the touch, it becomes a pick on release.
        if (!onMenuButton(p.x, p.y)) pickStarts.set(t.identifier, { x: p.x, y: p.y, t: performance.now() });
        tapListeners.forEach((fn) => fn(p.x, p.y));
        continue;
      }
      if (live()) {
        // Fixed joystick bottom-left: a thumb anywhere near it steers from its centre.
        if (joyId === null && p.y > 70 && Math.hypot(p.x - joyHome.x, p.y - joyHome.y) < JOY_RADIUS * 2.4) {
          joyId = t.identifier;
          touchInput.joyOriginX = joyHome.x;
          touchInput.joyOriginY = joyHome.y;
          joyTap.start = performance.now();
          joyTap.maxDrag = 0;
          steer(p);
        } else if (!onMenuButton(p.x, p.y)) tapStarts.set(t.identifier, { x: p.x, y: p.y, t: performance.now() });
        tapListeners.forEach((fn) => fn(p.x, p.y));
        continue;
      }
      if (onHeal(p.x, p.y)) {
        healRequest = true;
      } else if (joyId !== null && p.y > 70) {
        // No attack button any more (owner): a second finger anywhere is the old button –
        // a tap swings, holding it aims and shoots (bow, magic).
        attackIds.add(t.identifier);
        touchInput.attack = true;
        if (!hold.active) {
          startHold('touch', t.identifier);
          holdOrigin.x = p.x;
          holdOrigin.y = p.y;
        }
      } else if (joyId === null && p.y > 70) {
        // (the top band is the HUD: menu button, hearts, map)
        // The joystick appears wherever the thumb lands, and goes when it lifts.
        joyId = t.identifier;
        touchInput.joyOriginX = p.x;
        touchInput.joyOriginY = p.y;
        joyTap.start = performance.now();
        joyTap.maxDrag = 0;
        steer(p);
      }
      // After the attack flag is set, so a HUD button can cancel the swing.
      tapListeners.forEach((fn) => fn(p.x, p.y));
    }
    sync(e);
  };

  const move = (e: TouchEvent) => {
    e.preventDefault();
    sync(e);
    // Turn fight: dragging (the hero onto a spot) previews a move.
    for (const t of Array.from(e.changedTouches)) {
      const s = pickStarts.get(t.identifier);
      if (!s || !mapaWalki.drag) continue;
      const p = local(t);
      if (pickDragged.has(t.identifier) || Math.hypot(p.x - s.x, p.y - s.y) >= PICK_DRAG) {
        pickDragged.add(t.identifier);
        mapaWalki.drag(s.x, s.y, p.x, p.y, false);
      }
    }
    for (const t of Array.from(e.touches)) {
      if (t.identifier === railTouchId) {
        dialogRail.set?.(local(t).y);
        continue;
      }
      if (hold.active && hold.mode === 'touch' && t.identifier === hold.id) {
        const p = local(t);
        hold.dx = p.x - holdOrigin.x;
        hold.dy = p.y - holdOrigin.y;
        if (Math.hypot(hold.dx, hold.dy) > 14) hold.dragged = true;
      }
      if (t.identifier === joyId) steer(local(t));
    }
  };

  const end = (e: TouchEvent) => {
    // Only swallow touches on the game itself, so taps on HTML menus still click.
    if (e.cancelable && el.contains(e.target as Node)) e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const tap = tapStarts.get(t.identifier);
      if (tap) {
        tapStarts.delete(t.identifier);
        const p = local(t);
        if (e.type === 'touchend' && Math.hypot(p.x - tap.x, p.y - tap.y) < 14 && performance.now() - tap.t < 450) tapped(p.x, p.y);
      }
      const s = pickStarts.get(t.identifier);
      if (!s) continue;
      pickStarts.delete(t.identifier);
      const p = local(t);
      if (pickDragged.delete(t.identifier)) {
        if (e.type === 'touchend') mapaWalki.drag?.(s.x, s.y, p.x, p.y, true);
        continue;
      }
      if (e.type === 'touchend' && mapaWalki.fn && Math.hypot(p.x - s.x, p.y - s.y) < PICK_DRAG && performance.now() - s.t < PICK_MS) mapaWalki.fn(p.x, p.y);
    }
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
  const menuOpen = () => !!document.querySelector('#menu, .m-screen, #loading-map:not([hidden])');
  window.addEventListener(
    'keydown',
    (e) => {
      if (menuOpen() || typingInField(e)) return;
      const code = e.code || e.key;
      if (KEY_DIRS[code]) {
        heldKeys.add(code);
        activity.last = performance.now();
        e.preventDefault();
      } else if (code === 'KeyH') {
        if (!e.repeat) healRequest = true;
      } else if (live() && code === 'KeyE') {
        if (!e.repeat) interakcja = { x: -1, y: -1 };
      } else if (live() && code === 'KeyQ') {
        if (!e.repeat) strongRequest = true;
      } else if (ATTACK_KEYS.has(code)) {
        if (!e.repeat) {
          touchInput.attack = true;
          if (code === 'Space' || code === 'KeyJ') startHold('key');
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
      if (hold.active && hold.mode === 'key' && (e.code === 'Space' || e.code === 'KeyJ')) endHold();
      // A released modifier or unknown key can hide other keyups on some
      // systems; with no direction keys reported down we start clean.
      if (e.key === 'Meta' || e.key === 'Alt' || e.key === 'Control') heldKeys.clear();
    },
    true,
  );

  // Mouse: a left click on the game swings the sword too.
  el.addEventListener('mousemove', (e) => {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    if (railMouseDown) {
      dialogRail.set?.(e.offsetY);
      return;
    }
    const s = pickStarts.get(-2);
    if (s && mapaWalki.drag && (pickDragged.has(-2) || Math.hypot(e.offsetX - s.x, e.offsetY - s.y) >= PICK_DRAG)) {
      pickDragged.add(-2);
      mapaWalki.drag(s.x, s.y, e.offsetX, e.offsetY, false);
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) railMouseDown = false;
    if (e.button === 0 && hold.active && hold.mode === 'mouse') endHold();
    const s = pickStarts.get(-2);
    if (e.button === 0 && s) {
      pickStarts.delete(-2);
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (pickDragged.delete(-2)) mapaWalki.drag?.(s.x, s.y, x, y, true);
      else if (mapaWalki.fn && Math.hypot(x - s.x, y - s.y) < PICK_DRAG && performance.now() - s.t < PICK_MS) mapaWalki.fn(x, y);
    }
  });
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    if (dialogRail.hit?.(e.offsetX, e.offsetY)) {
      railMouseDown = true;
      dialogRail.set?.(e.offsetY);
      return;
    }
    if (mapaWalki.fn) {
      if (!onMenuButton(e.offsetX, e.offsetY)) pickStarts.set(-2, { x: e.offsetX, y: e.offsetY, t: performance.now() });
      tapListeners.forEach((fn) => fn(e.offsetX, e.offsetY));
      return;
    }
    if (onHeal(e.offsetX, e.offsetY)) {
      healRequest = true;
      return;
    }
    // New controls: a double click is an interaction (talk, door, ride, quest spot), the click itself still swings.
    if (live() && !onMenuButton(e.offsetX, e.offsetY)) tapped(e.offsetX, e.offsetY);
    // A click on the ☰ menu button only opens the menu: no swing, so no talk with someone standing near.
    if (!onMenuButton(e.offsetX, e.offsetY)) {
      startHold('mouse');
      touchInput.attack = true;
      pendingAim = { x: e.offsetX, y: e.offsetY }; // the swing goes towards the click
    }
    tapListeners.forEach((fn) => fn(e.offsetX, e.offsetY));
  });
  // A computer's wheel scrolls an open dialog too tall for the screen (no need to find its rail).
  el.addEventListener('wheel', (e) => {
    if (!dialogRail.wheel) return;
    e.preventDefault();
    dialogRail.wheel(e.deltaY);
  }, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
