import {audio} from '../sfx';
import { captureHero, heroState, type HeroState } from "./state";
import Phaser from "phaser";
import { CityMap, PX_PER_M } from "../map/CityMap";
import { session } from "../quests";
import { rpc, offline } from "../api";
import { TEST } from "../version";
import { tx } from "../i18n";
import type { Player } from "../objects/Player";
import { flight, type Kadr } from "./flight";
import { Armata3D, ARMATA_3D, punktySiatki } from "./armata3d";
import { miejsceStacji, miejsceWlazu, MIEJSCE_MAKS_M, type Wysun } from "./miejsce";
import { Wlaz } from "./wlaz";
import { pinball } from "./pinball";
import { krajWPunkcie } from "../kraj";
import { maMetro } from "../content/metro";
import { zWlazu } from "./ladowanie";
import { wSiatke } from "./ladowanie";
import { RULES, type Network, type Stop } from "./network";
import {
  generujSiec,
  miastoPrzy,
  nazwaStacji,
  metry,
  cenaZaMetry,
  GENERATOR,
  type Siec,
  type Swiat,
} from "./generator";
import { lang } from "../i18n";
import { getSurfaceMap, surfacePosition, prepareMap, nameWorldMap } from "../travel";
import { resetKeys, resetTouch } from "../controls";
export type Registry = Network & {
  city?: { name: string };
  origin: { lat: number; lon: number };
  projection: { mLon: number; mLat: number };
  rules: typeof RULES;
  arrivals?: Record<string, At>;
  /** A city with a real metro rides the underground pinball (hatches) instead of cannons. */
  metro?: boolean;
};
type At = { m: string; x: number; y: number; s: number };
type Receipt = {
  hero?: HeroState;
  nonce: string;
  origin: string;
  destination: string;
  state: "pending" | "done" | "cancelled";
  price: number;
  coins_after: number;
  origin_at: At;
  destination_at: At;
};
type State = {
  enabled: boolean;
  pending?: Receipt | null;
};
type Host = {
  visible: (x: number, y: number) => boolean;
  combat: () => boolean;
  busy: () => boolean;
  hold: (v: boolean) => void;
  checkpoint: () => Promise<unknown>;
  hero: (spin?: boolean) => string | string[] | undefined;
  restart: (city: CityMap) => Promise<void>;
  toast: (s: string) => void;
  /** Where a map point is on screen (share of the view) and CSS px per map px. */
  kadr: (x: number, y: number) => { fx: number; fy: number; px: number };
  /** A picture of the map without the HUD. */
  zdjecie: () => Promise<HTMLCanvasElement | null>;
  panorama: (net: { x: number; y: number }, angle: number) => Promise<Pick<Kadr, "shot" | "panorama">>;
  /** The scene's current hero and cannons (they are new after a restart). */
  obecna: () => { player: Player; artillery?: Artillery };
};
export const artilleryTransit = { active: false };
let recovery: Receipt | null = null;
let swiatPromise: Promise<Swiat | null> | null = null;
/** The world list of big cities and airports (public/artillery/swiat.json), fetched once. */
export function wczytajSwiat() {
  return (swiatPromise ??= fetch("artillery/swiat.json")
    .then(async (r) => (r.ok ? ((await r.json()) as Swiat) : null))
    .catch(() => null));
}
/** The generated network of the big city around a spot, as the Registry the rest of this file uses. */
export async function siecPrzy(ll: { lat: number; lon: number }): Promise<Registry | null> {
  const swiat = await wczytajSwiat();
  const m = swiat && miastoPrzy(swiat, ll);
  if (!swiat || !m) return null;
  return naRejestr(generujSiec(m, swiat.lotniska));
}
const wysunOf = (s: Stop) => (s as Stop & { wysun?: Wysun }).wysun;
/** Where a station stands on a map: a hatch in metro cities, else a cannon (square/car park or a pushed-out gate). */
function miejsceNa(city: CityMap, s: Stop, ll: { lat: number; lon: number }, metro: boolean | undefined) {
  return metro ? miejsceWlazu(city, s.id, ll.lat, ll.lon) : miejsceStacji(city, s.id, ll.lat, ll.lon, wysunOf(s));
}
function naRejestr(siec: Siec): Registry {
  const [id, name, , lat, lon] = siec.miasto,
    mLon = 111320 * Math.cos((lat * Math.PI) / 180),
    mLat = 111132,
    en = lang === "en";
  return {
    id: `c${id}`,
    version: 1,
    city: { name },
    metro: maMetro(siec.miasto[2], name, id),
    origin: { lat, lon },
    projection: { mLon, mLat },
    rules: RULES,
    stops: siec.stacje.map((s) => ({
      id: s.id,
      name: nazwaStacji(s, siec, en),
      x: (s.lon - lon) * mLon,
      y: (lat - s.lat) * mLat,
      airport: s.rodzaj === "lotnisko",
      // A gate with no square near is pushed outwards (miejsce.ts), within 7 km of the stations it links to.
      wysun:
        s.rodzaj === "rogatka"
          ? {
              centrum: { lat, lon },
              partnerzy: siec.krawedzie
                .filter(([a, b]) => a === s.k || b === s.k)
                .map(([a, b]) => siec.stacje[a === s.k ? b : a]),
            }
          : undefined,
    })) as unknown as Stop[],
    edges: siec.krawedzie.map(([a, b]) => [siec.stacje[a].id, siec.stacje[b].id]),
  } as unknown as Registry;
}
function message(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const entries: [string, string, string][] = [
    [
      "Session expired",
      "Sesja wygasła. Wczytaj postać ponownie.",
      "Session expired. Load your character again.",
    ],
    ["Finish combat first", "Najpierw zakończ walkę.", "Finish combat first."],
    [
      "Not enough coins",
      "Brakuje monet na podróż.",
      "Not enough coins for this journey.",
    ],
    ["Come closer", "Podejdź bliżej armaty.", "Come closer to the cannon."],
    [
      "Destination is unsafe",
      "Cel nie jest bezpieczny. Wybierz inny.",
      "The destination is unsafe. Choose another.",
    ],
    [
      "Discover both stops first",
      "Najpierw odkryj oba stanowiska.",
      "Discover both stations first.",
    ],
    [
      "Route unavailable",
      "To połączenie jest niedostępne.",
      "This connection is unavailable.",
    ],
    [
      "Trip already pending",
      "Masz już rozpoczętą podróż.",
      "You already have a journey in progress.",
    ],
    [
      "Nonce reused with different route",
      "Żądanie podróży się zmieniło. Wczytaj postać ponownie.",
      "The journey request changed. Load your character again.",
    ],
    [
      "Artillery is available on TEST only",
      "Artyleria jest dostępna tylko dla postaci testowych.",
      "Artillery is available to test characters only.",
    ],
    [
      "Brak połączenia z serwerem gry. Sprawdź internet.",
      "Brak połączenia z serwerem gry. Sprawdź internet.",
      "Cannot reach the game server. Check your connection.",
    ],
  ];
  const known = entries.find(([key]) => raw.includes(key));
  return known ? tx(known[1], known[2]) : raw;
}
export class Artillery {
  private registry: Registry | null = null;
  private state: State = { enabled: false };
  private art = new Map<
    string,
    {
      body: Phaser.GameObjects.Graphics;
      barrel: Phaser.GameObjects.Graphics;
      armata: Armata3D | Wlaz;
      model: boolean;
      visible: boolean;
      x: number;
      y: number;
    }
  >();
  private dead = false;
  private next = 0;
  private cityCheck = 0;
  private opened = false;
  private loaded: Promise<void> = Promise.resolve();
  constructor(
    private scene: Phaser.Scene,
    private city: CityMap,
    private player: Player,
    private host: Host,
  ) {
    if (TEST && !offline.demo && !city.loch) this.loaded = this.load();
  }
  private async load() {
    this.registry = await siecPrzy(
      this.city.toLatLon(this.player.x, this.player.y),
    );
    if (!this.registry || this.dead) return;
    if (this.city.id.startsWith("w:") && this.registry.city?.name)
      nameWorldMap(this.city.id, this.registry.city.name);
    try {
      const state = await rpc<State>("ma_stan", { p_token: session.token });
      if (state) this.state = state;
    } catch {
      /* Migration/registry unavailable: decorative stations only, no client wallet fallback. */
    }
  }
  private last = 0;
  /** Moves the 3D cannons (aim, shot, net). Called every frame, also while a trip holds the game. */
  animate(now: number) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    for (const a of this.art.values()) a.armata.update(dt);
  }
  update(now: number) {
    this.animate(now);
    if (this.dead || now < this.next) return;
    this.next = now + 700;
    // Walked into another big city (world maps are endless): its own network.
    if (now > this.cityCheck && this.swiatGotowy) {
      this.cityCheck = now + 5000;
      void wczytajSwiat().then((sw) => {
        const m = sw && miastoPrzy(sw, this.city.toLatLon(this.player.x, this.player.y));
        if (this.dead || (m ? `c${m[0]}` : null) === (this.registry?.id ?? null)) return;
        this.clearArt();
        this.registry = m && sw ? naRejestr(generujSiec(m, sw.lotniska)) : null;
        if (this.registry && this.city.id.startsWith("w:")) nameWorldMap(this.city.id, this.registry.city!.name);
      });
    }
    if (!this.registry) return;
    for (const s of this.registry.stops) {
      const ll = this.ll(s);
      if (!this.city.hasLatLon(ll.lat, ll.lon)) continue;
      const g = this.city.fromLatLon(ll.lat, ll.lon);
      let art = this.art.get(s.id);
      // The cannon may stand up to MIEJSCE_MAKS_M from its generated point (square/car park, or a gate pushed out).
      if (
        !art &&
        Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < (1200 + MIEJSCE_MAKS_M) * PX_PER_M
      ) {
        const p = miejsceNa(this.city, s, ll, this.registry.metro);
        if (p) {
          art = this.draw(p.x, p.y, s.id);
          this.art.set(s.id, art);
          const a = art;
          void a.armata.ready.then((ok) => {
            if (!ok || this.dead) return;
            a.model = true;
            a.body.setVisible(false);
            a.barrel.setVisible(false);
          });
        }
      }
      if (art) {
        // A tall landmark: drawn whenever it is near, above the fog of war (owner, 1 Nov 2026); only using it
        // needs the hero to see it.
        const near = Phaser.Math.Distance.Between(art.x, art.y, this.player.x, this.player.y) < 1200 * PX_PER_M;
        art.visible = near && this.host.visible(art.x, art.y);
        art.armata.setVisible(near);
        art.body.setVisible(art.visible && !art.model);
        art.barrel.setVisible(art.visible && !art.model);
      }
    }
  }
  /** Cannon pictures the fog of war must leave uncovered (FogView.update). */
  odkryteWMgle() {
    const out: NonNullable<Armata3D["wyciecie"]>[] = [];
    for (const a of this.art.values()) {
      const w = a.armata.wyciecie;
      if (w) out.push(w);
    }
    return out;
  }
  private get swiatGotowy() {
    return swiatPromise !== null;
  }
  private clearArt() {
    for (const a of this.art.values()) {
      a.body.destroy();
      a.barrel.destroy();
      a.armata.destroy();
    }
    this.art.clear();
  }
  /** The country a station stands in (the Ballway hall's floor mosaic shows its flag). */
  private krajStacji(s: Stop) {
    const ll = this.ll(s);
    return krajWPunkcie(ll.lat, ll.lon);
  }
  private ll(s: Stop) {
    const r = this.registry!;
    return {
      lon: r.origin.lon + s.x / r.projection.mLon,
      lat: r.origin.lat - s.y / r.projection.mLat,
    };
  }
  /** The station nearest a point (an arrival by cannon), made at once and waited for (≤ 4 s), even while the trip
   *  holds the game (update() doesn't run then). */
  async stacjaPrzy(x: number, y: number) {
    await this.loaded;
    if (!this.registry || this.dead) return null;
    let best: { s: Stop; x: number; y: number; d: number } | null = null;
    for (const s of this.registry.stops) {
      if (s.disabled) continue;
      const ll = this.ll(s);
      if (!this.city.hasLatLon(ll.lat, ll.lon)) continue;
      // Where its cannon really stands (moved off its generated point onto a square or car park).
      const p = miejsceNa(this.city, s, ll, this.registry.metro);
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 120 * PX_PER_M && (!best || d < best.d)) best = { s, x: p.x, y: p.y, d };
    }
    if (!best) return null;
    let art = this.art.get(best.s.id);
    if (!art) {
      art = this.draw(best.x, best.y, best.s.id);
      this.art.set(best.s.id, art);
    }
    const a = art;
    const ok = await Promise.race([a.armata.ready, new Promise<boolean>((r) => setTimeout(() => r(false), 4000))]);
    if (this.dead) return null;
    if (ok) {
      a.model = true;
      a.body.setVisible(false);
      a.barrel.setVisible(false);
    }
    a.visible = true;
    a.armata.setVisible(true);
    a.body.setVisible(!a.model);
    a.barrel.setVisible(!a.model);
    return a;
  }
  /** This city's cannons on this map, for the city boards' map (ui/tablicaMiasta.ts): where each stands (its generated
   *  point while the tiles there aren't loaded yet). */
  naPlanie(): { id: string; nazwa: string; x: number; y: number; pewne: boolean; metro: boolean }[] {
    if (!this.registry) return [];
    const out: { id: string; nazwa: string; x: number; y: number; pewne: boolean; metro: boolean }[] = [];
    for (const s of this.registry.stops) {
      if (s.disabled) continue;
      const ll = this.ll(s);
      if (!this.city.hasLatLon(ll.lat, ll.lon)) continue;
      // A hatch in metro cities (the pinball), else a cannon – exactly where the game puts it.
      const p = miejsceNa(this.city, s, ll, this.registry.metro);
      if (p === null) continue;
      // pewne = the station's real spot is known (its tiles are loaded), not just its generated point.
      out.push({ id: s.id, nazwa: s.name, ...(p ?? this.city.fromLatLon(ll.lat, ll.lon)), pewne: !!p, metro: !!this.registry.metro });
    }
    return out;
  }
  /** Already drawn objects only: avoid recomputing station placement every gameplay frame. */
  interactionStops() {
    return [...this.art].flatMap(([id,a])=>{
      const stop=a.visible&&this.registry?.stops.find(s=>s.id===id);
      return stop?[{stop,x:a.x,y:a.y,metro:!!this.registry?.metro}]:[];
    });
  }
  at(x: number, y: number, r = 26) {
    for (const [id, a] of this.art)
      if (a.visible && Math.hypot(x - a.x, y - a.y) < r)
        return this.registry!.stops.find((s) => s.id === id);
    return undefined;
  }
  private draw(x: number, y: number, _id = "") {
    if (this.registry?.metro) {
      // A pinball hatch: no code-drawn cannon underneath.
      const body = this.scene.add.graphics({ x, y }).setVisible(false), barrel = this.scene.add.graphics({ x, y }).setVisible(false);
      return { body, barrel, armata: new Wlaz(this.scene, x, y) as Armata3D | Wlaz, model: false, visible: true, x, y };
    }
    const body = this.scene.add
        .graphics({ x, y })
        .setDepth(y + 1)
        .setScale(0.4 * ARMATA_3D.skala),
      barrel = this.scene.add
        .graphics({ x, y: y - 4 })
        .setDepth(y + 3)
        .setScale(0.65 * ARMATA_3D.skala);
    const ink = 0x252c30,
      brass = 0xd3a246;
    body.lineStyle(3, ink, 1);
    body.fillStyle(0x786349);
    body.fillEllipse(0, 7, 57, 22);
    body.strokeEllipse(0, 7, 57, 22);
    body.fillStyle(brass);
    body.fillCircle(-11, 1, 8);
    body.strokeCircle(-11, 1, 8);
    body.fillCircle(11, 1, 8);
    body.strokeCircle(11, 1, 8);
    // Catching net, below/aside the cannon; chibi scientist's large head and compact limbs.
    body.lineStyle(2, ink);
    body.strokeEllipse(42, 2, 28, 17);
    for (let i = -9; i <= 9; i += 6)
      body.lineBetween(31 + i / 3, -5, 42 + i, 10);
    body.lineBetween(28, -3, 28, 16);
    body.lineBetween(56, -3, 56, 16);
    body.fillStyle(ink);
    body.fillRoundedRect(-43, -7, 7, 7, 2);
    body.fillRoundedRect(-33, -7, 7, 7, 2);
    body.fillStyle(0xf3eedb);
    body.fillRoundedRect(-42, -24, 15, 19, 3);
    body.lineStyle(2, ink);
    body.strokeRoundedRect(-42, -24, 15, 19, 3);
    body.fillStyle(0xe7ba8d);
    body.fillCircle(-35, -35, 12);
    body.strokeCircle(-35, -35, 12);
    body.fillStyle(0xf2eddd);
    body.fillEllipse(-35, -43, 26, 11);
    body.fillStyle(ink);
    body.fillCircle(-39, -35, 2);
    body.fillCircle(-31, -35, 2);
    body.lineBetween(-39, -35, -31, -35);
    barrel.lineStyle(3, ink);
    barrel.fillStyle(brass);
    barrel.fillRoundedRect(-4, -9, 31, 17, 4);
    barrel.strokeRoundedRect(-4, -9, 31, 17, 4);
    barrel.fillStyle(ink);
    barrel.fillEllipse(27, -1, 7, 17);
    return { body, barrel, armata: new Armata3D(this.scene, x, y) as Armata3D | Wlaz, model: false, visible: true, x, y };
  }
  /** A metro city: its stations are pinball hatches with a walkable hall under them. */
  get metro() {
    return !!this.registry?.metro;
  }
  llStacji(s: Stop) {
    return this.ll(s);
  }
  krajNaStacji(s: Stop) {
    return this.krajStacji(s);
  }
  /** The destination list; from the pinball hall `zHali` closes the hall first and rides from that launcher. */
  open(s: Stop, zHali?: { tor: number; przed: () => void }) {
    if (this.opened || this.host.busy()) return;
    this.opened = true;
    this.host.hold(true);
    resetKeys();
    resetTouch();
    const root = document.createElement("div");
    root.className = "m-screen";
    root.id = "artillery-panel";
    const box = document.createElement("div");
    box.className = "m-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.style.maxWidth = "520px";
    root.append(box);
    const h = document.createElement("h2");
    h.textContent = this.registry?.metro
      ? tx("Podziemny Pinball Miejski", "Municipal Underground Pinball")
      : tx("Miejska Artyleria Pasażerska", "Municipal Passenger Artillery");
    box.append(h);
    const sub = document.createElement("p");
    sub.textContent = s.name;
    box.append(sub);
    const close = () => {
      window.removeEventListener("keydown", key, true);
      root.remove();
      this.opened = false;
      this.host.hold(false);
      resetKeys();
      resetTouch();
    };
    const key = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const buttons = [
            ...root.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ],
          at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[
          (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
        ]?.focus();
      }
    };
    window.addEventListener("keydown", key, true);
    const destinations = this.registry!.edges.flatMap(([a, b]) =>
      a === s.id ? [b] : b === s.id ? [a] : [],
    );
    for (const id of destinations) {
      const to = this.registry!.stops.find((s) => s.id === id)!;
      // No square/car park ≥ 50 m from buildings there: that station has no cannon on this map.
      const tll = this.ll(to);
      if (this.city.hasLatLon(tll.lat, tll.lon) && miejsceNa(this.city, to, tll, this.registry!.metro) === null) continue;
      const b = document.createElement("button");
      b.className = "m-btn";
      const m = metry(this.ll(s), this.ll(to)),
        price = cenaZaMetry(m),
        km = m / 1000,
        available =
          this.state.enabled &&
          session.coins >= price &&
          !this.host.combat();
      b.textContent = `${to.name} · ${km.toFixed(1).replace(".", tx(",", "."))} km · ${price} ${tx("monet", "coins")}`;
      b.disabled = !available;
      b.onclick = () => {
        if (this.host.combat()) return;
        close();
        zHali?.przed();
        void this.start(s, to, zHali?.tor ?? 0);
      };
      box.append(b);
    }
    const p = document.createElement("p");
    p.textContent = this.host.combat()
      ? tx("Najpierw zakończ walkę.", "Finish combat first.")
      : !this.state.enabled
        ? tx(
            "Stanowisko czeka na zatwierdzenie sieci i uruchomienie obsługi podróży.",
            "This station awaits network approval and travel service activation.",
          )
        : tx(
            `Cena zależy od odległości: ${GENERATOR.zaKm} monet za kilometr.`,
            `The price depends on distance: ${GENERATOR.zaKm} coins per kilometre.`,
          );
    box.append(p);
    const b = document.createElement("button");
    b.className = "m-btn";
    b.textContent = tx("Wracam", "Back");
    b.onclick = close;
    box.append(b);
    document.body.append(root);
    b.focus();
    this.scene.events.once("shutdown", close);
  }
  private async start(from: Stop, to: Stop, tor = 0) {
    if (this.host.combat() || this.host.busy()) return;
    audio();
    this.host.hold(true);
    artilleryTransit.active = true;
    this.player.vel.set(0, 0);
    const hp = this.player.hp;
    const carry = captureHero(this.player);
    session.artilleryHero = carry;
    const station=this.art.get(from.id);
    const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const metro = !!this.registry?.metro;
    this.host.toast(
      metro
        ? tx(`Właz się otwiera – kierunek: ${to.name}`, `The hatch opens – heading for: ${to.name}`)
        : tx(`Armata celuje w: ${to.name}`, `The cannon aims at: ${to.name}`),
    );
    const llCel=this.ll(to),pCel=this.city.fromLatLon(llCel.lat,llCel.lon);
    const kat=station?Math.atan2(pCel.y-station.y,pCel.x-station.x):0;
    if(station?.model){
      // The artist's cannon: turn to the target, the hero climbs into the barrel, the shot – then the flight scene.
      const ll=this.ll(to),p=this.city.fromLatLon(ll.lat,ll.lon);
      await station.armata.celuj(p.x-station.x,p.y-station.y,still);
      if(!still)await new Promise<void>(resolve=>this.scene.tweens.add({targets:this.player,x:station.x,y:station.y-2,duration:350,ease:'Sine.easeInOut',onComplete:()=>resolve()}));
      this.player.setAlpha(0);
      await station.armata.strzel();
      if(!still)await new Promise(resolve=>setTimeout(resolve,380));
    } else if(station){const ll=this.ll(to),p=this.city.fromLatLon(ll.lat,ll.lon),angle=Math.atan2(p.y-station.y,p.x-station.x),turn=station.barrel.rotation+Math.atan2(Math.sin(angle-station.barrel.rotation),Math.cos(angle-station.barrel.rotation));
      if(still)station.barrel.rotation=turn;
      else {await new Promise<void>(resolve=>this.scene.tweens.add({targets:station.barrel,rotation:turn,duration:650,ease:'Sine.easeInOut',onComplete:()=>resolve()}));await new Promise<void>(resolve=>this.scene.tweens.add({targets:this.player,x:station.x+Math.cos(angle)*7,y:station.y-4+Math.sin(angle)*7,duration:350,ease:'Sine.easeInOut',onComplete:()=>resolve()}));}
    }
    // The map at the shot (hero already in the barrel) – the flight scene shrinks it under him.
    const shot = metro ? null : await this.host.zdjecie();
    const muzzle = station ? this.host.kadr(station.x + Math.cos(kat) * 12, station.y - 30 + Math.sin(kat) * 12) : this.host.kadr(this.player.x, this.player.y);
    const overlay = metro ? pinball(this.host.hero(), message, to.name, { z: from.name, krajZ: this.krajStacji(from), krajDo: this.krajStacji(to), tor }) : flight(this.host.hero(true), message, { shot, ...muzzle, kat, cel: to.name });
    // The flight scene covers the map now; the hero is visible again if the trip is called off.
    this.player.setAlpha(1);
    let receipt: Receipt | undefined,
      checkpointDone = false;
    const nonce = crypto.randomUUID();
    // Where the destination cannon stands (the same spot every visitor sees there): found before paying.
    let dest: At | undefined;
    const cel = async (): Promise<At> => {
      const ll = this.ll(to);
      const city = await getSurfaceMap(ll.lat, ll.lon),
        g = city.fromLatLon(ll.lat, ll.lon);
      await city.ensure(g.x, g.y, (MIEJSCE_MAKS_M + 200) * PX_PER_M);
      const p = miejsceNa(city, to, ll, this.registry?.metro);
      if (!p)
        throw Error(
          tx(
            "Przy tamtej armacie nie ma bezpiecznego placu do lądowania. Nic nie zapłacono.",
            "There is no safe square to land by that cannon. Nothing was charged.",
          ),
        );
      const resolved = await surfacePosition({ m: city.id, x: p.x, y: p.y });
      return { ...resolved.at, s: PX_PER_M };
    };
    const begin = async () => {
      dest ??= await cel();
      return rpc<Receipt>("ma_lot", {
        p_token: session.token,
        p_nonce: nonce,
        p_from: from.id,
        p_to: to.id,
        p_dest: dest,
      });
    };
    const perform = async () => {
      if (!checkpointDone) {
        await this.host.checkpoint();
        checkpointDone = true;
      }
      receipt ??= await begin();
      overlay.launch();
      session.artilleryHero = heroState(receipt.hero) ?? carry;
      if (receipt.state === "cancelled")
        throw Error(tx("Podróż została anulowana.", "Trip was cancelled."));
      session.coins = receipt.coins_after;
      session.tu = {
        ...receipt.destination_at,
        x: (receipt.destination_at.x * PX_PER_M) / receipt.destination_at.s,
        y: (receipt.destination_at.y * PX_PER_M) / receipt.destination_at.s,
      };
      const resolved = await surfacePosition(session.tu);
      const city = resolved.city, at = resolved.at;
      session.tu = at;
      if (city.id.startsWith("w:") && this.registry?.city?.name)
        nameWorldMap(city.id, this.registry.city.name);
      await city.ensure(at.x, at.y, 1000 * PX_PER_M);
      if (!city.isFree(at.x, at.y, 14, 14) || !city.reachesFar(at.x, at.y, 100))
        throw Error(
          tx(
            "Cel nie jest bezpieczny. Możesz wrócić bez opłaty.",
            "Destination is unsafe. You can return without paying.",
          ),
        );
      session.arrive = { x: at.x, y: at.y };
      session.abandoned = null;
      await prepareMap(city);
      // The same live hero/GLB/equipment remain: no appearance or inventory reconstruction.
      session.hp = hp;
      await this.host.restart(city);
      const settled = await rpc<Receipt>("ma_settle", {
        p_token: session.token,
        p_nonce: nonce,
        p_cancel: false,
      });
      if (settled.state !== "done") throw Error("Trip not completed");
      session.stats.spent += settled.price;
      // Landing: the destination's cannon and net, a picture of that map for the zoom-in, then the net on the real map.
      const now = this.host.obecna(), hero = now.player;
      const cel = await now.artillery?.stacjaPrzy(hero.x, hero.y);
      if (metro) {
        // Out of the hatch beside the destination's post.
        let exit = cel ? { x: cel.x - 2, y: cel.y + 12 } : { x: hero.x, y: hero.y };
        if (!city.isFree(exit.x, exit.y, 10, 10)) exit = { x: hero.x, y: hero.y };
        hero.setAlpha(0);
        await overlay.land({ shot: null, fx: 0.5, fy: 0.5, px: 4, cel: to.name });
        overlay.close();
        await zWlazu(this.scene, hero, cel?.model && cel.armata instanceof Wlaz ? cel.armata : undefined, exit, still);
        this.host.toast(tx(`Wyskakujesz z włazu! Witaj: ${to.name}`, `You spring out of the hatch! Welcome to ${to.name}`));
        artilleryTransit.active = false;
        this.host.hold(false);
        return;
      }
      const off = punktySiatki();
      const net = cel ? { x: cel.x + off.siatka.dx, y: cel.y + off.siatka.dy } : { x: hero.x, y: hero.y };
      let exit = cel ? { x: cel.x + off.wyjscie.dx, y: cel.y + off.wyjscie.dy } : { x: hero.x, y: hero.y };
      if (!city.isFree(exit.x, exit.y, 10, 10)) exit = { x: hero.x, y: hero.y };
      hero.setAlpha(0);
      const view = still ? { shot: await this.host.zdjecie() } : await this.host.panorama(net, kat);
      await overlay.land({ ...view, ...this.host.kadr(net.x, net.y), cel: to.name });
      overlay.close();
      await wSiatke(this.scene, hero, net, exit, cel?.model && cel.armata instanceof Armata3D ? cel.armata : undefined, still);
      this.host.toast(tx(`Złapany w siatkę! Witaj: ${to.name}`, `Caught in the net! Welcome to ${to.name}`));
      artilleryTransit.active = false;
      this.host.hold(false);
    };
    try {
      const a = this.art.get(from.id),
        b = this.art.get(to.id);
      if (a) {
        const ll = this.ll(to),
          p = this.city.fromLatLon(ll.lat, ll.lon);
        a.barrel.rotation = Math.atan2(p.y - a.y, p.x - a.x);
      }
      if (b) b.body.setVisible(!b.model);
      await perform();
    } catch (e) {
      await overlay.recover(
        message(e) +
          " " +
          tx(
            "Stan podróży zostanie sprawdzony na serwerze.",
            "The server will verify your trip status.",
          ),
        [
          {
            label: tx("Ponów tę samą podróż", "Retry this trip"),
            run: perform,
          },
          {
            label: metro ? tx("Wróć do włazu", "Return to the hatch") : tx("Wróć do armaty", "Return to the cannon"),
            run: async () => {
              if (!receipt) {
                const state = await rpc<State>("ma_stan", {
                  p_token: session.token,
                });
                if (!state?.pending) {
                  artilleryTransit.active = false;
                  this.host.hold(false);
                  overlay.close();
                  return;
                }
                if (state.pending.nonce !== nonce)
                  throw Error("Another trip is pending");
                receipt = state.pending;
              }
              const result = await rpc<Receipt>("ma_settle", {
                p_token: session.token,
                p_nonce: nonce,
                p_cancel: true,
              });
              if (result.state === "done") {
                await perform();
                return;
              }
              session.coins = result.coins_after + result.price;
              session.artilleryHero = heroState(result.hero) ?? carry;
              session.tu = {
                ...result.origin_at,
                x: (result.origin_at.x * PX_PER_M) / result.origin_at.s,
                y: (result.origin_at.y * PX_PER_M) / result.origin_at.s,
              };
              const resolved = await surfacePosition(session.tu);
              session.tu = resolved.at;
              session.arrive = { x: session.tu.x, y: session.tu.y };
              const origin = resolved.city;
              await prepareMap(origin);
              await this.host.restart(origin);
              artilleryTransit.active = false;
              this.host.hold(false);
              overlay.close();
            },
          },
        ],
      );
    }
  }
  destroy() {
    this.dead = true;
    for (const a of this.art.values()) {
      a.body.destroy();
      a.barrel.destroy();
      a.armata.destroy();
    }
    this.art.clear();
  }
}
/** Recovery uses the durable receipt; refresh never replays a charge or depends on an animation. */
export async function recoverArtillery() {
  if (!TEST || offline.demo) return;
  let state: State;
  try {
    state = await rpc<State>("ma_stan", { p_token: session.token });
  } catch {
    return;
  }
  if (state?.pending) {
    const t = state.pending;
    recovery = t;
    session.artilleryHero = heroState(t.hero);
    artilleryTransit.active = true;
    session.coins = t.coins_after;
    session.abandoned = null;
    session.tu = {
      m: t.destination_at.m,
      x: (t.destination_at.x * PX_PER_M) / t.destination_at.s,
      y: (t.destination_at.y * PX_PER_M) / t.destination_at.s,
    };
  }
}
export async function rollbackArtilleryRecovery() {
  if (!recovery) return false;
  const result = await rpc<Receipt>("ma_settle", {
    p_token: session.token,
    p_nonce: recovery.nonce,
    p_cancel: true,
  });
  if (result.state !== "cancelled") return false;
  session.coins = result.coins_after + result.price;
  session.artilleryHero = heroState(result.hero);
  session.tu = {
    m: result.origin_at.m,
    x: (result.origin_at.x * PX_PER_M) / result.origin_at.s,
    y: (result.origin_at.y * PX_PER_M) / result.origin_at.s,
  };
  session.abandoned = null;
  session.arrive = null;
  recovery = null;
  artilleryTransit.active = false;
  return true;
}

export async function finishArtilleryRecovery() {
  if (!recovery) return;
  const t = await rpc<Receipt>("ma_settle", {
    p_token: session.token,
    p_nonce: recovery.nonce,
    p_cancel: false,
  });
  if (t.state !== "done") throw Error("Artillery recovery not completed");
  recovery = null;
  artilleryTransit.active = false;
}
