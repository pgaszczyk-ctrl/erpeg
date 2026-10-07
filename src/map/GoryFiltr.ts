import Phaser from 'phaser';
import type { CityMap } from './CityMap';
import { PX_PER_M } from './CityMap';
import { GORY } from '../content/gory';
import { weather } from '../weather';
import { efektGorWlaczony } from '../ustawieniaGracza';

// Góry v2 (owner, 6 Oct 2026; docs/paczka-dla-programisty/GORY.md p. 7–7c): a camera filter on the graphics card.
// Terrain below the hero is blurred in 10 m layers, tinted blue and fogged further down, drawn smaller (as if farther
// away) and left behind in a walk (parallax); terrain above is a little bigger and runs ahead. The camera only draws
// what is on screen, so the shrinking and the parallax fade out towards the screen's edges (else the edges would smear).

const FS = `
#pragma phaserTemplate(shaderName)
precision highp float;
uniform sampler2D uMainSampler;
uniform sampler2D uHeights;
uniform vec4 uView;
uniform vec4 uGrid;
uniform vec2 uP;
uniform vec2 uD;
uniform float uHp;
uniform float uT;
uniform float uWind;
uniform float uPar;
uniform float uMoc;
uniform float uRozm;
uniform float uCiem;
uniform float uSzer;
uniform float uFlip;
uniform float uHFlip;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)
float dec(vec2 i) {
  vec2 t = (i + 0.5) / uGrid.w;
  vec4 c = texture2D(uHeights, vec2(t.x, mix(t.y, 1.0 - t.y, uHFlip)));
  return (c.r * 65280.0 + c.g * 255.0) / 8.0;
}
float hAt(vec2 w) {
  vec2 g = clamp((w - uGrid.xy) / uGrid.z - 0.5, vec2(0.0), vec2(uGrid.w - 1.001));
  vec2 i = floor(g);
  vec2 f = g - i;
  return mix(mix(dec(i), dec(i + vec2(1.0, 0.0)), f.x), mix(dec(i + vec2(0.0, 1.0)), dec(i + vec2(1.0, 1.0)), f.x), f.y);
}
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec2 toUv(vec2 w) {
  vec2 t = (w - uView.xy) / uView.zw;
  return vec2(t.x, mix(t.y, 1.0 - t.y, uFlip));
}
void main() {
  vec2 uv = outTexCoord;
  vec2 s = uView.xy + vec2(uv.x, mix(uv.y, 1.0 - uv.y, uFlip)) * uView.zw;
  vec2 rel = s - uP;
  // Fades towards every screen edge (the camera draws nothing beyond it).
  vec2 e = abs(rel) / (0.5 * uView.zw);
  float fade = (1.0 - smoothstep(0.45, 0.92, max(e.x, e.y))) * uPar;
  vec2 w = s;
  float dh = 0.0;
  for (int it = 0; it < 3; it++) {
    dh = uHp - hAt(w);
    float k = dh >= 0.0 ? 1.0 / (1.0 + min(dh, 60.0) * 0.0075) : 1.0 + min(-dh, 30.0) * 0.004;
    float q = dh >= 0.0 ? min(dh, 60.0) * 0.0105 : -min(-dh, 30.0) * 0.011;
    w = uP + rel / mix(1.0, k, fade) + uD * q * fade;
  }
  vec2 tuv = toUv(w);
  vec4 base = texture2D(uMainSampler, tuv);
  vec3 c = base.rgb;
  // Ground lower than the hero: a faint dark haze (also on small hills), fading in over uSzer metres, so the
  // edge is a soft step, never a hard line (owner, 7 Oct 2026: the old 10 m layer edges looked like a gash).
  if (dh > 0.5) {
    float d = smoothstep(0.5, 0.5 + uSzer, dh) * (1.0 + 0.5 * smoothstep(10.0, 60.0, dh));
    c *= 1.0 - uCiem * d;
  }
  // Blur only in real mountains (uMoc), growing smoothly with the drop instead of 10 m steps.
  float b = clamp((dh - 8.0) / 10.0, 0.0, 4.0);
  float bm = smoothstep(0.0, 1.0, b) * uMoc;
  if (bm > 0.01 && uRozm > 0.0) {
    // Blur of the layers below (like the mock-up's mipmap levels 0.4 + 0.6 b), in map px.
    float r = 0.5 * exp2(0.4 + 0.6 * max(b, 1.0)) * uRozm;
    vec2 ox = vec2(r / uView.z, 0.0);
    vec2 oy = vec2(0.0, r / uView.w);
    vec3 sum = c;
    sum += texture2D(uMainSampler, tuv + ox).rgb + texture2D(uMainSampler, tuv - ox).rgb;
    sum += texture2D(uMainSampler, tuv + oy).rgb + texture2D(uMainSampler, tuv - oy).rgb;
    sum += texture2D(uMainSampler, tuv + ox + oy).rgb + texture2D(uMainSampler, tuv - ox - oy).rgb;
    sum += texture2D(uMainSampler, tuv + ox - oy).rgb + texture2D(uMainSampler, tuv - ox + oy).rgb;
    vec3 blur = mix(sum / 9.0, vec3(178.0, 198.0, 210.0) / 255.0, 0.04 * b);
    if (dh > 0.5) blur *= 1.0 - uCiem * smoothstep(0.5, 0.5 + uSzer, dh) * (1.0 + 0.5 * smoothstep(10.0, 60.0, dh));
    c = mix(c, blur, bm);
  }
  if (dh > 20.0) {
    float f = dh < 50.0 ? 0.16 * (dh - 20.0) / 30.0 : min(0.8, 0.16 + 0.64 * (dh - 50.0) / 50.0);
    vec2 m = w / ${(PX_PER_M / 3.84).toFixed(4)} + vec2(uT * 6.0 * uWind, uT * 1.8);
    f *= (0.7 + 0.6 * (vn(m / 64.0) * 0.65 + vn(m / 24.0) * 0.35)) * uMoc;
    c = mix(c, vec3(0.86, 0.9, 0.94), f);
  }
  gl_FragColor = vec4(c, base.a);
}
`;

