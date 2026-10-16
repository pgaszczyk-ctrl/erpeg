import { effectiveStage } from './content/questy/progress';
import { sesjaWygasla, toWygasla } from './sesja';
import { translateMission, legacyText } from './content/questy/text';
import { restoreScenario, isWithdrawnCityQuest } from './content/questy/scenarios';
import { lang, setLanguage, tx, tr, type Txt } from './i18n';
import { setServerQuizzes } from './quizzes';
import type { CityMap, Building } from './map/CityMap';
import { MISJE, type Miejsce, type Misja, type Etap } from './content/fabula';
import { api, type LoginResult, type SaveData, type Snapshot, type Stats } from './api';
import { PX_PER_M } from './map/CityMap';
import { loadGear, saveGear, normalizeSlot, addEssence, owns } from './inventory';
import { localCombat, type CombatSave } from './combat/state';
import { KOSCIOL, URZAD, POLICJA, NAGRODA, ZBIERANIE, BIBLIOTEKA_MAPA } from './content/zlecenia';
import { REPORTAZ, ROZNOSZENIE } from './content/gazeta';
import type { Place as CityPlace } from './map/CityMap';
import { rng } from './rng';
import { DEFAULT_LOOK, cleanLook, type Look } from './look';
import { TRUDNOSCI, trudnoscZWieku } from './content/trudnosc';
import { PLAYER } from './objects/Player';
import { zyciePostaci, poziomPostaci } from './content/historia';
import type { StanDoOsiagniec } from './content/osiagniecia';
import { loadSettings } from './settings';
import { WSKRZESZENIE } from './content/sklepy';
import { odrostDrzew } from './map/drzewa09';
import { TEST } from './version';
import { testLook } from './testAppearance';
import { setTestVehicle } from './testTransport';
import { odswiezSlownictwoMisji } from './content/slownictwo';
import type { Proba } from './content/probyMaga';

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
  /** The scale that fell from the shadow (content/probyMaga.ts). */
  luska?: { m: string; x: number; y: number; s: number; done?: boolean };
  /** The wizard's trials before the required level. */
  proby?: {
    k?: Proba;
    done: Proba[];
    /** EXP of skipped trials, added to the next one. */
    carry: number;
    /** Gangs broken up when the gang trial began. */
    g0?: number;
    /** The gang made for the trial (where it lies, on which map). */
    gang?: { m: string; x: number; y: number; s: number };
    /** The burnt circle (x, y) and where the arrow points (fx, fy). */
    spot?: { m: string; x: number; y: number; fx: number; fy: number; s: number };
    /** The wizard's "you are ready" note was delivered. */
    gotowy?: boolean;
  };
}

export const session = {
  testCombat: null as CombatSave | null,
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
  /** Hubs copied onto the hero's map (content/mapa.ts MAPA_PODROZNIKA): where it was done and what was copied. */
  mapyPodroznika: [] as { lat: number; lon: number; h: [string, number, number, string][] }[],
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
  questResults: {} as NonNullable<SaveData['questResults']>,
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
  /** Preserve the shared production appearance while test uses its separate local choice. */
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
    session.extra = list.map(({ sekret, ...m }) => odswiezSlownictwoMisji(m));
    session.secrets = new Set(list.filter((m) => m.sekret).map((m) => m.id));
  } catch {
    session.extra = [];
    session.secrets = new Set();
  }
  await settings;
}

export function startSession(r: LoginResult) {
  const p = r.player;
  setLanguage(p.save.language);
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
  session.mapyPodroznika = Array.isArray(p.save.mapyPodroznika) ? p.save.mapyPodroznika.filter((m) => typeof m?.lat === 'number' && typeof m?.lon === 'number' && Array.isArray(m.h)).slice(-200) : [];
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
  session.questResults = { ...(p.save.questResults ?? {}) };
  session.libRiddles = 0;
  for (const m of p.save.gen ?? []) session.gen[m.id] = translateMission(restoreScenario(odswiezSlownictwoMisji(m)));
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
  session.testCombat = null;
  if (TEST) {
    const states = [p.save.testCombat, a?.testCombat, localCombat(p.name)].filter((s): s is CombatSave => !!s && s.version === 1 && s.scale === PX_PER_M);
    const state = states.sort((x,y) => y.stamp-x.stamp)[0];
    if (state) {
      session.testCombat = state;
      const z = state.progress;
      session.nonce = state.nonce; session.hp = state.hero.hp;
      session.exp=z.exp; session.coins=z.coins; session.stats=structuredClone(z.stats); session.missions={...z.missions}; session.story=structuredClone(z.story); session.mikstury=z.mikstury;
      session.etap={...z.etap};session.fabula=[...(z.fabula??[])];session.flagi={...z.flagi};
      loadGear(z.gear);
      // The TEST checkpoint replaces the legacy abandoned-session replay.
      session.abandoned=null;
    }
  }
}

