// An underground pinball hatch (owner, 2 Nov 2026: metro cities ride a „podziemny pinball” instead of cannons): an iron
// lid in a brass ring on the pavement plus a brass post with a glowing glass ball, so it is found from afar.
// Code-drawn pixel art at 2 canvas px per map px until the artist's picture. Same surface as Armata3D (client.ts).
import Phaser from 'phaser';
import { dymek } from './ladowanie';

export const WLAZ_RYS = {
  /** Lid half-width/half-height, map px (seen from above at a slant). */
  rx: 8,
  ry: 4.5,
  /** The post next to the hatch, map px. */
  slupek: 22,
  slupekX: 13,
  /** Lid slide when opening, map px; times. */
  odsuw: 11,
  otwieranieMs: 380,
  zamykanieMs: 300,
};
const D = 2; // canvas px per map px
const INK = '#1e1a24';

function twardo(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
}
function elipsa(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, kolor: string) {
  g.fillStyle = kolor;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  g.fill();
}

/** Textures: hole with the brass ring, the lid, the post. Made once per scene. */
function tekstury(scene: Phaser.Scene) {
  if (scene.textures.exists('wlaz-otwor')) return;
  const R = WLAZ_RYS;
  const w = (R.rx + 2) * 2 * D, h = (R.ry + 2) * 2 * D;
  const otwor = document.createElement('canvas');
  otwor.width = w;
  otwor.height = h;
  let g = otwor.getContext('2d')!;
  const cx = w / 2, cy = h / 2;
  elipsa(g, cx, cy, (R.rx + 1.5) * D, (R.ry + 1.5) * D, INK);
  elipsa(g, cx, cy, (R.rx + 1) * D, (R.ry + 1) * D, '#8a613f');
  elipsa(g, cx, cy - 0.5 * D, (R.rx + 0.6) * D, (R.ry + 0.6) * D, '#c8963e');
  elipsa(g, cx, cy, R.rx * D, R.ry * D, INK);
  elipsa(g, cx, cy + 0.6 * D, (R.rx - 0.8) * D, (R.ry - 0.8) * D, '#141216');
  // Rivets on the ring.
  g.fillStyle = '#f0c850';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * (R.rx + 0.8) * D) - 1, Math.round(cy + Math.sin(a) * (R.ry + 0.8) * D) - 1, 2, 2);
  }
  twardo(otwor);
  scene.textures.addCanvas('wlaz-otwor', otwor)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const pokrywa = document.createElement('canvas');
  pokrywa.width = w;
  pokrywa.height = h;
  g = pokrywa.getContext('2d')!;
  elipsa(g, cx, cy, (R.rx + 0.2) * D, (R.ry + 0.2) * D, INK);
  elipsa(g, cx, cy, (R.rx - 0.4) * D, (R.ry - 0.4) * D, '#46444a');
  elipsa(g, cx - 0.6 * D, cy - 0.5 * D, (R.rx - 1.4) * D, (R.ry - 1.2) * D, '#56565c');
  elipsa(g, cx, cy, (R.rx - 2.6) * D, (R.ry - 1.8) * D, '#38383e');
  // The pinball emblem: a brass ball with a light.
  elipsa(g, cx, cy, 2.4 * D, 2.0 * D, INK);
  elipsa(g, cx, cy, 1.9 * D, 1.5 * D, '#e9c56a');
  elipsa(g, cx - 0.6 * D, cy - 0.5 * D, 0.7 * D, 0.5 * D, '#fff6c8');
  // Grip slots.
  g.fillStyle = INK;
  g.fillRect(Math.round(cx - (R.rx - 1.6) * D), Math.round(cy - 1), 3 * D, 2);
  g.fillRect(Math.round(cx + (R.rx - 4.6) * D), Math.round(cy - 1), 3 * D, 2);
  twardo(pokrywa);
  scene.textures.addCanvas('wlaz-pokrywa', pokrywa)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const sw = 9 * D, sh = (R.slupek + 6) * D;
  const slupek = document.createElement('canvas');
  slupek.width = sw;
  slupek.height = sh;
  g = slupek.getContext('2d')!;
  const sx = sw / 2;
  // Foot, pole, collar.
  g.fillStyle = INK;
  g.fillRect(sx - 3 * D, sh - 3 * D, 6 * D, 3 * D);
  g.fillRect(sx - 1.5 * D, 6 * D, 3 * D, sh - 8 * D);
  g.fillStyle = '#8a613f';
  g.fillRect(sx - 2.5 * D, sh - 2.5 * D, 5 * D, 2 * D);
  g.fillStyle = '#c8963e';
  g.fillRect(sx - 1 * D, 6.5 * D, 2 * D, sh - 9 * D);
  g.fillStyle = '#f2d888';
  g.fillRect(sx - 1 * D, 6.5 * D, 1, sh - 9 * D);
  g.fillStyle = INK;
  g.fillRect(sx - 2.5 * D, 7 * D, 5 * D, 2 * D);
  g.fillStyle = '#c8963e';
  g.fillRect(sx - 2 * D, 7.4 * D, 4 * D, 1.2 * D);
  // Glass ball on top (the pinball), lit.
  elipsa(g, sx, 4 * D, 3.6 * D, 3.6 * D, INK);
  elipsa(g, sx, 4 * D, 3 * D, 3 * D, '#66a08c');
  elipsa(g, sx, 4 * D, 2.2 * D, 2.2 * D, '#8cc0aa');
  elipsa(g, sx - 1 * D, 3 * D, 0.9 * D, 0.9 * D, '#fff6c8');
  twardo(slupek);
  scene.textures.addCanvas('wlaz-slupek', slupek)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // A soft glow behind the ball (additive).
  const blask = document.createElement('canvas');
  blask.width = blask.height = 32;
  g = blask.getContext('2d')!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(160,240,210,0.9)');
  gr.addColorStop(1, 'rgba(160,240,210,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  scene.textures.addCanvas('wlaz-blask', blask);
}