const NAZWA = 'FilterGory';
/** Height grid around the hero: N × N cells of GORY.siatkaM metres. */
const N = 96;

let zarejestrowany = false;
function zarejestruj(renderer: Phaser.Renderer.WebGL.WebGLRenderer) {
  if (zarejestrowany) return;
  zarejestrowany = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Base = (Phaser.Renderer.WebGL.RenderNodes as any).BaseFilterShader;
  class FilterGory extends Base {
    constructor(manager: unknown) {
      super(NAZWA, manager, null, FS);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setupTextures(controller: any, textures: unknown[]) {
      textures[1] = controller.glTexture;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setupUniforms(controller: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm = (this as any).programManager;
      const u = controller.u;
      pm.setUniform('uHeights', 1);
      pm.setUniform('uView', u.view);
      pm.setUniform('uGrid', u.grid);
      pm.setUniform('uP', u.p);
      pm.setUniform('uD', u.d);
      pm.setUniform('uHp', u.hp);
      pm.setUniform('uT', u.t);
      pm.setUniform('uWind', u.wind);
      pm.setUniform('uPar', u.par);
      pm.setUniform('uMoc', u.moc);
      pm.setUniform('uRozm', u.rozm);
      pm.setUniform('uCiem', u.ciem);
      pm.setUniform('uSzer', u.szer);
      pm.setUniform('uFlip', u.flip);
      pm.setUniform('uHFlip', u.hflip);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (renderer as any).renderNodes.addNodeConstructor(NAZWA, FilterGory);
}

/** The filter on the game camera plus its height texture; `update` every frame. */
export class GoryFiltr {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ctl: any;
  private tex: Phaser.Textures.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  /** Grid origin (map px) and when it was last filled. */
  private gx = NaN;
  private gy = NaN;
  private filled = 0;
  /** The parallax anchor that follows the hero with a delay. */
  private ax = NaN;
  private ay = NaN;
  /** Effect strength 0..1 (eased) and its target from the terrain's relief and the buildings around. */
  private moc = NaN;
  private cel = 0;
  private zmierzono = -1e9;
  private zmX = NaN;
  private zmY = NaN;
  /** Last measurements (for tests: window.__gory). */
  info = { rzezba: 0, zabudowa: 0, cel: 0, moc: 0 };

  static make(scene: Phaser.Scene, city: CityMap) {
    if (!city.terrain || !(scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
    try {
      return new GoryFiltr(scene, city);
    } catch {
      return null;
    }
  }

  private constructor(private scene: Phaser.Scene, private city: CityMap) {
    zarejestruj(scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer);
    const key = `gory-wys-${Math.random().toString(36).slice(2)}`;
    this.tex = scene.textures.createCanvas(key, N, N)!;
    this.tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.ctx = this.tex.getContext();
    this.img = this.ctx.createImageData(N, N);
    const cam = scene.cameras.main;
    const Controller = Phaser.Filters.Controller;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.ctl = new (Controller as any)(cam, NAZWA);
    this.ctl.glTexture = scene.textures.getFrame(key).glTexture;
    this.ctl.u = { view: [0, 0, 1, 1], grid: [0, 0, 1, N], p: [0, 0], d: [0, 0], hp: 0, t: 0, wind: 0.5, par: 0, moc: 0, rozm: GORY.rozmycie, ciem: GORY.przyciemnienie, szer: GORY.przyciemnienieSzerM, flip: 1, hflip: 1 };
    cam.filters.external.add(this.ctl);
    (window as unknown as { __gory?: GoryFiltr }).__gory = this;
    scene.events.once('shutdown', () => this.destroy());
  }

  destroy() {
    if (!this.ctl) return;
    this.scene.cameras.main?.filters?.external.remove(this.ctl, true);
    this.ctl = null;
    if (this.scene.textures.exists(this.tex.key)) this.scene.textures.remove(this.tex);
  }

  /** Heights around (x, y) into the texture (16-bit, 1/8 m): refilled when the hero leaves the middle or every 2 s. */
  private fill(x: number, y: number, hp: number, now: number) {
    const cell = GORY.siatkaM * PX_PER_M;
    const far = Math.abs(x - (this.gx + (N * cell) / 2)) > N * cell * 0.2 || Math.abs(y - (this.gy + (N * cell) / 2)) > N * cell * 0.2;
    if (!far && now - this.filled < 2000) return;
    this.filled = now;
    if (far || Number.isNaN(this.gx)) {
      this.gx = Math.floor((x - (N * cell) / 2) / cell) * cell;
      this.gy = Math.floor((y - (N * cell) / 2) / cell) * cell;
    }
    const t = this.city.terrain!;
    const d = this.img.data;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        let h = t.heightAt(this.gx + (i + 0.5) * cell, this.gy + (j + 0.5) * cell);
        if (Number.isNaN(h)) h = hp;
        const v = Math.max(0, Math.min(65535, Math.round(h * 8)));
        const k = (j * N + i) * 4;
        d[k] = v >> 8;
        d[k + 1] = v & 255;
        d[k + 2] = 0;
        d[k + 3] = 255;
      }
    this.ctx.putImageData(this.img, 0, 0);
    this.tex.refresh();
  }

  /**
   * How strong the mountain look should be here (owner, 7 Oct 2026: in Zakopane's centre the parallax by the
   * railway looked bad – it is meant for mountains). Relief = spread of heights within GORY.rzezbaPromienM
   * (5th–95th percentile, so one stray sample doesn't count), ramped between rzezbaOdM and rzezbaPelnaM;
   * then damped by how much of a circle of zabudowaPromienM around the hero is covered by buildings.
   */
  private measure(hx: number, hy: number, hp: number) {
    const t = this.city.terrain!;
    const R = GORY.rzezbaPromienM * PX_PER_M;
    const hs: number[] = [hp];
    for (let ring = 1; ring <= 6; ring++) {
      const r = (R * ring) / 6;
      for (let k = 0; k < 16; k++) {
        const a = (k + (ring % 2) * 0.5) * (Math.PI / 8);
        const h = t.heightAt(hx + Math.cos(a) * r, hy + Math.sin(a) * r);
        if (!Number.isNaN(h)) hs.push(h);
      }
    }
    hs.sort((a, b) => a - b);
    const rzezba = hs[Math.floor(hs.length * 0.95)] - hs[Math.floor(hs.length * 0.05)];
    const od = GORY.rzezbaOdM, pelna = Math.max(od + 1, GORY.rzezbaPelnaM);
    const zRzezby = Math.max(0, Math.min(1, (rzezba - od) / (pelna - od)));

    const Rb = GORY.zabudowaPromienM * PX_PER_M;
    let pole = 0;
    for (const b of this.city.query({ x0: hx - Rb, y0: hy - Rb, x1: hx + Rb, y1: hy + Rb }).buildings) {
      if (b.open) continue;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      if ((cx - hx) ** 2 + (cy - hy) ** 2 > Rb * Rb) continue;
      pole += b.rings?.length ? poleBudynku(b.rings) : (b.x1 - b.x0) * (b.y1 - b.y0) * 0.7;
    }
    const zabudowa = pole / (Math.PI * Rb * Rb);
    const zOd = GORY.zabudowaOd, zPelna = Math.max(zOd + 0.001, GORY.zabudowaPelna);
    const gestosc = Math.max(0, Math.min(1, (zabudowa - zOd) / (zPelna - zOd)));
    const wlaczony = efektGorWlaczony();
    const tlumienie = 1 - gestosc * (1 - GORY.zabudowaZostaje);
    const cel = wlaczony ? zRzezby * tlumienie : 0;
    // Parallax only on sharp rises (owner, 7 Oct 2026): its own, higher relief ramp.
    const pOd = GORY.paralaksaOdM, pPelna = Math.max(pOd + 1, GORY.paralaksaPelnaM);
    this.parCel = wlaczony ? Math.max(0, Math.min(1, (rzezba - pOd) / (pPelna - pOd))) * tlumienie : 0;
    // The faint dark haze needs only a little relief (hills, Wawel), whatever the buildings.
    this.ciemno = wlaczony && rzezba >= GORY.przyciemnienieOdM;
    this.info = { rzezba: Math.round(rzezba), zabudowa: Math.round(zabudowa * 1000) / 1000, cel, moc: this.moc };
    return cel;
  }
  private parCel = 0;
  private par = 0;
  private ciemno = false;
  private ciemV = 0;

  update(now: number, dt: number, hx: number, hy: number) {
    if (!this.ctl) return;
    const t = this.city.terrain!;
    const hp = t.heightAt(hx, hy);
    if (Number.isNaN(hp)) {
      this.ctl.active = false;
      return;
    }
    // Strength: measured twice a second (at once after a jump), eased over GORY.przejscieS.
    const skok = Number.isNaN(this.zmX) || Math.hypot(hx - this.zmX, hy - this.zmY) > 200 * PX_PER_M;
    if (skok || now - this.zmierzono > 500) {
      this.cel = this.measure(hx, hy, hp);
      this.zmierzono = now;
      [this.zmX, this.zmY] = [hx, hy];
      if (skok) [this.moc, this.par] = [this.cel, this.parCel];
    }
    const ease = 1 - Math.exp(-dt / Math.max(0.05, GORY.przejscieS));
    this.moc += (this.cel - this.moc) * ease;
    if (Math.abs(this.cel - this.moc) < 0.002) this.moc = this.cel;
    this.par += (this.parCel - this.par) * ease;
    if (Math.abs(this.parCel - this.par) < 0.002) this.par = this.parCel;
    this.info.moc = this.moc;
    // Nothing to show (flat land): the filter is off, which also spares the graphics card.
    if (this.moc < 0.01 && !this.ciemno && this.ciemV < 0.003) {
      this.ctl.active = false;
      this.ax = NaN;
      return;
    }
    this.ctl.active = true;
    this.fill(hx, hy, hp, now);
    // A jump (a ride, a teleport, the first frame): the anchor joins the hero at once; else it trails by at most
    // GORY.paralaksaMaksPx (in the mock-up the shift never passed 40 picture px).
    if (Number.isNaN(this.ax) || Math.hypot(hx - this.ax, hy - this.ay) > 4 * GORY.paralaksaMaksPx) [this.ax, this.ay] = [hx, hy];
    const a = 1 - Math.exp(-dt / GORY.kotwicaS);
    this.ax += (hx - this.ax) * a;
    this.ay += (hy - this.ay) * a;
    const lag = Math.hypot(hx - this.ax, hy - this.ay);
    if (lag > GORY.paralaksaMaksPx) {
      this.ax = hx - ((hx - this.ax) * GORY.paralaksaMaksPx) / lag;
      this.ay = hy - ((hy - this.ay) * GORY.paralaksaMaksPx) / lag;
    }
    const v = this.scene.cameras.main.worldView;
    const u = this.ctl.u;
    u.view = [v.x, v.y, v.width, v.height];
    u.grid = [this.gx, this.gy, GORY.siatkaM * PX_PER_M, N];
    u.p = [hx, hy];
    u.d = [hx - this.ax, hy - this.ay];
    u.hp = hp;
    u.t = now / 1000;
    u.wind = Math.max(0.1, Math.min(2, weather.wind / 7));
    u.par = GORY.paralaksa * this.par;
    u.moc = this.moc;
    u.rozm = GORY.rozmycie;
    this.ciemV += ((this.ciemno ? GORY.przyciemnienie : 0) - this.ciemV) * (1 - Math.exp(-dt / Math.max(0.05, GORY.przejscieS)));
    u.ciem = this.ciemV;
    u.szer = Math.max(0.5, GORY.przyciemnienieSzerM);
  }
}

/** Footprint of a building (outer ring minus courtyards), cached per ring list. */
const POLA = new WeakMap<number[][], number>();
function poleBudynku(rings: number[][]) {
  let s = POLA.get(rings);
  if (s !== undefined) return s;
  s = 0;
  rings.forEach((r, i) => {
    let a = 0;
    for (let k = 0; k + 3 < r.length; k += 2) a += r[k] * r[k + 3] - r[k + 2] * r[k + 1];
    a += r[r.length - 2] * r[1] - r[0] * r[r.length - 1];
    s! += (i === 0 ? 1 : -1) * Math.abs(a / 2);
  });
  s = Math.max(0, s);
  POLA.set(rings, s);
  return s;
}
