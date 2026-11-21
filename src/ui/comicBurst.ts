import Phaser from 'phaser';
import { tx } from '../i18n';

// Bounded, short-lived world effects. Screen size stays readable at every map zoom.
// 'hit' = damage the hero deals (a comic star, gold for a strong blow, orange and bigger for a critical);
// 'miss' = the grey PUDŁO bubble; 'rana' = damage the hero takes (plain red numbers sinking from him, no star),
// so the two can never be mistaken for each other (owner, 20 Nov 2026).
const bursts = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container[]>();
export interface BurstOpcje { mocny?: boolean; krytyk?: boolean }
const MAKS = 12;

function liczba(n: number) {
  if (n >= 10 || Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toLocaleString('pl-PL');
}

export function comicBurst(scene: Phaser.Scene, x: number, y: number, kind: 'hit' | 'miss' | 'rana', damage = 0, o: BurstOpcje = {}) {
  if (kind !== 'miss' && (!Number.isFinite(damage) || damage <= 0)) return;
  let list = bursts.get(scene);
  if (!list) { list = []; bursts.set(scene, list); }
  if (list.length >= MAKS) { const old = list.shift()!; scene.tweens.killTweensOf(old); old.destroy(); }
  const krytyk = kind === 'hit' && !!o.krytyk, mocny = kind === 'hit' && !krytyk && !!o.mocny;
  const size = krytyk ? 1.7 : mocny ? 1.4 : kind === 'hit' ? (damage > 20 ? 1.3 : damage > 10 ? 1.15 : 1) : kind === 'rana' ? 0.95 : 1;
  const zoom = Math.max(1, scene.cameras.main.zoom);
  const rounded = Math.round(damage);
  const plain = (kind === 'hit' && damage < 10 && !mocny && !krytyk) || kind === 'rana';
  const text = kind === 'miss' ? tx('PUDŁO', 'MISS') : kind === 'rana' ? `-${liczba(damage)}` : `${rounded}${plain ? '' : '!'}`;
  const kolor = kind === 'miss' ? '#373a45' : kind === 'rana' ? '#ff4a3d' : krytyk ? '#7a1d0e' : plain ? '#fff1c9' : '#a4291f';
  const label = scene.add.text(0, 0, text, {
    fontFamily: '"Comic Neue", "Trebuchet MS", sans-serif', fontStyle: 'bold',
    fontSize: kind === 'miss' ? '16px' : kind === 'rana' ? '19px' : '23px', color: kolor,
    stroke: plain ? (kind === 'rana' ? '#1e0a0a' : '#291b12') : undefined, strokeThickness: plain ? 3 : 0, resolution: 2,
  }).setOrigin(.5);
  const w = plain ? label.width : Math.max(44, label.width + 20), h = plain ? label.height : kind === 'miss' ? 31 : 42;
  const g = scene.add.graphics();
  if (!plain) {
    const points: Phaser.Math.Vector2[] = [];
    const ramion = krytyk ? 12 : 10;
    for (let i = 0; i < ramion * 2; i++) {
      const angle = i * Math.PI / ramion, r = i % 2 ? (krytyk ? .62 : .74) : 1;
      points.push(new Phaser.Math.Vector2(Math.cos(angle) * w / 2 * r, Math.sin(angle) * h / 2 * r));
    }
    g.fillStyle(0x19171b).fillPoints(points.map(p => new Phaser.Math.Vector2(p.x + 2, p.y + 3)), true);
    g.fillStyle(kind === 'miss' ? 0xe9edf1 : krytyk ? 0xff9a2e : 0xffdf77).fillPoints(points, true);
    if (krytyk) g.fillStyle(0xffe27a).fillPoints(points.map(p => new Phaser.Math.Vector2(p.x * .62, p.y * .62)), true);
    g.lineStyle(2.5, 0x19171b).strokePoints(points, true);
  }
  // Keep adjacent hits/misses legible instead of painting one number over another: try above, then to the sides.
  let top = y, left = x;
  const zajete = (bx: number, by: number) => list!.some(b => Math.abs((b.x - bx) * zoom) < ((b.getData('comicWidth') ?? w) + w * size) / 2 + 4
    && Math.abs((b.y - by) * zoom) < ((b.getData('comicHeight') ?? h) + h * size) / 2 + 4);
  for (let i = 0; i < 6 && zajete(left, top); i++) {
    if (i % 2 === 0) top -= (h * size + 6) / zoom;
    else left = x + (i % 4 === 1 ? 1 : -1) * (w * size * .6) / zoom;
  }
  const b = scene.add.container(left, top, [g, label]).setDepth(1_060_000 + (krytyk ? 2 : mocny ? 1 : 0)).setScale(.82 * size / zoom);
  b.setData({ comicWidth: w * size, comicHeight: h * size });
  b.setName(`comic-${kind}:${text}`); list.push(b);
  b.once('destroy', () => { const i = list!.indexOf(b); if (i >= 0) list!.splice(i, 1); });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) b.setScale(size / zoom);
  else if (krytyk || mocny) {
    // A punch: overshoot, settle, a short wobble.
    b.setScale(.5 * size / zoom);
    scene.tweens.add({ targets: b, scale: size * 1.18 / zoom, duration: 90, ease: 'Back.Out',
      onComplete: () => { if (b.active) scene.tweens.add({ targets: b, scale: size / zoom, duration: 120, ease: 'Sine.Out' }); } });
    if (krytyk) scene.tweens.add({ targets: b, angle: { from: -9, to: 0 }, duration: 260, ease: 'Elastic.Out' });
  } else scene.tweens.add({ targets: b, scale: size / zoom, duration: 105, ease: 'Back.Out' });
  // The hero's wounds sink and drift aside; the hero's blows rise.
  const dy = reduced ? 0 : (kind === 'rana' ? 16 : -(krytyk ? 32 : 25)) / zoom;
  const dx = reduced || kind !== 'rana' ? 0 : 6 / zoom;
  scene.tweens.add({ targets: b, y: b.y + dy, x: b.x + dx, alpha: 0, delay: krytyk ? 420 : mocny ? 340 : 280, duration: 460, ease: 'Sine.In', onComplete: () => b.destroy() });
}
