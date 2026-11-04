import Phaser from 'phaser';
import type { Player } from '../objects/Player';
import type { Armata3D } from './armata3d';

// The end of a cannon trip on the real map (owner, 1 Nov 2026): the hero drops into the landing net, the net
// bounces (the artist's `catch` clip), a little smoke/dust puffs out of it and he hops down to the exit spot.

export const LADOWANIE = {
  /** In the net before hopping down. */
  wSiatceMs: 380,
  /** The hop from the net to the exit spot. */
  zeskokMs: 420,
  /** How high the hop arcs, map px. */
  zeskokPx: 7,
  /** Smoke puffs. */
  klebow: 9,
  dymMs: 900,
};

let teksturaGotowa = false;
function tekstura(scene: Phaser.Scene) {
  if (teksturaGotowa && scene.textures.exists('ma-dym')) return;
  teksturaGotowa = true;
  if (scene.textures.exists('ma-dym')) return;
  // A small pixel puff: ink outline, grey body, white light.
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const g = c.getContext('2d')!;
  const kolo = (r: number, k: string, dx = 0, dy = 0) => { g.fillStyle = k; g.beginPath(); g.arc(6 + dx, 6 + dy, r, 0, Math.PI * 2); g.fill(); };
  kolo(5.5, '#1e1a24');
  kolo(4.6, '#c9d2d8');
  kolo(3.4, '#f4f6f7', -1, -1);
  const d = g.getImageData(0, 0, 12, 12);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0;
  g.putImageData(d, 0, 0);
  scene.textures.addCanvas('ma-dym', c)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Puffs of smoke bursting from a point and drifting up. */
export function dymek(scene: Phaser.Scene, x: number, y: number, depth: number) {
  tekstura(scene);
  const L = LADOWANIE;
  for (let i = 0; i < L.klebow; i++) {
    const a = (i / L.klebow) * Math.PI * 2 + Math.random() * 0.5;
    const d = 6 + Math.random() * 7;
    const p = scene.add.image(x, y, 'ma-dym').setDepth(depth).setScale(0.35).setAlpha(0.95);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d * 0.55 - 4 - Math.random() * 5,
      scale: 0.7 + Math.random() * 0.4,
      alpha: 0,
      duration: L.dymMs * (0.7 + Math.random() * 0.5),
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/** Hero shown in the net, the net bounces, smoke, then the hop down. Resolves when he stands at `wyjscie`. */
export function wSiatke(
  scene: Phaser.Scene,
  player: Player,
  siatka: { x: number; y: number },
  wyjscie: { x: number; y: number },
  armata?: Armata3D,
  still = false,
): Promise<void> {
  player.setPosition(siatka.x, siatka.y);
  player.setAlpha(1);
  if (still) {
    player.setPosition(wyjscie.x, wyjscie.y);
    return Promise.resolve();
  }
  armata?.lap();
  dymek(scene, siatka.x, siatka.y - 2, siatka.y + 50);
  const L = LADOWANIE;
  return new Promise((done) => {
    // Bounce with the net.
    scene.tweens.add({
      targets: player,
      y: siatka.y + 3,
      duration: L.wSiatceMs / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        const od = { x: player.x, y: player.y }, stan = { t: 0 };
        scene.tweens.add({
          targets: stan,
          t: 1,
          duration: L.zeskokMs,
          ease: 'Linear',
          onUpdate: () => {
            const t = stan.t;
            player.setPosition(od.x + (wyjscie.x - od.x) * t, od.y + (wyjscie.y - od.y) * t - Math.sin(Math.PI * t) * L.zeskokPx);
          },
          onComplete: () => {
            player.setPosition(wyjscie.x, wyjscie.y);
            dymek(scene, wyjscie.x, wyjscie.y + 6, wyjscie.y + 8);
            done();
          },
        });
      },
    });
  });
}

/** Pinball arrival (metro cities): the lid flies open with steam, the hero springs out of the hatch and lands beside it,
 *  the lid closes. Resolves when he stands at `wyjscie`. */
export function zWlazu(
  scene: Phaser.Scene,
  player: Player,
  wlaz: { x: number; y: number; lap(): void; zamknij(): Promise<void> } | undefined,
  wyjscie: { x: number; y: number },
  still = false,
): Promise<void> {
  const od = wlaz ? { x: wlaz.x, y: wlaz.y } : { ...wyjscie };
  player.setAlpha(1);
  if (still || !wlaz) {
    player.setPosition(wyjscie.x, wyjscie.y);
    return Promise.resolve();
  }
  wlaz.lap();
  player.setPosition(od.x, od.y);
  const L = LADOWANIE, stan = { t: 0 };
  return new Promise((done) => {
    scene.time.delayedCall(140, () =>
      scene.tweens.add({
        targets: stan,
        t: 1,
        duration: L.zeskokMs + 120,
        ease: 'Linear',
        onUpdate: () => {
          const t = stan.t;
          player.setPosition(od.x + (wyjscie.x - od.x) * t, od.y + (wyjscie.y - od.y) * t - Math.sin(Math.PI * t) * L.zeskokPx * 2);
        },
        onComplete: () => {
          player.setPosition(wyjscie.x, wyjscie.y);
          dymek(scene, wyjscie.x, wyjscie.y + 6, wyjscie.y + 8);
          void wlaz.zamknij();
          done();
        },
      }),
    );
  });
}
