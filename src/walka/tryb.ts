// Is the turn fight on? Test server only (owner, 17 Oct 2026), never in the QR demo.
// `?tury=0|1` switches it for comparison and is remembered on the device (localStorage `exp-tury`).
import { TEST } from '../version';
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

/** The same switch without the demo exception – the telescope HUD goes with it, also in the demo (owner, 18 Oct 2026). */
export function turyNaSerwerze() {
  if (wymuszone === '0') return false;
  if (wymuszone === '1') return true;
  return TEST;
}

/** The hero's height on the map (px): the unit of every distance in the turn fight. */
export const W = 56 * 0.36 * SKALA_POSTACI;
