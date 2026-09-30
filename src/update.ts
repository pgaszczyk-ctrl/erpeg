import type Phaser from 'phaser';
import { BUILD } from './version';
import { PX_PER_M } from './map/CityMap';
import { letGo } from './guard';

// A new version of the game went live while someone is playing: every
// NOWA_WERSJA_CO_MIN minutes the game reads `version.json` (written by
// vite.config.ts next to the page) and, if the build differs, shows a small bar
// "Jest nowa wersja". Its button saves the character where it stands, closes
// the session properly and reloads straight back into the game at that spot
// (one-off, `takeResume` in enterWorld) – refused while fighting.

export const NOWA_WERSJA_CO_MIN = 30;

const KEY = 'exp-wznow';

interface Resume { n: string; m: string; x: number; y: number; s: number; t: number }

/** The game scene's side of it (GameScene.reloadForUpdate). */
type Host = Phaser.Scene & { reloadForUpdate?: () => Promise<string | null> };

/** Remembers where to come back after the reload (this tab only, a few minutes). */
export function keepResume(name: string, m: string, x: number, y: number) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ n: name, m, x: Math.round(x), y: Math.round(y), s: PX_PER_M, t: Date.now() } satisfies Resume));
  } catch {
    // No storage: the game starts at the load point as usual.
  }
}

/** The spot to come back to after an update reload (once), or null. */
export function takeResume(name: string): { m: string; x: number; y: number } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Resume;
    if (r.n !== name || r.s !== PX_PER_M || Date.now() - r.t > 10 * 60_000) return null;
    return { m: r.m, x: r.x, y: r.y };
  } catch {
    return null;
  }
}

async function newestBuild(): Promise<string | null> {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { build?: string };
    return j.build ?? null;
  } catch {
    return null;
  }
}

let bar: HTMLDivElement | null = null;

function showBar(game: Phaser.Game) {
  if (bar) return;
  bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:60;max-width:calc(100% - 32px);box-sizing:border-box;background:#1e1a24;border:2px solid #f7c531;border-radius:10px;padding:10px 12px;color:#fff;font:15px monospace;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.5)';
  bar.innerHTML = '<span data-t>✨ Jest nowa wersja gry.</span><button data-a="go" style="font:bold 15px monospace;padding:7px 12px;background:#3fa34d;color:#fff;border:2px solid #9be29b;border-radius:8px">Odśwież</button><button data-a="later" style="font:15px monospace;padding:7px 12px;background:#4a4a55;color:#fff;border:2px solid #999;border-radius:8px">Później</button>';
  const text = bar.querySelector('[data-t]') as HTMLSpanElement;
  bar.addEventListener('click', async (e) => {
    const a = (e.target as HTMLElement).dataset.a;
    if (a === 'later') {
      bar?.remove();
      bar = null;
      return;
    }
    if (a !== 'go') return;
    const s = game.scene.getScene('game') as Host | null;
    const playing = !!s && (s.sys.settings.active || game.scene.isPaused('game')) && !document.getElementById('menu') && !document.getElementById('journey');
    if (playing && s?.reloadForUpdate) {
      text.textContent = 'Zapisuję…';
      const why = await s.reloadForUpdate();
      if (why) {
        text.textContent = why;
        return;
      }
    }
    letGo();
    location.reload();
  });
  document.body.append(bar);
}

/** Checks for a new version every NOWA_WERSJA_CO_MIN minutes (built game only). */
export function watchUpdates(game: Phaser.Game) {
  if (!BUILD) return;
  const check = async () => {
    const b = await newestBuild();
    if (b && b !== BUILD) showBar(game);
  };
  setInterval(check, NOWA_WERSJA_CO_MIN * 60_000);
  // For tests: `window.__checkUpdate()` checks at once.
  (window as unknown as { __checkUpdate: () => Promise<void> }).__checkUpdate = check;
}
