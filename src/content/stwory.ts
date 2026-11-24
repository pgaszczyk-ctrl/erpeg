// Łup i EXP stworków (właściciel, 26.10.2026: „dodaj stworki do strony admin i pozwól ustalać loot i expa za
// każdego; loot z listy wszystkich przedmiotów z gry, ilość + szansa, plusik dla kolejnego”).
// Ustawiane w panelu admina (zakładka „🐺 Stworki”, tabela `stwory_lup`, docs/sql/stwory-lup.sql), czytane przy
// starcie gry (RPC `game_stwory`). Każdy wiersz łupu losowany OSOBNO – „2 złota 50 %, 1 złoto 30 %” może dać 0, 1, 2
// albo 3 złota. Stosowane w trybie „nowej walki” (walka/live.ts); bez ustawień stworek daje to, co zawsze.
// Bez Phasera – używa tego też panel admina.
import { PRZEDMIOTY } from './przedmioty';
import { OWOCE, type Owoc } from './sklepy';
import { AMUNICJA, type Amunicja } from './zuzycie';
import { WYLACZONE } from './przedmiotyWlasne';

/** Quality order: poor, ordinary, solid, excellent, masterwork. */
export const SZANSE_JAKOSCI = [21, 22, 25, 22, 10] as const;
export function losujJakosc(los: () => number) {
  const n = Math.max(0, Math.min(.999999999, los())) * 100;
  let sum = 0;
  for (let q = 0; q < SZANSE_JAKOSCI.length; q++) { sum += SZANSE_JAKOSCI[q]; if (n < sum) return q; }
  return 4;
}

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
  { id: 'upior', nazwa: 'Upiór krypty (boss lochu)', exp: 90, gdzie: 'lochy pod cmentarzami' },
  { id: 'wielki_herszt', nazwa: 'Wielki herszt (boss)', exp: 100, gdzie: 'szef dużych obozów (twierdze, warownie), wielkie bandy' },
  { id: 'wodnik', nazwa: 'Wodnik', exp: 25, gdzie: 'bandy w deszczu (przywołuje bloby)' },
  { id: 'blob', nazwa: 'Wodny blob', exp: 3, gdzie: 'bandy w deszczu, przywołańce wodnika' },
];

/**
 * Miejsca z łupem do ustawienia w panelu (właściciel, 24.11.2026: „generyczne miejsca lub potwory i ustalać im loot”).
 * Ten sam zapis co stworki (tabela stwory_lup, rodzaj = id poniżej). Inaczej niż u stworków: wiersze z panelu są
 * DODATKIEM do tego, co miejsce daje z kodu (złoto i EXP skrzyni rosną z poziomem lochu – tego panel nie psuje).
 */
