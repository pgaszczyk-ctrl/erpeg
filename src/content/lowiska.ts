// ============================================================================
//  ŁOWISKA — test pilota „walka i gęste łowiska” (brief właściciela, 25.10.2026).
//  Odrębny, w pełni odwracalny eksperyment: watahy wilków żyją w prawdziwych
//  lasach (OSM natural=wood/landuse=forest, CityMap.areaKindsAt), zawsze w
//  czasie rzeczywistym (Slime.spokojny = false) – niezależnie od globalnego
//  przełącznika walki turowej `tury()` (src/walka/tryb.ts). Nic z istniejącej
//  walki turowej, Areny Cechu czy innych gangów nie jest tym ruszane.
//
//  Włączane tylko świadomie: `?lowiska=1` (zapamiętane na urządzeniu jako
//  localStorage „exp-lowiska”), domyślnie wyłączone nawet na serwerze
//  testowym. `?lowiska=0` wyłącza z powrotem.
//
//  Właściciel, 25 Oct 2026: to NIE jest gang, który się „rozbija" dla jednorazowej
//  nagrody – watacha nie ma bossa i nie ma specjalnej premii za pokonanie ostatniego
//  członka. Każdy zabity wilk/warg daje EXP z osobna (ciągłe farmienie), a głębiej
//  w dziczy (dalej od miast/miejsc) trafiają się silniejsze wargi – patrz LOWISKA.glebia*.
//
//  Wszystkie liczby poniżej są WARTOŚCIAMI DO TESTU (brief, rozdz. 4 i 8),
//  nie zatwierdzonym bilansem. Jednostki metryczne (m, m/s) przeliczane na
//  piksele świata przez PX_PER_M w miejscu użycia – tak jak przy gangach
//  (content/gangi.ts GANG_OD_MIEJSC_M itd.).
// ============================================================================

import { live } from '../walka/live';

const wymuszone = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lowiska');
    if (q === '0' || q === '1') localStorage.setItem('exp-lowiska', q);
    return localStorage.getItem('exp-lowiska');
  } catch {
    return null;
  }
})();

/** Czy nowy pilot łowisk jest włączony w tej sesji (patrz nagłówek pliku). Pakiet „nowa walka” (walka/live.ts) też go włącza. */
export function lowiska() {
  if (wymuszone === '0') return false;
  return wymuszone === '1' || live();
}

/**
 * Łowiska epicentryczne (właściciel, 26.10.2026, brief „walka i łowiska” 5A): stała kotwica w otwartym terenie
 * (las, pole, łąka, zarośla, mokradła – nie park miejski), z dala od skupisk zabudowy i bardzo głównych dróg,
 * i trzy warstwy: obrzeże (wilki), głębia (wargi), rdzeń (silny przeciwnik – na razie zastępczy boss QA).
 * Układ nie zależy od loginu ani postaci (to samo miejsce dla każdego); odnawiają się tylko zwykłe grupy.
 * WARTOŚCI DO TESTU.
 */
export const LOWISKA_EPI = {
  /** Komórka planowania (km): w każdej najwyżej jedno łowisko. */
  komorkaKm: 1.1,
  /** Szansa, że komórka w ogóle dostanie łowisko (gdy znajdzie się dobre miejsce). */
  szansa: 0.95,
  /** Promień całego łowiska (m) i granice warstw (udział promienia). */
  promienM: 300,
  glebiaOd: 0.68,
  rdzenOd: 0.3,
  /** Otwarty teren, na którym może leżeć łowisko (rodzaje obszarów mapy). */
  teren: ['forest', 'farmland', 'grass', 'scrub', 'wetland'],
  /** Ile z próbek w promieniu musi być otwartym terenem. */
  minOtwartego: 0.55,
  /** Skupisko zabudowy: więcej niż tyle budynków w promieniu `osadaM` od kotwicy wyklucza miejsce
   *  (1–2 samotne domy są dopuszczalne – brief: „jeden lub dwa domki”). */
  maksDomow: 3,
  osadaM: 330,
  /** Rdzeń i głębia z dala od bardzo głównych dróg (autostrady, ekspresówki, krajowe – linie 'major'). */
  odGlownejM: 220,
  /** Grupa nie stoi bliżej budynku niż tyle (m) ani bliżej głównej drogi niż `grupaOdGlownejM` (obrzeże: tylko wilki). */
  grupaOdDomuM: 45,
  grupaOdGlownejM: 70,
  /** Kotwica co najmniej tyle (m) od ważnych miejsc (drzwi, dom). */
  odMiejscM: 450,
  /** Miejsca grup w warstwach i ich skład. */
  // Właściciel 26.10.2026: „więcej i bardziej rozproszone; watahy do 8; w drugim tier towarzystwo dystansowych stworków”.
  obrzeze: { miejsc: 7, czlonkow: [4, 8] as [number, number] },
  glebia: { miejsc: 4, czlonkow: [2, 4] as [number, number], chochlikow: [2, 3] as [number, number] },
  /** Rdzeń: boss + obstawa (zastępczy boss QA: Mosiężny Kozioł – nie jest to bazyliszek). */
  rdzen: { boss: 'koziol', obstawa: 2 },
  /** Promień jednej grupy (m) – za tą granicą wilk przestaje gonić i wraca. */
  grupaM: 95,
  /** Członkowie grupy rozsiani od `rozrzut[0]` do `rozrzut[1]` promienia grupy, co najmniej `odstepM` od siebie. */
  rozrzut: [0.2, 0.85] as [number, number],
  odstepM: 7,
  /** Czasem także w miejskim parku (gdy w komórce nie ma otwartego terenu): małe łowisko z samym obrzeżem. */
  park: { szansa: 0.35, promienM: 120, minParku: 0.6, odMiejscM: 90, miejsc: 2, czlonkow: [3, 5] as [number, number], chochliki: 0.4 },
  /** Boss odradza się dopiero po tylu sekundach aktywnej gry (osobno od zwykłych grup). */
  bossOdnowienieS: 900,
  /** Mgiełka: przezroczystość wnętrza każdej warstwy (mocniej = groźniej). */
  mgla: { obrzeze: 0.09, glebia: 0.16, rdzen: 0.26, klebyCoPx: 14 },
};

