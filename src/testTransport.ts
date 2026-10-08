import Phaser from 'phaser';
import { TEST } from './version';
import { SKALA_POSTACI } from './skala';
import { BOHATEROWIE } from './content/wyglad';
import { heroSkin } from './sprites';
import type { Player } from './objects/Player';

export type TestVehicle = 'pieszo' | 'rower' | 'hulajnoga';
export let testVehicle: TestVehicle = 'pieszo';
export const setTestVehicle = (vehicle: TestVehicle) => { testVehicle = TEST ? vehicle : 'pieszo'; };
export const vehicleSpeed = () => TEST && testVehicle !== 'pieszo' ? 1.4 : 1;

export function loadTestVehicles(scene: Phaser.Scene) {
  if (!TEST) return;
  for (const p of BOHATEROWIE) for (const vehicle of ['rower', 'hulajnoga']) {
    scene.load.image(`${p.id}-${vehicle}`, `postacie/${p.plik}_${vehicle}.png`);
  }
}

/** The existing player still moves and collides; only its drawing changes while riding. */
export class TestRide {
  private image?: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene) {}
  update(player: Player, postac: number | undefined, name: string) {
    if (!TEST) return;
    if (testVehicle === 'pieszo' || player.isDead) {
      this.image?.setVisible(false);
      player.setVisible(true);
      return;
    }
    const key = `${heroSkin(postac, name).id}-${testVehicle}`;
    if (!this.scene.textures.exists(key)) {
      this.image?.setVisible(false);
      player.setVisible(true);
      return;
    }
    const scale = 0.36 * SKALA_POSTACI;
    if (!this.image) this.image = this.scene.add.image(player.x, player.y, key);
    this.image.setTexture(key).setScale(scale).setOrigin(0.5, (88 - 8 * SKALA_POSTACI / scale) / 96);
    this.image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.image.setPosition(player.x, player.y).setDepth(player.depth).setAlpha(player.alpha).setVisible(true);
    if (player.facing.x) this.image.setFlipX(player.facing.x < 0);
    player.setVisible(false);
  }
}
