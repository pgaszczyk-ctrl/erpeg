import type Phaser from 'phaser';
import { gameShot } from '../ui/snapshot';
import type { Kadr } from './flight';

/** Four ordinary views, painted in sequence: never increases the phone's live terrain texture budget. */
export async function landingPanorama(
  scene: Phaser.Scene,
  net: { x: number; y: number },
  angle: number,
  ensure: (x: number, y: number, radius: number) => Promise<unknown>,
  ready: () => boolean,
  follow: () => void,
  fogVisible: (visible: boolean) => void,
): Promise<Pick<Kadr, 'shot' | 'panorama'>> {
  const cam = scene.cameras.main;
  cam.preRender();
  const current = cam.worldView;
  const view = { x: current.x, y: current.y, width: current.width, height: current.height };
  const original = { x: cam.scrollX, y: cam.scrollY, bounds: cam.useBounds };
  // More terrain behind the traveller, where the visible approach starts.
  const left = view.x - view.width * (.5 + .3 * Math.cos(angle));
  const top = view.y - view.height * (.5 + .3 * Math.sin(angle));
  const span = 2;
  const result = document.createElement('canvas');
  // Cap the *whole* atlas to 2048 px on its long side (16 MB RGBA at most).
  const ratio = Math.min(1, 2048 / (2 * Math.max(scene.game.canvas.width, scene.game.canvas.height)));
  const tileW = Math.max(1, Math.floor(scene.game.canvas.width * ratio));
  const tileH = Math.max(1, Math.floor(scene.game.canvas.height * ratio));
  result.width = tileW * 2; result.height = tileH * 2;
  const ctx = result.getContext('2d')!;
  const frame = () => new Promise<void>(resolve => scene.game.events.once('postrender', resolve));
  const wait = async () => {
    await frame();
    const deadline = performance.now() + 45000;
    while (!ready()) {
      if (performance.now() > deadline) throw Error('Cannon landing terrain is not ready');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await frame();
  };
  fogVisible(false);
  cam.stopFollow();
  cam.useBounds = false;
  let restoringError: unknown;
  try {
    // Load the full approach area before starting to capture, not merely the net's immediate tile.
    await ensure(left + view.width, top + view.height, Math.hypot(view.width, view.height) + 64);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      cam.centerOn(left + (col + .5) * view.width, top + (row + .5) * view.height);
      cam.preRender();
      await wait();
      const shot = await gameShot(scene.game, { withHud: false, maxW: tileW });
      if (!shot) throw Error('Could not capture cannon landing terrain');
      ctx.drawImage(shot, col * tileW, row * tileH, tileW, tileH);
    }
  } finally {
    cam.useBounds = original.bounds;
    cam.setScroll(original.x, original.y);
    follow();
    cam.preRender();
    // The atlas may have recycled the original chunks: restore a complete live view before revealing it.
    try { await wait(); } catch (error) { restoringError = error; }
    finally { fogVisible(true); await frame(); }
  }
  if (restoringError) throw restoringError;
  return { shot: result, panorama: { fx: (net.x - left) / (span * view.width),
    fy: (net.y - top) / (span * view.height), span } };
}
