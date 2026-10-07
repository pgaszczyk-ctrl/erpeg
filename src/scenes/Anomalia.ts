import Phaser from 'phaser';
import { TEX } from '../art';
import { SKALA_POSTACI } from '../skala';
import { ANOMALIA as A } from '../content/anomalia';
import { weather } from '../weather';
import { grzmot } from '../sfx';
import { session } from '../quests';
import type { CityMap } from '../map/CityMap';
import type { DialogRequest } from './GameScene';

// Anomalie pogodowe (content/anomalia.ts): fires once per login when the hero walks out past A.odKm from the centre.
// The picture effects are HTML layers and a CSS filter on the game canvas, so the HUD isn't touched by the filter.

/** Login (session nonce) it already fired in. */
let byloW = -1;

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class Anomalia {
  busy = false;
  private prev = NaN;
  private next = 0;

  constructor(private scene: Phaser.Scene, private city: CityMap, private host: { player: Phaser.GameObjects.Sprite; dialog: (r: DialogRequest) => void }) {}

  update(now: number, wolno: boolean) {
    if (this.busy || now < this.next || byloW === session.nonce) return;
    this.next = now + 1000;
    const p = this.host.player;
    const d = km(this.city.toLatLon(p.x, p.y), A.srodek);
    const before = this.prev;
    this.prev = d;
    // Walking out across the line (a ride or a login far away doesn't count).
    if (!wolno || Number.isNaN(before) || before >= A.odKm || d < A.odKm || d - before > 1) return;
    byloW = session.nonce;
    this.play();
  }

  /** For tests: play it now. */
  play() {
    this.busy = true;
    const sc = this.scene, p = this.host.player;
    p.anims.stop();
    const ex = sc.add.image(p.x, p.y - 24 * SKALA_POSTACI, TEX.exclaim).setDepth(1_300_000);
    sc.tweens.add({ targets: ex, y: ex.y - 3, duration: 250, yoyo: true, repeat: -1 });
    const looks: [string, boolean][] = [['side-0', false], ['side-0', true], ['up-0', false], ['down-0', false]];
    looks.forEach(([f, flip], i) => sc.time.delayedCall(300 + i * 500, () => p.setFrame(f).setFlipX(flip)));
    const canvas = sc.game.canvas;
    const warstwa = (css: string) => {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;${css}`;
      document.body.append(el);
      return el;
    };
    const ciemno = warstwa('background:#05070d;transition:opacity 1.2s;');
    const biel = warstwa('background:#fff;');
    const slonce = warstwa('background:radial-gradient(circle at 70% 20%, rgba(255,236,170,0.55), rgba(255,214,120,0.18) 60%, rgba(255,200,90,0.08));transition:opacity 1s;');
    const at = (ms: number, f: () => void) => sc.time.delayedCall(ms, f);
    // 1) The sky goes dark.
    at(500, () => (ciemno.style.opacity = '0.62'));
    // 2) Lightning: the picture suddenly black and white, a white flash, black, white again; thunder.
    at(2000, () => {
      grzmot();
      sc.cameras.main.shake(260, 0.006);
      canvas.style.filter = 'grayscale(1) contrast(3.2) brightness(1.5)';
      ciemno.style.transition = 'none';
      ciemno.style.opacity = '0';
      biel.style.opacity = '0.9';
    });
    at(2090, () => (biel.style.opacity = '0'));
    at(2170, () => (canvas.style.filter = 'grayscale(1) contrast(4) brightness(0.35)'));
    at(2280, () => ((biel.style.opacity = '0.7'), (canvas.style.filter = 'grayscale(1) contrast(3.2) brightness(1.6)')));
    at(2380, () => (biel.style.opacity = '0'));
    // 3) At once the sun.
    at(2650, () => {
      canvas.style.transition = 'filter 0.8s';
      canvas.style.filter = 'brightness(1.22) saturate(1.35)';
      slonce.style.opacity = '1';
    });
    // 4) A moment of the strongest wind (trees, steam and clouds follow weather.wind).
    const wiatr = weather.wind;
    at(4200, () => {
      weather.wind = A.wichura;
      slonce.style.opacity = '0.4';
      canvas.style.filter = 'brightness(1.05) saturate(1.1)';
    });
    // 5) Calm: back to the real weather.
    at(6800, () => {
      weather.wind = wiatr;
      slonce.style.opacity = '0';
      canvas.style.filter = '';
    });
    at(7900, () => {
      canvas.style.transition = '';
      for (const el of [ciemno, biel, slonce]) el.remove();
      ex.destroy();
      this.host.dialog({
        title: A.tytul,
        text: A.tekst,
        buttons: [A.przycisk],
        onChoose: () => this.host.dialog({ title: 'Exp-lore', text: A.drugi, buttons: [A.drugiPrzycisk], onChoose: () => (this.busy = false) }),
      });
    });
  }
}
