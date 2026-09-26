import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { installTouchControls } from './controls';
import { installErrorLog, watchGraphics } from './errlog';
import { session } from './quests';
import { codeLink } from './ui/codeCard';
import { catchGoogleReturn } from './google';

// The Google sign-in window only stores the login and closes (no game there).
if (catchGoogleReturn()) throw new Error('google sign-in window');
installErrorLog();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b2a1b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Touch, keyboard and mouse clicks are handled natively in controls.ts (see there why).
  input: { touch: false, keyboard: false },
  scene: [BootScene, GameScene, UIScene],
});

installTouchControls(document.getElementById('game')!);
// Reloading after lost graphics goes straight back into the game (the link loads the character).
watchGraphics(game.canvas, () => (session.name && session.idik ? codeLink(session.name, session.idik) : null));

// Handy for debugging from the browser console.
(window as unknown as { __game: Phaser.Game }).__game = game;
