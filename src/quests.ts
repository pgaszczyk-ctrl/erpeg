import { setServerQuizzes } from './quizzes';
import type { CityMap, Building } from './map/CityMap';
import { MISJE, type Miejsce, type Misja, type Etap } from './content/fabula';
import { api, type LoginResult, type SaveData, type Snapshot, type Stats } from './api';
import { PX_PER_M } from './map/CityMap';
import { loadGear, saveGear, normalizeSlot, addEssence, owns } from './inventory';
import { KOSCIOL, URZAD, POLICJA, NAGRODA, ZBIERANIE, BIBLIOTEKA_MAPA } from './content/zlecenia';
import type { Place as CityPlace } from './map/CityMap';
import { rng } from './rng';
import { DEFAULT_LOOK, cleanLook, type Look } from './look';
import { TRUDNOSCI, trudnoscZWieku } from './content/trudnosc';
import { PLAYER } from './objects/Player';
import { zyciePostaci, poziomPostaci } from './content/historia';
import { loadSettings } from './settings';
import { WSKRZESZENIE } from './content/sklepy';
import { odrostDrzew } from './map/drzewa09';
import { TEST } from './version';
import { testLook } from './testAppearance';
import { setTestVehicle } from './testTransport';

// The logged-in character: progress lives here during play and is sent to the
// server only at save points (entering a mission building, finishing a
// mission). Dying or leaving without "Wyjdź" loses anything not yet saved.

export type MissionState = 'new' | 'active' | 'goal' | 'done';

export const MAX_HP = 6;

/** The main story (content/historia.ts, scenes/Story.ts); positions carry their scale `s`. */
export interface Story {
  st: 'start' | 'cien' | 'uczelnia' | 'smok' | 'koniec';
  /** Seconds walked before the dragon's shadow. */
  walked: number;
  target?: { m: string; id: string; name: string; x: number; y: number; s: number };
  dragon?: { m: string; x: number; y: number; s: number };
  choice?: 'zabij' | 'zbadaj';
  /** Shown under the name, e.g. "Pogromca smoka". */
  title?: string;
}

export const session = {
  token: '',
  name: '',
  idik: '',
  startX: 0,
  startY: 0,
  coins: 0,
  exp: 0,
  hp: MAX_HP,
  missions: {} as Record<string, MissionState>,
  fog: undefined as SaveData['fog'],
  /** Explored parts of the town maps (by town id). */
  fogs: {} as NonNullable<SaveData['fogs']>,
  /** The map the hero is on: 'lublin' or a town id (a coachman takes them there). */
  mapId: 'lublin',
  /** Where the hero appears after a coach ride (the station on the new map). */
  arrive: null as { x: number; y: number } | null,
  /** Bank deposits (content/banki.ts). */
  lokaty: [] as NonNullable<SaveData['lokaty']>,
  story: { st: 'start', walked: 0 } as Story,
  /** Diamonds (premium, content/sklepy.ts DIAMENT). */
  diamenty: 0,
  /** Lasting rewards from missions: znizka_woznica (1 = coach rides cheaper), przejazd (free rides left). */
  flagi: {} as Record<string, number>,
  /** Stations reached by coach or train: a diamond takes the hero back to any of them. */
  byl: [] as import('./travel').Stop[],
  /** Test characters (players.immortal): hearts refill instead of dying. */
  immortal: false,
  /** Healing potions (alchemist at petrol stations). */
  mikstury: 0,
  /** Quests whose guiding arrow the player switched off (character sheet → Zadania). */
  bezStrzalki: [] as string[],
  /** Multi-stage missions: the current stage number per mission id (saved as `etap`). */
  etap: {} as Record<string, number>,
  /** Story items (names) from mission stages – not in the backpack, can't be sold (saved as `fabula`). */
  fabula: [] as string[],
  /** Own tents: nights left of each. */
  namioty: [] as { max: number; left: number }[],
  /** Load point: the last hotel (map and position); null = home. */
  at: null as { m: string; x: number; y: number } | null,
  /** A ride under way (journey.ts), shown until it arrives. */
  jazda: null as import('./journey').Journey | null,
  /** Random missions taken in this or earlier sessions and not finished. */
  gen: {} as Record<string, Misja>,
  /** Library riddles answered this session (max BIBLIOTEKA_ZAGADKI.naSesje). */
  libRiddles: 0,
  /** Changes every login, so each place offers a new random mission. */
  nonce: 0,
  /** Last known state of a session that was closed without "Wyjdź". */
  abandoned: null as Snapshot | null,
  /** Counters for the admin panel (km walked, kills, coins earned and spent…). */
  stats: freshStats(),
  /** Missions made in the admin panel (loaded at login). */
  extra: [] as Misja[],
  /** Mission ids where a secret code can be told. */
  secrets: new Set<string>(),
  /** The player's age, for riddles (it also holds the difficulty level). */
  age: 7,
  /** Difficulty level (content/trudnosc.ts). */
  level: TRUDNOSCI[0],
  /** The chest at home: 100 slots and money kept there. */
  chest: freshChest(),
  /** Riddles answered: NPC id -> day. */
  riddles: {} as Record<string, string>,
  /** Mądrale's requests heard lately: key → day number (content/prosby.ts). */
  seen: {} as Record<string, number>,
  /** Daily talks with fixed characters: id -> { day, talks, riddles answered }. */
  daily: {} as Record<string, { d: string; n: number; a: number }>,
  /** How the hero looks (chosen at character creation). */
  look: { ...DEFAULT_LOOK } as Look,
  /** Preserve the shared production appearance while test uses its separate catalogue. */
  productionLook: { ...DEFAULT_LOOK } as Look,
};

