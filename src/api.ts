// Talks to the game server (a Supabase project "erpeg"). All reads and writes
// go through database functions; the publishable key only allows calling them.

const URL = 'https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA';

async function rpc<T>(fn: string, args: Record<string, unknown>, keepalive = false): Promise<T> {
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
  /** Id of the sword in use (see content/sklepy.ts). */
  sword?: string;
  /** Level of the sword-fighting skill. */
  swordSkill?: number;
  /** Random missions taken but not finished yet (see content/zlecenia.ts). */
  gen?: import('./content/fabula').Misja[];
  /** Fruit picked and not sold yet. */
  fruits?: Partial<Record<import('./content/sklepy').Owoc, number>>;
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
}

/** What the game remembers of an unfinished session (sent every few seconds). */
export interface Snapshot {
  /** Pixels per metre the positions are in. */
  s?: number;
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
}

export const api = {
  createCharacter: (name: string, password: string, startPlace: string, x: number, y: number, scale: number) =>
    rpc<LoginResult>('create_character', { p_name: name, p_password: password, p_start_place: startPlace, p_start_x: x, p_start_y: y, p_scale: scale }),
  login: (name: string, idik: string, password: string) =>
    rpc<LoginResult>('login', { p_name: name, p_idik: idik, p_password: password }),
  save: (token: string, save: SaveData, exp: number) => rpc<boolean>('save_game', { p_token: token, p_save: save, p_exp: exp }),
  heartbeat: (token: string, snapshot: Snapshot) => rpc<boolean>('heartbeat', { p_token: token, p_snapshot: snapshot }, true),
  logout: (token: string) => rpc<boolean>('logout', { p_token: token }),
  die: (token: string, exp: number, place: string) => rpc<boolean>('die', { p_token: token, p_exp: exp, p_place: place }, true),
  memorial: () => rpc<{ name: string; exp: number; died_at: string; death_place: string | null }[]>('memorial', { p_limit: 100 }),
};
