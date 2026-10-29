import { updateMusic } from './music';
import { loadingMapVisible } from './ui/loadingMap';
import { gear } from './inventory';
import { ustawGre } from './sesja';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { ArenaScene } from './scenes/ArenaScene';
import { installTouchControls } from './controls';
import { installErrorLog, watchGraphics, report } from './errlog';
import { installFpsLog } from './fpslog';
import { session } from './quests';
import { codeLink } from './ui/codeCard';
import { api } from './api';
import { watchUpdates } from './update';
import { catchGoogleReturn } from './google';
import { installLeaveGuard } from './guard';
import { TEST, WERSJA_TEST } from './version';
import { OSTROSC, cssSize, watchSpeed } from './screen';
import { lapOferteInstalacji } from './instalacja';
import { pelnyEkranOdDotyku } from './ui/poziomo';
import { szybszeSortowanie } from './sortowanie';

// The Google sign-in window only stores the login and closes (no game there).
if (catchGoogleReturn()) throw new Error('google sign-in window');
installErrorLog();
lapOferteInstalacji();
pelnyEkranOdDotyku();
// The test server says so all the time, so nobody mistakes it for the real game.
if (TEST) {
  const b = document.createElement('div');
  b.id = 'test-badge';
  b.textContent = `SERWER TESTOWY · ${WERSJA_TEST}-test`;
  document.body.append(b);
}

szybszeSortowanie();

// The tilted camera (walka/live.ts SKROT): the game camera squashes the map vertically (`setZoom(z, z·SKROT)`),
// so every sprite drawn by a camera with `wyprost` set is stretched back by it around its own origin – people,
// monsters, carts stand upright instead of looking flattened. Images (map chunks, mist, decals) stay flat.
// Patched before any sprite exists: a game object keeps the render function it had when it was made.
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = Phaser.GameObjects.Sprite.prototype as unknown as { renderWebGL: (...a: any[]) => void };
  const orig = proto.renderWebGL;
  proto.renderWebGL = function (this: unknown, renderer: unknown, src: { _scaleY: number; plaski?: boolean }, ctx: { camera: { wyprost?: number } }, parent: unknown) {
    const k = ctx?.camera?.wyprost;
    if (!k || k === 1 || src.plaski) return orig.call(this, renderer, src, ctx, parent);
    const sy = src._scaleY;
    src._scaleY = sy * k;
    try {
      orig.call(this, renderer, src, ctx, parent);
    } finally {
      src._scaleY = sy;
    }
  };
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b2a1b',
  pixelArt: true,
  // The canvas has OSTROSC pixels per CSS pixel (screen.ts); it is resized by hand below.
  scale: {
    mode: Phaser.Scale.NONE,
    width: cssSize(document.getElementById('game')!).w * OSTROSC,
    height: cssSize(document.getElementById('game')!).h * OSTROSC,
    zoom: 1 / OSTROSC,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Touch, keyboard and mouse clicks are handled natively in controls.ts (see there why).
  input: { touch: false, keyboard: false },
  // Phaser's own sound is not used (sfx.ts makes the few sounds); without it iPhones don't fail to start an audio device.
  audio: { noAudio: true },
  scene: [BootScene, GameScene, ArenaScene, UIScene],
});

installTouchControls(document.getElementById('game')!);
// Follow the window (what Scale.RESIZE did), keeping OSTROSC canvas pixels per CSS pixel.
const fit = () => {
  const { w, h } = cssSize(document.getElementById('game')!);
  if (game.scale.width !== w * OSTROSC || game.scale.height !== h * OSTROSC) game.scale.resize(w * OSTROSC, h * OSTROSC);
};
window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
watchSpeed(() => game.loop.actualFps, () => game.scene.isActive('game'));
// Under 40 frames a second (or many hitches) while playing: a report to the error log.
installFpsLog(game);
// A picture enlarged by an uneven amount (phone 3× over a 2× canvas) looks better smoothed than blocky.
if ((window.devicePixelRatio || 1) / OSTROSC !== Math.round((window.devicePixelRatio || 1) / OSTROSC)) game.canvas.style.imageRendering = 'auto';
installLeaveGuard(game);
ustawGre(game, () => (session.name && session.idik ? codeLink(session.name, session.idik) : null));
// A new version went live: a bar offers to save and reload (every 30 min).
watchUpdates(game);
// Reloading after lost graphics goes straight back into the game (the link loads the character).
watchGraphics(
  game.canvas,
  () => (session.name && session.idik ? codeLink(session.name, session.idik) : null),
  async () => {
    if (!session.token) return;
    const s = game.scene.getScene('game') as Phaser.Scene & { saveForReload?: () => Promise<void> };
    await s.saveForReload?.();
    await api.logout(session.token);
  },
);
// Graphics errors (e.g. out of GPU memory: new pictures stay invisible) go to the error log.
setInterval(() => {
  const gl = (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
  const e = gl?.getError?.();
  if (e) report('gl', `Błąd grafiki WebGL ${e}${e === 0x0505 ? ' (brak pamięci)' : ''}, tekstur: ${game.textures.getTextureKeys().length}`);
}, 5000);

// Handy for debugging from the browser console.
(window as unknown as { __game: Phaser.Game }).__game = game;
(window as unknown as { __session: typeof session }).__session = session;
(window as unknown as { __gear: typeof gear }).__gear = gear;


// Music starts with the authenticated, revealed map and continues through paused dialogs.
game.events.on('step', () => {
  const scene = game.scene.getScene('game') as GameScene | undefined;
  const running = game.scene.isActive('game') || game.scene.isPaused('game');
  const ready = running && scene?.player && session.token && !loadingMapVisible() && !document.getElementById('menu');
  const state = ready ? scene.musicState() : null;
  if (state && game.scene.isActive('arena')) state.combat = true;
  updateMusic(state);
});
