// An underground pinball hatch (owner, 2 Nov 2026: metro cities ride a „podziemny pinball” instead of cannons): an iron
// lid in a brass ring on the pavement plus a brass post with a glowing glass ball, so it is found from afar.
// Code-drawn pixel art at 2 canvas px per map px until the artist's picture. Same surface as Armata3D (client.ts).
import Phaser from 'phaser';
import { dymek } from './ladowanie';
import { tr } from '../i18n';
import { MARKA } from '../content/metro';

export const WLAZ_RYS = {
  /** Lid half-width/half-height, map px (seen from above at a slant). */
  rx: 8,
  ry: 4.5,
  /** The column next to the hatch: its foot this far right of the hatch's centre, map px. */
  slupekX: 13,
  /** Lid slide when opening, map px; times. */
  odsuw: 11,
  otwieranieMs: 380,
  zamykanieMs: 300,
};
const D = 2; // canvas px per map px
/** The column beside the hatch, map px (texture at SLUP.D canvas px per map px; origin at the column's foot). */
const SLUP = { D: 4, w: 36, h: 44, cx: 24, plytaY: 15, plytaH: 9, plytaW: 23, whistleX: 31, whistleY: 23 };
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

  // The column (owner, 2 Nov 2026: „musi być dobrze widoczny – słupek, dodatkowe rury i logo”): a brass pillar on an
  // iron foot, an enamel plate with the brand, a glass ball on top, a pipe from the hatch's ring into its foot and a
  // steam whistle on its side. Drawn at 4 canvas px per map px so the plate's letters stay readable.
  const K = SLUP;
  const S = K.D;
  const kol = document.createElement("canvas");
  kol.width = K.w * S;
  kol.height = K.h * S;
  g = kol.getContext("2d")!;
  const X = (v: number) => Math.round(v * S);
  const kx = K.cx;
  const rurka = (pts: [number, number][], w: number) => {
    g.lineJoin = "round";
    g.lineCap = "butt";
    for (const [kolor, ww] of [[INK, w + 1.2], ["#a08448", w], ["#e8d08c", w * 0.3]] as [string, number][]) {
      g.strokeStyle = kolor;
      g.lineWidth = ww * S;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), X(y)) : g.moveTo(X(x), X(y))));
      g.stroke();
    }
  };
  // Pipe from the hatch ring (left edge, on the ground) up and into the column's foot, with flanges.
  rurka([[1.5, K.h - 1], [1.5, K.h - 9], [kx - 3, K.h - 9]], 2.2);
  g.fillStyle = INK;
  g.fillRect(X(0.2), X(K.h - 5), X(2.6), X(1.4));
  g.fillRect(X(kx - 5), X(K.h - 10.6), X(1.4), X(3.2));
  g.fillStyle = "#c8963e";
  g.fillRect(X(0.5), X(K.h - 4.8), X(2), X(1));
  g.fillRect(X(kx - 4.8), X(K.h - 10.3), X(1), X(2.6));
  // Whistle pipe on the right side.
  rurka([[kx + 2.5, K.h - 14], [K.whistleX, K.h - 14], [K.whistleX, K.whistleY + 2]], 1.6);
  g.fillStyle = INK;
  g.fillRect(X(K.whistleX - 1.3), X(K.whistleY - 1), X(2.6), X(3.4));
  g.fillStyle = "#e0b45a";
  g.fillRect(X(K.whistleX - 0.9), X(K.whistleY - 0.6), X(1.8), X(2.6));
  // Foot.
  g.fillStyle = INK;
  g.fillRect(X(kx - 6), X(K.h - 5), X(12), X(5));
  g.fillStyle = "#3a3840";
  g.fillRect(X(kx - 5.4), X(K.h - 4.4), X(10.8), X(4));
  g.fillStyle = "#c8963e";
  g.fillRect(X(kx - 5.4), X(K.h - 4.4), X(10.8), X(0.8));
  g.fillStyle = "#f0c850";
  for (const dx of [-4, -1.5, 1.5, 4]) g.fillRect(X(kx + dx - 0.3), X(K.h - 2.6), X(0.6), X(0.6));
  // Shaft with fluting.
  g.fillStyle = INK;
  g.fillRect(X(kx - 2.6), X(7), X(5.2), X(K.h - 11.5));
  g.fillStyle = "#b8893c";
  g.fillRect(X(kx - 2), X(7), X(4), X(K.h - 11.5));
  g.fillStyle = "#f2d888";
  g.fillRect(X(kx - 1.4), X(7), X(0.7), X(K.h - 11.5));
  g.fillStyle = "#8a613f";
  g.fillRect(X(kx + 0.9), X(7), X(0.6), X(K.h - 11.5));
  // Collars.
  for (const y of [9.5, K.h - 7]) {
    g.fillStyle = INK;
    g.fillRect(X(kx - 3.4), X(y - 0.9), X(6.8), X(1.8));
    g.fillStyle = "#e0b45a";
    g.fillRect(X(kx - 3), X(y - 0.6), X(6), X(1.2));
  }
  // Enamel plate with the brand, two lines.
  const py = K.plytaY, ph = K.plytaH, pw = K.plytaW;
  g.fillStyle = INK;
  g.fillRect(X(kx - pw / 2 - 0.8), X(py - 0.8), X(pw + 1.6), X(ph + 1.6));
  g.fillStyle = "#c8963e";
  g.fillRect(X(kx - pw / 2 - 0.4), X(py - 0.4), X(pw + 0.8), X(ph + 0.8));
  g.fillStyle = "#1f4a3c";
  g.fillRect(X(kx - pw / 2), X(py), X(pw), X(ph));
  g.fillStyle = "#f0c850";
  for (const [x, y] of [[kx - pw / 2 + 0.4, py + 0.4], [kx + pw / 2 - 1, py + 0.4], [kx - pw / 2 + 0.4, py + ph - 1], [kx + pw / 2 - 1, py + ph - 1]])
    g.fillRect(X(x), X(y), X(0.6), X(0.6));
  const slowa = tr(MARKA).toUpperCase().split(/\s+/);
  const linie = slowa.length > 1 ? [slowa[0], slowa.slice(1).join(" ")] : slowa;
  g.fillStyle = "#f6e7c6";
  g.textAlign = "center";
  g.textBaseline = "middle";
  linie.forEach((l, i) => {
    let fs = X(ph / linie.length - 0.9);
    g.font = `800 ${fs}px 'Alegreya Sans',system-ui,sans-serif`;
    while (fs > 6 && g.measureText(l).width > X(pw - 1.6)) g.font = `800 ${--fs}px 'Alegreya Sans',system-ui,sans-serif`;
    g.fillText(l, X(kx), X(py + (ph / linie.length) * (i + 0.5) + 0.2));
  });
  // Glass ball on top in a brass cup.
  elipsa(g, X(kx), X(4.4), X(4.2), X(4.2), INK);
  elipsa(g, X(kx), X(4.4), X(3.6), X(3.6), "#66a08c");
  elipsa(g, X(kx), X(4.4), X(2.6), X(2.6), "#9fd2bc");
  elipsa(g, X(kx - 1.2), X(3.2), X(1), X(1), "#fff6c8");
  g.fillStyle = INK;
  g.fillRect(X(kx - 3.2), X(6.6), X(6.4), X(1.8));
  g.fillStyle = "#e0b45a";
  g.fillRect(X(kx - 2.8), X(6.9), X(5.6), X(1.2));
  twardo(kol);
  scene.textures.addCanvas("wlaz-slupek", kol)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

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
    this.slupek = scene.add.image(x + WLAZ_RYS.slupekX, y, 'wlaz-slupek').setOrigin(SLUP.cx / SLUP.w, 1).setScale(1 / SLUP.D).setDepth(y);
    this.blask = scene.add
      .image(x + WLAZ_RYS.slupekX, y - SLUP.h + 4.4, 'wlaz-blask')
      .setScale(0.9)
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
  private dalejPara = 1 + Math.random() * 3;
  update(dt: number) {
    this.t += dt;
    this.blask.setAlpha(0.55 + 0.25 * Math.sin(this.t * 2.2));
    // The whistle lets off a puff now and then, so the column is spotted from afar.
    if (this.slupek.visible && (this.dalejPara -= dt) <= 0) {
      this.dalejPara = 2.5 + Math.random() * 3;
      dymek(this.scene, this.x + WLAZ_RYS.slupekX + SLUP.whistleX - SLUP.cx, this.y - SLUP.h + SLUP.whistleY - 2, this.y + 1);
    }
  }
  destroy() {
    for (const o of [this.otwor, this.pokrywa, this.slupek, this.blask]) o.destroy();
  }
}
