import Phaser from 'phaser';
import { createArt } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';
import { enterWorld, loadWorld, rememberMap } from '../travel';
import { ITEM_PICTURES } from '../ui/itemIcon';
import { LOOK_SHEETS, setLookSheets } from '../look';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Item pictures (16×16 pixel art) for shop dialogs.
    for (const id of ITEM_PICTURES) this.load.image(`item-${id}`, `items/${id}.png`);
    // Character parts (heads, bodies, legs; 24×30 frames), put together by look.ts.
    for (const n of LOOK_SHEETS) this.load.image(`look-${n}`, `postacie/${n}.png`);
  }

  create() {
    setLookSheets((n) => (this.textures.exists(`look-${n}`) ? (this.textures.get(`look-${n}`).getSourceImage() as HTMLImageElement) : undefined));
    createArt(this);
    createHeroAnims(this);
    createSlimeAnims(this);

    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2, 'Wczytuję mapę Lublina…', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: width - 40 } })
      .setOrigin(0.5);
    Promise.all([CityMap.load('map/lublin.json'), loadWorld()])
      .then(([city]) => {
        rememberMap(city);
        this.registry.set('city', city);
        text.setText('');
        return showMenu(city).then(() => enterWorld(this.game));
      })
      .catch((err: Error) => text.setText(`Nie udało się wczytać mapy.\n${err.message}\n\nOdśwież stronę.`));
  }
}
