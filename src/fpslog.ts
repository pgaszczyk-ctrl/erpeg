import { rpc } from './api';
import { session } from './quests';
import { note } from './log';
import { OSTROSC, NA_BATERII } from './screen';
import { WERSJA, WERSJA_TEST, TEST, BUILD } from './version';
import { loadingGame } from './ui/loadingMap';

// Slow-frame log (owner, 27 Oct 2026: „gra zaczęła żabkować – licz fps i wysyłaj log poniżej 40”).
// Counts real frames with requestAnimationFrame while the hero is actually playing (game scene
// running, not paused by a dialog, loop awake, page visible, loading cover gone). Every FPS.oknoS
// seconds it checks the window: average under FPS.prog, or many long frames (stutter with a fine
// average), sends one report `fps` to client_errors (admin tab „🐞 Błędy”) with what may cost:
// update+render time of the CPU, objects on screen, chunk painting times, picture size, memory.

export const FPS = {
  /** Below this average (frames a second) the window is reported. */
  prog: 40,
  /** A frame longer than this (ms) is a hitch… */
  dlugaMs: 100,
  /** …and this many of them in one window are reported too. */
  dlugichIle: 4,
  /** Length of one measured window (s of real play). */
  oknoS: 10,
  /** No report in the first seconds of play (map still filling in). */
  rozgrzewkaS: 20,
  /** At least this long between two reports (s). */
  przerwaS: 300,
  /** At most this many reports per page load. */
  maks: 4,
};

let wyslane = 0;
let ostatnio = 0;

type Gra = Phaser.Game & { scene: Phaser.Scenes.SceneManager };

export function installFpsLog(game: Gra) {
  // Tests shorten the windows (scripts/tests/browser-fps.mjs).
  Object.assign(window, { __fps: FPS });
  let poprzednia = 0;
  // Frame deltas of the current window, and CPU ms (update + render) per step.
  const delty: number[] = [];
  const cpu: number[] = [];
  let grane = 0;
  let poczatekKroku = 0;
  let poczatekOkna = 0;

  const gra = () => {
    if (document.hidden || !game.loop.running || loadingGame()) return false;
    if (!game.scene.isActive('game')) return false;
    return !game.scene.isPaused('game');
  };

  game.events.on('prestep', () => (poczatekKroku = performance.now()));
  game.events.on('postrender', () => {
    if (poczatekKroku) cpu.push(performance.now() - poczatekKroku);
  });

  const reset = () => {
    delty.length = 0;
    cpu.length = 0;
    poczatekOkna = performance.now();
  };

  const klatka = (t: number) => {
    requestAnimationFrame(klatka);
    if (!gra()) {
      // Paused, hidden or loading: the next delta would be the whole pause – start over.
      poprzednia = 0;
      if (delty.length) reset();
      return;
    }
    if (poprzednia) {
      const d = t - poprzednia;
      // A gap over 1 s is a tab switch or a system pause, not the game being slow.
      if (d < 1000) {
        delty.push(d);
        grane += d;
      } else reset();
    }
    poprzednia = t;
    if (!poczatekOkna) poczatekOkna = t;
    if (t - poczatekOkna < FPS.oknoS * 1000) return;
    sprawdz();
    reset();
  };

  const sprawdz = () => {
    if (delty.length < 5 || grane < FPS.rozgrzewkaS * 1000) return;
    const czas = delty.reduce((a, b) => a + b, 0);
    const fps = (delty.length * 1000) / czas;
    const dlugie = delty.filter((d) => d > FPS.dlugaMs).length;
    if (fps >= FPS.prog && dlugie < FPS.dlugichIle) return;
    note(`fps ${fps.toFixed(1)}, długich klatek ${dlugie}`);
    const teraz = Date.now();
    if (wyslane >= FPS.maks || teraz - ostatnio < FPS.przerwaS * 1000) return;
    wyslane++;
    ostatnio = teraz;
    const posort = [...delty].sort((a, b) => a - b);
    const cpuSr = cpu.length ? cpu.reduce((a, b) => a + b, 0) / cpu.length : 0;
    const msg = fps < FPS.prog
      ? `Mało klatek: ${fps.toFixed(1)}/s przez ${FPS.oknoS} s`
      : `Przycięcia: ${dlugie} klatek > ${FPS.dlugaMs} ms w ${FPS.oknoS} s (średnio ${fps.toFixed(0)}/s)`;
    rpc('log_error', {
      p_player: session.name || null,
      p_kind: 'fps',
      p_message: msg,
      p_stack: null,
      p_ctx: kontekst(game, {
        fps: +fps.toFixed(1),
        klatek: delty.length,
        mediana_ms: Math.round(posort[posort.length >> 1]),
        najdluzsza_ms: Math.round(posort[posort.length - 1]),
        dlugie,
        cpu_sr_ms: +cpuSr.toFixed(1),
        cpu_max_ms: Math.round(Math.max(0, ...cpu)),
      }),
    }).catch(() => {});
  };

  document.addEventListener('visibilitychange', () => {
    poprzednia = 0;
    reset();
  });
  requestAnimationFrame(klatka);
}

/** What may make the game slow at this moment (kept well under the server's 4000-char limit). */
function kontekst(game: Gra, pomiar: Record<string, number>) {
  const s = game.scene.getScene('game') as unknown as {
    player?: { x: number; y: number };
    cameras?: { main: { zoom: number } };
    children?: { list: { visible?: boolean }[] };
  };
  const ui = game.scene.getScene('ui') as unknown as { children?: { list: unknown[] } } | undefined;
  const lista = s?.children?.list ?? [];
  const w = window as unknown as { __czasyKawalkow?: number[]; __czasyCalosci?: number[] };
  const pamiec = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const nav = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  let ustawienia: Record<string, string | null> = {};
  try {
    ustawienia = {
      live: localStorage.getItem('exp-live'),
      ludzik3d: localStorage.getItem('exp-ludzik3d'),
      zoom: localStorage.getItem('exp-przyblizenie'),
      gory: localStorage.getItem('exp-efekt-gor'),
    };
  } catch {
    /* private window */
  }
  return {
    ...pomiar,
    map: session.mapId,
    x: Math.round(s?.player?.x ?? 0),
    y: Math.round(s?.player?.y ?? 0),
    obiekty: lista.length,
    widoczne: lista.filter((o) => o.visible !== false).length,
    obiekty_ui: ui?.children?.list.length ?? 0,
    tekstury: game.textures.getTextureKeys().length,
    kawalki_ms: (w.__czasyKawalkow ?? []).slice(-6),
    kawalki_calosc_ms: (w.__czasyCalosci ?? []).slice(-6),
    ostrosc: OSTROSC,
    dpr: window.devicePixelRatio || 1,
    canvas: `${game.canvas.width}x${game.canvas.height}`,
    ekran: `${innerWidth}x${innerHeight}`,
    zoom: s?.cameras?.main.zoom ?? 0,
    bateria: NA_BATERII,
    pamiec_mb: pamiec ? Math.round(pamiec.usedJSHeapSize / 1048576) : null,
    ram_gb: nav.deviceMemory ?? null,
    rdzenie: nav.hardwareConcurrency ?? null,
    ustawienia,
    wersja: TEST ? `${WERSJA_TEST}-test ${BUILD}` : WERSJA,
    ua: navigator.userAgent.slice(0, 160),
  };
}
