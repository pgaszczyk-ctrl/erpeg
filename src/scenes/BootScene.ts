import Phaser from 'phaser';
import { createArt } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';
import { enterWorld, loadWorld, rememberMap } from '../travel';
import { ITEM_PICTURES } from '../ui/itemIcon';
import { demoFromLink, startDemo } from '../demo';
import { OSTROSC } from '../screen';
import { loadHdSprites, createHdSprites } from '../sprites';
import { MAMY } from '../content/swiat';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Item pictures (16×16 pixel art) for shop dialogs.
    for (const id of ITEM_PICTURES) this.load.image(`item-${id}`, `items/${id}.png`);
    loadHdSprites(this);
    // The artist's ground and roof textures (content/swiat.ts).
    for (const f of MAMY) this.load.image(`swiat-${f}`, `swiat/${f}.png`);
  }

  create() {
    createArt(this);
    createHeroAnims(this);
    createHdSprites(this);
    createSlimeAnims(this);

    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2, 'Wczytuję mapę Lublina…', { fontFamily: 'monospace', fontSize: `${18 * OSTROSC}px`, color: '#ffffff', align: 'center', wordWrap: { width: width - 40 * OSTROSC } })
      .setOrigin(0.5);
    Promise.all([CityMap.load('map/lublin.json'), loadWorld()])
      .then(([city]) => {
        rememberMap(city);
        this.registry.set('city', city);
        // A QR code's demo link: straight into the game, no menu, no character.
        const qr = demoFromLink();
        if (qr) {
          text.setText('Budzisz się…');
          return startDemo(this.game, qr);
        }
        text.setText('');
        return showMenu(city).then(() => enterWorld(this.game));
      })
      .catch((err: Error) => text.setText(`Nie udało się wczytać mapy.\n${err.message}\n\nOdśwież stronę.`));
  }
}