export const CHEST_SLOTS = 100;

export function freshChest(): NonNullable<SaveData['chest']> {
  return { slots: Array(CHEST_SLOTS).fill(null), coins: 0 };
}

export function freshStats(): Stats {
  return { m: 0, kills: {}, earned: 0, spent: 0, fruit: 0, missions: 0, codes: 0 };
}

/** Coins in, counted for the statistics. */
export function earn(n: number) {
  session.coins += n;
  session.stats.earned += n;
}

/** Coins out, counted for the statistics. */
export function spend(n: number) {
  session.coins -= n;
  session.stats.spent += n;
}

/** Loads the missions made in the admin panel; the game works without them too. */
export async function loadContent() {
  // The admin panel's knobs (prices, speed…), in parallel with the missions.
  const settings = loadSettings();
  // Today's school quizzes (no waiting for them: the built-in ones fill in).
  Promise.race([api.quizzes(), new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 8000))])
    .then(setServerQuizzes)
    .catch(() => {});
  try {
    // Never hold up the start for long.
    const list = await Promise.race([
      api.content(),
      new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 5000)),
    ]);
    session.extra = list.map(({ sekret, ...m }) => m);
    session.secrets = new Set(list.filter((m) => m.sekret).map((m) => m.id));
  } catch {
    session.extra = [];
    session.secrets = new Set();
  }
  await settings;
}

