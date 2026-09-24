import Phaser from 'phaser';
import { createArt } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';

// Builds textures and animations once, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    createArt(this);
    createHeroAnims(this);
    createSlimeAnims(this);
    this.scene.start('game');
  }
}
