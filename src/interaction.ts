/** A concrete object, shared by highlighting, picking and execution. Coordinates are map feet. */
export interface InteractionTarget {
  id: string; x: number; y: number; label: string; kind: 'talk' | 'enter' | 'use';
  run(): void;
  range?: number;
}
export class InteractionSelection {
  id: string | null = null;
  private pinned = false;
  clear() { this.id = null; this.pinned = false; }
  pick(t: InteractionTarget) { this.id = t.id; this.pinned = true; }
  update(targets: InteractionTarget[], x: number, y: number, range: number) {
    const distance = (t: InteractionTarget) => Math.hypot(t.x - x, t.y - y);
    const available = targets.filter(t => distance(t) <= (t.range ?? range));
    const current = available.find(t => t.id === this.id);
    const nearest = available.reduce<InteractionTarget | null>((a, b) => !a || distance(b) < distance(a) ? b : a, null);
    // A deliberate selection persists until it leaves reach; automatic selection has hysteresis.
    if (current && (this.pinned || !nearest || distance(nearest) + 8 >= distance(current) * .72)) return current;
    this.pinned = false;
    this.id = nearest?.id ?? null;
    return nearest;
  }
}

/** Screen separation includes the compressed ground Y axis and upright bodies above the feet. */
export function interactionSpot(origin: {x:number;y:number}, people: {x:number;y:number}[], doors: {x:number;y:number}[],
  free: (x:number,y:number)=>boolean, cameraY: number, reachable: (x:number,y:number)=>boolean = () => true): {x:number;y:number} | null {
  for (let r = 30; r <= 150; r += 12) {
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12;
      const x = origin.x + Math.cos(a)*r, y = origin.y + Math.sin(a)*r;
      if (people.some(p => Math.hypot((p.x-x)/30, (p.y-y)*cameraY/40) < 1)) continue;
      if (doors.some(p => Math.hypot((p.x-x)/28, (p.y-y)*cameraY/34) < 1)) continue;
      // Room for feet and a player walking around either side.
      if (free(x,y) && free(x-8,y) && free(x+8,y) && free(x,y+8) && free(x,y-8) && reachable(x,y)) return {x,y};
    }
  }
  return null; // Retry when more terrain is loaded, never place inside a wall or on another target.
}
