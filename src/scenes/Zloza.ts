import Phaser from 'phaser';
import { CityMap } from '../map/CityMap';
import { rng } from '../rng';
import { session } from '../quests';
import { today } from './Npcs';
import { makieta, rudaMakiety, rysowanaMakieta } from '../ui/makieta';
import { GORNICTWO } from '../content/sklepy';

export interface Zloze { id: string; x: number; y: number; obraz: Phaser.GameObjects.Image; blask?: Phaser.GameObjects.Image }
const PULS = typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEREN = new Set(['forest', 'scrub', 'heath', 'grass', 'meadow', 'rock', 'bare_rock', 'quarry']);

/** Geographic cells keep deposits stable across reloads, streamed maps and scale changes. */
export class Zloza {
  lista: Zloze[] = [];
  private next = 0;
  private probka?: { x: number; y: number };

  private dodaj(id: string, p: { x: number; y: number }, visible: (x: number, y: number) => boolean) {
    const key = rysowanaMakieta ? 'makieta-ruda' : 'item-ruda_zelaza';
    if (rysowanaMakieta && !this.scene.textures.exists(key)) {
      this.scene.textures.addCanvas(key, rudaMakiety())?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const obraz = this.scene.add.image(p.x, p.y, key)
      .setDisplaySize(rysowanaMakieta ? 25 : 30, rysowanaMakieta ? 17 : 30)
      .setOrigin(rysowanaMakieta ? 18 / 44 : .5, .85).setDepth(p.y).setVisible(this.dostepne({ id }) && visible(p.x, p.y));
    let blask: Phaser.GameObjects.Image | undefined;
    if (rysowanaMakieta) {
      const glow = 'makieta-ruda-blask';
      if (!this.scene.textures.exists(glow)) {
        const canvas = this.scene.textures.createCanvas(glow, 24, 24)!;
        const ctx = canvas.getContext();
        const falloff = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
        falloff.addColorStop(0, '#ffc676');
        falloff.addColorStop(.5, '#d9914580');
        falloff.addColorStop(1, '#cc802400');
        ctx.fillStyle = falloff;
        ctx.fillRect(0, 0, 24, 24);
        canvas.refresh();
      }
      blask = this.scene.add.image(p.x + 1, p.y - 7, glow).setDisplaySize(23, 19)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y + .1).setAlpha(.36).setVisible(obraz.visible);
    }
    this.lista.push({ id, ...p, obraz, blask });
  }

  constructor(private scene: Phaser.Scene, private city: CityMap) {}

  stan(z: Pick<Zloze, 'id'>) {
    const key = `zloze:${z.id}`, day = today();
    const old = session.daily[key];
    if (!old || old.d !== day) session.daily[key] = { d: day, n: 0, a: 0 };
    return session.daily[key];
  }

  dostepne(z: Pick<Zloze, 'id'>) {
    return this.stan(z).n < GORNICTWO.dziennie;
  }

  update(x: number, y: number, now: number, visible: (x: number, y: number) => boolean) {
    for (const z of this.lista) {
      const shown = this.dostepne(z) && visible(z.x, z.y);
      z.obraz.setVisible(shown);
      z.blask?.setVisible(shown).setAlpha(PULS ? .36 + .20 * Math.sin(now / 430) : .38);
    }
    if (now < this.next) return;
    this.next = now + 600;
    for (const z of this.lista.filter(z => Math.hypot(z.x-x,z.y-y)>700)) {
      z.obraz.destroy();
      z.blask?.destroy();
    }
    this.lista = this.lista.filter(z => z.obraz.active);
    if (makieta && !this.lista.some(z => z.id === 'makieta')) {
      if (!this.probka) {
        for (const d of [20, 30, 42, 58, 76]) {
          const candidates = Array.from({ length: 16 }, (_, i) => {
            const a = i * Math.PI / 8;
            return { x: session.startX + Math.cos(a) * d, y: session.startY + Math.sin(a) * d };
          });
          this.probka = candidates.find(p => visible(p.x, p.y) && this.city.surfaceAt(p.x, p.y) === 'trawa'
            && !this.city.roadAt(p.x, p.y) && this.city.isFree(p.x, p.y, 10, 6));
          if (this.probka) break;
        }
      }
      if (this.probka && Math.hypot(x - this.probka.x, y - this.probka.y) <= 600) this.dodaj('makieta', this.probka, visible);
    }
    const geo = this.city.toLatLon(x,y);
    const cx = Math.floor(geo.lon*1000), cy = Math.floor(geo.lat*1000);
    for (let dx=-3;dx<=3;dx++) for (let dy=-3;dy<=3;dy++) {
      const gx=cx+dx, gy=cy+dy, id=`${gx}:${gy}`;
      if (this.lista.some(z=>z.id===id)) continue;
      const r=rng((gx*73856093)^(gy*19349663));
      if (r()>.35) continue;
      const p=this.city.fromLatLon((gy+.15+r()*.7)/1000,(gx+.15+r()*.7)/1000);
      if (Math.hypot(p.x-x,p.y-y)>600 || !this.city.ready({x0:p.x-20,y0:p.y-20,x1:p.x+20,y1:p.y+20})) continue;
      if (!this.city.areaKindsAt(p.x,p.y).some(k=>TEREN.has(k)) || this.city.roadAt(p.x,p.y) || !this.city.isFree(p.x,p.y,12,12)) continue;
      if (this.city.places.some(t=>Math.hypot(t.door.x-p.x,t.door.y-p.y)<40)) continue;
      this.dodaj(id, p, visible);
    }
    // Old days do not occupy the save forever. Current-day counts survive despawning.
    const day=today();
    for (const key of Object.keys(session.daily)) if(key.startsWith('zloze:')&&session.daily[key].d!==day) delete session.daily[key];
  }
}
