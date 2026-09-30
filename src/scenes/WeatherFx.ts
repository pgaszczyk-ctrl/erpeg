import Phaser from 'phaser';
import { EFEKTY_POGODY } from '../content/pogoda';
import { weather } from '../weather';

// What the weather looks like on screen (content/pogoda.ts EFEKTY_POGODY): rain streaks, snowflakes,
// a darker sky, a mist that thins out around the hero, lightning flashes in a storm. All drawn by code
// in the camera's view every frame (a few hundred short lines at most), above the map and the fog of war.

interface Drop { u: number; v: number; s: number }

export class WeatherFx {
  private g: Phaser.GameObjects.Graphics;
  private dark: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private mist: Phaser.GameObjects.Image;
  private drops: Drop[] = [];
  private flakes: Drop[] = [];
  private nextBolt = 0;

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(1_050_000);
    this.dark = scene.add.rectangle(0, 0, 10, 10, 0x0c1020, 0).setOrigin(0).setDepth(1_040_000);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xeef4ff, 0).setOrigin(0).setDepth(1_055_000);
    if (!scene.textures.exists('weather-mist')) {
      const S = 256;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d')!;
      const grd = x.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(225,230,236,0)');
      grd.addColorStop(0.55, 'rgba(225,230,236,0.55)');
      grd.addColorStop(1, 'rgba(225,230,236,1)');
      x.fillStyle = grd;
      x.fillRect(0, 0, S, S);
      scene.textures.addCanvas('weather-mist', c);
    }
    this.mist = scene.add.image(0, 0, 'weather-mist').setDepth(1_045_000).setAlpha(0).setVisible(false);
  }

  private fill(list: Drop[], n: number) {
    while (list.length < n) list.push({ u: Math.random(), v: Math.random(), s: 0.7 + Math.random() * 0.6 });
    if (list.length > n) list.length = n;
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, hero: { x: number; y: number }, now: number) {
    const E = EFEKTY_POGODY[weather.kind];
    const v = cam.worldView;
    const area = (v.width * v.height) / 10_000;
    this.g.clear();
    this.dark.setPosition(v.x - 20, v.y - 20).setSize(v.width + 40, v.height + 40).setFillStyle(0x0c1020, E.ciemniej ?? 0);
    this.flash.setPosition(v.x - 20, v.y - 20).setSize(v.width + 40, v.height + 40);
    // Rain: slanted streaks falling fast.
    this.fill(this.drops, Math.round((E.krople ?? 0) * 10 * area));
    if (this.drops.length) {
      this.g.lineStyle(0.6, 0xbcd4f0, 0.55);
      for (const d of this.drops) {
        d.v += (dt * 1.6 * d.s * 90) / v.height;
        d.u += (dt * 0.25 * 90) / v.width;
        if (d.v > 1) { d.v -= 1; d.u = Math.random(); }
        if (d.u > 1) d.u -= 1;
        const x = v.x + d.u * v.width, y = v.y + d.v * v.height;
        this.g.lineBetween(x, y, x - 1.6 * d.s, y - 6 * d.s);
      }
    }
    // Snow: small flakes drifting down and swaying.
    this.fill(this.flakes, Math.round((E.platki ?? 0) * 10 * area));
    if (this.flakes.length) {
      this.g.fillStyle(0xffffff, 0.85);
      for (const f of this.flakes) {
        f.v += (dt * 0.22 * f.s * 90) / v.height;
        if (f.v > 1) { f.v -= 1; f.u = Math.random(); }
        const x = v.x + (f.u * v.width + Math.sin(now / 700 + f.s * 20) * 3), y = v.y + f.v * v.height;
        this.g.fillRect(x, y, 0.9 * f.s + 0.4, 0.9 * f.s + 0.4);
      }
    }
    // Mist: thick at the edges of the view, thin around the hero.
    const m = E.mgla ?? 0;
    this.mist.setVisible(m > 0);
    if (m > 0) {
      const s = Math.max(v.width, v.height) * 1.5;
      this.mist.setPosition(hero.x, hero.y).setDisplaySize(s, s).setAlpha(Math.min(1, m * 2.4));
      this.g.fillStyle(0xe1e6ec, m * 0.5).fillRect(v.x - 20, v.y - 20, v.width + 40, v.height + 40);
    }
    // Storm: now and then a double flash.
    if (E.blyski) {
      if (!this.nextBolt) this.nextBolt = now + 4000 + Math.random() * 8000;
      if (now > this.nextBolt) {
        this.nextBolt = now + 6000 + Math.random() * 10000;
        this.scene.tweens.add({ targets: this.flash, fillAlpha: { from: 0.55, to: 0 }, duration: 160, onComplete: () => {
          this.scene.time.delayedCall(90, () => this.scene.tweens.add({ targets: this.flash, fillAlpha: { from: 0.4, to: 0 }, duration: 260 }));
        } });
      }
    } else this.nextBolt = 0;
  }
}
