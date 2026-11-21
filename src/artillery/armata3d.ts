// Obrotowa armata pasażerska rysowana kodem – obiekt na mapie (bryła i animowane części: armataBryla.ts).
import Phaser from 'phaser';
import { rasteruj, wpisz, add, mul, rzut, type V } from '../gen/bryly';
import { ARMATA_3D, P, bryla, klab, type StanArmaty } from './armataBryla';
export { ARMATA_3D, punktySiatki } from './armataBryla';

/** Jedna armata na mapie. Ten sam zestaw funkcji co dawny model 3D (client.ts, ladowanie.ts). */
export class Armata3D {
  image?: Phaser.GameObjects.Image;
  private cien?: Phaser.GameObjects.Image;
  private cienTex?: Phaser.Textures.CanvasTexture;
  private textura?: Phaser.Textures.CanvasTexture;
  private sylwetka = document.createElement('canvas');
  private stan: StanArmaty = { kat: Math.PI / 4, odrzut: 0, blysk: 0, ugiecie: ARMATA_3D.siatka.ugiecie };
  private aim: { start: number; delta: number; t: number; d: number; done: () => void } | null = null;
  private shot = -1;
  private onShot?: () => void;
  private lapT = -1;
  private ruch = 0.01;
  private odKlatki = Infinity;
  private dead = false;
  private visible = true;
  private static nr = 0;
  private klucz = `armata-kod-${++Armata3D.nr}`;
  ready: Promise<boolean>;

  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number) {
    this.ready = Promise.resolve(this.zbuduj());
  }

  private zbuduj() {
    const G = ARMATA_3D.gestosc;
    this.textura = this.scene.textures.createCanvas(this.klucz, P.w, P.h) ?? undefined;
    if (!this.textura) return false;
    this.textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sylwetka.width = P.w;
    this.sylwetka.height = P.h;
    this.image = this.scene.add.image(this.x, this.y, this.klucz).setOrigin(P.ox / P.w, P.oy / P.h).setScale(1 / G).setDepth(this.y).setVisible(this.visible);
    const C = ARMATA_3D.cien, gora = P.oy, dol = P.h - P.oy;
    const sw = Math.ceil(P.w + gora * C.wSkos + 4), sh = Math.ceil(dol + gora * C.wDol + 4);
    this.cienTex = this.scene.textures.createCanvas(`${this.klucz}-cien`, sw, sh) ?? undefined;
    if (this.cienTex) {
      this.cienTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.cien = this.scene.add.image(this.x, this.y, `${this.klucz}-cien`)
        .setOrigin(P.ox / sw, dol / sh).setScale(1 / G).setAlpha(C.alfa).setDepth(-1e7 + 1).setVisible(this.visible);
    }
    this.narysuj();
    return true;
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.image?.setVisible(v);
    this.cien?.setVisible(v);
  }

  /** Gdzie leży obraz armaty na mapie – mgła wojny zostawia ją odkrytą (wysoki punkt orientacyjny). */
  get wyciecie(): { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null {
    const i = this.image;
    if (!i || !i.visible || !this.textura) return null;
    return { canvas: this.textura.canvas, x: i.x - i.displayOriginX * i.scaleX, y: i.y - i.displayOriginY * i.scaleY, w: i.displayWidth, h: i.displayHeight };
  }

  /** Obraca wieżę w stronę przesunięcia na mapie (cel − stacja). */
  celuj(dx: number, dy: number, natychmiast = false): Promise<void> {
    if (Math.hypot(dx, dy) < 1e-6) return Promise.resolve();
    const start = this.stan.kat, cel = Math.atan2(dy, dx);
    const delta = Math.atan2(Math.sin(cel - start), Math.cos(cel - start));
    if (natychmiast) {
      this.stan.kat = start + delta;
      this.ruch = 0.01;
      return Promise.resolve();
    }
    return new Promise((done) => {
      this.aim?.done();
      this.aim = { start, delta, t: 0, d: ARMATA_3D.obrot, done };
    });
  }

  /** Strzał: odrzut, błysk i dym; obietnica spełnia się w chwili wylotu pasażera. */
  strzel(): Promise<void> {
    if (this.shot >= 0) return Promise.resolve();
    this.shot = 0;
    this.ruch = Math.max(this.ruch, 1.4);
    return new Promise((done) => (this.onShot = done));
  }

  /** Siatka ugina się i podskakuje. */
  lap() {
    this.lapT = 0;
    this.ruch = Math.max(this.ruch, ARMATA_3D.siatka.czas + 0.1);
  }

  update(dt: number) {
    if (this.dead || !this.textura) return;
    const A = ARMATA_3D, st = this.stan;
    if (this.aim) {
      const a = this.aim;
      a.t += dt;
      const t = Math.min(1, a.t / a.d), s = t * t * (3 - 2 * t);
      st.kat = a.start + a.delta * s;
      this.ruch = Math.max(this.ruch, 0.05);
      if (t >= 1) { this.aim = null; a.done(); }
    }
    if (this.shot >= 0) {
      const przed = this.shot;
      this.shot += dt;
      const t = this.shot, O = A.odrzut;
      st.odrzut = t < O.w ? O.px * (t / O.w) : t < O.w + O.powrot ? O.px * (1 - (t - O.w) / O.powrot) ** 2 : 0;
      st.blysk = t < 0.18 ? 1 - t / 0.18 : 0;
      if (przed < A.wylot && t >= A.wylot) { this.onShot?.(); this.onShot = undefined; }
      if (t >= 1.3) { this.shot = -1; st.odrzut = 0; st.blysk = 0; }
    }
    if (this.lapT >= 0) {
      this.lapT += dt;
      const t = this.lapT / A.siatka.czas;
      st.ugiecie = A.siatka.ugiecie + (t < 1 ? A.siatka.podskok * Math.exp(-4 * t) * Math.cos(t * Math.PI * 3) : 0);
      if (t >= 1) { this.lapT = -1; st.ugiecie = A.siatka.ugiecie; }
    }
    if (this.ruch <= 0 || !this.visible) return;
    this.ruch -= dt;
    this.odKlatki += dt;
    if (this.odKlatki < 1 / A.klatekNaS && this.ruch > 0) return;
    this.odKlatki = 0;
    this.narysuj();
  }

  /** Rysuje bryłę w obecnym stanie, dym po strzale i cień. */
  private narysuj() {
    const tex = this.textura;
    if (!tex) return;
    const c = tex.context;
    const img = c.createImageData(P.w, P.h);
    const r = rasteruj(bryla(this.stan).sciany, P.w, P.h, P.ox, P.oy);
    wpisz(img, 0, P.w, P.h, r);
    // Sylwetka bez dymu – do cienia.
    this.sylwetka.getContext('2d')!.putImageData(img, 0, 0);
    if (this.shot >= 0.05) this.dym(img, this.shot);
    c.putImageData(img, 0, 0);
    tex.refresh();
    this.narysujCien();
  }

  /** Kłęby dymu z wylotu: rosną, wznoszą się i rzedną. */
  private dym(img: ImageData, t: number) {
    const S = ARMATA_3D.skala, st = this.stan;
    const e = (ARMATA_3D.podniesienie * Math.PI) / 180;
    const u: V = [Math.cos(e) * Math.cos(st.kat), Math.cos(e) * Math.sin(st.kat), Math.sin(e)];
    const wy = add([0, 0, 22], mul(u, 40));
    for (let i = 0; i < 4; i++) {
      const tt = t - 0.05 - i * 0.07;
      if (tt <= 0 || tt > 1.1) continue;
      const p = add(wy, add(mul(u, 6 + tt * 22 + i * 3), [((i % 2) * 2 - 1) * 3 * tt, 0, tt * 14]));
      const [sx, sy] = rzut(mul(p, S));
      klab(img, sx + P.ox, sy + P.oy, (3 + tt * 7 + i) * S, Math.max(0, 1 - tt / 1.1));
    }
  }

  /** Sylwetka położona na ziemi: im wyżej punkt, tym dalej na południowy wschód. */
  private narysujCien() {
    const ct = this.cienTex, im = this.image, ci = this.cien;
    if (!ct || !im || !ci) return;
    const C = ARMATA_3D.cien, c = ct.context;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, ct.width, ct.height);
    c.imageSmoothingEnabled = false;
    c.setTransform(1, 0, -C.wSkos, -C.wDol, ci.displayOriginX, ci.displayOriginY);
    c.drawImage(this.sylwetka, -P.ox, -P.oy);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = C.kolor;
    c.fillRect(0, 0, ct.width, ct.height);
    c.globalCompositeOperation = 'source-over';
    ct.refresh();
  }

  destroy() {
    this.dead = true;
    this.aim?.done();
    this.onShot?.();
    this.image?.destroy();
    this.cien?.destroy();
    if (this.scene.textures.exists(this.klucz)) this.scene.textures.remove(this.klucz);
    if (this.scene.textures.exists(`${this.klucz}-cien`)) this.scene.textures.remove(`${this.klucz}-cien`);
  }
}

