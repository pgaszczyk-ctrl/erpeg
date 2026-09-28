import type Phaser from 'phaser';
import { tx } from './i18n';

// Keeps a player from leaving the game by accident while exploring: closing
// the tab or the browser, refreshing (F5, Ctrl/Cmd+R) or pulling the page down
// on a phone (CSS overscroll-behavior in index.html stops the pull itself).
// Browsers show their own words for a closing tab (a page can't change them);
// the refresh keys get our own question.

const TEXT = () => tx('Jesteś w trakcie exp-lorowania. Na pewno chcesz wyłączyć?', 'Ooops, you are currently exp-loring. Are you sure you want to quit?');

/** A character is out in the world (not in the menu, not after "Wyjdź"). */
function exploring(game: Phaser.Game) {
  const s = game.scene.getScene('game') as (Phaser.Scene & { leaving?: boolean; player?: { isDead: boolean } }) | null;
  if (!s || !s.sys.settings.active && !game.scene.isPaused('game')) return false;
  // On a ride the game may be closed: the ride goes on.
  if (document.getElementById('journey')) return false;
  return !document.getElementById('menu') && !s.leaving && !!s.player && !s.player.isDead;
}

function ask(onQuit: () => void) {
  if (document.getElementById('quit-ask')) return;
  const box = document.createElement('div');
  box.id = 'quit-ask';
  box.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(10,8,14,.7);font-family:monospace;padding:16px;';
  box.innerHTML = `<div style="background:#1e1a24;border:3px solid #f7c531;border-radius:10px;padding:18px;max-width:420px;color:#fff;font-size:17px;text-align:center"><p style="margin:0 0 16px"></p><div style="display:flex;gap:10px;justify-content:center"><button data-a="stay" style="font:bold 16px monospace;padding:10px 16px;background:#3fa34d;color:#fff;border:2px solid #9be29b;border-radius:8px">${tx('Zostaję', 'Stay')}</button><button data-a="quit" style="font:16px monospace;padding:10px 16px;background:#4a4a55;color:#fff;border:2px solid #999;border-radius:8px">${tx('Wyłącz', 'Quit')}</button></div></div>`;
  box.querySelector('p')!.textContent = TEXT();
  box.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).dataset.a;
    if (!a) return;
    box.remove();
    if (a === 'quit') onQuit();
  });
  document.body.append(box);
}

export function installLeaveGuard(game: Phaser.Game) {
  let allow = false;
  window.addEventListener('beforeunload', (e) => {
    if (allow || !exploring(game)) return;
    e.preventDefault();
    e.returnValue = TEXT();
    return TEXT();
  });
  window.addEventListener('keydown', (e) => {
    const refresh = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'));
    if (!refresh || !exploring(game)) return;
    e.preventDefault();
    ask(() => {
      allow = true;
      location.reload();
    });
  }, true);
}
