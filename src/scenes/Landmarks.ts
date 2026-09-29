// The artist's landmarks on squares (pack 04d): dragon fountains, public dragon
// cauldrons and clock towers, as sprites sorted by their base (the hero walks
// behind the top) with a small solid base. Made per 1 km cell once its tiles
// are loaded. The cauldron on Lublin's Rynek glows once Martin's quest is done.

import Phaser from 'phaser';
import { PX_PER_M, pointInRings, type CityMap } from '../map/CityMap';
import { plazaLandmark, baseBox, type Landmark } from '../map/landmarks';
import { MIEJSCA } from '../content/swiat';
import { MARTIN } from '../content/postacie';
import { session } from '../quests';

const KM = 1000 * PX_PER_M;
type Box = { x0: number; y0: number; x1: number; y1: number };

export class Landmarks {
  private done = new Set<string>();
  private solid: Box[] = [];
  private glow: Phaser.GameObjects.Graphics | null = null;
  private rynek: { x: number; y: number } | null = null;

  constructor(private scene: Phaser.Scene, private city: CityMap) {
    if (city.id === 'lublin' && scene.textures.exists(`swiat-${MIEJSCA.kociol.plik}`)) {
      const p = city.fromLatLon(MIEJSCA.kociolLublin.lat, MIEJSCA.kociolLublin.lon);
      this.rynek = p;
    }
  }

  update(px: number, py: number) {
    const cx = Math.floor(px / KM);
    const cy = Math.floor(py / KM);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) this.cell(x, y);
    if (this.rynek && !this.done.has('rynek') && this.city.ready({ x0: this.rynek.x - 60, y0: this.rynek.y - 60, x1: this.rynek.x + 60, y1: this.rynek.y + 60 })) {
      this.done.add('rynek');
      // On the square in front of the Crown Tribunal (the middle of the Rynek), else near the spot.
      const t = this.city.findBuilding(MIEJSCA.kociolLublin.przy);
      const f = t ? this.city.freeNear((t.x0 + t.x1) / 2, t.y1 + 9) : this.onSquare(this.rynek.x, this.rynek.y) ?? this.city.freeNear(this.rynek.x, this.rynek.y);
      this.put('kociol', f.x, f.y);
      this.rynek = f;
    }
    // Martin's cauldron: lit with honey-coloured light once the wood is brought.
    if (this.rynek && this.done.has('rynek') && session.missions[MARTIN.zadanie.id] === 'done' && !this.glow) {
      const { x, y } = this.rynek;
      this.glow = this.scene.add.graphics().setDepth(y + 0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.glow.fillStyle(0xffb340, 0.55).fillEllipse(x, y - 17, 16, 7).fillStyle(0xffd27a, 0.4).fillEllipse(x, y - 19, 26, 14);
      this.scene.tweens.add({ targets: this.glow, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  /** The open middle of the square near (x, y): the grid point closest to its centre with room around it. */
  private onSquare(x: number, y: number) {
    const R = 150 * PX_PER_M;
    const sq = this.city.query({ x0: x - R, y0: y - R, x1: x + R, y1: y + R }).areas
      .filter((a) => a.kind === 'plaza')
      .sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - x, (a.y0 + a.y1) / 2 - y) - Math.hypot((b.x0 + b.x1) / 2 - x, (b.y0 + b.y1) / 2 - y))[0];
    if (!sq) return null;
    const cx = (sq.x0 + sq.x1) / 2, cy = (sq.y0 + sq.y1) / 2;
    let best: { x: number; y: number } | null = null, bd = Infinity;
    for (let gx = sq.x0; gx <= sq.x1; gx += 4) {
      for (let gy = sq.y0; gy <= sq.y1; gy += 4) {
        if (!pointInRings(sq.rings, gx, gy)) continue;
        let room = true;
        for (const [dx, dy] of [[-12, 0], [12, 0], [0, -30], [0, 10], [-9, -20], [9, -20]]) if (this.city.buildingAt(gx + dx, gy + dy) || !pointInRings(sq.rings, gx + dx * 0.6, gy + Math.max(dy, -8))) room = false;
        const d = Math.hypot(gx - cx, gy - cy);
        if (room && d < bd) [best, bd] = [{ x: gx, y: gy }, d];
      }
    }
    return best;
  }

  blocked(x: number, y: number) {
    for (const b of this.solid) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
    return false;
  }

  private cell(cx: number, cy: number) {
    const key = `${cx}:${cy}`;
    if (this.done.has(key)) return;
    const box = { x0: cx * KM, y0: cy * KM, x1: (cx + 1) * KM, y1: (cy + 1) * KM };
    if (!this.city.ready(box)) return;
    this.done.add(key);
    for (const a of this.city.query(box).areas) {
      // Each square once: in the cell holding the middle of its bounding box.
      const mx = (a.x0 + a.x1) / 2, my = (a.y0 + a.y1) / 2;
      if (mx < box.x0 || mx >= box.x1 || my < box.y0 || my >= box.y1) continue;
      const l = plazaLandmark(this.city, a);
      if (!l) continue;
      if (this.rynek && l.kind === 'kociol' && Math.hypot(l.x - this.rynek.x, l.y - this.rynek.y) < 200 * PX_PER_M) continue;
      this.put(l.kind, l.x, l.y);
    }
  }

  private put(kind: Landmark, x: number, y: number) {
    const key = `swiat-${MIEJSCA[kind].plik}`;
    if (!this.scene.textures.exists(key)) return;
    this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(1 / 3).setDepth(y);
    this.solid.push(baseBox(kind, x, y));
  }
}
