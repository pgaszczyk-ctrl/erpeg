// „Nowa walka” – the owner's test-server package of 26 Oct 2026 (brief docs/walka/LIVE.md):
//  1. the camera tilted towards isometric (lower, flatter: the map squashed vertically, people kept upright),
//  2. fixed controls: joystick bottom-left, attack / strong attack / heal bottom-right,
//  3. live fighting with stamina (sword), fatigue (bow) and mana (magic); new HUD top-left: life flask,
//     stamina bar, EXP thermometer; life over the hero's head,
//  5. the street gangs reduced to the weakest small groups in tiny red-mist areas,
//  6. safe zones: outside every red mist life and stamina come back,
//  7. the hero's spot saved at every save point (the next login starts there),
//  8. hunting grounds (łowiska) in open land away from buildings, epicentric layers (content/lowiska.ts),
//  9. talks, doors, rides and quest spots start only on a double tap.
// TEST build only, never in the QR demo (it has its own tutorial). `?live=0|1` switches it for comparison,
// remembered on the device (localStorage `exp-live`).
import { TEST } from '../version';
import { demo } from '../demo';

const wymuszone = (() => {
  try {
    const q = new URLSearchParams(location.search).get('live');
    if (q === '0' || q === '1') localStorage.setItem('exp-live', q);
    return localStorage.getItem('exp-live');
  } catch {
    return null;
  }
})();

/** The whole package (see above) is on. */
export function live() {
  if (demo.on) return false;
  if (wymuszone === '0') return false;
  if (wymuszone === '1') return true;
  return TEST;
}

/**
 * How much the map is squashed vertically (1 = straight from above). „Trochę w kierunku izometrii”: a camera a
 * bit lower and flatter. People, monsters and other sprites are stretched back by 1/SKROT when drawn, so they
 * still stand upright (main.ts `wyprostujSprite`). `?skrot=<0.6..1>` tries another value (not remembered).
 */
export const SKROT = (() => {
  try {
    const q = Number(new URLSearchParams(location.search).get('skrot'));
    if (q >= 0.5 && q <= 1) return q;
  } catch {
    /* no URL */
  }
  return 0.8;
})();

/** The vertical squash for the game camera now (1 when the package is off). */
export const skrotKamery = () => (live() ? SKROT : 1);