export function startSession(r: LoginResult) {
  const p = r.player;
  session.token = r.token ?? '';
  session.name = p.name;
  session.idik = p.idik;
  session.age = p.age ?? 7;
  session.level = TRUDNOSCI[trudnoscZWieku(session.age)];
  // Hearts by difficulty, plus the level bonus (half-hearts count, like hp).
  PLAYER.maxHp = zyciePostaci(session.level.serca, p.exp);
  const c = p.save.chest;
  session.chest = freshChest();
  if (c) {
    session.chest.coins = Math.max(0, c.coins | 0);
    c.slots?.slice(0, CHEST_SLOTS).forEach((s, i) => (session.chest.slots[i] = normalizeSlot(s)));
  }
  session.riddles = { ...(p.save.riddles ?? {}) };
  session.seen = { ...(p.save.seen ?? {}) };
  session.daily = { ...(p.save.daily ?? {}) };
  session.productionLook = cleanLook(p.save.look);
  session.look = testLook(session.productionLook, p.name);
  setTestVehicle('pieszo');
  // Convert from the map scale the start was stored in.
  const k = PX_PER_M / (p.map_scale ?? 4);
  session.startX = p.start_x * k;
  session.startY = p.start_y * k;
  session.fog = p.save.fog;
  session.fogs = { ...(p.save.fogs ?? {}) };
  session.lokaty = [...(p.save.lokaty ?? [])];
  session.story = { st: 'start', walked: 0, ...(p.save.story ?? {}) };
  // Power stones are gone (4 Oct 2026): each old one is worth one diamond resurrection.
  session.diamenty = Math.max(0, p.save.diamenty ?? 0) + Math.max(0, p.save.kamienie ?? 0) * WSKRZESZENIE.diamentow;
  session.flagi = { ...(p.save.flagi ?? {}) };
  session.byl = Array.isArray(p.save.byl) ? p.save.byl.slice(-40) : [];
  session.immortal = !!p.immortal;
  session.mikstury = Math.max(0, p.save.mikstury ?? 0);
  session.bezStrzalki = Array.isArray(p.save.bezStrzalki) ? p.save.bezStrzalki.slice(0, 20) : [];
  session.etap = p.save.etap && typeof p.save.etap === 'object' ? { ...p.save.etap } : {};
  session.fabula = Array.isArray(p.save.fabula) ? p.save.fabula.filter((x) => typeof x === 'string').slice(0, 60) : [];
  session.namioty = (p.save.namioty ?? (p.save.namiot ? [{ max: 20, left: 20 }] : [])).filter((t) => t.left > 0);
  session.mapId = 'lublin';
  session.arrive = null;
  const at = p.save.at;
  session.at = at ? { m: at.m, x: (at.x * PX_PER_M) / (at.s || PX_PER_M), y: (at.y * PX_PER_M) / (at.s || PX_PER_M) } : null;
  session.jazda = p.save.jazda ?? null;
  session.coins = p.save.coins ?? 0;
  loadGear(p.save);
  // The test server's first essences were a count and a blow counter: now flasks in the backpack.
  for (let i = 0; i < Math.min(20, p.save.esencje ?? 0); i++) addEssence('dab');
  session.exp = p.exp;
  session.hp = Math.max(1, Math.min(PLAYER.maxHp, p.save.hp ?? PLAYER.maxHp));
  session.missions = { ...(p.save.missions ?? {}) };
  session.stats = { ...freshStats(), ...(p.save.stats ?? {}) };
  session.gen = {};
  session.libRiddles = 0;
  for (const m of p.save.gen ?? []) session.gen[m.id] = m;
  session.nonce = Math.floor(Math.random() * 1e9);
  odrostDrzew(); // ścięte drzewa i strząśnięte owoce wracają przy każdym logowaniu
  const a = r.abandoned ?? null;
  if (a) {
    const ka = PX_PER_M / (a.s ?? 4);
    a.x *= ka;
    a.y *= ka;
    for (const e of a.enemies ?? []) {
      e.x *= ka;
      e.y *= ka;
    }
  }
  session.abandoned = a;
}

/** Sends the current progress to the server. */
export function saveNow(hp: number) {
  session.hp = hp;
  // Keep states of story missions and of random ones still in progress.
  const gen = Object.values(session.gen).filter((m) => ['active', 'goal'].includes(session.missions[m.id]));
  const missions: Record<string, MissionState> = {};
  for (const [id, st] of Object.entries(session.missions)) {
    if (!id.startsWith('gen-') || gen.some((m) => m.id === id)) missions[id] = st;
  }
  const data: SaveData = {
    coins: session.coins, hp, missions, fog: session.fog, fogs: session.fogs, lokaty: session.lokaty, story: session.story, diamenty: session.diamenty, flagi: session.flagi, byl: session.byl, mikstury: session.mikstury, bezStrzalki: session.bezStrzalki, namioty: session.namioty, etap: session.etap, fabula: session.fabula,
    at: session.at && { m: session.at.m, x: Math.round(session.at.x), y: Math.round(session.at.y), s: PX_PER_M },
    jazda: session.jazda, gen, ...saveGear(), stats: session.stats, chest: session.chest, riddles: session.riddles, seen: session.seen, daily: session.daily, look: TEST ? session.productionLook : session.look,
  };
  return api.save(session.token, data, session.exp);
}

export function missionState(m: Misja): MissionState {
  return session.missions[m.id] ?? 'new';
}

export function setMissionState(m: Misja, s: MissionState) {
  session.missions[m.id] = s;
}

/**
 * Is a mission shown (gold door, arrow)? Taken ones always are; new ones only when their
 * requirements are met (level, earlier missions done, an item in hand) – mission chains.
 */
