import Phaser from 'phaser';
import { tx } from '../i18n';
import { TEX } from '../art';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { session, missionState, missionAvailable, levelLock, stageIndex, zadanieOf, type ResolvedMission } from '../quests';
import type { Etap, Postac } from '../content/fabula';
import { TRUDNOSCI } from '../content/trudnosc';
import { MELODIA } from '../content/historia';
import { playMelody } from '../ui/melody';
import { schoolQuiz } from '../quizzes';
import { krajMapy } from '../kraj';
import { today } from './Npcs';
import { hdOn, hdFolkLooks, personOf, ensureHd, fitHd } from '../sprites';
import { SKALA_POSTACI } from '../skala';
import { consumeAttack } from '../controls';
import type { DialogRequest } from './GameScene';

// Mission stages beyond the old four tasks (owner, 6–7 Oct 2026: „Serce Zębatka”, „Przebudzenie Starego
// Grodu”): talks, riddle lists, choices, paragraph pages, melodies on the spot; things to pick up; spots to
// fix by standing at them; timed walks; characters and ghosts standing at a stage's place. GameScene keeps
// fights, walks and gathering, and moves a mission on (GameScene.completeStage) when a stage here is done.

/** What the stages need from the game scene. */
export interface StageHost {
  scene: Phaser.Scene;
  city: CityMap;
  player: Phaser.GameObjects.Sprite & { speed: number };
  dialog(req: DialogRequest): void;
  toast(text: string, ms?: number): void;
  /** The current stage of this mission is done: give/take story items, move on (or finish). */
  stageDone(rm: ResolvedMission, said?: string): void;
  /** A timed walk ran out: back one stage, no penalty. */
  stageBack(rm: ResolvedMission): void;
  /** A wrong way in a paragraph: one heart less, never the last one. */
  hurtStory(): void;
  /** Pay coins (false = not enough). */
  pay(n: number): boolean;
  /** A swing at a mission's giver: the mission's dialog, as at its door. */
  talkMission(rm: ResolvedMission): void;
}

/** How near the stage's place the hero must come (map px), and how far away it re-arms. */
const BLISKO = 40;
/** Picking something up: this near (map px). */
const PODNIES = 10;
/** Standing at a fix point: this near (map px). */
const NAPRAW = 14;

interface Live {
  key: string;
  /** The spot stage fires once on arrival; again only after walking away. */
  armed: boolean;
  items: Phaser.GameObjects.Image[];
  points: { x: number; y: number; done: boolean; t: number; icon: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics }[];
  /** Timed walk: when it runs out (scene time). */
  until: number;
  /** 'zagadki' / 'paragraf': how far along. */
  step: number;
  who: Phaser.GameObjects.GameObject[];
  /** Where the stage's person stands (null: none). */
  at: { x: number; y: number; imie: string } | null;
}

/** A mission's giver standing at its door. */
interface Giver {
  who: Phaser.GameObjects.GameObject[];
  x: number;
  y: number;
  imie: string;
  rm: ResolvedMission;
}

