import { startSession, trescSerwera } from '../quests';
import Phaser from 'phaser';
import { createArt, useArtistArt, useCropIcons, CROP_ICONS } from '../art';
import { createHeroAnims } from '../objects/Player';
import { createSlimeAnims } from '../objects/Slime';
import { CityMap } from '../map/CityMap';
import { showMenu } from '../ui/menu';
import { enterWorld, getMap, loadWorld, rememberMap } from '../travel';
import { ITEM_PICTURES, ITEM_VARIANTS, phaserItemUrl } from '../ui/itemIcon';
import { WARZYWA_RYSUNKI, WYGLAD_09, przygotujRysunkiUpraw } from '../map/Podloze09';
import { demoFromLink, startDemo } from '../demo';
import { OSTROSC } from '../screen';
import { loadHdSprites, createHdSprites } from '../sprites';
import { MAMY, SLUPY_SZYLDOW } from '../content/swiat';
import { LADOWANIE, LADOWANIE_CO_MS } from '../content/ladowanie';
import { bootImageUrl, MINIATURY_ZIEMI } from '../bootImages';
import { beginMapIntro, showLoginMap, loadingMapError, demoMapAtOnce, demoIntro, revealLoadedGame } from '../ui/loadingMap';
import { dreamPlaces, dreamMap, wczytajTargi } from '../demo';
import { demoStartForm } from '../ui/demoStart';
import { PX_PER_M } from '../map/CityMap';
import type { GameScene } from './GameScene';
import { letGo } from '../guard';
import { offline } from '../api';
import { DEFAULT_LOOK } from '../look';
import { freshGear } from '../inventory';
import { makieta, PUNKT_MAKIETY, pokazPorownanie } from '../ui/makieta';
import { przedWejsciem } from '../ui/poziomo';

// Builds textures and animations, loads the map of Lublin, then starts the game.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  private worldReady!: Promise<CityMap>;
  private menuReady?: Promise<void>;
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
    void Promise.all([document.fonts?.load('19px "Alegreya Sans"'), document.fonts?.load('bold 19px "Alegreya Sans"')]).catch(() => {});
    this.worldReady = Promise.all([getMap('lublin'), loadWorld()]).then(([city]) => city);
    if (!qrDemo && !makieta) {
      // The form can open as soon as the map indices are ready, while artwork is still loading.
      this.menuReady = this.worldReady.then(city => showMenu(city));
      void this.menuReady.catch(() => {});
    }
    // The loading error is shown in create(); avoid an unhandled rejection during preload.
    void this.worldReady.catch(() => {});
    this.load.image('szlam-szczegolowy', 'proby31/szlam_wodny.png');
    // Item pictures (16×16 pixel art) for shop dialogs.
    for (const id of [...ITEM_PICTURES, ...ITEM_VARIANTS]) this.load.image(`item-${id}`, bootImageUrl(phaserItemUrl(id)));
    // A potion lying on the ground (loot pops out instead of going straight to the purse).
    this.load.image('item-mikstura', bootImageUrl(phaserItemUrl('mikstura')));
    // Gear lying on the ground: code-made pixel miniatures of the artist's pictures (world pixel density).
    for (const id of MINIATURY_ZIEMI) this.load.image(`ziemia-${id}`, bootImageUrl(`items/ziemia/${id}.png`));
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
          return this.playDemo(qr, city);
        }
        text.setText('');
        if (makieta) return this.playMakieta(city);
        return this.menuReady!.then(() => enterWorld(this.game));
      })
      .catch((err: Error) => {
        timer.remove();
        text.setText('');
        loadingMapError(err.message, () => { letGo(); location.reload(); });
      });
  }

  private async playMakieta(city: CityMap) {
    offline.demo = true;
    showLoginMap();
    przedWejsciem();
    beginMapIntro();
    const at = city.fromLatLon(PUNKT_MAKIETY.lat, PUNKT_MAKIETY.lon);
    await city.ensure(at.x, at.y, 250 * PX_PER_M);
    const start = city.reachableNear(at.x, at.y);
    const building = city.buildingAt(at.x - 43, at.y + 2);
    city.places.push({ id: 'makieta-sklep', kind: 'shop', name: 'Sklep pod Zamkiem',
      building: building ?? null, door: { x: at.x - 12, y: at.y - 5 } });
    startSession({ player: {
      name: 'Makieta', idik: '', start_place: 'Lublin', start_x: start.x, start_y: start.y,
      map_scale: PX_PER_M, exp: 0, dead: false, died_at: null, age: 12, immortal: true, konto: true,
      save: { story: { st: 'koniec', walked: 0 }, flagi: { samouczek: 1 },
        missions: { 'prolog.recruit.v1': 'done' }, equip: { ...freshGear().equip, bron: 'miecz_rekruta' },
        look: { ...DEFAULT_LOOK, guard3d: 'm', modul: { g: '16', c: '16', p: 'm', s: 0, w: 2, u: 2, u2: 1 } } },
    } }, false);
    await enterWorld(this.game);
    pokazPorownanie();
  }

  /** The QR demo: the logo opening over the world map runs while the dream's map is prepared, then the game shows. */
  private async playDemo(qr: NonNullable<ReturnType<typeof demoFromLink>>, city: CityMap) {
    const game = this.game;
    const scene = game.scene.getScene('game') as GameScene;
    let markReady: () => void = () => {};
    const ready = new Promise<void>((ok) => { markReady = ok; });
    const { start } = dreamPlaces();
    // The dream's map downloads while the player types the name (owner, 18 Oct 2026: the name comes first).
    if (dreamMap() === 'lublin') {
      const p = city.fromLatLon(start.lat, start.lon);
      void city.ensure(p.x, p.y, 600 * PX_PER_M).catch(() => {});
    }
    // Every demo ends in front of Targi Lublin: its map and pictures come in the background from the start.
    if (dreamMap() === 'lublin') void wczytajTargi();
    // The server's missions (Hela Trybik at Targi) start coming now, long before waking up.
    void trescSerwera().catch(() => {});
    const { r, look } = await demoStartForm(city);
    const intro = demoIntro(start.lat, start.lon, ready);
    const created = new Promise<void>((ok) => scene.events.once('create', ok));
    await startDemo(game, qr, r, look);
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
