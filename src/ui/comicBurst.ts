import Phaser from 'phaser';
import { tx } from '../i18n';

// Bounded, short-lived world effects. Screen size stays readable at every map zoom.
const bursts = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container[]>();
export function comicBurst(scene: Phaser.Scene, x: number, y: number, kind: 'hit' | 'miss', damage = 0) {
  if (kind === 'hit' && (!Number.isFinite(damage) || damage <= 0)) return;
  let list = bursts.get(scene);
  if (!list) { list = []; bursts.set(scene, list); }
  if (list.length >= 12) { const old = list.shift()!; scene.tweens.killTweensOf(old); old.destroy(); }
  const size = kind === 'hit' ? (damage > 20 ? 1.35 : damage > 10 ? 1.2 : 1) : 1;
  const zoom = Math.max(1, scene.cameras.main.zoom);
  const text = kind === 'miss' ? tx('PUDŁO', 'MISS') : `${Number(damage < .1 ? damage.toPrecision(1) : damage.toFixed(1)).toLocaleString(tx('pl-PL', 'en-GB'), { maximumFractionDigits: 6 })}!`;
  const label = scene.add.text(0, 0, text, { fontFamily: '"Alegreya Sans", "Trebuchet MS", sans-serif', fontStyle: 'bold italic', fontSize: kind === 'miss' ? '16px' : '23px', color: kind === 'miss' ? '#373a45' : '#a4291f', resolution: 2 }).setOrigin(.5);
  const w = Math.max(44, label.width + 20), h = kind === 'miss' ? 31 : 42;
  const g = scene.add.graphics();
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10, r = i % 2 ? .74 : 1;
    points.push(new Phaser.Math.Vector2(Math.cos(angle) * w / 2 * r, Math.sin(angle) * h / 2 * r));
  }
  g.fillStyle(0x19171b).fillPoints(points.map(p => new Phaser.Math.Vector2(p.x + 2, p.y + 3)), true);
  g.fillStyle(kind === 'miss' ? 0xe9edf1 : 0xffdf77).fillPoints(points, true);
  g.lineStyle(2.5, 0x19171b).strokePoints(points, true);
  // Keep adjacent hits/misses legible instead of painting one number over another.
  let top = y;
  for (let i = 0; i < 5 && list.some(b => Math.abs((b.x - x) * zoom) < ((b.getData('comicWidth') ?? w) + w) / 2 + 4 && Math.abs((b.y - top) * zoom) < ((b.getData('comicHeight') ?? h) + h) / 2 + 4); i++) top -= (h + 6) / zoom;
  const b = scene.add.container(x, top, [g, label]).setDepth(1_060_000).setScale(.82 * size / zoom);
  b.setData({ comicWidth: w * size, comicHeight: h * size });
  b.setName(`comic-${kind}:${text}`);list.push(b);
  b.once('destroy', () => { const i = list!.indexOf(b); if (i >= 0) list!.splice(i, 1); });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) scene.tweens.add({ targets: b, scale: size / zoom, duration: 105, ease: 'Back.Out' });
  else b.setScale(size / zoom);
  scene.tweens.add({ targets: b, y: b.y - (reduced ? 0 : 25 / zoom), alpha: 0, delay: 280, duration: 460, onComplete: () => b.destroy() });
}
