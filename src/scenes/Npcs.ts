import Phaser from 'phaser';
import { TEX } from '../art';
import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import { rng } from '../rng';
import {
  POZIOMY, MADRALE, SZANSA_NA_RACHUNEK, MADRALA_CO_ILE_MIEJSC, MADRALA_ODLEGLOSC_M, type Zagadka,
} from '../content/zagadki';

// Riddle-givers ("mądrale"): people standing on streets about 500 m from
// schools and churches. Where they stand and what they ask changes every day;
// each one has one riddle a day, matched to the player's age.

export interface Npc {
  id: string;
  x: number;
  y: number;
  name: string;
  greeting: string;
  /** -1 easy, 0 normal, +1 hard (relative to the player's age). */
  difficulty: number;
  sprite?: Phaser.GameObjects.Sprite;
  bubble?: Phaser.GameObjects.Image;
}

export interface Riddle {
  question: string;
  answers: string[];
  correct: number;
  reward: number;
  level: string;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today in local time, e.g. "2026-09-25". */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function levelForAge(age: number) {
  const i = POZIOMY.findIndex((p) => age <= p.wiekDo);
  return i < 0 ? POZIOMY.length - 1 : i;
}

/** Sums the game makes up, harder for older players. */
function sum(level: number, r: () => number): Zagadka {
  const n = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const near = (v: number, spread: number) => {
    const set = new Set<number>([v]);
    while (set.size < 4) set.add(Math.max(0, v + n(-spread, spread)));
    return [...set].map(String);
  };
  if (level === 0) {
    if (r() < 0.5) {
      const a = n(1, 25);
      const b = n(1, 40 - a);
      return { pytanie: `Ile to jest ${a} + ${b}?`, odpowiedzi: near(a + b, 4) };
    }
    const a = n(5, 40);
    const b = n(1, a);
    return { pytanie: `Ile to jest ${a} − ${b}?`, odpowiedzi: near(a - b, 4) };
  }
  if (level === 1) {
    if (r() < 0.5) {
      const a = n(2, 10);
      const b = n(2, 10);
      return { pytanie: `Ile to jest ${a} × ${b}?`, odpowiedzi: near(a * b, 6) };
    }
    const a = n(20, 70);
    const b = n(10, 99 - a);
    return { pytanie: `Ile to jest ${a} + ${b}?`, odpowiedzi: near(a + b, 10) };
  }
  if (level === 2) {
    const k = r();
    if (k < 0.34) {
      const a = n(11, 30);
      const b = n(3, 9);
      return { pytanie: `Ile to jest ${a} × ${b}?`, odpowiedzi: near(a * b, 12) };
    }
    if (k < 0.67) {
      const b = n(3, 9);
      const c = n(4, 15);
      return { pytanie: `Ile to jest ${b * c} : ${b}?`, odpowiedzi: near(c, 3) };
    }
    const p = [10, 20, 25, 50][n(0, 3)];
    const v = n(2, 20) * 20;
    return { pytanie: `Ile to jest ${p}% z ${v}?`, odpowiedzi: near((p * v) / 100, 10) };
  }
  // Level 3: equations and powers.
  if (r() < 0.5) {
    const x = n(2, 15);
    const a = n(2, 9);
    const b = n(1, 30);
    return { pytanie: `Rozwiąż: ${a}·x + ${b} = ${a * x + b}. Ile wynosi x?`, odpowiedzi: near(x, 3) };
  }
  const a = n(11, 25);
  return { pytanie: `Ile to jest ${a}²?`, odpowiedzi: near(a * a, 20) };
}

/** Today's riddle of one riddle-giver for a player of this age. */
export function riddleFor(npc: Npc, day: string, age: number): Riddle {
  const level = Phaser.Math.Clamp(levelForAge(age) + npc.difficulty, 0, POZIOMY.length - 1);
  const r = rng(hash(`${npc.id}:${day}:${level}`));
  const pool = POZIOMY[level].zagadki;
  const z = r() < SZANSA_NA_RACHUNEK || !pool.length ? sum(level, r) : pool[Math.floor(r() * pool.length)];
  // Shuffle, remembering where the right answer went.
  const order = z.odpowiedzi.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    question: z.pytanie,
    answers: order.map((i) => z.odpowiedzi[i]),
    correct: order.indexOf(0),
    reward: POZIOMY[level].nagroda,
    level: POZIOMY[level].nazwa,
  };
}

export class Npcs {
  readonly list: Npc[] = [];

  constructor(private scene: Phaser.Scene, city: CityMap, day: string) {
    const r = rng(hash(`npcs:${day}`));
    const spots = city.places.filter((p) => p.kind === 'school' || p.kind === 'church');
    const dist = MADRALA_ODLEGLOSC_M * PX_PER_M;
    spots.forEach((p, i) => {
      if (Math.floor(r() * MADRALA_CO_ILE_MIEJSC) !== 0) return;
      // A walkable street point about 500 m away, in a random direction.
      for (let t = 0; t < 40; t++) {
        const a = r() * Math.PI * 2;
        const d = dist * (0.9 + r() * 0.2);
        const x = p.door.x + Math.cos(a) * d;
        const y = p.door.y + Math.sin(a) * d;
        if (!city.roadAt(x, y) || city.isBlocked(x, y) || city.isBlocked(x, y + 5)) continue;
        const who = MADRALE[Math.floor(r() * MADRALE.length)];
        this.list.push({ id: `npc-${i}`, x, y, name: who.imie, greeting: who.powitanie, difficulty: Math.floor(r() * 3) - 1 });
        break;
      }
    });
  }

  /** Shows the ones near the hero (sprites are made on the way), hides the rest. */
  update(px: number, py: number, isVisible: (x: number, y: number) => boolean, answered: (n: Npc) => boolean) {
    for (const n of this.list) {
      const near = Math.abs(n.x - px) < 400 && Math.abs(n.y - py) < 400;
      if (near && !n.sprite) {
        n.sprite = this.scene.add.sprite(n.x, n.y, TEX.hero, 'down-0').setTint(0xc9a0ff).setDepth(n.y);
        n.bubble = this.scene.add.image(n.x, n.y - 13, TEX.bubble).setDepth(n.y + 1);
        this.scene.tweens.add({ targets: n.bubble, y: n.bubble.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      if (!n.sprite) continue;
      const v = near && isVisible(n.x, n.y);
      n.sprite.setVisible(v);
      n.bubble!.setVisible(v && !answered(n));
    }
  }

  /** The riddle-giver standing next to (x, y), if any. */
  at(x: number, y: number, radius: number) {
    return this.list.find((n) => Math.abs(n.x - x) < radius && Math.abs(n.y - y) < radius && Math.hypot(n.x - x, n.y - y) < radius);
  }
}
