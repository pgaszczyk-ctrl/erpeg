// Talks to the game server (a Supabase project "erpeg"). All reads and writes
// go through database functions; the publishable key only allows calling them.

const URL = 'https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA';

export async function rpc<T>(fn: string, args: Record<string, unknown>, keepalive = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(URL + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
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
  coins?: number;
  hp?: number;
  missions?: Record<string, 'new' | 'active' | 'goal' | 'done'>;
  /** Explored map (fog of war), see Fog.serialize(). */
  fog?: { s: number; chunks: Record<string, string> };
  /** Explored parts of the town maps (by town id), same format as fog. */
  fogs?: Record<string, { s: number; chunks: Record<string, string> }>;
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
  /** The player's age (riddles are chosen for it); 7 when not given. */
  age?: number;
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
}

export interface LoginResult {
  token?: string;
  player: PlayerInfo;
  abandoned?: Snapshot | null;
  death_place?: string | null;
  /** An old character just got its new 8-character code. */
  new_code?: boolean;
}

export const api = {
  createCharacter: (name: string, startPlace: string, x: number, y: number, scale: number, age: number, look: import('./look').Look) =>
    rpc<LoginResult>('create_character', { p_name: name, p_start_place: startPlace, p_start_x: x, p_start_y: y, p_scale: scale, p_age: age, p_look: look }),
  /** `password` only for old characters (6-character IDIK); they get a new code. */
  login: (name: string, code: string, password?: string) =>
    rpc<LoginResult>('login', { p_name: name, p_idik: code, p_password: password || null }),
  save: (token: string, save: SaveData, exp: number) => rpc<boolean>('save_game', { p_token: token, p_save: save, p_exp: exp }),
  heartbeat: (token: string, snapshot: Snapshot) => rpc<boolean>('heartbeat', { p_token: token, p_snapshot: snapshot }, true),
  logout: (token: string) => rpc<boolean>('logout', { p_token: token }),
  die: (token: string, exp: number, place: string, x: number, y: number, scale: number, stats: Stats) =>
    rpc<boolean>('die', { p_token: token, p_exp: exp, p_place: place, p_x: x, p_y: y, p_scale: scale, p_stats: stats }, true),
  memorial: () =>
    rpc<{ name: string; exp: number; died_at: string; death_place: string | null; resurrected: boolean }[]>('memorial', { p_limit: 100 }),
  resurrect: (name: string, code: string) => rpc<LoginResult>('resurrect', { p_name: name, p_idik: code }),
  /** Missions made in the admin panel. */
  content: () => rpc<(import('./content/fabula').Misja & { sekret?: boolean })[]>('game_content', {}),
  redeem: (token: string, missionId: string, code: string) =>
    rpc<{ reward: string }>('redeem_code', { p_token: token, p_mission_id: missionId, p_code: code }),
};
