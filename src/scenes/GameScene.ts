import { missionNotes } from '../content/questy/progress';
import { planCityQuests } from '../content/questy/planner';
import { CITY_SCENARIOS, isWithdrawnCityQuest } from '../content/questy/scenarios';
import { lang } from '../i18n';
import { legacyText, dialogueMetadata } from '../content/questy/text';
import { shopItem, shopGoods, type ShopEntry, type ShopPresentation } from '../ui/shopData';
import { SKALA_POSTACI } from '../skala';
import Phaser from 'phaser';
import { itemPictureUrl, goodsPicture, itemTexture } from '../ui/itemIcon';
import { report } from '../errlog';
import { BIBLIOTEKA_ZAGADKI } from '../content/zagadki';
import { TEX, PLAYER_TEX, makePlayerTexture, GOODS_TEX, artScale, peakTexture } from '../art';
import { OSTROSC, zoomZPrzyblizeniem, nastepnePrzyblizenie } from '../screen';
import { hdOn, fitHd, useHdHero, isHd, ensureRed, ensureHd, heroTextureKey } from '../sprites';
import { STALE_HD } from '../content/wyglad';
import { TestRide, vehicleSpeed } from '../testTransport';
import { Ludzik3D, ludzik3d } from '../ludzik3d';
import { LOOK_TOP, LOOK_H } from '../look';
import { touchInput, keyboardDir, consumeAttack, attackAim, resetTouch, resetKeys } from '../controls';
import { loadingGame, loadingMapError } from '../ui/loadingMap';
import { letGo } from '../guard';
import { Player, PLAYER } from '../objects/Player';
import { Slime, ENEMY_KINDS, PREDKOSC_WROGOW } from '../objects/Slime';
import { CityMap, PX_PER_M } from '../map/CityMap';
import { GoryFiltr } from '../map/GoryFiltr';
import { GORY } from '../content/gory';
import { MapRenderer, wallHeight, WALL_SKEW, WALLS_UP, type Uprawa09 } from '../map/MapRenderer';
import type { Korona } from '../map/Korony';
import { Pociagi } from '../map/Pociagi';
import { torStacji } from '../map/perony';
import { WYGLAD_09 } from '../map/Podloze09';
import { straganObraz } from '../map/targ09';
import { GEN_DOTS } from '../map/ziemia09';
import { DRZEWA_09 } from '../content/korony';
import { Explored, FogView, visionPolygon, BASE_VIEW_RANGE, pointInPolygon, markBuilding } from '../map/Fog';
import { LUP_HERSZTA, BERSERKER } from '../content/gangi';
import { WROGOWIE, ZADAN_NARAZ, KOLOR_GLOWNEGO, KOLORY_ZADAN, jakDaleko, type RodzajWroga, type Misja } from '../content/fabula';
import type { QuestLine } from '../ui/character';
import { ESENCJE, type Esencja } from '../content/esencje';
import { WALKA } from '../content/walka';
import { askText } from '../ui/prompt';
import { showChest } from '../ui/chest';
import { Npcs, riddleFor, requestFor, dayNumber, today, type Npc } from './Npcs';
import { NIE_POWTARZAJ_DNI } from '../content/prosby';
import { FixedNpcs } from './FixedNpcs';
import { Story } from './Story';
import { Landmarks } from './Landmarks';
import { note } from '../log';
import { Townsfolk, isNight, type Folk } from './Townsfolk';
import { PROSBY, MIESZKANCY } from '../content/mieszkancy';
import { PODLOZE } from '../content/podloze';
import { poziomPostaci, zyciePostaci, szybkoscPostaci, ADMIN_SZYBKOSC, expNaPoziom, MAKS_POZIOM_POSTACI } from '../content/historia';
import { HOTEL_CENA, HOTEL_PREMIA, NAMIOT } from '../content/hotele';
import { WIDOK, TRUDNOSCI, trudnoscZWieku, WYBOR_TRUDNOSCI } from '../content/trudnosc';
import { DIAMENT, DIAMENT_WSPIERAJACY, GRUPY, POJAZDY, type Grupa } from '../content/sklepy';
import { STRZALY, AMUNICJA, type Amunicja } from '../content/zuzycie';
import { WOZNICA } from '../content/pociagi';
import { Zabytki } from '../map/Zabytki';
import { WOZY, SLUPY_SZYLDOW, SNOP_SZYLDU, POSWIATA_SZYLDU } from '../content/swiat';
import { BANK, LOKATY } from '../content/banki';
import { GRANICA, MIEJSCE_HUD, MIEJSCOWOSC, MAPA_PODROZNIKA } from '../content/mapa';
import { IKONA_HUBA, hubyBlisko, doZapisu, type Hub } from '../huby';
import { worldOrigin, nearestLocality } from '../map/world';
import { cachedMap, coachOffers, coachSide, STRONY, enterWorld, getMap, LOAD_RADIUS, mapName, prepareMap, type Offer, type Trip, type Stop } from '../travel';
import { GRAZYNKA, type ZagadkaPL } from '../content/postacie';
import { SZKOLA_QUIZ } from '../content/quizy';
import { schoolQuiz, quizAnswered } from '../quizzes';
import { krajMapy, krajWPunkcie } from '../kraj';
import { tr, tx } from '../i18n';
import { rng } from '../rng';
import { OWOCE, LECZENIE_OWOCAMI, ALCHEMIK, WARZYWA, LAS, SIEKIERA, type Owoc } from '../content/sklepy';
import { producerRecipe, foodIcon } from '../content/wytworcy';
import { PRODUCER_LOCATIONS } from '../content/wytworcy-miejsca';
import { WORKSHOP_LOCATIONS } from '../content/warsztaty-miejsca';
import { PRZEDMIOTY, NAUKA_MAGII, UMIEJETNOSCI, SWIATLO, PLECAK, MAKS_POZIOM, PIORUNY, type Przedmiot, type Umiejetnosc } from '../content/przedmioty';
import {
  gear, item, addItem, addFruit, fruitCount, fruitValue, sellAllFruit, practice, cooldown, skillLevel, skillProgress,
  meleeDamage, shotDamage, hitChance, strongFactor, instaKillChance, rangedWeapon, weaponEffect, eatFruit as eatInventoryFruit, blockChance, owns, takeFruit, takeGroup, totalFruit, groupCount, luckyCoins, groupValue, sellGroup, imbueOf, addEssence,
  condition, isBroken, useWeapon, repairCost, repair, repairable, ammoOf, takeAmmo, ammoRoom, addAmmo, ownedAmmo, axe, ownsAxe,
  goodsByKind, takeItem, gearLifeBonus, gearSpeedBonus, gearAimBonus, foodCount, nextFood,
} from '../inventory';
import { hold, mouse, consumeRelease, consumeHeal, consumeInteraction, consumeStrong } from '../controls';
import { Forest, Orchards, StreetEnemies, Training, SPORTY_TEX, type SportNpc, type Station, type ForestSpot } from './Ambient';
import { Lowiska } from './Lowiska';
import { LochyWejscia, LochWnetrze, lochSesja, type WejscieLochu } from './Lochy';
import { idLochu } from '../loch/mapa';
import { LOCH, LOCHY, LOCH_TEKSTY } from '../content/lochy';
import { lowiska, LOWISKA, profilStwora } from '../content/lowiska';
import { StworAI, type StworHost } from '../objects/StworAI';
import { stwory, losujLup } from '../content/stwory';
import { SPORT } from '../content/sport';
import type { Place as CityPlace, Building } from '../map/CityMap';
import {
  session, saveNow, stanOsiagniec, earn, spend, missionForPlace, mapMissionForLibrary, newsboyMission, newsboyDelivers, newsboyDelivery, missionState, setMissionState, missionExp, resolveMissions, resolvePlace, missionAvailable, missionTitle,
  zadanieOf, stageIndex, stageCount, stageTarget, levelLock, giveStory, takeStory,
  type ResolvedMission, type Place,
} from '../quests';
import { api, rpc, offline, type Snapshot } from '../api';
import { showGazeta, type Wydanie, type WiescSerwera } from '../ui/gazeta';
import { GAZETA, LAMIGLOWKA, ROZMOWA, STRONY as GZ } from '../content/gazeta';
import { zdobyteOdznaki } from '../content/osiagniecia';
import { TEST, WERSJA, WERSJA_TEST } from '../version';
import { showMenu } from '../ui/menu';
import { demo, powitanie, blackout } from '../demo';
import { teleskop } from '../ui/hud';
import { pokazGdzieKliknac } from '../ui/samouczek';
import { PROM } from '../content/porty';
import { cenaRejsu, krajPortu, mojeProsby, nazwaKraju, odleglosc, poprosOLinie, portKey, portMapId, portPrzy, portyBlisko, rejsyZ, trasaDo, wczytajPorty, type Port, type Rejs } from '../porty';
import { codeLink } from '../ui/codeCard';
import { SamouczekStartu } from './SamouczekStartu';
import { proponowac, zaproponowano, zainstaluj } from '../instalacja';
import { keepResume } from '../update';
import { sesjaWygasla } from '../sesja';
import { DemoRun } from './Demo';
import { SmokAI, aktualizujEfekty, wyczyscEfekty, smokSmierc, type StanGracza } from '../objects/SmokAI';
import { GATUNKI_SMOKOW, ATAKI_SMOKA, TRUDNOSC_SMOKOW, SMOKI_NA_MAPIE, type GatunekId } from '../content/smoki';
import { trzesienieWlaczone } from '../ustawieniaGracza';
import { SmokiNaMapie } from './SmokiNaMapie';
import { Etapy } from './Etapy';
import { rideMs, rideText, serverNow, showJourney, syncClock } from '../journey';
import { SEN, JAWA, DEMO_TEKSTY } from '../content/demo';
import { weather, loadWeather, tickWeather, weatherLabel, isWet } from '../weather';
import { WPLYW_NA_POTWORY, WODNIK, POGODA } from '../content/pogoda';
import { Anomalia } from './Anomalia';
import { WeatherFx } from './WeatherFx';
import { TuryWalki, NAD_KORONAMI, type WynikWalki } from '../walka/TuryWalki';
import { Spotkania } from '../walka/Spotkania';
import { tury, turyWDemo, arenaOn } from '../walka/tryb';
import { WALKA_TUROWA, SPOTKANIA, SMOK_W_TURACH } from '../content/walkaTurowa';
import { ubierzSmoka } from '../objects/smokRysunki';
import { mapaWalki } from '../controls';
import { ARENA, ARENA_TEKSTY } from '../content/arena';
import type { ArenaDane } from './ArenaScene';
import type { DuchAreny } from '../api';
import { sciezkaGry } from '../sciezka';
import { live, skrotKamery } from '../walka/live';
import { wymusPoziom, zwolnijPoziom } from '../ui/poziomo';
import { ZASOBY, zasoby, wydajStamine, wydajMane, udzialStaminy, wyczerpany, regenerujZasoby, maxStaminy, maxMany } from '../content/zasoby';
import { ustawZasobyHud } from '../ui/hudLive';
import { UMIEJETNOSCI as SPECJALNE, domyslnaUmiejetnosc, type Umiej } from '../content/umiejetnosci';

const HEART_DROP_CHANCE = 0.25;
const RESPAWN_MS = 20000;
const DOOR_RADIUS = 14;
/** How close one has to come to a riddle-giver to talk. */
const NPC_RADIUS = 12;

/** Distance from (px, py) to the segment (ax, ay)–(bx, by). */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
/** No enemies this close to home (metres). */
const HOME_SAFE_M = 40;
/** After a dialog closes, swings don't start a talk for this long (ms). */
/** How close (m) the hero reads a road sign. */
const SIGN_READ_M = 25;
/** How near a mountain top counts as standing on it (world maps). */
const PEAK_REACH_M = 30;
/** Protection after a fresh start (ms). */
const OCHRONA_MS = 10_000;
const TALK_PAUSE_MS = 700;
const GOAL_RADIUS = 40;
/** New controls: how near the hero a double tap must land to start something there (map px). */
const INTERAKCJA_PX = 70;
const HEARTBEAT_MS = 3000;
/** How often the heartbeat carries the newspaper's daily numbers (kurier_dni). */
const KURIER_CO_MS = 60_000;
/** How long a character stays on the street after the game was closed without "Wyjdź". */
const LINGER_MS = 10000;
const HIDE_IN = new Set(['forest', 'scrub', 'wetland']);
/** Hold the attack this long (ms) to aim a ranged attack. */
const AIM_DELAY = 250;
const ARROW_SPEED = 260;
const ARROW_RANGE = 170;
const MAGIC_SPEED = 180;
const MAGIC_RANGE = 140;
/** How far from the given spot a wanted villain may hide (px). */
const SEARCH_RADIUS = 90;
const PLACE_LOOK = {
  shop: { roof: '#3f7fd8', wall: '#dbe6f5', sign: TEX.signShop },
  school: { roof: '#b84a3a', wall: '#f0d9c8', sign: TEX.signSchool },
  church: { roof: '#7a5ab8', wall: '#e6ddf3', sign: TEX.signChurch },
  office: { roof: '#8d8f99', wall: '#eeeef2', sign: TEX.signOffice },
  hospital: { roof: '#f2f2f2', wall: '#ffe6e6', sign: TEX.signHospital },
  police: { roof: '#2b3f8a', wall: '#d7def2', sign: TEX.signPolice },
  library: { roof: '#2f8a6a', wall: '#d9efe6', sign: TEX.signLibrary },
  merchant: { roof: '', wall: '', sign: TEX.cart },
  station: { roof: '', wall: '', sign: TEX.coach },
  hotel: { roof: '#8a3a6a', wall: '#f3dce9', sign: TEX.signHotel },
  bank: { roof: '#b8902a', wall: '#f5ecd0', sign: TEX.signBank },
  university: { roof: '#4a5ab8', wall: '#e2e6f5', sign: TEX.signSchool },
  alchemist: { roof: '#3f8f7a', wall: '#dff2ec', sign: TEX.signAlchemist },
  gear: { roof: '#c8702a', wall: '#f5e4d6', sign: TEX.signGear },
  camp: { roof: '', wall: '', sign: TEX.tent },
  maker: { roof: '#a86d37', wall: '#f0ddbc', sign: TEX.signShop },
  workshop: { roof: '#71624f', wall: '#e0d2bc', sign: TEX.signGear },
  port: { roof: '', wall: '', sign: 'sign-port' },
} as const;
/** „na północny zachód” – the way from `a` to `b` in words. */
function kierunekSlownie(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dy = b.lat - a.lat;
  const dx = (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180);
  const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return ['na wschód', 'na północny wschód', 'na północ', 'na północny zachód', 'na zachód', 'na południowy zachód', 'na południe', 'na południowy wschód'][(k + 8) % 8];
}
// Feet collision box (half sizes) relative to the sprite centre.
const FEET = { dy: 5, hw: 2, hh: 1.5 };
/** The sign light (cone + flicker) under signs on posts – every server since 1.032 (owner, 20 Oct 2026). */
const SNOP = true;
/** The player asked the device for less motion: the sign boards hang still and the lights don't blink fast. */
const MNIEJ_RUCHU = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface HudState {
  hp: number;
  maxHp: number;
  /** Bonus half-hearts from a potion (blue). */
  extra: number;
  /** Poisoned by a dragon's smoke: the life tube turns greenish. */
  zatruty?: boolean;
  /** What the heal button would use (null: nothing to heal with, or healthy). */
  heal: { icon: string; n: number } | null;
  coins: number;
  exp: number;
  /** Purple half-hearts in a duel with a townsman (null = no duel). */
  duel: number | null;
  duelMax: number;
  /** Character level (from EXP) and the story title line, if any. */
  level: number;
  title: string | null;
  /** Sword name and skill level, for the HUD. */
  sword: string;
  /** The weapon line needs attention (broken, or few arrows): drawn red. */
  swordWarn: boolean;
  fruits: string;
  /** Apples, plums, grapes in the backpack (the HUD shows them with the fruit pictures). */
  /** Fruit, vegetables and mushrooms in the backpack (the HUD shows them with pictures). */
  fruitN: [number, number, number];
  dead: boolean;
  /** Seconds left while the character is stuck after an unfinished session. */
  lingering: number | null;
  street: string | null;
  /** The weather now, e.g. "🌧 8°C" (empty until known). */
  pogoda?: string;
  /** Active quests (at most 3): goal line, where its arrow points, its colour. */
  quests: { text: string; pos: { x: number; y: number } | null; color: string; main: boolean }[];
  /** Healing potions and edible goods in the backpack (the HUD's heal button). */
  potions: number;
  fruit: number;
  fruitPerHeal: number;
  /** Share of the way to the next level (the HUD's amber tube). */
  expShare: number;
  /** The plaque top right: the town and where in it (see placeInfo). */
  town: string;
  detail: string;
  /** Goods in the backpack by kind (the HUD shows "+1 marchewka" when one grows). */
  goods: Partial<Record<Owoc, number>>;
}

export interface QuestInfo {
  id: string;
  main: boolean;
  title: string;
  text: string;
  pos: { x: number; y: number } | null;
  color: string;
  /** Where the quest was taken (for the quest log). */
  start?: string;
}

/** Arrow colours of the active side quests, kept across scene restarts. */
const questColors = new Map<string, string>();

/** The traveller's map's guide (map screen „🧭 Prowadź”): a hub the arrow points to, kept across scene restarts. */
let droga: Hub | null = null;

/** The one the hero talks to: a character's walking sheet (its head is shown) or a picture (a place's sign). */
export interface Rozmowca { tex?: string; obraz?: string; imie?: string }

export interface DialogRequest {
  language?: import('../i18n').Lang;
  localHumor?: boolean;
  textId?: string;
  buttonMetadata?: { language: string; localHumor: boolean; textId?: string }[];
  title: string;
  text: string;
  buttons: string[];
  /** Optional picture (texture key) per button, e.g. the item on sale. */
  icons?: (string | null)[];
  /** Tabs under the title (e.g. a shop: buy / sell); tapping tab t calls onChoose(-1 - t). */
  tabs?: { labels: string[]; active: number; colors?: number[] };
  /** Pack 26 shop presentation, test only; transactions keep their existing callbacks. */
  shop?: ShopPresentation;
  /** Who speaks (portrait on the left; the hero's on the right). null = nobody (system windows); absent = the last speaker nearby. */
  kto?: Rozmowca | null;
  /** Every button is an answer (riddles without „Później”): all in one colour, so the last one isn't greyed like a way out. */
  odpowiedzi?: boolean;
  onChoose: (index: number) => void;
}

interface Shot {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  left: number;
  damage: number;
  skill: 'luk' | 'magia';
  /** The weapon it came from (its essence works on the hit). */
  weapon: string;
  /** Held long enough (WALKA.mocnyPoMs): its own hit chance. */
  strong: boolean;
  /** Enemies it already flew past (missed). */
  missed: Set<Enemy>;
  /** New controls test: a tired archer aims worse (hit-chance points off). */
  celnoscMinus?: number;
}

type Challenge =
  | { kind: 'kukly'; npc: SportNpc; a: Station; b: Station; step: 'a' | 'b' | 'back'; hits: number; start: number; until: number }
  | { kind: 'wyscig'; npc: SportNpc; name: string; from: { x: number; y: number }; to: { x: number; y: number }; rival: Phaser.GameObjects.Sprite; start: number; rivalMs: number; path: number[]; cum: number[] };

type Enemy = Slime & {
  /** A dragon's kind (content/smoki.ts); the story's dragon is 'cien'. */
  gatunek?: GatunekId;
  missionId?: string; temp?: boolean; folkQuest?: boolean; carrier?: boolean; ambient?: boolean; peaceful?: boolean; fleeUntil?: number; duel?: { folk: Folk; dmg: number };
  /** Weather's effect on its strength (content/pogoda.ts WPLYW_NA_POTWORY): life and damage × this. */
  power?: number;
  /** A wodnik's conjured blobs, and a blob's wodnik. */
  minions?: Set<Enemy>; owner?: Enemy; nextSummon?: number;
  /** Łowiska test pilot (scenes/Lowiska.ts): a wolf-pack member; its territory (centre + radius, world px). */
  lowisko?: boolean; lowiskoHome?: { x: number; y: number; r: number };
};

/** Permanent mission rewards, as named in the reward line. */
const FLAGI_NAZWY: Record<NonNullable<Misja['flaga']>, string> = {
  znizka_woznica: 'zniżka u woźniców',
  schemat_pistoletu: 'schemat pistoletu (pistolet parowy za pół ceny)',
  receptura_alchemika: 'receptura alchemika (mikstura z 30 owoców)',
};

/** Places where the story's question about the dragon's shadow can be asked. */
const STORY_PLACES = new Set(['school', 'church', 'university']);

export class GameScene extends Phaser.Scene {
  private cityQuestEpoch = 0;
  private cityQuestPlanning = false;
  city!: CityMap;
  player!: Player;
  private mapView!: MapRenderer;
  private testRide!: TestRide;
  /** The hero as a live 3D model (TEST, src/ludzik3d.ts); none = the drawn sheet. */
  private ludzik3d?: Ludzik3D;
  private enemies: Enemy[] = [];
  private pickups: Phaser.GameObjects.Image[] = [];
  private missions: ResolvedMission[] = [];
  private markers = new Map<string, Phaser.GameObjects.Image>();
  private hudTimer = 0;
  private lingerUntil = 0;
  private orchards!: Orchards;
  private forest!: Forest;
  private nextTiles = 0;
  private story!: Story;
  /** Blinking talk bubbles over characters with something to say (a pool). */
  private bubbles: Phaser.GameObjects.Image[] = [];
  /** Enemies don't hurt the hero until then (right after a dialog). */
  private noHurtUntil = 0;
  /** A fresh start (login, resurrection, the power stone): enemies can't hurt for OCHRONA_MS; the hero blinks. */
  private protectUntil = 0;

  private protect(now: number) {
    this.protectUntil = now + OCHRONA_MS;
    this.noHurtUntil = Math.max(this.noHurtUntil, this.protectUntil);
    this.toast(`🛡 Ochrona na ${OCHRONA_MS / 1000} sekund – rozejrzyj się spokojnie.`, 2500);
  }
  /** Right after a dialog closes, a swing doesn't start another talk. */
  private talkReadyAt = 0;
  private folk!: Townsfolk;
  /** A sports challenge in progress (coach's dummies or a race). */
  private challenge: Challenge | null = null;
  /** A duel with a townsman: purple half-hearts left (null = no duel). */
  private duelHp: number | null = null;
  private duelCarry = 0;
  /** The school or church whose dialog gets the story question. */
  private storyPlace: CityPlace | null = null;
  private training!: Training;
  private landmarks!: Landmarks;
  private trailAt = 0;
  private shots: Shot[] = [];
  private noManaToast = 0;
  private bezKosztuStrzalu = false;
  private aimLine!: Phaser.GameObjects.Graphics;
  private lastShot = -Infinity;
  /** Part of a heart of damage not taken yet (easy levels). */
  private damageCarry = 0;
  /** Resolves once the server knows about the death. */
  deathSaved: Promise<void> = Promise.resolve();
  /** The hero said no to the diamonds' rescue: now it's the game-over screen. */
  /** Carried to the hospital after a defeat (between the fade out and getting up). */
  private naNoszach = false;
  /** The start tutorial (new characters) and where its arrow points (the nearest newsboy). */
  private samouczek: SamouczekStartu | null = null;
  private samouczekCel: { x: number; y: number; name: string } | null = null;
  private noArrowsToast = -1e9;
  private glow!: Phaser.GameObjects.Graphics;
  private npcs!: Npcs;
  /** Mission stages beyond fights/walks/gathering (Etapy.ts). */
  private etapy!: Etapy;
  private fixed!: FixedNpcs;
  private wornKey = '';
  private home: Building | null = null;
  /** Buildings in sight now, and ever (so each is marked explored once). */
  private seenNow = new Set<Building>();
  private seenEver = new Set<Building>();
  private homeAt = { x: 0, y: 0 };
  private lastBolt = 0;
  private streets!: StreetEnemies;
  explored = new Explored();
  private fogView!: FogView;
  /** What the hero sees right now (world polygon). */
  vision: number[] = [];
  private lastVision = { x: NaN, y: NaN, a: NaN };
  private leaving = false;
  private travelling = false;
  private justRode = false;
  /** Walked onto another map (GRANICA): a word on arrival. */
  private walkedIn: string | null = null;
  private crossAt = 0;
  /** Ferry ports (porty.ts) shown on this map: place id → port; the next check; the hint said. */
  private porty = new Map<string, Port>();
  private portyAt = 0;
  private portyRzekl = false;
  private pushOut = 0;
  private safeAt = { x: 0, y: 0 };
  /** The QR demo (null in a normal game). */
  private demoRun: DemoRun | null = null;
  /** Waking up after the demo's dream: the hero stands still until the welcome and the portrait tutorial are over. */
  private witam = false;
  private introSince: number | null = null;
  /** Dragons fighting the hero (content: objects/Dragon.ts). */
  private dragons = new Map<Enemy, { update(now: number, dt: number): void; destroy(): void }>();
  /** States from dragons' attacks (SmokAI): until when, and the next damage tick. */
  private stany: Partial<Record<StanGracza, { do: number; tik: number }>> = {};
  /** Fractions of a half-heart from dragons' attacks and lingering effects add up here. */
  private smokCarry = 0;
  private smokiNaMapie?: SmokiNaMapie;
  /** Blows that beat the story's dragon (its life is set when the fight starts). */
  static readonly SMOK_CIOSOW = 10;
  /** The turn fight in progress (walka/TuryWalki.ts, test server), and meeting groups on the map. */
  private walka: TuryWalki | null = null;
  private spotkania: Spotkania | null = null;
  /** Łowiska test pilot (scenes/Lowiska.ts, content/lowiska.ts; ?lowiska=1): wolf packs in real forests. */
  private lowiska: Lowiska | null = null;
  /** Dungeon entrances around the hero on the surface (live fight only) and, underground, the dungeon itself. */
  private lochy?: LochyWejscia;
  private loch?: LochWnetrze;
  private wilki = new Map<Enemy, StworAI>();
  /** Boss's stomp: the hero walks slower until then (one at a time, never stacked). */
  private spowolnienieDo = 0;
  private spowolnienie = 1;
  /** Seconds of ACTIVE simulation (never advances while paused/hidden/in a dialog): the łowiska respawn clock. */
  private lowiskaCzasS = 0;
  /** Shared limiter for simultaneous wolf attack sequences (brief: max 2 melee + 1 ranged around the hero). */
  private atakiWrecz = 0;
  private atakiDystans = 0;
  /** Fractions of a half-heart from wolf charges add up here (like smokCarry/damageCarry). */
  private wilkCarry = 0;

  constructor() {
    super('game');
  }

  create() {
    // Include create() itself: preparing the first chunks can occupy several seconds.
    this.introSince = loadingGame() ? this.time.now : null;
    // Keep workers/updates active without competing with the opaque intro for
    // every GPU frame. travel.ts renders the prepared scene before revealing it.
    this.scene.setVisible(!loadingGame());
    this.stalls = [];
    this.pociagi = undefined; // scenes are reused: the trains belong to the new map view
    this.porty = new Map();
    this.portyAt = 0;
    this.portyRzekl = false;
    this.city = this.registry.get('city') as CityMap;
    if (!this.city.id.startsWith('w:')) {
      for (const p of PRODUCER_LOCATIONS) this.city.addProducer(p.name, p.address, p.lat, p.lon);
      for (const p of WORKSHOP_LOCATIONS) this.city.addProducer(p.name, p.address, p.lat, p.lon, 'workshop');
    }
    this.enemies = [];
    this.walka = null;
    mapaWalki.fn = null;
    mapaWalki.drag = null;
    document.body.classList.remove('walka-tur');
    document.getElementById('walka-panel')?.remove();
    this.dragons = new Map();
    this.stany = {};
    this.smokCarry = 0;
    wyczyscEfekty();
    this.pickups = [];
    this.farObjects = [];
    this.signGlows = new Set();
    this.posts = [];
    this.postsNight = null;
    this.markers = new Map();
    this.leaving = false;
    this.lingerUntil = 0;
    this.naNoszach = false;
    this.toldPlace = null;
    this.localTown = null;
    this.askingTown = false;
    this.mapView = new MapRenderer(this, this.city);
    this.testRide = new TestRide(this);
    this.ludzik3d = ludzik3d() ? new Ludzik3D(this) : undefined;
    if (this.ludzik3d) {
      const l = this.ludzik3d;
      this.events.once('shutdown', () => { l.destroy(); if (this.ludzik3d === l) this.ludzik3d = undefined; });
    }
    this.zabytki = new Zabytki(this, this.city, this.mapView);
    // Góry v2 (world maps with terrain): blur, fog, shrinking and parallax of what lies below, on the graphics card.
    this.gory = GoryFiltr.make(this, this.city);
    this.mapView.onRipe = (q) => this.ripeCrop(q);
    this.mapView.onRipeGone = (im) => this.removePickup(im);
    this.explored = new Explored();
    const inLublin = this.city.id === 'lublin';
    session.mapId = this.city.id;
    this.explored.load(this.city.loch ? undefined : inLublin ? session.fog : session.fogs[this.city.id]);
    // Where the map lies (sunrise/sunset for the fog's parchment); world maps are endless: their origin.
    const mid = this.city.toLatLon(this.city.width / 2, this.city.height / 2);
    this.fogView = new FogView(this, this.explored, Number.isFinite(mid.lat) && Number.isFinite(mid.lon) && Math.abs(mid.lat) <= 90 ? mid : this.city.toLatLon(0, 0));
    this.fogView.podZiemia = !!this.city.loch;
    this.vision = [];
    this.lastVision = { x: NaN, y: NaN, a: NaN };

    // Home: the nearest real house to the start point (hit it to go in).
    this.home = null;
    this.homeAt = { x: -1e6, y: -1e6 };
    if (inLublin) this.setUpHome();
    makePlayerTexture(this, session.look, this.worn());
    this.wornKey = JSON.stringify(this.worn());
    // After a coach ride: at the station of the new map.
    const at = session.arrive ?? { x: session.startX, y: session.startY };
    session.arrive = null;
    this.travelling = false;
    // No enemies by home (or, in a town, by the station the coach stopped at).
    this.safeAt = inLublin ? { x: session.startX, y: session.startY } : { ...at };
    if (hdOn) {
      // The new detailed heroes (content/wyglad.ts): worn gear doesn't show on them.
      this.player = new Player(this, at.x, at.y, useHdHero(this, session.look.postac, session.name, session.look), 'me');
      fitHd(this.player);
    } else {
      this.player = new Player(this, at.x, at.y, PLAYER_TEX, 'me');
      // Taller frames (room for hair and hats): keep the feet where a 16×16 hero has them.
      this.player.setOrigin(0.5, (8 + LOOK_TOP) / LOOK_H);
    }
    this.player.hp = session.hp;
    Slime.tempo = session.level.tempo;
    this.npcs = new Npcs(this, this.city, today());
    this.etapy?.destroy();
    this.etapy = new Etapy({
      scene: this,
      city: this.city,
      player: this.player,
      dialog: (r) => this.dialog(r),
      toast: (t, ms) => this.toast(t, ms),
      stageDone: (rm, said) => this.completeStage(rm, said),
      stageBack: (rm) => this.stageBack(rm),
      hurtStory: () => {
        // One heart (2 halves), never the last one.
        this.player.hp = Math.max(Math.min(2, this.player.hp), this.player.hp - 2);
        this.emitHud();
      },
      pay: (n) => {
        if (session.coins < n) return false;
        spend(n);
        this.emitHud();
        return true;
      },
      talkMission: (rm) => this.openMissionDialog(rm),
    });
    this.orchards = new Orchards(this, this.city);
    this.forest = new Forest(
      this,
      this.city,
      (sp) => {
        const what = sp.veg ?? 'grzyb';
        // Vegetables are picked with a swing (a bar fills up), not by walking over them.
        if (sp.veg) return this.add.image(sp.x, sp.y, GOODS_TEX[what]).setScale(artScale(GOODS_TEX[what])).setDepth(sp.y - 8);
        const img = this.add.image(sp.x, sp.y, GOODS_TEX[what]).setScale(artScale(GOODS_TEX[what])).setDepth(sp.y - 8);
        img.setData('kind', `fruit:${what}`);
        img.setData('spot', sp.id);
        this.pickups.push(img);
        return img;
      },
      (img) => this.removePickup(img),
    );
    this.fixed = new FixedNpcs(this, this.city, {
      dialog: (req) => this.dialog(req),
      toast: (t, ms) => this.toast(t, ms),
      riddle: (title, intro, z, exp, seed, after, opts) => this.askRiddle(title, intro, z, exp, seed, after, opts),
      questsFull: () => this.questsFull(),
      storyOn: () => this.story?.askLabel() != null,
      storyExpert: (title, text, later) => this.story.expert(title, text, later),
      hud: () => this.emitHud(),
      gainExp: (n) => {
        session.exp += n;
        this.emitHud();
      },
      save: () => this.save(),
      trees: (x, y, r) => this.orchards.treesNear(x, y, r),
    });

    this.folk = new Townsfolk(this, this.city);
    this.folk.wet = isWet;
    // A newsboy always stands on the square in front of Targi Lublin, where new characters start after the demo
    // (owner, 12 Oct 2026). The demo places its own there after waking up.
    if (this.city.id === 'lublin' && !demo.on) {
      const g = this.city.fromLatLon(JAWA.gazeciarz.lat, JAWA.gazeciarz.lon);
      this.folk.newsboyAt(g.x, g.y);
    }
    this.weatherFx = new WeatherFx(this);
    this.weatherFx.podZiemia = !!this.city.loch;
    this.magicG = this.add.graphics().setDepth(1_030_000);
    this.watchWeather();
    this.bubbles = [];
    this.harvests = [];
    this.folkQuest = null;
    this.noHurtUntil = 0;
    this.protectUntil = -1; // set on the first frame (unless the character must linger)
    this.challenge = null;
    this.duelHp = null;
    this.duelCarry = 0;
    this.storyPlace = null;
    this.anomalia = new Anomalia(this, this.city, { player: this.player, dialog: (r) => this.dialog(r), save: () => this.save() });
    (window as unknown as { __anomalia?: Anomalia }).__anomalia = this.anomalia;
    this.story = new Story(this, this.city, {
      player: this.player,
      dialog: (req) => this.dialog(req),
      toast: (t, ms) => this.toast(t, ms),
      save: () => this.save(),
      hud: () => this.emitHud(),
      visible: (x, y) => pointInPolygon(this.vision, x, y),
      spawnDragon: (x, y) => {
        const e = this.spawnEnemy(x, y, undefined, 'smok');
        // On the turn-fight server the story's dragon fights in turns too (owner, 18 Oct 2026).
        if (tury()) {
          e.gatunek = 'cien';
          return e;
        }
        return this.bezTur(e);
      },
      walczZeSmokiem: (d) => {
        if (!tury()) return false;
        this.startWalka([d as Enemy]);
        return true;
      },
      scare: (x, y) => {
        for (const e of this.enemies) {
          if (e.isDead || e.kindId === 'smok' || Math.hypot(e.x - x, e.y - y) > 320) continue;
          e.fleeUntil = this.time.now + 7000;
          e.chasing = false;
        }
      },
      nearestGang: (x, y, maxPx) => this.streets.nearestGang(x, y, maxPx),
      gangSpot: (x, y, m, kind) => this.streets.gangSpot(x, y, m, kind),
      placeGang: (id, x, y, kind) => this.streets.placeGang(id, x, y, kind),
      questSpot: (x, y) => this.questSpot(x, y),
    });

    // Missions: gold roofs and "!" over their doors.
    // Story and admin missions are written for Lublin's addresses.
    const { missions, missing } = inLublin ? resolveMissions(this.city) : { missions: [], missing: [] as string[] };
    this.missions = [];
    for (const rm of missions) this.addMission(rm, true);
    // Missions that came late from the server (slow phone/network): added when they arrive.
    if (inLublin) {
      const pozne = () => {
        if (!this.sys.isActive() && !this.sys.isPaused()) return;
        const mam = new Set(this.missions.map((x) => x.m.id));
        for (const rm of resolveMissions(this.city).missions) if (!mam.has(rm.m.id)) this.addMission(rm, true);
        this.refreshMarkers();
      };
      window.addEventListener('exp-tresc', pozne);
      this.events.once('shutdown', () => window.removeEventListener('exp-tresc', pozne));
    }
    // Random missions taken earlier (churches, offices, police) and not finished.
    for (const m of Object.values(session.gen)) {
      if (isWithdrawnCityQuest(m.id)) continue;
      if (m.scenariusz) {
        if (m.scenariusz.mapId !== this.city.id || !['active', 'goal'].includes(missionState(m))) continue;
        const door = resolvePlace(this.city, m.scenariusz.anchors[0]);
        if (door) this.addMission({ m, door, target: stageTarget(this.city, m, door) }, false);
        continue;
      }
      // A newsboy's errand: remembered where it was given (newsboys walk around).
      if (m.placeId?.startsWith('gazeta:')) {
        const parts = m.placeId.split(':');
        if (parts.slice(1, -2).join(':') === this.city.id && ['active', 'goal'].includes(missionState(m))) {
          const door = { x: Number(parts[parts.length - 2]), y: Number(parts[parts.length - 1]) };
          this.addMission({ m, door, target: stageTarget(this.city, m, door) }, false);
        }
        continue;
      }
      const place = this.city.places.find((p) => p.id === m.placeId);
      if (place) {
        const door = { ...place.door, building: place.building ?? undefined };
        this.addMission({ m, door, target: stageTarget(this.city, m, door) }, false);
      }
    }
    this.refreshMarkers();
    const epoch = ++this.cityQuestEpoch;
    this.cityQuestPlanning = false;
    this.events.once('shutdown', () => { if (this.cityQuestEpoch === epoch) this.cityQuestEpoch++; });
    if (CITY_SCENARIOS.length) {
      this.time.delayedCall(1500, () => void this.refreshCityMissions(epoch));
      this.time.addEvent({ delay: 15000, loop: true, callback: () => void this.refreshCityMissions(epoch) });
    }

    // Shops and schools: coloured roofs and signs (under the fog, so they
    // are discovered by exploring).
    const showPlace = (p: CityPlace) => {
      const look = PLACE_LOOK[p.kind];
      if (p.building && !this.mapView.highlight.has(p.building)) this.mapView.highlight.set(p.building, { roof: look.roof, wall: look.wall });
      if (p.kind === 'station') this.stationVehicles(p);
      else if (p.kind === 'port') this.portLook(p);
      else if (p.kind === 'merchant' && WYGLAD_09) this.merchantStalls(p);
      else {
        const post = this.signPost(p);
        if (post) this.farObjects.push(...post);
        else {
          const sign = look.sign === TEX.tent && this.textures.exists(TEX.signCamp) ? TEX.signCamp : look.sign;
          const at = this.signSpot(p);
          const img = this.add.image(at.x, at.y, sign).setScale(artScale(sign)).setDepth(900_000);
          this.farObjects.push(img, this.signGlow(img));
        }
      }
      // The coachman himself stands by his cart (pack „postacie stałe 02”).
      if (p.kind === 'station' && hdOn) {
        const key = ensureHd(this, `hd-${STALE_HD.woznica.id}`);
        if (this.textures.exists(key)) {
          // Right by the cart sign (the door itself can be on the tracks, where freeNear went far away).
          const at = this.cartSpot(p);
          fitHd(this.add.sprite(at.x + 28, at.y + 1, key, 'down-0')).setDepth(at.y + 3);
        }
      }
    };
    for (const p of this.city.places) showPlace(p);
    // Road signs on the ways out of town (split-map): read when walking past.
    for (const sg of this.city.signs) this.farObjects.push(this.add.image(sg.x, sg.y + 2, TEX.signpost).setOrigin(0.5, 1).setScale(artScale(TEX.signpost)).setDepth(sg.y));
    this.signRead = -1;
    this.applySkill();

    this.training = new Training(this, this.city);
    this.landmarks = new Landmarks(this, this.city);
    this.shots = [];
    this.aimLine = this.add.graphics().setDepth(1_050_000);
    this.glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    for (let r = 26; r > 4; r -= 4) {
      this.glow.fillStyle(0xfff3a0, 0.07);
      this.glow.fillCircle(0, 0, r);
    }
    this.lastBolt = 0;
    // Monster gangs: territories away from places (and from home), a boss at the end.
    const avoid = this.city.places.map((p) => p.door);
    if (inLublin) avoid.push({ x: session.startX, y: session.startY });
    // World maps: places arrive with their tiles (gangs keep away from them too).
    const offPlaces = this.city.onPlaces((list) => {
      for (const p of list) {
        showPlace(p);
        avoid.push(p.door);
      }
    });
    this.events.once('shutdown', () => offPlaces());
    // Dragons in the wild (content/smoki.ts SMOKI_NA_MAPIE): by the ground, rarely, outside the centre.
    this.smokiNaMapie = demo.on ? undefined : new SmokiNaMapie({
      city: this.city,
      home: inLublin ? { x: session.startX, y: session.startY } : null,
      spawn: (x, y, g) => this.spawnDragon(x, y, g),
      despawn: (d) => {
        const e = d as Enemy;
        this.dragons.get(e)?.destroy();
        this.dragons.delete(e);
        this.enemies = this.enemies.filter((q) => q !== e);
        e.destroy();
      },
      odblokowane: () => poziomPostaci(session.exp) >= SMOKI_NA_MAPIE.odPoziomu && (session.story.st === 'smok' || session.story.st === 'koniec'),
      scene: this,
      toast: (t, ms) => this.toast(t, ms),
    });
    (window as unknown as { __smok?: (g: GatunekId) => void }).__smok = (g) => {
      const a = Math.random() * Math.PI * 2;
      this.spawnDragon(this.player.x + Math.cos(a) * 70, this.player.y + Math.sin(a) * 50, g);
    };
    this.streets = new StreetEnemies(
      this,
      this.city,
      avoid,
      (sp, g) => {
        const e = this.spawnEnemy(sp.x, sp.y, undefined, sp.kind);
        e.ambient = true;
        // They stand at their spot; they only come out when they see the hero (turn fight: they just sit in their group).
        e.roam = this.streets?.tury ? 4 : g.boss === 'out' && sp.kind === g.kind.herszt ? 40 : 12;
        e.leash = { x: g.x, y: g.y, r: g.r };
        if (sp.berserk) e.makeBerserk(BERSERKER.zycie, BERSERKER.auraKolor, BERSERKER.mrugMs, BERSERKER.predkosc);
        return e;
      },
      (u) => {
        const e = u as Enemy;
        if (!e.active || e.isDead) return true;
        if (e.chasing) return false;
        this.enemies = this.enemies.filter((x) => x !== e);
        e.destroy();
        return true;
      },
      // At night more monsters come out.
      session.level.potwory * (isNight() ? MIESZKANCY.noc.potworow : 1),
      session.nonce,
      {
        stan: (_g, text) => this.toast(`⚔ ${text}`, 2500),
        heroLevel: () => poziomPostaci(session.exp),
        pora: () => ({ noc: isNight(), mokro: isWet() }),
        bossOut: (g) => this.toast(`⚠ Cały gang pokonany – wychodzi ${ENEMY_KINDS[g.kind.herszt].name.toLowerCase()}!`, 3000),
        cleared: (g) => {
          if (g.paid) {
            // Paid off (turn fight): the territory is free, but no reward.
            session.stats.gangs = (session.stats.gangs ?? 0) + 1;
            this.emitHud();
            this.toast(`🕊 ${g.kind.nazwa} ${g.kind.zenska ? 'się wyniosła' : 'się wyniósł'}. Mieszkańcy wrócą za minutę.`, 3500);
            return;
          }
          const coins = luckyCoins(g.kind.nagroda.monety);
          earn(coins);
          session.exp += g.kind.nagroda.exp;
          session.stats.gangs = (session.stats.gangs ?? 0) + 1;
          this.emitHud();
          this.toast(`🏆 ${g.kind.nazwa} ${g.kind.zenska ? 'rozbita' : 'rozbity'}! +${coins} monet, +${g.kind.nagroda.exp} EXP. Mieszkańcy wrócą za minutę.`, 4000);
        },
      },
    );

    this.streets.tury = tury();
    this.streets.slabe = live();

    // Łowiska test pilot (?lowiska=1): isolated from everything above – its own class, never tury().
    this.wilki.forEach((ai) => ai.destroy());
    this.wilki.clear();
    this.atakiWrecz = this.atakiDystans = 0;
    this.spowolnienieDo = 0;
    this.lowiska?.destroy();
    this.lowiska = lowiska()
      ? new Lowiska(
          this,
          this.city,
          avoid,
          (sp, p) => {
            const e = this.spawnEnemy(sp.x, sp.y, undefined, sp.kind);
            e.lowisko = true;
            e.lowiskoHome = { x: p.x, y: p.y, r: p.r };
            e.roam = 20;
            return e;
          },
          (u) => {
            const e = u as Enemy;
            if (!e.active || e.isDead) return true;
            if (e.chasing) return false;
            this.wilki.get(e)?.destroy();
            this.wilki.delete(e);
            this.enemies = this.enemies.filter((x) => x !== e);
            e.destroy();
            return true;
          },
          () => this.lowiskaCzasS,
          (t) => this.toast(t, 2600),
        )
      : null;

    this.listyAreny = [];
    if (arenaOn() && !demo.on) api.arenaListy(session.token).then((l) => { this.listyAreny = Array.isArray(l) ? l : []; }).catch(() => {});
    this.spotkania?.destroy();
    this.spotkania = tury() ? this.makeSpotkania() : null;

    // Fixed enemy spots.
    for (const w of inLublin ? WROGOWIE : []) {
      const p = resolvePlace(this.city, w.miejsce);
      if (!p) {
        missing.push(typeof w.miejsce === 'string' ? w.miejsce : JSON.stringify(w.miejsce));
        continue;
      }
      this.spawnGroup(p, w.ile, undefined, w.wrog);
    }
    if (missing.length) console.warn('Nie znaleziono na mapie:', missing);
    this.registry.set('missing', missing);

    // Dungeons (content/lochy.ts): entrances on the surface, or – underground – the maze, its monsters and chest.
    this.lochy?.destroy();
    this.lochy = live() && !demo.on && !this.city.loch ? new LochyWejscia(this, this.city) : undefined;
    this.loch?.destroy();
    this.loch = this.city.loch
      ? new LochWnetrze({
          scene: this,
          nonce: session.nonce,
          toast: (t, ms) => this.toast(t, ms),
          spawn: (x, y, kind, home) => {
            const e = this.spawnEnemy(x, y, undefined, kind);
            e.lowiskoHome = home;
            e.roam = 6;
            return e;
          },
        }, this.city)
      : undefined;
    if (this.loch) this.toast(LOCH_TEKSTY.zszedl(this.loch.opis.nazwa), 4500);

    this.replayAbandoned();
    if (this.walkedIn) this.toast(this.walkedIn, 4000);
    this.walkedIn = null;
    if (this.justRode) this.toast(`🐴 Witaj w miejscowości ${mapName(this.city.id)}! Woźnica czeka przy stacji, gdy zechcesz wracać.`, 5000);
    this.justRode = false;

    // Tell the server where we are, so closing the tab can't dodge a fight.
    const beat = (e?: Event) => {
      if (this.leaving || this.player.isDead) return;
      const snap = this.snapshot();
      // About once a minute (and when the page goes away) also the newspaper's daily numbers.
      if (e || Date.now() - this.kurAt >= KURIER_CO_MS) {
        this.kurAt = Date.now();
        try {
          snap.kur = { m: Math.round(session.stats.m), o: zdobyteOdznaki(stanOsiagniec()), ...this.kurierMiejsce() };
        } catch { /* the rankings must never stop the heartbeat */ }
      }
      // The server refused the key: this character was loaded elsewhere or logged out (sesja.ts).
      const token = session.token;
      api.heartbeat(token, snap).then((ok) => { if (ok === false && !this.leaving) sesjaWygasla(token); }).catch(() => {});
    };
    this.time.addEvent({ delay: HEARTBEAT_MS, loop: true, callback: beat });
    window.addEventListener('pagehide', beat);
    this.events.once('shutdown', () => window.removeEventListener('pagehide', beat));
    beat();

    const cam = this.cameras.main;
    cam.setBounds(this.city.minX, this.city.minY, this.city.width - this.city.minX, this.city.height - this.city.minY);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.setBackgroundColor(this.city.loch ? '#07070a' : '#1f4d24');
    this.fitZoom();
    cam.centerOn(this.player.x, this.player.y);
    // Fell in a dungeon: carried up and to the nearest hospital (the loss was already taken there).
    if (lochSesja.porazka !== null && !this.city.loch) {
      const kara = lochSesja.porazka;
      lochSesja.porazka = null;
      this.time.delayedCall(50, () => this.poPorazceWLochu(kara));
    }
    // New controls test: phones play landscape, like a game pad (ui/poziomo.ts).
    if (live()) {
      wymusPoziom(this.game);
      this.events.once('shutdown', () => zwolnijPoziom());
    }
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    // Under the intro, submit chunks over successive updates instead of a
    // single burst that interrupts the zoom. Uncovered travel/demos stay as before.
    cam.preRender();
    if (!loadingGame()) this.mapView.update(cam, 16);

    this.demoRun = null;
    if (demo.on) {
      this.demoRun = new DemoRun(this, {
        player: this.player,
        city: this.city,
        orchards: this.orchards,
        dialog: (req) => this.dialog(req),
        toast: (t, ms) => this.toast(t, ms),
        spawnDragon: (x, y) => this.bezTur(this.spawnEnemy(x, y, undefined, 'smok')),
        hurt: (from, dmg) => {
          if (!this.player.hurt(from, this.time.now, dmg)) return;
          this.emitHud();
          if (this.player.isDead) this.onPlayerDeath();
        },
        hud: () => this.emitHud(),
        heal: () => this.healButton(),
        zbierzOwoce: () => {
          for (const i of [...this.pickups]) if (String(i.getData('kind') ?? '').startsWith('fruit:')) this.collect(i);
        },
        owoceNaZiemi: () => this.pickups.filter((i) => String(i.getData('kind') ?? '').startsWith('fruit:')).length,
        ready: () => this.firstViewReady(),
        walcz: (d) => {
          // The test server's demo: the dragon fights in turns (owner, 18 Oct 2026), flying off after a few hits.
          if (!turyWDemo()) return false;
          const e = d as Enemy;
          e.gatunek = 'gorski';
          this.startWalka([e]);
          return true;
        },
      });
      this.demoRun.start();
    }
    this.witam = false;
    if (powitanie.czeka) {
      powitanie.czeka = false;
      this.welcome();
    }
    this.startSamouczek();
    // Characters past the tutorial get the app-icon offer after a few minutes of play (once per device).
    if (!this.samouczek) this.time.delayedCall(5 * 60 * 1000, () => this.zaproponujIkone());

    this.scene.launch('ui');
    this.emitHud();
  }

  /**
   * Integer zoom so pixels stay crisp; aims for ~11 tiles on the short screen side. The bigger picture
   * (HUD magnifier / Z, `przyblizenie`) is ~30 % closer: the next whole number of canvas px per map px
   * at or above ×1.3 (phones with 2 canvas px per CSS px: 4 → 5, i.e. +25 %).
   */
  private fitZoom() {
    const short = Math.min(this.scale.width, this.scale.height) / OSTROSC;
    const z = Math.max(2, Math.floor(short / 176)) * OSTROSC;
    const zz = zoomZPrzyblizeniem(z);
    // The tilted camera (walka/live.ts): the map squashed vertically, sprites stretched back when drawn (main.ts).
    const k = skrotKamery();
    this.cameras.main.setZoom(zz, zz * k);
    (this.cameras.main as unknown as { wyprost: number }).wyprost = 1 / k;
  }

  /** The next zoom step (usual → ~30 % closer → twice as close → usual, kept on the device); true = the closest. */
  toggleZoom() {
    const poziom = nastepnePrzyblizenie();
    this.fitZoom();
    this.lastVision = { x: NaN, y: NaN, a: NaN };
    this.toast(['🔍 Zwykły widok', '🔍 Widok powiększony', '🔍 Widok mocno powiększony (2×)'][poziom], 1200);
    return poziom === 2;
  }

  // ------------------------------------------------------------------ loop

  /** Called by the login transition; workers keep drawing while gameplay waits. */
  firstViewReady() {
    return this.mapView.firstViewReady(this.cameras.main) && !this.load.isLoading();
  }

  update(now: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    const intro = loadingGame();
    // A hidden scene does not run the render pass that normally updates worldView.
    if (intro) this.cameras.main.preRender();
    this.mapView.update(this.cameras.main, intro ? 1 : 2);
    if (this.player) {
      // Łowiska (owner, 25 Oct 2026): a nearby wolf/warg also opens a hole in the crown over it, so it
      // doesn't vanish under dense canopy mid-fight – same mechanism as the hero's own see-through.
      const punkty = [{ x: this.player.x, y: this.player.y }];
      if (this.lowiska) for (const e of this.enemies) if ((e.kindId === 'wilk' || e.kindId === 'warg') && !e.isDead) punkty.push({ x: e.x, y: e.y });
      this.mapView.updateTrees(now, dt, this.cameras.main, punkty);
    }
    if (this.player) this.gory?.update(now, dt, this.player.x, this.player.y);
    // Tiled maps: keep the map loaded around the hero.
    if (now >= this.nextTiles && this.player) {
      this.nextTiles = now + 700;
      this.city.ensure(this.player.x, this.player.y, LOAD_RADIUS).catch((e: Error) => report('tiles', e.message));
    }
    if (intro) {
      this.introSince ??= now;
      this.updateFog();
      this.zabytki.update(this.player.x, this.player.y);
      return;
    }
    if (this.introSince !== null) {
      if (this.lingerUntil) this.lingerUntil += now - this.introSince;
      this.introSince = null;
      resetTouch();
      resetKeys();
    }
    if (this.player.isDead || this.leaving || this.travelling) return;
    if (this.demoRun) {
      this.demoRun.update(now, dt);
      if (this.demoRun.frozen) return;
    }
    // A turn fight: the live loop stands still (no walking, swings or monsters), the world keeps drawing.
    if (this.walka?.aktywna) return this.updateWalka(now, dt);

    const lingering = now < this.lingerUntil;
    if (this.protectUntil < 0) {
      if (this.lingerUntil) this.protectUntil = 0;
      else this.protect(now);
    }

    if (this.lingerUntil && !lingering) this.endLinger();
    const kd = keyboardDir();
    const moving = kd.x !== 0 || kd.y !== 0;
    if (lingering || this.story.busy || this.demoRun?.busy || this.witam || this.anomalia?.busy) this.player.move(0, 0, now);
    else {
      // Screen directions → map directions: on the tilted camera (walka/live.ts) a push "up the screen" covers
      // more map ground vertically; the push's strength (joystick distance) stays.
      let ix = moving ? kd.x : touchInput.x, iy = moving ? kd.y : touchInput.y;
      const k = skrotKamery();
      if (k !== 1 && (ix || iy)) {
        const len = Math.min(1, Math.hypot(ix, iy)), ny = iy / k, l2 = Math.hypot(ix, ny);
        ix = (ix / l2) * len;
        iy = (ny / l2) * len;
      }
      this.player.move(ix, iy, now);
    }
    this.player.vel.scale(vehicleSpeed());
    if (live() && wyczerpany(poziomPostaci(session.exp))) this.player.vel.scale(ZASOBY.wyczerpanyChod);
    if (this.player.vel.x || this.player.vel.y) {
      // What the ground is (content/podloze.ts): roads full speed, paths, grass, forest, sand slower.
      this.player.vel.scale(PODLOZE[this.city.surfaceAt(this.player.x, this.player.y)]);
      // Mountains (world maps): slower uphill and down steep slopes.
      const tr = this.city.terrain;
      if (tr) {
        this.player.vel.scale(tr.speedFactor(this.player.x, this.player.y, this.player.vel.x, this.player.vel.y));
        // Dust from under the boots on a steep climb.
        if (now - this.lastDust > GORY.kurzCoMs) {
          const len = Math.hypot(this.player.vel.x, this.player.vel.y), step = 6 * PX_PER_M;
          const dh = tr.heightAt(this.player.x + (this.player.vel.x / len) * step, this.player.y + (this.player.vel.y / len) * step) - tr.heightAt(this.player.x, this.player.y);
          if (dh / 6 > GORY.kurzOd) {
            this.lastDust = now;
            this.dustPuff();
          }
        }
        // Steep off any path (report 57): walkable but slow, with a word the first time.
        const f = this.city.steepFactor(this.player.x, this.player.y);
        if (f < 1) {
          this.player.vel.scale(f);
          if (!this.steepSaid) {
            this.steepSaid = true;
            this.toast('⛰ Stromo! Bez ścieżki idziesz bardzo powoli – szlakiem pójdzie szybciej.', 3500);
          }
        }
      }
      // Picking a vegetable on the way: a short stop-and-go.
      if (now < this.cropSlowUntil) this.player.vel.scale(WARZYWA.zwolnienie);
      if (this.stany.zatrucie) this.player.vel.scale(ATAKI_SMOKA.dym.spowolnienie); // a dragon's poison slows the walk
      if (now < this.spowolnienieDo) this.player.vel.scale(this.spowolnienie); // the boss's stomp (StworAI)
    }
    const bx = this.player.x;
    const by = this.player.y;
    this.moveActor(this.player, dt);
    session.stats.m += Math.hypot(this.player.x - bx, this.player.y - by) / PX_PER_M;
    const podZiemia = !!this.loch;
    if (!podZiemia) this.story.update(dt, this.player.x !== bx || this.player.y !== by);
    if (!demo.on && !podZiemia) this.anomalia?.update(now, this.player.x !== bx || this.player.y !== by);
    // Hiding in the bushes: see-through under trees.
    const hidden = this.city.areaKindsAt(this.player.x, this.player.y + FEET.dy).some((k) => HIDE_IN.has(k));
    // Protected after a fresh start: the hero blinks.
    this.player.setAlpha(now < this.protectUntil ? 0.45 + 0.55 * Math.abs(Math.sin(now / 120)) : hidden ? 0.5 : 1);

    this.unstickHero(now);
    if (!podZiemia) {
      this.crossBorder(now);
      this.portsNear(now);
    }
    if (consumeHeal()) this.healButton();
    if (live()) {
      const it = consumeInteraction();
      if (it) this.interact(it.x, it.y);
      if (consumeStrong()) this.specjalny(now);
      this.updateZasoby(dt, bx, by);
    }
    // The potion's bonus heart runs out.
    if (this.player.extra && Date.now() > this.player.extraUntil) {
      this.player.extra = 0;
      this.toast('Dodatkowe serduszko z mikstury znikło.', 2000);
      this.emitHud();
    }
    if (consumeAttack() && !lingering && !this.story.busy && !this.demoRun?.busy && !this.witam && !this.anomalia?.busy) {
      // A mouse click swings towards where it clicked (the hero turns there).
      this.clickWorld = null;
      if (attackAim) {
        const cam = this.cameras.main;
        this.clickWorld = { x: (attackAim.x * OSTROSC) / cam.zoomX + cam.worldView.x, y: (attackAim.y * OSTROSC) / cam.zoomY + cam.worldView.y };
        this.player.face(this.clickWorld.x - this.player.x, this.clickWorld.y - (this.player.y + 2));
      }
      // An enemy near the hero wins over a tree, a bush or the mouse's aim (owner, 6 Oct 2026: fighting in the forest).
      this.faceFoe();
      // New controls test: exhausted (no stamina left), the sword comes slower.
      const cd = this.player.attackCooldown;
      if (live() && wyczerpany(poziomPostaci(session.exp))) this.player.attackCooldown = cd * ZASOBY.wyczerpanyCios;
      const hit = this.player.tryAttack(now);
      this.player.attackCooldown = cd;
      this.samouczek?.uderzyl();
      if (hit) this.resolveAttack(hit, now);
    }
    this.updateRanged(now, lingering);
    this.updateShots(dt);

    const target = new Phaser.Math.Vector2(this.player.x, this.player.y);
    this.loch?.update(now, this.cameras.main, this.player);
    this.lochy?.update(this.player.x, this.player.y, now);
    // Underground: none of the surface's life (people, gangs, trees, hunting grounds, training).
    if (!podZiemia) {
    this.orchards.update(this.player.x, this.player.y, now);
    if (this.chopping.size) this.updateChopping(now);
    this.forest.update(this.player.x, this.player.y, now);
    this.landmarks.update(this.player.x, this.player.y);
    this.updateHarvests(now);
    // The QR demo's dragon: nobody strolls near it (owner, 19 Oct 2026: a granny walked right into it).
    const smokDemo = this.demoRun?.smokDoOminiecia() ?? null;
    this.folk.fear = smokDemo ?? this.story.dragonAt();
    this.folk.fearM = smokDemo ? SEN.bezLudziM : null;
    this.folk.update(dt, this.player.x, this.player.y, now, (x, y) => pointInPolygon(this.vision, x, y) && !this.streets.blocks(x, y));
    if (this.duelHp !== null) {
      // Walked away from the duel: the townsman gives up.
      const d = this.enemies.find((e) => e.duel);
      if (!d || Math.hypot(d.x - this.player.x, d.y - this.player.y) > 320) {
        if (d) {
          this.folk.away(d.duel!.folk, false);
          d.destroy();
          this.enemies = this.enemies.filter((e) => e !== d);
        }
        this.duelHp = null;
        this.toast('Przeciwnik zrezygnował z pojedynku.', 2000);
        this.emitHud();
      }
    }
    this.training.update(this.player.x, this.player.y, now, (x, y) => this.streets.blocks(x, y));
    this.streets.update(this.player.x, this.player.y, now);
    if (this.lowiska) {
      // Active-simulation clock for łowiska respawns: only advances here, i.e. never while paused/hidden/in
      // a dialog (this line isn't reached then – same guards as the rest of this method).
      this.lowiskaCzasS += dt;
      this.lowiska.update(this.player.x, this.player.y);
    }
    if (!lingering && !this.story.busy && !this.anomalia?.busy) this.spotkania?.update(now);
    }
    if (!this.loch) this.clearHomeArea(); // underground the arrival spot is no safe home
    const chasers = this.enemies.filter((e) => e.chasing && !e.isDead);
    for (const s of this.enemies) {
      if (s.isDead) continue;
      // Scared by the dragon's shadow: running away.
      if (s.fleeUntil && now < s.fleeUntil) {
        const away = new Phaser.Math.Vector2(s.x - this.player.x, s.y - this.player.y).normalize().scale(s.kind.chaseSpeed * 1.3 * PREDKOSC_WROGOW);
        s.vel.set(away.x, away.y);
        this.moveActor(s, dt);
        s.updateLook();
        s.setDepth(s.y + s.depthOff);
        continue;
      }
      // The story's dragon before the fight (or a friendly one): stays put.
      if (s.peaceful) {
        s.vel.set(0, 0);
        s.setDepth(s.y + s.depthOff);
        continue;
      }
      // Far from the hero: asleep (saves work on phones).
      if (Math.abs(s.x - this.player.x) > 380 || Math.abs(s.y - this.player.y) > 380) continue;
      // Turn fight: they wait in their group to be met (walka/Spotkania.ts) – no chasing, no touch damage.
      if (s.spokojny) {
        if (s.kindId === 'smok') s.vel.set(0, 0);
        else s.think(target, now);
        this.moveActor(s, dt);
        s.updateLook();
        s.setDepth(s.y + s.depthOff);
        continue;
      }
      // Where one goes, its friends follow.
      if (!s.chasing && chasers.some((c) => Math.abs(c.x - s.x) < 70 && Math.abs(c.y - s.y) < 70)) s.chasing = true;
      // A dragon in a fight has its own way (claws, backing off, fire).
      if (s.kindId === 'smok' && !this.dragons.has(s)) this.dragonFight(s);
      const dragon = this.dragons.get(s);
      // Łowiska wolves (test pilot): their own telegraph→charge→rest cycle, never the generic touch damage below.
      // New fight (walka/live.ts) and the łowiska: every creature fights readably – telegraph → attack → rest
      // (objects/StworAI.ts), never by touching the hero.
      if ((live() || s.lowisko) && !this.wilki.has(s) && s.kindId !== 'smok' && !s.duel && !s.brain && !this.demoRun?.isDragon(s)) {
        const home = s.lowiskoHome ?? (s.leash ? { x: s.leash.x, y: s.leash.y, r: Math.max(s.leash.r, 40 * PX_PER_M) } : { x: s.home.x, y: s.home.y, r: 90 * PX_PER_M });
        this.wilki.set(s, new StworAI(this.wilkHost(), s, home, profilStwora(s.kindId, s.kind.damage * (s.power ?? 1))));
      }
      const wilk = this.wilki.get(s);
      if (dragon) dragon.update(now, dt);
      else if (wilk) wilk.update(now, dt);
      else if (s.brain) s.brain(now);
      else s.think(target, now);
      this.moveActor(s, dt);
      s.updateLook();
      s.setDepth(s.y + s.depthOff);
      if (now < this.noHurtUntil) continue; // just back from a talk: a moment of peace
      if (dragon || wilk) continue; // their own attack deals the damage, not touching them
      if (s.duel && Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 5 + s.size) {
        // A duel takes the purple hearts, never the real ones.
        if (this.player.hurt(new Phaser.Math.Vector2(s.x, s.y), now, 0)) {
          const pending = this.duelCarry + s.duel.dmg;
          const dmg = Math.floor(pending);
          this.duelCarry = pending - dmg;
          this.duelHp = Math.max(0, (this.duelHp ?? 0) - dmg);
          this.emitHud();
          if (this.duelHp <= 0) this.endDuel(s, false);
        }
        continue;
      }
      if (s.isDazed(now)) continue; // dazed by the stunning essence: can't strike
      if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 5 + s.size) {
        const blocked = Math.random() < blockChance();
        // Difficulty scales the damage; fractions add up over hits.
        const pending = this.damageCarry + s.kind.damage * (s.power ?? 1) * session.level.obrazenia;
        const dmg = Math.floor(pending);
        if (this.player.hurt(new Phaser.Math.Vector2(s.x, s.y), now, blocked ? 0 : dmg, s.berserk ? 1 / BERSERKER.szybciej : 1)) {
          if (!blocked) this.damageCarry = pending - dmg;
          if (blocked) this.toast('Zbroja zatrzymała cios!', 700);
          this.emitHud();
          if (this.player.isDead) this.onPlayerDeath();
        }
      }
    }
    this.player.setDepth(this.player.y);
    if (live()) this.rysujHpNad();
    this.testRide.update(this.player, session.look.postac, session.name);
    this.ludzik3d?.update(this.player, dt);
    this.updateMythic(now);
    this.fixed.update(dt, this.player.x, this.player.y, now, (x, y) => pointInPolygon(this.vision, x, y) && !this.streets.blocks(x, y));
    this.npcs.update(this.player.x, this.player.y, (x, y) => pointInPolygon(this.vision, x, y) && !this.streets.blocks(x, y) && !this.demoRun?.przySmoku(x, y), (n) => session.riddles[n.id] === today());
    this.updateFog();
    this.weatherFx.update(dt, this.cameras.main, this.player, now, this.fogView.daylight);
    this.drawMagic(now);

    this.animateCrops(now);
    this.cullFar(now);
    this.updateStany(now);
    aktualizujEfekty(now);
    if (!this.loch) {
      this.smokiNaMapie?.update(this.player.x, this.player.y);
      this.smokiNaMapie?.dym(this.time.now);
    }
    this.updatePosts(now);
    this.zabytki.update(this.player.x, this.player.y);
    for (const item of [...this.pickups]) {
      if (Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y + 4) < 10) this.collect(item);
    }

    if (!lingering) this.checkGoals();
    this.updateBubbles();
    this.readSign();
    if (this.city.peaks.length) this.updatePeaks();
    if (now > this.trailAt) {
      // Where the hero walks, for bug reports (log.ts).
      this.trailAt = now + 20_000;
      note(`jestem: ${this.whereText()}`);
    }

    if (this.challenge) this.updateChallenge(now);
    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = this.challenge ? 100 : 400;
      this.emitHud();
    }
  }

  /** No enemies around home: any that come near vanish in a puff (no loot, no harm). */
  private clearHomeArea() {
    const r = HOME_SAFE_M * PX_PER_M;
    for (const e of this.enemies) {
      const { x, y } = this.safeAt;
      if (e.isDead || e.missionId || Math.abs(e.x - x) > r || Math.abs(e.y - y) > r) continue;
      if (Math.hypot(e.x - x, e.y - y) > r) continue;
      this.enemies = this.enemies.filter((x) => x !== e);
      this.tweens.add({ targets: e, alpha: 0, scaleX: e.scaleX * 0.25, scaleY: e.scaleY * 0.25, duration: 250, onComplete: () => e.destroy() });
    }
  }

  /** Mythic weapons: the glowing sword shines, the thunder sword strikes by itself. */
  private updateMythic(now: number) {
    const fx = weaponEffect();
    this.glow.setVisible(fx === 'swiatlo');
    if (fx === 'swiatlo') {
      this.glow.setPosition(this.player.x, this.player.y);
      this.glow.setAlpha(0.55 + 0.15 * Math.sin(now / 250));
      this.glow.setDepth(this.player.y - 1);
    }
    if (fx !== 'pioruny' || now - this.lastBolt < PIORUNY.co) return;
    const range = PIORUNY.zasiegM * PX_PER_M;
    // The weakest enemy in reach (so strikes finish foes off), nearest first on a tie.
    let foe: Enemy | null = null;
    let best = Infinity;
    for (const e of this.enemies) {
      if (e.isDead || !e.visible) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d > range) continue;
      const score = e.hp * 1000 + d;
      if (score < best) {
        best = score;
        foe = e;
      }
    }
    if (!foe) return;
    this.lastBolt = now;
    this.drawBolt(foe.x, foe.y);
    if (foe.hit(new Phaser.Math.Vector2(foe.x, foe.y - 10), now, PIORUNY.obrazenia)) this.onEnemyKilled(foe);
  }

  /** A zigzag of light from the sky onto (x, y). */
  private drawBolt(x: number, y: number) {
    const g = this.add.graphics().setDepth(1_060_000);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 7; i++) pts.push([x + (i === 7 ? 0 : (Math.random() - 0.5) * 14), y - 90 + (i * 90) / 7]);
    for (const [w, c] of [[5, 0x6fb7ff], [2, 0xffffff]] as const) {
      g.lineStyle(w, c, 1);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.strokePath();
    }
    g.fillStyle(0xcfe6ff, 0.7);
    g.fillCircle(x, y, 7);
    this.cameras.main.flash(60, 180, 210, 255, false);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** Recomputes what the hero sees and hides whatever is outside of it. */
  /**
   * The cone by difficulty (`widok`): its angle, and on "ekran" levels a reach to the screen's edge
   * (half its diagonal, at least WIDOK.ekranMin× the old range, at most WIDOK.maks px).
   */
  private viewCone() {
    // Underground: the lamp and torches reach only so far (the walls stop sight anyway).
    if (this.loch) return { half: Math.PI + 0.5, range: LOCH.wzrokM * PX_PER_M };
    const v = this.cameras.main.worldView;
    const edge = Math.hypot(v.width, v.height) / 2;
    // Owner, 5 Oct 2026: no fog from the hero's sight any more – all around, to the screen's corners; only
    // buildings block it (the rays stop at walls). The difficulty's cone (`widok`) is no longer used here.
    if (WIDOK.wszedzie) return { half: Math.PI + 0.5, range: Math.min(WIDOK.maksWszedzie, Math.max(BASE_VIEW_RANGE * WIDOK.ekranMin, edge * 1.05)) };
    const w = session.level.widok ?? { stopnie: 116, ekran: false };
    const range = w.ekran ? Math.min(WIDOK.maks, Math.max(BASE_VIEW_RANGE * WIDOK.ekranMin, edge)) : BASE_VIEW_RANGE;
    return { half: (w.stopnie / 2) * (Math.PI / 180), range };
  }

  private updateFog() {
    const p = this.player;
    const a = Math.atan2(p.facing.y, p.facing.x);
    const lv = this.lastVision;
    // (written as !(<=) so the first frame, with NaN, always computes)
    if (!this.vision.length || !(Math.abs(p.x - lv.x) <= 0.5 && Math.abs(p.y - lv.y) <= 0.5 && Math.abs(a - lv.a) <= 0.01)) {
      this.seenNow = new Set();
      this.vision = visionPolygon(this.city, this.explored, p.x, p.y + 2, a, weaponEffect() === 'swiatlo' ? SWIATLO : 1, this.seenNow, session.level.tyl, this.viewCone());
      for (const b of this.seenNow) {
        if (this.seenEver.has(b)) continue;
        this.seenEver.add(b);
        markBuilding(this.explored, this.city, b);
      }
      this.lastVision = { x: p.x, y: p.y, a };
    }
    this.fogView.update(this.cameras.main, this.vision, this.seenNow);
    for (const e of this.enemies) if (!e.isDead) e.setVisible(!e.inAir && pointInPolygon(this.vision, e.x, e.y));
    // Off-screen pickups are simply hidden (no polygon test); hundreds of ripe crops on allotments (report 56).
    const v = this.cameras.main.worldView;
    for (const i of this.pickups) {
      const onScreen = i.x > v.x - 20 && i.x < v.right + 20 && i.y > v.y - 20 && i.y < v.bottom + 30;
      i.setVisible(onScreen && pointInPolygon(this.vision, i.x, i.y));
      (i.getData('glow') as Phaser.GameObjects.Image | undefined)?.setVisible(i.visible);
    }
  }

  /** Ripe crops on screen: the glow pulses and the plant bobs now and then (one loop instead of two tweens each). */
  private animateCrops(now: number) {
    for (const i of this.pickups) {
      const glow = i.getData('glow') as Phaser.GameObjects.Image | undefined;
      if (!glow || !i.visible) continue;
      const faza = i.getData('faza') as number, okres = i.getData('okres') as number;
      glow.setAlpha(0.62 + 0.23 * Math.sin((now + faza) / 160));
      const t = ((now + faza) % okres) / 220;
      i.setScale(i.scaleX, (i.getData('sy') as number) * (t < 2 ? 1 + 0.18 * Math.sin((t * Math.PI) / 2) : 1));
    }
  }

  /** Moves a sprite by its velocity, sliding along walls, buildings and water. */
  /** Can feet stand at this point (map, trees, training stations, landmarks)? */
  private freeFeet(x: number, y: number) {
    return this.city.isFree(x, y, FEET.hw, FEET.hh) && !this.orchards.blocked(x, y) && !this.forest.blocked(x, y) && !this.mapView.korony.blocked(x, y) && !this.training.blocked(x, y) && !this.landmarks.blocked(x, y);
  }

  private moveActor(a: Player | Slime, dt: number) {
    const dx = a.vel.x * dt;
    const dy = a.vel.y * dt;
    const fy = a.y + FEET.dy;
    const free = (x: number, y: number) => this.freeFeet(x, y);
    // The whole step first: on a narrow diagonal way (a footbridge over water) each single-axis half-step pushes a
    // corner of the feet over the edge, so moving x then y left the hero stuck mid-bridge (report 64, 12 Oct 2026).
    if (dx && dy && free(a.x + dx, fy + dy)) {
      a.x += dx;
      a.y += dy;
      return;
    }
    // Blocked straight ahead: try the step turned a little either way, so the hero slips into a narrow way
    // instead of stopping at its edge.
    if (a === this.player && (dx || dy)) {
      for (const t of [0.35, -0.35, 0.7, -0.7]) {
        const c = Math.cos(t), s = Math.sin(t);
        const rx = dx * c - dy * s, ry = dx * s + dy * c;
        if (free(a.x + rx, fy + ry) && !free(a.x + dx, fy) && !free(a.x, fy + dy)) {
          a.x += rx;
          a.y += ry;
          return;
        }
      }
    }
    if (dx && free(a.x + dx, fy)) a.x += dx;
    if (dy && free(a.x, fy + dy)) a.y += dy;
  }

  // ------------------------------------------------------------------ combat

  /**
   * A character a swing lands on (or who stands right by the hero): the dog,
   * Margo, grandparents, riddle-givers, townsfolk, sports people, the wizard.
   * Talking starts with a swing, not by bumping into them.
   */
  private talkableAt(x: number, y: number, r: number): (() => void) | null {
    const fixed = this.fixed.at(x, y, r);
    if (fixed) return () => this.fixed.talk(fixed);
    const npc = this.npcs.at(x, y, r);
    if (npc) return () => this.openRiddle(npc);
    const person = this.duelHp === null ? this.folk.at(x, y, r) : null;
    if (person) return () => this.talkToFolk(person);
    const sporty = !this.challenge ? this.training.npcAt(x, y, r) : null;
    if (sporty) return () => this.talkSport(sporty);
    if (this.story.wizardAt(x, y, r)) return () => this.story.talkToWizard();
    return this.etapy.talkAt(x, y, r);
  }

  /** The skill of the weapon in the main hand (sword, bow or wand). */
  private handSkill(): Umiejetnosc {
    const r = rangedWeapon();
    return r ? (r.rodzaj === 'magia' ? 'magia' : 'luk') : 'miecz';
  }

  /** "pudło!" floating up over an enemy that was missed. */
  private missText(x: number, y: number) {
    const t = this.add
      .text(x, y - 12, 'pudło!', { fontFamily: 'monospace', fontSize: '7px', color: '#e8e4f0', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 })
      .setOrigin(0.5, 1)
      .setDepth(1_060_000);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }

  /** `strong`: a strong attack (held WALKA.mocnyPoMs): harder, further, sure to land, and never a talk or a door. */
  /** The reach of a sword swing (px), `far` × for a strong blow. */
  private swingReach(far = 1) {
    return (PLAYER.attackReach + PLAYER.attackRadius) * this.player.reach * far;
  }

  /** The nearest seen, living, hostile enemy within `range` of the hero (null: none). */
  private nearestFoe(range: number) {
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.isDead || e.peaceful || !e.visible) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - (this.player.y + 2)) - e.size;
      if (d < range && d < bd) [best, bd] = [e, d];
    }
    return best;
  }

  /** Turns the hero to the nearest enemy in reach (×1.5), so the swing goes at it and not at a tree. */
  private faceFoe(far = 1) {
    const foe = this.nearestFoe(this.swingReach(far) * 1.5);
    if (foe) this.player.face(foe.x - this.player.x, foe.y - (this.player.y + 2));
  }

  /** A swing at nothing to fight (owner, 6 Oct 2026): only a faint trace of the arm's sweep, no weapon picture. */
  private faintSwing(aim: number) {
    const g = this.add.graphics().setDepth(this.player.depth + 1);
    const r = this.swingReach() * 0.6, half = 0.7;
    g.lineStyle(1, 0xffffff, 0.35);
    g.beginPath();
    g.arc(this.player.x, this.player.y - 2, r, aim - half, aim + half);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }

  /**
   * New controls (walka/live.ts): a double tap/click at screen (sx, sy) – or E, (-1, -1) = right by the hero –
   * starts what is there: a talk, home, a stall, a train/cart, a door, or the quest spot the hero stands at.
   */
  private interact(sx: number, sy: number) {
    if (this.story.busy || this.demoRun?.busy || this.witam || this.anomalia?.busy || this.time.now < this.lingerUntil) return;
    const cam = this.cameras.main;
    const near = sx < 0;
    const w = near
      ? this.player.hitPoint()
      : new Phaser.Math.Vector2((sx * OSTROSC) / cam.zoomX + cam.worldView.x, (sy * OSTROSC) / cam.zoomY + cam.worldView.y);
    this.clickWorld = near ? null : { x: w.x, y: w.y };
    const far = Math.hypot(w.x - this.player.x, w.y - this.player.y) > INTERAKCJA_PX;
    this.rozmowca = null;
    if (!far) {
      if (!near) this.player.face(w.x - this.player.x, w.y - (this.player.y + 2));
      // Quest spots first: the hero went there to do exactly that.
      if (this.questTap()) return;
      if (this.interactChain(w, false, false)) return;
      // Nothing at the tap: maybe right by the hero.
      if (!near && this.interactChain(this.player.hitPoint(), false, false)) return;
      // A training station (dummy, target, crystal): the place to change sword/bow skills.
      if (this.training.hitAt(this.player.x, this.player.y, this.swingReach() * 2.5, 'miecz') || this.training.hitAt(this.player.x, this.player.y, this.swingReach() * 2.5, 'luk'))
        this.wyborUmiejetnosci(['miecz', 'luk'], '🎯 Ośrodek treningowy');
      return;
    }
    // Too far: say so if there is something to talk to or go into there.
    if (this.talkableAt(w.x, w.y, 14) || this.city.places.some((q) => Math.hypot(q.door.x - w.x, q.door.y - (w.y + FEET.dy)) < DOOR_RADIUS) || this.cartAt(w.x, w.y) || this.pociagi?.stacjaPrzy(w.x, w.y)) this.toast('👣 Podejdź bliżej.', 1200);
  }

  private hpWas = -1;
  private zycieCarry = 0;
  private zasobyAt = 0;

  /**
   * New controls test (content/zasoby.ts): stamina and mana come back (faster outside every red mist = a safe
   * zone), running inside a mist tires, an exhausted hero walks slower, and outside the mist life comes back too.
   * Runs only on active frames (never while paused/in a dialog), so no free regeneration.
   */
  private updateZasoby(dt: number, bx: number, by: number) {
    const lvl = poziomPostaci(session.exp);
    const x = this.player.x, y = this.player.y;
    const wMgle = this.streets.wMgle(x, y) || !!this.lowiska?.wMgle(x, y);
    this.bezpiecznie = !wMgle;
    if (this.player.hp < this.hpWas) zasoby.ranyAt = zasoby.czas;
    regenerujZasoby(dt, lvl, !wMgle);
    const ruch = Math.hypot(x - bx, y - by) / Math.max(dt, 1e-3);
    if (wMgle && ruch > this.player.speed * 0.6) wydajStamine(ZASOBY.koszt.biegNaS * dt, lvl, false);
    if (!wMgle && !this.inCombat() && zasoby.czas - zasoby.ranyAt > ZASOBY.zyciePoS && this.player.hp > 0 && this.player.hp < PLAYER.maxHp) {
      this.zycieCarry += ZASOBY.zycieNaS * dt;
      if (this.zycieCarry >= 1) {
        this.zycieCarry -= 1;
        this.player.heal(1);
        this.emitHud();
      }
    } else this.zycieCarry = 0;
    this.hpWas = this.player.hp;
    if (this.time.now > this.zasobyAt) {
      this.zasobyAt = this.time.now + 120;
      this.emitZasoby();
    }
  }

  private hpNad?: Phaser.GameObjects.Graphics;

  /** New controls test (owner, point 4): the hero's life as a small bar over his head (the red screen edges stay). */
  private rysujHpNad() {
    if (!this.hpNad || !this.hpNad.active) this.hpNad = this.add.graphics();
    const g = this.hpNad;
    g.clear();
    if (!this.player.visible && this.player.alpha === 0) return;
    const p = this.player;
    const k = skrotKamery();
    // Sprites are stretched back by 1/k when drawn (main.ts), so the head is that much higher on the map.
    const top = p.y - (p.displayHeight * p.originY) / k - 3;
    const w = 16, h = 2.5, x = p.x - w / 2;
    const max = Math.max(1, PLAYER.maxHp);
    const f = Math.max(0, Math.min(1, p.hp / max));
    const e = Math.max(0, Math.min(1 - f, p.extra / max));
    g.fillStyle(0x1e1a24, 0.85).fillRect(x - 0.6, top - 0.6, w + 1.2, h + 1.2);
    g.fillStyle(f > 0.5 ? 0x5fd35a : f > 0.25 ? 0xf0b429 : 0xe43b44, 1).fillRect(x, top, w * f, h);
    if (e) g.fillStyle(0x4aa3ff, 1).fillRect(x + w * f, top, w * e, h);
    g.setDepth(p.depth + 2);
  }

  /** Is the hero outside every red mist (new controls test: life and stamina come back there)? */
  bezpiecznie = true;

  /** Stamina/mana for the HUD (ui/hudLive.ts). */
  emitZasoby() {
    if (!live()) return;
    const lvl = poziomPostaci(session.exp);
    const u = this.umiejetnosc();
    ustawZasobyHud({
      s: zasoby.s, sMax: maxStaminy(lvl), m: zasoby.m, mMax: maxMany(lvl),
      magia: this.handSkill() === 'magia', wyczerpany: wyczerpany(lvl), bezpiecznie: this.bezpiecznie,
      umiej: u, gotowy: zasoby.czas - zasoby.mocnyAt >= ZASOBY.mocnyCooldownS,
      stac: u.bron === 'magia' ? zasoby.m >= ZASOBY.koszt.mocnyCzar : zasoby.s >= ZASOBY.koszt.mocny,
    });
  }

  /** A quest stage or goal right where the hero stands (new controls: they no longer go off by themselves). */
  private questTap(): boolean {
    for (const rm of this.missions) {
      const z = zadanieOf(rm.m);
      if (z.typ !== 'idz' || missionState(rm.m) !== 'active' || !rm.target) continue;
      if (Phaser.Math.Distance.Between(rm.target.x, rm.target.y, this.player.x, this.player.y) >= GOAL_RADIUS * 1.3) continue;
      this.arriveGoal(rm);
      return true;
    }
    return this.etapy.dotknij();
  }

  /** Home, a talk, a stall, a train/cart or a door at `hit` (or right by the hero): opened, true. */
  private interactChain(hit: Phaser.Math.Vector2, strong: boolean, foeNear: boolean): boolean {
    if (!strong && this.lochDotyk(hit)) return true;
    if (!strong && this.hitsHome(hit.x, hit.y) && !this.inCombat()) {
      session.at = null; // the next login starts at home
      this.save();
      this.openHome();
      return true;
    }
    // A swing at a character (with no enemy in the way) starts a talk.
    const talk = foeNear || strong ? null : this.talkableAt(hit.x, hit.y, 14) ?? this.talkableAt(this.player.x, this.player.y, NPC_RADIUS + 4);
    if (talk) {
      if (performance.now() >= this.talkReadyAt) {
        this.learnPlace();
        this.zapamietajRozmowce(hit.x, hit.y);
        talk();
      }
      return true;
    }
    // A swing at a merchant's stall (or a click on one near the hero, or standing by it): the merchant's shop.
    if (!foeNear && !strong && performance.now() >= this.talkReadyAt && this.stalls.length) {
      const c = this.clickWorld && Math.hypot(this.clickWorld.x - this.player.x, this.clickWorld.y - this.player.y) < 90 ? this.clickWorld : null;
      const st = this.stallAt(hit.x, hit.y, 10) ?? (c && this.stallAt(c.x, c.y, 9)) ?? this.stallAt(this.player.x, this.player.y, 13);
      if (st) {
        this.learnPlace();
        this.openShop(st);
        return true;
      }
    }
    // A swing at a train (any carriage), a click on it near the hero, or a swing while standing by it: its station's conductor.
    if (!foeNear && !strong && performance.now() >= this.talkReadyAt && (this.pociagi || this.wozy.length)) {
      const c = this.clickWorld && Math.hypot(this.clickWorld.x - this.player.x, this.clickWorld.y - this.player.y) < 90 ? this.clickWorld : null;
      const st = this.pociagi?.stacjaPrzy(hit.x, hit.y) ?? (c && this.pociagi?.stacjaPrzy(c.x, c.y, 2)) ?? this.pociagi?.stacjaPrzy(this.player.x, this.player.y, 8)
        ?? this.cartAt(hit.x, hit.y) ?? (c && this.cartAt(c.x, c.y)) ?? this.cartAt(this.player.x, this.player.y, 6);
      if (st) {
        this.learnPlace();
        this.openCoach(st);
        return true;
      }
    }
    // A swing at a building door (or while standing at one) goes in.
    if (!foeNear && !strong && performance.now() >= this.talkReadyAt && (this.openDoorAt(hit.x, hit.y + FEET.dy) || this.openDoorAt(this.player.x, this.player.y + FEET.dy, true))) return true;
    return false;
  }

  private resolveAttack(hit: Phaser.Math.Vector2, now: number, strong = false) {
    this.rozmowca = null; // a talk or a door below names the new speaker
    const swingAim = Math.atan2(hit.y - (this.player.y + 2), hit.x - this.player.x);
    const ranged = rangedWeapon();
    // Fighting = an enemy near the hero: then the swing is for it, never for trees, fruit or vegetables (owner, 6 Oct 2026).
    const fighting = !!this.nearestFoe(this.swingReach(strong ? WALKA.zasiegMiecz : 1) * 1.5);
    const drill = !!this.training.hitAt(this.player.x, this.player.y, this.swingReach() * 1.5, ranged ? (ranged.rodzaj === 'magia' ? 'magia' : 'luk') : 'miecz');
    // A bow or wand in hand: a tap shoots (unless it lands on a character, a door, a tree or a vegetable).
    const gathering = !!ranged && !fighting && !!(this.orchards.hitAt(hit.x, hit.y, 12) || this.forest.hitAt(hit.x, hit.y, 12) || this.mapView.korony.hitAt(hit.x, hit.y, 12) || this.forest.vegAt(hit.x, hit.y, 12, new Set()));
    // The weapon flies across only in a fight or at a training station; otherwise just a faint trace of the arm.
    if (!ranged || gathering) {
      this.ludzik3d?.atakuj(swingAim);
      if (fighting || drill || strong) this.swingWeapon(swingAim, strong);
      else this.faintSwing(swingAim);
    }
    // Old controls: a swing also talks, opens doors and stalls, calls a coachman. New controls (walka/live.ts):
    // only a double tap does (interact()), a swing is only a swing.
    const foeNear = this.enemies.some((e) => !e.isDead && !e.peaceful && Math.hypot(e.x - hit.x, e.y - hit.y) < 14 + e.size);
    if (!live() && this.interactChain(hit, strong, foeNear)) return;
    if (ranged && !gathering) {
      if (now - this.lastShot >= cooldown(this.handSkill())) this.fireShot(ranged, { x: Math.cos(swingAim), y: Math.sin(swingAim) }, false, now);
      return;
    }
    let hits = 0;
    let landed = false;
    // Easy levels: the sword sweeps a wide arc around the hero.
    const arc = (session.level.miecz * Math.PI) / 180;
    const aim = Math.atan2(hit.y - (this.player.y + 2), hit.x - this.player.x);
    const reach = (PLAYER.attackReach + PLAYER.attackRadius) * this.player.reach * (strong ? WALKA.zasiegMiecz : 1);
    const power = strong ? strongFactor('miecz') : 1;
    const chance = hitChance('miecz', strong, session.level.celnosc + gearAimBonus());
    const inArc = (s: Enemy) => {
      if (!arc) return false;
      const dx = s.x - this.player.x;
      const dy = s.y - (this.player.y + 2);
      if (Math.hypot(dx, dy) > reach + s.size) return false;
      const d = Math.abs(((Math.atan2(dy, dx) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return d <= arc / 2;
    };
    if (arc && (fighting || drill)) this.drawSweep(aim, arc, reach);
    // An enemy right on top of the hero is always hit too.
    const onHero = (s: Enemy) => Phaser.Math.Distance.Between(this.player.x, this.player.y + 2, s.x, s.y) < s.size + 7;
    for (const s of [...this.enemies]) {
      if (s.isDead || s.inAir) continue;
      if (Phaser.Math.Distance.Between(hit.x, hit.y, s.x, s.y) > PLAYER.attackRadius * this.player.reach * (strong ? WALKA.zasiegMiecz : 1) + s.size && !inArc(s) && !onHero(s)) continue;
      // Turn fight: a swing at a waiting group only asks whether to fight it.
      if (s.spokojny) {
        this.spotkania?.zaczep(s);
        return;
      }
      hits++;
      if (Math.random() >= chance) {
        this.missText(s.x, s.y - 4 * s.kind.scale);
        continue;
      }
      const imb = imbueOf(gear.equip.bron)?.e;
      landed = true;
      if (s.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now, meleeDamage() * power * this.essenceBoost(imb, s))) this.onEnemyKilled(s);
      else {
        this.essenceHit(imb, s, now);
        // A strong blow stuns for a moment (not dragons).
        if (strong && s.kindId !== 'smok') s.daze(now, WALKA.miecz.ogluszenieMs);
      }
    }
    // A blow that landed wears the sword (content/zuzycie.ts).
    if (landed) this.wearWeapon(gear.equip.bron);
    // New controls test: a swing at an enemy tires (a swing at nothing is free; a strong one was paid before).
    if (live() && hits && !strong) {
      wydajStamine(ZASOBY.koszt.cios, poziomPostaci(session.exp), false);
      this.emitZasoby();
    }
    // In a fight the swing is only for the enemies.
    if (fighting) {
      if (hits) this.practiced('miecz');
      return;
    }
    // Fruit trees: each swing knocks one fruit down.
    // Fruit trees don't count as sword practice.
    const tree = this.orchards.hitAt(hit.x, hit.y, 12 * this.player.reach);
    if (tree && this.orchards.shake(tree)) this.dropFruit(tree.x, tree.y, tree.fruit);
    // Pines in the forest: a few blows fell one and give wood.
    const pine = this.forest.hitAt(hit.x, hit.y, 12 * this.player.reach);
    if (pine && this.forest.chop(pine)) {
      this.dropFruit(pine.x, pine.y, this.chopYield());
      this.toast('🪓 Drzewo ścięte!', 1000);
    }
    // Overhaul 09: the generator's trees – chop the notched ones, shake fruit off, the rest say why not.
    const k09 = this.mapView.korony.hitAt(hit.x, hit.y, 12 * this.player.reach);
    if (k09) this.treeHit(k09, now);
    // Vegetables: a swing starts picking one (a bar fills up).
    const busy = new Set(this.harvests.map((h) => h.spot.id));
    const veg = this.forest.vegAt(hit.x, hit.y, 12 * this.player.reach, busy);
    if (veg) this.startHarvest(veg, now);
    // (Ripe vegetables on the 09 fields are picked by walking over them: ripeCrop.)
    const dummy = this.training.hitAt(hit.x, hit.y, 12 * this.player.reach, 'miecz');
    if (dummy) {
      hits++;
      this.dummyHit(dummy);
    }
    if (hits) this.practiced('miecz');
  }

  /** Trees being chopped (overhaul 09): blows left and the progress bar over the crown. */
  private chopping = new Map<string, { k: Korona; left: number; last: number; bar: Phaser.GameObjects.Graphics }>();
  /** Reasons already explained once in this session (then only a short sign). */
  private treeSaid = new Set<string>();

  /** A swing lands on one of the generator's trees (SPEC_09 point 4: from the first blow you see what happens). */
  private treeHit(k: Korona, now: number) {
    const t = k.t;
    const x = t.x / GEN_DOTS, y = t.y / GEN_DOTS;
    const top = y - k.a.ky / GEN_DOTS + 3;
    if (t.o === 'sad') {
      // Fruit trees: shaking, one fruit falls; bare ones say when fruit comes back.
      if (this.mapView.korony.strac(k)) this.dropFruit(x, y - 4, DRZEWA_09.owoc[t.g] ?? 'jablko');
      else this.treeBubble(x, top, this.treeSaid.has('pusto') ? DRZEWA_09.krotko : DRZEWA_09.pusto, 'pusto');
      return;
    }
    if (!t.c) {
      this.mapView.korony.trzes(k);
      if (t.o) this.treeBubble(x, top, this.treeSaid.has(t.o) ? DRZEWA_09.krotko : DRZEWA_09.dlaczego[t.o], t.o);
      return;
    }
    // A notched tree: every blow fills the bar; the last one fells it.
    const id = `${t.x},${t.y}`;
    let c = this.chopping.get(id);
    if (!c) {
      c = { k, left: LAS.uderzenNaDrzewo, last: now, bar: this.add.graphics().setDepth(1_050_000) };
      this.chopping.set(id, c);
    }
    c.left--;
    c.last = now;
    this.mapView.korony.trzes(k, true);
    this.woodChips(x, y - 3);
    navigator.vibrate?.(15);
    this.drawChopBar(c.bar, x, top, 1 - c.left / LAS.uderzenNaDrzewo);
    if (c.left > 0) return;
    c.bar.destroy();
    this.chopping.delete(id);
    this.mapView.korony.zetnij(k, this.player.x < x);
    this.mapView.redrawAround(x, y);
    const got = this.chopYield();
    this.dropFruit(x, y - 2, got);
    this.floatText(x, top, `+1 ${OWOCE[got].nazwa}`, '#e8c56a');
  }

  private axeHintShown = false;
  /** A felled tree gives wood with an axe (which wears one point per tree), else only brushwood (docs/ekonomia.md). */
  private chopYield(): Owoc {
    const a = axe();
    if (!a) {
      if (!this.axeHintShown) {
        this.axeHintShown = true;
        const blunt = ownsAxe();
        const text = `🪓 Bez ${blunt ? 'ostrej ' : ''}siekiery z drzewa leci tylko chrust. ${blunt ? 'Naostrz ją w sklepie (Napraw).' : 'Siekierę kupisz w sklepie budowlanym albo w niektórych zwykłych.'}`;
        this.time.delayedCall(900, () => this.toast(text, 3500));
      }
      return 'chrust';
    }
    const r = useWeapon(a, session.level.zuzycie);
    if (r === 'warn') this.toast('⚠️ Siekiera się tępi – naostrz ją w sklepie (Napraw).', 2600);
    else if (r === 'broken') this.toast('🪓 Siekiera całkiem się stępiła. Dopóki jej nie naostrzysz w sklepie, z drzew leci chrust.', 3500);
    return 'drewno';
  }

  /**
   * Every DIY shop and a third of the ordinary ones (picked by the shop's id, so always the same ones) sell the axe
   * (owner, 5 Oct 2026). `gear` places are DIY and sports shops together (the map keeps no OSM type), so sports
   * ones are told apart by name (SIEKIERA.sportowy).
   */
  private sellsAxe(p: CityPlace) {
    if (p.kind === 'gear') return !SIEKIERA.sportowy.test(p.name);
    let h = 0;
    for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h) % SIEKIERA.coKtorySklep === 0;
  }

  /** The chopping bar over a crown: brass frame, segments filling up. */
  private drawChopBar(g: Phaser.GameObjects.Graphics, x: number, y: number, part: number) {
    const w = 16, h = 3, n = LAS.uderzenNaDrzewo;
    g.clear().setAlpha(1);
    g.fillStyle(0x1e1a24, 1).fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 2);
    g.fillStyle(0x6b4a22, 1).fillRect(x - w / 2, y - h, w, h);
    g.fillStyle(0xe9c56a, 1).fillRect(x - w / 2, y - h, Math.round(w * part), h);
    g.fillStyle(0x1e1a24, 1);
    for (let i = 1; i < n; i++) g.fillRect(x - w / 2 + Math.round((w * i) / n), y - h, 0.5, h);
  }

  /** Bars fade after a while without a blow, and the progress is lost. */
  private updateChopping(now: number) {
    for (const [id, c] of this.chopping) {
      const idle = now - c.last;
      if (idle < DRZEWA_09.pasekGasnieMs - 500) continue;
      c.bar.setAlpha(Math.max(0, (DRZEWA_09.pasekGasnieMs - idle) / 500));
      if (idle >= DRZEWA_09.pasekGasnieMs || !c.k.im.active) {
        c.bar.destroy();
        this.chopping.delete(id);
      }
    }
  }

  /** Little wood chips flying from the trunk. */
  private woodChips(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const r = this.add.rectangle(x, y, 1, 1, [0xc9a46a, 0x8a613f, 0xe2c08a][i % 3]).setDepth(1_040_000);
      this.tweens.add({ targets: r, x: x + (Math.random() - 0.5) * 16, y: y - 2 - Math.random() * 6, alpha: 0, duration: 380 + Math.random() * 200, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    }
  }

  /** A short line over a tree (why it can't be cut, it's bare…): the full text the first time, later only a sign. */
  private treeBubble(x: number, y: number, text: string, why: string) {
    this.treeSaid.add(why);
    this.floatText(x, y, text, '#f3ecd8', text.length > 3 ? 1600 : 700);
  }

  private floatText(x: number, y: number, text: string, color: string, ms = 900) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '6px', color, stroke: '#1e1a24', strokeThickness: 3, resolution: 4, align: 'center', wordWrap: { width: 110 } })
      .setOrigin(0.5, 1)
      .setDepth(1_060_000);
    this.tweens.add({ targets: t, y: y - 8, alpha: { from: 1, to: 0 }, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => t.destroy() });
  }

  /** Vegetables being picked: a bar over each fills up in WARZYWA.zbiorSekund. */
  private harvests: { spot: ForestSpot; start: number; bar: Phaser.GameObjects.Graphics }[] = [];

  private startHarvest(spot: ForestSpot, now: number) {
    this.harvests.push({ spot, start: now, bar: this.add.graphics().setDepth(1_050_000) });
  }

  private updateHarvests(now: number) {
    const ms = WARZYWA.zbiorSekund * 1000;
    this.harvests = this.harvests.filter((h) => {
      const { spot, bar } = h;
      // Walked away: picking stops.
      if (Math.hypot(spot.x - this.player.x, spot.y - this.player.y) > 30 * PX_PER_M) {
        bar.destroy();
        return false;
      }
      const t = Math.min(1, (now - h.start) / ms);
      bar.clear().fillStyle(0x1e1a24, 0.8).fillRect(spot.x - 7, spot.y - 14, 14, 3).fillStyle(0x7fd35a, 1).fillRect(spot.x - 6.5, spot.y - 13.5, 13 * t, 2);
      if (t < 1) return true;
      bar.destroy();
      const f = spot.veg!;
      if (!addFruit(f)) {
        this.toast('Plecak pełny!', 1200);
        return false;
      }
      session.stats.fruit++;
      spot.sprite?.destroy();
      if (spot.id.startsWith('pole:')) this.mapView.zbierzUprawe(spot.id.slice(5), spot.x, spot.y);
      else this.forest.picked(spot.id);
      this.toast(`+1 ${OWOCE[f].nazwa}`, 800);
      this.emitHud();
      return false;
    });
  }

  private swingSide = 1;

  /**
   * The weapon in hand flies across in front of the hero, from left to right
   * and next time from right to left (content/walka.ts WALKA). A strong
   * attack: a bigger, golden-edged, slower and wider swing.
   */
  private swingWeapon(aim: number, strong: boolean) {
    const key = itemTexture(gear.equip.bron ?? 'kijek');
    if (!key || !this.textures.exists(key)) return;
    const W = WALKA;
    const half = ((W.lukStopnie * Math.PI) / 180 / 2) * (strong ? 1.3 : 1);
    const side = this.swingSide;
    this.swingSide = -side;
    const img = this.add.image(this.player.x, this.player.y, key).setOrigin(0.2, 0.8);
    const size = W.wielkoscBroni * (strong ? 1.35 : 1) * SKALA_POSTACI;
    img.setDisplaySize(size, size);
    if (strong) img.setTint(0xfff0b0);
    const st = { a: aim - half * side };
    const place = () => {
      // The hilt in the hero's hand, the blade pointing out along the swing (the pictures point up-right).
      const cx = this.player.x + Math.cos(st.a) * 3 * SKALA_POSTACI;
      const cy = this.player.y - 3 * SKALA_POSTACI + Math.sin(st.a) * 3 * SKALA_POSTACI;
      img.setPosition(cx, cy).setRotation(st.a + Math.PI / 4);
      // In front of the hero when swinging down, behind when up.
      img.setDepth(this.player.depth + (Math.sin(st.a) > -0.3 ? 1 : -1));
    };
    place();
    this.tweens.add({
      targets: st, a: aim + half * side, duration: W.ciosMs * (strong ? 1.6 : 1), ease: 'Cubic.Out',
      onUpdate: place,
      onComplete: () => this.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() }),
    });
  }

  /** A white swoosh along the sword's arc. */
  private drawSweep(aim: number, arc: number, reach: number) {
    const g = this.add.graphics().setDepth(this.player.depth + 1);
    const cx = this.player.x;
    const cy = this.player.y + 2;
    g.lineStyle(4, 0xffffff, 0.35);
    g.beginPath();
    g.arc(cx, cy, reach * 0.8, aim - arc / 2, aim + arc / 2);
    g.strokePath();
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.beginPath();
    g.arc(cx, cy, reach * 0.8, aim - arc / 2, aim + arc / 2);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private dropFruit(x: number, y: number, fruit: Owoc) {
    const tex = GOODS_TEX[fruit];
    const tx = x + (Math.random() - 0.5) * 16;
    const ty = y + 4 + Math.random() * 8;
    const item = this.add.image(x, y - 10, tex).setScale(artScale(tex)).setDepth(ty);
    item.setData('kind', `fruit:${fruit}`);
    // Falls from the crown to the ground, then can be picked up.
    this.tweens.add({ targets: item, x: tx, y: ty, duration: 280, ease: 'Bounce.Out', onComplete: () => this.pickups.push(item) });
  }

  /**
   * A dragon starts fighting. The Wawel demo uses SmokAI with retreats after damage; the other dragons are
   * data (content/smoki.ts): the story's dragon is 'cien' (attacks come in phases, life = SMOK_CIOSOW
   * blows of the hero's sword), the others have their species' life.
   */
  private dragonFight(s: Enemy) {
    // The QR demo's Wawel dragon: the artist's mountain dragon (owner, 7 Oct 2026: the old small green placeholder
    // didn't read as a dragon); its life is set by the demo (SEN.ciosow blows).
    if (this.demoRun?.isDragon(s)) {
      s.gatunek = 'gorski';
      this.dragons.set(s, new SmokAI(this, s, 'gorski', this.smokHost(SEN.trudnoscSmoka), {
        lotPoObrazeniach: SEN.ciosyDoLotu * meleeDamage(), widocznyOdlot: true,
      }));
      return;
    }
    const story = s === this.story.dragonSprite;
    const g: GatunekId = s.gatunek ?? (story ? 'cien' : 'lesny');
    s.gatunek = g;
    if (story) s.hp = Math.max(s.hp, Math.round(GameScene.SMOK_CIOSOW * meleeDamage() * (s.power ?? 1)));
    else if (!s.getData('smokZycie')) {
      s.hp = Math.round((GATUNKI_SMOKOW[g].zycie || 400) * (s.power ?? 1)); // 'cien' called on the test server: 400
      s.setData('smokZycie', true);
    }
    this.dragons.set(s, new SmokAI(this, s, g, this.smokHost()));
  }

  /** A beaten dragon's loot (content/smoki.ts): dragon scales into the backpack, gold on the ground, EXP. */
  private smokLup(g: GatunekId, x?: number, y?: number) {
    const L = GATUNKI_SMOKOW[g].lup;
    const roll = ([a, b]: [number, number]) => a + Math.floor(Math.random() * (b - a + 1));
    const n = roll(L.luska);
    let wlozone = 0;
    for (let i = 0; i < n; i++) if (addFruit('luska')) wlozone++;
    if (wlozone) this.toast(`🐉 Łuska smocza ×${wlozone}${wlozone < n ? ' (plecak pełny)' : ''}`, 2500);
    const zloto = roll(L.zloto);
    if (zloto && x !== undefined && y !== undefined) {
      const kupki = Math.min(5, zloto);
      let left = zloto;
      for (let i = 0; i < kupki; i++) {
        const k = i === kupki - 1 ? left : Math.max(1, Math.round(left / (kupki - i)));
        left -= k;
        const a = (i / kupki) * Math.PI * 2;
        this.dropPickup(x + Math.cos(a) * 10, y! + Math.sin(a) * 7, false, k);
      }
    }
    if (L.exp) session.exp += L.exp;
    this.gearChanged();
  }

  /** Index of the difficulty (0 Dziecięcy … 4 Hardkor) for the dragons' table. */
  private trudnoscIdx() {
    return Math.max(0, TRUDNOSCI.indexOf(session.level));
  }

  /** What a dragon's brain may do to the hero (damage as a share of full life, states, shaking). */
  private smokHost(trudnosc = this.trudnoscIdx()) {
    const mult = () => TRUDNOSC_SMOKOW.obrazenia[trudnosc] ?? 1;
    return {
      player: this.player,
      W: 56 * 0.36 * SKALA_POSTACI,
      trudnosc,
      blocked: (x: number, y: number) => this.city.isBlocked(x, y),
      hurt: (from: Phaser.Math.Vector2, czesc: number) => {
        if (this.time.now < this.noHurtUntil || this.player.isDead) return;
        // Fractions of a half-heart add up (Dziecięcy: a bite is 4 % of life, less than half a heart).
        const pending = this.smokCarry + czesc * PLAYER.maxHp * mult();
        const dmg = Math.floor(pending);
        const blocked = Math.random() < blockChance();
        if (!this.player.hurt(from, this.time.now, blocked ? 0 : dmg)) return;
        if (blocked) this.toast('Zbroja zatrzymała cios!', 700);
        else this.smokCarry = pending - dmg;
        this.emitHud();
        if (this.player.isDead) this.onPlayerDeath();
      },
      drain: (czesc: number) => this.smokDrain(czesc * mult()),
      stan: (st: StanGracza, ms: number) => {
        const now = this.time.now;
        const cur = this.stany[st];
        this.stany[st] = { do: Math.max(cur?.do ?? 0, now + ms), tik: cur?.tik ?? now + 500 };
        if (st === 'zatrucie') this.emitHud();
      },
      shake: (px: number, ms: number) => {
        if (!trzesienieWlaczone()) return this.flash(ms);
        const cam = this.cameras.main;
        cam.shake(ms, px / Math.max(1, cam.width / cam.zoom), true);
        try {
          navigator.vibrate?.(Math.min(400, ms));
        } catch {
          /* no vibration */
        }
      },
    };
  }

  // ------------------------------------------------------------------ Łowiska test pilot (wolf packs)

  /** Wspólny limit równoczesnych sekwencji ataku wokół bohatera (brief: 2 wręcz + 1 dystans). */
  private rezerwujAtak(typ: 'wrecz' | 'dystans', zawsze = false): boolean {
    const limit = LOWISKA.limitAtakow[typ];
    if (typ === 'wrecz') {
      if (this.atakiWrecz >= limit && !zawsze) return false;
      this.atakiWrecz++;
      return true;
    }
    if (this.atakiDystans >= limit) return false;
    this.atakiDystans++;
    return true;
  }

  private zwolnijAtak(typ: 'wrecz' | 'dystans') {
    if (typ === 'wrecz') this.atakiWrecz = Math.max(0, this.atakiWrecz - 1);
    else this.atakiDystans = Math.max(0, this.atakiDystans - 1);
  }

  private wilkHost(): StworHost {
    return {
      scene: this,
      player: this.player,
      hurt: (from: Phaser.Math.Vector2, obrazenie: number) => {
        if (this.time.now < this.noHurtUntil || this.player.isDead) return;
        const blocked = Math.random() < blockChance();
        const pending = this.wilkCarry + obrazenie * session.level.obrazenia;
        const dmg = Math.floor(pending);
        if (!this.player.hurt(from, this.time.now, blocked ? 0 : dmg)) return;
        if (blocked) this.toast('Zbroja zatrzymała cios!', 700);
        else this.wilkCarry = pending - dmg;
        this.emitHud();
        if (this.player.isDead) this.onPlayerDeath();
      },
      rezerwuj: (typ, zawsze) => this.rezerwujAtak(typ, zawsze),
      zwolnij: (typ) => this.zwolnijAtak(typ),
      spowolnij: (mnoznik, ms) => {
        // Never stacked (brief: at least 50 % speed, at most 2 s).
        this.spowolnienie = Math.max(0.5, mnoznik);
        this.spowolnienieDo = this.time.now + Math.min(2000, ms);
      },
      sciana: (x, y) => this.city.isBlocked(x, y) || this.landmarks.blocked(x, y),
      inni: (me) => {
        const out: { x: number; y: number }[] = [];
        for (const [e] of this.wilki) if (e !== me && !e.isDead && Math.abs(e.x - me.x) < 30 && Math.abs(e.y - me.y) < 30) out.push(e);
        return out;
      },
    };
  }

  /** A lingering effect's tick (burning, acid, poison): no knock-back; fractions add up. */
  private smokDrain(czesc: number) {
    if (this.player.isDead || session.immortal && this.player.hp <= 1) return;
    if (this.time.now < this.noHurtUntil) return;
    const pending = this.smokCarry + czesc * PLAYER.maxHp;
    const n = Math.floor(pending);
    this.smokCarry = pending - n;
    if (n <= 0) return;
    this.player.drain(n);
    this.player.setTint(0xff9a8a);
    this.time.delayedCall(120, () => this.player.clearTint());
    this.emitHud();
    if (this.player.isDead) this.onPlayerDeath();
  }

  /** Burning, acid burns and poison from dragons: their ticks; poison slows the walk (applied in update). */
  private updateStany(now: number) {
    const T: Record<StanGracza, { tik: number; obrazenia: number }> = {
      podpalenie: ATAKI_SMOKA.ogien.podpalenie,
      oparzenie: ATAKI_SMOKA.kwas.oparzenie,
      zatrucie: { tik: ATAKI_SMOKA.dym.tik, obrazenia: ATAKI_SMOKA.dym.obrazenia },
    };
    let changed = false;
    for (const k of Object.keys(this.stany) as StanGracza[]) {
      const st = this.stany[k]!;
      if (now >= st.do) {
        delete this.stany[k];
        changed = changed || k === 'zatrucie';
        continue;
      }
      if (now >= st.tik) {
        st.tik = now + T[k].tik;
        this.smokDrain(T[k].obrazenia * (TRUDNOSC_SMOKOW.obrazenia[this.trudnoscIdx()] ?? 1));
      }
    }
    if (changed) this.emitHud();
  }

  /** Instead of shaking (switched off in the menu): a short white flash. */
  private flash(ms: number) {
    this.cameras.main.flash(Math.min(250, ms), 255, 250, 235);
  }

  private onEnemyKilled(s: Enemy) {
    if (s.minions && WODNIK.blobyZnikajaZNim) for (const m of s.minions) this.dissolve(m);
    this.dragons.get(s)?.destroy();
    this.dragons.delete(s);
    this.wilki.get(s)?.destroy();
    this.wilki.delete(s);
    if (s.duel) return this.endDuel(s, true);
    if (this.demoRun?.isDragon(s)) {
      this.enemies = this.enemies.filter((e) => e !== s);
      this.demoRun.onDragonKilled(s);
      return;
    }
    if (s === this.story.dragonSprite) {
      this.enemies = this.enemies.filter((e) => e !== s);
      this.smokLup('cien');
      this.story.dragonKilled();
      return;
    }
    if (s.kindId === 'smok' && s.gatunek) {
      if (s.ownLook) smokSmierc(this, s, s.gatunek); // the artist's dragon lies down and fades
      this.enemies = this.enemies.filter((e) => e !== s);
      this.smokiNaMapie?.pokonany(s);
      this.smokLup(s.gatunek, s.x, s.y);
      session.stats.kills.smok = (session.stats.kills.smok ?? 0) + 1;
      this.emitHud();
      return;
    }
    // New fight: loot/EXP set per creature in the admin panel (tab „🐺 Stworki”, content/stwory.ts), else the old drops.
    const ustawione = live() ? stwory[s.kindId] : undefined;
    const zPanelu = live() ? losujLup(s.kindId) : null;
    if (zPanelu) this.lupZPanelu(s.x, s.y, zPanelu);
    else this.dropLoot(s.x, s.y, s.kindId);
    this.enemies = this.enemies.filter((e) => e !== s);
    session.exp += ustawione?.exp ?? s.kind.exp;
    session.stats.kills[s.kindId] = (session.stats.kills[s.kindId] ?? 0) + 1;
    this.emitHud();
    if (s.ambient) this.streets.killed(s);
    if (s.lowisko) this.lowiska?.killed(s);
    if (this.loch?.zabity(s)) return; // dungeon monsters never come back this login
    if (s.folkQuest) this.folkQuestKill(s);
    if (s.temp || s.ambient || s.lowisko) return;
    if (s.missionId) {
      const rm = this.missions.find((r) => r.m.id === s.missionId);
      if (rm && !this.enemies.some((e) => e.missionId === s.missionId)) this.completeStage(rm, 'Zadanie wykonane! ');
    } else {
      // Fixed spots come back after a while.
      const home = s.home.clone();
      const kind = s.kindId;
      this.time.delayedCall(RESPAWN_MS, () => this.spawnEnemy(home.x, home.y, undefined, kind));
    }
  }

  private spawnGroup(p: Place, count: number, missionId?: string, kind: RodzajWroga = 'glut', spread = 40) {
    for (let i = 0; i < count; i++) {
      // Spread them around the spot on free ground, preferably on a street
      // or path (so they can't end up shut in a courtyard).
      for (let t = 0; t < 120; t++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * (tury() ? Math.min(spread, 14) : spread);
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (!this.city.isFree(x, y + FEET.dy, FEET.hw, FEET.hh)) continue;
        if (t < 80 && !this.city.roadAt(x, y)) continue;
        this.spawnEnemy(x, y, missionId, kind);
        break;
      }
    }
  }

  /** A dragon of a kind (content/smoki.ts) at (x, y), fighting by SmokAI once the hero comes near. */
  spawnDragon(x: number, y: number, g: GatunekId) {
    const e = this.spawnEnemy(x, y, undefined, 'smok');
    e.gatunek = g;
    // Turn fight: no live SmokAI dresses it, so it gets its look (the artist's sheet) now.
    if (tury()) ubierzSmoka(this, e, g, GATUNKI_SMOKOW[g].kolor, GATUNKI_SMOKOW[g].skala);
    return e;
  }

  spawnEnemy(x: number, y: number, missionId?: string, kind: RodzajWroga = 'glut') {
    const s = new Slime(this, x, y, kind) as Enemy;
    s.missionId = missionId;
    const w = WPLYW_NA_POTWORY[kind]?.[weather.kind];
    if (w?.sila) {
      s.power = w.sila;
      s.hp = Math.max(1, Math.round(s.hp * w.sila));
    }
    if (kind === 'wodnik') s.brain = (now) => this.wodnikThink(s, now);
    // Turn fight (test server): nobody chases; groups wait to be met. Łowiska wolves (test pilot) are
    // always real-time, isolated from the turn system regardless of this switch (brief, 25 Oct 2026).
    if (tury() && kind !== 'wilk' && kind !== 'warg') {
      s.spokojny = true;
      s.roam = 6; // a group stays together (walka/Spotkania.ts finds it by chains of near members)
    }
    this.enemies.push(s);
    return s;
  }

  // ------------------------------------------------------------------ Arena Cechu (asynchronous PvP, test server)

  /** Letters from the Arena waiting in the home chest (loaded at the start). */
  private listyAreny: { dzien: string; walk: number; wygranych: number }[] = [];

  /** My fighter as other players meet it (my ghost): everything a fight needs, the same rules both ways. */
  private mojDuch(): DuchAreny {
    const r = rangedWeapon();
    const skill = r ? (r.rodzaj === 'magia' ? 'magia' : 'luk') : 'miecz';
    return {
      postac: session.look.postac, name: session.name, poziom: poziomPostaci(session.exp), maxHp: PLAYER.maxHp,
      atak: Math.round(meleeDamage() * 10) / 10, trafienie: Math.round(hitChance(skill, false, gearAimBonus()) * 100) / 100,
      blok: Math.round(blockChance() * 100) / 100, mocny: Math.round(strongFactor('miecz') * 10) / 10, bron: gear.equip.bron ?? null,
      ...(r ? { strzal: Math.round(shotDamage(r) * 10) / 10 } : {}),
    };
  }

  /** The Arena's judge (big pitches): explains, then a fight, the ranking or goodbye. */
  private openArena() {
    const T = ARENA_TEKSTY;
    this.dialog({
      title: `⚖ ${T.sedzia}`,
      text: T.powitanie.replace('{wpisowe}', String(ARENA.wpisowe)).replace('{nagroda}', String(ARENA.nagroda)),
      buttons: [`⚔ Walka na Arenie Cechu (${ARENA.wpisowe} 💰)`, '🏆 Ranking Areny', ...(live() ? ['🎯 Trening umiejętności (miecz, łuk)'] : []), 'Do widzenia'],
      onChoose: (i) => {
        if (i === 0) this.arenaRywal();
        else if (i === 1) this.arenaRanking();
        else if (i === 2 && live()) this.wyborUmiejetnosci(['miecz', 'luk'], `⚖ ${T.sedzia}`);
      },
    });
  }

  private arenaRywal() {
    const T = ARENA_TEKSTY;
    const title = `⚖ ${T.sedzia}`;
    if (session.coins < ARENA.wpisowe) return this.dialog({ title, text: T.brakMonet(ARENA.wpisowe, session.coins), buttons: ['OK'], onChoose: () => {} });
    const mine = this.mojDuch();
    api.arenaRywal(session.token, mine).then((res) => {
      if (res.blad === 'godzina') return this.dialog({ title, text: T.limitGodzina(res.za_min ?? 60), buttons: ['OK'], onChoose: () => {} });
      if (res.blad === 'dzien') return this.dialog({ title, text: T.limitDzien, buttons: ['OK'], onChoose: () => {} });
      if (res.blad || !res.bilet) return this.dialog({ title, text: T.blad, buttons: ['OK'], onChoose: () => {} });
      const lvl = res.poziom ?? mine.poziom;
      const G = ARENA.gladiator;
      const rywal: DuchAreny = res.rywal?.snap ?? { name: T.gladiator, poziom: lvl, maxHp: PLAYER.maxHp, atak: G.atak(lvl), trafienie: G.trafienie(lvl), blok: G.blok, mocny: 3, postac: 1 };
      rywal.name = res.rywal?.name ?? rywal.name;
      const kto = res.rywal
        ? `Rywal: duch ${res.rywal.name}, poziom ${res.rywal.poziom}, ${res.rywal.wygrane} ${res.rywal.wygrane === 1 ? 'wygrana' : 'wygranych'} na arenie.`
        : `Dziś nikt na twoim poziomie jeszcze nie walczył – na arenę wychodzi ${T.gladiator} (poziom ${lvl}).`;
      this.dialog({
        title: '⚔ Arena Cechu',
        text: `${kto}\n\nWpisowe ${ARENA.wpisowe} monet, zwycięzca bierze ${ARENA.nagroda}. W walce każdy ma jedno leczenie – mikstury zostają w plecaku.\n\nDziś zostało jeszcze ${res.zostalo_dzis ?? 0} walk (w tej godzinie ${res.zostalo_godz ?? 0}).`,
        buttons: [`⚔ Walcz (${ARENA.wpisowe} 💰)`, 'Nie teraz'],
        onChoose: (i) => {
          if (i !== 0) return;
          if (session.coins < ARENA.wpisowe) return this.dialog({ title, text: T.brakMonet(ARENA.wpisowe, session.coins), buttons: ['OK'], onChoose: () => {} });
          spend(ARENA.wpisowe);
          this.save();
          this.startArena(res.bilet!, rywal, !res.rywal, lvl);
        },
      });
    }).catch(() => this.dialog({ title, text: T.blad, buttons: ['OK'], onChoose: () => {} }));
  }

  /** Off to the Arena Cechu (its own scene); the map waits paused and hidden under it. */
  private startArena(bilet: string, rywal: DuchAreny, gladiator: boolean, poziom: number) {
    this.player.move(0, 0, this.time.now);
    resetTouch();
    resetKeys();
    const zoom = this.cameras.main.zoomX;
    this.scene.pause();
    this.scene.setVisible(false);
    const dane: ArenaDane = {
      rywal, gladiator, poziom, zoom,
      hero: { postac: session.look.postac, name: session.name },
      ...(() => { const m = this.kurierMiejsce(); return { kraj: m.k, miasto: m.c }; })(),
      cwiczenie: (skill, pkt) => this.practiced(skill, pkt),
      toast: (t, ms) => this.toast(t, ms),
      koniec: (wygrana) => this.arenaKoniec(bilet, wygrana, rywal.name),
    };
    this.scene.launch('arena', dane);
  }

  private arenaKoniec(bilet: string, wygrana: boolean, rywal: string) {
    this.scene.stop('arena');
    this.scene.setVisible(true);
    this.scene.resume();
    resetTouch();
    resetKeys();
    document.body.classList.remove('walka-tur');
    if (wygrana) {
      earn(ARENA.nagroda);
      session.stats.arena = (session.stats.arena ?? 0) + 1;
    } else session.stats.arenaPrzegrane = (session.stats.arenaPrzegrane ?? 0) + 1;
    this.emitHud();
    this.save();
    const T = ARENA_TEKSTY;
    const pokaz = (delta: number | null, punkty?: number) => this.dialog({
      title: wygrana ? '🏆 Arena Cechu' : '⚔ Arena Cechu',
      text: `${wygrana ? T.wygrana(ARENA.nagroda, delta ?? 0) : T.przegrana(delta ?? 0)}${punkty !== undefined ? `\n\nTwoje punkty: ${punkty}.` : ''}\n\nRywal: ${rywal}. Wygranych na arenie: ${session.stats.arena ?? 0}.`,
      buttons: ['OK'],
      onChoose: () => {},
    });
    api.arenaWynik(session.token, bilet, wygrana)
      .then((r) => pokaz(r.delta ?? null, r.punkty))
      .catch(() => pokaz(null));
  }

  private arenaRanking() {
    const title = '🏆 Ranking Areny Cechu';
    api.arenaRanking(session.token).then((r) => {
      const top = r.top.map((q, i) => `${i + 1}. ${q.name} (poz. ${q.poziom}) – ${q.punkty} pkt, ${q.wygrane} wygr.`).join('\n') || 'Na razie nikt nie walczył.';
      const ja = r.ja ? `\n\nTy: ${r.ja.miejsce}. miejsce, ${r.ja.punkty} pkt, ${r.ja.wygrane} wygranych, ${r.ja.przegrane} przegranych, twój duch obronił się ${r.ja.obrony} razy.` : '\n\nStocz pierwszą walkę, żeby trafić do rankingu.';
      this.dialog({ title, text: top + ja, buttons: ['OK'], onChoose: () => {} });
    }).catch(() => this.dialog({ title, text: ARENA_TEKSTY.blad, buttons: ['OK'], onChoose: () => {} }));
  }

  /** Opens the oldest letter: the ghost's fights of that day, 10 gold per win (once – the server keeps track). */
  private otworzListAreny() {
    const l = this.listyAreny.shift();
    if (!l) return;
    const zloto = l.wygranych * ARENA.zaObrone;
    this.dialog({
      title: '📜 List z Areny Cechu',
      text: ARENA_TEKSTY.list(l.dzien, l.walk, l.wygranych, zloto),
      buttons: [zloto ? '✉ Otwórz kopertę' : 'Odłóż list'],
      onChoose: () => {
        api.arenaOdbierz(session.token, l.dzien).then((g) => {
          if (g > 0) {
            earn(g);
            this.emitHud();
            this.save();
            this.toast(`💰 +${g} złota z Areny Cechu`, 2500);
          }
          if (this.listyAreny.length) this.otworzListAreny();
        }).catch(() => this.listyAreny.unshift(l));
      },
    });
  }

  /** Enemies that keep the live fight even on the turn-fight server (the story's dragon, the demo's). */
  private bezTur(e: Enemy) {
    e.spokojny = false;
    return e;
  }

  // ------------------------------------------------------------------ turn fight (test server)

  /** Meeting groups on the map: the ring, Podejdź / Odejdź, talks, fees (walka/Spotkania.ts). */
  private makeSpotkania() {
    return new Spotkania({
      scene: this,
      player: this.player,
      wrogowie: () => this.enemies,
      mozna: (e) => {
        const q = e as Enemy;
        return !q.duel && !q.peaceful && !this.demoRun?.isDragon(q);
      },
      wolne: (x, y) => this.freeFeet(x, y + FEET.dy),
      dialog: (req) => this.dialog(req),
      zajety: () => !!this.walka?.aktywna || this.player.isDead || this.scene.isPaused() || this.time.now < this.lingerUntil || this.story.busy || !!this.anomalia?.busy || this.travelling || this.leaving,
      walcz: (kto) => this.startWalka(kto as Enemy[]),
      odchodza: (kto) => {
        for (const e of kto as Enemy[]) {
          this.enemies = this.enemies.filter((x) => x !== e);
          this.tweens.add({ targets: e, alpha: 0, duration: 500, onComplete: () => e.destroy() });
        }
        this.streets.paidOff(kto);
      },
      monety: () => session.coins,
      zaplac: (n) => {
        spend(n);
        this.emitHud();
      },
      poziom: () => poziomPostaci(session.exp),
      toast: (t, ms) => this.toast(t, ms),
    });
  }

  /** Starts a turn fight with these enemies on this very spot of the map. */
  private startWalka(kto: Enemy[]) {
    if (this.walka?.aktywna || !kto.length) return;
    resetTouch();
    resetKeys();
    consumeAttack();
    consumeRelease();
    this.player.move(0, 0, this.time.now);
    this.player.vel.set(0, 0);
    this.spotkania?.ukryj();
    // Dragons' life in turns: the story's dragon = SMOK_W_TURACH.ciosowFabuly blows of the hero's sword, wild ones their species'.
    for (const e of kto) {
      if (e.kindId !== 'smok' || e.getData('smokZycie')) continue;
      e.setData('smokZycie', true);
      const g: GatunekId = e.gatunek ?? (e === this.story.dragonSprite ? 'cien' : 'lesny');
      e.gatunek = g;
      e.heavy = true;
      e.hp = e === this.story.dragonSprite
        ? Math.round((SMOK_W_TURACH.ciosowFabuly * meleeDamage() * (e.power ?? 1)) / WALKA_TUROWA.wrog.zycie)
        : Math.round((GATUNKI_SMOKOW[g].zycie || 400) * (e.power ?? 1));
    }
    const naSwiat = (x: number, y: number) => {
      const cam = this.cameras.main;
      return { x: (x * OSTROSC) / cam.zoomX + cam.worldView.x, y: (y * OSTROSC) / cam.zoomY + cam.worldView.y, r: (22 * OSTROSC) / cam.zoomX };
    };
    mapaWalki.fn = (x, y) => {
      // The finger's area: 22 CSS px around the tap (44 px across).
      const w = naSwiat(x, y);
      this.walka?.tap(w.x, w.y, w.r);
    };
    // Dragging the hero onto a spot = a move (owner, 18 Oct 2026).
    mapaWalki.drag = (x0, y0, x, y, koniec) => {
      const a = naSwiat(x0, y0), b = naSwiat(x, y);
      this.walka?.przeciagnij(a.x, a.y, b.x, b.y, koniec, a.r);
    };
    this.walka = new TuryWalki({
      scene: this,
      player: this.player,
      wolne: (x, y) => this.freeFeet(x, y + FEET.dy),
      widac: (ax, ay, bx, by) => {
        const d = Math.hypot(bx - ax, by - ay);
        for (let t = 3; t < d; t += 3) if (this.city.buildingAt(ax + ((bx - ax) * t) / d, ay + ((by - ay) * t) / d) !== undefined) return false;
        return true;
      },
      zabity: (e) => this.onEnemyKilled(e as Enemy),
      cwiczenie: (skill, pkt) => this.practiced(skill, pkt),
      zuzyj: (id) => this.wearWeapon(id),
      hud: () => this.emitHud(),
      toast: (t, ms) => this.toast(t, ms),
      lecz: () => {
        const hp = this.player.hp, extra = this.player.extra;
        this.healButton();
        return this.player.hp > hp || this.player.extra > extra;
      },
      ranBohatera: (e, dmg) => {
        const q = e as Enemy;
        if (q.duel) {
          // A duel takes the purple hearts, never the real ones.
          const pending = this.duelCarry + q.duel.dmg;
          const whole = Math.floor(pending);
          this.duelCarry = pending - whole;
          this.duelHp = Math.max(0, (this.duelHp ?? 0) - whole);
          this.emitHud();
          if (this.duelHp > 0) return false;
          this.endDuel(q, false);
          return true;
        }
        // The QR demo's dream fight: the hero lives through whatever the dragon does (owner, 19 Oct 2026).
        if (this.demoRun && demo.phase === 'smok') dmg = Math.min(dmg, Math.max(0, this.player.hp - 1));
        this.player.drain(dmg);
        this.emitHud();
        return this.player.hp <= 0;
      },
      koniec: (wynik, kto) => this.koniecWalki(wynik, kto as Enemy[]),
      pudlo: (x, y) => this.missText(x, y),
      napis: (x, y, t, c, ms) => this.floatText(x, y, t, c, ms),
      zamach: (aim, strong) => this.swingWeapon(aim, strong),
      wzmocnienie: (e) => this.essenceBoost(imbueOf(gear.equip.bron)?.e, e as Enemy),
      nasycenie: (e, now) => this.essenceHit(imbueOf(gear.equip.bron)?.e, e as Enemy, now),
      zoomZwykly: () => {
        const short = Math.min(this.scale.width, this.scale.height) / OSTROSC;
        const z = Math.max(2, Math.floor(short / 176)) * OSTROSC;
        return zoomZPrzyblizeniem(z);
      },
      wrocKamere: () => {
        const cam = this.cameras.main;
        cam.pan(this.player.x, this.player.y, 300, 'Sine.easeInOut', false, (_c: Phaser.Cameras.Scene2D.Camera, t: number) => {
          if (t >= 1) cam.startFollow(this.player, true, 0.15, 0.15);
        });
        this.fitZoom();
      },
      poziom: () => poziomPostaci(session.exp),
      wyspany: () => (session.flagi.wyspany ?? 0) > Date.now(),
      trafiony: (e, hp0) => {
        const q = e as Enemy;
        const co = this.demoRun?.isDragon(q) ? this.demoRun.trafiony(q, hp0) : false;
        if (co !== true) return co;
        // The demo's dragon flies off after its last hit: out of the fight and the map.
        this.enemies = this.enemies.filter((x) => x !== q);
        this.time.delayedCall(450, () => this.demoRun?.onDragonKilled(q, true));
        return true;
      },
      krok: (co) => this.demoRun?.krokWalki(co),
      pewnyAtak: (e) => !!this.demoRun?.isDragon(e as Enemy),
    }, kto);
    this.emitHud();
  }

  /** Every frame of a turn fight: only the fight and the world's drawing. */
  private updateWalka(now: number, dt: number) {
    // Swings, shots and heals pressed meanwhile never wait for after the fight.
    consumeAttack();
    consumeRelease();
    consumeHeal();
    this.walka!.update();
    this.player.setDepth(this.player.y + NAD_KORONAMI);
    this.updateFog();
    this.weatherFx.update(dt, this.cameras.main, this.player, now, this.fogView.daylight);
    this.animateCrops(now);
    this.cullFar(now);
    this.updatePosts(now);
    this.zabytki.update(this.player.x, this.player.y);
    this.hudTimer -= dt * 1000;
    if (this.hudTimer <= 0) {
      this.hudTimer = 400;
      this.emitHud();
    }
  }

  private koniecWalki(wynik: WynikWalki, kto: Enemy[]) {
    this.walka = null;
    this.demoRun?.poWalce(wynik);
    mapaWalki.fn = null;
    mapaWalki.drag = null;
    resetTouch();
    resetKeys();
    this.talkReadyAt = performance.now() + TALK_PAUSE_MS;
    this.noHurtUntil = this.time.now + 1500;
    if (wynik === 'wygrana') {
      // After a won fight the hero rests a moment: full life back (owner, 17 Oct 2026).
      if (!this.player.isDead) this.player.hp = PLAYER.maxHp;
      this.damageCarry = 0;
      this.toast(`🏆 ${SPOTKANIA.wygrana}`, 2600);
    } else if (wynik === 'ucieczka') {
      this.spotkania?.uniknij(kto.filter((e) => e.active && !e.isDead));
    } else if (wynik === 'smierc') {
      this.onPlayerDeath();
    }
    this.emitHud();
  }

  /**
   * What a beaten enemy leaves: a coin or (sometimes) a heart. Dryads leave no
   * gold, only hearts and fruit; skeletons no hearts but 2–3 coins.
   */
  /** Loot rolled from the admin panel's table (each row on its own): gold and goods fall on the ground, the rest goes to the bag. */
  private lupZPanelu(x: number, y: number, lup: { co: string; ile: number }[]) {
    const notki: string[] = [];
    let rzut = 0;
    const obok = () => {
      const a = (rzut++ * 2.4) % (Math.PI * 2);
      return { x: x + Math.cos(a) * (6 + rzut * 2), y: y + Math.sin(a) * (4 + rzut) };
    };
    for (const { co, ile } of lup) {
      if (co === 'zloto') {
        const n = luckyCoins(ile);
        const kupki = Math.min(5, n);
        let left = n;
        for (let i = 0; i < kupki; i++) {
          const k = i === kupki - 1 ? left : Math.max(1, Math.round(left / (kupki - i)));
          left -= k;
          const at = obok();
          this.dropPickup(at.x, at.y, false, k);
        }
      } else if (co === 'diament') {
        session.diamenty += ile;
        notki.push(`💎 ${ile}`);
      } else if (co === 'mikstura') {
        session.mikstury += ile;
        notki.push(`🧪 ${ile}`);
      } else if (co === 'serce') {
        for (let i = 0; i < Math.min(ile, 6); i++) {
          const at = obok();
          this.dropPickup(at.x, at.y, true);
        }
      } else if (co in OWOCE) {
        const f = co as Owoc;
        for (let i = 0; i < ile; i++) {
          if (i < 8) this.dropFruit(x, y, f);
          else if (!addFruit(f)) break;
        }
      } else if (co in AMUNICJA) {
        addAmmo(co as Amunicja, ile);
        notki.push(`${AMUNICJA[co as Amunicja].ikona} +${ile}`);
      } else {
        const it = PRZEDMIOTY.find((p) => p.id === co);
        if (!it) continue;
        for (let i = 0; i < ile; i++) {
          if (!addItem(co)) {
            notki.push(`${it.nazwa} (plecak pełny!)`);
            break;
          }
          if (i === 0) notki.push(`✨ ${it.nazwa}${ile > 1 ? ` ×${ile}` : ''}`);
        }
      }
    }
    if (notki.length) this.toast(`Łup: ${notki.join(', ')}`, 2800);
    this.gearChanged();
  }

  private dropLoot(x: number, y: number, kind: RodzajWroga = 'glut') {
    if (kind === 'herszt' || kind === 'wielki_herszt' || kind === 'koziol' || kind === 'upior') return this.dropBossLoot(x, y);
    if (kind === 'driada') {
      if (this.player.hp < PLAYER.maxHp && Math.random() < 0.5) this.dropPickup(x, y, true);
      else this.dropFruit(x, y + 6, Math.random() < 0.5 ? 'jablko' : 'sliwka');
      return;
    }
    if (kind === 'szkielet') {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) this.dropPickup(x + (i - (n - 1) / 2) * 6, y + (i % 2) * 3, false);
      return;
    }
    this.dropPickup(x, y, Math.random() < HEART_DROP_CHANCE && this.player.hp < PLAYER.maxHp);
  }

  /**
   * The coachmen's carts (content/swiat.ts WOZY): loaded in the background after the start,
   * one per station (load and horse colour by the station's id); until they arrive, the drawn cart sign.
   */
  /**
   * Where a station's cart and coachman stand: at its door, or – when the door lies in a building
   * (world maps put the station inside it; the owner saw the coachman on a roof) – the nearest spot
   * with no building under the cart and coachman. Rails don't count, carts stand by the platforms.
   */
  private cartSpot(p: CityPlace) {
    const clear = (x: number, y: number) => [[-44, 0], [-12, -9], [21, 0], [28, 1], [-12, 4]].every(([dx, dy]) => !this.city.buildingAt(x + dx, y + dy));
    for (let r = 0; r <= 80; r += 4) {
      for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]]) {
        if (clear(p.door.x + dx * r, p.door.y + dy * r)) return { x: p.door.x + dx * r, y: p.door.y + dy * r };
        if (!r) break;
      }
    }
    return p.door;
  }

  /** Merchant stalls by the roundabout: where each stands and whose shop it opens (a swing on any of them). */
  private stalls: { x: number; y: number; p: CityPlace }[] = [];

  /**
   * The travelling merchant (09 look, owner 7 Oct 2026: „zamień stragan bez ikonki na losowy”): instead of the cart sign
   * 1–5 market stalls in one loose group by the place's door, each in its own colours (targ09 `straganObraz`), fixed by
   * the place id; every one of them opens the same shop. The trade point keeps its golden glow on the middle stall.
   */
  private merchantStalls(p: CityPlace) {
    // Free spots can be judged only once the tiles there are in (unloaded ground counts as blocked): wait for them.
    const d = p.door;
    if (!this.city.ready({ x0: d.x - 60, y0: d.y - 60, x1: d.x + 60, y1: d.y + 60 })) {
      this.time.delayedCall(2000, () => this.merchantStalls(p));
      return;
    }
    let h = 2166136261;
    for (let i = 0; i < p.id.length; i++) h = Math.imul(h ^ p.id.charCodeAt(i), 16777619);
    const los = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>> 0) % 10000) / 10000; };
    const ile = 1 + Math.floor(los() * 5);
    const miejsca = [[0, 0], [-17, 3], [17, 3], [-9, -13], [9, -13], [0, 16], [-26, -9], [26, -9]];
    const at = this.signSpot(p);
    let postawione = 0;
    for (const [dx, dy] of miejsca) {
      if (postawione >= ile) break;
      const x = at.x + dx + Math.round((los() - 0.5) * 4), y = at.y + dy + Math.round((los() - 0.5) * 3);
      if (this.city.isBlocked(x - 7, y) || this.city.isBlocked(x + 7, y) || this.city.isBlocked(x, y - 10)) continue;
      const seed = Math.floor(los() * 1e6);
      const key = `stragan-${seed % 40}`;
      if (!this.textures.exists(key)) {
        const { o } = straganObraz((seed % 40) * 37 + 11); // 40 looks: awning colours and goods from the seed
        const t = this.textures.createCanvas(key, o.w, o.h)!;
        t.getContext().putImageData(new ImageData(new Uint8ClampedArray(o.px.buffer as ArrayBuffer, o.px.byteOffset, o.px.byteLength).slice(), o.w, o.h), 0, 0);
        t.refresh();
        t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      // Generator px: 2 per map px; the table's foot (17, 29) on the spot.
      const img = this.add.image(x, y, key).setOrigin(17 / 34, 29 / 32).setScale(0.5).setDepth(y).setFlipX(los() < 0.5);
      this.farObjects.push(img);
      if (postawione === 0) this.farObjects.push(this.signGlow(img));
      this.stalls.push({ x, y: y - 5, p });
      postawione++;
    }
    if (!postawione) {
      const img = this.add.image(at.x, at.y, TEX.cart).setDepth(900_000);
      this.farObjects.push(img, this.signGlow(img));
    }
  }

  /** The stall under a swing / click / next to the hero, if any. */
  private stallAt(x: number, y: number, r: number) {
    let best: CityPlace | null = null, d = r;
    for (const st of this.stalls) { const e = Math.hypot(st.x - x, st.y - y); if (e < d) { d = e; best = st.p; } }
    return best;
  }

  /**
   * The glow by a sign with no lamp of its own (wall signs, market stalls, the port's board). The lamp's light cone
   * (SNOP_SZYLDU) belongs only to signs on posts: under these it shone out of nothing – „dziwny trójkąt” (owner,
   * 13 Oct 2026). Until the artist draws their own lights (order 37-P001) they keep the soft halo from production.
   */
  private signGlow(sign: Phaser.GameObjects.Image) {
    const glow = this.oldSignGlow(sign);
    glow.setData('bezLampy', true);
    return glow;
  }

  /** The old soft golden glow behind a sign (production until the artist's sign light, owner 12 Oct 2026). */
  private oldSignGlow(sign: Phaser.GameObjects.Image) {
    const P = POSWIATA_SZYLDU;
    const key = 'sign-glow';
    if (!this.textures.exists(key)) {
      const n = 64;
      const tex = this.textures.createCanvas(key, n, n)!;
      const ctx = tex.getContext();
      const [r, g, b] = P.kolor;
      const grd = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},0.7)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, n, n);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const glow = this.add.image(sign.x, sign.y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(sign.depth - 1);
    glow.setDisplaySize(P.promien * 2.2, P.promien * 1.7).setAlpha(P.mocno);
    glow.setData('faza', Math.random() * 10_000);
    this.signGlows.add(glow);
    return glow;
  }

  /**
   * A soft cone of warm light from a lamp at (x, top) down to the ground at `ground`, ending in a pool (ADD).
   * Its alpha (day/night, the odd flicker) is set every frame for the ones on screen (cullFar / updatePosts).
   */
  private snop(x: number, top: number, ground: number, depth: number) {
    const S = SNOP_SZYLDU;
    const key = 'snop-swiatla';
    if (!this.textures.exists(key)) {
      const w = 48, h = 64;
      const tex = this.textures.createCanvas(key, w, h)!;
      const ctx = tex.getContext();
      const img = ctx.createImageData(w, h);
      const [r, g, b] = S.kolor;
      const pool = 0.82; // where the cone meets the ground (share of the height)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = y / h, cx = Math.abs(x + 0.5 - w / 2);
        // The cone: narrow at the lamp, wide on the ground, soft edges, brighter near the lamp and on the ground.
        const half = 2 + (w / 2 - 6) * Math.min(1, v / pool);
        const edge = Math.max(0, 1 - cx / half);
        let a = Math.pow(edge, 1.6) * (0.55 + 0.25 * (1 - v)) * (v > pool ? Math.max(0, 1 - (v - pool) / (1 - pool)) : 1);
        // The pool of light on the ground: a flat ellipse.
        const ex = cx / (w / 2 - 2), ey = (v - pool) / 0.16;
        const e = 1 - (ex * ex + ey * ey);
        if (e > 0) a = Math.max(a, 0.75 * Math.pow(e, 1.3));
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = Math.round(255 * Math.min(1, a));
      }
      ctx.putImageData(img, 0, 0);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    let glow: Phaser.GameObjects.Image;
    if (this.textures.exists('snop-szyldu')) {
      // The artist's cone (36-G002): the lamp at its top anchor, the pool's middle on the ground.
      const F = S.plik;
      const size = (Math.max(8, ground - top) * F.rozmiar) / (F.ziemiaY - F.lampaY);
      glow = this.add.image(x, top, 'snop-szyldu').setOrigin(0.5, F.lampaY / F.rozmiar).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
      glow.setDisplaySize(size, size);
    } else {
      const length = Math.max(8, ground - top) / 0.82;
      glow = this.add.image(x, top, key).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
      glow.setDisplaySize(S.szer, length);
    }
    glow.setAlpha(S.dzien);
    const [lo, hi] = S.mrugCoMs;
    const [dlo, dhi] = S.dzienRytm.coMs;
    glow.setData('faza', Math.random() * 100_000).setData('okres', lo + Math.random() * (hi - lo)).setData('dzien', dlo + Math.random() * (dhi - dlo));
    return glow;
  }

  /**
   * 1, or – for a short while every few seconds (each lamp its own rhythm) – a stutter of a short circuit /
   * an overloaded line: off and on a few times, now and then dimmed.
   */
  private flicker(now: number, o: Phaser.GameObjects.Image) {
    const okres = o.getData('okres') as number, t = (now + (o.getData('faza') as number)) % okres;
    if (t > SNOP_SZYLDU.mrugMs) return 1;
    const krok = Math.floor(t / 55), seed = Math.floor((now + (o.getData('faza') as number)) / okres);
    const h = Math.sin(krok * 12.9898 + seed * 78.233) * 43758.5453;
    const x = h - Math.floor(h);
    return x < 0.45 ? 0.08 : x < 0.65 ? 0.45 : 1;
  }

  /**
   * How bright a sign's light is now (ADD alpha). Night: the accepted look with the odd short-circuit stutter.
   * Day (36-G002): every 2–3 s a double blink – flash, dim, flash – then the quiet base, each place its own rhythm.
   */
  private lightAlpha(now: number, o: Phaser.GameObjects.Image) {
    const S = SNOP_SZYLDU;
    if (this.postsNight) return MNIEJ_RUCHU ? S.noc : S.noc * this.flicker(now, o);
    const D = S.dzienRytm;
    if (MNIEJ_RUCHU) return D.baza;
    const t = (now + (o.getData('faza') as number)) % (o.getData('dzien') as number);
    return t < D.blyskMs ? D.blysk : t < D.blyskMs + D.przygasMs ? D.przygas : t < 2 * D.blyskMs + D.przygasMs ? D.blysk : D.baza;
  }

  /**
   * G14 (overhaul 09): a cast-iron post right by the door (on the ground in front of the wall, the board never over the door)
   * with the board of its kind of place, two kinds by the place's id: the board under a crossbar, or on chains from an arm
   * that points away from the door and sways a little. The lamp on top is lit at night (`updatePosts`). Null = old wall sign.
   */
  private signPost(p: CityPlace): Phaser.GameObjects.Image[] | null {
    const S = SLUPY_SZYLDOW;
    const t = S.tablice[p.kind] ?? (p.kind === 'maker' || p.kind === 'workshop' ? 'sklep' : undefined);
    if (!WYGLAD_09 || !t || !this.textures.exists(`tablica-${t}`) || !this.textures.exists('szyld-slup-ramie')) return null;
    const at = this.postSpot(p);
    let h = 0;
    for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) | 0;
    const arm = (h & 1) === 1;
    // Frames are in picture px (2 per map px): the post's foot is row 38, its axis column 5.5 (board post) / 6 (arm post).
    const K = 0.5;
    const flip = arm && at.x < p.door.x; // the arm points away from the door
    const post = this.add.image(at.x, at.y, arm ? 'szyld-slup-ramie' : 'szyld-slup-tablica', 0)
      .setOrigin(arm ? (flip ? 22 / 28 : 6 / 28) : 5.5 / 12, 39 / 40).setScale(K).setFlipX(flip).setDepth(at.y);
    const top = at.y - 39 * K;
    const bx = arm ? at.x + (flip ? -1 : 1) * 12 * K : at.x;
    // The shop's board has the artist's three swing frames (36-G002); the others swing by code (updatePosts).
    const B = SNOP_SZYLDU.bujanie;
    const frames = SNOP && t === 'sklep' && this.textures.exists('tablica-sklep-bujanie');
    const by = top + (arm ? 16 : 12) * K;
    const board = frames
      ? this.add.image(Math.round(bx * 2) / 2, by, 'tablica-sklep-bujanie', 1).setOrigin(0.5, B.zaczepY / 32).setScale((K * 22) / B.szerRysunku).setDepth(at.y + 0.5)
      : this.add.image(Math.round(bx * 2) / 2, by, `tablica-${t}`).setOrigin(0.5, 0).setScale(K).setDepth(at.y + 0.5);
    if (frames) this.textures.get('tablica-sklep-bujanie').setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const k of ['szyld-slup-ramie', 'szyld-slup-tablica', `tablica-${t}`]) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
    // A small shadow at the foot, to the bottom right.
    if (!this.textures.exists('cien-slupa')) {
      const c = this.textures.createCanvas('cien-slupa', 10, 5)!;
      const g = c.getContext();
      g.fillStyle = 'rgba(20,16,24,0.35)';
      g.beginPath();
      g.ellipse(5, 2.5, 5, 2.5, 0, 0, Math.PI * 2);
      g.fill();
      c.refresh();
    }
    const shadow = this.add.image(at.x + 2, at.y - 0.5, 'cien-slupa').setDepth(at.y - 1);
    const lampX = at.x + (arm ? (flip ? -0.5 : 0.5) : 0) * K, lampY = top + 5 * K;
    const lamp = this.add.image(lampX, lampY, 'sign-glow-lamp').setBlendMode(Phaser.BlendModes.ADD).setDepth(at.y + 1).setVisible(false);
    // The light: a cone from the lamp down to the pavement (SNOP_SZYLDU), day and night, with the odd flicker.
    this.lampGlowTexture();
    const pool = SNOP
      ? this.snop(lampX, lampY, at.y + 3, at.y + 0.7).setVisible(false) // over the board: the lamp lights it
      : this.add.image(at.x, at.y + 1, 'sign-glow-lamp').setBlendMode(Phaser.BlendModes.ADD).setDepth(at.y - 2).setVisible(false)
        .setDisplaySize(S.lampa.promien * 3.4, S.lampa.promien * 1.4).setAlpha(S.lampa.plama);
    lamp.setDisplaySize(S.lampa.promien * 2, S.lampa.promien * 2).setAlpha(S.lampa.mocno);
    this.posts.push({ post, board: SNOP || arm ? board : null, frames, scale: board.scale, lamp, pool, phase: (h >>> 3) % 6283 });
    return [post, board, shadow]; // the lamp and its pool are shown by updatePosts (night, post on screen)
  }

  private zabytki!: Zabytki;
  private posts: { post: Phaser.GameObjects.Image; board: Phaser.GameObjects.Image | null; frames: boolean; scale: number; lamp: Phaser.GameObjects.Image; pool: Phaser.GameObjects.Image; phase: number }[] = [];
  private postsNight: boolean | null = null;
  private postsNightAt = 0;

  private lampGlowTexture() {
    if (this.textures.exists('sign-glow-lamp')) return;
    const n = 32;
    const tex = this.textures.createCanvas('sign-glow-lamp', n, n)!;
    const ctx = tex.getContext();
    const grd = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grd.addColorStop(0, 'rgba(255,214,130,1)');
    grd.addColorStop(0.45, 'rgba(255,190,90,0.55)');
    grd.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, n, n);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  /** Night lamps on the sign posts (checked every 2 s) and the boards on arms swaying, only for those on screen. */
  private updatePosts(now: number) {
    if (now - this.postsNightAt > 2000 || this.postsNight === null) {
      this.postsNightAt = now;
      const night = isNight();
      if (night !== this.postsNight) {
        this.postsNight = night;
        for (const q of this.posts) q.post.setFrame(night ? 1 : 0);
      }
    }
    const night = !!this.postsNight;
    for (const q of this.posts) {
      if (!q.post.visible) {
        if (q.lamp.visible) q.lamp.setVisible(false);
        if (q.pool.visible) q.pool.setVisible(false);
        continue;
      }
      if (!SNOP) {
        // Production: the old lamp and its pool, at night only.
        if (q.lamp.visible !== night) q.lamp.setVisible(night);
        if (q.pool.visible !== night) q.pool.setVisible(night);
      } else {
        const a = this.lightAlpha(now, q.pool);
        if (!q.pool.visible) q.pool.setVisible(true);
        q.pool.setAlpha(a);
        // The lamp itself: lit at night, and by day it flashes with the blink (the source is seen, not just the pool).
        const lit = night || a > SNOP_SZYLDU.dzienRytm.baza + 0.01;
        if (q.lamp.visible !== lit) q.lamp.setVisible(lit);
        if (lit) q.lamp.setAlpha(night ? SLUPY_SZYLDOW.lampa.mocno * (a / SNOP_SZYLDU.noc) : SLUPY_SZYLDOW.lampa.mocno * a);
        if (q.board) this.swingBoard(q, now);
        continue;
      }
      if (q.board) q.board.setAngle(SLUPY_SZYLDOW.kolysanie * Math.sin(now / 1100 + q.phase));
    }
  }

  /**
   * The board swings forward and back on its hooks (36-G002): middle 400 ms → front 220 → middle 400 → back 220,
   * each post its own phase. The shop's board has the artist's frames; the others lean by code (scale + shade).
   */
  private swingBoard(q: { board: Phaser.GameObjects.Image | null; frames: boolean; scale: number; phase: number }, now: number) {
    const b = q.board!;
    const B = SNOP_SZYLDU.bujanie;
    let k = 1;
    if (!MNIEJ_RUCHU) {
      const cykl = B.kroki.reduce((s, [, ms]) => s + ms, 0);
      let t = (now + q.phase * 7) % cykl;
      for (const [f, ms] of B.kroki) {
        if (t < ms) { k = f; break; }
        t -= ms;
      }
    }
    if (b.getData('k') === k) return;
    b.setData('k', k);
    if (q.frames) {
      b.setFrame(k);
      return;
    }
    const w = k === 0 ? B.przod : k === 2 ? B.tyl : { sx: 1, sy: 1, kolor: 0xffffff };
    b.setScale(q.scale * w.sx, q.scale * w.sy).setTint(w.kolor);
  }

  /**
   * Where a sign post stands: on the ground in front of the door's wall, a few metres along it to one side
   * (SLUPY_SZYLDOW.odDrzwiM, the first spot that isn't in a building or water); without a building just beside the door.
   */
  private postSpot(p: CityPlace): { x: number; y: number } {
    const r = p.building?.rings[0];
    const d = p.door;
    if (!r || r.length < 6) return { x: d.x + 6, y: d.y };
    let best = Infinity, ux = 1, uy = 0, nx = 0, ny = 1;
    let area = 0;
    for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; area += r[i] * r[j + 1] - r[j] * r[i + 1]; }
    const out = area > 0 ? 1 : -1;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      const ax = r[i], ay = r[i + 1], dx = r[j] - ax, dy = r[j + 1] - ay;
      const L = Math.hypot(dx, dy) || 1;
      const tt = Math.max(0, Math.min(1, ((d.x - ax) * dx + (d.y - ay) * dy) / (L * L)));
      const dd = Math.hypot(ax + dx * tt - d.x, ay + dy * tt - d.y);
      if (dd < best) [best, ux, uy, nx, ny] = [dd, dx / L, dy / L, (out * dy) / L, (-out * dx) / L];
    }
    const S = SLUPY_SZYLDOW;
    for (const m of S.odDrzwiM) for (const side of [1, -1]) {
      const x = d.x + ux * side * m * PX_PER_M + nx * S.odSciany, y = d.y + uy * side * m * PX_PER_M + ny * S.odSciany;
      if (!this.city.isBlocked(x, y) && !this.city.isBlocked(x, y - 2)) return { x, y };
    }
    return { x: d.x + nx * S.odSciany + 5, y: d.y + ny * S.odSciany };
  }

  /** Place signs, their glows and signposts of the whole map (report 56: ~2000 of them were drawn every frame). */
  private farObjects: Phaser.GameObjects.Image[] = [];
  private signGlows = new Set<Phaser.GameObjects.Image>();

  /** Shows only the far objects near the screen and pulses the visible sign glows. */
  private cullFar(now: number) {
    const v = this.cameras.main.worldView;
    const m = 40;
    for (const o of this.farObjects) {
      if (!o.active) continue;
      const on = o.x > v.x - m && o.x < v.right + m && o.y > v.y - m && o.y < v.bottom + m * 2;
      if (on !== o.visible) o.setVisible(on);
      if (on && this.signGlows.has(o)) {
        if (SNOP && !o.getData('bezLampy')) o.setAlpha(this.lightAlpha(now, o));
        else if (POSWIATA_SZYLDU.pulsMs) o.setAlpha(POSWIATA_SZYLDU.mocno * (0.875 + 0.125 * Math.sin(((now + (o.getData('faza') as number)) / POSWIATA_SZYLDU.pulsMs) * Math.PI)));
      }
    }
  }

  private pociagi?: Pociagi;
  private anomalia?: Anomalia;
  /** Where the last mouse click landed in the world (null for taps and keys). */
  private clickWorld: { x: number; y: number } | null = null;

  /**
   * Overhaul 09: a steam train on the track at railway stations, the horse cart only at bus stations
   * (SPEC_09 point 7). Waits until the tiles around the station are in to tell which it is.
   */
  private stationVehicles(p: CityPlace, tries = 0) {
    if (!WYGLAD_09) return this.placeCarts([p]);
    const tor = torStacji(this.city, p);
    if (tor === undefined) {
      if (tries < 40) this.time.delayedCall(800, () => this.stationVehicles(p, tries + 1));
      else this.placeCarts([p]);
      return;
    }
    if (!tor) return this.placeCarts([p]);
    (this.pociagi ??= new Pociagi(this, this.mapView)).postaw(p, tor);
  }

  /** Horse carts at bus stations: a swing/click on one (or standing by it) opens its coachman, like trains. */
  private wozy: { img: Phaser.GameObjects.Image; p: CityPlace }[] = [];

  private cartAt(x: number, y: number, pad = 0): CityPlace | null {
    for (const w of this.wozy) {
      if (!w.img.active) continue;
      const b = w.img.getBounds();
      if (x >= b.x - pad && x <= b.right + pad && y >= b.y - pad && y <= b.bottom + pad) return w.p;
    }
    return null;
  }

  private placeCarts(stations: CityPlace[]) {
    const W = WOZY;
    const file = (p: CityPlace) => {
      let h = 0;
      for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
      return `woz_konny_${W.ladunki[h % W.ladunki.length]}_${W.masci[(h >>> 4) % W.masci.length]}`;
    };
    const signs = stations.map((p) => this.add.image(p.door.x, p.door.y - 10, TEX.coach).setDepth(900_000));
    const put = () => {
      stations.forEach((p, i) => {
        const key = `swiat-${file(p)}`;
        if (!this.textures.exists(key)) return;
        signs[i].destroy();
        const tex = this.textures.get(key);
        if (!tex.has('f0')) {
          const src = tex.getSourceImage() as HTMLImageElement;
          tex.add('f0', 0, 0, 0, src.width / 2, src.height);
          tex.add('f1', 0, src.width / 2, 0, src.width / 2, src.height);
          // Lined up with the world (scripts/wyrownaj-wozy.py): sharp pixels, no smoothing.
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        const at = this.cartSpot(p);
        const img = this.add.image(at.x - 10, at.y + 2, key, 'f0').setOrigin(0.5, 0.92);
        img.setScale(W.wysokosc / img.height).setDepth(at.y + 2);
        this.wozy = this.wozy.filter((w) => w.img.active);
        this.wozy.push({ img, p });
        const swap = () => {
          if (!img.active) return;
          img.setFrame(img.frame.name === 'f0' ? 'f1' : 'f0');
          this.time.delayedCall(W.klatkaMs[0] + Math.random() * (W.klatkaMs[1] - W.klatkaMs[0]), swap);
        };
        this.time.delayedCall(Math.random() * W.klatkaMs[1], swap);
      });
    };
    const want = [...new Set(stations.map(file))].filter((f) => !this.textures.exists(`swiat-${f}`));
    if (!want.length) return put();
    for (const f of want) this.load.image(`swiat-${f}`, `swiat/konie_test26/${f}.png`);
    this.load.once('complete', put);
    this.load.start();
  }

  private weatherFx!: WeatherFx;
  private magicG!: Phaser.GameObjects.Graphics;
  private weatherShown = '';

  /** The real weather where the hero is: asks the server now and then, re-reads the hour every minute. */
  private watchWeather() {
    const ask = () => {
      const ll = this.city.toLatLon(this.player?.x ?? 0, this.player?.y ?? 0);
      void loadWeather(ll.lat, ll.lon).then(() => this.onWeather());
    };
    this.time.delayedCall(300, ask);
    this.time.addEvent({ delay: 60_000, loop: true, callback: () => { ask(); if (tickWeather()) this.onWeather(); } });
  }

  private onWeather() {
    tickWeather();
    const k = weather.kind;
    if (this.weatherShown && this.weatherShown !== k) {
      const o = POGODA.opis[k];
      this.toast(`${o.ikona} Pogoda się zmienia: ${o.nazwa}.`, 2500);
    }
    if (this.weatherShown !== k) this.folk.rethink();
    this.weatherShown = k;
    this.emitHud();
  }

  /** A wodnik (rain): keeps his distance, conjures blobs a few metres from the hero (at most WODNIK.maksBlobow), then stands and casts. */
  private wodnikThink(s: Enemy, now: number) {
    const W = WODNIK;
    const dx = this.player.x - s.x, dy = this.player.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    if (!s.chasing && d < s.kind.sightRange) s.chasing = true;
    if (s.chasing && d > s.kind.loseRange) s.chasing = false;
    if (!s.chasing || s.isDazed(now)) return s.think(new Phaser.Math.Vector2(this.player.x, this.player.y), now);
    const keep = W.dystansM * PX_PER_M;
    const sp = s.kind.chaseSpeed * PREDKOSC_WROGOW * Slime.tempo;
    if (d < keep * 0.8) s.vel.set((-dx / d) * sp, (-dy / d) * sp);
    else if (d > keep * 1.6) s.vel.set((dx / d) * sp * 0.6, (dy / d) * sp * 0.6);
    else s.vel.set(0, 0);
    s.minions = new Set([...(s.minions ?? [])].filter((m) => m.active && !m.isDead));
    if (s.minions.size >= W.maksBlobow || now < (s.nextSummon ?? 0) || this.player.isDead) return;
    s.nextSummon = now + W.przerwaMs;
    for (let t = 0; t < 8; t++) {
      const a = Math.random() * Math.PI * 2;
      const r = (W.blobOdBohateraM[0] + Math.random() * (W.blobOdBohateraM[1] - W.blobOdBohateraM[0])) * PX_PER_M;
      const x = this.player.x + Math.cos(a) * r, y = this.player.y + Math.sin(a) * r;
      if (!this.city.isFree(x, y, 3, 3)) continue;
      const b = this.spawnEnemy(x, y, undefined, 'blob');
      b.temp = true;
      b.owner = s;
      b.chasing = true;
      s.minions.add(b);
      // A splash where it rises from the puddle.
      const ring = this.add.circle(x, y + 2, 2, W.kolorMagii, 0.6).setDepth(y);
      this.tweens.add({ targets: ring, radius: 9, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      break;
    }
  }

  /** The threads of a wodnik's magic to the blobs he keeps alive. */
  private drawMagic(now: number) {
    const g = this.magicG.clear();
    for (const s of this.enemies) {
      if (!s.minions?.size || s.isDead || !s.visible) continue;
      for (const m of s.minions) {
        if (!m.active || m.isDead) continue;
        g.lineStyle(1, WODNIK.kolorMagii, 0.3 + 0.25 * Math.sin(now / 120 + m.x));
        g.lineBetween(s.x, s.y - 8, m.x, m.y - 3);
      }
    }
  }

  /** A conjured blob melts away (its wodnik is gone): no reward. */
  private dissolve(m: Enemy) {
    if (!m.active || m.isDead) return;
    m.hp = 0;
    this.enemies = this.enemies.filter((e) => e !== m);
    this.tweens.add({ targets: m, alpha: 0, scaleY: m.scaleY * 0.3, duration: 350, onComplete: () => m.destroy() });
  }

  /**
   * Where a place's sign hangs: on its building's wall nearest the door (bug report 10: signs hung over the
   * street when the door had to be moved out onto the road) – on the front wall when that one faces the viewer.
   */
  private signSpot(p: CityPlace): { x: number; y: number } {
    const r = p.building?.rings[0];
    if (!r || r.length < 6) return { x: p.door.x, y: p.door.y - 10 };
    let best = Infinity, bx = p.door.x, by = p.door.y, south = false;
    let area = 0;
    for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; area += r[i] * r[j + 1] - r[j] * r[i + 1]; }
    const out = area > 0 ? 1 : -1;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      const ax = r[i], ay = r[i + 1], dx = r[j] - ax, dy = r[j + 1] - ay;
      const L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0.15, Math.min(0.85, ((p.door.x - ax) * dx + (p.door.y - ay) * dy) / L2));
      const x = ax + dx * t, y = ay + dy * t;
      const d = Math.hypot(x - p.door.x, y - p.door.y);
      if (d < best) [best, bx, by, south] = [d, x, y, out * -dx > 0.3 * Math.sqrt(L2)];
    }
    const h = wallHeight(p.building!);
    // Overhaul 09: walls stand on the outline (roof jutting out north), so the front wall's middle is above the edge.
    if (WALLS_UP) return south ? { x: bx - h * 0.5 * WALL_SKEW, y: by - h * 0.5 } : { x: bx - h * WALL_SKEW, y: by - h - 4 };
    return south ? { x: bx + h * 0.5 * WALL_SKEW, y: by + h * 0.5 } : { x: bx, y: by - 6 };
  }

  /** A gang boss spills coins (in a few piles) and fruit on the ground (content/gangi.ts LUP_HERSZTA). */
  private dropBossLoot(x: number, y: number) {
    const L = LUP_HERSZTA;
    const roll = ([a, b]: [number, number]) => a + Math.floor(Math.random() * (b - a + 1));
    let coins = roll(L.monety);
    const piles = Math.min(6, coins);
    for (let i = 0; i < piles; i++) {
      const n = i === piles - 1 ? coins : Math.max(1, Math.round(coins / (piles - i)));
      coins -= n;
      const a = (i / piles) * Math.PI * 2;
      this.dropPickup(x + Math.cos(a) * 9, y + Math.sin(a) * 6, false, n);
    }
    const fruit = roll(L.owoce);
    for (let i = 0; i < fruit; i++) this.dropFruit(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 12, Math.random() < 0.6 ? 'jablko' : 'sliwka');
  }

  private dropPickup(x: number, y: number, heart: boolean, coins = 1) {
    const item = this.add.image(x, y, heart ? TEX.pickupHeart : TEX.coin).setDepth(y - 8);
    item.setData('kind', heart ? 'heart' : 'coin');
    item.setData('n', coins);
    if (coins > 1) item.setScale(1.3);
    this.pickups.push(item);
    this.tweens.add({ targets: item, y: y - 3, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.delayedCall(15000, () => {
      if (!item.active) return;
      this.tweens.add({ targets: item, alpha: 0, duration: 300, onComplete: () => this.removePickup(item) });
    });
  }

  /** Until when the hero walks slower after picking a vegetable. */
  private cropSlowUntil = 0;
  /** Góry v2 camera filter (null off world maps / without WebGL). */
  private gory: GoryFiltr | null = null;
  /** When the last dust puff came out from under the boots (uphill). */
  private lastDust = 0;

  /** A dust puff at the hero's feet on a steep climb (Góry v2): light beige, grows and fades in 0.7 s. */
  private dustPuff() {
    const g = this.add.graphics().setDepth(this.player.y - 1);
    const x = this.player.x + (Math.random() - 0.5) * 3, y = this.player.y + 1;
    for (let i = 0; i < 9; i++) {
      g.fillStyle(0xc8b49a, 0.8);
      g.fillRect(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 2, 1, 1);
    }
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.4, y: -2, duration: 700, onComplete: () => g.destroy() });
  }
  /** The "steep slope" word was said (once per scene). */
  private steepSaid = false;
  private kurAt = 0;

  /**
   * A ripe vegetable on a 09 field as a pickup of its own (owner, 5 Oct 2026: in the field they were hard to tell
   * from the unripe ones): the artist's ripe plant over a soft golden glow, picked by walking over it.
   */
  private ripeCrop(q: Uprawa09): Phaser.GameObjects.Image | undefined {
    const key = q.k ? `upr09-${q.k}` : GOODS_TEX[q.veg as Owoc];
    if (!key || !this.textures.exists(key)) return undefined;
    const img = this.add.image(q.x, q.y, key);
    if (q.k) {
      // Base point = the middle of the bottom edge (as the generator paints them), 2 picture px per map px.
      const src = this.textures.get(key).getSourceImage();
      img.setOrigin(Math.floor(src.width / 2) / src.width, (src.height - 1) / src.height).setScale(1 / GEN_DOTS);
    } else img.setScale(artScale(key));
    img.setDepth(q.y);
    img.setData('kind', `crop:${q.veg}`);
    img.setData('spot', q.id);
    if (!this.textures.exists('crop-glow')) {
      const n = 32;
      const tex = this.textures.createCanvas('crop-glow', n, n)!;
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grd.addColorStop(0, 'rgba(255,224,138,1)');
      grd.addColorStop(0.5, 'rgba(255,224,138,0.55)');
      grd.addColorStop(1, 'rgba(255,224,138,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, n, n);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    {
      const glow = this.add.image(q.x, q.y - 3, 'crop-glow').setDepth(q.y - 0.5).setScale(0.75).setAlpha(0.85);
      // Pulse and bob are driven by animateCrops (only those on screen) – hundreds of tweens slowed phones (report 56).
      // The plant itself bobs a little now and then: "I'm ready".
      img.setData('glow', glow).setData('sy', img.scaleY).setData('faza', Math.random() * 1000).setData('okres', 1600 + Math.random() * 900);
      img.once('destroy', () => glow.destroy());
    }
    // Hidden in the fog until the hero sees them (updateFog keeps it so).
    const seen = !!this.vision && pointInPolygon(this.vision, q.x, q.y);
    img.setVisible(seen);
    (img.getData('glow') as Phaser.GameObjects.Image | undefined)?.setVisible(seen);
    this.pickups.push(img);
    return img;
  }

  private removePickup(item: Phaser.GameObjects.Image) {
    this.pickups = this.pickups.filter((p) => p !== item);
    item.destroy();
  }

  private collect(item: Phaser.GameObjects.Image) {
    const kind = item.getData('kind') as string;
    if (kind === 'quest') {
      const q = this.folkQuest;
      this.removePickup(item);
      if (!q) return;
      q.got = true;
      q.item = undefined;
      this.toast(`${q.zguba.ikona} Odzyskane: ${q.zguba.nazwa}! Zanieś to do: ${q.folk.name}.`, 3500);
      this.emitHud();
      return;
    }
    if (kind.startsWith('crop:')) {
      // A ripe vegetable on a field (overhaul 09): into the backpack, a hole in the field, a short slow-down.
      const f = kind.slice(5) as Owoc;
      if (!addFruit(f)) {
        if (!item.getData('warned')) this.toast('Plecak pełny!', 1200);
        item.setData('warned', true);
        return;
      }
      session.stats.fruit++;
      this.cropSlowUntil = this.time.now + WARZYWA.zwolnienieMs;
      this.mapView.zbierzUprawe(item.getData('spot') as string, item.x, item.y);
      this.removePickup(item);
      this.emitHud();
      return;
    }
    if (kind === 'heart') this.player.heal(2);
    else if (kind.startsWith('fruit:')) {
      const f = kind.slice(6) as Owoc;
      if (!addFruit(f)) {
        // Stays on the ground; don't keep complaining every frame.
        if (!item.getData('warned')) this.toast('Plecak pełny!', 1200);
        item.setData('warned', true);
        return;
      }
      session.stats.fruit++;
      const spot = item.getData('spot') as string | undefined;
      if (spot) this.forest.picked(spot);
      this.toast(`+1 ${OWOCE[f].nazwa}`, 800);
    } else {
      const n = luckyCoins((item.getData('n') as number | undefined) ?? 1);
      earn(n);
      if (n > 1) this.toast(`+${n} monet`, 900);
    }
    this.removePickup(item);
    this.emitHud();
  }

  private onPlayerDeath() {
    // The demo's dream: dying only wakes the hero up.
    if (this.demoRun?.onDeath()) {
      this.player.anims.stop();
      this.tweens.add({ targets: this.player, angle: 90, duration: 300 });
      this.emitHud();
      return;
    }
    if (session.immortal) {
      this.damageCarry = 0;
      this.player.hp = PLAYER.maxHp;
      session.hp = PLAYER.maxHp;
      this.protect(this.time.now);
      this.toast('✨ Nieśmiertelny – serca wracają!', 2500);
      this.emitHud();
      return;
    }
    this.player.anims.stop();
    this.offerRescue();
  }

  /**
   * Death isn't final (owner, 26 Oct 2026): the hero comes to in the hospital nearest to where he fell, on the map he
   * was on (no hospital there: the load point – last hotel or home). He loses the gold in his backpack (the chest keeps
   * its own) and half of the progress made in his current level (never a level down).
   */
  private offerRescue() {
    if (this.naNoszach) return;
    this.naNoszach = true;
    this.lingerUntil = 0;
    this.damageCarry = 0;
    this.stany = {};
    this.player.anims.stop();
    this.player.setFrame('down-0');
    this.tweens.add({ targets: this.player, angle: 90, duration: 300 });
    const zloto = session.coins;
    session.coins = 0;
    const lvl = poziomPostaci(session.exp);
    const od = expNaPoziom(lvl);
    const strata = Math.floor((session.exp - od) / 2);
    session.exp -= strata;
    this.emitHud();
    // The EXP lost isn't spelled out (owner, 26 Oct 2026): only a hint that experience must be earned again.
    const kara = `${zloto > 0 ? `Złoto z plecaka (${zloto.toLocaleString('pl-PL')}) przepadło.` : 'W plecaku nie było złota – nic nie przepadło.'}${strata > 0 ? ' Wszystko wydaje się jakby mniej znajome… Musisz teraz nabrać więcej doświadczenia.' : ''}`;
    const dist = (q: CityPlace) => Math.hypot(q.door.x - this.player.x, q.door.y - this.player.y);
    const szpital = this.city.places.filter((q) => q.kind === 'hospital').reduce<CityPlace | null>((m, q) => (!m || dist(q) < dist(m) ? q : m), null);
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(800, () => {
      // Fell in a dungeon: carried up the stairs, then to the hospital nearest the entrance (poPorazceWLochu).
      if (this.loch) return this.wyjdzZLochu(kara);
      if (szpital) {
        void this.city.ensure(szpital.door.x, szpital.door.y, 200 * PX_PER_M).catch(() => {}).then(() => {
          const at = this.city.reachableNear(szpital.door.x, szpital.door.y);
          this.wstanWSzpitalu(at, `🏥 ${szpital.name}`, kara);
        });
        return;
      }
      const at = session.at ?? { m: 'lublin', x: session.startX, y: session.startY };
      if (at.m === this.city.id) return this.wstanWSzpitalu(at, '🛏 Ocknąłeś się', kara, true);
      // The load point is on another map: go there (the dialog waits for the next scene).
      session.hp = PLAYER.maxHp;
      this.travelling = true;
      this.keepFog();
      void getMap(at.m).then(async (city) => {
        session.arrive = { x: at.x, y: at.y };
        await prepareMap(city);
        this.game.registry.set('city', city);
        saveNow(PLAYER.maxHp).catch(() => {});
        this.scene.stop('ui');
        this.scene.restart();
      });
    });
  }

  /** Back on his feet after a defeat, at `at` (hospital door or the load point), with the dialog that says what was lost. */
  private wstanWSzpitalu(at: { x: number; y: number }, title: string, kara: string, bezSzpitala = false) {
    this.player.setAngle(0);
    this.player.hp = PLAYER.maxHp;
    session.hp = PLAYER.maxHp;
    this.player.setPosition(at.x, at.y);
    this.cameras.main.centerOn(at.x, at.y);
    this.enemies.forEach((e) => (e.chasing = false));
    this.naNoszach = false;
    this.protect(this.time.now);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.emitHud();
    this.save();
    // After the fade-in: a dialog pauses the scene, and a paused camera fade would stay black.
    this.time.delayedCall(650, () => this.dialog({
      title,
      text: (bezSzpitala
        ? 'Ktoś znalazł cię nieprzytomnego i zaniósł tam, gdzie ostatnio spałeś. Rany się zagoiły.'
        : 'Ktoś znalazł cię nieprzytomnego i przyniósł do szpitala. Lekarz opatrzył rany – zdrowie w pełni.')
        + `\n\n${kara}`,
      buttons: ['Wstaję'],
      onChoose: () => {},
    }));
  }

  // ------------------------------------------------------------------ sessions

  /** What the server keeps in case this tab is closed without "Wyjdź". */
  private snapshot(): Snapshot {
    const near = this.enemies.filter(
      (e) => !e.isDead && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 200,
    );
    const tu = this.miejsceZapisu();
    if (this.loch) near.length = 0; // a dungeon is never replayed: the next start is at its entrance, in peace
    return {
      s: PX_PER_M,
      m: tu.m,
      x: Math.round(tu.x),
      y: Math.round(tu.y),
      // Mid turn fight the tab may close: next time the hero comes back with the life from before it.
      hp: this.walka?.aktywna ? this.walka.hpPrzed : this.player.hp,
      enemies: near.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), hp: tury() ? e.kind.hp : e.hp, k: e.kindId })),
    };
  }

  /**
   * The last session ended without "Wyjdź": the character is back where it was,
   * with the enemies that were around, and can't move for 10 seconds.
   */
  private replayAbandoned() {
    const a = session.abandoned;
    session.abandoned = null;
    // Left on another map than the one we start on: nothing to replay. Test characters can't be hurt anyway
    // (bug report 30: after an immortal "death" a reload put Arceus among the old gang's members with no gang around).
    if (!a || !a.enemies?.length || (a.m ?? 'lublin') !== this.city.id || session.immortal) return;
    this.player.setPosition(a.x, a.y);
    this.player.hp = Math.max(1, Math.min(PLAYER.maxHp, a.hp));
    for (const e of a.enemies) {
      const s = this.spawnEnemy(e.x, e.y, undefined, e.k ?? 'glut');
      s.temp = true;
      s.hp = e.hp;
    }
    this.lingerUntil = this.time.now + LINGER_MS;
    this.toast('Gra została zamknięta bez wyjścia – twoja postać stoi bezbronna na ulicy przez 10 sekund!', 5000);
  }

  private endLinger() {
    this.lingerUntil = 0;
    // Survived: the lingering foes leave and the character goes home.
    this.enemies.filter((e) => e.temp).forEach((e) => e.destroy());
    this.enemies = this.enemies.filter((e) => !e.temp);
    // Back to the last save point: the hotel slept in, or home.
    const back = session.at && session.at.m === this.city.id ? session.at : { x: session.startX, y: session.startY };
    this.player.setPosition(back.x, back.y);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.toast(session.at ? 'Przetrwałeś! Wracasz do hotelu, w którym ostatnio spałeś.' : 'Przetrwałeś! Wracasz do domu.');
    this.emitHud();
  }

  // ------------------------------------------------------------------ dungeons (content/lochy.ts, src/loch/)

  /** Where a save puts the hero: here, or – in a dungeon – by its entrance on the surface (a dungeon is never a start). */
  private miejsceZapisu(): { m: string; x: number; y: number } {
    if (this.loch) {
      const p = lochSesja.powrot;
      if (p) return { m: p.m, x: p.x, y: p.y };
      return session.at ?? { m: 'lublin', x: session.startX, y: session.startY };
    }
    return { m: this.city.id, x: this.player.x, y: this.player.y };
  }

  /** A swing / double tap by a dungeon's entrance, its stairs up or its chest. */
  private lochDotyk(hit: Phaser.Math.Vector2): boolean {
    if (performance.now() < this.talkReadyAt) return false;
    if (this.lochy) {
      const w = this.lochy.przy(hit.x, hit.y + FEET.dy) ?? this.lochy.przy(this.player.x, this.player.y + FEET.dy);
      if (!w) return false;
      if (this.inCombat()) {
        this.toast(LOCH_TEKSTY.wWalce, 1800);
        return true;
      }
      const opis = LOCHY[w.rodzaj];
      this.dialog({
        title: `🕯 ${opis.nazwa}${w.przy ? ` – ${w.przy}` : ''}`,
        text: opis.wejscie,
        buttons: [LOCH_TEKSTY.schodze, LOCH_TEKSTY.nieTeraz],
        onChoose: (i) => { if (i === 0) this.zejdzDoLochu(w); },
      });
      return true;
    }
    const loch = this.loch;
    if (!loch) return false;
    const co = loch.przy(hit.x, hit.y) ?? loch.przy(this.player.x, this.player.y + FEET.dy);
    if (co === 'schody') {
      if (this.inCombat()) {
        this.toast(LOCH_TEKSTY.wWalce, 1800);
        return true;
      }
      this.dialog({
        title: LOCH_TEKSTY.wyjsc,
        text: LOCH_TEKSTY.wyjscPytanie(loch.zostalo),
        buttons: [LOCH_TEKSTY.wychodze, LOCH_TEKSTY.zostaje],
        onChoose: (i) => { if (i === 0) this.wyjdzZLochu(); },
      });
      return true;
    }
    if (co === 'skrzynia') {
      this.otworzSkrzynieLochu();
      return true;
    }
    return false;
  }

  /** Down the stairs: the dungeon is its own small map (src/loch/mapa.ts), like walking onto another map. */
  private zejdzDoLochu(w: WejscieLochu) {
    if (this.travelling) return;
    this.travelling = true;
    const ll = this.city.toLatLon(w.x, w.y);
    lochSesja.powrot = { m: this.city.id, x: w.x, y: w.y + 6, nazwa: LOCHY[w.rodzaj].nazwa };
    // Saved by the entrance first: a closed tab or a reload comes back up here.
    this.save();
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    const id = idLochu({ rodzaj: w.rodzaj, seed: w.seed, lat: ll.lat, lon: ll.lon });
    this.time.delayedCall(520, () => {
      getMap(id).then((city) => {
        const plan = city.loch!;
        session.arrive = { x: (plan.start.x + 0.5) * plan.T, y: (plan.start.y + 0.5) * plan.T };
        session.hp = this.player.hp;
        this.game.registry.set('city', city);
        this.scene.stop('ui');
        this.scene.restart();
      }).catch((e: Error) => {
        this.travelling = false;
        cam.fadeIn(300);
        this.toast(`Nie da się zejść: ${e.message}`);
      });
    });
  }

  /** Up the stairs, back where the hero went down (after a defeat: `porazka` = what was lost, for the hospital). */
  private wyjdzZLochu(porazka: string | null = null) {
    if (this.travelling && !porazka) return;
    this.travelling = true;
    const p = lochSesja.powrot ?? { ...(session.at ?? { m: 'lublin', x: session.startX, y: session.startY }), nazwa: '' };
    const cam = this.cameras.main;
    if (!porazka) cam.fadeOut(500, 0, 0, 0);
    getMap(p.m)
      .then(async (city) => {
        await city.ensure(p.x, p.y, LOAD_RADIUS);
        session.arrive = city.isBlocked(p.x, p.y) ? city.reachableNear(p.x, p.y) : { x: p.x, y: p.y };
        await prepareMap(city);
        session.hp = porazka ? PLAYER.maxHp : this.player.hp;
        lochSesja.powrot = null;
        lochSesja.porazka = porazka;
        if (!porazka) this.walkedIn = LOCH_TEKSTY.wyszedl;
        this.game.registry.set('city', city);
        this.scene.stop('ui');
        this.scene.restart();
      })
      .catch((e: Error) => {
        this.travelling = false;
        cam.fadeIn(300);
        this.toast(`Nie da się wyjść: ${e.message}`);
      });
  }

  /** Back on the surface after a defeat underground: the nearest hospital (or here), as after any defeat. */
  private poPorazceWLochu(kara: string) {
    const dist = (q: CityPlace) => Math.hypot(q.door.x - this.player.x, q.door.y - this.player.y);
    const szpital = this.city.places.filter((q) => q.kind === 'hospital').reduce<CityPlace | null>((m, q) => (!m || dist(q) < dist(m) ? q : m), null);
    if (!szpital) return this.wstanWSzpitalu({ x: this.player.x, y: this.player.y }, '🛏 Ocknąłeś się', kara, true);
    void this.city.ensure(szpital.door.x, szpital.door.y, 200 * PX_PER_M).catch(() => {}).then(() => {
      this.wstanWSzpitalu(this.city.reachableNear(szpital.door.x, szpital.door.y), `🏥 ${szpital.name}`, kara);
    });
  }

  /** The chest in the farthest chamber: once per login, after its guardian and escort are beaten. */
  private otworzSkrzynieLochu() {
    const loch = this.loch!;
    const pow = loch.skrzyniaPowod();
    if (pow === 'pusta') return this.toast(LOCH_TEKSTY.skrzyniaPusta, 2200);
    if (pow === 'pilnowana') return this.toast(LOCH_TEKSTY.skrzyniaZamknieta, 2600);
    const N = loch.opis.nagroda;
    const monety = luckyCoins(N.monety[0] + Math.floor(Math.random() * (N.monety[1] - N.monety[0] + 1)));
    earn(monety);
    session.exp += N.exp;
    session.mikstury += N.mikstura;
    const diament = Math.random() < N.diament;
    if (diament) session.diamenty += 1;
    session.stats.lochy = (session.stats.lochy ?? 0) + 1;
    loch.otworzSkrzynie();
    this.emitHud();
    const co = [`💰 ${monety} złota`, `✨ ${N.exp} EXP`, N.mikstura ? `🧪 mikstura leczenia${N.mikstura > 1 ? ` ×${N.mikstura}` : ''}` : '', diament ? '💎 diament!' : ''].filter(Boolean).join('\n');
    this.dialog({ title: LOCH_TEKSTY.skrzynia, text: LOCH_TEKSTY.skrzyniaOtwarta(co), buttons: [LOCH_TEKSTY.zabrane], onChoose: () => this.save() });
  }

  /** Is any enemy close enough to be fighting us? */
  inCombat() {
    if (this.scene.isActive('arena')) return true;
    if (tury()) return !!this.walka?.aktywna;
    return this.enemies.some((e) => !e.isDead && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 120);
  }

  /**
   * The new-version bar (update.ts): save here, close the session properly and
   * come back to this very spot after the reload. Returns why not, or null.
   */
  async reloadForUpdate(): Promise<string | null> {
    if (this.inCombat()) return 'Najpierw skończ walkę!';
    if (this.player.isDead || this.leaving || demo.on) return null;
    this.leaving = true;
    this.keepFog();
    try {
      await saveNow(this.player.hp);
      { const tu = this.miejsceZapisu(); keepResume(session.name, tu.m, tu.x, tu.y); }
      await api.logout(session.token);
    } catch {
      // Not saved: the reload still brings the new version, from the last save.
    }
    if (session.name && session.idik) location.hash = new URL(codeLink(session.name, session.idik)).hash;
    return null;
  }

  /** The broken-graphics reload (errlog.ts watchGraphics): save and come back to this spot, whatever is going on. */
  async saveForReload() {
    if (this.player.isDead || demo.on) return;
    this.leaving = true;
    this.keepFog();
    { const tu = this.miejsceZapisu(); keepResume(session.name, tu.m, tu.x, tu.y); }
    await saveNow(this.player.hp).catch(() => {});
  }

  /**
   * After the demo's dream (src/demo.ts wakeUp): the real character wakes up in front of Targi Lublin behind the
   * blackout; once the view is painted the screen clears, a short word, then the HUD portrait is shown – it holds
   * the character's code and the account link (Kufer). Then the ordinary game, nothing ends after some metres.
   */
  /**
   * The start tutorial (owner, 26 Oct 2026): walking, the blow, talking, then the arrow to the nearest newsboy.
   * For characters that haven't done it yet and are still fresh (a few EXP, a few hundred metres).
   */
  private startSamouczek() {
    this.samouczek?.usun();
    this.samouczek = null;
    this.samouczekCel = null;
    if (this.demoRun || demo.on || session.flagi.samouczek || session.immortal) return;
    if (session.exp >= 100 || (session.stats.m ?? 0) > 800) return;
    this.samouczek = new SamouczekStartu({
      hero: () => ({ x: this.player.x, y: this.player.y }),
      pxNaM: PX_PER_M,
      zajete: () => !this.sys.isActive() || this.scene.isPaused() || !!this.walka?.aktywna || this.witam || this.travelling,
      gazeciarz: () => {
        let best: Folk | null = null;
        let bd = Infinity;
        for (const f of this.folk.newsboys()) {
          const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
          if (d < bd) { bd = d; best = f; }
        }
        return best ? { x: best.x, y: best.y, name: best.name } : null;
      },
      prowadz: (c) => {
        this.samouczekCel = c;
        this.emitHud();
      },
      koniec: () => {
        session.flagi.samouczek = 1;
        this.samouczek = null;
        this.samouczekCel = null;
        this.emitHud();
        this.save();
        // Right after the tutorial: the offer of an app icon (once per device).
        this.time.delayedCall(6000, () => this.zaproponujIkone());
      },
    });
    this.events.once('shutdown', () => this.samouczek?.usun());
  }

  /**
   * „📲 Exp-lore na pulpicie?” (owner, 26 Oct 2026): an icon on the phone/computer that opens the game full screen like
   * an app. Once per device, never in the demo, a fight or another window; waits a moment when the screen is busy.
   */
  private zaproponujIkone(proba = 0) {
    if (demo.on || !proponowac() || !this.sys.isActive()) return;
    if (this.scene.isPaused() || this.walka?.aktywna || document.getElementById('character') || document.getElementById('samouczek')) {
      if (proba < 20) this.time.delayedCall(15000, () => this.zaproponujIkone(proba + 1));
      return;
    }
    zaproponowano();
    this.dialog({
      title: '📲 Exp-lore na pulpicie?',
      text: 'Dodaj grę jako ikonę na telefonie albo komputerze – otworzy się jednym dotknięciem, na pełnym ekranie, bez paska przeglądarki. Twoja postać będzie czekać.',
      buttons: ['📲 Dodaj ikonę', 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0) return;
        void zainstaluj().then((r) => {
          if (r.ok) this.toast('📲 Gotowe – szukaj ikony Exp-lore na pulpicie.', 3500);
          else if (r.jak) this.dialog({ title: '📲 Ikona Exp-lore', text: r.jak, buttons: ['OK'], onChoose: () => {} });
        });
      },
    });
  }

  private welcome() {
    this.witam = true;
    const reveal = () => {
      if (!this.sys.isActive()) return;
      if (!this.firstViewReady()) { this.time.delayedCall(100, reveal); return; }
      blackout(false, 500);
      this.time.delayedCall(500, () => this.dialog({
        title: DEMO_TEKSTY.pobudkaTytul,
        text: DEMO_TEKSTY.pobudka(session.name),
        buttons: ['Rozejrzę się'],
        // First the difficulty (owner, 19 Oct 2026: „po pobudce każ wybrać poziom”), then the portrait tutorial.
        onChoose: () => (session.trudnoscWybrana ? portret() : this.time.delayedCall(250, () => this.wyborTrudnosci(true, portret))),
      }));
    };
    const portret = () => this.time.delayedCall(350, () => {
          // The portrait of whichever HUD is shown (the telescope HUD on the test server has no boiler avatar).
          const sel = teleskop() ? '.tel-portret' : '#hud .hud-av';
          const widac = () => (document.querySelector(sel)?.getBoundingClientRect().width ?? 0) > 0;
          // The hero walks again at once: the tutorial only points, it never holds him (with no portrait on the
          // screen the old version kept him frozen for good – owner, 18 Oct 2026: no joystick after waking up).
          this.witam = false;
          if (!widac()) return;
          let zamknij = () => {};
          const close = pokazGdzieKliknac(sel, DEMO_TEKSTY.portret(session.name, session.konto), () => {
            zamknij();
            (this.scene.get('ui') as unknown as { openCharacter(p?: 'eq'): void }).openCharacter('eq');
          }, () => zamknij()); // a tap anywhere else just closes it – the next touch is the joystick
          // Gone after a while too, so it never blocks the screen.
          const t = this.time.delayedCall(15000, () => zamknij());
          zamknij = () => { close(); t.remove(); };
          this.events.once('shutdown', zamknij);
        });
    this.time.delayedCall(100, reveal);
  }

  /**
   * The difficulty window: after the QR demo (`pierwszy`: free, no way to skip it – Escape keeps the current level)
   * and from the game menu (once a day, checked by the server).
   */
  wyborTrudnosci(pierwszy: boolean, potem?: () => void) {
    const W = WYBOR_TRUDNOSCI;
    const dalej = () => potem?.();
    if (!pierwszy && session.trudnoscDzis) {
      this.dialog({ title: W.tytul, text: W.juzDzis, buttons: ['OK'], onChoose: dalej });
      return;
    }
    const teraz = Math.max(0, TRUDNOSCI.indexOf(session.level));
    this.dialog({
      title: W.tytul,
      text: `${pierwszy ? W.poDemo : W.wMenu}\n\n${TRUDNOSCI.map((t, i) => `• ${t.nazwa} – ${W.krotko[i]}`).join('\n')}`,
      buttons: [...TRUDNOSCI.map((t, i) => (i === teraz ? `${t.nazwa} ✓` : t.nazwa)), pierwszy ? `Zostaję przy: ${TRUDNOSCI[teraz].nazwa}` : 'Anuluj'],
      odpowiedzi: pierwszy,
      onChoose: (k) => {
        const i = k < TRUDNOSCI.length ? k : pierwszy ? teraz : -1;
        if (i < 0 || (i === teraz && !pierwszy)) return dalej();
        void this.ustawTrudnosc(TRUDNOSCI[i].wiek, !session.trudnoscWybrana).then(dalej);
      },
    });
  }

  private async ustawTrudnosc(age: number, pierwszy: boolean) {
    const W = WYBOR_TRUDNOSCI;
    let r: Awaited<ReturnType<typeof api.zmienTrudnosc>> | null = null;
    try { r = await api.zmienTrudnosc(session.token, age, pierwszy); } catch { r = null; }
    if (!r?.ok) {
      if (r?.blad === 'dzis') session.trudnoscDzis = true;
      this.toast(r?.blad === 'dzis' ? W.juzDzis : W.blad, 3000);
      return;
    }
    if (!pierwszy) session.trudnoscDzis = true;
    session.trudnoscWybrana = true;
    session.age = age;
    session.level = TRUDNOSCI[trudnoscZWieku(age)];
    // Everything that reads the level at a moment: monsters' pace, hearts (new ones come filled), the view.
    Slime.tempo = session.level.tempo;
    this.appliedLevel = '';
    this.applyLevel();
    this.lastVision = { x: NaN, y: NaN, a: NaN };
    this.emitHud();
    this.toast(W.zmieniony(session.level.nazwa), 2500);
  }

  /** "Wyjdź": close the session properly and go back to the start screen. */
  async leave() {
    if (this.leaving) return;
    this.leaving = true;
    // The QR demo: out to the ordinary start screen (without the demo link).
    if (demo.on) {
      location.href = location.origin + sciezkaGry();
      return;
    }
    try {
      await api.logout(session.token);
    } catch {
      // Offline: the server will treat it as an abandoned session.
    }
    this.backToMenu();
  }

  /** `reopen`: show this character right away (the ghost screen after dying). */
  backToMenu(reopen?: { name: string; code: string }) {
    const game = this.game;
    this.keepFog();
    game.scene.stop('ui');
    game.scene.stop('game');
    // Every session starts in Lublin, at home.
    const lublin = cachedMap('lublin') ?? this.city;
    game.registry.set('city', lublin);
    showMenu(lublin, reopen).then(() => enterWorld(game)).catch((err: Error) => {
      report('map-start', err.message);
      loadingMapError(err.message, () => { letGo(); location.reload(); });
    });
  }

  /** Puts what was explored on this map into the session (saved with the game). */
  private keepFog() {
    if (this.loch) return; // a dungeon's fog is never kept (it is made again every visit)
    if (this.city.id === 'lublin') session.fog = this.explored.serialize();
    else session.fogs[this.city.id] = this.explored.serialize();
  }

  private save() {
    this.keepFog();
    // New controls test (walka/live.ts, point 7): every save keeps the hero's spot; the next login starts there.
    if (live() && !this.player.isDead) session.tu = this.miejsceZapisu();
    saveNow(this.player.hp)
      // The demo saves nothing (offline.demo), so it says nothing either.
      .then(() => { if (!demo.on) this.toast('Gra zapisana'); })
      .catch((e: Error) => this.toast(`Nie udało się zapisać: ${e.message}`));
  }

  // ------------------------------------------------------------------ missions

  private refreshMarkers() {
    for (const rm of this.missions) {
      const img = this.markers.get(rm.m.id);
      if (!img) continue;
      const st = missionState(rm.m);
      img.setTexture(TEX.marker);
      img.setAlpha(st === 'active' ? 0.5 : 1);
      // A mission whose requirements aren't met yet stays hidden (mission chains, admin panel), and a
      // finished one leaves no mark: the place or person there is just itself again (owner, 7 Oct 2026).
      img.setVisible(missionAvailable(rm.m) && st !== 'done');
    }
  }

  private startMissionGoal(rm: ResolvedMission) {
    const z = zadanieOf(rm.m);
    if (z.typ === 'pokonaj' && rm.target) {
      this.enemies.filter((e) => e.missionId === rm.m.id).forEach((e) => e.destroy());
      this.enemies = this.enemies.filter((e) => e.missionId !== rm.m.id);
      // A wanted villain hides somewhere around the spot, not right on it.
      this.spawnGroup(rm.target, z.ile ?? 3, rm.m.id, z.wrog ?? 'glut', z.szukaj ? SEARCH_RADIUS : 40);
    }
  }

  private stuckCheckAt = 0;

  /**
   * Standing inside a wall (the map data changed under an old start point, a
   * hotel door drawn inside its building…): step out to the nearest street.
   */
  private unstickHero(now: number) {
    if (now < this.stuckCheckAt) return;
    this.stuckCheckAt = now + 500;
    const p = this.player;
    const fy = p.y + FEET.dy;
    const box = { x0: p.x - 40, y0: fy - 40, x1: p.x + 40, y1: fy + 40 };
    if (!this.city.ready(box) || this.city.isFree(p.x, fy, FEET.hw, FEET.hh)) return;
    const q = this.city.freeNear(p.x, fy);
    if (!this.city.isFree(q.x, q.y, FEET.hw, FEET.hh)) return;
    p.setPosition(q.x, q.y - FEET.dy);
    this.toast('Wychodzisz na ulicę.', 1500);
  }

  /** The road sign the hero last read (shown again only after walking away). */
  private signRead = -1;

  /** Walking past a road sign shows where the road leads and how far. */
  private readSign() {
    const r = SIGN_READ_M * PX_PER_M;
    const i = this.city.signs.findIndex((sg) => Math.abs(sg.x - this.player.x) < r && Math.abs(sg.y - this.player.y) < r && Math.hypot(sg.x - this.player.x, sg.y - this.player.y) < r);
    if (i === this.signRead) return;
    this.signRead = i;
    if (i < 0) return;
    const [back, ...ahead] = this.city.signs[i].to;
    const lines = [...ahead.map((t) => `➜ ${t.name} – ${t.km} km`), `↩ ${back.name} (centrum) – ${back.km} km`];
    this.toast(`🪧 Kierunkowskaz\n${lines.join('\n')}`, 5000);
  }

  /** Mountain peaks (world maps): their names on the map, and a cheer on reaching the top. */
  private peaksShown = 0;
  private peaksClimbed = new Set<string>();
  private updatePeaks() {
    const list = this.city.peaks;
    for (; this.peaksShown < list.length; this.peaksShown++) {
      const k = list[this.peaksShown];
      const ll = this.city.toLatLon(k.x, k.y);
      this.add.image(k.x, k.y, peakTexture(this, krajWPunkcie(ll.lat, ll.lon))).setDepth(900_000);
      this.add.text(k.x, k.y - 7, `${k.name}\n${k.ele} m`, { fontFamily: 'monospace', fontSize: '7px', color: '#fff8e0', stroke: '#2a2430', strokeThickness: 3, align: 'center', resolution: 4 }).setOrigin(0.5, 1).setDepth(900_000);
    }
    const r = PEAK_REACH_M * PX_PER_M;
    for (const k of list) {
      if (Math.abs(k.x - this.player.x) > r || Math.abs(k.y - this.player.y) > r) continue;
      const key = `${k.name}:${Math.round(k.x)}`;
      if (this.peaksClimbed.has(key)) continue;
      this.peaksClimbed.add(key);
      this.toast(`⛰ ${k.name} – ${k.ele} m n.p.m.\nJesteś na szczycie!`, 5000);
    }
  }

  /** Talk bubbles over characters with a riddle, a request or a challenge. */
  private updateBubbles() {
    const spots: { x: number; y: number }[] = [...this.fixed.important()];
    const w = this.story.wizardSpot();
    if (w) spots.push(w);
    if (!this.challenge) for (const n of this.training.visibleNpcs()) spots.push(n);
    // Whoever is waiting for their stolen thing.
    const fq = this.folkQuest?.folk;
    if (fq?.sprite?.visible) spots.push(fq);
    const blink = 0.55 + 0.45 * Math.sin(this.time.now / 180);
    spots.forEach((p, i) => {
      const b = (this.bubbles[i] ??= this.add.image(0, 0, TEX.talkBubble).setDepth(1_150_000));
      b.setPosition(Math.round(p.x + 6 * SKALA_POSTACI), Math.round(p.y - 20 * SKALA_POSTACI)).setAlpha(blink).setVisible(true);
    });
    for (let i = spots.length; i < this.bubbles.length; i++) this.bubbles[i].setVisible(false);
  }

  /**
   * A building door a swing lands on (or the hero stands at): a shop, school,
   * church, mission building… Buildings open with a swing, not by walking in.
   */
  private openDoorAt(x: number, y: number, standing = false): boolean {
    const fx = x;
    const fy = y;
    let id: string | null = null;
    let open: (() => void) | null = null;
    let savePoint = true;
    // Several missions can share a door (mission chains): the one finished last waits behind the
    // one that matters now – ready to hand in, in progress, new – and hidden ones don't open at all.
    const rank = (rm: ResolvedMission) => ({ goal: 0, active: 1, new: 2, done: 3 })[missionState(rm.m)];
    // A finished mission only answers a swing aimed at its door (a short thanks), never the hero just
    // standing there, so it doesn't catch every swing nearby.
    const atDoor = this.missions
      .filter((rm) => missionAvailable(rm.m) && Phaser.Math.Distance.Between(rm.door.x, rm.door.y, fx, fy) < DOOR_RADIUS)
      .filter((rm) => !(standing && missionState(rm.m) === 'done'))
      .sort((a, b) => rank(a) - rank(b));
    // A place at the same door (station, hotel, church, shop…) must stay reachable: a finished mission
    // gives way to it, an open one gets a button for it in its dialog.
    const placeAt = (q: { x: number; y: number }) => this.city.places.find((p) => Math.abs(p.door.x - q.x) < DOOR_RADIUS && Math.abs(p.door.y - q.y) < DOOR_RADIUS && Phaser.Math.Distance.Between(p.door.x, p.door.y, q.x, q.y) < DOOR_RADIUS);
    const rm = atDoor[0];
    const shared = rm ? placeAt(rm.door) : undefined;
    if (rm && !(shared && missionState(rm.m) === 'done')) {
      id = rm.m.id;
      if (missionState(rm.m) === 'done') savePoint = false;
      // A mission taken at a church/school keeps its door, but asking about the shadows must stay possible there (report 58).
      const host = shared && STORY_PLACES.has(shared.kind) ? shared : undefined;
      open = () => {
        this.doorPlace = shared ?? null;
        const available = atDoor.filter(q => missionState(q.m) !== 'done');
        this.withStoryPlace(host, () => available.length > 1 ? this.dialog({
          title: shared?.name ?? tx('Sprawy w okolicy','Nearby quests'),
          text: tx('Wybierz sprawę, o której chcesz porozmawiać.','Choose which quest you would like to discuss.'),
          buttons:[...available.map(q=>q.m.tytul),tx('Później','Later')],
          onChoose:i=>{if(available[i])this.openMissionDialog(available[i]);},
        }) : this.openMissionDialog(rm));
        this.doorPlace = null;
      };
    }
    if (!id && !placeAt({ x: fx, y: fy })) {
      // A chain mission waiting only for a higher level: the giver says when to come back.
      const locked = this.missions.find((r) => levelLock(r.m) && Phaser.Math.Distance.Between(r.door.x, r.door.y, fx, fy) < DOOR_RADIUS);
      if (locked) {
        id = locked.m.id;
        savePoint = false;
        open = () => this.dialog({ title: locked.m.tytul, text: `Wróć, gdy nabierzesz krzepy (poziom ${levelLock(locked.m)}).`, buttons: ['Dobrze'], onChoose: () => {} });
      }
    }
    if (!id) {
      for (const p of this.city.places) {
        if (Math.abs(p.door.x - fx) > DOOR_RADIUS || Math.abs(p.door.y - fy) > DOOR_RADIUS) continue;
        if (Phaser.Math.Distance.Between(p.door.x, p.door.y, fx, fy) < DOOR_RADIUS) {
          id = p.id;
          open = () => this.openPlace(p);
          savePoint = p.kind !== 'hotel'; // the hotel saves itself, with its spot
        }
      }
    }
    if (!open) return false;
    if (savePoint) this.save(); // entering a building is a save point
    // The dialog's portrait: the place's sign, else a mission giver standing at the door.
    const rp = placeAt({ x: fx, y: fy });
    if (rp) this.rozmowcaMiejsca(rp);
    else this.zapamietajRozmowce(fx, fy);
    open();
    return true;
  }

  private async refreshCityMissions(epoch: number) {
    if (epoch !== this.cityQuestEpoch || this.cityQuestPlanning) return;
    this.cityQuestPlanning = true;
    const city = this.city;
    try {
      const offers = await planCityQuests(city, this.player, mapName(city.id).startsWith('w:') ? tx('mieście startu','the starting city') : mapName(city.id), session.missions, { ...session.gen, ...Object.fromEntries(this.missions.filter(r => r.m.scenariusz).map(r => [r.m.id,r.m])) });
      if (epoch !== this.cityQuestEpoch || city !== this.city) return;
      for (const m of offers) {
        if (this.missions.some(r => r.m.id === m.id) || missionState(m) !== 'new' || session.gen[m.id]) continue;
        const door = resolvePlace(city, m.scenariusz!.anchors[0]);
        if (door) this.addMission({m, door, target:stageTarget(city,m,door)}, false);
      }
      this.refreshMarkers();
      this.emitHud();
    } catch (error) { report('city-quests', error instanceof Error ? error.message : String(error)); }
    finally { if (epoch === this.cityQuestEpoch) this.cityQuestPlanning = false; }
  }

  /** Adds a mission to the game: gold "!" over its door, goal enemies. */
  private addMission(rm: ResolvedMission, highlight: boolean) {
    if (isWithdrawnCityQuest(rm.m.id)) return;
    this.missions.push(rm);
    if (highlight && rm.door.building && missionState(rm.m) !== 'done') this.mapView.highlight.set(rm.door.building, { roof: '#e8b923', wall: '#f3e2a0' });
    // Above the fog: mission doors are always shown.
    const img = this.add.image(rm.door.x, rm.door.y - 14, TEX.marker).setDepth(1_100_000);
    this.tweens.add({ targets: img, y: img.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.markers.set(rm.m.id, img);
    if (missionState(rm.m) === 'active') this.startMissionGoal(rm);
  }

  /** A finished mission's building loses its gold roof: back to its place's own look, or plain. */
  private plainAgain(id: string) {
    const b = this.missions.find((r) => r.m.id === id)?.door.building;
    if (!b || !this.mapView.highlight.has(b)) return;
    // Another open mission at the same building keeps it gold.
    if (this.missions.some((r) => r.m.id !== id && r.door.building === b && missionAvailable(r.m) && missionState(r.m) !== 'done')) return;
    this.mapView.highlight.delete(b);
    const p = this.city.places.find((q) => q.building === b);
    if (p) this.mapView.highlight.set(b, { roof: PLACE_LOOK[p.kind].roof, wall: PLACE_LOOK[p.kind].wall });
    const rm = this.missions.find((r) => r.m.id === id)!;
    this.mapView.redrawAround(rm.door.x, rm.door.y);
  }

  private openPlace(p: CityPlace, venueChosen = false) {
    if (!venueChosen) {
      const shared = this.city.places.filter(q => Math.hypot(q.door.x - p.door.x, q.door.y - p.door.y) < 1);
      if (shared.length > 1 && shared.some(q => q.kind === 'maker' || q.kind === 'workshop')) {
        this.dialog({ title: 'Miejsca przy tym wejściu', text: 'Dokąd chcesz wejść?',
          buttons: [...shared.map(q => q.name), 'Wyjdź'],
          onChoose: i => { if (shared[i]) this.openPlace(shared[i], true); } });
        return;
      }
    }
    // Schools, churches and universities: the story question joins their dialog.
    this.withStoryPlace(STORY_PLACES.has(p.kind) ? p : undefined, () => this.openPlaceInner(p));
  }

  /** Runs `open` with `p` as the place whose dialog gets "ask about the shadows" (see dialog()). */
  private withStoryPlace(p: CityPlace | undefined, open: () => void) {
    if (!p) return open();
    this.storyPlace = p;
    try {
      open();
    } finally {
      this.storyPlace = null;
    }
  }

  private openPlaceInner(p: CityPlace) {
    if (p.kind === 'university') {
      return this.dialog({ title: `🎓 ${p.name}`, text: 'Studenci spieszą na zajęcia, a profesorowie dyskutują przy tablicy.', buttons: ['Wyjdź'], onChoose: () => {} });
    }
    if (p.kind === 'shop' || p.kind === 'merchant') return this.openShop(p);
    if (p.kind === 'station') return this.openCoach(p);
    if (p.kind === 'port') return this.openPort(p);
    if (p.kind === 'hotel') return this.openHotel(p);
    if (p.kind === 'bank') return void this.openBank(p);
    if (p.kind === 'school') return this.openSchool(p);
    if (p.kind === 'hospital') return this.openHospital(p);
    if (p.kind === 'library') return this.openLibrary(p);
    if (p.kind === 'alchemist') return this.openAlchemist(p);
    if (p.kind === 'camp') return this.openCamp(p);
    if (p.kind === 'gear') return this.openGearShop(p);
    if (p.kind === 'maker') return this.openProducer(p);
    if (p.kind === 'workshop') return this.openWorkshop(p);
    // Church, office, police: a random mission.
    const known = this.missions.find((rm) => rm.m.placeId === p.id && (rm.m.id.endsWith(`-${session.nonce}`) || session.gen[rm.m.id]));
    if (known) return this.openMissionDialog(known);
    const m = missionForPlace(this.city, p);
    if (!m) {
      this.dialog({ title: p.name, text: 'Dziś nie mamy dla ciebie żadnego zadania.', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const rm: ResolvedMission = { m, door: { ...p.door, building: p.building ?? undefined }, target: resolvePlace(this.city, m.zadanie.miejsce) };
    this.openMissionDialog(rm, () => {
      session.gen[m.id] = m;
      this.addMission(rm, false);
    });
  }

  /** The coachman at a railway station: rides to the next stations for coins. */
  private openCoach(p: CityPlace) {
    const at = this.city.toLatLon(p.door.x, p.door.y);
    // Three rides, drawn again every half hour (content/pociagi.ts); at a big station each coachman drives one side of the world.
    const base = p.id.replace(/#\d+$/, '');
    const big = this.city.places.some((q) => q.id === `${base}#2`);
    const side = coachSide(this.city.id, p.id, big);
    // Mission reward: a lasting discount, and one free ride (not a long train) at the station that gave it.
    const free = (session.flagi.przejazd ?? 0) > 0 && this.city.id === 'lublin' && p.name.includes(WOZNICA.gratisNaStacji);
    const cut = session.flagi.znizka_woznica ? 1 - WOZNICA.znizka : 1;
    const trips: (Offer & { gratis?: boolean })[] = coachOffers(this.city.id, at, p.name, p.id, side).map((t) =>
      free && !t.level ? { ...t, price: 0, gratis: true } : { ...t, price: Math.ceil((t.price * cut) / WOZNICA.zaokraglenie) * WOZNICA.zaokraglenie },
    );
    const title = `${this.pociagi?.ma(p) ? '🚂 Konduktor' : '🐴 Woźnica'} – ${p.name}${side ? ` (${STRONY[side]})` : ''}`;
    if (!trips.length) {
      this.dialog({ title, text: side ? `Woźnica karmi konia. „${STRONY[side][0].toUpperCase()}${STRONY[side].slice(1)} teraz nic nie jeżdżę. Spytaj innego woźnicę albo przyjdź po zmianie kursów.”` : 'Woźnica karmi konia. „Dziś nigdzie nie jadę, koń odpoczywa.”', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const where = (t: Trip) => (t.to.mapName === t.to.name || t.to.name.startsWith(t.to.mapName) ? t.to.name : `${t.to.name} (${t.to.mapName})`);
    const lines = trips.map((t) => `• ${t.level ? '🚂 ' : ''}${where(t)}: ${t.km.toFixed(0)} km, ${session.immortal ? 'od razu' : rideText(t.km)} – ${t.gratis ? 'gratis 🎟' : `${t.price} monet`}${t.level ? ` (od ${t.level}. poziomu)` : ''}`);
    const next = new Date(Math.ceil(Date.now() / 1_800_000) * 1_800_000);
    const hh = `${next.getHours()}:${String(next.getMinutes()).padStart(2, '0')}`;
    this.dialog({
      title,
      text: `„Wio, koniku! ${side ? `Jeżdżę ${STRONY[side]}. ` : ''}${free ? 'Za odzyskanego konia jeden kurs masz u mnie gratis! ' : ''}Dziś jadę tam:” Masz ${session.coins} monet.${cut < 1 ? ` Twoja zniżka: −${Math.round(WOZNICA.znizka * 100)}%.` : ''}\n\n${lines.join('\n')}\n\nJedziemy ok. 80 km/h. Po przyjeździe grę wczytasz już na tamtym peronie. Nowe kursy od ${hh}.`,
      buttons: [...trips.map((t) => `${t.level ? '🚂 ' : ''}${where(t)} – ${t.gratis ? 'gratis 🎟' : `${t.price} 💰`}`), `💎 Dowolne miasto, w którym byłeś`, ...(this.mamMapePodroznika() ? [] : [`🗺 Przepisz dworce z mapy – ${MAPA_PODROZNIKA.cena} 💰`]), 'Zostaję'],
      onChoose: (i) => {
        if (i === trips.length) return this.diamondRide(title);
        if (i === trips.length + 1 && !this.mamMapePodroznika()) return this.buyTravellerMap(() => this.openCoach(p), title.replace(/^\S+\s/, ''));
        const t = trips[i];
        if (!t) return;
        if (t.level && poziomPostaci(session.exp) < t.level) {
          this.toast(`🚂 Do ${t.to.name} jeździ się od ${t.level}. poziomu postaci.`);
          return;
        }
        if (session.coins < t.price) {
          this.toast(`Za mało monet: przejazd kosztuje ${t.price}.`);
          return;
        }
        if (t.gratis) session.flagi.przejazd = Math.max(0, (session.flagi.przejazd ?? 0) - 1);
        this.chooseSpeed(title, t, 0);
      },
    });
  }

  /**
   * Ferry ports (content/porty.ts; on production since 1.023): on world maps, every second, a captain appears in each port
   * within PROM.widacKm whose map around is loaded; once per map a hint names the nearest port further away.
   */
  private portsNear(now: number) {
    if (demo.on || now < this.portyAt || !worldOrigin(this.city.id)) return;
    this.portyAt = now + 1000;
    void wczytajPorty();
    const ll = this.city.toLatLon(this.player.x, this.player.y);
    for (const port of portyBlisko(ll, PROM.widacKm)) {
      const key = portKey(port);
      if ([...this.porty.values()].includes(port)) continue;
      const at = this.city.fromLatLon(port.lat, port.lon);
      const r = 60 * PX_PER_M;
      if (!this.city.ready({ x0: at.x - r, y0: at.y - r, x1: at.x + r, y1: at.y + r })) continue;
      // A ferry landing of the map already stands there (it has its captain): it is this port.
      const landing = this.city.places.find((q) => q.kind === 'port' && !this.porty.has(q.id) && odleglosc(this.city.toLatLon(q.door.x, q.door.y), port) < 3);
      if (landing) {
        this.porty.set(landing.id, port);
        continue;
      }
      // Already on this map (the scene started again): its look was drawn with the other places.
      const fresh = this.city.addPort(key, port.nazwa, port.lat, port.lon);
      const place = fresh ?? this.city.places.find((q) => q.kind === 'port' && q.id.endsWith(`/${key}`));
      if (!place) continue;
      this.porty.set(place.id, port);
      if (fresh) this.portLook(place);
    }
    if (this.portyRzekl) return;
    const far = portyBlisko(ll, PROM.wskazowkaKm);
    if (!far.length && this.time.now < 20_000) return; // the list may still be loading
    this.portyRzekl = true;
    const p = far[0];
    if (!p || odleglosc(p, ll) <= PROM.widacKm) return;
    this.toast(`⚓ Najbliższy port promowy: ${p.nazwa}, ok. ${Math.round(odleglosc(p, ll))} km ${kierunekSlownie(ll, p)}.`, 6000);
  }

  /** The port the hero stands in (its captain), if any. */
  private portHere(): Port | null {
    let best: Port | null = null;
    let bd = 300 * PX_PER_M;
    for (const p of this.city.places) {
      const port = p.kind === 'port' ? this.porty.get(p.id) : undefined;
      const d = Math.hypot(p.door.x - this.player.x, p.door.y - this.player.y);
      if (port && d < bd) [best, bd] = [port, d];
    }
    return best;
  }

  /** A port's look until the artist draws one: a code-drawn anchor board and the captain (the coachman in navy). */
  private portLook(p: CityPlace) {
    if (!this.textures.exists('sign-port')) {
      const g = this.make.graphics({}, false);
      const px = (x: number, y: number, w: number, h: number, c: number) => g.fillStyle(c).fillRect(x, y, w, h);
      px(14, 18, 4, 18, 0x1e1a24);
      px(15, 18, 2, 18, 0x6b4a2a);
      px(1, 1, 30, 19, 0x1e1a24);
      px(2, 2, 28, 17, 0xe8dcc0);
      // The anchor.
      px(15, 4, 2, 12, 0x2b3f6a);
      px(12, 6, 8, 2, 0x2b3f6a);
      px(14, 3, 4, 2, 0x2b3f6a);
      px(9, 13, 2, 2, 0x2b3f6a);
      px(21, 13, 2, 2, 0x2b3f6a);
      px(10, 15, 12, 2, 0x2b3f6a);
      g.generateTexture('sign-port', 32, 36);
      g.destroy();
    }
    const sign = this.add.image(p.door.x - 9, p.door.y + 2, 'sign-port').setOrigin(0.5, 1).setScale(0.5).setDepth(p.door.y + 2);
    this.farObjects.push(sign, this.signGlow(sign));
    const key = ensureHd(this, `hd-${STALE_HD.woznica.id}`);
    if (this.textures.exists(key)) fitHd(this.add.sprite(p.door.x + 6, p.door.y + 1, key, 'down-0')).setTint(0x9fb4e8).setDepth(p.door.y + 3);
  }

  /** The harbour master: the port's fixed ferry lines (no drawing – a ferry always sails the same way). */
  private openPort(p: CityPlace, page = 0) {
    const here = this.city.toLatLon(p.door.x, p.door.y);
    // A ferry landing of the world map: the catalogue port it belongs to (its lines), if any.
    let port = this.porty.get(p.id) ?? null;
    if (!port && (port = portPrzy(here))) this.porty.set(p.id, port);
    const title = `⚓ Kapitan portu – ${port?.nazwa ?? p.name}`;
    // Back to the country's small ports only from those the hero has sailed to/from (owner, 13 Oct 2026).
    const all = port ? rejsyZ(port, session.byl.filter((b) => b.key.startsWith('port|'))) : [];
    void mojeProsby(session.name).then((prosby) => {
      // Answers to this player's earlier requests asked in this port (told once), and the ones still waiting.
      const tu = prosby.filter((r) => r.lat !== null && r.lon !== null && odleglosc({ lat: r.lat, lon: r.lon! }, here) < 3);
      const nowe = tu.filter((r) => r.status !== 'nowe' && !session.seen[`port-odp:${r.id}`]);
      for (const r of nowe) session.seen[`port-odp:${r.id}`] = Date.now();
      const wiesci = [
        ...nowe.map((r) => r.status === 'dodana'
          ? `„Pytałeś o: ${r.text}. Znalazłem kapitana, który zna drogę – sprawdź listę!${r.odpowiedz ? ` ${r.odpowiedz}` : ''}”`
          : `„Pytałeś o: ${r.text}. Niestety, żaden kapitan nie zna tam drogi.${r.odpowiedz ? ` ${r.odpowiedz}` : ''}”`),
        ...tu.filter((r) => r.status === 'nowe').map((r) => `„Wciąż wypytuję innych kapitanów o: ${r.text}.”`),
      ];
      this.portMenu(p, port, title, all, page, here, wiesci.length && !page ? `${wiesci.join('\n')}\n\n` : '');
    });
  }

  private portMenu(p: CityPlace, port: Port | null, title: string, all: ReturnType<typeof rejsyZ>, page: number, here: { lat: number; lon: number }, wiesci: string) {
    const n = PROM.naStronie;
    const list = all.slice(page * n, page * n + n);
    const more = all.length > (page + 1) * n;
    const time = (km: number) => (session.immortal ? 'od razu' : rideText(km, 1, PROM.kmh));
    const dokad = (r: Rejs) => `${r.siec === 'liniowiec' ? '🚢 ' : ''}${r.do.nazwa}${r.siec ? ` (${r.siec === 'flagowy' ? 'port główny, ' : r.siec === 'liniowiec' ? 'liniowiec, ' : ''}${nazwaKraju(krajPortu(r.do)[0])})` : ''}`;
    const lines = list.map((r) => `• ${dokad(r)}: ${r.km} km, ${time(r.km)} – ${cenaRejsu(r.km)} monet`);
    const intro = list.length
      ? `„Ahoj! ${page ? 'A dalej pływamy tam:' : 'Stąd pływamy:'}” Masz ${session.coins} monet.\n\n${lines.join('\n')}\n\nProm płynie ok. ${PROM.kmh} km/h, naprawdę – także gdy zamkniesz grę. Po przypłynięciu grę wczytasz już w tamtym porcie.`
      : '„Ahoj! Stąd na razie pływają tylko kutry rybackie. Ale powiedz, dokąd chciałbyś popłynąć – popytam innych kapitanów.”';
    this.dialog({
      title,
      text: wiesci + intro,
      buttons: [...list.map((r) => `⛴ ${dokad(r)} – ${cenaRejsu(r.km)} 💰`), ...(more ? ['Dalej…'] : []), '🧭 Inne miejsce…', ...(this.mamMapePodroznika() ? [] : [`🗺 Przepisz dworce z mapy – ${MAPA_PODROZNIKA.cena} 💰`]), 'Zostaję'],
      onChoose: (i) => {
        if (more && i === list.length) return this.portMenu(p, port, title, all, page + 1, here, '');
        if (i === list.length + (more ? 1 : 0)) return void this.askDestination(p, port, title, here);
        if (i === list.length + (more ? 2 : 1) && !this.mamMapePodroznika()) return this.buyTravellerMap(() => this.openPort(p, page), title.replace(/^\S+\s/, ''));
        const r = list[i];
        if (!r) return;
        const price = cenaRejsu(r.km);
        if (PROM.odPoziomu && poziomPostaci(session.exp) < PROM.odPoziomu) return this.toast(`⛴ Promem pływa się od ${PROM.odPoziomu}. poziomu postaci.`);
        if (session.coins < price) return this.toast(`Za mało monet: bilet kosztuje ${price}.`);
        const to = { name: r.do.nazwa, lat: r.do.lat, lon: r.do.lon, key: `port|${r.do.nazwa}|${r.do.lat}`, mapId: portMapId(r.do), mapName: r.do.nazwa };
        this.dialog({
          title,
          text: session.immortal
            ? `Rejs do: ${r.do.nazwa} (${r.km} km). Postać testowa płynie od razu. Płyniesz?`
            : `Rejs do: ${r.do.nazwa} (${r.km} km) potrwa ${time(r.km)}. Przez ten czas twoja postać będzie na promie – w tym czasie możesz zagrać inną postacią. Płyniesz?`,
          buttons: [`⛴ Płynę – ${price} 💰`, 'Zostaję'],
          onChoose: (k) => {
            if (k === 0) this.travel({ to, km: r.km, via: null, price, statek: true });
          },
        });
      },
    });
  }

  /**
   * „🧭 Inne miejsce…” (owner, 12 Oct 2026): the player names a country or a port; the captain asks the others
   * and the request goes to us (table port_requests, admin ⚓ Porty). We check it, add a real line, and the
   * captain tells the player on his next visit (`openPort`). Untrusted text – only a wish, never an order.
   */
  private async askDestination(p: CityPlace, port: Port | null, title: string, here: { lat: number; lon: number }) {
    const text = (await askText(title, '„A gdzie to by szanowny chciał popłynąć? Napisz kraj albo port.”', 'np. Kopenhaga, Dania', { ok: 'Powiedz', upper: false }))?.trim();
    if (!text) return;
    // First the captain works out the way through the ferry network (flagship ports, with changes).
    const t = port ? trasaDo(port, text) : null;
    const [isoTu, morskiTu] = port ? krajPortu(port) : [null, false];
    if (!t && port && isoTu && !morskiTu) {
      return this.dialog({ title, text: `„${text}? Stąd pływamy tylko po tutejszych wodach. Na dalekie rejsy musisz dojść do portu nad morzem.”`, buttons: ['Rozumiem'], onChoose: () => {} });
    }
    if (t) {
      if (!t.hops.length) return this.dialog({ title, text: `„${text}? Przecież tu jesteś!”`, buttons: ['Faktycznie'], onChoose: () => {} });
      const droga = [port!.nazwa, ...t.hops.map((h) => h.nazwa)].join(' → ');
      const dni = t.km / PROM.kmh / 24;
      const czas = dni >= 1 ? `ok. ${Math.round(dni)} ${Math.round(dni) === 1 ? 'dnia' : 'dni'}` : `ok. ${Math.max(1, Math.round(dni * 24))} godz.`;
      const pierwszy = t.hops[0];
      const r = (port ? rejsyZ(port, session.byl.filter((b) => b.key.startsWith('port|')), true) : []).find((q) => q.do === pierwszy);
      return this.dialog({
        title,
        text: `„${t.kraj}? ${t.przez ? `Tam promy nie pływają – najbliżej dopłyniesz do ${t.hops[t.hops.length - 1].nazwa} (${t.przez}), a dalej lądem. ` : ''}Stąd prosto się nie da, ale z przesiadkami w głównych portach owszem:\n${droga}\nRazem ok. ${t.km} km po morzu, ${czas} rejsu. Każdy odcinek kupujesz u kapitana w porcie przesiadki.”`,
        buttons: [...(r ? [`⛴ ${pierwszy.nazwa} – ${cenaRejsu(r.km)} 💰`] : []), 'Dobrze'],
        onChoose: (i) => {
          if (i !== 0 || !r) return;
          this.portMenu(p, port, title, [r], 0, here, '');
        },
      });
    }
    const ok = await poprosOLinie(session.name, port?.nazwa ?? p.name, here, text);
    if (ok) void mojeProsby(session.name, true);
    this.dialog({
      title,
      text: ok
        ? `„${text}? Hmm… stąd tam nie pływamy. Porozmawiam z innymi kapitanami – może któryś zna drogę. Zajrzyj jutro.”`
        : '„Na dziś dość pytań – kapitanowie i tak muszą się naradzić przy kuflu. Zajrzyj jutro.”',
      buttons: ['Dobrze'],
      onChoose: () => {},
    });
  }

  /** Premium: a diamond takes the hero to any station they have already arrived at. */
  private diamondRide(title: string) {
    const d = DIAMENT;
    const here = this.city.toLatLon(this.player.x, this.player.y);
    const dist = (s: { lat: number; lon: number }) => Math.hypot((s.lat - here.lat) * 111.13, (s.lon - here.lon) * 111.32 * Math.cos((here.lat * Math.PI) / 180));
    const list = session.byl.filter((s) => s.mapId !== this.city.id || dist(s) > 1).slice(-8).reverse();
    if (!list.length) {
      this.dialog({ title, text: '„Za diament zawiozę cię do każdego miasta, w którym już byłeś – ale jeszcze nigdzie ze mną nie jeździłeś.”', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    this.dialog({
      title,
      text: `„Za ${d.dowolneMiasto} 💎 zawiozę cię, dokąd chcesz – byle tam, gdzie już byłeś.” Masz ${session.diamenty} 💎.`,
      buttons: [...list.map((s) => `💎 ${s.mapName === s.name || s.name.startsWith(s.mapName) ? s.name : `${s.name} (${s.mapName})`}`), 'Wróć'],
      onChoose: (i) => {
        const to = list[i];
        if (!to) return;
        if (session.diamenty < d.dowolneMiasto) {
          this.dialog({ title, text: `Brak diamentów (potrzebny ${d.dowolneMiasto} 💎). Kupisz je w każdym banku.`, buttons: ['OK'], onChoose: () => {} });
          return;
        }
        const k = dist(to);
        this.chooseSpeed(title, { to, km: k, via: null, price: 0 }, d.dowolneMiasto);
      },
    });
  }

  /** With diamonds to spare: ask whether to go twice as fast for one more. */
  private chooseSpeed(title: string, t: Offer, diamonds: number) {
    const d = DIAMENT;
    if (session.immortal || session.diamenty < diamonds + d.szybciej) {
      this.payAndTravel(t, diamonds, 1);
      return;
    }
    this.dialog({
      title,
      text: `Zwykle: ${rideText(t.km)}. Za ${d.szybciej} 💎 więcej: ${rideText(t.km, d.razySzybciej)}.`,
      buttons: ['Zwykle', `⚡ ${d.razySzybciej}× szybciej (+${d.szybciej} 💎)`],
      onChoose: (i) => this.payAndTravel(t, diamonds + (i === 1 ? d.szybciej : 0), i === 1 ? d.razySzybciej : 1),
    });
  }

  private payAndTravel(t: Offer, diamonds: number, times: number) {
    session.diamenty -= diamonds;
    this.travel(t, times, diamonds);
  }

  // ------------------------------------------------------------------ sports

  /** The coach (dummies against the clock) or the runner (a race to another pitch). */
  private talkSport(n: SportNpc) {
    if (n.role === 'sedzia') return this.openArena();
    const now = this.time.now;
    if (n.role === 'trener') {
      const { a, b } = this.training.dummiesOf(n.area);
      const T = SPORT.trener;
      if (!a || !b) return this.dialog({ title: `🏋 ${T.imie}`, text: 'Dziś trenujemy luźno – pobij kukłę, ile chcesz!', buttons: ['OK'], onChoose: () => {} });
      // Just enough time for the blows and two runs, times the difficulty's slack.
      const run = (2 * Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(n.x - a.x, n.y - a.y)) / this.player.speed;
      const secs = Math.ceil(((SPORT.uderzen + 1) * cooldown('miecz') / 1000 + run + 1) * session.level.wyzwanie);
      const secsTxt = `${secs} ${secs % 10 >= 2 && secs % 10 <= 4 && (secs % 100 < 12 || secs % 100 > 14) ? 'sekundy' : 'sekund'}`;
      this.dialog({
        title: `🏋 ${T.imie}`,
        text: T.wyzwanie.replace('{uderzen}', String(SPORT.uderzen)).replace('{czas}', secsTxt),
        buttons: ['Wchodzę!', 'Nie teraz'],
        onChoose: (i) => {
          if (i !== 0 || this.questsFull()) return;
          this.challenge = { kind: 'kukly', npc: n, a, b, step: 'a', hits: 0, start: this.time.now, until: this.time.now + secs * 1000 };
          this.toast(`⏱ Start! ${secsTxt}.`, 1500);
          this.emitHud();
        },
      });
      return;
    }
    const B = SPORT.biegacz;
    const spots = this.training.pitchesAround(n.x, n.y, SPORT.wyscigOdM * PX_PER_M, SPORT.wyscigDoM * PX_PER_M);
    if (!spots.length) return this.dialog({ title: `🏃 ${B.imie}`, text: 'Nie mam dziś z kim się ścigać – w okolicy nie ma innych boisk.', buttons: ['OK'], onChoose: () => {} });
    let h = 2166136261;
    for (const ch of n.id + Math.floor(now / 60000)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const t = spots[(h >>> 0) % spots.length];
    const to = this.city.isFree(t.x, t.y + 5, 3, 2) ? { x: t.x, y: t.y } : this.city.freeNear(t.x, t.y);
    const name = `przy ul. ${this.city.streetNear(to.x, to.y, 200) ?? 'bez nazwy'}`;
    this.dialog({
      title: `🏃 ${B.imie}`,
      text: B.wyzwanie.replace('{cel}', name),
      buttons: ['Start!', 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0 || this.questsFull()) return;
        // She runs along the streets (the shortest way, like a navigation app);
        // her time: that way at the hero's speed, times the difficulty
        // (sometimes she has a lucky day).
        const path = this.city.roadPath({ x: n.x, y: n.y }, to) ?? [n.x, n.y, to.x, to.y];
        const cum = [0];
        for (let i = 2; i < path.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]));
        const est = cum[cum.length - 1] / this.player.speed;
        const lucky = Math.random() < session.level.farta;
        const rivalMs = est * (lucky ? 0.8 : session.level.rywal) * 1000;
        const rival = this.add.sprite(n.x, n.y, SPORTY_TEX, 'down-0').setOrigin(0.5, 0.6);
        this.training.setAway(n, true);
        this.challenge = { kind: 'wyscig', npc: n, name, from: { x: n.x, y: n.y }, to, rival, start: this.time.now, rivalMs, path, cum };
        this.toast('🏃 Start! Biegnij za strzałką!', 1500);
        this.emitHud();
      },
    });
  }

  private dummyHit(st: Station) {
    const c = this.challenge;
    if (c?.kind !== 'kukly') return;
    if (c.step === 'a' && st === c.a) {
      c.hits++;
      if (c.hits >= SPORT.uderzen) {
        c.step = 'b';
        this.toast('Teraz biegnij do drugiej kukły!', 1500);
      }
    } else if (c.step === 'b' && st === c.b) {
      c.step = 'back';
      this.toast('Wracaj do trenera!', 1500);
    }
    this.emitHud();
  }

  private updateChallenge(now: number) {
    const c = this.challenge!;
    const t = this.time.now;
    const p = this.player;
    if (p.isDead) return this.endChallenge(false);
    if (c.kind === 'kukly') {
      if (c.step === 'back' && Math.hypot(p.x - c.npc.x, p.y - c.npc.y) < 24) return this.endChallenge(true);
      if (t > c.until) return this.endChallenge(false);
      return;
    }
    // The runner dashes along the streets (seen only where the hero can see).
    const k = Math.min(1, (t - c.start) / c.rivalMs);
    const along = k * c.cum[c.cum.length - 1];
    let i = 1;
    while (i < c.cum.length - 1 && c.cum[i] < along) i++;
    const seg = c.cum[i] - c.cum[i - 1] || 1;
    const f = Math.max(0, Math.min(1, (along - c.cum[i - 1]) / seg));
    const ax = c.path[(i - 1) * 2], ay = c.path[(i - 1) * 2 + 1], bx = c.path[i * 2], by = c.path[i * 2 + 1];
    const x = ax + (bx - ax) * f;
    const y = ay + (by - ay) * f;
    c.rival.setPosition(x, y).setDepth(y).setVisible(pointInPolygon(this.vision, x, y));
    if (k < 1) {
      const dir = Math.abs(bx - ax) > Math.abs(by - ay) ? 'side' : by < ay ? 'up' : 'down';
      c.rival.setFlipX(dir === 'side' && bx > ax).anims.play(`${SPORTY_TEX}-walk-${dir}`, true);
    }
    if (Math.hypot(p.x - c.to.x, p.y - c.to.y) < 30) return this.endChallenge(true);
    if (k >= 1) return this.endChallenge(false);
    void now;
  }

  private endChallenge(won: boolean) {
    const c = this.challenge!;
    this.challenge = null;
    const S = c.kind === 'kukly' ? SPORT.trener : SPORT.biegacz;
    const reward = c.kind === 'kukly' ? SPORT.nagroda.trener : SPORT.nagroda.biegacz;
    const secs = ((this.time.now - c.start) / 1000).toFixed(1).replace('.', ',');
    if (c.kind === 'wyscig') {
      c.rival.anims.stop();
      c.rival.setFrame('down-0');
      // She walks back to her pitch later.
      this.time.delayedCall(4000, () => {
        c.rival.destroy();
        this.training.setAway(c.npc, false);
      });
    }
    if (won) {
      earn(reward.monety);
      session.exp += reward.exp;
    }
    this.dialog({
      title: `${c.kind === 'kukly' ? '🏋' : '🏃'} ${S.imie}`,
      text: `${won ? S.wygrana : S.przegrana}\n\nTwój czas: ${secs} s.${won ? `\nNagroda: ${reward.monety} monet i ${reward.exp} EXP.` : ''}`,
      buttons: ['OK'],
      onChoose: () => {},
    });
    this.emitHud();
  }

  /** People spoken to per town (new towns' greeting, bug report 18). */
  private townTalks: Record<string, number> = {};

  /**
   * World maps: the town or village the hero is in, learnt only from a passer-by (bug report 67, owner:
   * „sprawdzaj lokalizację dopiero po zapytaniu człowieka”). `name` '' = asked here, nothing nearby.
   */
  private localTown: { m: string; name: string; x: number; y: number; r: number; wies: boolean; ax: number; ay: number } | null = null;
  private askingTown = false;

  /** The town learnt from a passer-by, while the hero is still in it or near where he asked. */
  private localNear(x = this.player.x, y = this.player.y) {
    const t = this.localTown;
    if (!t || t.m !== this.city.id) return null;
    const inTown = t.name && Math.hypot(t.x - x, t.y - y) <= t.r * 1.3;
    return inTown || Math.hypot(t.ax - x, t.ay - y) <= MIEJSCOWOSC.pamietajM * PX_PER_M ? t : null;
  }

  /** On a world map: the town to name at (x, y) – the one a passer-by told, else the map's own city near its centre, else none. */
  private worldTown(x: number, y: number): string | null {
    const t = this.localNear(x, y);
    if (t) return t.name || null;
    const o = worldOrigin(this.city.id);
    if (!o) return null;
    const c = this.city.fromLatLon(o.lat, o.lon);
    return Math.hypot(c.x - x, c.y - y) <= MIEJSCE_HUD.miastoM * 1.5 * PX_PER_M ? mapName(this.city.id) : null;
  }

  /** Asks the world map which town this is (once per spot); then `then` runs (a passer-by's answer). */
  private learnTown(then: () => void) {
    const ll = this.city.toLatLon(this.player.x, this.player.y);
    const ax = this.player.x, ay = this.player.y, m = this.city.id;
    this.askingTown = true;
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), MIEJSCOWOSC.czekajMs));
    void Promise.race([nearestLocality(ll.lat, ll.lon, lang), timeout]).catch(() => null).then((p) => {
      this.askingTown = false;
      if (m !== this.city.id) return;
      if (p) {
        const c = this.city.fromLatLon(p.lat, p.lon);
        this.localTown = { m, name: p.name, x: c.x, y: c.y, r: p.r * PX_PER_M, wies: p.size === 'village', ax, ay };
      } else this.localTown = { m, name: '', x: ax, y: ay, r: 0, wies: false, ax, ay };
      this.emitHud();
      then();
    });
  }

  /** The town the hero is in, by name (null when the map knows none). */
  private townHere(): string | null {
    const w = this.whereIs(this.player.x, this.player.y);
    const town = w.includes(',') ? w.slice(w.lastIndexOf(',') + 1).trim() : w;
    return town && town !== 'Daleko' ? town : null;
  }

  /** Country (2 letters) and town for the newspaper's rankings; world maps without a known town give none. */
  private kurierMiejsce(): { k: string | null; c: string | null } {
    const ll = this.city.toLatLon(this.player.x, this.player.y);
    const town = this.townHere() ?? mapName(this.city.id);
    return { k: krajMapy(this.city.id, ll?.lat ?? NaN, ll?.lon ?? NaN), c: town && !town.startsWith('w:') ? town : null };
  }

  /**
   * The newsboy (owner, 11 Oct 2026): stands on a corner and shouts. A talk opens a few words and a
   * choice first – read the paper, help deliver papers (every ROZNOSZENIE.co-th newsboy), goodbye.
   */
  private newsboy(f: Folk) {
    this.samouczek?.gazeciarz();
    const day = new Date().toISOString().slice(0, 10);
    let h = 0;
    for (const ch of `${f.id}:${day}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const shout = tr(GAZETA.okrzyki[Math.abs(h) % GAZETA.okrzyki.length]);
    const d = newsboyDelivers(f) ? newsboyDelivery(this.city, f) : null;
    const buttons: string[] = [tr(ROZMOWA.czytaj)];
    const acts: (() => void)[] = [() => this.newspaper(f)];
    if (d) {
      const st = missionState(d);
      const known = this.missions.find((r) => r.m.id === d.id);
      if (st === 'new' || !known) {
        buttons.push(tr(ROZMOWA.roznos));
        acts.push(() => {
          if (this.questsFull()) return this.dialog({ title: `🗞 ${f.name}`, text: tr(GZ.pelno), buttons: ['OK'], onChoose: () => {} });
          const rm: ResolvedMission = { m: d, door: { x: f.x, y: f.y }, target: stageTarget(this.city, d, { x: f.x, y: f.y }) };
          this.openMissionDialog(rm, () => {
            session.gen[d.id] = d;
            this.addMission(rm, false);
          });
        });
      } else {
        buttons.push(tr(ROZMOWA.jakIdzie));
        acts.push(() => {
          const left = st === 'done' ? '' : this.etapy.progress(d.id).replace(/[()\s]/g, '');
          const [got, all] = left.split('/').map(Number);
          const text = st === 'done' ? tr(ROZMOWA.zrobione)
            : !d.etapy?.length ? `${d.zadanie.cel} – ${tx('pospiesz się, czekają na ciebie!', 'hurry, they’re waiting!')}`
            : tr(ROZMOWA.wToku).replace('{zostalo}', String(Number.isFinite(all - got) ? all - got : '?')).replace('{ulica}', d.zadanie.cel?.split(': ').pop() ?? '');
          this.dialog({ title: `🗞 ${f.name}`, text, buttons: ['OK'], onChoose: () => {} });
        });
      }
    }
    buttons.push(tr(ROZMOWA.pa));
    acts.push(() => {});
    this.dialog({ title: `🗞 ${f.name}`, text: tx(`„${shout}”`, `“${shout}”`), buttons, onChoose: (i) => acts[i]?.() });
  }

  /** The „Kurier Parowy” itself: front page news, rankings, workshop, the reporter's errand, letters. */
  private newspaper(f: Folk) {
    const m = newsboyMission(this.city, f);
    const known = m ? this.missions.find((r) => r.m.id === m.id) : undefined;
    const st = m ? missionState(m) : null;
    const stan = !m ? 'brak' : known && st !== 'new' ? (st === 'done' ? 'zrobione' : 'wziete') : this.questsFull() ? 'pelno' : 'nowe';
    const town = this.townHere() ?? mapName(this.city.id);
    const where = this.kurierMiejsce();
    this.scene.pause();
    resetTouch();
    void showGazeta({
      sprzedawca: f.name,
      miasto: town && !town.startsWith('w:') ? town : tr(GZ.okolica),
      zlecenie: { tytul: m?.tytul ?? '', opis: m?.opis ?? '', stan },
      kraj: where.k,
      wiesci: async () => {
        if (offline.demo) return [];
        try {
          return await rpc<WiescSerwera[]>('kurier_wiesci', { p_kraj: where.k, p_miasto: where.c, p_test: TEST });
        } catch {
          return null;
        }
      },
      wydanie: async () => {
        if (offline.demo) return null;
        try {
          return await rpc<Wydanie>('kurier_wydanie', { p_token: session.token, p_kraj: where.k, p_miasto: where.c });
        } catch {
          return null;
        }
      },
      lamiglowka: offline.demo ? undefined : {
        poziom: trudnoscZWieku(session.age),
        rozwiazana: (dzien) => session.daily.lamiglowka?.d === dzien,
        rozwiaz: (dzien, rodzaj, sekundy) => {
          session.daily.lamiglowka = { d: dzien, n: 1, a: 1 };
          session.exp += LAMIGLOWKA.nagrodaExp;
          session.stats.lamiglowki = (session.stats.lamiglowki ?? 0) + 1;
          this.emitHud();
          void this.save();
          void rpc('lamiglowka_rozwiazana', { p_token: session.token, p_dzien: dzien, p_poziom: trudnoscZWieku(session.age), p_rodzaj: rodzaj, p_sekundy: sekundy }).catch(() => {});
        },
      },
      wyslij: async (text) => {
        if (offline.demo) return 'ok';
        const ll = this.city.toLatLon(this.player.x, this.player.y);
        const ctx = { mapa: this.city.id, miasto: town, lat: ll?.lat, lon: ll?.lon, ulica: this.whereIs(this.player.x, this.player.y),
          wersja: TEST ? `${WERSJA_TEST}-test` : WERSJA, poziom: poziomPostaci(session.exp), jezyk: lang, time: new Date().toISOString() };
        try {
          return (await rpc<boolean>('order_quest', { p_player: session.name || null, p_text: text.slice(0, 500), p_ctx: ctx })) ? 'ok' : 'limit';
        } catch {
          return 'blad';
        }
      },
    }).then((took) => {
      this.scene.resume();
      resetTouch();
      if (!took || !m || known) return;
      const rm: ResolvedMission = { m, door: { x: f.x, y: f.y }, target: resolvePlace(this.city, m.zadanie.miejsce) };
      this.openMissionDialog(rm, () => {
        session.gen[m.id] = m;
        this.addMission(rm, false);
      });
    });
  }

  /** A passer-by: says hello, and some want a duel. */
  private talkToFolk(f: Folk) {
    // World maps: which town this is, asked of the passer-by first (a quick look at the world map's place names).
    if (worldOrigin(this.city.id) && !this.localNear() && !this.askingTown && !demo.on) return this.learnTown(() => this.talkToFolk(f));
    if (f.role === 'gazeciarz') return this.newsboy(f);
    const M = MIESZKANCY;
    let h = 2166136261;
    for (const ch of f.id + today()) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const pick = (a: string[]) => a[(h >>> 0) % a.length];
    let hello = pick(M.powitania);
    // A town the hero hasn't been to (bug report 18): the 1st and 3rd person spoken to say where we are.
    const town = this.townHere();
    const key = `miasto:${town}`;
    if (town && !(key in session.seen)) {
      const c = (this.townTalks[town] = (this.townTalks[town] ?? 0) + 1);
      if (c >= 3) session.seen[key] = dayNumber(today());
      if ((c === 1 || c === 3) && !f.beaten && f.role !== 'wyzywa' && !(this.folkQuest?.folk === f)) {
        hello = M.nowyWMiescie[(h >>> 5) % M.nowyWMiescie.length].replace('{miasto}', town);
        this.dialog({ title: `🙂 ${f.name}`, text: hello, buttons: ['Dzień dobry!'], onChoose: () => {} });
        return;
      }
    }
    // Imps stole something: an errand into the fields (one at a time).
    const q = this.folkQuest;
    if (q && q.folk === f) return this.folkQuestTalk();
    // Someone helped today only says thank you again (bug report 55: the same request came back at once).
    const helped = session.daily[`pomoc:${f.id}`]?.d === today();
    if (helped) {
      this.dialog({ title: `🙂 ${f.name}`, text: PROSBY.znowu, buttons: ['Dzień dobry!'], onChoose: () => {} });
      return;
    }
    if (!q && f.role === 'wita' && !f.beaten && ((h >>> 9) % 1000) / 1000 < PROSBY.szansa && this.offerFolkQuest(f, h)) return;
    // Some tell where they are going – and go there along the streets.
    if (f.role === 'wita' && !f.beaten && ((h >>> 3) % 100) / 100 < M.sprawunki) {
      const errand = this.errandFor(f);
      if (errand) {
        this.dialog({ title: `🙂 ${f.name}`, text: errand.text, buttons: ['Miłego dnia!'], onChoose: () => this.folk.sendTo(f, errand.route) });
        return;
      }
    }
    if (f.beaten || f.role === 'wita') {
      this.dialog({ title: `🙂 ${f.name}`, text: f.beaten ? 'Ech, dobra to była walka! Dzień dobry.' : hello, buttons: ['Dzień dobry!'], onChoose: () => {} });
      return;
    }
    if (f.role === 'wyzywa') {
      this.dialog({ title: `⚔ ${f.name}`, text: pick(M.wyzwanie), buttons: ['⚔ Walczymy!', 'Nie dziś'], onChoose: (i) => i === 0 && this.startDuel(f) });
      return;
    }
    this.dialog({
      title: `🙂 ${f.name}`,
      text: hello,
      buttons: ['Dzień dobry!', '⚔ Wyzwij na pojedynek'],
      onChoose: (i) => {
        if (i === 1) this.dialog({ title: `⚔ ${f.name}`, text: pick(M.przyjmuje), buttons: ['Do dzieła!'], onChoose: () => this.startDuel(f) });
      },
    });
  }

  /** Imps stole something from a passer-by: what, where they ran, the thieves, who is waiting. */
  private folkQuest: {
    folk: Folk;
    zguba: (typeof PROSBY.zguby)[number];
    target: { x: number; y: number };
    gdzie: string;
    kierunek: string;
    enemies: Enemy[];
    item?: Phaser.GameObjects.Image;
    got: boolean;
  } | null = null;

  /** A quiet spot in the fields, meadows or a wood 300–900 m from (x, y), away from places and gangs. */
  private questSpot(x: number, y: number): { x: number; y: number; kind: string } | null {
    const [lo, hi] = PROSBY.odlegloscM;
    for (let t = 0; t < 200; t++) {
      const a = Math.random() * Math.PI * 2;
      const d = (lo + Math.random() * (hi - lo)) * PX_PER_M;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      const box = { x0: px - 60, y0: py - 60, x1: px + 60, y1: py + 60 };
      if (!this.city.ready(box) || !this.city.isFree(px, py + FEET.dy, 6, 6) || this.streets.blocks(px, py)) continue;
      const kinds = this.city.areaKindsAt(px, py);
      const kind = ['forest', 'farmland', 'scrub', 'grass'].find((k) => kinds.includes(k));
      if (!kind && t < 150) continue;
      if (this.city.places.some((p) => Math.hypot(p.door.x - px, p.door.y - py) < 150 * PX_PER_M)) continue;
      return { x: px, y: py, kind: kind ?? '' };
    }
    return null;
  }

  private offerFolkQuest(f: Folk, h: number): boolean {
    const spot = this.questSpot(f.x, f.y);
    if (!spot) return false;
    const P = PROSBY;
    const zguba = P.zguby[(h >>> 4) % P.zguby.length];
    const gdzie = spot.kind === 'forest' ? 'do lasu' : spot.kind === 'farmland' ? 'w pole' : spot.kind === 'scrub' ? 'w zarośla' : spot.kind === 'grass' ? 'na łąkę' : 'za zabudowania';
    const ang = Math.atan2(spot.y - f.y, spot.x - f.x);
    const kierunek = ['wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód', 'północ', 'północny wschód'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    const m = Math.round(Math.hypot(spot.x - f.x, spot.y - f.y) / PX_PER_M / 50) * 50;
    const text = P.prosba[(h >>> 7) % P.prosba.length].replace('{co}', zguba.co).replace('{gdzie}', gdzie).replace('{m}', String(m)).replace('{kierunek}', kierunek);
    this.dialog({
      title: `😟 ${f.name}`,
      text, // no reward told up front (owner 7 Oct 2026)
      buttons: ['Pomogę! ⚔', 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0 || this.folkQuest || this.questsFull()) return;
        const enemies: Enemy[] = [];
        for (let k = 0; k < P.ile; k++) {
          for (let t = 0; t < 60; t++) {
            const a = Math.random() * Math.PI * 2;
            const r = 6 + Math.random() * (tury() ? 12 : 30);
            const x = spot.x + Math.cos(a) * r;
            const y = spot.y + Math.sin(a) * r;
            if (!this.city.isFree(x, y + FEET.dy, FEET.hw, FEET.hh)) continue;
            const e = this.spawnEnemy(x, y, undefined, 'glut');
            e.temp = true;
            e.folkQuest = true;
            e.roam = tury() ? 6 : 30;
            enemies.push(e);
            break;
          }
        }
        if (!enemies.length) return;
        enemies[Math.floor(Math.random() * enemies.length)].carrier = true;
        f.waiting = true;
        this.folkQuest = { folk: f, zguba, target: { x: spot.x, y: spot.y }, gdzie, kierunek, enemies, got: false };
        this.emitHud();
      },
    });
    return true;
  }

  /** One of the thieves fell; the one carrying the loot drops it. */
  private folkQuestKill(e: Enemy) {
    const q = this.folkQuest;
    if (!q) return;
    q.enemies = q.enemies.filter((x) => x !== e);
    if (e.carrier && !q.got && !q.item) {
      const item = this.add.image(e.x, e.y, TEX.questItem).setDepth(e.y - 8);
      item.setData('kind', 'quest');
      this.pickups.push(item);
      q.item = item;
      this.toast(`${q.zguba.ikona} Chochlik upuścił: ${q.zguba.nazwa}!`, 2500);
    }
    this.emitHud();
  }

  private folkQuestTalk() {
    const q = this.folkQuest!;
    const f = q.folk;
    if (!q.got) {
      this.dialog({ title: `😟 ${f.name}`, text: PROSBY.czekam.replace('{gdzie}', q.gdzie).replace('{kierunek}', q.kierunek), buttons: ['Już idę!'], onChoose: () => {} });
      return;
    }
    const r = PROSBY.nagroda;
    earn(r.monety);
    session.exp += r.exp;
    session.stats.missions++;
    f.waiting = false;
    session.daily[`pomoc:${f.id}`] = { d: today(), n: 1, a: 1 };
    for (const k of Object.keys(session.daily)) if (k.startsWith('pomoc:') && session.daily[k].d !== today()) delete session.daily[k];
    for (const e of q.enemies) e.temp = true;
    this.folkQuest = null;
    this.dialog({ title: `😊 ${f.name}`, text: `${PROSBY.dziekuje.replace('{nazwa}', q.zguba.nazwa)}\n\n+${r.monety} monet, +${r.exp} EXP`, buttons: ['Nie ma za co!'], onChoose: () => {} });
    this.emitHud();
    this.save();
  }

  /** Where a passer-by is going today (by the day of the week) and the way there. */
  private errandFor(f: Folk): { text: string; route: number[] } | null {
    const M = MIESZKANCY.sprawa;
    const day = new Date().getDay(); // 0 = Sunday
    const DAYS = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
    const kind = day === 0 ? 'kosciol' : day === 5 ? 'boisko' : day === 6 ? 'sklep' : f.id.length % 2 ? 'bank' : 'sklep';
    const R = 900 * PX_PER_M;
    let to: { x: number; y: number; name: string } | null = null;
    if (kind === 'boisko') {
      const p = this.training.pitchesAround(f.x, f.y, 50 * PX_PER_M, R).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      if (p) to = { ...this.city.freeNear(p.x, p.y), name: this.city.streetNear(p.x, p.y, 200) ?? 'bez nazwy' };
    } else {
      const want = kind === 'kosciol' ? 'church' : kind === 'bank' ? 'bank' : 'shop';
      const p = this.city.places.filter((q) => q.kind === want && Math.hypot(q.door.x - f.x, q.door.y - f.y) < R)
        .sort((a, b) => Math.hypot(a.door.x - f.x, a.door.y - f.y) - Math.hypot(b.door.x - f.x, b.door.y - f.y))[0];
      if (p) to = { x: p.door.x, y: p.door.y, name: p.name };
    }
    if (!to) return null;
    const route = this.city.roadPath({ x: f.x, y: f.y }, to);
    if (!route) return null;
    const lines = M[kind];
    const text = lines[f.id.length % lines.length].replace('{nazwa}', to.name).replace('{dzien}', DAYS[day]).replace('{ulica}', to.name);
    return { text, route };
  }

  /**
   * The townsman becomes a fighter: his life and blows are a share of the
   * hero's (difficulty `pojedynek`); the hero fights on 3 purple hearts.
   */
  private startDuel(f: Folk) {
    if (this.duelHp !== null) return;
    const k = session.level.pojedynek;
    const hearts = MIESZKANCY.serduszka * 2;
    const e = this.spawnEnemy(f.x, f.y, 'duel', 'wojownik');
    e.setTexture(isHd(f.tex) ? ensureRed(this, f.tex) : `${f.tex}-red`, 'down-0').setOrigin(0.5, 0.6);
    if (isHd(f.tex)) fitHd(e);
    e.walkAnim = `${f.tex}-red-walk`;
    // As many of the hero's blows as he has hearts, times the difficulty share.
    e.hp = Math.max(1, Math.round(hearts * k * meleeDamage()));
    e.chasing = true;
    e.duel = { folk: f, dmg: k };
    this.folk.away(f, true);
    this.duelHp = hearts;
    this.duelCarry = 0;
    this.toast(`⚔ Pojedynek! Masz ${MIESZKANCY.serduszka} fioletowe serduszka.`, 2500);
    this.emitHud();
    // Turn fight: the duel is fought in turns at once (the challenge was the question).
    if (tury()) {
      e.chasing = false;
      this.startWalka([e]);
    }
  }

  private endDuel(e: Enemy, won: boolean) {
    const f = e.duel!.folk;
    this.enemies = this.enemies.filter((x) => x !== e);
    if (!won) e.destroy();
    this.duelHp = null;
    this.duelCarry = 0;
    f.x = f.walker.x;
    f.y = f.walker.y;
    this.folk.away(f, false);
    const M = MIESZKANCY;
    if (won) {
      f.beaten = true;
      session.exp += M.nagrodaExp;
      session.stats.duels = (session.stats.duels ?? 0) + 1;
      this.dialog({ title: `🏆 ${f.name}`, text: `${M.wygrana[session.stats.duels % M.wygrana.length]}\n\n+${M.nagrodaExp} EXP`, buttons: ['Dziękuję za walkę!'], onChoose: () => {} });
    } else {
      // No death in a duel: just one real heart lost.
      this.player.hp = Math.max(1, this.player.hp - 2);
      this.dialog({ title: `😵 ${f.name}`, text: `${M.przegrana[Math.floor(Math.random() * M.przegrana.length)]}\n\nTracisz jedno serduszko.`, buttons: ['Następnym razem…'], onChoose: () => {} });
    }
    this.emitHud();
  }

  /** A bank: deposits for a few days that come back with interest. */
  private async openBank(p: CityPlace) {
    const title = `🏦 ${p.name}`;
    let now: number;
    try {
      now = new Date(await api.now()).getTime();
    } catch {
      this.dialog({ title, text: 'Bank chwilowo nieczynny (brak połączenia z serwerem).', buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const DAY = 86_400_000;
    const ends = (l: (typeof session.lokaty)[number]) => l.od + l.dni * DAY;
    const interest = (l: (typeof session.lokaty)[number]) => Math.floor((l.kwota * l.procent) / 100);
    const ready = session.lokaty.filter((l) => ends(l) <= now);
    const waiting = session.lokaty.filter((l) => ends(l) > now);
    const left = (l: (typeof session.lokaty)[number]) => {
      const h = Math.ceil((ends(l) - now) / 3_600_000);
      return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h`;
    };
    const lines = [
      ...ready.map((l) => `• ${l.kwota} monet (+${l.procent}%) – gotowa, odbierzesz ${l.kwota + interest(l)}`),
      ...waiting.map((l) => `• ${l.kwota} monet (+${l.procent}%) – zostało ${left(l)}`),
    ];
    const buttons: string[] = [];
    const acts: (() => void)[] = [];
    if (ready.length) {
      const sum = ready.reduce((s, l) => s + l.kwota + interest(l), 0);
      buttons.push(`💰 Odbierz ${sum} monet`);
      acts.push(() => {
        for (const l of ready) {
          session.coins += l.kwota;
          earn(interest(l));
        }
        session.lokaty = waiting;
        this.emitHud();
        this.save();
        this.toast(`Odebrałeś ${sum} monet z odsetkami!`, 2500);
      });
    }
    if (session.lokaty.length < BANK.maksLokat && session.coins >= BANK.minKwota) {
      buttons.push('📈 Załóż lokatę');
      acts.push(() => this.newDeposit(title));
    }
    if (waiting.length) {
      buttons.push('Zerwij lokatę (bez odsetek)');
      acts.push(() => this.breakDeposit(title, waiting, left));
    }
    buttons.push('💎 Diamenty');
    acts.push(() => this.buyDiamond(title));
    buttons.push('Wyjdź');
    this.dialog({
      title,
      text: `Masz ${session.coins} monet.${lines.length ? `\n\nTwoje lokaty:\n${lines.join('\n')}` : '\n\nOddaj nam monety na kilka dni, a oddamy więcej! Odebrać możesz w każdym banku.'}`,
      buttons,
      onChoose: (i) => acts[i]?.(),
    });
  }

  /** Diamonds (premium currency): for coins now, for real money later. */
  private buyDiamond(title: string) {
    const d = DIAMENT;
    const fmt = (n: number) => n.toLocaleString('pl-PL');
    this.dialog({
      title,
      text: `💎 Diament to waluta premium. U woźnicy za ${d.dowolneMiasto} 💎 pojedziesz do dowolnego miasta, w którym już byłeś, a za kolejny ${d.szybciej} 💎 dojedziesz ${d.razySzybciej}× szybciej.\n\nCena: ${fmt(d.monet)} monet. ${DIAMENT_WSPIERAJACY}\n\nMasz ${fmt(session.coins)} monet i ${session.diamenty} 💎.`,
      buttons: [`Kup za ${fmt(d.monet)} 💰`, 'Nie teraz'],
      onChoose: (i) => {
        if (i === 0) {
          if (session.coins < d.monet) return this.toast(`Za mało monet – diament kosztuje ${fmt(d.monet)}.`, 2500);
          spend(d.monet);
          session.diamenty++;
          this.emitHud();
          this.save();
          this.toast(`💎 Masz ${session.diamenty} ${session.diamenty === 1 ? 'diament' : 'diamenty'}!`, 2500);
        }
      },
    });
  }

  private newDeposit(title: string) {
    this.dialog({
      title,
      text: `Na jak długo? Lokatę można założyć od ${BANK.minKwota} do ${BANK.maksKwota} monet.`,
      buttons: [...LOKATY.map((l) => `${l.nazwa}: +${l.procent}%`), 'Anuluj'],
      onChoose: async (i) => {
        const l = LOKATY[i];
        if (!l) return;
        this.scene.pause();
        const max = Math.min(session.coins, BANK.maksKwota);
        const txt = await askText('🏦 Lokata ' + l.nazwa, `Ile monet wpłacasz? Masz ${session.coins}. Po ${l.dni} ${l.dni === 1 ? 'dniu' : 'dniach'} dostaniesz ${l.procent}% więcej.`, String(max), { value: String(max), ok: 'Wpłacam', number: true });
        this.scene.resume();
        consumeAttack();
        if (txt === null) return;
        const kwota = Math.floor(Number(txt.replace(/\s/g, '')) || max);
        if (kwota < BANK.minKwota || kwota > max) {
          this.toast(`Kwota musi być od ${BANK.minKwota} do ${max} monet.`, 2500);
          return;
        }
        let now: number;
        try {
          now = new Date(await api.now()).getTime();
        } catch {
          this.toast('Brak połączenia z bankiem – spróbuj za chwilę.', 2500);
          return;
        }
        session.coins -= kwota;
        session.lokaty.push({ kwota, od: now, dni: l.dni, procent: l.procent });
        this.emitHud();
        this.save();
        this.toast(`Wpłaciłeś ${kwota} monet ${l.nazwa}. Odbierzesz ${kwota + Math.floor((kwota * l.procent) / 100)}.`, 3000);
      },
    });
  }

  private breakDeposit(title: string, waiting: typeof session.lokaty, left: (l: (typeof session.lokaty)[number]) => string) {
    this.dialog({
      title,
      text: 'Którą lokatę zerwać? Dostaniesz z powrotem same monety, bez odsetek.',
      buttons: [...waiting.map((l) => `${l.kwota} monet (zostało ${left(l)})`), 'Anuluj'],
      onChoose: (i) => {
        const l = waiting[i];
        if (!l) return;
        session.lokaty = session.lokaty.filter((x) => x !== l);
        session.coins += l.kwota;
        this.emitHud();
        this.save();
        this.toast(`Zerwałeś lokatę: wraca ${l.kwota} monet.`, 2500);
      },
    });
  }

  /** A hotel: saves the game here, and the next login starts at this door. */
  private openHotel(p: CityPlace) {
    const here = session.at && session.at.m === this.city.id && Math.hypot(session.at.x - p.door.x, session.at.y - p.door.y) < 4;
    const title = `🏨 ${p.name}`;
    // In the hotel where the hero sleeps the chest (the same one as at home) is in the room.
    const chest = here ? ['📦 Skrzynia w pokoju'] : [];
    if (session.coins < HOTEL_CENA) {
      this.dialog({
        title, text: `Nocleg kosztuje ${HOTEL_CENA} monet, a masz ${session.coins}. Recepcjonista kręci głową.`, buttons: [...chest, 'OK'],
        onChoose: (i) => (chest.length && i === 0 ? this.openChest('w pokoju hotelowym') : undefined),
      });
      return;
    }
    this.dialog({
      title,
      text: `Nocleg z zapisem gry kosztuje ${HOTEL_CENA} monet (masz ${session.coins}). Po wczytaniu postaci zaczniesz właśnie tutaj.\n\n${tury()
        ? `Wyśpisz się: pełne zdrowie, a przez ${WALKA_TUROWA.hotel.minut} minut po pobudce więcej szczęścia w walce, jeden ruch więcej w każdej turze i o ${Math.round(HOTEL_PREMIA.szybciej * 100)}% szybszy krok.`
        : `Wyśpisz się: pełne zdrowie, ${HOTEL_PREMIA.niebieskichSerc} niebieskie serduszka i o ${Math.round(HOTEL_PREMIA.szybciej * 100)}% szybszy krok przez ${HOTEL_PREMIA.minut} minut.`}${here ? '\n\nTo twój obecny hotel – w pokoju czeka twoja skrzynia.' : ''}`,
      buttons: [`🛏 Śpię tu (${HOTEL_CENA} 💰)`, ...chest, 'Nie teraz'],
      onChoose: (i) => {
        if (chest.length && i === 1) return this.openChest('w pokoju hotelowym');
        if (i !== 0) return;
        spend(HOTEL_CENA);
        session.at = { m: this.city.id, x: p.door.x, y: p.door.y };
        this.player.heal(PLAYER.maxHp);
        // Well rested: blue hearts and faster walking for a while.
        const until = Date.now() + HOTEL_PREMIA.minut * 60_000;
        if (tury()) {
          // Turn fight (owner, 17 Oct 2026): instead of blue hearts more luck and one more move per turn (kept in the save).
          session.flagi.wyspany = Date.now() + WALKA_TUROWA.hotel.minut * 60_000;
        } else {
          this.player.extra = HOTEL_PREMIA.niebieskichSerc * 2;
          this.player.extraUntil = until;
        }
        this.player.boost = HOTEL_PREMIA.szybciej;
        this.player.boostUntil = until;
        this.emitHud();
        this.save();
        this.toast(tury()
          ? `🛏 Wyspany! Gra zapisana. Przez ${WALKA_TUROWA.hotel.minut} minut: ☘ więcej szczęścia i +1 ruch w każdej turze walki.`
          : `🛏 Wyspany! Gra zapisana. ${HOTEL_PREMIA.niebieskichSerc} niebieskie serduszka i szybszy krok na ${HOTEL_PREMIA.minut} minut.`, 3500);
      },
    });
  }

  /** A night under canvas: save, load point here, half the health back. */
  private sleepInTent(x: number, y: number, what: string) {
    session.at = { m: this.city.id, x, y };
    this.player.heal(Math.round(PLAYER.maxHp / 2));
    this.emitHud();
    this.save();
    this.toast(`⛺ ${what} Gra zapisana – tu zaczniesz po wczytaniu.`, 3000);
  }

  /** A camp site (a real one, or one in a village). */
  private openCamp(p: CityPlace) {
    const title = `⛺ ${p.name}`;
    const price = session.namioty.length ? 0 : NAMIOT.cenaPola;
    this.dialog({
      title,
      text: `Trawa, ognisko i miejsce na namiot. Nocleg ${price ? `kosztuje ${price} monet (masz ${session.coins})` : 'jest za darmo – masz własny namiot (zużyje się o jeden nocleg)'}: zapis gry i tu zaczniesz po wczytaniu. Na ziemi śpi się gorzej niż w hotelu – odzyskasz połowę zdrowia.`,
      buttons: [price ? `⛺ Śpię tu (${price} 💰)` : '⛺ Rozbijam namiot', 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0) return;
        if (price && session.coins < price) return this.toast(`Za mało monet – nocleg kosztuje ${price}.`, 2500);
        if (price) spend(price);
        else this.wearTent();
        this.sleepInTent(p.door.x, p.door.y, 'Dobranoc przy ognisku!');
      },
    });
  }

  /** DIY and sports shops: tents (a small one for 20 nights, a super one for 500). */
  private openGearShop(p: CityPlace) {
    const kinds = NAMIOT.rodzaje;
    const have = session.namioty.length ? `\n\nTwoje namioty: ${this.tentsText()}.` : '';
    // The axe: buy one, or sharpen a blunt one.
    const ax = item('siekiera')!;
    const owned = [gear.equip.bron, ...gear.bag.map((s) => ('item' in s ? s.item : null))].find((id) => id === ax.id);
    const fixes = this.sellsAxe(p) ? repairable().filter(id => item(id)?.miejsce === 'bron') : [];
    const tools: [string, () => void][] = !this.sellsAxe(p) || owned ? [] : [[this.label(ax), () => this.buy(ax)]];
    const vehicles = SIEKIERA.sportowy.test(p.name)
      ? PRZEDMIOTY.filter((it) => it.pojazd && !this.ownsVehicle(it.id)) : [];
    const entries: ShopEntry[] = [
      ...vehicles.map((v, i) => shopItem(v, i, this.cenaDla(v))),
      ...fixes.map((id, i): ShopEntry => ({ id: `repair:${id}`, index: vehicles.length + tools.length + kinds.length + i,
        name: `Napraw: ${item(id)!.nazwa}`, category: 'services', picture: itemPictureUrl(id),
        description: 'Warsztat budowlany naprawi twoją broń i narzędzia.',
        stats: [['Wytrzymałość', `${condition(id)!.left}/${condition(id)!.max}`]], price: repairCost(id), action: 'NAPRAW', refresh: true })),
      ...tools.map((_, i) => shopItem(ax, vehicles.length + i, this.cenaDla(ax))),
      ...kinds.map((k, i): ShopEntry => ({ id: `tent:${i}`, index: vehicles.length + tools.length + i, name: k.nazwa,
        category: 'supplies', description: 'Rozłożysz go w lesie albo na polu z karty postaci. Nocleg zapisuje grę i miejsce startu.',
        stats: [['Noclegi', String(k.noclegow)]], price: k.cena, action: 'KUP', refresh: true })),
    ];
    this.shopDialog(p, {
      title: `🏕 ${p.name}`,
      text: `Na półkach leżą namioty${tools.length && !owned ? ' i siekiery' : ''}${vehicles.length ? ' oraz pojazdy' : ''}. Namiot rozłożysz w lesie albo na polu (karta postaci 👤) i prześpisz się tam – zapis gry i miejsce startu. Każdy nocleg trochę zużywa namiot.${tools.length ? ' Z siekierą ścięte drzewo daje drewno, a nie chrust.' : ''}${vehicles.length ? ' Pojazd trzymaj w plecaku; wsiądziesz obrazkiem w panelu gry.' : ''} Masz ${session.coins} monet${vehicles.length ? ` i ${session.diamenty} 💎` : ''}.${have}`,
      buttons: [...vehicles.map((v) => this.label(v)), ...tools.map(([l]) => l), ...kinds.map((k) => `⛺ ${k.nazwa}: ${k.noclegow} noclegów – ${k.cena} 💰`),
        ...fixes.map(id => `Napraw: ${item(id)!.nazwa} – ${repairCost(id)} monet`), 'Wyjdź'],
      icons: [...vehicles.map((v) => itemTexture(v.id)), ...tools.map(() => itemTexture('siekiera')), ...kinds.map(() => null), ...fixes.map(id => itemTexture(id)), null],
      onChoose: (i) => {
        if (vehicles[i]) return this.buy(vehicles[i]);
        i -= vehicles.length;
        if (tools[i]) return tools[i][1]();
        const fix = fixes[i - tools.length - kinds.length];
        if (fix) return this.repairItem(fix);
        const k = kinds[i - tools.length];
        if (!k) return;
        if (session.coins < k.cena) return this.toast(`Za mało monet – ${k.nazwa.toLowerCase()} kosztuje ${k.cena}.`, 2500);
        spend(k.cena);
        session.namioty.push({ max: k.noclegow, left: k.noclegow });
        this.emitHud();
        this.save();
        this.toast(`⛺ Kupiony: ${k.nazwa} (${k.noclegow} noclegów). Rozłożysz go w lesie albo na polu z karty postaci.`, 3000);
      },
    }, entries, () => this.openGearShop(p), 'Namioty i wyposażenie na kolejną wyprawę.');
  }

  /** Mechanics buy iron ore/wood and repair owned equipment. */
  private openWorkshop(p: CityPlace, tab = 0) {
    const fixes = repairable();
    const goods = (['ruda_zelaza', 'drewno'] as Owoc[]).filter(f => fruitCount(f) > 0);
    const entries: ShopEntry[] = tab === 0 ? fixes.map((id, index) => ({
      id: `repair:${id}`, index, name: `Napraw: ${item(id)!.nazwa}`, category: 'services',
      picture: itemPictureUrl(id), description: 'Mechanik przywróci sprzętowi pełną wytrzymałość.',
      stats: [['Wytrzymałość', `${condition(id)!.left}/${condition(id)!.max}`]],
      price: repairCost(id), action: 'NAPRAW', refresh: true,
    })) : goods.map((f, index) => ({
      id: `sell:${f}`, index, name: OWOCE[f].nazwa, category: 'supplies', picture: goodsPicture(f),
      description: 'Mechanik odkupi cały zapas tego surowca z plecaka.',
      stats: [['Liczba', String(fruitCount(f))], ['Za sztukę', `${OWOCE[f].cena} monet`]],
      price: fruitCount(f) * OWOCE[f].cena, action: 'SPRZEDAJ', refresh: true,
    }));
    const text = tab === 0 ? 'Napraw sprzęt u mechanika. Jeśli jest sprawny, naprawa nie jest potrzebna.'
      : `Mechanik skupuje rudę żelaza po ${OWOCE.ruda_zelaza.cena} monet i drewno po ${OWOCE.drewno.cena} monet za sztukę.`;
    this.shopDialog(p, {
      title: `Warsztat — ${p.name}`, text,
      tabs: { labels: ['NAPRAW', 'SPRZEDAJ'], active: tab, colors: [0x2f6f9f, 0x3fa34d] },
      buttons: [...entries.map(e => e.name), 'Wyjdź'],
      onChoose: i => {
        if (i < 0) return this.openWorkshop(p, -1 - i);
        if (i >= entries.length) return;
        if (tab === 0) this.repairItem(fixes[i]);
        else {
          const f = goods[i], n = fruitCount(f);
          if (!n || !takeFruit(f, n)) return;
          const value = n * OWOCE[f].cena;
          earn(value); this.emitHud(); this.save(); this.toast(`Sprzedane za ${value} monet!`);
        }
      },
    }, entries, () => this.openWorkshop(p, tab), text);
  }

  /** Exchange the recipe's ingredient group and money for a saved item; failures take nothing. */
  private openProducer(p: CityPlace) {
    const r = producerRecipe(p.name);
    if (!r) return;
    const count = foodCount(r.item);
    const ingredient = r.group === 'owoce' ? 'owoców' : 'warzyw';
    this.shopDialog(p, {
      title: `Wytwórca — ${p.name}`,
      text: `Przynieś ${r.amount} ${ingredient} i ${r.coins} monet.`,
      buttons: [`${r.icon} Wytwórz: ${r.name}`, 'Wyjdź'],
      onChoose: i => {
        if (i !== 0) return;
        if (session.coins < r.coins) return this.toast(`Za mało monet — potrzeba ${r.coins}.`);
        if (groupCount(r.group) < r.amount) return this.toast(`Za mało ${ingredient} — potrzeba ${r.amount}, masz ${groupCount(r.group)}.`);
        const previous = structuredClone(gear.bag);
        takeGroup(r.group, r.amount);
        if (!addItem(r.item)) {
          gear.bag = previous;
          return this.toast('Plecak pełny! Zrób miejsce na przygotowane jedzenie.');
        }
        spend(r.coins);
        this.emitHud(); this.save();
        this.toast(`${r.icon} Gotowe: ${r.name}! Masz ${foodCount(r.item)}.`);
      },
    }, [{ id: `make:${r.item}`, index: 0, name: r.name, category: 'food', icon: r.icon,
      description: `Przynieś ${GRUPY[r.group].nazwa.toLowerCase()} i zapłać za przygotowanie. ${r.group === 'warzywa' ? 'Burger jest wyłącznie warzywny. ' : ''}Jedzenie leczy po miksturach i jadalnych zbiorach; możesz też zachować je do zadań.`,
      stats: [[GRUPY[r.group].nazwa, `${groupCount(r.group)}/${r.amount}`], ['Masz', String(count)], ['Leczenie', `+${r.hearts} ${r.hearts === 1 ? 'serce' : r.hearts < 5 ? 'serca' : 'serc'}`]],
      price: r.coins, costNote: `${r.amount} ${ingredient.toUpperCase()}`, action: 'WYTWÓRZ', badge: String(count), refresh: true }],
    () => this.openProducer(p), 'Przynieś składniki. Wytwórca przygotuje jedzenie na drogę.');
  }

  /** "Namiot 19/20, Super namiot 480/500". */
  tentsText() {
    return session.namioty.map((t) => `${t.max > 20 ? 'Super namiot' : 'Namiot'} ${t.left}/${t.max}`).join(', ');
  }

  /** A night in an own tent wears it: the most worn one first. Tells how much is left. */
  private wearTent() {
    const t = session.namioty.filter((x) => x.left > 0).sort((a, b) => a.left - b.left)[0];
    if (!t) return;
    t.left--;
    const name = t.max > 20 ? 'Super namiot' : 'Namiot';
    if (t.left <= 0) {
      session.namioty = session.namioty.filter((x) => x !== t);
      this.dialog({ title: '⛺ Namiot się podarł', text: `${name} służył ci ${t.max} nocy i właśnie się rozpadł. ${session.namioty.length ? `Zostały ci: ${this.tentsText()}.` : 'Nowy kupisz w sklepie budowlanym albo sportowym.'}`, buttons: ['OK'], onChoose: () => {} });
    } else {
      this.time.delayedCall(3200, () => this.toast(`⛺ ${name} trochę się zużył: zostało ${t.left} z ${t.max} noclegów.`, 3000));
    }
  }

  /** Where the own tent can go: in a forest or a field, not in a fight. */
  tentSpot(): { ok: boolean; why: string } {
    if (!session.namioty.length) return { ok: false, why: '' };
    if (this.inCombat()) return { ok: false, why: 'Nie w trakcie walki!' };
    const kinds = this.city.areaKindsAt(this.player.x, this.player.y + FEET.dy);
    if (!kinds.some((k) => NAMIOT.gdzie.includes(k))) return { ok: false, why: 'Namiot rozłożysz tylko w lesie albo na polu.' };
    return { ok: true, why: '' };
  }

  /** Pitch the own tent here and sleep. */
  pitchTent() {
    const t = this.tentSpot();
    if (!t.ok) return this.toast(t.why, 2500);
    this.add.image(this.player.x + 10, this.player.y - 4, TEX.tent).setDepth(this.player.y - 1);
    this.sleepInTent(this.player.x, this.player.y, 'Namiot rozbity, dobranoc!');
    this.wearTent();
  }

  /** Rides to another station: loads its map and starts there. */
  /** The station the hero leaves from (for the ride screen). */
  /** Adds a station to the places a diamond ride can go back to. */
  private remember(s: Stop) {
    session.byl = [...session.byl.filter((b) => b.key !== s.key), s].slice(-40);
  }

  private stationHere() {
    let best: CityPlace | null = null;
    for (const p of this.city.places) {
      if (p.kind !== 'station') continue;
      if (!best || Math.hypot(p.door.x - this.player.x, p.door.y - this.player.y) < Math.hypot(best.door.x - this.player.x, best.door.y - this.player.y)) best = p;
    }
    return best?.name ?? mapName(this.city.id);
  }

  private travel(t: Offer, times = 1, diamonds = 0) {
    if (this.travelling) return;
    this.travelling = true;
    if (t.price) spend(t.price);
    // Remember where we set off from and where we go: a diamond takes the hero back later.
    const from = this.city.toLatLon(this.player.x, this.player.y);
    const here = t.statek ? (this.portHere()?.nazwa ?? mapName(this.city.id)) : this.stationHere();
    this.remember({ name: here, ...from, key: `${this.city.id}|${here}`, mapId: this.city.id, mapName: mapName(this.city.id) });
    this.remember(t.to);
    this.emitHud();
    this.keepFog();
    this.toast(t.statek ? `⛴ Płyniemy do: ${t.to.name}…` : `🐴 Jedziemy do: ${t.to.name}…`, 3000);
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    Promise.all([getMap(t.to.mapId), new Promise((ok) => this.time.delayedCall(1000, ok))])
      .then(async ([city]) => {
        const st = t.statek ? undefined : city.places.find((q) => q.kind === 'station' && q.name === t.to.name);
        const to = st ? st.door : city.fromLatLon(t.to.lat, t.to.lon);
        await city.ensure(to.x, to.y, LOAD_RADIUS);
        // A spot on the platform/street/quay the hero can walk away from (not an island between the tracks).
        session.arrive = st || t.statek ? city.reachableNear(to.x, to.y) : city.arrivalNear(to.x, to.y);
        // The ride takes time (80 km/h in a straight line, journey.ts); its station is the load point at once.
        session.at = { m: city.id, x: session.arrive.x, y: session.arrive.y };
        if (!session.immortal) {
          await syncClock();
          const start = serverNow();
          session.jazda = t.statek
            ? { from: here, to: t.to.name, km: t.km, start, end: start + rideMs(t.km, times, PROM.kmh), statek: true }
            : { from: this.stationHere(), to: t.to.name, km: t.km, start, end: start + rideMs(t.km, times), train: !!t.level || t.to.mapId.startsWith('w:') };
          saveNow(this.player.hp).catch(() => {});
          await Promise.all([prepareMap(city), showJourney(session.jazda)]);
          session.jazda = null;
        } else await prepareMap(city);
        saveNow(this.player.hp).catch(() => {});
        session.hp = this.player.hp;
        this.justRode = true;
        this.game.registry.set('city', city);
        this.scene.stop('ui');
        this.scene.restart();
      })
      .catch((e: Error) => {
        // Could not load that map: the money (and diamonds) come back.
        if (t.price) {
          earn(t.price);
          session.stats.earned -= t.price;
          session.stats.spent -= t.price;
        }
        session.diamenty += diamonds;
        this.travelling = false;
        cam.fadeIn(300);
        this.toast(`${t.statek ? 'Kapitan' : 'Woźnica'} nie znalazł drogi: ${e.message}`);
        this.emitHud();
      });
  }

  /**
   * On foot between the Lublin map and the world map (content/mapa.ts GRANICA): coming from another town
   * the hero steps onto the real Lublin map (its cobbles, missions and fixed characters), and pushing out
   * through Lublin's edge takes him onto the world map there.
   */
  private crossBorder(now: number) {
    if (this.travelling || demo.on || now < this.crossAt || this.player.isDead) return;
    this.crossAt = now + 500;
    this.checkDroga();
    const lublin = cachedMap('lublin');
    if (!lublin) return;
    const { x, y } = this.player;
    if (worldOrigin(this.city.id)) {
      const ll = this.city.toLatLon(x, y);
      const p = lublin.fromLatLon(ll.lat, ll.lon);
      const m = GRANICA.wejscieM * PX_PER_M;
      if ([[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].every(([dx, dy]) => lublin.insideCity(p.x + dx, p.y + dy))) {
        this.walkOnto('lublin', ll, '🏰 Wchodzisz do Lublina.');
      }
      return;
    }
    if (this.city.id !== 'lublin' || this.player.vel.lengthSq() === 0) {
      this.pushOut = 0;
      return;
    }
    const f = this.player.facing;
    const d = GRANICA.wyjscieM * PX_PER_M;
    if (this.city.insideCity(x + f.x * d, y + f.y * d)) {
      this.pushOut = 0;
      return;
    }
    this.pushOut += 0.5;
    if (this.pushOut < GRANICA.wyjscieS) return;
    // Just past the edge, on a world map whose origin is the nearest 0.1° (the same squares come back, so does their fog).
    const ll = this.city.toLatLon(x + f.x * d * 3, y + f.y * d * 3);
    this.walkOnto(`w:${(Math.round(ll.lat * 10) / 10).toFixed(4)},${(Math.round(ll.lon * 10) / 10).toFixed(4)}`, ll, '🌍 Wychodzisz poza Lublin.');
  }

  /** Restarts the scene on another map with the hero at (lat, lon) – no coach, no fee. */
  private walkOnto(mapId: string, ll: { lat: number; lon: number }, word: string) {
    this.travelling = true;
    this.keepFog();
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    getMap(mapId)
      .then(async (city) => {
        const to = city.fromLatLon(ll.lat, ll.lon);
        await city.ensure(to.x, to.y, LOAD_RADIUS);
        session.arrive = city.reachableNear(to.x, to.y);
        await prepareMap(city);
        session.hp = this.player.hp;
        this.walkedIn = word;
        this.game.registry.set('city', city);
        this.scene.stop('ui');
        this.scene.restart();
      })
      .catch((e: Error) => {
        this.travelling = false;
        this.crossAt = this.time.now + 10_000;
        cam.fadeIn(300);
        this.toast(`Nie da się tu przejść: ${e.message}`);
      });
  }

  /** Finds the hero's house next to the start point and marks it. */
  private setUpHome() {
    const sx = session.startX;
    const sy = session.startY;
    const R = 40 * PX_PER_M;
    let best: Building | null = null;
    let bestD = Infinity;
    for (const b of this.city.query({ x0: sx - R, y0: sy - R, x1: sx + R, y1: sy + R }).buildings) {
      const d = this.city.entranceOf(b);
      const dist = Math.hypot(d.x - sx, d.y - sy);
      if (dist < bestD) {
        bestD = dist;
        best = b;
      }
    }
    this.home = best;
    let at = { x: sx, y: sy - 3 };
    if (best) {
      // A house-sized building gets a homely red roof; a big block keeps its own.
      if (best.x1 - best.x0 < 30 * PX_PER_M && best.y1 - best.y0 < 30 * PX_PER_M) this.mapView.highlight.set(best, { roof: '#c75b4a', wall: '#f3e2a0' });
      const cx = (best.x0 + best.x1) / 2;
      const cy = (best.y0 + best.y1) / 2;
      // On the roof: the middle of the house if that is inside it, else by the door.
      // On the roof just inside the edge nearest the start point: walk from
      // the start towards the house until we are over its roof.
      let found = false;
      for (const t of [{ x: cx, y: cy }, this.city.entranceOf(best)]) {
        const dx = t.x - sx;
        const dy = t.y - sy;
        const len = Math.hypot(dx, dy) || 1;
        for (let d = 0; d < len + 40 && !found; d += 2) {
          const x = sx + (dx / len) * d;
          const y = sy + (dy / len) * d;
          if (this.city.buildingAt(x, y) === best) {
            at = { x: x + (dx / len) * 5, y: y + (dy / len) * 5 };
            if (this.city.buildingAt(at.x, at.y) !== best) at = { x, y };
            found = true;
          }
        }
        if (found) break;
      }
    }
    this.homeAt = at;
    // A small, soft house sign sitting on the roof.
    this.add.image(at.x, at.y, TEX.home).setScale(0.55).setAlpha(0.85).setDepth(1_100_000);
  }

  /** A swing that lands on the house (or right by it) opens the door. */
  private hitsHome(x: number, y: number) {
    if (this.home && this.city.buildingAt(x, y) === this.home) return true;
    return Math.hypot(x - this.homeAt.x, y - this.homeAt.y) < 12;
  }

  /** Home: full health, the chest and money kept there. */
  private openHome() {
    const hurt = this.player.hp < PLAYER.maxHp;
    this.player.heal(PLAYER.maxHp);
    this.emitHud();
    // Letters from the Arena Cechu wait in the chest (the ghost's wins of earlier days).
    const listy = this.listyAreny.length;
    this.dialog({
      title: '🏠 Twój domek',
      text: `${hurt ? 'Odpocząłeś w domu – zdrowie w pełni!' : 'Dom, słodki dom.'}\n\nW skrzyni masz ${session.chest.coins} monet i ${session.chest.slots.filter(Boolean).length} rzeczy.${listy ? `\n\nNa skrzyni leży ${listy === 1 ? 'list' : `${listy} listy`} z pieczęcią Cechu Zbrojmistrzów.` : ''}`,
      buttons: ['📦 Otwórz skrzynię', ...(listy ? [`📜 List z Areny${listy > 1 ? ` (${listy})` : ''}`] : []), 'Wyjdź'],
      onChoose: (i) => {
        if (i === 0) this.openChest();
        else if (listy && i === 1) this.otworzListAreny();
      },
    });
  }

  /** The chest (home, or the room of the hotel the hero sleeps in). */
  private openChest(where?: string) {
    this.scene.pause();
    showChest(() => {
      this.scene.resume();
      consumeAttack();
      this.gearChanged();
      this.save();
    }, where);
  }

  /** A riddle with one try (fixed characters); answers are shuffled by `seed`. */
  private askRiddle(
    title: string,
    intro: string,
    z: ZagadkaPL,
    exp: number,
    seed: string,
    after: (right: boolean) => void,
    opts: { coins?: number; then?: (right: boolean) => void; retry?: boolean } = {},
  ) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    const r = rng(h >>> 0);
    const order = z.odpowiedzi.map((_, i) => i).sort(() => r() - 0.5);
    const answers = order.map((i) => tr(z.odpowiedzi[i]));
    const correct = order.indexOf(0);
    const coins = opts.coins ?? 0;
    const prize = [exp ? `${exp} EXP` : '', coins ? tx(`${coins} monet`, `${coins} coins`) : ''].filter(Boolean).join(' + ');
    const rule = opts.retry ? '' : tx('Tylko jedna próba!', 'Only one try!');
    const foot = rule; // no reward told up front (owner 7 Oct 2026)
    void prize;
    this.dialog({
      title,
      text: `${intro}\n\n${tr(z.pytanie)}${foot ? `\n\n${foot}` : ''}`,
      buttons: [...answers, tx('Później', 'Later')],
      onChoose: (i) => {
        if (i >= answers.length) return;
        const right = i === correct;
        after(right);
        if (right) {
          session.exp += exp;
          if (coins) earn(coins);
          session.stats.riddles = (session.stats.riddles ?? 0) + 1;
          this.emitHud();
        }
        this.dialog({
          title: right ? tx('🎉 Brawo!', '🎉 Well done!') : tx('😕 Niestety…', '😕 Not quite…'),
          text: right ? (prize ? `+${prize}` : tx('Dobra odpowiedź!', 'Right answer!')) : opts.retry ? tx('To nie to. Pomyśl jeszcze i spróbuj ponownie.', 'That is not it. Think again and try once more.') : tx(`Dobra odpowiedź to: ${answers[correct]}.`, `The right answer is: ${answers[correct]}.`),
          buttons: ['OK'],
          onChoose: () => opts.then?.(right),
        });
        this.save();
      },
    });
  }

  /** A riddle-giver: one riddle a day, one try. */
  private openRiddle(n: Npc) {
    const day = today();
    if (session.riddles[n.id] === day) {
      this.dialog({ title: n.name, text: 'Dziękuję za pomoc! Na dziś to wszystko – wpadnij jutro.', buttons: ['Do jutra!'], onChoose: () => {} });
      return;
    }
    // A request "from life" (content/prosby.ts), never the same one within 60 days.
    const where = this.city.toLatLon(n.x, n.y);
    const r = requestFor(n, day, session.age, session.seen, Number.isFinite(where.lat) ? where : null);
    this.dialog({
      title: `❓ ${n.name}`,
      text: `${n.greeting}\n\n${r.question}\n\nTylko jedna próba!`, // no reward told up front (owner 7 Oct 2026)
      buttons: [...r.answers, 'Później'],
      onChoose: (i) => {
        if (i >= r.answers.length) return;
        // Remember only today's answers; requests heard stay for 60 days.
        for (const [k, v] of Object.entries(session.riddles)) if (v !== day) delete session.riddles[k];
        session.riddles[n.id] = day;
        const dn = dayNumber(day);
        session.seen[r.key] = dn;
        for (const [k, v] of Object.entries(session.seen)) if (dn - v >= NIE_POWTARZAJ_DNI) delete session.seen[k];
        const ok = i === r.correct;
        session.stats.riddles = (session.stats.riddles ?? 0) + (ok ? 1 : 0);
        let got = r.coins ? `${r.coins} monet` : `${r.apples} jabłka`;
        if (ok) {
          if (r.coins) earn(r.coins);
          let added = 0;
          for (let k = 0; k < r.apples; k++) if (addFruit('jablko')) added++;
          if (r.apples && added < r.apples) got = added ? `${added} jabłko (plecak pełny)` : 'nic – plecak pełny';
          session.exp += r.exp;
          this.emitHud();
        }
        this.dialog({
          title: ok ? '🎉 Dziękuję!' : '😕 Hmm…',
          text: ok ? `Bardzo mi pomogłeś! Proszę: ${got} i ${r.exp} EXP.` : `Chyba jednak nie… Dobra odpowiedź to: ${r.answers[r.correct]}.\nWpadnij jutro!`,
          buttons: ['OK'],
          onChoose: () => {},
        });
        this.save();
      },
    });
  }

  private openHospital(p: CityPlace) {
    const hurt = this.player.hp < PLAYER.maxHp;
    this.player.heal(PLAYER.maxHp);
    this.emitHud();
    this.dialog({
      title: `🏥 ${p.name}`,
      text: hurt ? 'Lekarz opatrzył twoje rany. Zdrowie w pełni – i to za darmo!' : 'Lekarz cię obejrzał: jesteś zdrowy jak ryba. Wróć, gdy coś cię boli.',
      buttons: ['Dziękuję'],
      onChoose: () => {},
    });
    if (hurt) this.save();
  }

  /** Swing speed and reach from the sword-fighting level. */
  private applySkill() {
    this.refreshLook();
    // The reach no longer grows with the level (owner): only speed and accuracy do.
    this.player.attackCooldown = cooldown(this.handSkill());
    this.player.reach = 1;
  }

  /** One use of a skill; tells the player when it levels up. */
  private practiced(skill: Umiejetnosc, points = 1) {
    const up = practice(skill, points);
    const pr = skillProgress(skill);
    this.game.events.emit('practice', { skill, ...pr, max: pr.level >= MAKS_POZIOM, gain: points });
    if (up) {
      this.toast(`${UMIEJETNOSCI[skill].nazwa}: poziom ${up}! Szybsze ataki.`, 2200);
      this.applySkill();
      this.emitHud();
    }
  }

  // ------------------------------------------------------------------ ranged

  /** Direction of the current aim, or null when not aiming. */
  private aimDirection(): { x: number; y: number } | null {
    if (!hold.active) return null;
    const held = performance.now() - hold.start;
    if (held < AIM_DELAY && !hold.dragged) return null;
    return this.dirFor(hold.mode, hold.dx, hold.dy, hold.dragged);
  }

  private dirFor(mode: 'touch' | 'mouse' | 'key', dx: number, dy: number, dragged: boolean) {
    let v = { x: this.player.facing.x, y: this.player.facing.y };
    if (mode === 'touch' && dragged) v = { x: dx, y: dy / skrotKamery() };
    if (mode === 'mouse') {
      const cam = this.cameras.main;
      v = { x: (mouse.x * OSTROSC) / cam.zoomX + cam.worldView.x - this.player.x, y: (mouse.y * OSTROSC) / cam.zoomY + cam.worldView.y - this.player.y };
    }
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  }

  /** Press and hold to aim, let go to shoot (bow or magic). */
  private updateRanged(now: number, lingering: boolean) {
    const weapon = rangedWeapon();
    const aim = weapon && !lingering ? this.aimDirection() : null;
    this.aimLine.clear();
    // Holding: a golden ring fills around the hero; full = the strong attack is ready.
    if (hold.active && !lingering) {
      const held = performance.now() - hold.start;
      if (held > AIM_DELAY) {
        const t = Math.min(1, held / WALKA.mocnyPoMs);
        const cx = this.player.x, cy = this.player.y - 4;
        this.aimLine.lineStyle(2, 0x1e1a24, 0.5).strokeCircle(cx, cy, 13);
        this.aimLine.lineStyle(1.5, 0xffd84a, t >= 1 ? 0.6 + 0.4 * Math.sin(now / 80) : 0.9);
        this.aimLine.beginPath();
        this.aimLine.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
        this.aimLine.strokePath();
      }
    }
    if (aim) {
      // Dotted aim line.
      const range = weapon!.rodzaj === 'magia' ? MAGIC_RANGE : ARROW_RANGE;
      this.aimLine.fillStyle(weapon!.rodzaj === 'magia' ? 0x9be7ff : 0xffffff, 0.85);
      for (let d = 10; d < range; d += 7) this.aimLine.fillRect(this.player.x + aim.x * d - 1, this.player.y + aim.y * d - 1, 2, 2);
      this.player.facing.set(aim.x, aim.y);
    }
    const r = consumeRelease();
    if (!r || lingering) return;
    const strong = r.held >= WALKA.mocnyPoMs;
    // No bow or magic item: holding long and letting go is a strong blow of the weapon in hand.
    if (!weapon) {
      if (strong && !this.story.busy && !this.demoRun?.busy && !this.player.isDead && this.zaplacMocny('miecz')) {
        this.faceFoe(WALKA.zasiegMiecz);
        this.resolveAttack(this.player.hitPoint(WALKA.zasiegMiecz), now, true);
      } else if (!strong && live() && r.mode === 'touch' && (r.dragged || r.held >= AIM_DELAY) && !this.story.busy && !this.demoRun?.busy && !this.player.isDead) {
        // The attack stick (new controls): dragged = swing that way, held a moment = swing at the nearest enemy.
        if (r.dragged) {
          const d = this.dirFor(r.mode, r.dx, r.dy, true);
          this.player.face(d.x, d.y);
        } else this.faceFoe();
        const hit = this.player.tryAttack(now);
        if (hit) this.resolveAttack(hit, now);
      }
      return;
    }
    if (r.held < AIM_DELAY && !r.dragged) return; // a plain click: melee only
    const skill = weapon.rodzaj === 'magia' ? 'magia' : 'luk';
    if (now - this.lastShot < cooldown(skill)) return;
    this.fireShot(weapon, this.dirFor(r.mode, r.dx, r.dy, r.dragged), strong && this.zaplacMocny(skill), now);
  }

  /**
   * New controls test (content/zasoby.ts): a strong attack costs stamina (sword, bow) or mana (magic) and has its
   * own cooldown. Not enough: false and a word why (nothing taken). Old controls: always free.
   */
  private zaplacMocny(skill: Umiejetnosc): boolean {
    if (!live()) return true;
    const lvl = poziomPostaci(session.exp);
    if (zasoby.czas - zasoby.mocnyAt < ZASOBY.mocnyCooldownS) return false;
    const ok = skill === 'magia' ? wydajMane(ZASOBY.koszt.mocnyCzar, lvl) : wydajStamine(ZASOBY.koszt.mocny, lvl);
    if (!ok) {
      if (this.time.now - this.noManaToast > 1500) this.toast(skill === 'magia' ? '💧 Za mało many na mocny czar.' : '😮‍💨 Za mało sił na mocny atak – odpocznij chwilę.', 1500);
      this.noManaToast = this.time.now;
      return false;
    }
    zasoby.mocnyAt = zasoby.czas;
    this.emitZasoby();
    return true;
  }

  /** The chosen skill of the weapon in hand (content/umiejetnosci.ts; changed only at training places). */
  umiejetnosc(): Umiej {
    const b = this.handSkill();
    const id = session.umiej[b];
    return SPECJALNE.find((u) => u.id === id && u.bron === b) ?? domyslnaUmiejetnosc(b);
  }

  /** The special button / Q (new controls): the weapon's chosen skill, paid in stamina or mana. */
  private specjalny(now: number) {
    if (this.story.busy || this.demoRun?.busy || this.witam || this.anomalia?.busy || this.player.isDead || now < this.lingerUntil) return;
    const u = this.umiejetnosc();
    if (!this.zaplacMocny(u.bron)) return;
    const weapon = rangedWeapon();
    if (u.id === 'mocny') {
      this.faceFoe(WALKA.zasiegMiecz);
      this.resolveAttack(this.player.hitPoint(WALKA.zasiegMiecz), now, true);
      return;
    }
    if (u.id === 'zamach') return this.zamach(now);
    if (!weapon) return;
    const foe = this.nearestFoe(u.bron === 'magia' ? MAGIC_RANGE : ARROW_RANGE);
    const base = foe ? { x: foe.x - this.player.x, y: foe.y - this.player.y } : { x: this.player.facing.x, y: this.player.facing.y };
    const a0 = Math.atan2(base.y, base.x);
    const katy = u.id === 'salwa' ? [-0.2, 0, 0.2] : u.id === 'wachlarz' ? [-0.5, -0.25, 0, 0.25, 0.5] : [0];
    this.bezKosztuStrzalu = true; // the skill was paid as a whole above
    for (const k of katy) {
      // A volley's side arrows fly where they are aimed (no aim help that would bring them all onto one target).
      this.fireShot(weapon, { x: Math.cos(a0 + k), y: Math.sin(a0 + k) }, katy.length === 1, now);
      this.lastShot = now;
    }
    this.bezKosztuStrzalu = false;
  }

  /**
   * Choosing the skill of the special button (new controls test). Only at a training place (owner, 26 Oct 2026):
   * the stadium judge and training stations for sword/bow, a library for magic. A skill needs its weapon level.
   */
  private wyborUmiejetnosci(bronie: Umiejetnosc[], title: string) {
    const lista = SPECJALNE.filter((u) => bronie.includes(u.bron));
    const nazwyBroni: Record<Umiejetnosc, string> = { miecz: 'miecz', luk: 'łuk', magia: 'magia' };
    const aktywna = (u: Umiej) => (session.umiej[u.bron] ?? domyslnaUmiejetnosc(u.bron).id) === u.id;
    const buttons = lista.map((u) => {
      const lvl = skillLevel(u.bron);
      if (lvl < u.poziom) return `🔒 ${u.nazwa} (${nazwyBroni[u.bron]} – poziom ${u.poziom}, masz ${lvl})`;
      return `${aktywna(u) ? '✅' : u.ikona} ${u.nazwa} (${nazwyBroni[u.bron]})`;
    });
    this.dialog({
      title,
      text: `Tu ćwiczysz umiejętność, którą masz pod złotym przyciskiem (Q). Kosztuje siły (miecz, łuk) albo manę (magia).\n\n${lista.map((u) => `${u.ikona} ${u.nazwa}: ${u.opis}`).join('\n')}`,
      buttons: [...buttons, 'Wyjdź'],
      onChoose: (i) => {
        const u = lista[i];
        if (!u) return;
        if (skillLevel(u.bron) < u.poziom) return this.toast(`🔒 ${u.nazwa}: potrzebny poziom ${u.poziom} (${nazwyBroni[u.bron]}).`, 2200);
        session.umiej[u.bron] = u.id;
        this.toast(`🎯 ${u.nazwa} – gotowa pod złotym przyciskiem.`, 2200);
        this.emitZasoby();
        this.save();
      },
    });
  }

  /** Zamach (sword skill): a full turn with the weapon, every enemy around takes a blow (×0.8). */
  private zamach(now: number) {
    const reach = this.swingReach(1.3);
    this.drawSweep(0, Math.PI * 2, reach);
    this.swingWeapon(Math.atan2(this.player.facing.y, this.player.facing.x), true);
    let landed = false;
    for (const e of [...this.enemies]) {
      if (e.isDead || e.inAir || e.peaceful) continue;
      if (Math.hypot(e.x - this.player.x, e.y - (this.player.y + 2)) > reach + e.size) continue;
      landed = true;
      if (e.hit(new Phaser.Math.Vector2(this.player.x, this.player.y), now, meleeDamage() * 0.8)) this.onEnemyKilled(e);
    }
    if (landed) {
      this.wearWeapon(gear.equip.bron);
      this.practiced('miecz');
    }
  }

  /**
   * Aim help: the nearest target (a visible monster, or a training target/crystal for this skill) within the range
   * and within WALKA.celowanieStopnie of `dir`, with nothing built in between – the shot flies straight at it.
   */
  private aimAssist(dir: { x: number; y: number }, skill: 'luk' | 'magia'): { x: number; y: number } {
    const range = skill === 'magia' ? MAGIC_RANGE : ARROW_RANGE;
    const maxCos = Math.cos((WALKA.celowanieStopnie * Math.PI) / 180);
    const px = this.player.x, py = this.player.y;
    const points: { x: number; y: number }[] = [];
    for (const e of this.enemies) if (!e.isDead && !e.peaceful && e.visible) points.push({ x: e.x, y: e.y });
    for (const st of this.training.targetsOf(skill)) points.push({ x: st.x, y: st.y - 7 * SKALA_POSTACI });
    let best: { x: number; y: number } | null = null;
    let bestScore = Infinity;
    for (const t of points) {
      const dx = t.x - px, dy = t.y - py, d = Math.hypot(dx, dy);
      if (d < 2 || d > range) continue;
      const cos = (dx * dir.x + dy * dir.y) / d;
      if (cos < maxCos) continue;
      // Nothing built in between (walls stop shots anyway).
      let clear = true;
      for (let s = 6; s < d && clear; s += 6) if (this.city.buildingAt(px + (dx * s) / d, py + (dy * s) / d) !== undefined) clear = false;
      if (!clear) continue;
      // Closer and better lined up wins.
      const score = d * (2 - cos);
      if (score < bestScore) {
        bestScore = score;
        best = { x: dx / d, y: dy / d };
      }
    }
    return best ?? dir;
  }

  /** An arrow or a spell from the weapon in hand, flying in `dir` (or straight at a target near that way, aimAssist). */
  private fireShot(weapon: Przedmiot, dir: { x: number; y: number }, strong: boolean, now: number) {
    const skill = weapon.rodzaj === 'magia' ? 'magia' : 'luk';
    dir = this.aimAssist(dir, skill);
    this.lastShot = now;
    // A bow needs arrows (a crossbow bolts, the steam pistol bullets), and every shot wears it.
    const ammo = ammoOf(weapon);
    if (ammo) {
      if (!takeAmmo(ammo)) {
        const a = AMUNICJA[ammo];
        if (now - this.noArrowsToast > 2500) this.toast(`${a.ikona} Brak: ${a.nazwa.toLowerCase()}! Kup je w sklepie.`, 2000);
        this.noArrowsToast = now;
        return;
      }
      this.wearWeapon(weapon.id);
      this.emitHud();
    }
    // New controls test (content/zasoby.ts): a bow tires the archer (worse and weaker when tired), a spell takes mana
    // (with none left it still goes, but weak). A strong one is paid by its button (specjalny) or here when held.
    let sila = 1, celnoscMinus = 0;
    if (live() && !this.bezKosztuStrzalu) {
      const lvl = poziomPostaci(session.exp);
      if (skill === 'luk') {
        const f = udzialStaminy(lvl);
        sila = ZASOBY.lukSilaMin + (1 - ZASOBY.lukSilaMin) * f;
        celnoscMinus = ZASOBY.lukCelnoscMinus * (1 - f);
        wydajStamine(ZASOBY.koszt.strzal, lvl, false);
      } else if (!wydajMane(ZASOBY.koszt.czar, lvl)) {
        sila = ZASOBY.czarBezMany;
        if (now - this.noManaToast > 3000) this.toast('💧 Brak many – czar jest słaby. Mana sama wraca.', 1800);
        this.noManaToast = now;
      }
      this.emitZasoby();
    }
    this.player.facing.set(dir.x, dir.y);
    const speed = skill === 'magia' ? MAGIC_SPEED : ARROW_SPEED;
    // Starts at the hero, so nothing standing right next to them is skipped.
    const sprite = this.add
      .image(this.player.x, this.player.y, skill === 'magia' ? TEX.magicShot : TEX.arrowShot)
      .setRotation(Math.atan2(dir.y, dir.x))
      .setDepth(1_040_000);
    // Held long enough: a strong shot (bigger, golden, harder).
    if (strong) sprite.setScale(1.5).setTint(0xffd84a);
    this.shots.push({ sprite, vx: dir.x * speed, vy: dir.y * speed, left: skill === 'magia' ? MAGIC_RANGE : ARROW_RANGE, damage: shotDamage(weapon) * (strong ? strongFactor(skill) : 1) * sila, skill, weapon: weapon.id, strong, missed: new Set(), celnoscMinus });
  }

  private updateShots(dt: number) {
    const now = this.time.now;
    for (const shot of [...this.shots]) {
      const step = Math.hypot(shot.vx, shot.vy) * dt;
      const sp = shot.sprite;
      const ox = sp.x;
      const oy = sp.y;
      sp.x += shot.vx * dt;
      sp.y += shot.vy * dt;
      shot.left -= step;
      // Check the whole path of this frame (walls and enemies), so a shot
      // never slips through.
      let done = shot.left <= 0;
      for (let t = 0.25; t <= 1 && !done; t += 0.25) {
        if (this.city.buildingAt(ox + (sp.x - ox) * t, oy + (sp.y - oy) * t) !== undefined) done = true;
      }
      if (!done) {
        const foe = this.enemies.find((e) => !e.isDead && !e.inAir && !shot.missed.has(e) && distToSegment(e.x, e.y, ox, oy, sp.x, sp.y) < e.size + 3);
        if (foe?.spokojny) {
          // Turn fight: a shot at a waiting group provokes the question, no damage.
          done = true;
          this.spotkania?.zaczep(foe);
        } else if (foe && Math.random() >= hitChance(shot.skill, shot.strong, session.level.celnosc + gearAimBonus() - (shot.celnoscMinus ?? 0))) {
          // Missed: the arrow flies on past it.
          shot.missed.add(foe);
          this.practiced(shot.skill);
          this.missText(foe.x, foe.y - 4 * foe.kind.scale);
        } else if (foe) {
          done = true;
          this.practiced(shot.skill);
          const imb = imbueOf(shot.weapon)?.e;
          // An arrow may kill an ordinary monster at once.
          const instant = shot.skill === 'luk' && !WALKA.bezNatychmiast.includes(foe.kindId) && !foe.duel && Math.random() < instaKillChance();
          if (foe.hit(new Phaser.Math.Vector2(sp.x - shot.vx, sp.y - shot.vy), now, instant ? foe.hp : shot.damage * this.essenceBoost(imb, foe))) this.onEnemyKilled(foe);
          else this.essenceHit(imb, foe, now);
        } else if (this.training.hitAt(sp.x, sp.y, 8, shot.skill)) {
          done = true;
          this.practiced(shot.skill);
        } else if (this.training.anyAt(sp.x, sp.y, 6)) done = true;
      }
      if (done) {
        this.shots = this.shots.filter((x) => x !== shot);
        this.tweens.add({ targets: sp, alpha: 0, duration: 120, onComplete: () => sp.destroy() });
      }
    }
  }

  // ------------------------------------------------------------------ shops, schools, library

  private shopDialog(p: CityPlace, req: DialogRequest, entries: ShopEntry[], refresh: () => void, subtitle: string) {
    this.dialog({
      ...req,
      shop: { id: p.id, banner: /decathlon/i.test(p.name) ? 'decathlon' : 'kupiec_01', subtitle, entries,
        sellsAmmo: p.kind === 'shop' || p.kind === 'merchant',
        emptyText: p.kind === 'workshop' ? subtitle : undefined },
      onChoose: (i) => {
        req.onChoose(i);
        if (entries.find(e => e.index === i)?.refresh) refresh();
      },
    });
  }

  /** Buys an item: pays, equips it or puts it in the backpack. */
  private buy(p: Przedmiot) {
    if (p.pojazd && this.ownsVehicle(p.id)) return this.toast('Masz już ten pojazd.');
    const diamonds = p.cenaDiamenty ?? 0;
    if (diamonds ? session.diamenty < diamonds : session.coins < this.cenaDla(p)) {
      this.toast(diamonds ? `Za mało diamentów – ${p.nazwa} kosztuje ${diamonds} 💎.` : `Za mało monet – ${p.nazwa} kosztuje ${this.cenaDla(p)}.`);
      return;
    }
    const where = addItem(p.id);
    if (!where) {
      this.toast('Plecak pełny! Zrób miejsce w karcie postaci.');
      return;
    }
    if (diamonds) session.diamenty -= diamonds;
    else spend(this.cenaDla(p));
    repair(p.id); // a new one is whole
    const kind = ammoOf(p);
    const arrows = kind ? Math.min(STRZALY.zLukiem, ammoRoom(kind)) : 0;
    if (kind) addAmmo(kind, arrows);
    this.applySkill();
    this.emitHud();
    this.toast((where === 'equipped' ? `Kupiłeś i założyłeś: ${p.nazwa}!` : `Kupiłeś: ${p.nazwa} (w plecaku).`) + (kind && arrows ? ` Do tego ${arrows} ${AMUNICJA[kind].wielu}.` : ''));
    this.save();
  }

  private repairItem(id: string) {
    const cost = repairCost(id);
    if (!cost) return;
    if (session.coins < cost) return this.toast(`Za mało monet – naprawa kosztuje ${cost}.`, 2200);
    spend(cost);
    repair(id);
    this.emitHud();
    this.toast(`🔧 ${item(id)!.nazwa} jak nowy!`, 2000);
    this.save();
  }

  private buyArrows(k: Amunicja, n: number) {
    const a = AMUNICJA[k];
    const cost = n * a.cena;
    if (session.coins < cost) return this.toast(`Za mało monet – ${n} ${a.wielu} kosztuje ${cost}.`, 2200);
    spend(cost);
    addAmmo(k, n);
    this.emitHud();
    this.toast(`${a.ikona} +${n} ${a.wielu} (masz ${gear.ammo[k]}).`, 1800);
    this.save();
  }

  /** The weapon's state for the HUD line: worn %, broken, arrows left. */
  private wearLabel() {
    const id = gear.equip.bron;
    const c = condition(id);
    let out = '';
    if (c && (session.level.zuzycie || item(id)?.szklany)) {
      const pct = Math.max(1, Math.floor((100 * c.left) / c.max));
      if (c.left <= 0) out += ' · 🔧0%';
      else if (item(id)?.szklany) out += ` · ${c.left}/${c.max}`;
      else if (pct < 100) out += ` · ${pct}%`;
    }
    const k = ammoOf(item(id));
    if (k) out += ` · ${AMUNICJA[k].ikona}${gear.ammo[k]}`;
    return out;
  }

  /**
   * The glass sword bursts in the hero's hand: the artist's 4 frames once (100/100/100/180 ms, never
   * looped, one anchor for all frames), then the remains fade out (ikony12 B animation, 5 Oct 2026).
   */
  private shatterGlass() {
    if (!this.textures.exists('szklo-peka')) return;
    const size = WALKA.wielkoscBroni * 1.6 * SKALA_POSTACI;
    const img = this.add.image(this.player.x + 4 * SKALA_POSTACI, this.player.y - 8 * SKALA_POSTACI, 'szklo-peka', 0)
      .setDisplaySize(size, size).setDepth(this.player.depth + 2);
    const times = [100, 100, 100, 180];
    let at = 0;
    times.forEach((ms, f) => {
      this.time.delayedCall(at, () => img.active && img.setFrame(f));
      at += ms;
    });
    this.time.delayedCall(at, () => this.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() }));
  }

  /** One blow or shot wore the weapon: say when it got blunt, broke or shattered. */
  private wearWeapon(id: string | null | undefined) {
    const p = item(id);
    const r = useWeapon(id, session.level.zuzycie);
    if (!p || r === 'ok') return;
    if (r === 'warn') this.toast(`⚠️ ${p.nazwa} się tępi – napraw go w sklepie.`, 2600);
    else if (r === 'broken') this.toast(`🔧 ${p.nazwa} się zepsuł! Bije jak kijek, dopóki go nie naprawisz w sklepie.`, 3500);
    else {
      const spare = gear.bag.some((sl) => 'item' in sl && item(sl.item)?.miejsce === 'bron');
      this.toast(`💥 ${p.nazwa} pękł! ${spare ? 'Załóż inną broń z plecaka (karta postaci).' : 'Został ci kijek.'}`, 3000);
      if (p.szklany) this.shatterGlass();
      this.applySkill();
    }
    this.emitHud();
  }

  /** The next better item of each kind this place sells. */
  private offers(where: 'sklep' | 'biblioteka') {
    const out: Przedmiot[] = [];
    const groups: [Przedmiot['miejsce'], Przedmiot['rodzaj']?][] =
      where === 'biblioteka' ? [['bron', 'magia'], ['dystans', 'magia'], ['helm']] : [['bron'], ['bron', 'luk'], ['dystans'], ['zbroja'], ['helm'], ['buty']];
    for (const [miejsce, rodzaj] of groups) {
      const all = PRZEDMIOTY.filter((p) => p.miejsce === miejsce && p.rodzaj === rodzaj && p.cena > 0 && (p.gdzie ?? 'sklep') === where && !p.szklany && !p.narzedzie);
      if (miejsce === 'helm') {
        // Headwear is also about looks: every one not owned yet is on offer.
        out.push(...all.filter((p) => !owns(p.id)));
        continue;
      }
      const best = Math.max(0, ...all.filter((p) => owns(p.id)).map((p) => p.moc), miejsce === 'bron' && !rodzaj ? 1 : 0);
      const next = all.filter((p) => p.moc > best).sort((a, b) => a.moc - b.moc)[0];
      if (next) out.push(next);
    }
    // A side branch: the glass sword, always on offer while not owned.
    if (where === 'sklep') out.push(...PRZEDMIOTY.filter((p) => p.szklany && p.cena > 0 && !owns(p.id)));
    return out;
  }

  private label(p: Przedmiot) {
    if (p.pojazd) return `${p.nazwa} – ${p.cenaDiamenty ? `${p.cenaDiamenty} 💎` : `${this.cenaDla(p)} monet`} (+${Math.round((POJAZDY[p.pojazd].szybkosc - 1) * 100)}% prędkości)`;
    const what = p.miejsce === 'bron' ? `obrażenia ${p.moc}` : p.rodzaj === 'magia' ? `czary +${p.moc}` : `obrona ${p.moc}`;
    return `${p.nazwa} – ${this.cenaDla(p)} monet (${what})`;
  }

  private ownsVehicle(id: string) {
    return owns(id) || session.chest.slots.some((s) => s && 'item' in s && s.item === id);
  }

  private openShop(p: CityPlace, tab = 0) {
    const offers = this.offers('sklep');
    if (this.sellsAxe(p) && !ownsAxe()) offers.unshift(item('siekiera')!);
    const title = p.kind === 'merchant' ? `🛒 Stragany (${p.name})` : `🛒 ${p.name}`;
    const tabs = { labels: ['🛒 Kupuj', '💰 Sprzedaj'], active: tab, colors: [0x2f6f9f, 0x3fa34d] };
    const switchTab = (i: number) => i < 0 && this.openShop(p, -1 - i);
    if (tab === 1) {
      // Selling: each kind of goods in the backpack separately, and everything at once.
      const groups = (Object.keys(GRUPY) as Grupa[]).filter((g) => groupCount(g) > 0);
      const total = fruitValue();
      const lines = groups.map((g) => `${GRUPY[g].ikona} ${GRUPY[g].nazwa} ×${groupCount(g)} – ${groupValue(g)} monet`);
      const all = groups.length > 1 ? [`💰 Sprzedaj wszystko – ${total} monet`] : [];
      const text = groups.length ? `Co sprzedajesz? Masz ${session.coins} monet.` : 'Nie masz nic na sprzedaż. Zbieraj owoce, warzywa, grzyby i drewno – tu je skupimy.';
      this.shopDialog(p, {
        title, text, tabs,
        buttons: [...all, ...lines, 'Wyjdź'],
        onChoose: (i) => {
          if (i < 0) return switchTab(i);
          let v = 0;
          if (all.length && i === 0) v = sellAllFruit();
          else if (groups[i - all.length]) v = sellGroup(groups[i - all.length]);
          else return;
          earn(v);
          this.emitHud();
          this.toast(`Sprzedane za ${v} monet!`);
          this.save();
          this.openShop(p, 1);
        },
      }, [
        ...(all.length ? [{ id: 'sell:all', index: 0, name: 'Wszystkie zbiory', category: 'supplies' as const,
          picture: goodsPicture('owoce'), description: 'Sprzedaj wszystkie owoce, warzywa, grzyby, drewno i surowce z plecaka.', price: total, action: 'SPRZEDAJ WSZYSTKO' }] : []),
        ...groups.map((g, i) => shopGoods(g, i + all.length, GRUPY[g].nazwa, groupCount(g), groupValue(g))),
      ], () => this.openShop(p, 1), 'Kupiec odkupi twoje zbiory.');
      return;
    }
    // Grandma Grażynka's garden tools wait at the shop nearest her village.
    const tools = this.fixed.grazynkaStep() === 'sklep' && this.fixed.grazynkaShop()?.id === p.id ? ['🧺 Odbierz narzędzia babci Grażynki'] : [];
    // Repairs of worn weapons, and ammunition for every ranged weapon owned (+50, +100, full).
    const fixes = repairable();
    const packs = ownedAmmo().flatMap((k) => {
      const room = ammoRoom(k);
      return room > 0 ? [...new Set([50, 100].filter((n) => n < room).concat(room))].map((n) => ({ k, n, full: n === room })) : [];
    });
    const extra: [string, () => void][] = [
      ...fixes.map((id): [string, () => void] => {
        const c = condition(id)!;
        return [`🔧 Napraw: ${item(id)!.nazwa} (${Math.round((100 * c.left) / c.max)}%) – ${repairCost(id)} monet`, () => this.repairItem(id)];
      }),
      ...packs.map(({ k, n, full }): [string, () => void] => [`${AMUNICJA[k].nazwa} +${n}${full ? ' (do pełna)' : ''} – ${n * AMUNICJA[k].cena} monet`, () => this.buyArrows(k, n)]),
    ];
    const quiver = ownedAmmo().map((k) => `\n${AMUNICJA[k].ikona} ${AMUNICJA[k].nazwa}: ${gear.ammo[k]}/${STRZALY.kolczan}`).join('');
    const entries: ShopEntry[] = [
      ...tools.map((name, i): ShopEntry => ({ id: 'grazynka:tools', index: i, name, category: 'services',
        description: 'Narzędzia czekają dla babci Grażynki.', action: 'ODBIERZ' })),
      ...fixes.map((id, i): ShopEntry => ({ id: `repair:${id}`, index: tools.length + i, name: `Napraw: ${item(id)!.nazwa}`,
        category: 'services', picture: itemPictureUrl(id), description: 'Przywróć przedmiotowi pełną wytrzymałość.',
        stats: [['Wytrzymałość', `${condition(id)!.left}/${condition(id)!.max}`]], price: repairCost(id), action: 'NAPRAW', badge: '↻' })),
      ...packs.map(({ k, n }, i): ShopEntry => ({ id: `ammo:${k}:${n}`, index: tools.length + fixes.length + i,
        name: `${AMUNICJA[k].nazwa} +${n}`, category: 'ammo', picture: `items/${k}.png`,
        description: 'Uzupełnij zapas amunicji.', stats: [['Masz', `${gear.ammo[k]}/${STRZALY.kolczan}`],
          ['W zestawie', String(n)], ['Po zakupie', `${gear.ammo[k] + n}/${STRZALY.kolczan}`]],
        price: n * AMUNICJA[k].cena, action: 'KUP' })),
      ...offers.map((o, i) => shopItem(o, tools.length + extra.length + i, this.cenaDla(o))),
    ];
    this.shopDialog(p, {
      title, tabs,
      text: (p.kind === 'merchant' ? `Kupcy rozstawili stragany przy rondzie. Masz ${session.coins} monet.` : `Kowal za ladą poleca swój towar. Masz ${session.coins} monet.`) + quiver + (offers.length ? '' : '\n\nMasz już najlepsze rzeczy, jakie tu mają!'),
      buttons: [...tools, ...extra.map(([l]) => l), ...offers.map((o) => this.label(o)), 'Wyjdź'],
      icons: [...tools.map(() => null), ...fixes.map((id) => itemTexture(id)), ...packs.map(({ k }) => `item-${k}`), ...offers.map((o) => itemTexture(o.id)), null],
      onChoose: (i) => {
        if (i < 0) return switchTab(i);
        if (tools.length && i === 0) {
          if (this.fixed.pickUpTools()) this.dialog({ title: '🧺 Narzędzia', text: tr(GRAZYNKA.wSklepie), buttons: ['OK'], onChoose: () => {} });
          this.emitHud();
          return;
        }
        const e = extra[i - tools.length];
        if (e) {
          e[1]();
          return this.openShop(p, 0);
        }
        const o = offers[i - tools.length - extra.length];
        if (o) this.buy(o);
      },
    }, entries, () => this.openShop(p, 0), p.kind === 'merchant' ? 'Kupcy rozstawili stragany przy rondzie.' : 'Kowal za ladą poleca swój towar.');
  }

  /** Schools give quizzes: questions, riddles and number puzzles (content/quizy.ts, quizzes.ts). */
  private openSchool(p: CityPlace) {
    // d.a = questions answered today, d.n = when the break ends (minutes after midnight).
    const d = this.dailyCount(`szkola:${p.id}`);
    const title = `🏫 ${p.name}`;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (d.a >= SZKOLA_QUIZ.naSzkoleDziennie) {
      this.dialog({ title, text: 'Na dziś koniec lekcji w tej szkole. Wróć jutro albo zajrzyj do innej szkoły!', buttons: ['Do jutra!'], onChoose: () => {} });
      return;
    }
    if (d.a > 0 && d.a % SZKOLA_QUIZ.naLekcje === 0 && mins < d.n) {
      const hh = Math.floor(d.n / 60) % 24;
      const mm = String(d.n % 60).padStart(2, '0');
      this.dialog({ title, text: `🔔 Przerwa! Nauczyciele piją herbatę. Kolejne lekcje o ${hh}:${mm} – wróć wtedy.`, buttons: ['OK'], onChoose: () => {} });
      return;
    }
    this.dialog({
      title,
      text: `Nauczycielka zaprasza do tablicy: rachunki, łamigłówki, zagadki i wiedza o świecie – im dalej, tym trudniejsze.`, // no reward told up front (owner 7 Oct 2026)
      buttons: ['🧠 Quiz', 'Wyjdź'],
      onChoose: (i) => {
        if (i !== 0) return;
        const ll = this.city.toLatLon(p.door.x, p.door.y);
        const z = schoolQuiz(p.id, d.d, d.a, session.age, krajMapy(session.mapId, ll.lat, ll.lon));
        const nth = d.a;
        const hard = SZKOLA_QUIZ.trudniejOd.filter((from) => nth + 1 >= from).length;
        const tag = hard ? ` ${'🔥'.repeat(hard)}` : '';
        this.askRiddle(title, `📝 ${z.kategoria}${tag}`, z, SZKOLA_QUIZ.exp, `quiz:${p.id}:${d.d}:${nth}`, (right) => {
          d.a++;
          quizAnswered(z);
          // After a lesson (naLekcje questions) a break: back in przerwaMin minutes, rounded up to :x0/:x5.
          if (d.a % SZKOLA_QUIZ.naLekcje === 0) {
            const t = new Date();
            d.n = Math.ceil((t.getHours() * 60 + t.getMinutes() + SZKOLA_QUIZ.przerwaMin) / 5) * 5;
          }
          // A wizard also gets better at magic by thinking hard.
          if (right && gear.magic && SZKOLA_QUIZ.magia) this.practiced('magia', SZKOLA_QUIZ.magia);
        }, { coins: SZKOLA_QUIZ.monety, then: () => this.openSchool(p) });
      },
    });
  }

  /** A per-day counter kept in the save (session.daily). */
  private dailyCount(id: string) {
    const day = today();
    // Yesterday's school counters are not needed any more.
    for (const k of Object.keys(session.daily)) if (k.startsWith('szkola:') && session.daily[k].d !== day) delete session.daily[k];
    const d = session.daily[id];
    if (!d || d.d !== day) session.daily[id] = { d: day, n: 0, a: 0 };
    return session.daily[id];
  }

  /** Libraries teach magic and sell magic items. */
  private openLibrary(p: CityPlace, wSrodku = false) {
    // New controls test: magic skills are changed only here (owner: „biblioteki w przypadku magów”).
    if (live() && !wSrodku) {
      return this.dialog({
        title: `📚 ${p.name}`,
        text: 'Cicha czytelnia, a za regałami sala ćwiczeń magii. W co się zagłębisz?',
        buttons: ['📚 Wejdź do biblioteki', '🎯 Ćwicz umiejętności magii', 'Wyjdź'],
        onChoose: (i) => {
          if (i === 0) this.openLibrary(p, true);
          else if (i === 1) this.wyborUmiejetnosci(['magia'], `📚 ${p.name}`);
        },
      });
    }
    const offers = gear.magic ? this.offers('biblioteka') : [];
    const learn = gear.magic ? [] : [`Naucz się magii – ${NAUKA_MAGII} monet`];
    const left = BIBLIOTEKA_ZAGADKI.naSesje - session.libRiddles;
    // The learned society's survey: the way to a village (one per library per login).
    const known = this.missions.find((rm) => rm.m.placeId === p.id && (rm.m.id.endsWith(`-${session.nonce}`) || session.gen[rm.m.id]));
    const survey = known ? null : mapMissionForLibrary(this.city, p);
    // A finished survey from any library can be handed in here.
    const report = this.missions.find((rm) => rm.m.dowolnaBiblioteka && missionState(rm.m) === 'goal');
    const surveyBtn = report ? `📜 Oddaj relację: ${report.m.tytul}` : known ? `🗺 ${known.m.tytul}` : survey ? `🗺 ${survey.tytul} (+${survey.doswiadczenie} EXP)` : null;
    const riddleBtn = left > 0 ? `🧩 Zagadka bibliotekarki (zostały ${left})` : '🧩 Zagadki na dziś wyczerpane';
    const mapBtn = this.mamMapePodroznika() ? null : `🗺 Przepisz dworce z mapy – ${MAPA_PODROZNIKA.cena} 💰`;
    const entries: ShopEntry[] = [
      ...learn.map((_, i): ShopEntry => ({ id: 'learn:magic', index: i, name: 'Nauka magii', category: 'magic', picture: itemPictureUrl('ksiega'),
        description: 'Naucz się zaklęć, a potem wybierz różdżkę, kulę albo księgę.', price: NAUKA_MAGII, action: 'NAUCZ SIĘ', refresh: true })),
      ...offers.map((o, i) => shopItem(o, learn.length + i, this.cenaDla(o))),
      ...(surveyBtn ? [{ id: 'library:survey', index: learn.length + offers.length, name: surveyBtn.replace(/^[^\p{L}\p{N}]+/u, ''),
        category: 'services' as const, description: 'Porozmawiaj z bibliotekarką o wyprawie.', action: 'ROZMAWIAJ' }] : []),
      { id: 'library:riddle', index: learn.length + offers.length + Number(!!surveyBtn), name: riddleBtn.replace(/^[^\p{L}\p{N}]+/u, ''),
        category: 'services', description: 'Bibliotekarka przygotowała zagadki.', action: 'ROZMAWIAJ' },
      ...(mapBtn ? [{ id: 'library:mapa', index: learn.length + offers.length + Number(!!surveyBtn) + 1, name: 'Przepisz dworce z mapy', category: 'services' as const,
        description: `Bibliotekarka pozwoli przepisać ze swojej mapy dworce i porty w promieniu ${MAPA_PODROZNIKA.promienKm} km.`, price: MAPA_PODROZNIKA.cena, action: 'PRZEPISZ' }] : []),
    ];
    this.shopDialog(p, {
      title: `📚 ${p.name}`,
      text: gear.magic
        ? `Bibliotekarka szepcze: magii nie ćwiczy się w ciszy. Masz ${session.coins} monet.`
        : `W starych księgach zapisano sztukę magii. Po nauce będziesz też magiem: przytrzymaj atak z różdżką, kulą albo księgą w ręce, by rzucać zaklęcia. Masz ${session.coins} monet.`,
      buttons: [...learn, ...offers.map((o) => this.label(o)), ...(surveyBtn ? [surveyBtn] : []), riddleBtn, ...(mapBtn ? [mapBtn] : []), 'Wyjdź'],
      icons: [...learn.map(() => null), ...offers.map((o) => itemTexture(o.id)), ...(surveyBtn ? [null] : []), null, ...(mapBtn ? [null] : []), null],
      onChoose: (i) => {
        const at = learn.length + offers.length;
        if (surveyBtn && i === at) {
          if (report) return this.openMissionDialog(report);
          if (known) return this.openMissionDialog(known);
          const m = survey!;
          const rm: ResolvedMission = { m, door: { ...p.door, building: p.building ?? undefined }, target: resolvePlace(this.city, m.zadanie.miejsce) };
          return this.openMissionDialog(rm, () => {
            session.gen[m.id] = m;
            this.addMission(rm, false);
          });
        }
        if (i === at + (surveyBtn ? 1 : 0)) return this.libraryRiddle(p);
        if (mapBtn && i === at + (surveyBtn ? 1 : 0) + 1) return this.buyTravellerMap(() => this.openLibrary(p, true), `Bibliotekarka – ${p.name}`);
        if (learn.length && i === 0) {
          if (session.coins < NAUKA_MAGII) {
            this.toast(`Za mało monet – nauka kosztuje ${NAUKA_MAGII}.`);
            return;
          }
          spend(NAUKA_MAGII);
          gear.magic = true;
          this.emitHud();
          this.toast('Jesteś teraz także magiem! Kup różdżkę, by rzucać zaklęcia.', 3000);
          this.save();
          return;
        }
        const o = offers[i - learn.length];
        if (o) this.buy(o);
      },
    }, entries, () => this.openLibrary(p, true), 'Księgi, magia i opowieści z dalekich wypraw.');
  }

  /** A librarian's riddle: at most BIBLIOTEKA_ZAGADKI.naSesje per session, one try each. */
  private libraryRiddle(p: CityPlace) {
    const { naSesje, exp } = BIBLIOTEKA_ZAGADKI;
    if (session.libRiddles >= naSesje) {
      this.dialog({ title: `📚 ${p.name}`, text: `Bibliotekarka uśmiecha się: „Na dziś wystarczy – zadałam ci już ${naSesje} zagadki. Wróć następnym razem!”`, buttons: ['OK'], onChoose: () => {} });
      return;
    }
    const n = session.libRiddles++;
    const r = riddleFor({ id: `lib:${p.id}:${session.nonce}:${n}`, x: 0, y: 0, name: '', greeting: '', difficulty: 0 }, today(), session.age);
    this.dialog({
      title: `🧩 Zagadka bibliotekarki (${n + 1}/${naSesje})`,
      text: `${r.question}\n\nTylko jedna próba!`,
      buttons: [...r.answers],
      odpowiedzi: true,
      onChoose: (i) => {
        const right = i === r.correct;
        if (right) {
          session.exp += exp;
          session.stats.riddles = (session.stats.riddles ?? 0) + 1;
          this.emitHud();
        }
        this.dialog({
          title: right ? '🎉 Brawo!' : '😕 Niestety…',
          text: right ? `Dobra odpowiedź! +${exp} EXP.` : `Dobra odpowiedź to: ${r.answers[r.correct]}.`,
          buttons: ['OK'],
          onChoose: () => {},
        });
        this.save();
      },
    });
  }

  /**
   * The heal button (🧪/🍎, key H): a potion when 2+ hearts are missing (or
   * there isn't enough fruit), else 20 fruit for one heart.
   */
  /** Fruit eaten for one heart (fewer in the QR demo). */
  fruitPerHeart() {
    return demo.on ? SEN.owocowNaSerce : LECZENIE_OWOCAMI.owocow;
  }

  /**
   * The HUD's heal button (and key H), as the spec says: a potion when there is one,
   * else fruit (LECZENIE_OWOCAMI.owocow for one heart).
   */
  healButton() {
    if (this.player.isDead) return;
    if (this.player.hp >= PLAYER.maxHp) return this.toast('Masz pełne zdrowie.', 1200);
    if (session.mikstury > 0) return this.drinkPotion();
    if (totalFruit() >= this.fruitPerHeart()) return this.eatFruit();
    if (nextFood()) return this.eatPreparedFood();
    this.toast(`Nie masz czym się uleczyć: zbierz ${this.fruitPerHeart()} owoców albo kup miksturę u alchemika (stacja benzynowa).`, 3000);
  }

  quickHeal() {
    return this.healButton();
  }

  private eatPreparedFood() {
    const food = nextFood();
    if (!food || this.player.isDead || this.player.hp >= PLAYER.maxHp) return;
    if (!takeItem(food.id)) return;
    this.player.heal(2 * food.leczenie!);
    this.emitHud(); this.save();
    this.toast(`${foodIcon(food.id) ?? '🥣'} Zjedzone: ${food.nazwa}. +${food.leczenie} ${food.leczenie === 1 ? 'serce' : food.leczenie! < 5 ? 'serca' : 'serc'}.`);
  }

  /** A potion: full health and a bonus (blue) heart for a while; it also cures a dragon's poison, burns and acid. */
  private drinkPotion() {
    session.mikstury--;
    this.stany = {};
    this.player.heal(PLAYER.maxHp);
    this.player.extra = ALCHEMIK.premiaSerc * 2;
    this.player.extraUntil = Date.now() + ALCHEMIK.premiaMinut * 60_000;
    this.toast(`🧪 Glup, glup! Pełne zdrowie i dodatkowe serduszko na ${ALCHEMIK.premiaMinut} minut.`, 2500);
    this.emitHud();
  }

  /** The alchemist at a petrol station: 50 fruit → a healing potion. */
  private openAlchemist(p: CityPlace) {
    // The hermit's recipe (flag receptura_alchemika, Stary Gród Q6): a potion from 30 fruit instead of 50.
    const n = session.flagi.receptura_alchemika ? Math.min(ALCHEMIK.owocow, 30) : ALCHEMIK.owocow;
    const have = totalFruit();
    this.dialog({
      title: `⚗️ Alchemik – ${p.name}`,
      text: `Na zapleczu stacji bulgocze kociołek. Alchemik mruczy: „Daj mi ${n} owoców albo grzybów, a uwarzę ci miksturę: wyleczy cię całego i przez ${ALCHEMIK.premiaMinut} minut da ci dodatkowe serduszko.”\n\nMasz ${have} owoców i ${session.mikstury} ${session.mikstury === 1 ? 'miksturę' : 'mikstur'}. Miksturę wypijesz przyciskiem 🧪 (klawisz H).`,
      buttons: [`🧪 Uwarz miksturę (${n} owoców)`, ...ESENCJE.map((e) => `${e.ikona} ${e.nazwa} (${this.recipeText(e)})`), 'Wyjdź'],
      onChoose: (i) => {
        if (i >= 1 && i <= ESENCJE.length) return this.brewEssence(ESENCJE[i - 1]);
        if (i !== 0) return;
        if (!eatInventoryFruit(n)) return this.toast(`Za mało owoców – potrzeba ${n}, masz ${have}.`, 2500);
        session.mikstury++;
        this.toast('🧪 Masz nową miksturę!', 1800);
        this.emitHud();
        this.save();
      },
    });
  }

  private recipeText(e: Esencja) {
    return (Object.entries(e.przepis) as [Grupa, number][]).map(([g, n]) => `${n} ${GRUPY[g].nazwa.toLowerCase()}`).join(', ');
  }

  /** An essence (content/esencje.ts): the alchemist brews a flask into the backpack from what the recipe asks. */
  private brewEssence(e: Esencja) {
    const need = Object.entries(e.przepis) as [Grupa, number][];
    const short = need.filter(([g, n]) => groupCount(g) < n);
    if (short.length) return this.toast(`Alchemik kręci głową: „Potrzebuję: ${this.recipeText(e)}” (masz ${need.map(([g]) => `${GRUPY[g].nazwa.toLowerCase()} ${groupCount(g)}`).join(', ')}).`, 3500);
    if (gear.bag.length >= PLECAK.miejsc) return this.toast('Plecak pełny – nie ma gdzie schować flakonika.', 2500);
    for (const [g, n] of need) takeGroup(g, n);
    addEssence(e.id);
    this.toast(`${e.ikona} ${e.nazwa} jest w plecaku. Przeciągnij ją na broń (karta postaci → Ekwipunek): działa ${e.minut} minut.`, 4000);
    this.emitHud();
    this.save();
  }

  /** How much harder a blow lands with the weapon's essence (frost on the creatures sensitive to it). */
  private essenceBoost(e: Esencja | undefined, s: Enemy) {
    return e?.wrazliwe?.includes(s.kindId) ? e.mnoznik ?? 1 : 1;
  }

  /** The essence's side effect on a creature that survived the blow: stunned (oak) or frozen (frost). */
  private essenceHit(e: Esencja | undefined, s: Enemy, now: number) {
    if (!e || s.isDead || Math.random() >= e.szansa) return;
    if (e.efekt === 'oglusz') s.daze(now, e.ms);
    else s.daze(now, e.ms, '❄️', 0x9be7ff);
  }

  /** Eating fruit (character sheet): 20 fruit = one heart. Returns the new health, or null. */
  eatFruit(): number | null {
    if (this.player.isDead || this.player.hp >= PLAYER.maxHp) return null;
    if (!eatInventoryFruit(this.fruitPerHeart())) return null;
    this.player.heal(2 * LECZENIE_OWOCAMI.serduszek);
    this.emitHud();
    this.toast('Mniam! +1 ❤', 1200);
    return this.player.hp;
  }

  /** After things were put on or off in the character sheet. */
  /** What the hero wears that shows on the sprite. */
  private worn() {
    return { helm: gear.equip.helm, armor: gear.equip.zbroja, boots: gear.equip.buty };
  }

  /** Redraws the hero when a helmet, armour or boots go on or off. */
  private refreshLook() {
    if (hdOn) {
      // The new heroes: only the chosen character (character sheet) changes the picture.
      const key = heroTextureKey(session.look.postac, session.name, session.look);
      if (this.player.texture.key === key) return;
      const frame = this.player.frame.name;
      this.player.anims.stop();
      this.player.setTexture(useHdHero(this, session.look.postac, session.name, session.look), frame);
      fitHd(this.player);
      this.game.events.emit('hero-look');
      return;
    }
    const w = JSON.stringify(this.worn());
    if (w === this.wornKey) return;
    this.wornKey = w;
    const frame = this.player.frame.name;
    makePlayerTexture(this, session.look, this.worn());
    this.player.setTexture(PLAYER_TEX, frame);
  }

  gearChanged() {
    this.applySkill();
    this.vision = []; // a glowing sword changes how far we see
    this.emitHud();
  }

  /** For automated browser checks. */
  debugSession() {
    return session;
  }

  debugGear() {
    return gear;
  }

  debugAddFruit(f: Owoc) {
    return addFruit(f);
  }

  /** Shops and schools for the map screen. */
  placeMarkers() {
    return this.city.places.map((p) => ({ x: p.door.x, y: p.door.y, kind: p.kind }));
  }

  /** `onAccept` is for random missions: they join the game only when taken. */
  private openMissionDialog(rm: ResolvedMission, onAccept?: () => void) {
    const m = rm.m;
    const st = missionState(m);
    // The giver speaks (Misja.postac): their name over the mission's.
    const who = m.postac ? `${m.postac.imie} – ${m.tytul}` : m.tytul;
    if (m.zadanie.typ === 'brak' && !m.etapy?.length) {
      // Just a place (e.g. a partner with a secret code on a flyer).
      this.missionDialog(m, { title: who, text: m.opis, buttons: ['Do widzenia'], onChoose: () => {} });
    } else if (st === 'new' && this.questCount() >= ZADAN_NARAZ) {
      this.missionDialog(m, {
        title: who,
        text: `${m.opis}\n\n${tx(`Masz już ${ZADAN_NARAZ} zadania naraz – wróć, gdy skończysz któreś. (Aktywne zadania zobaczysz w karcie postaci 👤.)`, `You already have ${ZADAN_NARAZ} active quests. Finish one before accepting another. View active quests in your character sheet 👤.`)}`,
        buttons: ['OK'],
        onChoose: () => {},
      });
    } else if (st === 'new') {
      this.missionDialog(m, {
        title: who,
        // Owner 7 Oct 2026: no reward told when a quest is offered – only the explorers' (library) survey says it, so the player knows how far it sends him.
        text: m.opis + (m.dowolnaBiblioteka ? `\n\n${this.rewardText(m)}.` : '') + (m.wymaga?.zabierz && m.wymaga.przedmiot ? `\n\n(Oddajesz: ${item(m.wymaga.przedmiot)?.nazwa ?? m.wymaga.przedmiot})` : ''),
        buttons: [tx('Przyjmuję','Accept'), tx('Nie teraz','Not now')],
        onChoose: (i) => {
          if (i !== 0 || this.questsFull()) return;
          const w = m.wymaga;
          if (w?.zabierz && w.przedmiot) {
            if (!takeItem(w.przedmiot)) return this.toast(`Nie masz już: ${item(w.przedmiot)?.nazwa ?? w.przedmiot}`, 2500);
            this.gearChanged();
          }
          // Refuse a stale offer if another place already bound this scenario.
          if (m.scenariusz && (session.gen[m.id] || missionState(m) !== 'new')) return;
          if (m.scenariusz) session.gen[m.id] = m;
          setMissionState(m, 'active');
          session.etap[m.id] = 0;
          rm.target = stageTarget(this.city, m, rm.door);
          if (onAccept) onAccept(); // adds it, which also spawns its enemies
          else this.startMissionGoal(rm);
          this.refreshMarkers();
          this.emitHud();
          this.save();
          this.etapy.begin(rm);
        },
      });
    } else if (st === 'active') {
      // A talk, riddle, choice… happening right at this door: start it (again) instead of „not yet”.
      if (this.etapy.poke(rm)) return;
      const z = zadanieOf(m);
      const count = z.typ === 'zbierz' && z.towar ? ` (masz ${fruitCount(z.towar)} z ${z.ile})` : '';
      const part = stageCount(m) > 1 ? tx(` (etap ${stageIndex(m) + 1} z ${stageCount(m)})`, ` (stage ${stageIndex(m) + 1} of ${stageCount(m)})`) : '';
      this.missionDialog(m, { title: who, text: `${tx('Jeszcze nie skończyłeś','Still in progress')}${part}.\n\n${tx('Cel','Goal')}: ${z.cel}${count}`, buttons: ['OK'], onChoose: () => {} });
    } else if (st === 'goal') {
      this.finishMission(rm);
    } else {
      this.missionDialog(m, { title: who, text: 'Dziękujemy jeszcze raz za pomoc!', buttons: ['OK'], onChoose: () => {} });
    }
  }

  /** A shop price: the steam pistol costs half with the gunsmith's drawing (flag schemat_pistoletu, Stary Gród Q2). */
  private cenaDla(p: { id: string; cena: number }) {
    return p.id === 'pistolet_parowy' && session.flagi.schemat_pistoletu ? Math.round(p.cena / 2) : p.cena;
  }

  /** "Nagroda: 150 EXP, 20 monet, Gwizdek Maszynisty i 1 💎" for the mission dialogs. */
  private rewardText(m: Misja) {
    const parts = [
      m.nagroda ? `${m.nagroda} ${tx('monet','coins')}` : '',
      `${missionExp(m)} EXP`,
      m.przedmiot ? item(m.przedmiot)?.nazwa ?? '' : '',
      ...(m.przedmioty ?? []).map((id) => item(id)?.nazwa ?? ''),
      m.tytul_bohatera ? `tytuł „${m.tytul_bohatera}”` : '',
      m.diamenty ? `${m.diamenty} 💎` : '',
      m.flaga ? FLAGI_NAZWY[m.flaga] : '',
    ].filter(Boolean);
    const last = parts.pop();
    return `${tx('Nagroda','Reward')}: ${parts.length ? `${parts.join(', ')} ${tx('i','and')} ${last}` : last}`;
  }

  /** The reward dialog: at the mission's door, or right at the goal for „zakończ na miejscu” missions. */
  private finishMission(rm: ResolvedMission) {
    const m = rm.m;
    // Who says the closing words: the person at the goal for missions ending there, else the giver.
    const z = zadanieOf(m);
    const speaker = (m.naMiejscu || m.etapy?.length) && z.postac ? z.postac.imie : m.postac?.imie;
    this.missionDialog(m, {
      title: speaker ? `${speaker} – ${m.tytul}` : m.tytul,
      text: `${m.zakonczenie}\n\n${this.rewardText(m)}`,
      buttons: [tx('Dziękuję!','Thank you!')],
      onChoose: () => {
        if (missionState(m) !== 'goal') return; // already handed in (a double tap)
        const z = m.zadanie;
        if (!m.etapy?.length && z.typ === 'zbierz' && z.towar && !takeFruit(z.towar, z.ile ?? 1)) {
          // Refuse a stale offer if another place already bound this scenario.
          if (m.scenariusz && (session.gen[m.id] || missionState(m) !== 'new')) return;
          if (m.scenariusz) session.gen[m.id] = m;
          setMissionState(m, 'active');
          this.refreshMarkers();
          this.toast('Czegoś jednak brakuje w plecaku!');
          return;
        }
        earn(m.nagroda);
        session.stats.missions++;
        session.exp += missionExp(m);
        if (m.diamenty) {
          session.diamenty += m.diamenty;
          this.time.delayedCall(400, () => this.toast(`💎 +${m.diamenty} ${m.diamenty === 1 ? 'diament' : 'diamenty'}!`, 2500));
        }
        const gifts = [m.przedmiot, ...(m.przedmioty ?? [])].filter((x): x is string => !!x && !!item(x));
        if (gifts.length) {
          const lost = gifts.filter((id) => !addItem(id));
          const got = gifts.filter((id) => !lost.includes(id));
          this.toast([got.length ? `Dostałeś: ${got.map((id) => item(id)!.nazwa).join(', ')}!` : '', lost.length ? `Plecak pełny – przepadło: ${lost.map((id) => item(id)!.nazwa).join(', ')}.` : ''].filter(Boolean).join('\n'), 2500);
          this.gearChanged();
        }
        if (m.flaga && m.flaga !== 'znizka_woznica' && !session.flagi[m.flaga]) {
          session.flagi[m.flaga] = 1;
          const what = m.flaga;
          this.time.delayedCall(2600, () => this.toast(what === 'schemat_pistoletu' ? '📜 Schemat pistoletu: pistolet parowy w sklepach za pół ceny!' : '📜 Receptura alchemika: mikstura z 30 owoców zamiast 50!', 4000));
        }
        if (m.tytul_bohatera) {
          session.story.title = m.tytul_bohatera;
          this.time.delayedCall(1200, () => this.toast(`🏅 Nowy tytuł: ${m.tytul_bohatera}!`, 3000));
        }
        delete session.etap[m.id];
        if (m.flaga === 'znizka_woznica' && !session.flagi.znizka_woznica) {
          session.flagi.znizka_woznica = 1;
          session.flagi.przejazd = (session.flagi.przejazd ?? 0) + 1;
          this.time.delayedCall(2600, () => this.toast(`🐴 Zniżka u woźniców: −${Math.round(WOZNICA.znizka * 100)}% na zawsze, a na dworcu ${WOZNICA.gratisNaStacji} jeden kurs gratis!`, 4000));
        }
        setMissionState(m, 'done');
        this.plainAgain(m.id);
        this.refreshMarkers();
        this.emitHud();
        this.save(); // finishing a mission is a save point
      },
    });
  }

  /**
   * The goal is reached (enemies beaten, spot reached, things gathered, riddle solved): back to the
   * door for the reward, or – „zakończ na miejscu” – the reward right here, so a chain flows on.
   */
  private reachGoal(rm: ResolvedMission, said?: string) {
    setMissionState(rm.m, 'goal');
    this.refreshMarkers();
    // Multi-stage missions end where their last stage happens (its last stage is usually the talk with the giver).
    if (rm.m.naMiejscu || rm.m.etapy?.length) {
      this.finishMission(rm);
      return;
    }
    if (said !== undefined) this.toast(`${said} ${tx('Wróć do', 'Return to')}: ${rm.m.adres}`);
  }

  /**
   * The current stage is done: its story items change hands, its closing words show, and the mission moves
   * on to the next stage – or, after the last one, to its reward (reachGoal). One-stage missions go straight on.
   */
  completeStage(rm: ResolvedMission, said?: string) {
    const m = rm.m;
    if (missionState(m) !== 'active') return;
    const z = zadanieOf(m);
    const completedIndex = stageIndex(m);
    if (m.etapy?.length && z.typ === 'zbierz' && z.towar && !takeFruit(z.towar, z.ile ?? 1)) return;
    giveStory(z.daje);
    takeStory(z.zabiera);
    const last = stageIndex(m) >= stageCount(m) - 1;
    const after = () => {
      if (missionState(m) !== 'active' || stageIndex(m) !== completedIndex) return;
      if (last) return this.reachGoal(rm, said);
      session.etap[m.id] = stageIndex(m) + 1;
      rm.target = stageTarget(this.city, m, rm.door);
      this.startMissionGoal(rm);
      this.emitHud();
      this.save();
      if (said && !m.scenariusz) this.toast(`${said}Dalej: ${zadanieOf(m).cel}`, 2500);
      this.etapy.begin(rm);
    };
    if (m.scenariusz && said && z.typ === 'decyzja') z.komunikat = said;
    const gave = z.daje?.length ? `\n\n📜 Masz: ${z.daje.join(', ')}` : '';
    // The closing words (komunikat), then the next stage. One-stage missions keep their old messages.
    if (m.etapy?.length && (z.komunikat || gave)) this.dialog({ ...z.dialogueMeta, title: m.tytul, text: `${z.komunikat ?? ''}${gave}`.trim(), buttons: [tx('Dalej','Next')], onChoose: after });
    else after();
  }

  /** A timed walk ran out: back to the stage before it, no penalty. */
  stageBack(rm: ResolvedMission) {
    const m = rm.m;
    session.etap[m.id] = Math.max(0, stageIndex(m) - 1);
    rm.target = stageTarget(this.city, m, rm.door);
    this.startMissionGoal(rm);
    this.emitHud();
    this.dialog({ title: `⏱ ${m.tytul}`, text: 'Czas minął! Spróbuj jeszcze raz.', buttons: ['Jeszcze raz'], onChoose: () => {} });
  }

  /** A mission dialog; where a secret code can be told, it gets one more button. */
  private missionDialog(m: Misja, req: DialogRequest) {
    if (!session.secrets.has(m.id)) return this.dialog(req);
    const secret = '🤫 Psst, mam tajemne hasło';
    this.dialog({
      ...req,
      buttons: [...req.buttons.slice(0, -1), secret, ...req.buttons.slice(-1)],
      onChoose: (i) => {
        const at = req.buttons.length - 1;
        if (i === at) this.tellSecret(m);
        else req.onChoose(i > at ? i - 1 : i);
      },
    });
  }

  /** Asks for a code (from a flyer in the real place) and gives its reward. */
  private async tellSecret(m: Misja) {
    if (gear.bag.length >= PLECAK.miejsc) {
      this.toast('Zrób najpierw miejsce w plecaku – nagroda musi się zmieścić!', 3000);
      return;
    }
    this.scene.pause();
    const code = await askText('🤫 Tajemne hasło', 'Ktoś tu nachyla się i szepcze: „Znasz hasło?”', 'hasło z ulotki');
    this.scene.resume();
    consumeAttack();
    if (!code) return;
    try {
      const { reward } = await api.redeem(session.token, m.id, code);
      const p = item(reward);
      if (!p || !addItem(reward)) throw new Error('Nie udało się odebrać nagrody.');
      session.stats.codes++;
      this.gearChanged();
      this.dialog({
        title: '✨ Hasło przyjęte!',
        text: `Dostajesz: ${p.nazwa}!${p.opis ? `\n\n${p.opis}` : ''}`,
        buttons: ['Wow, dzięki!'],
        onChoose: () => {},
      });
      this.save();
    } catch (e) {
      this.toast((e as Error).message, 3000);
    }
  }

  private markersAt = 0;
  private clockAt = 0;

  private checkGoals() {
    // Chains: a mission shows up as soon as its requirements are met (level, earlier mission, an item).
    if (this.time.now > this.markersAt) {
      this.markersAt = this.time.now + 1000;
      this.refreshMarkers();
    }
    this.etapy.update(this.missions, this.time.now, this.game.loop.delta);
    // A timed walk: the HUD line counts down.
    if (this.time.now > this.clockAt && this.missions.some((rm) => this.etapy.secondsLeft(rm.m.id, this.time.now) !== null)) {
      this.clockAt = this.time.now + 1000;
      this.emitHud();
    }
    for (const rm of this.missions) {
      const z = zadanieOf(rm.m);
      const st = missionState(rm.m);
      const multi = !!rm.m.etapy?.length;
      if (z.typ === 'zbierz' && z.towar) {
        // Enough in the backpack: take it back. (Sold or eaten meanwhile: not yet.)
        const have = fruitCount(z.towar) >= (z.ile ?? 1);
        if (st === 'active' && have) {
          if (multi) this.completeStage(rm, 'Masz wszystko! ');
          else this.reachGoal(rm, 'Masz wszystko! ');
        } else if (!multi && st === 'goal' && !have) {
          setMissionState(rm.m, 'active');
          this.refreshMarkers();
        }
        continue;
      }
      if (z.typ !== 'idz' || st !== 'active' || !rm.target) continue;
      if (Phaser.Math.Distance.Between(rm.target.x, rm.target.y, this.player.x, this.player.y) < GOAL_RADIUS) {
        // New controls: arriving only shows how to finish it – a double tap does (questTap).
        if (live()) {
          if (this.goalHinted !== rm.m.id) {
            this.goalHinted = rm.m.id;
            this.toast(`👆👆 Jesteś na miejscu – stuknij dwa razy (albo E), żeby: ${rm.m.tytul}`, 3200);
          }
          continue;
        }
        this.arriveGoal(rm);
      }
    }
  }

  private goalHinted = '';

  /** The hero reached a walk goal: what the mission says there, or the stage done. */
  private arriveGoal(rm: ResolvedMission) {
    const z = zadanieOf(rm.m);
    const multi = !!rm.m.etapy?.length;
    if (!multi && z.komunikat && !rm.m.naMiejscu) {
      setMissionState(rm.m, 'goal');
      this.refreshMarkers();
      this.dialog({ title: `🗺 ${rm.m.tytul}`, text: z.komunikat, buttons: ['Wracam!'], onChoose: () => this.emitHud() });
    } else this.completeStage(rm, 'Dotarłeś! ');
  }

  /** Mission doors for the map screen. */
  missionMarkers() {
    return this.missions.filter((rm) => missionAvailable(rm.m) && missionState(rm.m) !== 'done').map((rm) => ({ x: rm.door.x, y: rm.door.y, done: false }));
  }

  goalPosition() {
    return this.activeQuests().find((q) => q.pos)?.pos ?? null;
  }

  /** Radius (px) of the area to search, for wanted villains; 0 otherwise. */
  goalRadius() {
    const rm = this.missions.find((r) => missionState(r.m) === 'active');
    return rm && zadanieOf(rm.m).szukaj ? SEARCH_RADIUS + 10 : 0;
  }

  private appliedLevel = '';

  /** The level bonus (and worn items' life/speed): more life (the new part comes filled) and faster walking. */
  private applyLevel() {
    const lvl = poziomPostaci(session.exp);
    const zycie = gearLifeBonus();
    const bieg = gearSpeedBonus();
    const key = `${lvl}|${zycie}|${bieg}`;
    if (key === this.appliedLevel && this.player.speed !== PLAYER.speed) return;
    this.appliedLevel = key;
    const max = zyciePostaci(session.level.serca, session.exp) + zycie;
    if (max > PLAYER.maxHp && !this.player.isDead) this.player.hp += max - PLAYER.maxHp;
    PLAYER.maxHp = max;
    this.player.hp = Math.min(this.player.hp, max);
    // The demo's protection from death must not grant the administrator's fivefold speed.
    this.player.speed = PLAYER.speed * szybkoscPostaci(session.exp) * (1 + bieg) * (session.immortal && !demo.on ? ADMIN_SZYBKOSC : 1);
  }

  /**
   * Active quests (the story first, then challenges and missions), at most
   * ZADAN_NARAZ, each with its arrow colour (kept while it stays active).
   */
  activeQuests(): QuestInfo[] {
    const list: Omit<QuestInfo, 'color'>[] = [];
    // The demo's own goal takes the story's place; quests taken in the demo (a newsboy's errand) still get their
    // arrows (owner, 12 Oct 2026: after taking the newsboy's quest no arrow showed).
    const main = this.demoRun ? this.demoRun.goal() : this.story.goal();
    if (main) list.push({ id: this.demoRun ? 'demo' : 'main', main: true, title: this.demoRun ? 'Demo' : 'Cień smoka', ...main });
    for (const q of this.sideQuests()) list.push({ ...q, main: false });
    const ids = new Set(list.map((q) => q.id));
    for (const k of [...questColors.keys()]) if (!ids.has(k)) questColors.delete(k);
    const out: QuestInfo[] = list.slice(0, ZADAN_NARAZ).map((q) => {
      if (q.main) return { ...q, color: KOLOR_GLOWNEGO };
      if (!questColors.has(q.id)) {
        const used = new Set(questColors.values());
        questColors.set(q.id, KOLORY_ZADAN.find((c) => !used.has(c)) ?? KOLORY_ZADAN[questColors.size % KOLORY_ZADAN.length]);
      }
      return { ...q, color: questColors.get(q.id)! };
    });
    // The start tutorial's arrow to the nearest newsboy (not a quest either).
    if (this.samouczekCel) {
      const c = this.samouczekCel;
      const m = Phaser.Math.Distance.Between(c.x, c.y, this.player.x, this.player.y) / PX_PER_M;
      out.push({ id: 'samouczek', main: false, title: `🗞 ${c.name}`, text: `🗞 ${c.name} – pierwsze zlecenie (${Math.round(m)} m)`, pos: { x: c.x, y: c.y }, color: '#ffd76a' });
    }
    // The traveller's map's guide: its own arrow, not counted among the quests.
    if (droga) {
      const pos = this.city.fromLatLon(droga.lat, droga.lon);
      const km = Phaser.Math.Distance.Between(pos.x, pos.y, this.player.x, this.player.y) / PX_PER_M / 1000;
      out.push({ id: 'droga', main: false, title: `🧭 Droga do: ${droga.nazwa}`, text: `🧭 ${IKONA_HUBA[droga.rodzaj]} ${droga.nazwa} (${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`})`, pos, color: MAPA_PODROZNIKA.kolor });
    }
    // Underground the surface's goals lie on another map: no arrows; one line about the dungeon instead (no arrow
    // either – finding the way is the point).
    if (this.loch) {
      const n = this.loch.zostalo;
      const skrzynia = this.loch.skrzyniaPowod();
      const text = skrzynia === 'pusta' ? '🕯 Skrzynia otwarta – schody na górę czekają przy wejściu.' : n ? `🕯 ${this.loch.opis.nazwa}: ${n === 1 ? 'został 1 potwór' : `zostało ${n} potworów`}, skrzynia w najdalszej komnacie` : '🕯 Loch czysty – skrzynia czeka w najdalszej komnacie';
      return [{ id: 'loch', main: false, title: `🕯 ${this.loch.opis.nazwa}`, text, pos: null, color: '#ffb35c' }, ...out.map((q) => ({ ...q, pos: null }))];
    }
    return out;
  }

  /** Quests counted for the limit (the traveller's map's guide is not one). */
  private questCount() {
    return this.activeQuests().filter((q) => q.id !== 'droga' && q.id !== 'samouczek').length;
  }

  /**
   * Has the hero copied this area's hubs onto his map? Each copy covers only the area around where it was done
   * (owner, 13 Oct 2026: copied in Lublin, it says nothing about the station in Lębork).
   */
  mamMapePodroznika() {
    const here = this.city.toLatLon(this.player.x, this.player.y);
    return this.mapyPodroznika().some((m) => odleglosc(m, here) < MAPA_PODROZNIKA.promienKm * MAPA_PODROZNIKA.nowaOd);
  }

  /** The copies made (where, and which hubs). */
  mapyPodroznika() {
    return session.mapyPodroznika;
  }

  /** The hub the traveller's map guides to (map screen). */
  drogaDo() {
    return droga;
  }

  /** Map screen „🧭 Prowadź”: the arrow points to this hub (null = stop guiding). */
  prowadzDo(h: Hub | null) {
    droga = h;
    if (h) this.toast(`🧭 Strzałka prowadzi do: ${h.nazwa}`, 2500);
    this.emitHud();
  }

  /** Arrived at the guided hub: the guide ends. */
  private checkDroga() {
    if (!droga) return;
    const pos = this.city.fromLatLon(droga.lat, droga.lon);
    if (Phaser.Math.Distance.Between(pos.x, pos.y, this.player.x, this.player.y) > MAPA_PODROZNIKA.doszedlM * PX_PER_M) return;
    this.toast(`🧭 Jesteś na miejscu: ${droga.nazwa}`, 3000);
    droga = null;
    this.emitHud();
  }

  /**
   * Copying the hubs from a coachman's/captain's/librarian's map (owner, 13 Oct 2026: not an item – „No tak, nowe
   * miejsce. Przepisz sobie z mojej mapy, co gdzie jest”): pay once, and at most MAPA_PODROZNIKA.maksIkon hubs
   * around here (the nearest of each kind, the rest spread out) stay on the hero's map screen for good.
   */
  private buyTravellerMap(back: () => void, kto: string) {
    if (this.mamMapePodroznika()) return back();
    const cena = MAPA_PODROZNIKA.cena;
    this.dialog({
      title: `🗺 ${kto}`,
      text: `„No tak, nowe miejsce. Przepisz sobie z mojej mapy, co gdzie jest – dworce, przystanki dyliżansów i porty w okolicy, do ${MAPA_PODROZNIKA.promienKm} km stąd.”\n\nZaznaczysz je na swojej mapie (🗺) na zawsze. Kosztuje ${cena} monet. Masz ${session.coins}.`,
      buttons: [`Przepisuję – ${cena} 💰`, 'Nie teraz'],
      onChoose: (i) => {
        if (i !== 0) return back();
        if (session.coins < cena) return this.toast(`Za mało monet: to kosztuje ${cena}.`);
        const here = this.city.toLatLon(this.player.x, this.player.y);
        this.toast('🗺 Przepisujesz…', 1500);
        void hubyBlisko(here, MAPA_PODROZNIKA.promienKm, MAPA_PODROZNIKA.maksIkon).catch(() => [] as Hub[]).then((h) => {
          if (!h.length) return this.toast('„Hm, w okolicy nie ma żadnego dworca ani portu.” Nic nie płacisz.', 3500);
          if (session.coins < cena || this.mamMapePodroznika()) return;
          spend(cena);
          session.mapyPodroznika.push({ ...here, h: doZapisu(h) });
          this.emitHud();
          this.save();
          this.toast(`🗺 Na twojej mapie: ${h.map((q) => `${IKONA_HUBA[q.rodzaj]} ${q.nazwa}`).join(', ')}. Otwórz mapę (🗺 albo M).`, 6000);
        });
      },
    });
  }

  /** The quest log for the character sheet: where each began, what now, how far (in words) and its arrow. */
  questLog(): QuestLine[] {
    // Story items (mission stages) show under the quests: „Masz: soczewka, korzeń dębu”.
    const items = session.fabula.length ? `\n📜 Masz: ${session.fabula.join(', ')}` : '';
    return this.activeQuests().map((q, i) => {
      const mission=session.gen[q.id] ?? this.missions.find(r=>r.m.id===q.id)?.m;
      const notes=mission ? missionNotes(mission) : '';
      return {
      id: q.id, title: q.title, text: `${q.text}${notes ? `\n${notes}` : ''}${i === 0 ? items : ''}`, color: q.color, main: q.main, start: q.start,
      far: q.pos ? `${this.whereIs(q.pos.x, q.pos.y)} (${jakDaleko(Phaser.Math.Distance.Between(q.pos.x, q.pos.y, this.player.x, this.player.y) / PX_PER_M)})` : null,
      arrow: !session.bezStrzalki.includes(q.id),
    };});
  }

  /**
   * Where an NPC last told the hero he is (HUD plaque, second line): set by any talk,
   * forgotten MIEJSCE_HUD.wiedzaM away from that spot (owner's HUD spec, 5 Oct 2026).
   */
  private toldPlace: { name: string; x: number; y: number; map: string } | null = null;

  private learnPlace() {
    const x = this.player.x;
    const y = this.player.y;
    const name = this.city.streetNear(x, y, 150) ?? this.city.nearestAddress(x, y, 600)?.replace(/\s+\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)?(?=,|$)/, '').replace(/,.*$/, '') ?? null;
    if (name) this.toldPlace = { name, x, y, map: this.city.id };
  }

  /** The town the hero belongs to now: its name, centre and the radius counted as "in town". */
  private townAt(x: number, y: number): { name: string; x: number; y: number; r: number; wies?: boolean; nieznana?: boolean } {
    const R = MIEJSCE_HUD;
    if (this.city.id === 'lublin') {
      const towns = this.city.townList();
      const d = (t: { x: number; y: number }) => Math.hypot(t.x - x, t.y - y);
      const lub = towns.find((t) => t.name === 'Lublin');
      const near = towns.filter((t) => t.name !== 'Lublin').sort((a, b) => d(a) - d(b))[0];
      if (near && (!lub || d(near) < 1500 * PX_PER_M && d(near) < d(lub) || d(lub) > 12_000 * PX_PER_M)) return { ...near, r: R.wsM * PX_PER_M, wies: !R.miasta.includes(near.name) };
      if (lub) return { ...lub, r: R.lublinM * PX_PER_M };
    }
    const o = worldOrigin(this.city.id);
    if (o) {
      const lt = this.localNear(x, y);
      if (lt?.name) return { name: lt.name, x: lt.x, y: lt.y, r: lt.r, wies: lt.wies };
      if (!this.worldTown(x, y)) return { name: tx('Nieznana okolica', 'Unknown area'), x, y, r: 0, nieznana: true };
    }
    const c = o ? this.city.fromLatLon(o.lat, o.lon) : { x: (this.city.minX + this.city.width) / 2, y: (this.city.minY + this.city.height) / 2 };
    return { name: mapName(this.city.id), x: c.x, y: c.y, r: (o ? R.miastoM : R.miasteczkoM) * PX_PER_M };
  }

  /**
   * The plaque's two lines: the town, and where we are – the place an NPC named while
   * near it, else "w mieście / za miastem · gdzieś na północy" counted from the town's centre.
   */
  private placeInfo(): { town: string; detail: string } {
    if (this.loch) return { town: this.loch.opis.nazwa, detail: lochSesja.powrot ? 'pod ziemią' : '' };
    const x = this.player.x;
    const y = this.player.y;
    const t = this.townAt(x, y);
    const told = this.toldPlace;
    if (told && told.map === this.city.id && Math.hypot(told.x - x, told.y - y) < MIEJSCE_HUD.wiedzaM * PX_PER_M) return { town: t.name, detail: told.name };
    if (t.nieznana) return { town: t.name, detail: tx('zapytaj przechodnia', 'ask a passer-by') };
    const dx = x - t.x;
    const dy = y - t.y;
    const dist = Math.hypot(dx, dy);
    const inTown = dist < t.r;
    if (inTown && dist < t.r * MIEJSCE_HUD.centrum) return { town: t.name, detail: 'w centrum' };
    const strony = ['na wschodzie', 'na południowym wschodzie', 'na południu', 'na południowym zachodzie', 'na zachodzie', 'na północnym zachodzie', 'na północy', 'na północnym wschodzie'];
    const k = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    const where = t.wies ? (inTown ? 'we wsi' : 'za wsią') : inTown ? 'w mieście' : 'za miastem';
    return { town: t.name, detail: `${where} · gdzieś ${strony[k]}` };
  }

  /** "Jana Pawła II, Lublin": the street nearest a spot and its town (quest log). */
  private whereIs(x: number, y: number) {
    // A street line if that part of the map is loaded, else the nearest known address without its number.
    const addr = this.city.streetNear(x, y, 150) ?? this.city.nearestAddress(x, y, 600)?.replace(/\s+\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)?(?=,|$)/, '') ?? null;
    if (addr?.includes(',')) return addr; // already "Kościelna, Garbów"
    const street = addr;
    let town = mapName(this.city.id);
    if (worldOrigin(this.city.id)) town = this.worldTown(x, y) ?? 'Daleko';
    if (this.city.id === 'lublin') {
      // The Lublin map also holds Garbów, Jastków, Nałęczów and the villages around.
      const towns = this.city.townList();
      const d = (t: { x: number; y: number }) => Math.hypot(t.x - x, t.y - y);
      const lub = towns.find((t) => t.name === 'Lublin');
      const near = towns.filter((t) => t.name !== 'Lublin').sort((a, b) => d(a) - d(b))[0];
      if (near && d(near) < 1500 * PX_PER_M && (!lub || d(near) < d(lub))) town = near.name;
      else if (!lub || d(lub) > 12_000 * PX_PER_M) town = near?.name ?? town;
    }
    return street ? `${street}, ${town}` : town;
  }

  /** Switches a quest's guiding arrow on or off (character sheet). */
  toggleArrow(id: string) {
    const off = session.bezStrzalki;
    session.bezStrzalki = off.includes(id) ? off.filter((x) => x !== id) : [...off, id];
    this.emitHud();
  }

  /** No room for another quest? Then says so. */
  private questsFull() {
    if (this.questCount() < ZADAN_NARAZ) return false;
    this.toast(`Masz już ${ZADAN_NARAZ} zadania naraz. Skończ któreś, zanim weźmiesz kolejne.`, 3000);
    return true;
  }

  /** Side quests: a sports challenge and missions in progress. */
  private sideQuests(): { id: string; title: string; text: string; pos: { x: number; y: number } | null; start?: string }[] {
    const out: { id: string; title: string; text: string; pos: { x: number; y: number } | null; start?: string }[] = [];
    const px = this.player.x;
    const py = this.player.y;
    const dist = (p: { x: number; y: number }) => Phaser.Math.Distance.Between(p.x, p.y, px, py);
    const c = this.challenge;
    if (c?.kind === 'kukly') {
      const left = Math.max(0, (c.until - this.time.now) / 1000).toFixed(1).replace('.', ',');
      const title = 'Trening u trenera';
      if (c.step === 'a') out.push({ id: 'sport', title, text: `⏱ ${left} s · Uderz kukłę ${c.hits}/${SPORT.uderzen}`, pos: c.a });
      else if (c.step === 'b') out.push({ id: 'sport', title, text: `⏱ ${left} s · Biegnij do drugiej kukły i uderz ją`, pos: c.b });
      else out.push({ id: 'sport', title, text: `⏱ ${left} s · Wracaj do trenera!`, pos: c.npc });
    }
    if (c?.kind === 'wyscig') {
      const t = ((this.time.now - c.start) / 1000).toFixed(1).replace('.', ',');
      out.push({ id: 'sport', title: 'Wyścig', text: `⏱ ${t} s · Biegnij do boiska ${c.name}!`, pos: c.to });
    }
    const fq = this.folkQuest;
    const n0 = out.length;
    if (fq) {
      const title = `${fq.zguba.ikona} ${fq.zguba.nazwa}`;
      if (fq.got) out.push({ id: 'folk-quest', title, text: `Oddaj: ${fq.zguba.nazwa} – ${fq.folk.name}`, pos: { x: fq.folk.x, y: fq.folk.y } });
      else if (fq.item) out.push({ id: 'folk-quest', title, text: `Podnieś: ${fq.zguba.nazwa}`, pos: { x: fq.item.x, y: fq.item.y } });
      else {
        const foes = fq.enemies.filter((e) => e.active && !e.isDead);
        const near = foes.length ? foes.reduce((a, b) => (dist(a) < dist(b) ? a : b)) : null;
        out.push({ id: 'folk-quest', title, text: `Odbij: ${fq.zguba.nazwa} (chochliki ${PROSBY.ile - foes.length}/${PROSBY.ile})`, pos: near ? { x: near.x, y: near.y } : fq.target });
      }
    }
    if (fq && out.length > n0) {
      const st = this.city.streetNear(fq.folk.x, fq.folk.y);
      out[out.length - 1].start = `${fq.folk.name}${st ? `, ${st}` : ''}`;
    }
    const gq = this.fixed.grazynkaQuest();
    if (gq) out.push({ id: 'npc-grazynka', title: 'Babcia Grażynka', start: 'Kościelna, Garbów', ...gq });
    const mq = this.fixed.martinQuest();
    if (mq) out.push({ id: 'zmarzniety_smok', title: 'Zmarznięty smok', start: 'Martin, Irysowa', ...mq });
    for (const rm of this.missions) {
      const st = missionState(rm.m);
      const q = { id: rm.m.id, title: missionTitle(rm.m, this.missions.map((r) => r.m)), start: rm.m.adres };
      const z = zadanieOf(rm.m);
      // Multi-stage: which stage, and a timed walk's countdown.
      const part = stageCount(rm.m) > 1 ? `[${stageIndex(rm.m) + 1}/${stageCount(rm.m)}] ` : '';
      const left = this.etapy.secondsLeft(rm.m.id, this.time.now);
      const clock = left !== null ? ` ⏱ ${left} s` : '';
      if (st === 'active' && rm.target && z.typ === 'zbierz') {
        out.push({ ...q, text: `${part}${z.cel} (${fruitCount(z.towar!)}/${z.ile})`, pos: rm.target });
      } else if (st === 'active' && rm.target) {
        // For fights, point at the nearest remaining enemy of that mission; things to pick up / fix: the nearest one.
        const foes = z.szukaj ? [] : this.enemies.filter((e) => e.missionId === rm.m.id);
        const thing = z.szukaj ? null : this.etapy.arrowFor(rm.m.id);
        const pos = foes.length ? foes.reduce((a, b) => (dist(a) < dist(b) ? a : b)) : thing ?? rm.target;
        out.push({ ...q, text: `${part}${z.cel}${this.etapy.progress(rm.m.id)}${clock}`, pos: { x: pos.x, y: pos.y } });
      } else if (st === 'goal' && rm.m.dowolnaBiblioteka) {
        const lib = this.city.places.filter((p) => p.kind === 'library').reduce<CityPlace | null>((a, p) => (!a || dist(p.door) < dist(a.door) ? p : a), null);
        out.push({ ...q, text: `Oddaj relację w bibliotece${lib ? `: ${lib.name}` : ''}`, pos: lib ? lib.door : rm.door });
      } else if (st === 'goal') out.push({ ...q, text: `Wróć do: ${rm.m.adres}`, pos: rm.door });
    }
    // Accepted elsewhere stays in the journal, with no arrow on this map.
    for (const m of Object.values(session.gen)) {
      if (isWithdrawnCityQuest(m.id)) continue;
      if (!m.scenariusz || m.scenariusz.mapId === this.city.id || !['active', 'goal'].includes(missionState(m))) continue;
      out.push({ id:m.id, title:m.tytul, start:m.adres,
        text:`${tx('Kontynuuj w', 'Continue in')} ${m.scenariusz.mapName}: ${zadanieOf(m).cel}`, pos:null });
    }
    return out;
  }

  /** A place sharing a mission's door: the mission dialog gets a button to go in there. */
  private doorPlace: CityPlace | null = null;

  /** Who the hero talks to and where (for the dialog's portrait); cleared when he walks away. */
  private rozmowca: { kto: Rozmowca; x: number; y: number } | null = null;

  /** The person at a talk spot: the nearest character sprite (an artist sheet with a front frame) by it. */
  private zapamietajRozmowce(x: number, y: number) {
    let best: Phaser.GameObjects.Sprite | null = null, bd = 30;
    for (const o of this.children.list) {
      if (!(o instanceof Phaser.GameObjects.Sprite) || o === this.player || !o.visible) continue;
      const key = o.texture.key;
      if (!key.startsWith('hd-') || !o.texture.has('down-1')) continue;
      const d = Math.min(Math.hypot(o.x - x, o.y - y), Math.hypot(o.x - this.player.x, o.y - this.player.y) - 8);
      if (d < bd) [best, bd] = [o, d];
    }
    this.rozmowca = best ? { kto: { tex: best.texture.key.replace(/-red$/, '') }, x: this.player.x, y: this.player.y } : null;
  }

  /** A place's door: its sign as the speaker's picture. */
  private rozmowcaMiejsca(p: CityPlace | null | undefined) {
    const sign = p ? PLACE_LOOK[p.kind as keyof typeof PLACE_LOOK]?.sign : undefined;
    this.rozmowca = sign ? { kto: { obraz: sign }, x: this.player.x, y: this.player.y } : null;
  }

  private dialog(req: DialogRequest) {
    // The speaker's portrait (owner, 12 Oct 2026): the one talked to a moment ago, while the hero stays by them.
    const r = this.rozmowca;
    if (req.kto === undefined && r && Math.hypot(r.x - this.player.x, r.y - this.player.y) < 64) req = { ...req, kto: r.kto };
    // At a school or church: "ask about the shadows" as one more option, before the last button.
    const place = this.storyPlace;
    const door = this.doorPlace;
    const extras: [string, () => void][] = [];
    const ask = place && this.story.askLabel();
    if (place && ask) extras.push([ask, () => this.story.ask(place)]);
    if (door) extras.push([`🚪 ${door.name || 'Wejdź do środka'}`, () => this.openPlace(door)]);
    if (extras.length) {
      this.storyPlace = null;
      this.doorPlace = null;
      const at = req.buttons.length - 1;
      const orig = req;
      req = {
        ...req,
        buttons: [...req.buttons.slice(0, at), ...extras.map(([l]) => l), ...req.buttons.slice(at)],
        shop: req.shop ? { ...req.shop, entries: [...req.shop.entries,
          ...extras.map(([name], i): ShopEntry => ({ id: `place:extra:${i}`, index: at + i, name,
            category: 'services', description: 'Porozmawiaj o tym miejscu.', action: 'ROZMAWIAJ' }))] } : undefined,
        onChoose: (i) => (i >= at && i < at + extras.length ? extras[i - at][1]() : orig.onChoose(i >= at + extras.length ? i - extras.length : i)),
      };
    }
    req = { ...req, title: legacyText(req.title), text: legacyText(req.text), buttons:req.buttons.map(legacyText) };
    const metadata = dialogueMetadata(req.text);
    req = { ...req, language:metadata.textId ? lang : req.language ?? lang, localHumor:req.localHumor ?? metadata.localHumor, textId:req.textId ?? metadata.textId,
      buttonMetadata:req.buttons.map(label => ({ language:lang, ...dialogueMetadata(label) })) };
    this.player.vel.set(0, 0);
    this.player.anims.stop();
    this.scene.pause();
    note(`okno: ${req.title} | ${req.text.slice(0, 70)}`);
    this.game.events.emit('dialog', {
      ...req,
      onChoose: (i: number) => {
        note(`→ ${req.buttons[i] ?? i}`);
        consumeAttack(); // the tap/key that closed the dialog shouldn't swing the sword
        // …nor, a moment later, start the same talk again.
        this.talkReadyAt = performance.now() + TALK_PAUSE_MS;
        // Nobody attacks during a talk (the scene is paused), nor right after it.
        this.noHurtUntil = this.game.loop.time + 1500;
        this.scene.resume();
        req.onChoose(i);
      },
    } satisfies DialogRequest);
  }

  /** Where the hero is, in words and numbers (bug reports). */
  whereText() {
    const p = this.player;
    const ll = this.city.toLatLon(p.x, p.y);
    return `${this.city.id} ${Math.round(p.x)},${Math.round(p.y)}${ll ? ` (${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)})` : ''} ${this.city.streetNear(p.x, p.y) ?? ''}`.trim();
  }

  /** What a bug report carries besides the player's words. */
  bugContext() {
    const p = this.player;
    const ll = this.city.toLatLon(p.x, p.y);
    return {
      map: this.city.id, x: Math.round(p.x), y: Math.round(p.y), lat: ll?.lat, lon: ll?.lon,
      street: this.city.streetNear(p.x, p.y), hp: p.hp, maxHp: PLAYER.maxHp, coins: session.coins, exp: session.exp,
      level: session.level.nazwa, story: session.story.st, quests: this.activeQuests().map((q) => q.title),
      tex: p.texture.key, visible: p.visible, alpha: p.alpha, depth: Math.round(p.depth),
      fps: Math.round(this.game.loop.actualFps), zoom: this.cameras.main.zoom,
    };
  }

  private toast(text: string, ms?: number) {
    note(`napis: ${text}`);
    this.game.events.emit('toast', text, ms);
  }

  /** Share of the way to the next character level (1 at the top level). */
  private expShare() {
    const lvl = poziomPostaci(session.exp);
    if (lvl >= MAKS_POZIOM_POSTACI) return 1;
    const from = expNaPoziom(lvl);
    return Math.max(0, Math.min(0.999, (session.exp - from) / (expNaPoziom(lvl + 1) - from)));
  }

  private emitHud() {
    this.applyLevel();
    const quests = this.activeQuests();
    const preparedFood = nextFood();
    const state: HudState = {
      hp: this.player.hp,
      maxHp: PLAYER.maxHp,
      extra: this.player.extra,
      zatruty: !!this.stany.zatrucie,
      heal: this.player.hp >= PLAYER.maxHp || this.player.isDead
        ? null
        : session.mikstury > 0
          ? { icon: '🧪', n: session.mikstury }
          : totalFruit() >= this.fruitPerHeart()
            ? { icon: '🍎', n: Math.floor(totalFruit() / this.fruitPerHeart()) }
            : preparedFood ? { icon: foodIcon(preparedFood.id) ?? '🥣', n: foodCount(preparedFood.id) } : null,
      coins: session.coins,
      exp: session.exp,
      level: poziomPostaci(session.exp),
      duel: this.duelHp,
      duelMax: MIESZKANCY.serduszka * 2,
      title: session.story.title ? `${session.name}, ${session.story.title}` : null,
      sword: `${item(gear.equip.bron)?.nazwa ?? 'Kijek'} · poz. ${skillLevel(this.handSkill())}` + this.wearLabel() + (item(gear.equip.dystans) ? `  ✋ ${item(gear.equip.dystans)!.nazwa}` : ''),
      swordWarn: isBroken(gear.equip.bron) || (!!ammoOf(rangedWeapon() ?? undefined) && gear.ammo[ammoOf(rangedWeapon() ?? undefined)!] < STRZALY.malo),
      fruits: `🍎${fruitCount('jablko')} 🟣${fruitCount('sliwka')} 🍇${fruitCount('winogrono')}`,
      fruitN: [groupCount('owoce'), groupCount('warzywa'), groupCount('grzyby')],
      // Not while the diamonds may still save the hero (the question waits on top).
      dead: this.player.isDead && !session.immortal && !!this.demoRun,
      lingering: this.lingerUntil ? Math.max(0, Math.ceil((this.lingerUntil - this.time.now) / 1000)) : null,
      street: this.city.streetNear(this.player.x, this.player.y),
      pogoda: weatherLabel(isNight()),
      quests: quests.map(({ id, text, pos, color, main }) => ({ text, pos: session.bezStrzalki.includes(id) ? null : pos, color, main })),
      potions: session.mikstury,
      fruit: totalFruit(),
      fruitPerHeal: this.fruitPerHeart(),
      expShare: this.expShare(),
      ...this.placeInfo(),
      goods: goodsByKind(),
    };
    this.registry.set('hud', state);
    this.game.events.emit('hud', state);
  }
}
