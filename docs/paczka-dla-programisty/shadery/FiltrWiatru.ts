// SZKIC (wariant B) – jak podpiąć własny filtr w Phaser 4 (wzór: src/filters/Displacement.js
// i src/renderer/webgl/renderNodes/filters/FilterDisplacement.js w node_modules/phaser).
import Phaser from 'phaser';
import FRAG from './korony.frag.glsl?raw';

export class WiatrKorony extends Phaser.Filters.Controller {
  glMaska: WebGLTexture | null = null;
  czas = 0; sila = 1; poczatek = [0, 0]; rozmiar = [1024, 1024]; gracz = [0, 0, 0];
  constructor(camera: Phaser.Cameras.Scene2D.Camera, maska: string) {
    super(camera, 'FilterWiatrKorony');
    const f = camera.scene.sys.textures.getFrame(maska);
    this.glMaska = f ? (f.glTexture as unknown as WebGLTexture) : null;
  }
}

const Base = (Phaser.Renderer.WebGL.RenderNodes as any).BaseFilterShader;
export class FilterWiatrKorony extends Base {
  constructor(manager: unknown) { super('FilterWiatrKorony', manager, null, FRAG); }
  setupTextures(c: WiatrKorony, textures: unknown[]) { textures[1] = c.glMaska; }
  setupUniforms(c: WiatrKorony) {
    const pm = (this as any).programManager;
    pm.setUniform('uMaska', 1);
    pm.setUniform('uCzas', c.czas);
    pm.setUniform('uSila', c.sila);
    pm.setUniform('uPoczatek', c.poczatek);
    pm.setUniform('uRozmiar', c.rozmiar);
    pm.setUniform('uGracz', c.gracz);
  }
}

/** Raz przy starcie GameScene. */
export function zarejestruj(scene: Phaser.Scene) {
  const r = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  (r as any).renderNodes.addNodeConstructor('FilterWiatrKorony', FilterWiatrKorony);
}
// Użycie: obrazKoronKawalka.filters!.internal.add(new WiatrKorony(scene.cameras.main, 'maska-kawalka-<id>'));
// Uwaga: filtr = dodatkowy pass renderowania na obiekt co klatkę. Wariant A (klatki) jest tańszy.