/** What the Księga osiągnięć counts, from the session (also the newspaper's daily badges). */
export function stanOsiagniec(): StanDoOsiagniec {
  const st = session.stats;
  return {
    km: st.m / 1000, zabite: Object.values(st.kills).reduce((a, b) => a + b, 0), gangi: st.gangs ?? 0, pojedynki: st.duels ?? 0,
    misje: st.missions, owoce: st.fruit, zarobione: st.earned, poziom: poziomPostaci(session.exp), tytul: session.story.title ?? null, hasla: st.codes,
  };
}

/** Sends the current progress to the server. */
let saveChain: Promise<unknown> = Promise.resolve();
export function saveNow(hp: number) {
  session.hp = hp;
  // Keep states of story missions and of random ones still in progress.
  const gen = Object.values(session.gen).filter((m) => ['active', 'goal'].includes(session.missions[m.id]));
  const missions: Record<string, MissionState> = {};
  for (const [id, st] of Object.entries(session.missions)) {
    if (!id.startsWith('gen-') || gen.some((m) => m.id === id)) missions[id] = st;
  }
  const data: SaveData = {
    ...(TEST ? { testCombat: session.testCombat } : {}),
    language: lang, questResults:session.questResults, coins: session.coins, hp, missions, fog: session.fog, fogs: session.fogs, lokaty: session.lokaty, story: session.story, diamenty: session.diamenty, flagi: session.flagi, byl: session.byl, mikstury: session.mikstury, bezStrzalki: session.bezStrzalki, mapyPodroznika: session.mapyPodroznika, namioty: session.namioty, etap: session.etap, fabula: session.fabula,
    at: session.at && { m: session.at.m, x: Math.round(session.at.x), y: Math.round(session.at.y), s: PX_PER_M },
    jazda: session.jazda, gen, ...saveGear(), stats: session.stats, chest: session.chest, riddles: session.riddles, seen: session.seen, daily: session.daily, look: TEST ? session.productionLook : session.look,
  };
  // Card/clue checkpoints can happen close together. An older request must never overwrite
  // a newer completion; snapshot before queuing so later choices cannot mutate a pending save.
  const snapshot=structuredClone(data), token=session.token, exp=session.exp;
  const next=saveChain.catch(()=>{}).then(()=>api.save(token,snapshot,exp));
  saveChain=next;
  next.catch((e) => { if (toWygasla(e)) sesjaWygasla(token); });
  return next;
}

export function missionState(m: Misja): MissionState {
  return session.missions[m.id] ?? 'new';
}

export function setMissionState(m: Misja, s: MissionState) {
  session.missions[m.id] = s;
  if (s === 'done' && m.scenariusz) {
    session.questResults[m.id] = { originMap:m.scenariusz.mapId, choices:{...m.scenariusz.choices}, routeM:m.scenariusz.routeM,
      ...(m.id === 'quest.tea_map' ? {reading:1} : {}) };
    delete session.gen[m.id];
  }
}

/**
 * Is a mission shown (gold door, arrow)? Taken ones always are; new ones only when their
 * requirements are met (level, earlier missions done, an item in hand) – mission chains.
 */
