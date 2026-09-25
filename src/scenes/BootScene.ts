import Phaser from 'phaser';
import { createArt } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    createArt(this);
    createHeroAnims(this);
    createSlimeAnims(this);

    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2, 'Wczytuję mapę Lublina…', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: width - 40 } })
      .setOrigin(0.5);
    CityMap.load('map/lublin.json')
      .then((city) => {
        this.registry.set('city', city);
        text.setText('');
        return showMenu(city).then(() => this.scene.start('game'));
      })
      .catch((err: Error) => text.setText(`Nie udało się wczytać mapy.\n${err.message}\n\nOdśwież stronę.`));
  }
}