export class Wlaz {
  /** Always ready (no file to load). */
  ready = Promise.resolve(true);
  private otwor: Phaser.GameObjects.Image;
  private pokrywa: Phaser.GameObjects.Image;
  private slupek: Phaser.GameObjects.Image;
  private blask: Phaser.GameObjects.Image;
  private t = Math.random() * 10;
  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number) {
    tekstury(scene);
    const s = 1 / D;
    this.otwor = scene.add.image(x, y, 'wlaz-otwor').setScale(s).setDepth(-1e7 + 2);
    this.pokrywa = scene.add.image(x, y, 'wlaz-pokrywa').setScale(s).setDepth(-1e7 + 3);
    this.slupek = scene.add.image(x + WLAZ_RYS.slupekX, y, 'wlaz-slupek').setOrigin(0.5, 1).setScale(s).setDepth(y);
    this.blask = scene.add
      .image(x + WLAZ_RYS.slupekX, y - (WLAZ_RYS.slupek + 6) + 4, 'wlaz-blask')
      .setScale(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 0.1);
  }
  setVisible(v: boolean) {
    for (const o of [this.otwor, this.pokrywa, this.slupek, this.blask]) o.setVisible(v);
  }
  /** A hatch lies on the ground: it is not cut out of the fog like the tall cannons. */
  get wyciecie() {
    return null;
  }
  private przesun(dx: number, ms: number, still: boolean) {
    if (still) {
      this.pokrywa.x = this.x + dx;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
      this.scene.tweens.add({ targets: this.pokrywa, x: this.x + dx, duration: ms, ease: 'Sine.easeInOut', onComplete: () => resolve() }),
    );
  }
  /** Opens the lid (the hero then climbs in). Direction is ignored – a hatch has none. */
  celuj(_dx: number, _dy: number, natychmiast = false): Promise<void> {
    return this.przesun(-WLAZ_RYS.odsuw, WLAZ_RYS.otwieranieMs, natychmiast);
  }
  /** The hero is in: a puff of steam and the lid closes. */
  async strzel(): Promise<void> {
    dymek(this.scene, this.x, this.y - 2, this.y + 1);
    await this.przesun(0, WLAZ_RYS.zamykanieMs, false);
  }
  /** Arrival: the lid flies open with steam. */
  lap() {
    void this.przesun(-WLAZ_RYS.odsuw, 160, false);
    dymek(this.scene, this.x, this.y - 2, this.y + 1);
  }
  /** Closes after the hero is out. */
  zamknij() {
    return this.przesun(0, WLAZ_RYS.zamykanieMs, false);
  }
  update(dt: number) {
    this.t += dt;
    this.blask.setAlpha(0.55 + 0.25 * Math.sin(this.t * 2.2));
  }
  destroy() {
    for (const o of [this.otwor, this.pokrywa, this.slupek, this.blask]) o.destroy();
  }
}
