import {audio} from '../sfx';
import { captureHero, heroState, type HeroState } from "./state";
import Phaser from "phaser";
import { CityMap, PX_PER_M } from "../map/CityMap";
import { session } from "../quests";
import { rpc, offline } from "../api";
import { TEST } from "../version";
import { tx } from "../i18n";
import type { Player } from "../objects/Player";
import { flight } from "./flight";
import { Armata3D } from "./armata3d";
import { miejsceStacji, MIEJSCE_M } from "./miejsce";
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
import { getMap, prepareMap, nameWorldMap } from "../travel";
import { resetKeys, resetTouch } from "../controls";
export type Registry = Network & {
  city?: { name: string };
  origin: { lat: number; lon: number };
  projection: { mLon: number; mLat: number };
  rules: typeof RULES;
  arrivals?: Record<string, At>;
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
  hero: () => string | string[] | undefined;
  restart: (city: CityMap) => Promise<void>;
  toast: (s: string) => void;
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
function naRejestr(siec: Siec): Registry {
  const [id, name, , lat, lon] = siec.miasto,
    mLon = 111320 * Math.cos((lat * Math.PI) / 180),
    mLat = 111132,
    en = lang === "en";
  return {
    id: `c${id}`,
    version: 1,
    city: { name },
    origin: { lat, lon },
    projection: { mLon, mLat },
    rules: RULES,
    stops: siec.stacje.map((s) => ({
      id: s.id,
      name: nazwaStacji(s, siec, en),
      x: (s.lon - lon) * mLon,
      y: (lat - s.lat) * mLat,
      airport: s.rodzaj === "lotnisko",
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
      armata: Armata3D;
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
  constructor(
    private scene: Phaser.Scene,
    private city: CityMap,
    private player: Player,
    private host: Host,
  ) {
    if (TEST && !offline.demo && !city.loch) void this.load();
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
      const g = this.city.fromLatLon(ll.lat, ll.lon),
        near =
          Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) <
          1200 * PX_PER_M;
      let art = this.art.get(s.id);
      if (!art && near) {
        const p = miejsceStacji(this.city, s.id, ll.lat, ll.lon);
        if (p) {
          art = this.draw(p.x, p.y);
          this.art.set(s.id, art);
          const a = art;
          void a.armata.ready.then((ok) => {
            if (!ok || this.dead) return;
            a.model = true;
            a.body.setVisible(false);
            a.barrel.setVisible(false);
            // Arriving by cannon: the landing net at the destination bounces.
            if (artilleryTransit.active && Math.hypot(a.x - this.player.x, a.y - this.player.y) < 80 * PX_PER_M) a.armata.lap();
          });
        }
      }
      if (art) {
        const visible = near && this.host.visible(art.x, art.y);
        art.visible = visible;
        art.armata.setVisible(visible);
        art.body.setVisible(visible && !art.model);
        art.barrel.setVisible(visible && !art.model);
      }
    }
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
  private ll(s: Stop) {
    const r = this.registry!;
    return {
      lon: r.origin.lon + s.x / r.projection.mLon,
      lat: r.origin.lat - s.y / r.projection.mLat,
    };
  }
  at(x: number, y: number, r = 26) {
    for (const [id, a] of this.art)
      if (a.visible && Math.hypot(x - a.x, y - a.y) < r)
        return this.registry!.stops.find((s) => s.id === id);
    return undefined;
  }
  private draw(x: number, y: number) {
    const body = this.scene.add
        .graphics({ x, y })
        .setDepth(y + 1)
        .setScale(0.4),
      barrel = this.scene.add
        .graphics({ x, y: y - 4 })
        .setDepth(y + 3)
        .setScale(0.65);
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
    return { body, barrel, armata: new Armata3D(this.scene, x, y), model: false, visible: true, x, y };
  }
  open(s: Stop) {
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
    h.textContent = tx(
      "Miejska Artyleria Pasażerska",
      "Municipal Passenger Artillery",
    );
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
        void this.start(s, to);
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
  private async start(from: Stop, to: Stop) {
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
    const overlay = flight(this.host.hero(), message);
    // The flight scene covers the map now; the hero is visible again if the trip is called off.
    this.player.setAlpha(1);
    let receipt: Receipt | undefined,
      checkpointDone = false;
    const nonce = crypto.randomUUID();
    // Where the destination cannon stands (the same spot every visitor sees there): found before paying.
    let dest: At | undefined;
    const cel = async (): Promise<At> => {
      const ll = this.ll(to);
      let id = this.city.id;
      if (!this.city.hasLatLon(ll.lat, ll.lon)) {
        const lub = await getMap("lublin").catch(() => null);
        id = lub?.hasLatLon(ll.lat, ll.lon)
          ? "lublin"
          : `w:${(Math.round(ll.lat * 10) / 10).toFixed(4)},${(Math.round(ll.lon * 10) / 10).toFixed(4)}`;
      }
      const city = await getMap(id),
        g = city.fromLatLon(ll.lat, ll.lon);
      await city.ensure(g.x, g.y, (MIEJSCE_M + 200) * PX_PER_M);
      const p = miejsceStacji(city, to.id, ll.lat, ll.lon);
      if (!p) throw Error("Destination is unsafe");
      return { m: city.id, x: p.x, y: p.y, s: PX_PER_M };
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
      const city = await getMap(receipt.destination_at.m),
        at = session.tu;
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
      await overlay.land();
      const settled = await rpc<Receipt>("ma_settle", {
        p_token: session.token,
        p_nonce: nonce,
        p_cancel: false,
      });
      if (settled.state !== "done") throw Error("Trip not completed");
      session.stats.spent += settled.price;
      artilleryTransit.active = false;
      this.host.hold(false);
      overlay.close();
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
            label: tx("Wróć do armaty", "Return to the cannon"),
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
              session.arrive = { x: session.tu.x, y: session.tu.y };
              const origin = await getMap(result.origin_at.m);
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
