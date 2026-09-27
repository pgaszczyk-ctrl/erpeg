import { rng } from './rng';
import { QUIZY, SZKOLA_QUIZ, type PytanieQuizu } from './content/quizy';
import { rachunek, levelForAge } from './scenes/Npcs';

// School quizzes: today's questions from the server (add_quizzes → school_quizzes,
// loaded at login), the built-in ones from content/quizy.ts and number puzzles
// the game makes up itself, so they never run out.

type ServerQuiz = [number, number, string, string, string[]];
const fromServer: PytanieQuizu[][] = [[], [], [], []];

export function setServerQuizzes(list: ServerQuiz[]) {
  for (const l of fromServer) l.length = 0;
  for (const [, level, kategoria, pytanie, odpowiedzi] of list) {
    if (level >= 0 && level <= 3 && pytanie && odpowiedzi?.length >= 2) fromServer[level].push({ kategoria, pytanie, odpowiedzi });
  }
}

export function serverQuizCount() {
  return fromServer.reduce((n, l) => n + l.length, 0);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Number puzzles: sequences, little word problems and sums. */
function puzzle(level: number, r: () => number): PytanieQuizu {
  const n = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const near = (v: number, spread: number) => {
    const set = new Set<number>([v]);
    while (set.size < 4) set.add(Math.max(0, v + n(-spread, spread)));
    return [...set].map(String);
  };
  const k = r();
  if (k < 0.3) {
    // What comes next?
    let seq: number[];
    if (level === 0) {
      const a = n(1, 5), d = n(1, 3);
      seq = [0, 1, 2, 3].map((i) => a + i * d);
      return { kategoria: 'łamigłówka', pytanie: `Jaka liczba będzie następna: ${seq.join(', ')}, …?`, odpowiedzi: near(a + 4 * d, 3) };
    }
    if (level === 1 || r() < 0.4) {
      const a = n(2, 20), d = n(2, 9) * (level >= 2 && r() < 0.4 ? -1 : 1);
      seq = [0, 1, 2, 3].map((i) => a + 30 + i * d);
      return { kategoria: 'łamigłówka', pytanie: `Jaka liczba będzie następna: ${seq.join(', ')}, …?`, odpowiedzi: near(a + 30 + 4 * d, 6) };
    }
    if (level === 2) {
      const a = n(1, 5), q = n(2, 3);
      seq = [0, 1, 2, 3].map((i) => a * q ** i);
      return { kategoria: 'łamigłówka', pytanie: `Jaka liczba będzie następna: ${seq.join(', ')}, …?`, odpowiedzi: near(a * q ** 4, 10) };
    }
    // Growing steps.
    const a = n(1, 10), d = n(1, 4);
    seq = [a];
    for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + d * i);
    return { kategoria: 'łamigłówka', pytanie: `Jaka liczba będzie następna: ${seq.join(', ')}, …?`, odpowiedzi: near(seq[4] + d * 5, 6) };
  }
  if (k < 0.6) {
    // A little story.
    if (level === 0) {
      const a = n(2, 6), b = n(1, 5);
      return { kategoria: 'zadanie', pytanie: `Ola miała ${a} jabłek i znalazła jeszcze ${b}. Ile ma teraz?`, odpowiedzi: near(a + b, 3) };
    }
    if (level === 1) {
      const a = n(3, 9), b = n(2, 6);
      return { kategoria: 'zadanie', pytanie: `W ${b} koszykach jest po ${a} gruszek. Ile gruszek jest razem?`, odpowiedzi: near(a * b, 6) };
    }
    if (level === 2) {
      const cena = n(3, 12), ile = n(3, 8), dal = Math.ceil((cena * ile + 1) / 10) * 10 + (r() < 0.5 ? 10 : 0);
      return { kategoria: 'zadanie', pytanie: `Bułka kosztuje ${cena} zł. Kupujesz ${ile} bułek i płacisz ${dal} zł. Ile reszty dostaniesz?`, odpowiedzi: near(dal - cena * ile, 5) };
    }
    const v = n(3, 9) * 10, t = [6, 12, 30, 90, 120][n(0, 4)];
    return { kategoria: 'zadanie', pytanie: `Rowerzysta jedzie ${v} km/h. Ile kilometrów przejedzie w ${t} minut?`, odpowiedzi: near((v * t) / 60, 8) };
  }
  if (k < 0.75 && level >= 1) {
    // Clock.
    const h = n(1, 11), m = [0, 15, 30, 45][n(0, 3)], add = level === 1 ? n(1, 3) * 60 : n(2, 11) * 5 + n(1, 3) * 60;
    const t = h * 60 + m + add;
    const fmt = (x: number) => `${Math.floor(x / 60) % 24}:${String(x % 60).padStart(2, '0')}`;
    const wrong = new Set<string>();
    while (wrong.size < 3) {
      const w = fmt(t + (n(1, 4) * 5 + (r() < 0.5 ? 60 : 0)) * (r() < 0.5 ? -1 : 1));
      if (w !== fmt(t)) wrong.add(w);
    }
    return { kategoria: 'zegar', pytanie: `Jest ${fmt(h * 60 + m)}. Która będzie za ${Math.floor(add / 60)} h${add % 60 ? ` ${add % 60} min` : ''}?`, odpowiedzi: [fmt(t), ...wrong] };
  }
  const z = rachunek(level, r);
  return { kategoria: 'rachunek', pytanie: z.pytanie, odpowiedzi: z.odpowiedzi };
}

/**
 * The n-th question of the day in one school, for a player of this age
 * (always the same for that school, day and number).
 */
export function schoolQuiz(schoolId: string, day: string, nth: number, age: number): PytanieQuizu {
  // Later questions of the day get harder (content/quizy.ts trudniejOd).
  const harder = SZKOLA_QUIZ.trudniejOd.filter((from) => nth + 1 >= from).length;
  const level = Math.min(3, levelForAge(age) + harder);
  const r = rng(hash(`quiz:${schoolId}:${day}:${nth}:${level}`));
  if (r() < SZKOLA_QUIZ.szansaNaRachunek) return puzzle(level, r);
  // Server questions first (new every day), then the built-in ones.
  const pool = fromServer[level].length >= 10 && r() < 0.85 ? fromServer[level] : [...fromServer[level], ...QUIZY[level]];
  if (!pool.length) return puzzle(level, r);
  // The same school walks through a shuffled list, so questions don't repeat within a day.
  const pr = rng(hash(`quizorder:${schoolId}:${day}:${level}:${pool.length}`));
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(pr() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return pool[order[nth % order.length]];
}
