import { drzewo, GATUNKI } from '../../src/gen/drzewa';
import { kolorPodloza } from '../../src/gen/podloze';
import { modulRury } from '../../src/gen/steampunk';
import type { Obraz } from '../../src/gen/wspolne';
const groups: Record<string, Record<string, number>> = {};
function pixels(group: string, px: Uint32Array | number[]) {
  const counts = groups[group] ??= {};
  for (const c of px) if ((c >>> 24) === 255) {
    const key = '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map(n => n.toString(16).padStart(2, '0')).join('');
    counts[key] = (counts[key] ?? 0) + 1;
  }
}
for (const name of Object.keys(GATUNKI)) for (let seed = 1; seed <= 4; seed++) {
  const d = drzewo(name, seed);
  for (const value of Object.values(d)) if (value && typeof value === 'object' && 'px' in value) pixels('trees', (value as Obraz).px);
}
for (const kind of ['trawa', 'bruk', 'chodnik'] as const) {
  const p: number[] = [];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) p.push(kolorPodloza(kind, x, y));
  pixels(kind === 'trawa' ? 'grass' : 'paving', p);
}
for (const dir of ['N', 'S', 'E', 'W'] as const) for (const extra of ['zawor', 'manometr', 'podpora', 'kolnierz'] as const) pixels('pipes', modulRury(dir, extra).px);
console.log(JSON.stringify(groups));
