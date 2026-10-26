// The game as an app (owner, 26 Oct 2026: „ikonka na pulpit telefonu lub komputera, z logo”): public/manifest.webmanifest
// makes the page installable (Android/Chrome/Edge: a real app icon that opens full screen without the browser's bars;
// iPhone: Safari's „Do ekranu początkowego”). The browser's own install offer is caught here, so the game menu can show
// „📲 Zainstaluj grę” at the right moment; where the browser has no such offer the menu explains the steps.

interface OfertaInstalacji extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let oferta: OfertaInstalacji | null = null;

/** Called first thing (main.ts): the browser fires its offer once, early. */
export function lapOferteInstalacji() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    oferta = e as OfertaInstalacji;
  });
  window.addEventListener('appinstalled', () => { oferta = null; });
}

/** Already running as the installed app (no browser bars). */
export function jakoAplikacja() {
  return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const iPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Install now (the browser's own window), or the words saying how to do it in this browser. */
export async function zainstaluj(): Promise<{ ok: boolean; jak?: string }> {
  if (oferta) {
    const o = oferta;
    oferta = null;
    await o.prompt();
    const { outcome } = await o.userChoice;
    return { ok: outcome === 'accepted' };
  }
  if (iPhone()) return { ok: false, jak: 'Na iPhonie: otwórz grę w Safari, dotknij „Udostępnij” (kwadrat ze strzałką) i wybierz „Do ekranu początkowego”. Ikona Exp-lore pojawi się obok innych aplikacji.' };
  if (matchMedia('(pointer: coarse)').matches) return { ok: false, jak: 'Otwórz menu przeglądarki (⋮ w rogu) i wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”. Ikona Exp-lore pojawi się na pulpicie telefonu.' };
  return { ok: false, jak: 'W Chrome lub Edge kliknij ikonkę instalacji na końcu paska adresu (monitor ze strzałką) albo w menu ⋮ wybierz „Zainstaluj Exp-lore”. Gra otworzy się w osobnym oknie, z ikoną na pulpicie.' };
}

const POKAZANE = 'exp-instalacja-proponowana';

/**
 * Worth offering the icon here, once per device (owner, 26 Oct 2026: „instalować przy zakładaniu konta”): not when it
 * already runs as the app; where the browser has its own one-tap install offer, or on a phone (steps from its menu).
 * A computer without the browser's offer is skipped – a list of menu steps there would only get in the way.
 */
export function proponowac(): boolean {
  if (jakoAplikacja()) return false;
  try { if (localStorage.getItem(POKAZANE)) return false; } catch { return false; }
  return !!oferta || iPhone() || matchMedia('(pointer: coarse)').matches;
}

export function zaproponowano() {
  try { localStorage.setItem(POKAZANE, String(Date.now())); } catch { /* no storage */ }
}