export function missionAvailable(m: Misja) {
  if (isWithdrawnCityQuest(m.id)) return false;
  if (m.scenariusz && (m.scenariusz.mapId !== session.mapId || missionState(m) === 'done')) return false;
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
  return effectiveStage(m, stageIndex(m), m.scenariusz?.choices ?? session.questResults[m.id]?.choices);
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
  const fill = (t: string, zl = '') => legacyText(t).replace('{adres}', adres).replace('{ulica}', ulica).replace('{zloczynca}', zl);

  if (police) {
    const bandit = r() < 0.5;
    const zl = pick(POLICJA.zloczyncy);
    const nagroda = bandit ? POLICJA.nagrodaBandyta : POLICJA.nagrodaPotwor;
    const przedmiot = r() < POLICJA.szansaNaPrzedmiot ? pick(POLICJA.przedmioty) : undefined;
    return {
      id, placeId: place.id, adres: place.name, tytul: legacyText(pick(POLICJA.tytuly)), nagroda, przedmiot,
      opis: fill(pick(bandit ? POLICJA.bandyta : POLICJA.potwor), zl),
      zadanie: bandit
        ? { typ: 'pokonaj', miejsce: adres, ile: 1, wrog: 'bandyta', szukaj: true, cel: tx(`Znajdź i pokonaj: ${zl} (okolice ul. ${ulica})`, `Find and defeat: ${zl} (near ${ulica})`) }
        : { typ: 'pokonaj', miejsce: adres, ile: 1, wrog: 'wielki_glut', cel: tx(`Zabij wielkiego chochlika przy ul. ${ulica}`, `Defeat the giant imp near ${ulica}`) },
      zakonczenie: legacyText('Dobra robota, łowco nagród! Oto obiecana nagroda.'),
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
      const iluPL = `${ile} ${ile % 10 >= 2 && ile % 10 <= 4 && (ile % 100 < 12 || ile % 100 > 14) ? z.formy[0] : z.formy[1]}`;
      const ilu = tx(iluPL, `${ile} ${towar === 'grzyb' ? 'mushrooms' : 'pieces of wood'}`);
      const at = city.toLatLon(forest.x, forest.y);
      return {
        id, placeId: place.id, adres: place.name, tytul: legacyText(pick(tpl.tytuly)),
        opis: legacyText(pick(tpl.zbierz)).replace('{ile} {towar}', ilu) + (towar === 'drewno' ? legacyText(' (Drewno da tylko drzewo ścięte siekierą – bez niej leci chrust.)') : ''),
        zadanie: { typ: 'zbierz', towar, ile, miejsce: { lat: at.lat, lon: at.lon }, cel: tx(`Przynieś ${ilu} z lasu`, `Bring ${ilu} from the forest`) },
        zakonczenie: legacyText(towar === 'grzyb' ? 'Jakie piękne grzyby! Dziękujemy za pomoc.' : 'Świetne drewno, ławki będą jak nowe. Dziękujemy!'),
        nagroda: ZBIERANIE.premia + ile * z.zaSztuke,
      };
    }
  }
  const fight = roll < 0.67;
  const extra = Math.round(distM / 100) * NAGRODA.zaKazde100m;
  return {
    id, placeId: place.id, adres: place.name, tytul: legacyText(pick(tpl.tytuly)),
    opis: fill(pick(fight ? tpl.pokonaj : tpl.idz)),
    zadanie: fight
      ? { typ: 'pokonaj', miejsce: adres, ile: 3 + Math.floor(r() * 3), wrog: 'glut', cel: tx(`Przegoń chochliki spod ${adres}`, `Drive the imps away from ${adres}`) }
      : { typ: 'idz', miejsce: adres, cel: tx(`Idź pod ${adres}`, `Go to ${adres}`) },
    zakonczenie: legacyText(place.kind === 'church'
      ? 'Dziękujemy za pomoc! Zajrzyj tu znowu następnym razem – zawsze znajdzie się jakaś prośba.'
      : 'Sprawa załatwiona. Urząd dziękuje – kolejne sprawy następnym razem.'),
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
  const fill = (t: string) => legacyText(t).replace('{cel}', cel.name).replace('{km}', String(d));
  return {
    id, placeId: place.id, adres: place.name,
    tytul: fill(B.tytuly[Math.floor(r() * B.tytuly.length)]),
    opis: fill(B.opisy[Math.floor(r() * B.opisy.length)]),
    zadanie: {
      typ: 'idz', miejsce: { lat: at.lat, lon: at.lon }, cel: tx(`Zbadaj drogę do miejscowości ${cel.name}`, `Survey the route to ${cel.name}`),
      komunikat: tx(`Droga do miejscowości ${cel.name} zbadana! Zadanie wykonano – wróć do najbliższej biblioteki (albo do: ${place.name}).`, `Route to ${cel.name} surveyed! Quest complete — return to the nearest library (or to ${place.name}).`),
    },
    dowolnaBiblioteka: true,
    zakonczenie: legacyText(B.zakonczenie),
    nagroda: d * B.monetZaKm,
    doswiadczenie: d * B.expZaKm,
  };
}

/**
 * The newsboy's reporter errand (owner, 11 Oct 2026): go to a place in town (a shop, office, temple…,
 * else an addressed house) and write a note there – it finishes on the spot. One per newsboy per login.
 * `placeId` = 'gazeta:<map>:<x>:<y>' keeps where it was given (newsboys walk around).
 */
/**
 * A school's/library's short name for the paper: up to and with its number, without patrons and the town
 * („Szkoła Podstawowa nr 50 im. … w Lublinie” → „Szkoła Podstawowa nr 50”); null when it has no number.
 */
export function krotkaNazwa(name: string): string | null {
  const m = /^(.*?\bnr\.?\s*\d+[a-z]?)\b/i.exec(name);
  if (!m) return null;
  return m[1].replace(/\s+im\..*?(?=\s+(?:filia|nr)\b|$)/i, '').replace(/\s+w\s+[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]*/u, '').replace(/\s+/g, ' ').trim();
}

export function newsboyMission(city: CityMap, folk: { id: string; x: number; y: number; name: string }): Misja | null {
  const id = `gen-gazeta-${folk.id}-${session.nonce}`;
  const taken = session.gen[id];
  if (taken) return taken;
  const R = REPORTAZ;
  const r = rng(hash(`${folk.id}:${session.nonce}:gazeta`));
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - folk.x, p.y - folk.y) / PX_PER_M;
  const inRange = (p: { x: number; y: number }) => { const d = dist(p); return d >= R.odM && d <= R.doM; };
  // Only public places (libraries, schools…) or a plain address – no businesses (REPORTAZ.miejsca); a place goes by
  // its short name with its number („Szkoła Podstawowa nr 50”, owner 12 Oct 2026), places without a number by address.
  const places = city.places.filter((p) => p.name && R.miejsca.includes(p.kind) && inRange(p.door) && (krotkaNazwa(p.name) || p.building?.addresses[0]));
  const houses = () => city.addressed().filter((b) => b.door && b.addresses[0] && inRange(b.door));
  let cel = null as { name: string; x: number; y: number } | null;
  const pickPlace = () => {
    const p = places[Math.floor(r() * places.length)];
    cel = { name: krotkaNazwa(p.name) ?? p.building!.addresses[0]!, x: p.door.x, y: p.door.y };
  };
  const pickHouse = () => {
    const hs = houses();
    if (!hs.length) return;
    const b = hs[Math.floor(r() * hs.length)];
    cel = { name: b.addresses[0]!, x: b.door!.x, y: b.door!.y };
  };
  if (places.length && r() >= R.adres) pickPlace();
  else pickHouse();
  if (!cel && places.length) pickPlace();
  if (!cel) return null;
  const km = dist(cel) / 1000;
  const at = city.toLatLon(cel.x, cel.y);
  const fill = (t: Txt) => tr(t).replaceAll('{cel}', cel!.name);
  return {
    id, placeId: `gazeta:${city.id}:${Math.round(folk.x)}:${Math.round(folk.y)}`, adres: folk.name,
    tytul: fill(R.tytuly[Math.floor(r() * R.tytuly.length)]),
    opis: fill(R.opisy[Math.floor(r() * R.opisy.length)]),
    zadanie: { typ: 'idz', miejsce: { lat: at.lat, lon: at.lon }, cel: fill(R.cel), komunikat: tr(R.komunikat) },
    naMiejscu: true,
    zakonczenie: tr(R.komunikat),
    nagroda: Math.max(R.minMonet, Math.round(km * R.monetNaKm)),
    doswiadczenie: Math.max(R.minExp, Math.round(km * R.expNaKm)),
  };
}

