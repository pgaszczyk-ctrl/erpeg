import Phaser from 'phaser';
import { TEX } from '../art';
import type { CityMap } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import { rng } from '../rng';
import {
  POZIOMY, MADRALE, SZANSA_NA_RACHUNEK, MADRALA_CO_ILE_MIEJSC, MADRALA_ODLEGLOSC_M, type Zagadka,
} from '../content/zagadki';
import { PROSBY, NIE_POWTARZAJ_DNI, NAGRODA_PROSBY, DNI, DNI_BIERNIK, BLISKIE_MIASTA, DROGA_RAZY, ZAKUPY } from '../content/prosby';
import { DUZE_MIASTA } from '../content/pociagi';

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
  /** A woman (her requests say „miałam”, not „miałem”). */
  female?: boolean;
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
export function rachunek(level: number, r: () => number): Zagadka {
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

/** Days since 1970 of a "YYYY-MM-DD" day (for "not again within 60 days"). */
export function dayNumber(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface Request {
  /** What was asked (the same key is not asked again within NIE_POWTARZAJ_DNI days). */
  key: string;
  question: string;
  answers: string[];
  correct: number;
  exp: number;
  coins: number;
  apples: number;
}

function shuffle<T>(a: T[], r: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const k = Math.PI / 180;
  const x = (b.lon - a.lon) * k * Math.cos(((a.lat + b.lat) / 2) * k);
  const y = (b.lat - a.lat) * k;
  return Math.hypot(x, y) * 6371;
};

/**
 * Today's request of one riddle-giver (content/prosby.ts): the first one in
 * this person's order for today that the player hasn't heard in the last
 * NIE_POWTARZAJ_DNI days. Days, times, distances and shopping are made up
 * from today's date, the clock and where the person stands.
 */
export function requestFor(npc: Npc, day: string, age: number, seen: Record<string, number>, where: { lat: number; lon: number } | null, now = new Date()): Request {
  const level = Phaser.Math.Clamp(levelForAge(age) + npc.difficulty, 0, POZIOMY.length - 1);
  const r = rng(hash(`prosba:${npc.id}:${day}`));
  const g = (f: string, m: string) => (npc.female ? f : m);
  const n = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const today = dayNumber(day);
  const fresh = (key: string) => !(key in seen) || today - seen[key] >= NIE_POWTARZAJ_DNI;
  const dow = now.getDay();
  const otherDays = (right: number) => [DNI[right], ...shuffle(DNI.filter((_, i) => i !== right), r).slice(0, 3)];
  type Q = { key: string; q: string; a: string[] } | null;
  const makers: (() => Q)[] = [];
  for (const p of PROSBY) if (p.od <= level) makers.push(() => ({ key: p.id, q: p.tekst(g), a: p.odp }));
  const gen: [number, () => Q][] = [
    [0, () => ({ key: 'dzis', q: `Przepraszam, ${g('miałam', 'miałem')} trudną noc… Jaki dzisiaj mamy dzień tygodnia?`, a: otherDays(dow) })],
    [0, () => ({ key: 'jutro', q: 'Jutro idę do dentysty i już się denerwuję. Jaki jutro będzie dzień tygodnia?', a: otherDays((dow + 1) % 7) })],
    [1, () => {
      const k = n(2, 10);
      return { key: `za:${k}`, q: `Za ${k} dni mam urodziny! Jaki to będzie dzień tygodnia?`, a: otherDays((dow + k) % 7) };
    }],
    [1, () => {
      const d = n(0, 6);
      if (d === dow) return null;
      const left = (d - dow + 7) % 7;
      const opts = new Set([left]);
      while (opts.size < 4) opts.add(n(1, 8));
      return { key: `do:${d}`, q: `Liczę dni do wycieczki! Ile dni zostało do ${DNI_BIERNIK[d]}? (dziś nie liczymy)`, a: [...opts].map(String) };
    }],
    [1, () => {
      // An appointment 1–4 hours from now, on a full or half hour.
      const mins = now.getHours() * 60 + now.getMinutes();
      const at = Math.ceil((mins + n(60, 240)) / 30) * 30;
      if (at >= 21 * 60) return null;
      const left = Math.round((at - mins) / 5) * 5;
      const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} godz.${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
      const opts = new Set([left]);
      for (const d of shuffle([-60, 60, -30, 30, 90, 120], r)) if (opts.size < 4 && left + d > 0) opts.add(left + d);
      const hh = `${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}`;
      return { key: `godz:${hh}`, q: `Przepraszam, jestem ${g('umówiona', 'umówiony')} do lekarza na ${hh}. Ile mam jeszcze czasu?`, a: [...opts].map(fmt) };
    }],
    [1, () => {
      if (!where) return null;
      const all = [...BLISKIE_MIASTA, ...DUZE_MIASTA].filter((c) => km(where, c) > 4);
      if (!all.length) return null;
      const c = all[n(0, all.length - 1)];
      const line = km(where, c);
      const road = line * (line > 100 ? DROGA_RAZY.daleko : DROGA_RAZY.blisko);
      const r20 = (v: number) => Math.max(20, Math.round(v / 20) * 20);
      const near = 'Tak, blisko – jakieś 5 km';
      const mid = 'No tak średnio, jakieś 20 km';
      const far = (v: number) => `Oj, kawał drogi – jakieś ${v} km`;
      const x = r20(road);
      let y = r20(road * (r() < 0.5 ? 1.8 : 0.5));
      if (y === x || y <= 20) y = x + 100;
      const right = road < 10 ? near : road < 30 ? mid : far(x);
      const rest = [near, mid, far(road < 30 ? r20(road + 80) : y)].filter((t) => t !== right);
      if (road >= 30) rest.push(far(x + (y > x ? 200 : 100)));
      return { key: `dystans:${c.nazwa}`, q: `Mam jechać na urodziny kuzynki. ${c.nazwa} – to gdzieś blisko?`, a: [right, ...rest.slice(0, 3)] };
    }],
    [0, () => {
      const [a, b] = shuffle([...ZAKUPY], r);
      const x = n(2, level >= 2 ? 9 : 5);
      const y = n(1, level >= 2 ? 6 : 3);
      const sum = x * a.cena + y * b.cena;
      const opts = new Set([sum]);
      while (opts.size < 4) opts.add(Math.max(1, sum + n(-4, 4)));
      return { key: `zakupy:${a.co}${x}:${b.co}${y}`, q: `Mam na liście: ${a.co} – ${x} szt. po ${a.cena} zł i ${b.co} – ${y} szt. po ${b.cena} zł. Ile razem zapłacę?`, a: [...opts].map((v) => `${v} zł`) };
    }],
  ];
  // The made-up kinds come up about as often as a third of the list (each tried a few times).
  for (const [od, make] of gen) if (od <= level) for (let i = 0; i < 3; i++) makers.push(make);
  let pick: { key: string; q: string; a: string[] } | null = null;
  for (const make of shuffle(makers, r)) {
    const q = make();
    if (q && fresh(q.key)) {
      pick = q;
      break;
    }
  }
  // Everything heard lately (hardly possible): shopping sums are endless.
  for (let i = 0; !pick && i < 50; i++) {
    const q = gen[gen.length - 1][1]();
    if (q && fresh(q.key)) pick = q;
  }
  pick ??= gen[gen.length - 1][1]()!;
  const order = shuffle(pick.a.map((_, i) => i), r);
  const apples = hash(pick.key + day) % 2 === 0;
  return {
    key: pick.key,
    question: pick.q,
    answers: order.map((i) => pick!.a[i]),
    correct: order.indexOf(0),
    exp: NAGRODA_PROSBY.expNaPoziom[level],
    coins: apples ? 0 : NAGRODA_PROSBY.monety,
    apples: apples ? NAGRODA_PROSBY.jablka : 0,
  };
}

/** Today's riddle of one riddle-giver for a player of this age. */
export function riddleFor(npc: Npc, day: string, age: number): Riddle {
  const level = Phaser.Math.Clamp(levelForAge(age) + npc.difficulty, 0, POZIOMY.length - 1);
  const r = rng(hash(`${npc.id}:${day}:${level}`));
  const pool = POZIOMY[level].zagadki;
  const z = r() < SZANSA_NA_RACHUNEK || !pool.length ? rachunek(level, r) : pool[Math.floor(r() * pool.length)];
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
    const r = rng(hash(`npcs:${city.id === 'lublin' ? '' : city.id}${day}`));
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
        this.list.push({ id: `${city.id === 'lublin' ? '' : `${city.id}/`}npc-${i}`, x, y, name: who.imie, greeting: who.powitanie, female: who.k, difficulty: Math.floor(r() * 3) - 1 });
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
        // It blinks, so a riddle waiting here catches the eye.
        this.scene.tweens.add({ targets: n.bubble, alpha: 0.25, duration: 360, yoyo: true, repeat: -1 });
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