export function missionAvailable(m: Misja) {
  if (missionState(m) !== 'new') return true;
  const w = m.wymaga;
  if (!w) return true;
  if (w.poziom && poziomPostaci(session.exp) < w.poziom) return false;
  if (w.misje?.some((id) => session.missions[id] !== 'done')) return false;
  if (w.przedmiot && !owns(w.przedmiot)) return false;
  return true;
}

/** How many stages a mission has (a plain mission is one stage: its `zadanie`). */
export function stageCount(m: Misja) {
  return m.etapy?.length ? m.etapy.length : 1;
}

/** The current stage's number (0-based). */
export function stageIndex(m: Misja) {
  return Math.min(session.etap[m.id] ?? 0, stageCount(m) - 1);
}

/** The task of the current stage (multi-stage missions) or the mission's only task. */
export function zadanieOf(m: Misja): Etap {
  return m.etapy?.length ? m.etapy[stageIndex(m)] : m.zadanie;
}

/** Only the character level is missing (the rest is met): the giver says „come back at level N”. */
export function levelLock(m: Misja): number | null {
  const w = m.wymaga;
  if (missionState(m) !== 'new' || !w?.poziom || poziomPostaci(session.exp) >= w.poziom) return null;
  if (w.misje?.some((id) => session.missions[id] !== 'done')) return null;
  if (w.przedmiot && !owns(w.przedmiot)) return null;
  return w.poziom;
}

/** Story items: give / take by name. */
export function giveStory(names: string[] | undefined) {
  for (const n of names ?? []) if (n && !session.fabula.includes(n)) session.fabula.push(n);
}
export function takeStory(names: string[] | undefined) {
  if (names?.length) session.fabula = session.fabula.filter((n) => !names.includes(n));
}

/** Which part of its series a mission is (1 + the longest chain of earlier series missions it needs). */
export function seriesPart(m: Misja, all: Misja[], seen = new Set<string>()): number {
  if (!m.seria || seen.has(m.id)) return 1;
  seen.add(m.id);
  let best = 0;
  for (const id of m.wymaga?.misje ?? []) {
    const p = all.find((q) => q.id === id && q.seria === m.seria);
    if (p) best = Math.max(best, seriesPart(p, all, seen));
  }
  return best + 1;
}

/** Title for the quest log: "⚙ Serce Zębatka – część 3: Chochliki spod Bramy". */
export function missionTitle(m: Misja, all: Misja[]) {
  return m.seria ? `⚙ ${m.seria} – część ${seriesPart(m, all)}: ${m.tytul}` : m.tytul;
}