/** Does this newsboy ask for help delivering papers? One in ROZNOSZENIE.co, fixed by his id. */
export function newsboyDelivers(folk: { id: string }) {
  return rng(hash(`${folk.id}:roznos`))() < 1 / ROZNOSZENIE.co;
}

/**
 * Delivering papers (owner, 11 Oct 2026): N addressed houses of one street near the newsboy, visited in
 * any order (stage 'badanie' with clue = house, button „Doręcz gazetę”); paid at the last house.
 * One per newsboy per login, like his reporter's errand.
 */
export function newsboyDelivery(city: CityMap, folk: { id: string; x: number; y: number; name: string }): Misja | null {
  const id = `gen-roznos-${folk.id}-${session.nonce}`;
  const taken = session.gen[id];
  if (taken) return taken;
  const R = ROZNOSZENIE;
  const W = R.warianty;
  const r = rng(hash(`${folk.id}:${session.nonce}:roznos`));
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - folk.x, p.y - folk.y) / PX_PER_M;
  const ll = (p: { x: number; y: number }) => { const q = city.toLatLon(p.x, p.y); return { lat: q.lat, lon: q.lon }; };
  const kmTxt = (m: number) => (Math.round(m / 100) / 10).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB');
  const base = { id, placeId: `gazeta:${city.id}:${Math.round(folk.x)}:${Math.round(folk.y)}`, adres: folk.name, naMiejscu: true };
  // Houses by street (the street = the address without its number).
  const houses = (odM: number, doM: number) => {
    const streets = new Map<string, { addr: string; x: number; y: number; d: number }[]>();
    for (const b of city.addressed()) {
      if (!b.door) continue;
      const d = dist(b.door);
      if (d > doM + 400) continue;
      const addr = b.addresses[0];
      const m = addr?.match(/^(.*\D)\s+\d+\S*$/);
      if (!m) continue;
      const list = streets.get(m[1]) ?? [];
      if (!list.some((h) => h.addr === addr)) list.push({ addr, x: b.door.x, y: b.door.y, d });
      streets.set(m[1], list);
    }
    return streets;
  };
  const round = (v: typeof W.blisko): Misja | null => {
    const good = [...houses(v.odM, v.doM).entries()].filter(([, l]) => {
      const near = Math.min(...l.map((h) => h.d));
      return l.length >= v.min && near >= v.odM && near <= v.doM;
    });
    if (!good.length) return null;
    const [nazwa, all] = good[Math.floor(r() * good.length)];
    // Polish: „ul. Magnoliowa”, but „Aleja Kraśnicka”, „Plac Zamkowy”… keep their own word.
    const ulica = lang === 'pl' && !/^(aleja|al\.|plac|pl\.|rondo|osiedle|os\.|skwer|bulwar|rynek|park|droga|trakt|ulica)\b/i.test(nazwa) ? `ul. ${nazwa}` : nazwa;
    // Houses spread along the street: sorted by distance from the nearest one, then every k-th.
    const start = all.reduce((a, b) => (b.d < a.d ? b : a));
    all.sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
    const ile = Math.min(v.max, all.length);
    const step = all.length / ile;
    const domy = Array.from({ length: ile }, (_, i) => all[Math.floor(i * step)]);
    const far = v === W.daleko;
    const km = start.d / 1000;
    const fill = (t: Txt) => tr(t).replaceAll('{ulica}', ulica).replaceAll('{ile}', String(ile)).replaceAll('{km}', kmTxt(start.d));
    return {
      ...base,
      tytul: fill(far ? R.tytulDaleko : R.tytul),
      opis: fill(far ? R.opisDaleko : R.opis),
      zadanie: { typ: 'idz', miejsce: ll(domy[0]), cel: fill(R.cel) },
      etapy: [{
        typ: 'badanie', miejsce: ll(domy[0]), ile, cel: fill(R.cel),
        tropy: domy.map((d, i) => ({ id: `dom${i}`, miejsce: ll(d), tytul: d.addr, tekst: tr(R.dom), przycisk: tr(R.przycisk) })),
      }],
      zakonczenie: tr(R.koniec),
      nagroda: Math.round(ile * R.monetNaDom * (far ? 2 : 1) + km * R.monetNaKm),
      doswiadczenie: Math.round(ile * R.expNaDom + km * R.expNaKm),
    };
  };
  const client = (): Misja | null => {
    const v = W.klient;
    const list = city.addressed().filter((b) => b.door && b.addresses[0] && dist(b.door) >= v.odM && dist(b.door) <= v.doM);
    if (!list.length) return null;
    const b = list[Math.floor(r() * list.length)];
    const d = dist(b.door!);
    const kto = R.klienci[Math.floor(r() * R.klienci.length)];
    const ktoDuzy = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    // {kto} starts a sentence in the offer and the ending: capitalised there.
    const fill = (t: Txt) => tr(t).replaceAll('! {kto}', `! ${ktoDuzy(tr(kto))}`).replaceAll('{kto}', tr(kto)).replaceAll('{adres}', b.addresses[0]).replaceAll('{km}', kmTxt(d));
    return {
      ...base,
      tytul: fill(R.tytulKlient),
      opis: fill(R.opisKlient),
      zadanie: { typ: 'idz', miejsce: ll(b.door!), cel: fill(R.celKlient), komunikat: ktoDuzy(fill(R.koniecKlient)) },
      zakonczenie: ktoDuzy(fill(R.koniecKlient)),
      nagroda: Math.round(20 + (d / 1000) * R.monetNaKm * 1.5),
      doswiadczenie: Math.round(30 + (d / 1000) * R.expNaKm * 1.5),
    };
  };
  // Pick a kind by weight; when the map has nothing for it (no such street / too far), try the others.
  const kinds: [number, () => Misja | null][] = [[W.blisko.waga, () => round(W.blisko)], [W.daleko.waga, () => round(W.daleko)], [W.klient.waga, client]];
  let pick = r() * kinds.reduce((a, k) => a + k[0], 0);
  const first = kinds.findIndex((k) => (pick -= k[0]) < 0);
  for (const k of [kinds[first], ...kinds.filter((_, i) => i !== first)]) {
    const m = k[1]();
    if (m) return m;
  }
  return null;
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
  for (const raw of [...MISJE, ...session.extra]) {
    const m = translateMission(raw);
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
