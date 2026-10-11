import Phaser from 'phaser';
import { EFEKTY_POGODY, POSWIATA_BOHATERA as LAMPA, CIENIE_CHMUR as CHMURY } from '../content/pogoda';
import { weather } from '../weather';
import { teksturaChmur } from '../gen';
import { WYGLAD_09 } from '../map/Podloze09';
import { night } from '../map/MapRenderer';

// What the weather looks like on screen (content/pogoda.ts EFEKTY_POGODY): rain streaks, snowflakes,
// a darker sky, a mist that thins out around the hero, lightning flashes in a storm. All drawn by code
// in the camera's view every frame (a few hundred short lines at most), above the map and the fog of war.

/**
 * The generator's cloud texture is meant to be multiplied (white = no change); MULTIPLY blending did nothing here,
 * so its two shadow tones become a cool dark blue at alpha 60 / 105 over a transparent background (fainter vanished on screen).
 */
function cloudCanvas(amount: number) {
  // Owner (11 Oct 2026): clouds cover fragments of the view, never the whole screen – even a full overcast is
  // ~35 % shadow in separate patches (the generator's own scale reached ~70 %, a dark veil over everything).
  const o = teksturaChmur(CHMURY.odPokrycia + CHMURY.zaPokrycie * amount, 3);
  const c = document.createElement('canvas');
  c.width = o.w;
  c.height = o.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(o.w, o.h);
  for (let k = 0; k < o.px.length; k++) {
    const r = o.px[k] & 255;
    if (r === 255) continue;
    img.data[k * 4] = 24;
    img.data[k * 4 + 1] = 34;
    img.data[k * 4 + 2] = 64;
    img.data[k * 4 + 3] = r > 200 ? CHMURY.alfaLekka : CHMURY.alfaPelna;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

interface Drop { u: number; v: number; s: number }

export class WeatherFx {
  private g: Phaser.GameObjects.Graphics;
  private dark: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private mist: Phaser.GameObjects.Image;
  /** The hero's warm lamp light (POSWIATA_BOHATERA), added over the world and the darker sky. */
  private lamp: Phaser.GameObjects.Image;
  private flick = 1;
  private lampAngle = Math.PI / 2;
  private drops: Drop[] = [];
  private flakes: Drop[] = [];
  private nextBolt = 0;
  /** Moving cloud shadows (GENERATOR_SWIATA 0.12, overhaul 09): a seamless 512 px texture of soft shadows over the world, drifting with the wind. */
  private clouds?: Phaser.GameObjects.TileSprite;
  private cloudAmount = -1;
  private drift = 0;

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
    if (!scene.textures.exists('hero-lamp')) {
      // Drawn pixel by pixel: a soft ring around the centre with a hole in the middle, and a cone along +x.
      const S = 256, h = S / 2;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d')!;
      const img = x.createImageData(S, S);
      const [cr, cg, cb] = LAMPA.kolor;
      const half = (LAMPA.stozekStopni * Math.PI) / 180, soft = (40 * Math.PI) / 180;
      const st = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dx = px + 0.5 - h, dy = py + 0.5 - h;
        const r = Math.hypot(dx, dy) / h;
        if (r >= 1) continue;
        const ring = LAMPA.wokolMoc * (1 - st(0, LAMPA.wokol, r));
        const ang = Math.abs(Math.atan2(dy, dx));
        const cone = (1 - st(half, half + soft, ang)) * (1 - st(0.3, 1, r)) * LAMPA.stozekMoc;
        // A lamp, not a torch: the glow and the light ahead add up softly; only the very middle stays dim over the hero.
        const v = Math.min(1, ring + cone * (1 - ring)) * (0.25 + 0.75 * st(LAMPA.dziura, LAMPA.dziura * 3, r));
        const k = (py * S + px) * 4;
        img.data[k] = cr; img.data[k + 1] = cg; img.data[k + 2] = cb;
        img.data[k + 3] = Math.round(255 * v);
      }
      x.putImageData(img, 0, 0);
      scene.textures.addCanvas('hero-lamp', c);
    }
    this.lamp = scene.add.image(0, 0, 'hero-lamp').setDepth(1_041_000).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.lamp.setDisplaySize(LAMPA.zasieg * 2, LAMPA.zasieg * 2);
  }

  /** The lamp: off in daylight, on at dusk/night and while it rains or snows; the cone follows where the hero faces. */
  private updateLamp(dt: number, hero: { x: number; y: number; facing?: { x: number; y: number } }, now: number, light: number) {
    // Owner (11 Oct 2026): only after sunset or while it rains/snows – not for clouds or a grey day.
    const pada = LAMPA.gdyPada.includes(weather.kind) ? LAMPA.zaOpady : 0;
    const dark = Math.min(1, pada + (1 - light) * LAMPA.zaNoc);
    const t0 = Math.max(0, Math.min(1, (dark - LAMPA.odCiemnosci) / (LAMPA.pelnaPrzy - LAMPA.odCiemnosci)));
    const want = LAMPA.moc * t0 * t0 * (3 - 2 * t0);
    if (want <= 0.005) { this.lamp.setVisible(false); return; }
    // A flame: two slow waves plus a small random gust now and then.
    const t = now / 1000;
    if (Math.random() < dt * 3) this.flick = 1 - Math.random() * 0.7;
    else this.flick += (1 - this.flick) * Math.min(1, dt * 6);
    const m = LAMPA.migotanie * (0.5 * Math.sin(t * 5.3) + 0.3 * Math.sin(t * 11.7 + 1) + (this.flick - 1) * 0.6);
    const f = hero.facing;
    if (f && (f.x || f.y)) {
      const target = Math.atan2(f.y, f.x);
      const d = Phaser.Math.Angle.Wrap(target - this.lampAngle);
      this.lampAngle += d * Math.min(1, dt * 8);
    }
    this.lamp.setVisible(true).setPosition(hero.x, hero.y - 4).setRotation(this.lampAngle).setAlpha(Math.max(0, want * (1 + m)));
    const k = 1 + m * 0.1;
    this.lamp.setDisplaySize(LAMPA.zasieg * 2 * k, LAMPA.zasieg * 2 * k);
  }

  private fill(list: Drop[], n: number) {
    while (list.length < n) list.push({ u: Math.random(), v: Math.random(), s: 0.7 + Math.random() * 0.6 });
    if (list.length > n) list.length = n;
  }

  private updateClouds(dt: number, v: Phaser.Geom.Rectangle) {
    // Rounded to tenths, so the texture (~0.1 s) is made again only when the cover really changes.
    const amount = Math.round(weather.cloud * 10) / 10;
    const off = night() || amount < 0.05;
    if (off) {
      this.clouds?.setVisible(false);
      return;
    }
    if (amount !== this.cloudAmount) {
      this.cloudAmount = amount;
      const key = 'chmury09';
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.scene.textures.addCanvas(key, cloudCanvas(amount));
      if (!this.clouds) this.clouds = this.scene.add.tileSprite(0, 0, 10, 10, key).setOrigin(0).setDepth(999_000);
      else this.clouds.setTexture(key);
    }
    // No wind direction in our forecast: a steady drift to the east-south-east, 2–12 px/s by the wind's strength.
    this.drift += dt * Math.max(2, Math.min(12, 2 + weather.wind * 1.2));
    const c = this.clouds!;
    c.setVisible(true).setPosition(v.x - 2, v.y - 2).setSize(v.width + 4, v.height + 4);
    c.tilePositionX = v.x - 2 - this.drift;
    c.tilePositionY = v.y - 2 - this.drift * 0.33;
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, hero: { x: number; y: number; facing?: { x: number; y: number } }, now: number, light = 1) {
    this.updateLamp(dt, hero, now, light);
    if (WYGLAD_09) this.updateClouds(dt, cam.worldView);
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
