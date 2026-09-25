import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { installTouchControls } from './controls';

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

// Handy for debugging from the browser console.
(window as unknown as { __game: Phaser.Game }).__game = game;
