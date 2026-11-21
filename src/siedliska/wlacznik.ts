// Włącznik siedlisk (content/siedliska.ts): razem z łowiskami (`lowiska()` = pakiet „nowa walka”).
// `?siedliska=0` wyłącza i zapamiętuje na urządzeniu (localStorage „exp-siedliska”) – mapa wraca wtedy
// do poprzedniego wyglądu (bez klepiska, palisad i kolizji), zapisy zostają nietknięte. `?siedliska=1` wymusza.
import { lowiska } from '../content/lowiska';

const wymuszone = (() => {
  try {
    const q = new URLSearchParams(location.search).get('siedliska');
    if (q === '0' || q === '1') localStorage.setItem('exp-siedliska', q);
    return localStorage.getItem('exp-siedliska');
  } catch {
    return null;
  }
})();

/** Czy siedliska są włączone w tej sesji. */
export function siedliska() {
  if (wymuszone === '0') return false;
  return wymuszone === '1' || lowiska();
}
