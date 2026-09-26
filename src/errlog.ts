import { rpc, RPC } from './api';
import { session } from './quests';

// Sends errors from players' devices to the server (table client_errors, seen
// in the admin panel under "Błędy"): uncaught errors, failed promises, and a
// frozen game. A worker keeps watch: when the page stops answering, or the
// game stops drawing frames, for 6 s while visible, the worker reports it.

const MAX_REPORTS = 20;
let sent = 0;
const seen = new Set<string>();

function context() {
  const g = (window as unknown as { __game?: Phaser.Game }).__game;
  const s = g?.scene.getScene('game') as unknown as { player?: { x: number; y: number }; scene?: { isActive(): boolean; isPaused(): boolean } } | undefined;
  return {
    map: session.mapId,
    x: Math.round(s?.player?.x ?? 0),
    y: Math.round(s?.player?.y ?? 0),
    frame: g?.loop.frame ?? 0,
    scenes: g ? g.scene.getScenes(true).map((x) => x.sys.settings.key).join(',') : '',
    screen: `${innerWidth}x${innerHeight}`,
    ua: navigator.userAgent.slice(0, 160),
    build: document.querySelector('script[type=module]')?.getAttribute('src')?.slice(-20) ?? '',
  };
}

export function report(kind: string, message: string, stack?: string) {
  const key = `${kind}:${message}`;
  if (seen.has(key) || sent >= MAX_REPORTS) return;
  seen.add(key);
  sent++;
  rpc('log_error', { p_player: session.name || null, p_kind: kind, p_message: message.slice(0, 500), p_stack: stack?.slice(0, 3000) ?? null, p_ctx: context() }).catch(() => {});
}

const WATCHDOG = `
let last = Date.now(), frame = -1, frameAt = Date.now(), hidden = false, ctx = null, cfg = null, sent = 0;
onmessage = (e) => {
  const d = e.data;
  if (d.cfg) cfg = d.cfg;
  // Coming back to the page (or into the game): start counting afresh.
  if (d.hidden !== undefined && d.hidden !== hidden) { hidden = d.hidden; last = frameAt = Date.now(); }
  if (d.ctx) {
    last = Date.now();
    ctx = d.ctx;
    if (d.ctx.frame !== frame) { frame = d.ctx.frame; frameAt = Date.now(); }
  }
};
const send = (msg) => {
  if (!cfg || sent >= 3) return;
  sent++;
  fetch(cfg.url + 'log_error', { method: 'POST', headers: cfg.headers, body: JSON.stringify({ p_player: ctx && ctx.player, p_kind: 'freeze', p_message: msg, p_stack: null, p_ctx: ctx }) }).catch(() => {});
};
let reported = false;
setInterval(() => {
  if (hidden) return;
  const now = Date.now();
  if (!reported && now - last > 6000) { reported = true; send('Strona nie odpowiada od ' + Math.round((now - last) / 1000) + ' s'); }
  else if (!reported && now - frameAt > 6000 && now - last < 3000) { reported = true; send('Gra przestała rysować klatki (strona działa)'); }
  if (now - last < 2000 && now - frameAt < 2000) reported = false;
}, 1000);
`;

export function installErrorLog() {
  addEventListener('error', (e) => report('error', e.message || String(e.error), e.error?.stack));
  addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    report('promise', String(r?.message ?? r), r?.stack);
  });
  try {
    const w = new Worker(URL.createObjectURL(new Blob([WATCHDOG], { type: 'text/javascript' })));
    w.postMessage({ cfg: { url: RPC.url, headers: RPC.headers } });
    setInterval(() => {
      // Only while playing (the start screen has no frames to watch).
      const c = context();
      if (!c.scenes.includes('game')) return w.postMessage({ hidden: true });
      w.postMessage({ hidden: document.hidden, ctx: { ...c, player: session.name } });
    }, 1000);
    document.addEventListener('visibilitychange', () => w.postMessage({ hidden: document.hidden }));
  } catch {
    // No workers: errors are still reported.
  }
}
