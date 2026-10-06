import Phaser from 'phaser';
import type { CityMap } from './CityMap';
import { PX_PER_M } from './CityMap';
import { GORY } from '../content/gory';
import { weather } from '../weather';

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
  float b = clamp(floor(uHp / 10.0) - floor((uHp - dh) / 10.0), -2.0, 4.0);
  if (b >= 1.0) {
    // Blur of the layers below (like the mock-up's mipmap levels 0.4 + 0.6 b), in map px.
    float r = 0.5 * exp2(0.4 + 0.6 * b);
    vec2 ox = vec2(r / uView.z, 0.0);
    vec2 oy = vec2(0.0, r / uView.w);
    vec3 sum = c;
    sum += texture2D(uMainSampler, tuv + ox).rgb + texture2D(uMainSampler, tuv - ox).rgb;
    sum += texture2D(uMainSampler, tuv + oy).rgb + texture2D(uMainSampler, tuv - oy).rgb;
    sum += texture2D(uMainSampler, tuv + ox + oy).rgb + texture2D(uMainSampler, tuv - ox - oy).rgb;
    sum += texture2D(uMainSampler, tuv + ox - oy).rgb + texture2D(uMainSampler, tuv - ox + oy).rgb;
    c = sum / 9.0;
    c = mix(c, vec3(178.0, 198.0, 210.0) / 255.0, 0.04 * b);
  }
  if (dh > 20.0) {
    float f = dh < 50.0 ? 0.16 * (dh - 20.0) / 30.0 : min(0.8, 0.16 + 0.64 * (dh - 50.0) / 50.0);
    vec2 m = w / ${(PX_PER_M / 3.84).toFixed(4)} + vec2(uT * 6.0 * uWind, uT * 1.8);
    f *= 0.7 + 0.6 * (vn(m / 64.0) * 0.65 + vn(m / 24.0) * 0.35);
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
    this.ctl.u = { view: [0, 0, 1, 1], grid: [0, 0, 1, N], p: [0, 0], d: [0, 0], hp: 0, t: 0, wind: 0.5, par: GORY.paralaksa, flip: 1, hflip: 1 };
    cam.filters.external.add(this.ctl);
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

  update(now: number, dt: number, hx: number, hy: number) {
    if (!this.ctl) return;
    const t = this.city.terrain!;
    const hp = t.heightAt(hx, hy);
    if (Number.isNaN(hp)) {
      this.ctl.active = false;
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
    u.par = GORY.paralaksa;
  }
}
