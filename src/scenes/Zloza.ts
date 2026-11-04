import Phaser from 'phaser';
import { CityMap } from '../map/CityMap';
import { rng } from '../rng';
import { session } from '../quests';
import { today } from './Npcs';
import { GORNICTWO } from '../content/sklepy';

export interface Zloze { id: string; x: number; y: number; obraz: Phaser.GameObjects.Image }
const TEREN = new Set(['forest', 'scrub', 'heath', 'grass', 'meadow', 'rock', 'bare_rock', 'quarry']);

/** Geographic cells keep deposits stable across reloads, streamed maps and scale changes. */
export class Zloza {
  lista: Zloze[] = [];
  private next = 0;
  constructor(private scene: Phaser.Scene, private city: CityMap) {}

  stan(z: Pick<Zloze, 'id'>) {
    const key = `zloze:${z.id}`, day = today();
    const old = session.daily[key];
    if (!old || old.d !== day) session.daily[key] = { d: day, n: 0, a: 0 };
    return session.daily[key];
  }

  update(x: number, y: number, now: number, visible: (x: number, y: number) => boolean) {
    for (const z of this.lista) z.obraz.setVisible(visible(z.x,z.y));
    if (now < this.next) return;
    this.next = now + 600;
    for (const z of this.lista.filter(z => Math.hypot(z.x-x,z.y-y)>700)) z.obraz.destroy();
    this.lista = this.lista.filter(z => z.obraz.active);
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
      // Artist's iron rock, pack 45 C2; use the delivered sprite rather than a new drawing.
      const obraz=this.scene.add.image(p.x,p.y,'item-ruda_zelaza').setDisplaySize(30,30).setOrigin(.5,.85).setDepth(p.y).setVisible(visible(p.x,p.y));
      this.lista.push({id,...p,obraz});
    }
    // Old days do not occupy the save forever. Current-day counts survive despawning.
    const day=today();
    for (const key of Object.keys(session.daily)) if(key.startsWith('zloze:')&&session.daily[key].d!==day) delete session.daily[key];
    for (const z of this.lista) z.obraz.setAlpha(this.stan(z).n>=GORNICTWO.dziennie?.45:1);
  }
}