const SPOT = new Set(['rozmowa', 'zagadka', 'zagadki', 'wybor', 'paragraf', 'melodia', 'decyzja']);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class Etapy {
  private live = new Map<string, Live>();
  private givers = new Map<string, Giver>();

  constructor(private host: StageHost) {}

  /** Every frame: set up what the active missions' current stages show, fire spot stages, fill fix bars. */
  private rms: ResolvedMission[] = [];

  update(missions: ResolvedMission[], now: number, dt: number) {
    this.rms = missions;
    const seen = new Set<string>();
    for (const rm of missions) {
      if (missionState(rm.m) !== 'active' || !rm.target) continue;
      const z = zadanieOf(rm.m);
      const key = `${rm.m.id}:${stageIndex(rm.m)}`;
      seen.add(rm.m.id);
      let l = this.live.get(rm.m.id);
      if (l?.key !== key) {
        if (l) this.drop(l);
        l = this.setup(rm, z, key, now);
        this.live.set(rm.m.id, l);
      }
      this.tick(rm, z, l, now, dt);
    }
    for (const [id, l] of this.live) {
      if (seen.has(id)) continue;
      this.drop(l);
      this.live.delete(id);
    }
    this.updateGivers(missions);
  }

  /**
   * Givers (Misja.postac) stand at their mission's door while the mission is shown, taken or done (after it they
   * stay as people of the town); one person with the same name already standing near there is enough.
   */
  private updateGivers(missions: ResolvedMission[]) {
    const want = new Set<string>();
    for (const rm of missions) {
      const g = rm.m.postac;
      if (!g || !(missionAvailable(rm.m) || levelLock(rm.m) !== null)) continue;
      const x = rm.door.x + 10, y = rm.door.y + 2;
      const twin = [...this.live.values()].some((l) => l.at && l.at.imie === g.imie && Math.hypot(l.at.x - x, l.at.y - y) < 40) ||
        [...this.givers.values()].some((o) => o.rm.m.id !== rm.m.id && o.imie === g.imie && Math.hypot(o.x - x, o.y - y) < 40);
      if (twin) continue;
      want.add(rm.m.id);
      const had = this.givers.get(rm.m.id);
      if (had) { had.rm = rm; continue; }
      this.givers.set(rm.m.id, { who: this.person(g, x, y), x, y, imie: g.imie, rm });
    }
    for (const [id, g] of this.givers) {
      if (want.has(id)) continue;
      for (const w of g.who) w.destroy();
      this.givers.delete(id);
    }
  }

  /** A mission person (giver or stage person) within `r` of (x, y): what talking to them does, or null. */
  talkAt(x: number, y: number, r: number): (() => void) | null {
    for (const g of this.givers.values()) if (Math.hypot(g.x - x, g.y - (y + 2)) < r) return () => this.host.talkMission(g.rm);
    for (const l of this.live.values()) {
      if (!l.at || Math.hypot(l.at.x - x, l.at.y - (y + 2)) >= r) continue;
      const rm = [...this.rms].find((q) => this.live.get(q.m.id) === l);
      if (!rm) continue;
      const z = zadanieOf(rm.m);
      return () => {
        if (SPOT.has(z.typ)) {
          l.armed = false;
          this.fire(rm, z, l);
        } else this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta, title: z.postac?.imie ?? rm.m.tytul, text: z.tekst || z.cel, buttons: ['Dobrze'], onChoose: () => {} });
      };
    }
    return null;
  }

  /** A timed walk's seconds left (for the HUD line), or null. */
  secondsLeft(id: string, now: number) {
    const l = this.live.get(id);
    return l && l.until ? Math.max(0, Math.ceil((l.until - now) / 1000)) : null;
  }

  /** Where the arrow points for this stage: the nearest thing left to pick up or fix (null = its place). */
  arrowFor(id: string): { x: number; y: number } | null {
    const l = this.live.get(id);
    if (!l) return null;
    const p = this.host.player;
    const near = <T extends { x: number; y: number }>(list: T[]) => list.reduce<T | null>((a, b) => (!a || Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a), null);
    if (l.items.length) return near(l.items);
    const left = l.points.filter((q) => !q.done);
    return left.length ? near(left) : null;
  }

  /** How many things are left (pick up / fix), for the HUD line. */
  progress(id: string): string {
    const l = this.live.get(id);
    if (!l) return '';
    if (l.points.length > 1) return ` (${l.points.filter((q) => q.done).length}/${l.points.length})`;
    return '';
  }

  /** A swing at the door of a mission whose current stage happens right there: start it (again). */
  poke(rm: ResolvedMission): boolean {
    const z = zadanieOf(rm.m);
    const l = this.live.get(rm.m.id);
    const t = rm.target;
    if (!l || !t || !SPOT.has(z.typ)) return false;
    if (Math.hypot(t.x - this.host.player.x, t.y - this.host.player.y) > BLISKO * 1.5) return false;
    l.armed = false;
    this.fire(rm, z, l);
    return true;
  }

  /** A stage just began (accepted, or the previous one done): its opening words. */
  begin(rm: ResolvedMission) {
    const z = zadanieOf(rm.m);
    // A talk says its words on arrival; other stages may open with a few words right away.
    if (z.tekst && !SPOT.has(z.typ)) this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta, title: rm.m.tytul, text: z.tekst, buttons: ['Ruszam!'], onChoose: () => {} });
  }

  destroy() {
    for (const g of this.givers.values()) for (const w of g.who) w.destroy();
    this.givers.clear();
    for (const l of this.live.values()) this.drop(l);
    this.live.clear();
  }

  // ------------------------------------------------------------------ setup

  private setup(rm: ResolvedMission, z: Etap, key: string, now: number): Live {
    const l: Live = { key, armed: true, items: [], points: [], until: 0, step: 0, who: [], at: null };
    const t = rm.target!;
    const r = rng(hash(key));
    if (z.typ === 'podnies') {
      for (const q of this.spots(t, z.ile ?? 1, (z.promien ?? 40) * PX_PER_M, r)) {
        const it = this.host.scene.add.image(q.x, q.y, TEX.questItem).setDepth(q.y - 4);
        this.host.scene.tweens.add({ targets: it, y: q.y - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        it.setData('glow', this.glow(q.x, q.y));
        l.items.push(it);
      }
    }
    if (z.typ === 'napraw') {
      const n = Math.max(1, z.ile ?? 1);
      const list = n === 1 ? [{ x: t.x, y: t.y }] : this.spots(t, n, (z.promien ?? 40) * PX_PER_M, r);
      for (const q of list) {
        const icon = this.host.scene.add.image(q.x, q.y, TEX.questItem).setTint(0xd9a640).setDepth(q.y - 4);
        icon.setData('glow', this.glow(q.x, q.y));
        const bar = this.host.scene.add.graphics().setDepth(1_050_000);
        l.points.push({ x: q.x, y: q.y, done: false, t: 0, icon, bar });
      }
    }
    if (z.typ === 'idz' && z.naCzas) {
      // As in the sports challenges: the hero's straight-line time × the difficulty's slack, at least a minute.
      const d = Math.hypot(t.x - this.host.player.x, t.y - this.host.player.y);
      const s = (d / Math.max(1, this.host.player.speed)) * (session.level.wyzwanie);
      l.until = now + Math.max(60, s) * 1000;
    }
    if (z.postac) {
      const x = rm.target!.x + 10, y = rm.target!.y + 2;
      l.who.push(...this.person(z.postac, x, y));
      l.at = { x, y, imie: z.postac.imie };
    }
    return l;
  }

  /**
   * A pulsing golden glow and a widening ring under a thing to pick up or a spot to fix (owner 7.10.2026: the
   * spot to clean the medallion was hard to find).
   */
  private glow(x: number, y: number) {
    const sc = this.host.scene;
    if (!sc.textures.exists('etap-glow')) {
      const n = 48;
      const tex = sc.textures.createCanvas('etap-glow', n, n)!;
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grd.addColorStop(0, 'rgba(255,214,110,1)');
      grd.addColorStop(0.45, 'rgba(255,200,80,0.55)');
      grd.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, n, n);
      tex.refresh();
    }
    const c = sc.add.container(x, y).setDepth(y - 5);
    const g = sc.add.image(0, 0, 'etap-glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.7);
    const ring = sc.add.graphics();
    c.add([g, ring]);
    sc.tweens.add({ targets: g, alpha: 0.45, scale: 0.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    sc.tweens.addCounter({
      from: 0, to: 1, duration: 1400, repeat: -1,
      onUpdate: (tw) => {
        if (!ring.active) return void tw.stop();
        const t = tw.getValue() ?? 0;
        ring.clear().lineStyle(1, 0xffd56e, 1 - t).strokeEllipse(0, 2, 8 + 22 * t, 4 + 11 * t);
      },
    });
    return c;
  }

  /** `n` free spots around a place within `R` map px (deterministic by the stage). */
  private spots(t: { x: number; y: number }, n: number, R: number, r: () => number) {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 60; k++) {
        const a = r() * Math.PI * 2;
        const d = (0.25 + 0.75 * Math.sqrt(r())) * R;
        const x = t.x + Math.cos(a) * d;
        const y = t.y + Math.sin(a) * d;
        if (this.host.city.isBlocked(x, y) || out.some((o) => Math.hypot(o.x - x, o.y - y) < 20)) continue;
        out.push({ x, y });
        break;
      }
    }
    return out.length ? out : [{ x: t.x, y: t.y }];
  }

  /** A character standing at (x, y) with a name over the head (a townsfolk look by the name; a ghost is blue and see-through). */
  private person(p: Postac, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const sc = this.host.scene;
    const k = !!p.kobieta;
    const looks = hdOn ? hdFolkLooks().filter((t) => (personOf(t)?.plec === 'k') === k && personOf(t)?.wiek !== 'dziecko') : [];
    const tex = looks.length ? ensureHd(sc, looks[hash(p.imie) % looks.length]) : null;
    let s: Phaser.GameObjects.Sprite;
    if (tex && sc.textures.exists(tex)) s = fitHd(sc.add.sprite(x, y, tex, 'down-1').setDepth(y));
    else s = sc.add.sprite(x, y, TEX.hero, 'down-0').setDepth(y).setScale(SKALA_POSTACI);
    if (p.zjawa) {
      s.setTint(0x9fd0ff).setAlpha(0.6);
      sc.tweens.add({ targets: s, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    const name = sc.add.text(x, y - 24 * SKALA_POSTACI, p.imie, { fontFamily: 'monospace', fontSize: '7px', color: '#fff8e0', stroke: '#1e1a24', strokeThickness: 3, resolution: 4 }).setOrigin(0.5, 1).setDepth(1_150_000);
    return [s, name];
  }

  private drop(l: Live) {
    for (const it of l.items) {
      (it.getData('glow') as Phaser.GameObjects.GameObject | undefined)?.destroy();
      it.destroy();
    }
    for (const q of l.points) {
      (q.icon.getData('glow') as Phaser.GameObjects.GameObject | undefined)?.destroy();
      q.icon.destroy();
      q.bar.destroy();
    }
    for (const w of l.who) w.destroy();
  }

  // ------------------------------------------------------------------ every frame

  private tick(rm: ResolvedMission, z: Etap, l: Live, now: number, dt: number) {
    const p = this.host.player;
    const t = rm.target!;
    if (SPOT.has(z.typ)) {
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d > BLISKO * 2) l.armed = true;
      else if (d < BLISKO && l.armed) {
        l.armed = false;
        this.fire(rm, z, l);
      }
      return;
    }
    if (z.typ === 'podnies') {
      for (const it of [...l.items]) {
        if (Math.hypot(it.x - p.x, it.y - (p.y + 4)) > PODNIES) continue;
        (it.getData('glow') as Phaser.GameObjects.GameObject | undefined)?.destroy();
        it.destroy();
        l.items = l.items.filter((x) => x !== it);
        const left = l.items.length;
        if (left) this.host.toast(`Masz! Zostało jeszcze: ${left}`, 1400);
        else this.host.stageDone(rm, 'Znalezione! ');
      }
      return;
    }
    if (z.typ === 'napraw') {
      const need = Math.max(1, z.sekund ?? 5) * 1000;
      for (const q of l.points) {
        if (q.done) continue;
        const at = Math.hypot(q.x - p.x, q.y - p.y) < NAPRAW;
        q.t = at ? q.t + dt : 0;
        const f = Math.min(1, q.t / need);
        q.bar.clear();
        if (at) q.bar.fillStyle(0x1e1a24, 0.8).fillRect(q.x - 8, q.y - 16, 16, 3).fillStyle(0xd9a640, 1).fillRect(q.x - 7.5, q.y - 15.5, 15 * f, 2);
        if (f < 1) continue;
        q.done = true;
        (q.icon.getData('glow') as Phaser.GameObjects.GameObject | undefined)?.destroy();
        q.bar.clear();
        q.icon.setTint(0x7fd35a).setAlpha(0.6);
        const left = l.points.filter((x) => !x.done).length;
        if (left) this.host.toast(`Gotowe! Zostało jeszcze: ${left}`, 1400);
        else this.host.stageDone(rm, 'Naprawione! ');
      }
      return;
    }
    if (l.until && now > l.until) {
      l.until = 0;
      this.host.stageBack(rm);
    }
  }

  // ------------------------------------------------------------------ spot stages

  private fire(rm: ResolvedMission, z: Etap, l: Live) {
    const title = z.postac?.imie ?? rm.m.tytul;
    switch (z.typ) {
      case 'rozmowa':
        this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta, title, text: z.tekst || z.cel, buttons: [tx('Dalej', 'Next')], onChoose: () => this.host.stageDone(rm) });
        return;
      case 'zagadka':
        this.ask(rm, title, { pytanie: z.pytanie ?? '', odpowiedzi: z.odpowiedzi ?? [], dobra: z.dobra ?? 0 }, z.podpowiedz, () => this.host.stageDone(rm, tx('Dobrze! ', 'Correct! ')), z.tekst);
        return;
      case 'zagadki': {
        const list = z.pytania ?? [];
        const next = () => {
          if (l.step >= list.length) return this.host.stageDone(rm, 'Wszystko dobrze! ');
          this.ask(rm, `${title} (${l.step + 1}/${list.length})`, list[l.step], undefined, () => {
            l.step++;
            next();
          }, l.step === 0 ? z.tekst : undefined);
        };
        next();
        return;
      }
      case 'decyzja': {
        const options = z.opcje ?? [];
        this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta, title, text: z.tekst || z.cel,
          buttons: [...options.map(o => o.tekst), tx('Później', 'Later')],
          onChoose: i => {
            const option = options[i];
            if (!option || missionState(rm.m) !== 'active') return;
            if (z.wyborKlucz) {
              const choices = rm.m.scenariusz?.choices ?? (session.questResults[rm.m.id] ??= { originMap:session.mapId, routeM:0, choices:{} }).choices;
              choices[z.wyborKlucz] = option.id;
            }
            this.host.stageDone(rm, option.wynik);
          },
        });
        return;
      }
      case 'wybor':
        this.choose(rm, z, title, l);
        return;
      case 'paragraf':
        this.page(rm, z, l);
        return;
      case 'melodia':
        void this.melody(rm, z, title);
        return;
    }
  }

  /** One question; a wrong answer shows the hint (or „try again”) and asks the same again. */
  private ask(rm: ResolvedMission, title: string, q: { pytanie: string; odpowiedzi: string[]; dobra: number }, hint: string | undefined, ok: () => void, intro?: string) {
    const answers = q.odpowiedzi.filter((a) => a && a.trim());
    if (!q.pytanie || !answers.length) return ok();
    this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta,
      title: `🧩 ${title}`,
      text: intro ? `${intro}\n\n${q.pytanie}` : q.pytanie,
      buttons: [...answers, tx('Muszę pomyśleć', 'Let me think')],
      onChoose: (i) => {
        if (i >= answers.length) return;
        if (i === q.dobra) {
          session.stats.riddles = (session.stats.riddles ?? 0) + 1;
          return ok();
        }
        this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta,
          title: tx('🤔 Nie tym razem', '🤔 Not this time'),
          text: hint ? `${tx('Podpowiedź', 'Hint')}: ${hint}` : tx('To nie to. Pomyśl jeszcze.', 'Not quite. Think it over.'),
          buttons: [tx('Spróbuję jeszcze raz', 'Try again'), tx('Później', 'Later')],
          onChoose: (j) => {
            if (j === 0) this.ask(rm, title, q, hint, ok, intro);
          },
        });
      },
    });
  }

  /** „Przekonaj” (one quiz question by the player's age) or pay. */
  private choose(rm: ResolvedMission, z: Etap, title: string, l: Live) {
    const pay = z.zaplac ?? 0;
    const buttons = ['🧠 Przekonaj', ...(pay ? [`💰 Zapłać ${pay} monet`] : []), 'Później'];
    this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta,
      title,
      text: z.tekst || z.cel,
      buttons,
      onChoose: (i) => {
        if (i === 0) {
          const ll = this.host.city.toLatLon(rm.target!.x, rm.target!.y);
          const q = schoolQuiz(`etap:${rm.m.id}`, today(), l.step++, session.age, ll ? krajMapy(session.mapId, ll.lat, ll.lon) : 'PL');
          const r = rng(hash(`${rm.m.id}:${l.step}`));
          const order = q.odpowiedzi.map((_, k) => k).sort(() => r() - 0.5);
          this.ask(rm, title, { pytanie: q.pytanie, odpowiedzi: order.map((k) => q.odpowiedzi[k]), dobra: order.indexOf(0) }, undefined, () => this.host.stageDone(rm, 'Przekonany! '));
        } else if (pay && i === 1) {
          if (this.host.pay(pay)) this.host.stageDone(rm);
          else this.host.toast(`Za mało monet – potrzeba ${pay}.`, 2000);
        }
      },
    });
  }

  /** Paragraph pages: the right way goes on, a wrong one costs a heart and shows the page again. */
  private page(rm: ResolvedMission, z: Etap, l: Live) {
    const pages = z.strony ?? [];
    if (l.step >= pages.length) return this.host.stageDone(rm);
    const pg = pages[l.step];
    const ways = pg.wybory?.filter((w) => w.tekst) ?? [];
    this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta,
      title: `📖 ${rm.m.tytul}`,
      text: pg.tekst,
      buttons: ways.length ? ways.map((w) => w.tekst) : [l.step === pages.length - 1 ? 'Koniec' : 'Dalej'],
      onChoose: (i) => {
        if (ways.length && ways[i] && ways[i].dobry === false) {
          this.host.hurtStory();
          this.host.dialog({ ...zadanieOf(rm.m).dialogueMeta, title: '💥 Auć!', text: 'To nie była dobra droga. Tracisz serce – spróbuj inaczej.', buttons: ['Jeszcze raz'], onChoose: () => this.page(rm, z, l) });
          return;
        }
        l.step++;
        this.page(rm, z, l);
      },
    });
  }

  private async melody(rm: ResolvedMission, z: Etap, title: string) {
    const lvl = Math.max(0, TRUDNOSCI.indexOf(session.level));
    this.host.scene.scene.pause();
    await playMelody(MELODIA.nut[lvl] ?? 4, { notes: z.nuty, title: `🎵 ${title}`, intro: z.tekst || z.cel, hums: tx('Melodia:', 'Tune:') });
    this.host.scene.scene.resume();
    consumeAttack();
    this.host.stageDone(rm, tx('Pięknie zagrane! ', 'Nicely played! '));
  }
}

/** A tiny seeded random generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