export const LOWISKA = {
  /** Promień terytorium jednej watahy (m) – podobnego rzędu co istniejące gangi (GANG_OD_MIEJSC_M = 200). */
  promienM: 70,
  /** Ile watah średnio na km² LASU (nie całej mapy). */
  naKm2Lasu: 1.1,
  /** Zwykła wataha (liczba wilków). */
  pakiet: [3, 6] as [number, number],
  /** Większe spotkanie: rzadsze, więcej przeciwników naraz (bez salwy całej grupy – patrz limitAtakow). */
  wieksze: { czlonkow: [8, 12] as [number, number], szansa: 0.25 },
  /**
   * Trudniejsze stworki głębiej w dziczy (właściciel, 25 Oct 2026) – udział silniejszego warga w watasze
   * rośnie z odległością jej środka od najbliższego znanego miejsca (drzwi/dom – ta sama lista `avoid` co
   * przy stawianiu siedlisk): 0 do `glebiaOdM`, rośnie do `wargMax` przy `glebiaPelnaOdM`. Nigdy 100% i
   * nigdy obowiązkowy do przejścia – to tylko udział, każdy członek losowany z osobna.
   */
  glebiaOdM: 400,
  glebiaPelnaOdM: 1800,
  wargMax: 0.5,
  /** Sekundy AKTYWNEJ symulacji (nie zegara ściennego) od rozbicia, zanim miejsce może dać nową generację. */
  odnowieniePoS: 25,
  /** Odnowienie czeka, gdy bohater jest bliżej niż to (m) – musi być większe niż promień aktywacji poniżej,
   *  żeby wataha nigdy nie odrodziła się na oczach/pod stopami bohatera. */
  bezOdnowieniaWidoczneM: 260,
  /** Z jakiej odległości (m) wataha jest „blisko” i dostaje żywe modele. */
  aktywacjaM: 220,
  /** Ile watah naraz liczy się do wspólnego budżetu żywych modeli (informacyjnie – patrz brief rozdz. 9). */
  pobliskieMax: 3,
  /** Wspólny limit równoczesnych sekwencji ataku (zapowiedź…odpoczynek) wokół bohatera. */
  limitAtakow: { wrecz: 2, dystans: 1 },

};

// ============================================================================
//  Profile walki stworków w „nowej walce” (objects/StworAI.ts; właściciel 26.10.2026: „zmień to na podobną walkę
//  jak wilki w exp-lore”). Formy ataków z pakietu bestiariusza ChatGPT (exp-lore docs/bestiary/data/actions.json):
//  wolf_lunge, warg_bite + warg_pounce, acorn, a boss QA z peat_slam (klin), roots (koło + spowolnienie) i szarży.
//  Jednostki: metry i m/s (bohater idzie ~19 m/s), ms; obrażenia w połówkach serca. WARTOŚCI DO TESTU.
// ============================================================================

interface ProfilBaza {
  /** Z jakiej odległości (m) zauważa bohatera i od jakiej traci zainteresowanie. */
  wzrokM: number;
  gubiM: number;
  /** Chód (podchodzenie, krążenie) m/s. */
  predkosc: number;
  /** Odpoczynek po każdym ataku (ms) – wtedy najłatwiej go trafić. */
  odpoczynekMs: number;
}

export interface ProfilDoskok extends ProfilBaza {
  rodzaj: 'doskok';
  /** Doskok (wolf_lunge): zapowiedź – pas w stronę zablokowanego celu, potem szybki skok, trafia raz. */
  doskok: { zasiegM: number; trafienieM: number; predkosc: number; zapowiedzMs: number; ms: number; obrazenie: number };
  /** Ugryzienie w klin z bliska (warg_bite). */
  klin?: { zasiegM: number; polKata: number; zapowiedzMs: number; obrazenie: number };
  /** Daleki skok z długą zapowiedzią (warg_pounce), co `coMs`. */
  skok?: { odM: number; zasiegM: number; predkosc: number; zapowiedzMs: number; ms: number; obrazenie: number; coMs: number };
}

