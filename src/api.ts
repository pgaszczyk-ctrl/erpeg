import { zamykamSesje } from './sesja';
// Talks to the game server (a Supabase project "erpeg"). All reads and writes
// go through database functions; the publishable key only allows calling them.

import { TEST } from './version';

const URL = 'https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA';
/** For the freeze watchdog (a worker calls the server on its own). */
export const RPC = { url: URL, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } };

/** The QR demo (src/demo.ts) plays without a character: nothing is written on the server. */
export const offline = { demo: false };
const WRITES = new Set(['create_character', 'save_game', 'heartbeat', 'logout', 'die', 'redeem_code', 'link_google', 'quiz_answered']);

/** `bearer`: a signed-in Google user's access token (for account functions). */
export async function rpc<T>(fn: string, args: Record<string, unknown>, keepalive = false, bearer?: string): Promise<T> {
  if (offline.demo && WRITES.has(fn)) return true as T;
  let res: Response;
  try {
    res = await fetch(URL + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${bearer ?? KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      keepalive,
    });
  } catch {
    throw new Error('Brak połączenia z serwerem gry. Sprawdź internet.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body && (body.message as string)) || `Błąd serwera (${res.status})`);
  if (body && typeof body === 'object' && 'error' in body && body.error) throw new Error(body.error as string);
  return body as T;
}

export interface SaveData {
  language?: import('./i18n').Lang;
  questResults?: Record<string, import('./content/questy/scenarios').QuestResult>;
  coins?: number;
  hp?: number;
  missions?: Record<string, 'new' | 'active' | 'goal' | 'done'>;
  /** Explored map (fog of war), see Fog.serialize(). */
  fog?: { s: number; chunks: Record<string, string> };
  /** Explored parts of the town maps (by town id), same format as fog. */
  fogs?: Record<string, { s: number; chunks: Record<string, string> }>;
  /** Only the maps whose fog changed are in `fogs`; the server keeps the others (save_game merges them). */
  fogsCzesc?: boolean;
  story?: import('./quests').Story;
  /** Old power stones (gone since 4 Oct 2026; each becomes WSKRZESZENIE.diamentow diamonds at login). */
  kamienie?: number;
  /** Healing potions from the alchemist. */
  mikstury?: number;
  /** Old test-server essence count (now flasks in the backpack). */
  esencje?: number;
  /** Imbued weapons (inventory.ts gear.imbue). */
  nasycenia?: Record<string, { e: string; until: number }>;
  bezStrzalki?: string[];
  /** Hubs copied from a coachman's/captain's/librarian's map: where it was done and the hubs [name, lat, lon, kind k/a/p]. */
  mapyPodroznika?: { lat: number; lon: number; h: [string, number, number, string][] }[];
  /** Multi-stage missions: current stage per mission id. */
  etap?: Record<string, number>;
  /** Story items from mission stages. */
  fabula?: string[];
  /** Diamonds (premium currency, content/sklepy.ts DIAMENT). */
  diamenty?: number;
  /** Lasting mission rewards (quests.ts session.flagi). */
  flagi?: Record<string, number>;
  /** Stations the hero has arrived at by coach/train (for premium rides back). */
  byl?: import('./travel').Stop[];
  /** Own tents: nights left of each (old saves: `namiot: true`). */
  namioty?: { max: number; left: number }[];
  namiot?: boolean;
  /** Bank deposits: coins, when put in (server ms), for how many days, at what %. */
  lokaty?: { kwota: number; od: number; dni: number; procent: number }[];
  /** The last hotel slept in: the next login starts there (none: at home). */
  at?: { m: string; x: number; y: number; s: number } | null;
  /** New controls test (walka/live.ts): where the hero stood at the last save – the next login starts there. */
  tu?: { m: string; x: number; y: number; s: number } | null;
  /** Stamina and mana (content/zasoby.ts). */
  zasoby?: { s: number; m: number };
  /** The skill chosen per weapon kind at a training place (content/umiejetnosci.ts). */
  umiej?: Record<string, string>;
  /** A ride under way (journey.ts): the load point `at` is already its arrival station. */
  jazda?: import('./journey').Journey | null;
  /** Old saves only: the sword in use and the school level. */
  sword?: string;
  swordSkill?: number;
  /** Random missions taken but not finished yet (see content/zlecenia.ts). */
  gen?: import('./content/fabula').Misja[];
  /** Old saves only: fruit counts (now in the backpack). */
  fruits?: Partial<Record<import('./content/sklepy').Owoc, number>>;
  equip?: import('./inventory').Gear['equip'];
  bag?: import('./inventory').Slot[];
  skills?: import('./inventory').Gear['skills'];
  magic?: boolean;
  stats?: Stats;
  /** The chest at home (start point): 100 slots and money kept there. */
  chest?: { slots: (import('./inventory').Slot | null)[]; coins: number };
  /** Riddles answered: NPC id -> day (YYYY-MM-DD). */
  riddles?: Record<string, string>;
  /** Mądrale's requests heard: key → day number (not asked again within 60 days). */
  seen?: Record<string, number>;
  /** Daily talks with fixed characters (content/postacie.ts). */
  daily?: Record<string, { d: string; n: number; a: number }>;
  /** How the hero looks (see look.ts). */
  look?: import('./look').Look;
}

/** Counters for the admin panel. */
export interface Stats {
  /** Metres walked. */
  m: number;
  kills: Record<string, number>;
  earned: number;
  spent: number;
  fruit: number;
  missions: number;
  codes: number;
  /** Riddles answered right. */
  riddles?: number;
  /** Puzzles of the day solved in the newspaper. */
  lamiglowki?: number;
  /** Duels won against townsfolk. */
  duels?: number;
  /** Monster gangs broken up. */
  gangs?: number;
  /** Arena Cechu fights won / lost (the server keeps the ranking). */
  arena?: number;
  arenaPrzegrane?: number;
  /** Dungeon chests opened (content/lochy.ts). */
  lochy?: number;
}

export interface PlayerInfo {
  name: string;
  idik: string;
  start_place: string | null;
  start_x: number;
  start_y: number;
  /** Pixels per metre the start point was saved in. */
  map_scale?: number;
  save: SaveData;
  exp: number;
  dead: boolean;
  died_at: string | null;
  /** Where it died (in `death_scale` pixels per metre), for the ghost map. */
  death_x?: number | null;
  death_y?: number | null;
  death_scale?: number | null;
  /** How many times it was brought back (the first time is free). */
  resurrections?: number;
  /** Test characters: resurrections without limit. */
  infinite_resurrect?: boolean;
  /** The player's age (riddles are chosen for it); 7 when not given. */
  age?: number;
  /** Test characters: can't die (set by hand in the database). */
  immortal?: boolean;
  /** Assigned to a player account (e-mail or Google). */
  konto?: boolean;
  /** The difficulty was chosen after the QR demo (or changed since); the first choice is free. */
  trudnosc_wybrana?: boolean;
  /** The difficulty was already changed today (Warsaw day): the next change tomorrow. */
  trudnosc_dzis?: boolean;
}

/** What the game remembers of an unfinished session (sent every few seconds). */
export interface Snapshot {
  /** Pixels per metre the positions are in. */
  s?: number;
  /** The map: 'lublin' (or missing) or a town id. */
  m?: string;
  x: number;
  y: number;
  hp: number;
  enemies: { x: number; y: number; hp: number; missionId?: string; k?: import('./content/fabula').RodzajWroga }[];
  /** For the newspaper's daily rankings (about once a minute): metres walked in total, badge ids, country, town. */
  kur?: { m: number; o: string[]; k: string | null; c: string | null };
}

export interface LoginResult {
  /** Set only by this client after a successful normal create_character request. Never inferred from EXP. */
  newCharacter?: boolean;
  token?: string;
  player: PlayerInfo;
  abandoned?: Snapshot | null;
  death_place?: string | null;
  /** An old character just got its new 8-character code. */
  new_code?: boolean;
}

/** A fighter for the Arena Cechu (a ghost): what another player meets (content/arena.ts). */
export interface DuchAreny {
  postac?: number;
  name: string;
  poziom: number;
  maxHp: number;
  atak: number;
  trafienie: number;
  blok: number;
  mocny: number;
  bron?: string | null;
  /** Ranged: damage of a shot (bow/wand in hand). */
  strzal?: number;
}
export interface RywalAreny { bilet?: string; poziom?: number; zostalo_godz?: number; zostalo_dzis?: number; blad?: string; za_min?: number;
  rywal: { name: string; poziom: number; snap: DuchAreny; wygrane: number; punkty: number } | null }

export const api = {
  /** Arena Cechu (docs/sql/arena.sql): draw a rival (and keep my ghost), report the result, letters, ranking. */
  arenaRywal: (token: string, snap: DuchAreny) => rpc<RywalAreny>('arena_rywal', { p_token: token, p_snap: snap }),
  arenaWynik: (token: string, bilet: string, wygrana: boolean) =>
    rpc<{ punkty?: number; delta?: number; wygrane?: number; przegrane?: number; blad?: string }>('arena_wynik', { p_token: token, p_bilet: bilet, p_wygrana: wygrana }),
  arenaListy: (token: string) => rpc<{ dzien: string; walk: number; wygranych: number }[]>('arena_listy', { p_token: token }),
  arenaOdbierz: (token: string, dzien: string) => rpc<number>('arena_odbierz', { p_token: token, p_dzien: dzien }),
  arenaRanking: (token: string) => rpc<{ top: { name: string; poziom: number; punkty: number; wygrane: number; przegrane: number }[];
    ja: { punkty: number; wygrane: number; przegrane: number; miejsce: number; obrony: number } | null }>('arena_ranking', { p_token: token }),
  createCharacter: (name: string, startPlace: string, x: number, y: number, scale: number, age: number, look: import('./look').Look) =>
    rpc<LoginResult>('create_character', { p_name: name, p_start_place: startPlace, p_start_x: x, p_start_y: y, p_scale: scale, p_age: age, p_look: look }),
  /** `password` only for old characters (6-character IDIK); they get a new code. */
  login: (name: string, code: string, password?: string) =>
    rpc<LoginResult>('login', { p_name: name, p_idik: code, p_password: password || null }),
  /** Difficulty as an age (6/9/12/18/19): the first choice after the demo is free, later once a day (server-checked). */
  zmienTrudnosc: (token: string, age: number, pierwszy: boolean) =>
    rpc<{ ok: boolean; age?: number; blad?: 'sesja' | 'poziom' | 'dzis' }>('zmien_trudnosc', { p_token: token, p_age: age, p_pierwszy: pierwszy }),
  save: (token: string, save: SaveData, exp: number) => rpc<boolean>('save_game', { p_token: token, p_save: save, p_exp: exp }),
  heartbeat: (token: string, snapshot: Snapshot) => rpc<boolean>('heartbeat', { p_token: token, p_snapshot: snapshot }, true),
  logout: (token: string) => (zamykamSesje(token), rpc<boolean>('logout', { p_token: token })),
  /** Assigns a character (name + code) to the signed-in account (no limit since 11 Oct 2026). */
  linkGoogle: (name: string, code: string, token: string) => rpc<{ ok?: boolean }>('link_google', { p_name: name, p_idik: code }, false, token),
  /** The Google account's characters, most recently played first. */
  myCharacters: (token: string) =>
    rpc<{ name: string; idik: string; dead: boolean; exp: number; last_seen: string | null; created_at: string; look: import('./look').Look | null; age: number | null }[]>('my_characters', {}, false, token),
  /** The server's clock (banks count interest by it, not by the phone's). */
  now: () => rpc<string>('server_now', {}),
  die: (token: string, exp: number, place: string, x: number, y: number, scale: number, stats: Stats) =>
    rpc<boolean>('die', { p_token: token, p_exp: exp, p_place: place, p_x: x, p_y: y, p_scale: scale, p_stats: stats }, true),
  memorial: () =>
    rpc<{ name: string; exp: number; died_at: string; death_place: string | null; resurrected: boolean }[]>('memorial', { p_limit: 100 }),
  resurrect: (name: string, code: string) => rpc<LoginResult>('resurrect', { p_name: name, p_idik: code }),
  /** A character that died in the old game (death was final then) comes back free, with the hospital's penalty (docs/sql/szpital.sql). */
  szpitalPowrot: (name: string, code: string) => rpc<LoginResult>('szpital_powrot', { p_name: name, p_idik: code }),
  /** Missions made in the admin panel. */
  quizzes: () => rpc<[number, number, string, string, string[], string | null][]>('school_quizzes', { p_all: true }),
  // Owner, 17 Oct 2026: release Hela Trybik's entire chain, including Bruno's shop.
  // Other test-only stories remain hidden on production, even though we fetch the full catalogue.
  content: async () => {
    const list = await rpc<(import('./content/fabula').Misja & { sekret?: boolean })[]>('game_content', { p_all: true });
    const released = new Set(['sz_jarmark', 'sz_para', 'sz_chochliki', 'sz_czarcia_lapa', 'sz_slodki_trop', 'sz_herszt', 'sz_zegarmistrz', 'sz_serce', 'sz_cukiernia']);
    return TEST ? list : list.filter((m) => !m.tylkoTest || released.has(m.id));
  },
  redeem: (token: string, missionId: string, code: string) =>
    rpc<{ reward: string }>('redeem_code', { p_token: token, p_mission_id: missionId, p_code: code }),
};