/** Experience for finishing a mission (defaults to its coin reward). */
export function missionExp(m: Misja) {
  return m.doswiadczenie ?? m.nagroda;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The random mission a church, office or police station offers: the one
 * already taken there, or a new one for this login.
 */
export function missionForPlace(city: CityMap, place: CityPlace): Misja | null {
  const taken = Object.values(session.gen).find((m) => m.placeId === place.id);
  if (taken) return taken;
  const r = rng(hash(`${place.id}:${session.nonce}`));
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const police = place.kind === 'police';
  const tpl = place.kind === 'church' ? KOSCIOL : URZAD;
  const [dmin, dmax] = police ? POLICJA.odleglosc : tpl.odleglosc;

  // A real address at a sensible distance.
  let target: Building | null = null;
  let distM = 0;
  const all = city.addressed();
  for (let i = 0; i < 400 && !target; i++) {
    const b = all[Math.floor(r() * all.length)];
    if (!b.addresses.length || b === place.building) continue;
    const d = Math.hypot((b.x0 + b.x1) / 2 - place.door.x, (b.y0 + b.y1) / 2 - place.door.y) / PX_PER_M;
    if (d >= dmin && d <= dmax) {
      target = b;
      distM = d;
    }
  }
  if (!target) return null;
  const adres = target.addresses[0];
  const door = city.entranceOf(target);
  const ulica = city.streetNear(door.x, door.y, 200) ?? adres.replace(/\s+\S+$/, '');
  const id = `gen-${place.id}-${session.nonce}`;
  const fill = (t: string, zl = '') => t.replace('{adres}', adres).replace('{ulica}', ulica).replace('{zloczynca}', zl);

  if (police) {
    const bandit = r() < 0.5;
    const zl = pick(POLICJA.zloczyncy);
    const nagroda = bandit ? POLICJA.nagrodaBandyta : POLICJA.nagrodaPotwor;
    const przedmiot = r() < POLICJA.szansaNaPrzedmiot ? pick(POLICJA.przedmioty) : undefined;
    return {
      id, placeId: place.id, adres: place.name, tytul: pick(POLICJA.tytuly), nagroda, przedmiot,
      opis: fill(pick(bandit ? POLICJA.bandyta : POLICJA.potwor), zl),
      zadanie: bandit
        ? { typ: 'pokonaj', miejsce: adres, ile: 1, wrog: 'bandyta', szukaj: true, cel: `Znajdź i pokonaj: ${zl} (okolice ul. ${ulica})` }
        : { typ: 'pokonaj', miejsce: adres, ile: 1, wrog: 'wielki_glut', cel: `Zabij wielkiego chochlika przy ul. ${ulica}` },
      zakonczenie: 'Dobra robota, łowco nagród! Oto obiecana nagroda.',
    };
  }
  const roll = r();
  // A third of them: bring things from a forest nearby (the church wants
  // mushrooms, the office wood).
  if (roll < 0.34) {
    const forest = forestNear(city, place.door.x, place.door.y, ZBIERANIE.lasDo * PX_PER_M, r);
    if (forest) {
      const towar = place.kind === 'church' ? 'grzyb' : 'drewno';
      const z = ZBIERANIE[towar];
      const ile = z.ile[0] + Math.floor(r() * (z.ile[1] - z.ile[0] + 1));
      const ilu = `${ile} ${ile % 10 >= 2 && ile % 10 <= 4 && (ile % 100 < 12 || ile % 100 > 14) ? z.formy[0] : z.formy[1]}`;
      const at = city.toLatLon(forest.x, forest.y);
      return {
        id, placeId: place.id, adres: place.name, tytul: pick(tpl.tytuly),
        opis: pick(tpl.zbierz).replace('{ile} {towar}', ilu) + (towar === 'drewno' ? ' (Drewno da tylko drzewo ścięte siekierą – bez niej leci chrust.)' : ''),
        zadanie: { typ: 'zbierz', towar, ile, miejsce: { lat: at.lat, lon: at.lon }, cel: `Przynieś ${ilu} z lasu` },
        zakonczenie: towar === 'grzyb' ? 'Jakie piękne grzyby! Bóg zapłać.' : 'Świetne drewno, ławki będą jak nowe. Dziękujemy!',
        nagroda: ZBIERANIE.premia + ile * z.zaSztuke,
      };
    }
  }
  const fight = roll < 0.67;
  const extra = Math.round(distM / 100) * NAGRODA.zaKazde100m;
  return {
    id, placeId: place.id, adres: place.name, tytul: pick(tpl.tytuly),
    opis: fill(pick(fight ? tpl.pokonaj : tpl.idz)),
    zadanie: fight
      ? { typ: 'pokonaj', miejsce: adres, ile: 3 + Math.floor(r() * 3), wrog: 'glut', cel: `Przegoń chochliki spod ${adres}` }
      : { typ: 'idz', miejsce: adres, cel: `Idź pod ${adres}` },
    zakonczenie: place.kind === 'church'
      ? 'Bóg zapłać! Zajrzyj tu znowu następnym razem – zawsze znajdzie się jakaś prośba.'
      : 'Sprawa załatwiona. Urząd dziękuje – kolejne sprawy następnym razem.',
    nagroda: (fight ? NAGRODA.pokonaj : NAGRODA.idz) + extra,
  };
}

/**
 * A library's (a learned society's) survey: find the way to a village some
 * kilometres away and come back. One per library per login.
 */
export function mapMissionForLibrary(city: CityMap, place: CityPlace): Misja | null {
  const id = `gen-${place.id}-${session.nonce}`;
  const taken = session.gen[id];
  if (taken) return taken;
  const B = BIBLIOTEKA_MAPA;
  const r = rng(hash(`${place.id}:${session.nonce}:mapa`));
  const km = (p: { x: number; y: number }) => Math.hypot(p.x - place.door.x, p.y - place.door.y) / PX_PER_M / 1000;
  const far = city.settlements().filter((s) => km(s) >= B.odKm && km(s) <= B.doKm);
  if (!far.length) return null;
  const cel = far[Math.floor(r() * far.length)];
  const d = Math.max(B.odKm, Math.round(km(cel)));
  const at = city.toLatLon(cel.x, cel.y);
  const fill = (t: string) => t.replace('{cel}', cel.name).replace('{km}', String(d));
  return {
    id, placeId: place.id, adres: place.name,
    tytul: fill(B.tytuly[Math.floor(r() * B.tytuly.length)]),
    opis: fill(B.opisy[Math.floor(r() * B.opisy.length)]),
    zadanie: {
      typ: 'idz', miejsce: { lat: at.lat, lon: at.lon }, cel: `Zbadaj drogę do miejscowości ${cel.name}`,
      komunikat: `Droga do miejscowości ${cel.name} zbadana! Zadanie wykonano – wróć do najbliższej biblioteki (albo do: ${place.name}).`,
    },
    dowolnaBiblioteka: true,
    zakonczenie: B.zakonczenie,
    nagroda: d * B.monetZaKm,
    doswiadczenie: d * B.expZaKm,
  };
}

/** A walkable spot inside the nearest forest within `maxR` px, if any. */
function forestNear(city: CityMap, x: number, y: number, maxR: number, r: () => number) {
  let best: { x: number; y: number } | null = null;
  let bd = maxR;
  for (const a of city.query({ x0: x - maxR, y0: y - maxR, x1: x + maxR, y1: y + maxR }).areas) {
    if (a.kind !== 'forest') continue;
    for (let i = 0; i < 12; i++) {
      const px = a.x0 + r() * (a.x1 - a.x0);
      const py = a.y0 + r() * (a.y1 - a.y0);
      const d = Math.hypot(px - x, py - y);
      if (d >= bd || !city.areaKindsAt(px, py).includes('forest') || !city.isFree(px, py, 4, 4)) continue;
      bd = d;
      best = { x: px, y: py };
    }
  }
  return best;
}

export interface Place {
  x: number;
  y: number;
  building?: Building;
}

/** Turns an address or lat/lon into a point on the map (a building's door for addresses). */
/** "51.2468, 22.5684" typed as an address (a spot that isn't a building, e.g. a platform). */
export function latLonOf(m: Miejsce): { lat: number; lon: number } | null {
  if (typeof m !== 'string') return m;
  const g = /^\s*(-?\d{1,2}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)\s*$/.exec(m);
  return g ? { lat: +g[1], lon: +g[2] } : null;
}

export function resolvePlace(city: CityMap, m: Miejsce): Place | null {
  const ll = latLonOf(m);
  if (ll) m = ll;
  if (typeof m !== 'string') {
    const p = city.fromLatLon(m.lat, m.lon);
    return { ...p };
  }
  const b = city.findBuilding(m);
  if (!b) return null;
  return { ...city.entranceOf(b), building: b };
}

export interface ResolvedMission {
  m: Misja;
  door: Place;
  target: Place | null;
}

/** Where the current stage happens: its own place, or the giver's door when it names none. */
export function stageTarget(city: CityMap, m: Misja, door: Place): Place | null {
  const z = zadanieOf(m);
  if (z.typ === 'brak') return door;
  const at = z.miejsce;
  if (at === '' || at === undefined || at === null) return door;
  return resolvePlace(city, at);
}

/** Resolves every mission; addresses not found on the map are reported. */
export function resolveMissions(city: CityMap) {
  const ok: ResolvedMission[] = [];
  const missing: string[] = [];
  for (const m of [...MISJE, ...session.extra]) {
    const door = resolvePlace(city, m.adres);
    const target = door ? stageTarget(city, m, door) : null;
    const z = zadanieOf(m);
    if (!door) missing.push(m.adres);
    else if (!target) missing.push(typeof z.miejsce === 'string' ? z.miejsce : JSON.stringify(z.miejsce));
    // Every stage's place, so a typo shows up at once, not halfway through a chain.
    for (const e of m.etapy ?? []) if (door && typeof e.miejsce === 'string' && e.miejsce && !resolvePlace(city, e.miejsce)) missing.push(e.miejsce);
    if (door) ok.push({ m, door, target });
  }
  return { missions: ok, missing };
}
