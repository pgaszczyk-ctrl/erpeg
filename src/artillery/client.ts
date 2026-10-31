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
import { RULES, type Network, type Stop } from "./network";
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
  version: number;
  price: number;
  discovered: string[];
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
const registryPromises = new Map<string, Promise<Registry | null>>();
let indexPromise: Promise<{ id: string; bounds: number[] }[]> | null = null;
export async function loadRegistry(ll?: { lat: number; lon: number }) {
  const index: { id: string; bounds: number[] }[] = await (indexPromise ??=
    fetch("artillery/index.json")
      .then(async (r) => (r.ok ? await r.json() : []))
      .catch(() => []));
  const entry = ll
    ? index.find(
        (e) =>
          ll.lon >= e.bounds[0] &&
          ll.lat >= e.bounds[1] &&
          ll.lon <= e.bounds[2] &&
          ll.lat <= e.bounds[3],
      )
    : index[0];
  if (!entry) return null;
  let p = registryPromises.get(entry.id);
  if (!p) {
    p = fetch(`artillery/${encodeURIComponent(entry.id)}.json`)
      .then(async (r) => (r.ok ? await r.json() : null))
      .catch(() => null);
    registryPromises.set(entry.id, p);
  }
  return p;
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
  private state: State = {
    enabled: false,
    version: 0,
    price: RULES.price,
    discovered: [],
  };
  private art = new Map<
    string,
    {
      body: Phaser.GameObjects.Graphics;
      barrel: Phaser.GameObjects.Graphics;
      x: number;
      y: number;
    }
  >();
  private dead = false;
  private next = 0;
  private discovering = new Set<string>();
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
    this.registry = await loadRegistry(
      this.city.toLatLon(this.player.x, this.player.y),
    );
    if (!this.registry || this.dead) return;
    if (this.city.id.startsWith("w:") && this.registry.city?.name)
      nameWorldMap(this.city.id, this.registry.city.name);
    try {
      const state = await rpc<State>("ma_state", {
        p_token: session.token,
        p_network: this.registry.id,
      });
      if (state) this.state = state;
    } catch {
      /* Migration/registry unavailable: decorative stations only, no client wallet fallback. */
    }
  }
  update(now: number) {
    if (!this.registry || this.dead || now < this.next) return;
    this.next = now + 700;
    for (const s of this.registry.stops) {
      if (s.disabled) continue;
      const ll = this.ll(s);
      if (!this.city.hasLatLon(ll.lat, ll.lon)) continue;
      const p = this.city.fromLatLon(ll.lat, ll.lon),
        near =
          Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <
          1200 * PX_PER_M;
      let art = this.art.get(s.id);
      if (
        !art &&
        near &&
        this.city.isFree(p.x, p.y, 14, 14) &&
        (!this.city.roadAt(p.x, p.y) ||
          ["path", "pedestrian"].includes(this.city.roadAt(p.x, p.y)!.kind))
      ) {
        art = this.draw(p.x, p.y);
        this.art.set(s.id, art);
      }
      if (art) {
        const visible = near && this.host.visible(p.x, p.y);
        art.body.setVisible(visible);
        art.barrel.setVisible(visible);
      }
      if (
        near &&
        art &&
        this.state.enabled &&
        !this.state.discovered.includes(s.id) &&
        !this.discovering.has(s.id) &&
        Math.hypot(p.x - this.player.x, p.y - this.player.y) < 45 * PX_PER_M &&
        !this.host.combat() &&
        !this.host.busy()
      ) {
        this.discovering.add(s.id);
        void this.host
          .checkpoint()
          .then(() =>
            rpc<boolean>("ma_discover", {
              p_token: session.token,
              p_stop: s.id,
            }),
          )
          .then((ok) => {
            if (ok) {
              this.state.discovered.push(s.id);
              this.host.toast(
                tx("Odkryto stanowisko: ", "Station discovered: ") + s.name,
              );
            }
          })
          .catch(() => {})
          .finally(() => this.discovering.delete(s.id));
      }
    }
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
      if (a.body.visible && Math.hypot(x - a.x, y - a.y) < r)
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
    return { body, barrel, x, y };
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
      const known = this.state.discovered.includes(id),
        available =
          this.state.enabled &&
          this.state.discovered.includes(s.id) &&
          this.state.version === this.registry!.version &&
          !to.disabled &&
          known &&
          session.coins >= this.state.price &&
          !this.host.combat();
      b.textContent = `${to.name} · ${this.state.price} ${tx("monet", "coins")}${!known ? " · " + tx("nieodkryty", "undiscovered") : ""}`;
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
            "Najpierw odwiedź cel pieszo. Podróże służą także do szybkich powrotów.",
            "Visit a destination on foot first. Travel also provides quick return journeys.",
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
    if(station){const ll=this.ll(to),p=this.city.fromLatLon(ll.lat,ll.lon),angle=Math.atan2(p.y-station.y,p.x-station.x),turn=station.barrel.rotation+Math.atan2(Math.sin(angle-station.barrel.rotation),Math.cos(angle-station.barrel.rotation));
      if(matchMedia('(prefers-reduced-motion:reduce)').matches)station.barrel.rotation=turn;
      else {await new Promise<void>(resolve=>this.scene.tweens.add({targets:station.barrel,rotation:turn,duration:650,ease:'Sine.easeInOut',onComplete:()=>resolve()}));await new Promise<void>(resolve=>this.scene.tweens.add({targets:this.player,x:station.x+Math.cos(angle)*7,y:station.y-4+Math.sin(angle)*7,duration:350,ease:'Sine.easeInOut',onComplete:()=>resolve()}));}
    }
    const overlay = flight(this.host.hero(), message);
    let receipt: Receipt | undefined,
      checkpointDone = false;
    const nonce = crypto.randomUUID();
    const begin = () =>
      rpc<Receipt>("ma_begin", {
        p_token: session.token,
        p_nonce: nonce,
        p_from: from.id,
        p_to: to.id,
      });
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
      if (b) b.body.setVisible(true);
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
                const state = await rpc<State>("ma_state", {
                  p_token: session.token,
                  p_network: this.registry!.id,
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
    }
    this.art.clear();
  }
}
/** Recovery uses the durable receipt; refresh never replays a charge or depends on an animation. */
export async function recoverArtillery() {
  if (!TEST || offline.demo) return;
  let state: State;
  try {
    state = await rpc<State>("ma_state", {
      p_token: session.token,
      p_network: "",
    });
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
