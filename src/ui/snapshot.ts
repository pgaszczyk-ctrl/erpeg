import type Phaser from 'phaser';

// A picture of what the game shows right now (the Phaser canvas; HTML windows
// are not in it): for bug reports (a small JPEG) and for the achievement
// cards players share. `withHud: false` hides the HUD scene for that frame.

export function gameShot(game: Phaser.Game, opts: { maxW?: number; quality?: number; withHud?: boolean } = {}): Promise<HTMLCanvasElement | null> {
  const { maxW = 540, withHud = true } = opts;
  const ui = game.scene.getScene('ui');
  const hide = !withHud && ui && ui.sys.isVisible();
  if (hide) ui.sys.setVisible(false);
  return new Promise((resolve) => {
    let done = false;
    const finish = (c: HTMLCanvasElement | null) => {
      if (done) return;
      done = true;
      if (hide) ui.sys.setVisible(true);
      resolve(c);
    };
    // Some phones never answer (context lost): give up after a moment.
    setTimeout(() => finish(null), 2500);
    try {
      game.renderer.snapshot((img) => {
        const src = img as HTMLImageElement;
        const draw = () => {
          const k = Math.min(1, maxW / src.width);
          const c = document.createElement('canvas');
          c.width = Math.round(src.width * k);
          c.height = Math.round(src.height * k);
          c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
          finish(c);
        };
        if (src.complete && src.width) draw();
        else {
          src.onload = draw;
          src.onerror = () => finish(null);
        }
      });
    } catch {
      finish(null);
    }
  });
}

/** The same as a small JPEG data URL (bug reports), or null. */
export async function gameShotJpeg(game: Phaser.Game, maxW = 540, quality = 0.6): Promise<string | null> {
  const c = await gameShot(game, { maxW });
  if (!c) return null;
  try {
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}
