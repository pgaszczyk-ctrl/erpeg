import type Phaser from 'phaser';
import { tx } from './i18n';

// The character's session ended on the server while the game was still open (owner, 14 Oct 2026: „jeśli sesja
// wygaśnie, wciąż pozwalasz grać”): the same character logged in in another tab or on another device, or logged
// out there – the server then has a new key and this tab's saves and heartbeats are refused. Playing on would be
// walking for nothing (nothing gets saved), and saving over the other session could undo its progress, so the
// game stops and offers to load the character again (a fresh login with the server's latest save).

let gra: Phaser.Game | null = null;
/** The link that loads the character again (main.ts; kept out of here so this file imports nothing of the game). */
let link: () => string | null = () => null;
/** Keys we closed ourselves (Wyjdź, reload for an update or broken graphics): their refusal is no surprise. */
const zamkniete = new Set<string>();

export function ustawGre(g: Phaser.Game, relogin: () => string | null) {
  gra = g;
  link = relogin;
}

export function zamykamSesje(token: string) {
  zamkniete.add(token);
}

/** Shows the blocking window (once) when the server refused `token`. */
export function sesjaWygasla(token: string) {
  if (zamkniete.has(token) || document.getElementById('sesja-wygasla')) return;
  window.dispatchEvent(new Event('exp-session-expired'));
  try {
    gra?.loop.sleep();
  } catch {
    // the window still blocks everything
  }
  const box = document.createElement('div');
  box.id = 'sesja-wygasla'; // the leave guard lets its reload through
  box.className = 'm-screen';
  box.style.zIndex = '95';
  box.innerHTML = `<div class="m-box"><h2></h2><p></p><button class="m-btn m-primary" type="button" data-a="znowu"></button><button class="m-btn" type="button" data-a="menu"></button></div>`;
  box.querySelector('h2')!.textContent = tx('Sesja wygasła', 'Session expired');
  box.querySelector('p')!.textContent = tx(
    'Ta postać została wczytana w innym miejscu (w innej karcie albo na innym urządzeniu) albo wylogowana. Tu gra nie może już niczego zapisać, więc zatrzymaliśmy ją. Wczytaj postać ponownie – wrócisz do ostatniego zapisu.',
    'This character was loaded somewhere else (another tab or device) or logged out. The game can no longer save anything here, so we stopped it. Load the character again – you will continue from the last save.',
  );
  const [znowu, menu] = box.querySelectorAll('button');
  znowu.textContent = tx('Wczytaj postać ponownie', 'Load the character again');
  menu.textContent = tx('Do menu', 'To the menu');
  znowu.onclick = () => {
    const l = link();
    if (l) location.hash = new URL(l).hash;
    location.reload();
  };
  menu.onclick = () => {
    location.hash = '';
    location.reload();
  };
  document.body.append(box);
}

/** A server answer that means the key is no longer valid (save_game raises this text). */
export const toWygasla = (e: unknown) => e instanceof Error && /Sesja wygas/i.test(e.message);