export const MIEJSCA_LUPU: { id: string; nazwa: string; gdzie: string }[] = [
  { id: 'miejsce_skrzynia_lochu', nazwa: 'Skrzynia lochu (krypty, katakumby)', gdzie: 'na dnie każdego zwykłego lochu, po pokonaniu strażnika' },
  { id: 'miejsce_skrzynia_jaskini', nazwa: 'Skrzynia jaskini', gdzie: 'jaskinie przy obozach (siedliskach)' },
  { id: 'miejsce_skrzynia_ukryta', nazwa: 'Ukryta skrzynia (6. poziom)', gdzie: 'za kruszącą się ścianą na 5. poziomie lochu – zamiast zwykłej' },
  { id: 'miejsce_banda', nazwa: 'Rozbita banda', gdzie: 'po pokonaniu herszta bandy w mieście (czerwona mgła)' },
  { id: 'miejsce_oboz', nazwa: 'Szef obozu', gdzie: 'po pokonaniu szefa siedliska (obozu bandytów, rumowiska, bagna)' },
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
    ...PRZEDMIOTY.filter(p => p.baza === p.id).map(p => ({ id: `los_${p.id}`, nazwa: `${p.nazwa.split(' — ')[0]} — losowa jakość (21/22/25/22/10%)`, grupa: p.miejsce === 'bron' ? 'Broń — losowa jakość' : 'Pancerze — losowa jakość' })),
    ...PRZEDMIOTY.filter((p) => p.wlasny).map((p) => ({ id: p.id, nazwa: `${p.nazwa}${WYLACZONE.has(p.id) ? ' (wyłączony)' : ''}`, grupa: 'Własne przedmioty (zakładka Przedmioty)' })),
    ...PRZEDMIOTY.filter((p) => !p.wlasny).map((p) => ({ id: p.id, nazwa: `${p.nazwa}${p.obrazenia ? ` (${p.obrazenia.join('–')})` : ''}`, grupa: p.miejsce === 'bron' ? 'Broń — rodzaj i jakość' : ['zbroja', 'helm', 'buty'].includes(p.miejsce) ? 'Pancerze — rodzaj i jakość' : 'Przedmioty' })),
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

/**
 * Łup domyślny (raport 19.11.2026: tabela na produkcji była pusta – za walkę nie było nic). Wzór Tibii/Diablo:
 * złoto prawie zawsze, surowiec do sprzedania często, mikstura rzadko, przedmiot z losową jakością bardzo rzadko,
 * więcej i lepiej im głębiej (warg, boss). Rachunek: ok. 13 monet na wilka (złoto + kieł 15) – pierwszy zakup
 * za 600 po ok. 20 minutach polowania albo od razu z nagrody za prolog (700). Wiersz w panelu admina wygrywa.
 */
export const DOMYSLNY_LUP: Record<string, WierszLupu[]> = {
  // Animals (owner, 22 Nov 2026: „chochliki mogą mieć złoto, ale wilki nie; miecze tylko humanoidy”): no gold and no
  // gear – fangs instead (kieł sells for 15), so a hunt still pays about as much as before.
  wilk: [{ co: 'kiel', ile: 1, szansa: 80 }, { co: 'kiel', ile: 1, szansa: 30 }, { co: 'serce', ile: 1, szansa: 15 }],
  warg: [{ co: 'kiel', ile: 2, szansa: 90 }, { co: 'kiel', ile: 1, szansa: 55 }, { co: 'serce', ile: 1, szansa: 20 }, { co: 'mikstura', ile: 1, szansa: 4 }, { co: 'diament', ile: 1, szansa: 0.1 }],
  // Imps are thieves: gold and whatever they stole (some of the gear wolves used to carry went to them).
  glut: [{ co: 'zloto', ile: 3, szansa: 70 }, { co: 'zloto', ile: 3, szansa: 30 }, { co: 'serce', ile: 1, szansa: 15 }, { co: 'jablko', ile: 1, szansa: 20 }, { co: 'strzaly', ile: 5, szansa: 10 }, { co: 'los_kijek', ile: 1, szansa: 2 }, { co: 'los_skorzane_buty', ile: 1, szansa: 1.5 }, { co: 'los_skorzany_helm', ile: 1, szansa: 1.5 }, { co: 'los_zelazny', ile: 1, szansa: 1 }],
  koziol: [{ co: 'kiel', ile: 6, szansa: 100 }, { co: 'kiel', ile: 4, szansa: 60 }, { co: 'mikstura', ile: 1, szansa: 60 }, { co: 'serce', ile: 2, szansa: 100 }, { co: 'diament', ile: 1, szansa: 5 }],
  bandyta: [{ co: 'zloto', ile: 10, szansa: 90 }, { co: 'zloto', ile: 8, szansa: 40 }, { co: 'strzaly', ile: 10, szansa: 25 }, { co: 'mikstura', ile: 1, szansa: 4 }, { co: 'los_zelazny', ile: 1, szansa: 3 }, { co: 'los_skorzany_helm', ile: 1, szansa: 3 }],
  wielki_glut: [{ co: 'zloto', ile: 25, szansa: 100 }, { co: 'zloto', ile: 20, szansa: 50 }, { co: 'mikstura', ile: 1, szansa: 15 }, { co: 'los_zelazny', ile: 1, szansa: 6 }, { co: 'los_skorzana_zbroja', ile: 1, szansa: 6 }, { co: 'los_kolczuga', ile: 1, szansa: 2 }, { co: 'los_stalowy', ile: 1, szansa: 2 }],
  driada: [{ co: 'jablko', ile: 3, szansa: 60 }, { co: 'sliwka', ile: 2, szansa: 40 }, { co: 'serce', ile: 1, szansa: 40 }, { co: 'drewno', ile: 1, szansa: 30 }, { co: 'zloto', ile: 3, szansa: 40 }],
  zombie: [{ co: 'zloto', ile: 5, szansa: 80 }, { co: 'serce', ile: 1, szansa: 15 }, { co: 'los_skorzane_buty', ile: 1, szansa: 2 }],
  szkielet: [{ co: 'zloto', ile: 6, szansa: 85 }, { co: 'zloto', ile: 4, szansa: 40 }, { co: 'strzaly', ile: 6, szansa: 20 }, { co: 'los_zelazny_helm', ile: 1, szansa: 1.5 }, { co: 'los_kijek', ile: 1, szansa: 3 }],
  herszt: [{ co: 'zloto', ile: 40, szansa: 100 }, { co: 'zloto', ile: 30, szansa: 60 }, { co: 'mikstura', ile: 1, szansa: 30 }, { co: 'los_zelazny', ile: 1, szansa: 10 }, { co: 'los_kolczuga', ile: 1, szansa: 5 }, { co: 'diament', ile: 1, szansa: 1 }],
  upior: [{ co: 'zloto', ile: 60, szansa: 100 }, { co: 'zloto', ile: 40, szansa: 70 }, { co: 'mikstura', ile: 1, szansa: 50 }, { co: 'los_stalowy', ile: 1, szansa: 10 }, { co: 'los_zelazny_helm', ile: 1, szansa: 10 }, { co: 'los_kolczuga', ile: 1, szansa: 8 }, { co: 'diament', ile: 1, szansa: 2 }],
};

/** Co wypadło z jednego stworka (każdy wiersz losowany osobno); null = ani panelu, ani łupu domyślnego. */
/** Zwierzęta: bez złota i bez ekwipunku (miecze, łuki, pancerze nosi tylko ktoś, kto ma ręce). */
export const ZWIERZETA = new Set(['wilk', 'warg', 'koziol']);

/** Czy to może wypaść z tego stworka (reguła zwierząt obowiązuje też wiersze z panelu admina). */
export function wolnoUpuscic(rodzaj: string, co: string) {
  if (!ZWIERZETA.has(rodzaj)) return true;
  if (co === 'zloto') return false;
  return !co.startsWith('los_') && !PRZEDMIOTY.some((p) => p.id === co);
}

export function losujLup(rodzaj: string, los: () => number = Math.random): { co: string; ile: number }[] | null {
  const s = stwory[rodzaj];
  const lista = (s && s.lup.length ? s.lup : DOMYSLNY_LUP[rodzaj])?.filter((w) => wolnoUpuscic(rodzaj, w.co) && !WYLACZONE.has(w.co));
  if (!lista?.length) return null;
  const out: { co: string; ile: number }[] = [];
  for (const w of lista) if (los() * 100 < w.szansa) {
    const rodzina = w.co.startsWith('los_') ? PRZEDMIOTY.filter(p => p.baza === w.co.slice(4)) : [];
    if (!rodzina.length) { out.push({ co: w.co, ile: Math.round(w.ile) }); continue; }
    // Roll each copy independently, then group identical variants for the existing pickup path.
    const counts = new Map<string, number>();
    for (let i = 0; i < Math.round(w.ile); i++) {
      const q = losujJakosc(los);
      const id = rodzina.find(p => p.jakosc === q)!.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [co, ile] of counts) out.push({ co, ile });
  }
  return out;
}
