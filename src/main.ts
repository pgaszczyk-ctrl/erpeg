import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { installTouchControls } from './controls';
import { installErrorLog, watchGraphics } from './errlog';
import { session } from './quests';
import { codeLink } from './ui/codeCard';
import { catchGoogleReturn } from './google';
import { installLeaveGuard } from './guard';
import { TEST, WERSJA_TEST } from './version';
import { OSTROSC, cssSize, watchSpeed } from './screen';

// The Google sign-in window only stores the login and closes (no game there).
if (catchGoogleReturn()) throw new Error('google sign-in window');
installErrorLog();
// The test server says so all the time, so nobody mistakes it for the real game.
if (TEST) {
  const b = document.createElement('div');
  b.id = 'test-badge';
  b.textContent = `SERWER TESTOWY · ${WERSJA_TEST}-test`;
  document.body.append(b);
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b2a1b',
  pixelArt: true,
  // The canvas has OSTROSC pixels per CSS pixel (screen.ts); it is resized by hand below.
  scale: {
    mode: Phaser.Scale.NONE,
    width: cssSize(document.getElementById('game')!).w * OSTROSC,
    height: cssSize(document.getElementById('game')!).h * OSTROSC,
    zoom: 1 / OSTROSC,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Touch, keyboard and mouse clicks are handled natively in controls.ts (see there why).
  input: { touch: false, keyboard: false },
  // Phaser's own sound is not used (sfx.ts makes the few sounds); without it iPhones don't fail to start an audio device.
  audio: { noAudio: true },
  scene: [BootScene, GameScene, UIScene],
});

installTouchControls(document.getElementById('game')!);
// Follow the window (what Scale.RESIZE did), keeping OSTROSC canvas pixels per CSS pixel.
const fit = () => {
  const { w, h } = cssSize(document.getElementById('game')!);
  if (game.scale.width !== w * OSTROSC || game.scale.height !== h * OSTROSC) game.scale.resize(w * OSTROSC, h * OSTROSC);
};
window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
watchSpeed(() => game.loop.actualFps, () => game.scene.isActive('game'));
// A picture enlarged by an uneven amount (phone 3× over a 2× canvas) looks better smoothed than blocky.
if ((window.devicePixelRatio || 1) / OSTROSC !== Math.round((window.devicePixelRatio || 1) / OSTROSC)) game.canvas.style.imageRendering = 'auto';
installLeaveGuard(game);
// Reloading after lost graphics goes straight back into the game (the link loads the character).
watchGraphics(game.canvas, () => (session.name && session.idik ? codeLink(session.name, session.idik) : null));

// Handy for debugging from the browser console.
(window as unknown as { __game: Phaser.Game }).__game = game;
(window as unknown as { __session: typeof session }).__session = session;
