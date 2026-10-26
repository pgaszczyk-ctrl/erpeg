// Phones play landscape, held like a game pad (owner, 26 Oct 2026; new-controls test, walka/live.ts): while a
// touch phone stands upright the game sleeps under a „turn your phone” card (no free regeneration, no blows). On the
// first touch the game asks for full screen and locks landscape where the browser allows it (Android Chrome);
// iPhones can't lock, the card does the job there.
import type Phaser from 'phaser';
import { resetTouch, resetKeys } from '../controls';

const CSS = `
#obroc-telefon{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;
  background:repeating-linear-gradient(90deg,#2e2017 0 38px,#281b13 38px 40px);color:#f6e6c2;font:700 18px/1.35 'Alegreya Sans',system-ui,sans-serif;text-align:center}
#obroc-telefon.on{display:flex}
#obroc-telefon .tablica{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;max-width:330px;padding:26px 24px 22px;background:#241a12;
  box-shadow:0 -3px 0 #1e1a24,0 3px 0 #1e1a24,-3px 0 0 #1e1a24,3px 0 0 #1e1a24,inset 0 3px 0 #3d2b1b,inset 3px 0 0 #3d2b1b,inset 0 -3px 0 #120b06,inset -3px 0 0 #120b06,
    0 0 0 6px #c9953f,0 0 0 9px #1e1a24,10px 10px 0 9px rgba(0,0,0,.45)}
#obroc-telefon .nit{position:absolute;width:6px;height:6px;background:#f0cf86;box-shadow:0 0 0 2px #1e1a24,inset -2px -2px 0 #8a5f22}
#obroc-telefon .n1{left:8px;top:8px}#obroc-telefon .n2{right:8px;top:8px}#obroc-telefon .n3{left:8px;bottom:8px}#obroc-telefon .n4{right:8px;bottom:8px}
#obroc-telefon .tel{width:62px;height:104px;box-sizing:border-box;position:relative;background:#c9953f;border:3px solid #1e1a24;
  box-shadow:inset 0 3px 0 #f0cf86,inset 3px 0 0 #e0b45c,inset 0 -4px 0 #8a5f22,inset -3px 0 0 #8a5f22,5px 5px 0 rgba(0,0,0,.45);animation:obroc-kreci 2.4s steps(1,end) infinite}
#obroc-telefon .tel::before{content:'';position:absolute;left:7px;right:7px;top:9px;bottom:20px;background:#22382f;border:2px solid #1e1a24;
  box-shadow:inset 3px 3px 0 #4f7f72}
#obroc-telefon .tel::after{content:'';position:absolute;left:50%;bottom:6px;width:8px;height:8px;margin-left:-4px;background:#f0cf86;box-shadow:0 0 0 2px #1e1a24}
#obroc-telefon .tytul{font-size:22px;color:#f0c66a;text-shadow:2px 2px 0 #1e1a24;letter-spacing:.5px}
#obroc-telefon small{font-size:15px;color:#e3cfa3;font-weight:600}
@keyframes obroc-kreci{0%{transform:rotate(0)}30%{transform:rotate(-30deg)}40%{transform:rotate(-60deg)}50%,100%{transform:rotate(-90deg)}}
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
    el.innerHTML = '<div class="tablica"><i class="nit n1"></i><i class="nit n2"></i><i class="nit n3"></i><i class="nit n4"></i><div class="tel"></div><div class="tytul">Przekręć urządzenie na bok</div><small>Mapa rozkłada się szeroko, jak na stole kartografa. Lewy kciuk prowadzi bohatera, prawy dzierży oręż.</small></div>';
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
