// ============================================================================
//  ARENA CECHU – asynchroniczne PvP (właściciel 18.10.2026, docs/walka/PVP_PLAN.md)
//  Sędzia Areny stoi na dużych boiskach/stadionach. Walka toczy się na Arenie
//  Cechu poza mapą (ta sama dla wszystkich). Rywal to „duch” innej postaci na
//  poziomie ±1, której właściciel walczył tego dnia na arenie; gdy takiej nie ma,
//  walczy Mechaniczny Gladiator. Wygrane twojego ducha przychodzą następnego
//  dnia listem do skrzyni w domu: 10 złota za każdą.
//  Limity (pilnuje serwer, docs/sql/arena.sql): 5 walk na godzinę, 15 dziennie.
//  Wspólny zestaw: w walce każdy ma jedno leczenie, mikstury z plecaka nie znikają.
// ============================================================================

export const ARENA = {
  wpisowe: 100,
  nagroda: 150,
  zaObrone: 10,
  naGodzine: 5,
  naDzien: 15,
  /** Ile punktów walki (obrażeń broni) to jedna połówka serca – życie i ciosy obu stron w tych samych jednostkach. */
  jednostka: 2,
  /** Wspólne leczenie: raz na walkę, tyle części pełnego życia. */
  leczenie: 0.5,
  /** Duch leczy się, gdy spadnie poniżej tej części życia; mocny cios z tą szansą, gdy ma dwa działania. */
  duchLeczyPonizej: 0.35,
  duchMocny: 0.3,
  /** Promień płyty areny (W = wysokość bohatera) i odległość startowa. */
  promienW: 9,
  startW: 6,
  /** Mechaniczny Gladiator: przeciętna postać na danym poziomie (atak i trafienie z poziomu). */
  gladiator: { atak: (lvl: number) => 2.5 + lvl * 0.9, trafienie: (lvl: number) => Math.min(0.9, 0.6 + lvl * 0.015), blok: 0.05 },
};

/** Looks of the Arena Cechu, one fixed per town (code-drawn until the artist draws arenas): background, stands, floor, railing. */
export const ARENY_WYGLADY = [
  { nazwa: 'mosiężna', tlo: '#2a1d14', trybuny: [0x3d2a1c, 0x4a3424], piasek: [0xc9a46a, 0xb8925a, 0xdab880], barierka: [0x7a5a26, 0xd6a84c] },
  { nazwa: 'kamienna', tlo: '#22252a', trybuny: [0x4a4d52, 0x5c6066], piasek: [0xb9ad94, 0xa39880, 0xcfc4ab], barierka: [0x3a3d42, 0x8a8f96] },
  { nazwa: 'ogrodowa', tlo: '#1f2a1a', trybuny: [0x3f5a2e, 0x4c6a36], piasek: [0xd2b98a, 0xbfa475, 0xe0cc9e], barierka: [0x6a4a2a, 0xc8a060] },
];

/** The town's coat of arms raked into the arena sand: town name (as kurierMiejsce gives it) → picture in public/.
 *  Waiting for the artist (docs/poczta/do-grafika/…38-P001); until then every arena shows the Exp-lore emblem. */
export const HERBY_ARENY: Record<string, string> = { Lublin: 'swiat/arena/herb_lublin.png' };

/** How the emblem lies in the sand: share of the arena's diameter, blur in map px, colour kept (rest = sand),
 *  sand drifts over it, overall opacity. */
export const GODLO_W_PIASKU = { logo: 'logo-256.png', srednica: 0.36, rozmycie: 0.6, mieszanie: 0.45, nasyp: 0.7, krycie: 0.8 };

/** The artist's arena pictures (38-G001, docs/poczta/od-grafika/2026-10-18_38-G001_arena_warstwy_proba.md; copied by
 *  scripts/arena-grafiki.py): one 640×600 frame for both layers, the sand's middle at `srodek`, its half-width `polosX`
 *  picture px (= the arena's radius in the game), height/width `spłaszczenie`; flag poles on post tops, the plaque
 *  (x, y, usable width) – all in picture px. */
export const ARENA_RYSUNEK = {
  plyta: 'swiat/arena/arena_plyta.png',
  tyl: 'swiat/arena/arena_tyl.png',
  plotno: [640, 600] as [number, number],
  srodek: [320, 380] as [number, number],
  polosX: 240,
  spłaszczenie: 0.85,
  tlo: '#22180f',
  maszty: [[258, 86], [380, 86], [161, 128], [470, 128], [87, 190], [550, 190], [50, 287], [587, 287]] as [number, number][],
  tabliczka: [320, 103, 70] as [number, number, number],
  /** The framed view (shares of the arena's radius): the floor across ±kadrX, from kadrGora above to kadrDol below
   *  its middle – a closer view than the whole building (owner: „powiększ arenę”), the sand goes on around it. */
  kadrX: 0.75,
  kadrGora: 1.15,
  kadrDol: 0.6,
  /** Sand all around the building: a tile made by code from the floor's colour, a shade darker. */
  piasekWokol: 0.9,
};

export const ARENA_TEKSTY = {
  sedzia: 'Sędzia Areny',
  powitanie: 'Cech Zbrojmistrzów zaprasza na Arenę! Walczysz z duchem innego śmiałka – jego bronią, jego zbroją, jego sprytem. Wpisowe {wpisowe} monet, zwycięzca bierze {nagroda}.\n\nKto stoczy dziś choć jedną walkę, tego duch walczy też za niego – a jutro w domowej skrzyni czeka list z wynikami.',
  brakMonet: (ile: number, masz: number) => `Wpisowe to ${ile} monet, a masz ${masz}. Wróć z pełniejszą sakiewką.`,
  limitGodzina: (min: number) => `Na dziś wystarczy na chwilę – kolejna walka za ok. ${min} min (najwyżej 5 walk na godzinę).`,
  limitDzien: 'Dziś stoczyłeś już 15 walk. Arena zaprasza jutro!',
  blad: 'Sędzia nie może teraz dotrzeć do Cechu (brak połączenia). Spróbuj za chwilę.',
  gladiator: 'Mechaniczny Gladiator',
  wygrana: (n: number, d: number) => `🏆 Zwycięstwo! +${n} monet. Ranking ${d >= 0 ? '+' : ''}${d}.`,
  przegrana: (d: number) => `Tym razem duch był lepszy. Ranking ${d}.`,
  list: (dzien: string, walk: number, wyg: number, zloto: number) =>
    `📜 List z Areny Cechu (${dzien}).\n\nTwój duch stoczył ${walk} ${walk === 1 ? 'walkę' : walk % 10 >= 2 && walk % 10 <= 4 && (walk % 100 < 12 || walk % 100 > 14) ? 'walki' : 'walk'} i wygrał ${wyg}.${zloto ? `\n\nW kopercie: ${zloto} złota.` : ''}`,
};
