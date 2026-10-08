import Phaser from 'phaser';
import { TEST } from './version';
import { SKALA_POSTACI } from './skala';
import { heroSkin } from './sprites';
import type { Player } from './objects/Player';
import { gear } from './inventory';
import { POJAZDY } from './content/sklepy';

export type TestVehicle = 'pieszo' | 'rower' | 'hulajnoga';
export let testVehicle: TestVehicle = 'pieszo';
export const hasTestVehicle = (vehicle: Exclude<TestVehicle, 'pieszo'>) => TEST && gear.bag.some(s =>
  'item' in s && s.item === (vehicle === 'rower' ? 'rower' : 'hulajnoga_parowa'));
export const setTestVehicle = (vehicle: TestVehicle) => {
  testVehicle = vehicle === 'pieszo' || hasTestVehicle(vehicle) ? vehicle : 'pieszo';
};
export const vehicleSpeed = () => {
  if (testVehicle !== 'pieszo' && !hasTestVehicle(testVehicle)) testVehicle = 'pieszo';
  return TEST && testVehicle !== 'pieszo' ? POJAZDY[testVehicle].szybkosc : 1;
};

// Keep unused riding art off the initial download/GPU budget (25 looks × 2 vehicles).
const loading = new WeakMap<Phaser.Game, Set<string>>();
function requestVehicle(scene: Phaser.Scene, postac: ReturnType<typeof heroSkin>, vehicle: 'rower' | 'hulajnoga') {
  const key = `${postac.id}-${vehicle}`;
  if (scene.textures.exists(key)) return;
  let pending = loading.get(scene.game);
  if (!pending) { pending = new Set(); loading.set(scene.game, pending); }
  if (pending.has(key)) return;
  pending.add(key);
  const img = new Image();
  img.onload = () => {
    if (!scene.game.isBooted) return;
    if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
  };
  // One attempt per game: a missing image must not issue a request on every frame.
  img.onerror = () => {};
  img.src = `${import.meta.env.BASE_URL}postacie/${postac.plik}_${vehicle}.png`;
}

/** The existing player still moves and collides; only its drawing changes while riding. */
export class TestRide {
  private image?: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene) {}
  update(player: Player, postac: number | undefined, name: string) {
    if (!TEST) return;
    const skin = heroSkin(postac, name);
    // Prefetch only the owned vehicles of the current look; changing look readies that pair too.
    for (const vehicle of ['rower', 'hulajnoga'] as const)
      if (hasTestVehicle(vehicle)) requestVehicle(this.scene, skin, vehicle);
    if (testVehicle !== 'pieszo' && !hasTestVehicle(testVehicle)) testVehicle = 'pieszo';
    if (testVehicle === 'pieszo' || player.isDead) {
      this.image?.setVisible(false);
      player.setVisible(true);
      return;
    }
    const key = `${skin.id}-${testVehicle}`;
    if (!this.scene.textures.exists(key)) {
      this.image?.setVisible(false);
      player.setVisible(true);
      return;
    }
    const scale = 0.36 * SKALA_POSTACI;
    if (!this.image) this.image = this.scene.add.image(player.x, player.y, key);
    this.image.setTexture(key);
    const resolution = this.image.frame.width / 96;
    this.image.setScale(scale / resolution).setOrigin(0.5, (88 - 8 * SKALA_POSTACI / scale) / 96);
    this.image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.image.setPosition(player.x, player.y).setDepth(player.depth).setAlpha(player.alpha).setVisible(true);
    if (player.facing.x) this.image.setFlipX(player.facing.x < 0);
    player.setVisible(false);
  }
}