export interface ProfilDystans extends ProfilBaza {
  rodzaj: 'dystans';
  /** Trzyma się w tej odległości (m); bliżej niż `uciekaOdM` – odchodzi. */
  trzymaM: [number, number];
  uciekaOdM: number;
  /** Rzut (acorn): pocisk po linii, zatrzymuje się na ścianie. */
  rzut: { zasiegM: number; predkosc: number; promienM: number; zapowiedzMs: number; obrazenie: number };
}

export interface ProfilBoss extends ProfilBaza {
  rodzaj: 'boss';
  /** Szarża po zapowiedzianym pasie. */
  taran: { zasiegM: number; dlugoscM: number; szerM: number; predkosc: number; zapowiedzMs: number; obrazenie: number; coMs: number };
  /** Tupnięcie: koło wokół bossa, spowalnia (brief: min. 50% prędkości, najwyżej 2 s, nie kumuluje się). */
  tupniecie: { promienM: number; zapowiedzMs: number; obrazenie: number; spowolnienie: number; spowolnienieMs: number };
  /** Rogi: klin z bliska. */
  rogi: { zasiegM: number; polKata: number; zapowiedzMs: number; obrazenie: number };
}

export type ProfilStwora = ProfilDoskok | ProfilDystans | ProfilBoss;

export const STWORY_AI: Record<'wilk' | 'warg' | 'chochlik' | 'boss' | 'wrecz', ProfilStwora> = {
  wilk: {
    rodzaj: 'doskok', wzrokM: 44, gubiM: 75, predkosc: 11, odpoczynekMs: 1000,
    doskok: { zasiegM: 7, trafienieM: 0.9, predkosc: 34, zapowiedzMs: 650, ms: 320, obrazenie: 2 },
  },
  warg: {
    rodzaj: 'doskok', wzrokM: 50, gubiM: 85, predkosc: 10, odpoczynekMs: 1300,
    doskok: { zasiegM: 7, trafienieM: 1, predkosc: 32, zapowiedzMs: 800, ms: 340, obrazenie: 3 },
    klin: { zasiegM: 4, polKata: 0.55, zapowiedzMs: 850, obrazenie: 5 },
    skok: { odM: 9, zasiegM: 16, predkosc: 42, zapowiedzMs: 1350, ms: 420, obrazenie: 6, coMs: 7000 },
  },
  /** Chochlik leśny – rzuca żołędziami (towarzysz wargów w głębi łowiska i grupki w mieście). */
  chochlik: {
    rodzaj: 'dystans', wzrokM: 40, gubiM: 70, predkosc: 10, odpoczynekMs: 1100,
    trzymaM: [12, 18], uciekaOdM: 8,
    rzut: { zasiegM: 24, predkosc: 24, promienM: 0.5, zapowiedzMs: 850, obrazenie: 1 },
  },
  /** Mosiężny Kozioł (zastępczy boss QA rdzenia). */
  boss: {
    rodzaj: 'boss', wzrokM: 55, gubiM: 100, predkosc: 8, odpoczynekMs: 1100,
    taran: { zasiegM: 26, dlugoscM: 30, szerM: 1.6, predkosc: 40, zapowiedzMs: 1200, obrazenie: 6, coMs: 5000 },
    tupniecie: { promienM: 7, zapowiedzMs: 1400, obrazenie: 4, spowolnienie: 0.5, spowolnienieMs: 2000 },
    rogi: { zasiegM: 5.5, polKata: 0.65, zapowiedzMs: 1000, obrazenie: 6 },
  },
  /** Każdy inny stworek wręcz (misje, bandyci…): doskok jak wilk; obrażenia z ENEMY_KINDS (profilStwora). */
  wrecz: {
    rodzaj: 'doskok', wzrokM: 40, gubiM: 70, predkosc: 10, odpoczynekMs: 1100,
    doskok: { zasiegM: 6, trafienieM: 0.9, predkosc: 30, zapowiedzMs: 750, ms: 320, obrazenie: 2 },
  },
};

/** Profil walki stworka danego rodzaju (`obrazenie` = ENEMY_KINDS.damage dla zwykłych stworków wręcz). */
export function profilStwora(rodzaj: string, obrazenie: number): ProfilStwora {
  if (rodzaj === 'wilk') return STWORY_AI.wilk;
  if (rodzaj === 'warg') return STWORY_AI.warg;
  if (rodzaj === 'glut') return STWORY_AI.chochlik;
  if (rodzaj === 'koziol' || rodzaj === 'upior') return STWORY_AI.boss;
  const w = STWORY_AI.wrecz as ProfilDoskok;
  return { ...w, doskok: { ...w.doskok, obrazenie: Math.max(1, obrazenie) } };
}
