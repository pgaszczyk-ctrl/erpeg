// Phones play landscape, held like a game pad (owner, 26 Oct 2026; new-controls test, walka/live.ts): while a
// touch phone stands upright the game sleeps under a „turn your phone” card (no free regeneration, no blows). On the
// first touch the game asks for full screen and locks landscape where the browser allows it (Android Chrome);
// iPhones can't lock, the card does the job there.
import type Phaser from 'phaser';
import { resetTouch, resetKeys } from '../controls';

const CSS = `
#obroc-telefon{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;flex-direction:column;gap:18px;
  background:radial-gradient(circle at 50% 40%,#2e2622,#120e0c);color:#f6e6c2;font:600 18px/1.35 'Alegreya Sans',system-ui,sans-serif;text-align:center;padding:24px}
#obroc-telefon.on{display:flex}
#obroc-telefon .tel{width:70px;height:116px;border:4px solid #c9953f;border-radius:14px;position:relative;box-shadow:0 0 0 2px #2a1a0c,0 6px 18px rgba(0,0,0,.5);
  animation:obroc-kreci 2.2s ease-in-out infinite}
#obroc-telefon .tel::after{content:'';position:absolute;left:50%;bottom:6px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#c9953f}
#obroc-telefon small{font-size:14px;color:#cdb88c;max-width:280px}
@keyframes obroc-kreci{0%,25%{transform:rotate(0)}55%,100%{transform:rotate(-90deg)}}
@media (prefers-reduced-motion:reduce){#obroc-telefon .tel{animation:none;transform:rotate(-90deg)}}
`;

let el: HTMLDivElement | null = null;
let uspilem = false;
let gra: Phaser.Game | null = null;
let zablokowano = false;

const telefon = () => window.matchMedia('(pointer: coarse)').matches;
const pionowo = () => window.innerHeight > window.innerWidth;

function sprawdz() {
  if (!el || !gra) return;
  const trzymaj = telefon() && pionowo();
  el.classList.toggle('on', trzymaj);
  const loop = gra.loop;
  if (trzymaj && loop.running) {
    resetTouch();
    resetKeys();
    loop.sleep();
    uspilem = true;
  } else if (!trzymaj && uspilem) {
    uspilem = false;
    loop.wake();
  }
}

/** Full screen + landscape lock, from a user's touch (browsers allow it only then). */
async function zablokuj() {
  if (zablokowano || !telefon()) return;
  zablokowano = true;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* not allowed here (iPhone): the card stays the way */
  }
}

/**
 * Full screen at once on phones (owner, 26 Oct 2026: „od razu rób full screen”): browsers allow it only from a touch,
 * so the very first touch on the page – also on the start menu – asks for it. After the phone leaves full screen by
 * itself (the app was in the background), the next touch asks again; when the player closes it on purpose (the
 * browser's back gesture) we don't fight it until the page is hidden and shown again.
 */
export function pelnyEkranOdDotyku() {
  let prosic = true;
  const tap = () => {
    if (!prosic || !telefon() || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    prosic = false;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      if (gra) void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    }).catch(() => {});
  };
  window.addEventListener('touchend', tap, { passive: true, capture: true });
  window.addEventListener('pointerup', tap, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prosic = true; });
}

export function wymusPoziom(game: Phaser.Game) {
  gra = game;
  if (!el) {
    if (!document.getElementById('obroc-css')) {
      const s = document.createElement('style');
      s.id = 'obroc-css';
      s.textContent = CSS;
      document.head.append(s);
    }
    el = document.createElement('div');
    el.id = 'obroc-telefon';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Obróć telefon poziomo');
    el.innerHTML = '<div class="tel"></div><div>Obróć telefon poziomo</div><small>Trzymaj go oburącz jak pada do konsoli: lewy kciuk chodzi, prawy walczy.</small>';
    document.body.append(el);
    window.addEventListener('resize', sprawdz);
    window.addEventListener('orientationchange', () => setTimeout(sprawdz, 150));
    window.addEventListener('touchend', () => { if (gra) void zablokuj(); }, { passive: true });
    // A window closing (Kufer, map) wakes the loop by itself: check again now and then.
    setInterval(sprawdz, 1000);
  }
  sprawdz();
}

/** Leaving the game (menu): no card, and the loop back as it was. */
export function zwolnijPoziom() {
  if (uspilem) gra?.loop.wake();
  uspilem = false;
  gra = null;
  el?.classList.remove('on');
}
