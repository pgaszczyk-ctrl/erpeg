import Phaser from 'phaser';
import { createArt, useArtistArt, useCropIcons, CROP_ICONS } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';
import { enterWorld, loadWorld, rememberMap } from '../travel';
import { ITEM_PICTURES, ITEM_VARIANTS } from '../ui/itemIcon';
import { WARZYWA_RYSUNKI } from '../map/Podloze09';
import { demoFromLink, startDemo } from '../demo';
import { OSTROSC } from '../screen';
import { loadHdSprites, createHdSprites } from '../sprites';
import { MAMY } from '../content/swiat';
import { LADOWANIE, LADOWANIE_CO_MS } from '../content/ladowanie';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Item pictures (16×16 pixel art) for shop dialogs.
    for (const id of [...ITEM_PICTURES, ...ITEM_VARIANTS]) this.load.image(`item-${id}`, `items/${id}.png`);
    // The glass sword shattering (ikony12 B animation): 4 frames of 64×64 side by side, played once.
    this.load.spritesheet('szklo-peka', 'items/szklany_miecz_peka.png', { frameWidth: 64, frameHeight: 64 });
    loadHdSprites(this);
    // The artist's ground and roof textures (content/swiat.ts).
    for (const f of MAMY) this.load.image(`swiat-${f}`, `swiat/${f}.png`);
    // Vegetables from the fields: the artist's ripe plant as their icon (order 12).
    for (const v of CROP_ICONS) this.load.image(`uprawa-${v}`, `uprawy/uprawa_${v}_dojrzala_1.png`);
    // Ripe plants on the fields (overhaul 09), shown on their own so they stand out (GameScene ripeCrop).
    for (const v of WARZYWA_RYSUNKI) for (const n of [1, 2]) this.load.image(`upr09-${v}_dojrzala_${n}`, `uprawy/uprawa_${v}_dojrzala_${n}.png`);
  }

  create() {
    createArt(this);
    useArtistArt(this);
    useCropIcons(this);
    createHeroAnims(this);
    createHdSprites(this);
    createSlimeAnims(this);

    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2, LADOWANIE[0], { fontFamily: 'monospace', fontSize: `${18 * OSTROSC}px`, color: '#ffffff', align: 'center', wordWrap: { width: width - 40 * OSTROSC } })
      .setOrigin(0.5);
    // Changing lines while loading (content/ladowanie.ts), in a shuffled order after the first.
    const lines = [LADOWANIE[0], ...LADOWANIE.slice(1).sort(() => Math.random() - 0.5)];
    let n = 0;
    const timer = this.time.addEvent({ delay: LADOWANIE_CO_MS, loop: true, callback: () => text.setText(lines[++n % lines.length]) });
    Promise.all([CityMap.load('map/lublin.json'), loadWorld()])
      .then(([city]) => {
        timer.remove();
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
      .catch((err: Error) => (timer.remove(), text.setText(`Nie udało się wczytać mapy.\n${err.message}\n\nOdśwież stronę.`)));
  }
}
