// Is the turn fight on? Every server since 1.032 (owner, 20 Oct 2026), never in the QR demo (its dragon: turyWDemo).
// `?tury=0|1` switches it for comparison and is remembered on the device (localStorage `exp-tury`).
import { demo } from '../demo';
import { SKALA_POSTACI } from '../skala';

const wymuszone = (() => {
  try {
    const q = new URLSearchParams(location.search).get('tury');
    if (q === '0' || q === '1') localStorage.setItem('exp-tury', q);
    return localStorage.getItem('exp-tury');
  } catch {
    return null;
  }
})();

export function tury() {
  if (demo.on) return false;
  return turyNaSerwerze();
}

/**
 * The QR demo's dragon fights in turns on every server (owner, 18 Oct 2026: „włącz wszystko na produkcję”);
 * `?tury=0` still brings back the live fight for comparison.
 */
export function turyWDemo() {
  return wymuszone !== '0';
}

/** The same switch without the demo exception – the telescope HUD goes with it, also in the demo (owner, 18 Oct 2026). */
export function turyNaSerwerze() {
  if (wymuszone === '0') return false;
  // Every server since 1.032 (owner, 20 Oct 2026: „wyrównaj wszystko do testu”).
  return true;
}

/** The hero's height on the map (px): the unit of every distance in the turn fight. */
export const W = 56 * 0.36 * SKALA_POSTACI;

const panelWymuszony = (() => {
  try {
    const q = new URLSearchParams(location.search).get('panel');
    if (q === 'stary' || q === 'nowy') localStorage.setItem('exp-panel-walki', q);
    return localStorage.getItem('exp-panel-walki');
  } catch {
    return null;
  }
})();

/**
 * The turn fight's controls (owner, 19 Oct 2026, test server): a tap on an enemy = approach and strike, a tap on
 * the ground = walk, a tap on the hero = a ring of the rarer actions; the turn shown in a bar at the top.
 * Production's QR demo uses it too since 1.031 (owner, 20 Oct 2026: „oba dema i na produkcję”).
 * `?panel=stary|nowy` switches it (remembered on the device).
 */
export function nowyPanel() {
  if (panelWymuszony === 'stary') return false;
  if (panelWymuszony === 'nowy') return true;
  return true;
}
