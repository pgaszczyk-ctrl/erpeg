import type Phaser from 'phaser';
import { tx } from './i18n';
import { exploring } from './guard';
import { wstrzymajMuzyke } from './music';
import { resetTouch } from './controls';

// Back from another tab or app (owner, 2 Nov 2026: „po powrocie do zakładki muzyka ani gra nie ruszała,
// dopóki gracz nie potwierdzi”): while the page is hidden the game loop is put to sleep and the music held;
// on return a dimmed window asks „Gram dalej” / „Wyłącz grę”, and only „Gram dalej” wakes both.

/** Shorter trips away (a permission prompt, a flicker of the notification shade) don't ask. */
const POWROT_OD_MS = 1000;

type GraScena = Phaser.Scene & { inCombat?: () => boolean; leave?: () => Promise<void>; poPowrocie?: () => void };

export function pilnujPowrotu(game: Phaser.Game) {
  let ukrytoO = 0;
  /** The loop was running when the page hid (the Kufer/map screen keep it asleep on their own). */
  let obudzic = false;
  let czeka = false;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (czeka || !exploring(game)) return;
      ukrytoO = performance.now();
      obudzic = game.loop.running;
      if (obudzic) game.loop.sleep();
      wstrzymajMuzyke(true);
      czeka = true;
      return;
    }
    if (!czeka || document.getElementById('powrot')) return;
    if (performance.now() - ukrytoO < POWROT_OD_MS) { graj(); return; }
    pokaz();
  });

  function graj() {
    czeka = false;
    document.getElementById('powrot')?.remove();
    resetTouch();
    if (obudzic && !game.loop.running) game.loop.wake();
    (game.scene.getScene('game') as GraScena | null)?.poPowrocie?.();
    wstrzymajMuzyke(false);
  }

  function pokaz() {
    const box = document.createElement('div');
    box.id = 'powrot';
    box.className = 'm-screen';
    box.style.zIndex = '90';
    box.style.background = 'rgba(8,6,12,.72)';
    box.innerHTML = `<div class="m-box" style="max-width:360px;text-align:center"><h2></h2><p></p><p class="powrot-uwaga" style="color:#f0a0a0;display:none"></p><button class="m-btn m-primary" type="button" data-a="graj"></button><button class="m-btn" type="button" data-a="wyjdz"></button></div>`;
    box.querySelector('h2')!.textContent = tx('Gra wstrzymana', 'Game paused');
    box.querySelector('p')!.textContent = tx('Wróciłeś do gry. Grasz dalej?', 'Welcome back. Carry on playing?');
    const [graBtn, wyjdzBtn] = box.querySelectorAll('button');
    graBtn.textContent = tx('▶ Gram dalej', '▶ Keep playing');
    wyjdzBtn.textContent = tx('🚪 Wyłącz grę', '🚪 Quit the game');
    const uwaga = box.querySelector('.powrot-uwaga') as HTMLElement;
    graBtn.onclick = () => { zdejmij(); graj(); };
    wyjdzBtn.onclick = () => {
      const s = game.scene.getScene('game') as GraScena | null;
      if (s?.inCombat?.()) {
        uwaga.textContent = tx('Nie możesz wyjść w trakcie walki!', "You can't quit during a fight!");
        uwaga.style.display = '';
        return;
      }
      zdejmij();
      graj();
      void s?.leave?.();
    };
    // Keys go to the window only: Enter/Space/Escape = „Gram dalej”, nothing reaches the game meanwhile.
    const klawisz = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        zdejmij();
        graj();
      }
    };
    const zdejmij = () => {
      window.removeEventListener('keydown', klawisz, true);
      window.removeEventListener('keyup', klawisz, true);
    };
    window.addEventListener('keydown', klawisz, true);
    window.addEventListener('keyup', klawisz, true);
    document.body.append(box);
    graBtn.focus();
  }

  (window as unknown as { __powrot: { pokaz: () => void; czeka: () => boolean } }).__powrot = {
    pokaz: () => {
      ukrytoO = performance.now() - POWROT_OD_MS;
      obudzic = game.loop.running;
      if (obudzic) game.loop.sleep();
      wstrzymajMuzyke(true);
      czeka = true;
      pokaz();
    },
    czeka: () => czeka,
  };
}
