// Łup i EXP stworków (właściciel, 26.10.2026: „dodaj stworki do strony admin i pozwól ustalać loot i expa za
// każdego; loot z listy wszystkich przedmiotów z gry, ilość + szansa, plusik dla kolejnego”).
// Ustawiane w panelu admina (zakładka „🐺 Stworki”, tabela `stwory_lup`, docs/sql/stwory-lup.sql), czytane przy
// starcie gry (RPC `game_stwory`). Każdy wiersz łupu losowany OSOBNO – „2 złota 50 %, 1 złoto 30 %” może dać 0, 1, 2
// albo 3 złota. Stosowane w trybie „nowej walki” (walka/live.ts); bez ustawień stworek daje to, co zawsze.
// Bez Phasera – używa tego też panel admina.
import { PRZEDMIOTY } from './przedmioty';
import { OWOCE, type Owoc } from './sklepy';
import { AMUNICJA, type Amunicja } from './zuzycie';

export interface WierszLupu {
  /** Co: 'zloto', 'diament', 'mikstura', 'serce', id towaru (OWOCE), amunicji (AMUNICJA) albo przedmiotu (PRZEDMIOTY). */
  co: string;
  ile: number;
  /** Szansa w procentach (0,05 = jeden raz na 2000). */
  szansa: number;
}

export interface UstawieniaStworka {
  exp: number | null;
  lup: WierszLupu[];
}

/** Stworki do ustawienia w panelu (id jak w grze, ENEMY_KINDS w objects/Slime.ts; exp = domyślne z gry). */
export const STWORY: { id: string; nazwa: string; exp: number; gdzie: string }[] = [
  { id: 'wilk', nazwa: 'Wilk', exp: 12, gdzie: 'łowiska (obrzeże), parki, grupki na zieleni' },
  { id: 'warg', nazwa: 'Warg', exp: 45, gdzie: 'łowiska (głębia, obstawa bossa)' },
  { id: 'glut', nazwa: 'Chochlik (rzuca żołędziami)', exp: 5, gdzie: 'grupki w mieście, towarzysze wargów w głębi łowiska' },
  { id: 'koziol', nazwa: 'Mosiężny Kozioł (boss)', exp: 150, gdzie: 'rdzeń łowiska' },
  { id: 'bandyta', nazwa: 'Bandyta', exp: 15, gdzie: 'misje, noc' },
  { id: 'wielki_glut', nazwa: 'Wielki chochlik', exp: 40, gdzie: 'misje' },
  { id: 'driada', nazwa: 'Driada', exp: 10, gdzie: 'misje w lesie' },
  { id: 'zombie', nazwa: 'Zombie', exp: 10, gdzie: 'misje przy wodzie' },
  { id: 'szkielet', nazwa: 'Szkielet', exp: 10, gdzie: 'misje przy cmentarzu' },
  { id: 'herszt', nazwa: 'Herszt', exp: 60, gdzie: 'misje' },
];

/** Wszystko, co może wypaść (lista do wyboru w panelu). */
export function lupOpcje(): { id: string; nazwa: string; grupa: string }[] {
  return [
    { id: 'zloto', nazwa: 'Złoto (monety)', grupa: 'Pieniądze' },
    { id: 'diament', nazwa: 'Diament', grupa: 'Pieniądze' },
    { id: 'mikstura', nazwa: 'Mikstura leczenia', grupa: 'Leczenie' },
    { id: 'serce', nazwa: 'Serce (leczy pół serca)', grupa: 'Leczenie' },
    ...(Object.keys(OWOCE) as Owoc[]).map((k) => ({ id: k, nazwa: OWOCE[k].nazwa, grupa: 'Towary' })),
    ...(Object.keys(AMUNICJA) as Amunicja[]).map((k) => ({ id: k, nazwa: AMUNICJA[k].nazwa, grupa: 'Amunicja' })),
    ...PRZEDMIOTY.map((p) => ({ id: p.id, nazwa: p.nazwa, grupa: 'Przedmioty' })),
  ];
}

/** Ustawienia z serwera (rodzaj → exp/łup); puste, gdy panel nic nie zmienił. */
export const stwory: Record<string, UstawieniaStworka> = {};

export function ustawStwory(v: Record<string, { exp?: number | null; lup?: WierszLupu[] }> | null | undefined) {
  for (const k of Object.keys(stwory)) delete stwory[k];
  for (const [k, s] of Object.entries(v ?? {})) {
    const lup = Array.isArray(s?.lup) ? s.lup.filter((w) => w && typeof w.co === 'string' && w.ile > 0 && w.szansa >= 0) : [];
    stwory[k] = { exp: typeof s?.exp === 'number' ? s.exp : null, lup };
  }
}

/** Co wypadło z jednego stworka (każdy wiersz losowany osobno); null = brak ustawień w panelu. */
export function losujLup(rodzaj: string, los: () => number = Math.random): { co: string; ile: number }[] | null {
  const s = stwory[rodzaj];
  if (!s || !s.lup.length) return null;
  const out: { co: string; ile: number }[] = [];
  for (const w of s.lup) if (los() * 100 < w.szansa) out.push({ co: w.co, ile: Math.round(w.ile) });
  return out;
}
