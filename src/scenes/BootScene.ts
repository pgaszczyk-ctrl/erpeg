import Phaser from 'phaser';
import { createArt, useArtistArt, useCropIcons, CROP_ICONS } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';
import { enterWorld, loadWorld, rememberMap } from '../travel';
import { ITEM_PICTURES, ITEM_VARIANTS, itemAssetUrl } from '../ui/itemIcon';
import { WARZYWA_RYSUNKI, WYGLAD_09, przygotujRysunkiUpraw } from '../map/Podloze09';
import { demoFromLink, startDemo } from '../demo';
import { OSTROSC } from '../screen';
import { loadHdSprites, createHdSprites } from '../sprites';
import { MAMY, SLUPY_SZYLDOW } from '../content/swiat';
import { LADOWANIE, LADOWANIE_CO_MS } from '../content/ladowanie';
import { bootImageUrl } from '../bootImages';
import { loadingMapError, demoMapAtOnce, demoIntro, revealLoadedGame } from '../ui/loadingMap';
import { dreamPlaces } from '../demo';
import type { GameScene } from './GameScene';
import { letGo } from '../guard';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  private worldReady!: Promise<CityMap>;
  private loadingText!: Phaser.GameObjects.Text;

  preload() {
    const { width, height } = this.scale;
    this.loadingText = this.add
      .text(width / 2, height / 2, LADOWANIE[0], { fontFamily: 'monospace', fontSize: `${18 * OSTROSC}px`, color: '#ffffff', align: 'center', wordWrap: { width: width - 40 * OSTROSC } })
      .setOrigin(0.5);
    // The QR demo shows the world map at once, with no loading lines (owner, 11 Oct 2026).
    const qrDemo = !!demoFromLink();
    if (qrDemo) {
      this.loadingText.setText('');
      demoMapAtOnce();
    } else this.load.on('progress', (p: number) => this.loadingText.setText(`${LADOWANIE[0]}\n${Math.round(p * 100)}%`));
    // Fetch the map/font while Phaser downloads the artwork, not afterwards.
    const font = Promise.race([
      Promise.all([document.fonts?.load('19px "Alegreya Sans"'), document.fonts?.load('bold 19px "Alegreya Sans"')]).catch(() => null),
      new Promise((ok) => setTimeout(ok, 3000)),
    ]);
    this.worldReady = Promise.all([CityMap.load('map/lublin.json'), loadWorld(), font]).then(([city]) => city);
    // The loading error is shown in create(); avoid an unhandled rejection during preload.
    void this.worldReady.catch(() => {});
    this.load.image('szlam-szczegolowy', 'proby31/szlam_wodny.png');
    // Item pictures (16×16 pixel art) for shop dialogs.
    for (const id of [...ITEM_PICTURES, ...ITEM_VARIANTS]) this.load.image(`item-${id}`, bootImageUrl(itemAssetUrl(id)));
    // The glass sword shattering (ikony12 B animation): 4 frames of 64×64 side by side, played once.
    this.load.spritesheet('szklo-peka', bootImageUrl('items/szklany_miecz_peka.png'), { frameWidth: 64, frameHeight: 64 });
    loadHdSprites(this);
    // The artist's ground and roof textures (content/swiat.ts).
    for (const f of MAMY) this.load.image(`swiat-${f}`, bootImageUrl(`swiat/${f}.png`));
    // Vegetables from the fields: the artist's ripe plant as their icon (order 12).
    for (const v of CROP_ICONS) this.load.image(`uprawa-${v}`, bootImageUrl(`uprawy/uprawa_${v}_dojrzala_1.png`));
    // Ripe plants on the fields (overhaul 09), shown on their own so they stand out (GameScene ripeCrop).
    for (const v of WARZYWA_RYSUNKI) for (const n of [1, 2]) this.load.image(`upr09-${v}_dojrzala_${n}`, bootImageUrl(`uprawy/uprawa_${v}_dojrzala_${n}.png`));
    // Signs on posts (G14, overhaul 09): the artist's posts (2 frames: lamp off/on) and the boards of every kind of place.
    if (WYGLAD_09) {
      this.load.spritesheet('szyld-slup-tablica', bootImageUrl('swiat/szyldy/slup_tablica.png'), { frameWidth: 12, frameHeight: 40 });
      this.load.spritesheet('szyld-slup-ramie', bootImageUrl('swiat/szyldy/slup_ramie.png'), { frameWidth: 28, frameHeight: 40 });
      for (const t of new Set(Object.values(SLUPY_SZYLDOW.tablice))) this.load.image(`tablica-${t}`, bootImageUrl(`swiat/szyldy/tablica_${t}.png`));
      // The artist's sign light (order 36-G002): the cone and the shop board's three swing frames (front / middle / back).
      this.load.image('snop-szyldu', bootImageUrl('swiat/szyldy/snop.png'));
      this.load.spritesheet('tablica-sklep-bujanie', bootImageUrl('swiat/szyldy/tablica_sklep_bujanie.png'), { frameWidth: 32, frameHeight: 32 });
    }
  }

  create() {
    // Use a frame of the original PNG: no palette filter or destructive downscale.
    // The source has large transparent margins and faint isolated pixels outside the body.
    if (this.textures.exists('szlam-szczegolowy')) {
      this.textures.get('szlam-szczegolowy').add('body', 0, 370, 470, 514, 386);
    }
    createArt(this);
    useArtistArt(this);
    useCropIcons(this);
    createHeroAnims(this);
    createHdSprites(this);
    createSlimeAnims(this);
    // Decode the generator's tiny art and start its workers while the login form is visible.
    if (WYGLAD_09) void przygotujRysunkiUpraw();

    const qrDemo = !!demoFromLink();
    const text = this.loadingText.setText(qrDemo ? '' : LADOWANIE[0]);
    // Changing lines while loading (content/ladowanie.ts), in a shuffled order after the first.
    const lines = [LADOWANIE[0], ...LADOWANIE.slice(1).sort(() => Math.random() - 0.5)];
    let n = 0;
    const timer = this.time.addEvent({ delay: LADOWANIE_CO_MS, loop: true, callback: () => { if (!qrDemo) text.setText(lines[++n % lines.length]); } });
    this.worldReady
      .then((city) => {
        timer.remove();
        rememberMap(city);
        this.registry.set('city', city);
        // A QR code's demo link: straight into the game, no menu, no character.
        const qr = demoFromLink();
        if (qr) {
          text.setText('');
          return this.playDemo(qr);
        }
        text.setText('');
        return showMenu(city).then(() => enterWorld(this.game));
      })
      .catch((err: Error) => {
        timer.remove();
        text.setText('');
        loadingMapError(err.message, () => { letGo(); location.reload(); });
      });
  }

  /** The QR demo: the logo opening over the world map runs while the dream's map is prepared, then the game shows. */
  private async playDemo(qr: NonNullable<ReturnType<typeof demoFromLink>>) {
    const game = this.game;
    const scene = game.scene.getScene('game') as GameScene;
    let markReady: () => void = () => {};
    const ready = new Promise<void>((ok) => { markReady = ok; });
    const { start } = dreamPlaces();
    const intro = demoIntro(start.lat, start.lon, ready);
    const created = new Promise<void>((ok) => scene.events.once('create', ok));
    await startDemo(game, qr);
    await created;
    const deadline = performance.now() + 60_000;
    while (!scene.firstViewReady() && performance.now() < deadline) await new Promise((ok) => setTimeout(ok, 100));
    markReady();
    await intro;
    scene.scene.setVisible(true);
    scene.scene.setVisible(true, 'ui');
    await new Promise<void>((ok) => game.events.once('postrender', ok));
    await revealLoadedGame();
  }
}
