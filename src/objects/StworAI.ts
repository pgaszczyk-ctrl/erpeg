// ============================================================================
//  STWÓR AI — walka „nowej walki” (walka/live.ts; właściciel 26.10.2026: „walka jest kiepska – wciąż po prostu
//  podchodzą jak stare chochliki; zmień to na podobną walkę jak wilki w exp-lore… ten podbieg z pokazywaniem
//  zakresu jest super”). Każdy stworek w trybie live walczy CZYTELNIE, bez ukrytych obrażeń od dotyku:
//
//    patrol → podejście → (czeka / krąży, gdy limit atakujących zajęty) → ZAPOWIEDŹ (czerwony obszar, kierunek
//    zablokowany – czas na reakcję) → atak (trafia najwyżej raz) → odpoczynek → kolejna decyzja.
//
//  Trzy rodzaje (formy ataków z pakietu bestiariusza ChatGPT, exp-lore docs/bestiary/data/actions.json):
//   - 'doskok'  – wilk (wolf_lunge: klin + doskok), warg (warg_bite: klin z bliska; warg_pounce: daleki skok
//                 z długą zapowiedzią), reszta stworków wręcz (doskok jak wilk, obrażenia z ENEMY_KINDS);
//   - 'dystans' – chochlik leśny rzucający żołędziami (acorn: pocisk po linii, zatrzymuje się na ścianie),
//                 trzyma odstęp, ucieka, gdy bohater podejdzie;
//   - 'boss'    – Mosiężny Kozioł (zastępczy boss QA): taran (szarża po zapowiedzianym pasie), tupnięcie
//                 (koło wokół niego, spowalnia ×0,5 na 2 s – jak roots) i rogi (klin z bliska – jak peat_slam).
//                 Nie odskakuje po ciosach (heavy).
//  Wspólny limit wokół bohatera (brief rozdz. 3): 2 sekwencje wręcz + 1 dystansowa; rezerwacja od zapowiedzi do
//  końca odpoczynku. Pozostali krążą i zachowują odstępy. Ruch: tylko `slime.vel` – ściany i kolizje robi
//  GameScene.moveActor (doskok i szarża respektują ściany), pociski sprawdzają ściany same (host.sciana).
//  Wszystkie liczby: content/lowiska.ts STWORY_AI – WARTOŚCI DO TESTU.
// ============================================================================

import Phaser from 'phaser';
import type { Slime } from './Slime';
import { PX_PER_M } from '../map/CityMap';
import type { ProfilStwora } from '../content/lowiska';
import type { CombatAudio } from '../audio/CombatAudio';
import { enemyMeleeSound } from '../audio/combatCatalog';

export interface StworHost {
  scene: Phaser.Scene;
  player: { x: number; y: number };
  /** Obrażenia (połówki serca) na bohatera. */
  hurt: (from: Phaser.Math.Vector2, obrazenie: number, fizyczne?: boolean) => void;
  /** Spowolnienie bohatera (mnożnik prędkości, ms) – nie kumuluje się. */
  spowolnij: (mnoznik: number, ms: number) => void;
  /** Wspólny limit sekwencji ataku; `zawsze` = boss (zajmuje miejsce, ale nie czeka). */
  rezerwuj: (typ: 'wrecz' | 'dystans', zawsze?: boolean) => boolean;
  zwolnij: (typ: 'wrecz' | 'dystans') => void;
  /** Ściana / budynek (pocisk tu znika). */
  sciana: (x: number, y: number) => boolean;
  /** Pozycje innych żywych stworków walczących wokół bohatera (odstępy). */
  inni: (s: Slime) => { x: number; y: number }[];
  /** Optional GLB emitter, sampled at the actual combat event. */
  origin?: (s: Slime, node: string, now: number) => { x: number; y: number } | undefined;
  sounds?: CombatAudio;
  attackMarker?: (s: Slime) => number | undefined;
}

type Stan = 'patrol' | 'podejscie' | 'czeka' | 'zapowiedz' | 'atak' | 'odpoczynek' | 'powrot';
type Atak = 'doskok' | 'klin' | 'skok' | 'rzut' | 'taran' | 'tupniecie' | 'rogi';

interface Pocisk {
  x: number; y: number; vx: number; vy: number; zostalo: number; obrazenie: number; r: number;
}

const M = PX_PER_M;
// Telegraphs (owner, 20 Nov 2026: red areas looked technical): an ordinary creature's blow is a dark shadow on the
// ground with a dusty edge that darkens as it comes and flashes a warm rim just before it lands; a boss's special
// is cracked ground glowing amber. Same shapes and timing as before – they still show where the blow will land.
const CIEN = 0x1e1a24;
const PYL = 0xd8c39a;
const BLYSK = 0xffe2a0;
const BURSZTYN = 0xffa53a;
const ZAR = 0x7a2e0a;

export class StworAI {
  private stan: Stan = 'patrol';
  private until = 0;
  private atak: Atak = 'doskok';
  private cel = new Phaser.Math.Vector2();
  private kat = 0;
  private trafil = false;
  private rezerwacja: 'wrecz' | 'dystans' | null = null;
  private gfx: Phaser.GameObjects.Graphics;
  private gfxPociski: Phaser.GameObjects.Graphics;
  private ostatnio = { x: 0, y: 0, od: 0 };
  private pociski: Pocisk[] = [];
  private skokGotowyOd = 0;
  private taranGotowyOd = 0;
  private seenProvocation = -Infinity;
  private krazenie = Math.random() < 0.5 ? 1 : -1;
  private readonly P: ProfilStwora;
  private soundStops: (() => void)[] = [];
  private silence() { for (const stop of this.soundStops) stop(); this.soundStops = []; }
  private audible = () => this.s.active && !this.s.isDead && this.s.visible && !this.s.isDazed(this.h.scene.time.now)
    && Math.hypot(this.s.x - this.h.player.x, this.s.y - this.h.player.y) < 180;

  constructor(
    private h: StworHost,
    private s: Slime,
    /** Środek i promień terytorium (px) – za nim przerywa i wraca. */
    private home: { x: number; y: number; r: number; krazy?: number },
    profil: ProfilStwora,
  ) {
    this.P = profil;
    this.gfx = h.scene.add.graphics().setDepth(1_000_000);
    this.gfxPociski = h.scene.add.graphics().setDepth(1_000_001);
    if (profil.rodzaj === 'boss') s.heavy = true;
  }

  /** Chasing / attacking counts as a fight; retreating home does not. */
  get inCombat() {
    return this.s.active && !this.s.isDead && this.stan !== 'patrol' && this.stan !== 'powrot';
  }

  get rodzaj() {
    return this.P.rodzaj;
  }

  get returning() { return this.stan === 'powrot'; }

  destroy() {
    this.silence();
    this.gfx.destroy();
    this.gfxPociski.destroy();
    this.pociski = [];
    this.zwolnijRezerwacje();
  }

  private zwolnijRezerwacje() {
    if (!this.rezerwacja) return;
    this.h.zwolnij(this.rezerwacja);
    this.rezerwacja = null;
  }

  /** Pociski lecą dalej także po śmierci rzucającego? Nie – znikają z nim (destroy). */
  update(now: number, dt: number) {
    const s = this.s, p = this.h.player, P = this.P;
    this.lotPociskow(dt);
    const dist = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
    const odDomu = Phaser.Math.Distance.Between(s.x, s.y, this.home.x, this.home.y);
    if (s.lastProvokedAt > this.seenProvocation) {
      this.seenProvocation = s.lastProvokedAt;
      // Enough time to cover the whole shot distance, also at the rare level 20.
      s.pursuitUntil = Math.max(s.pursuitUntil, now + dist / Math.max(1, P.predkosc * M) * 1000 + 15000);
    }
    const provoked = now < s.pursuitUntil;
    // In a fight (attacking, about to strike, close and coming): its name and life bar show (report #13).
    if (this.stan === 'zapowiedz' || this.stan === 'atak' || (this.stan === 'podejscie' && dist < 60 * M)) s.walkaDo = Math.max(s.walkaDo, this.h.scene.time.now + 4000);
    if (provoked && (this.stan === 'patrol' || this.stan === 'powrot')) this.stan = 'podejscie';
    s.chasing = this.inCombat;

    // Ogłuszony ciosem bohatera / esencją: przerywa wszystko (odrzut prowadzi Slime).
    if (s.ogluszony(now) || s.isDazed(now)) {
      if (this.stan === 'zapowiedz' || this.stan === 'atak') {
        this.silence();
        s.modelAttack = undefined;
        this.gfx.clear();
        this.zwolnijRezerwacje();
        this.stan = 'odpoczynek';
        this.until = now + 400;
      }
      if (s.isDazed(now)) s.vel.set(0, 0);
      return;
    }

    if (!provoked && this.stan !== 'patrol' && this.stan !== 'powrot' && odDomu > this.home.r * 1.3) {
      this.silence();
      s.modelAttack = undefined;
      this.zwolnijRezerwacje();
      this.gfx.clear();
      this.stan = 'powrot';
    }

    switch (this.stan) {
      case 'patrol':
        s.vel.set(0, 0);
        // Running round something they guard (Elzet 10's cog by the Lidl): a slow circle about home.
        if (this.home.krazy) {
          const dx = s.x - this.home.x, dy = s.y - this.home.y, d = Math.hypot(dx, dy) || 1;
          const v = P.predkosc * M * 0.55, radial = Phaser.Math.Clamp((this.home.krazy - d) / (3 * M), -1, 1);
          s.vel.set((-dy / d + (dx / d) * radial) * v, (dx / d + (dy / d) * radial) * v);
        }
        if (dist < P.wzrokM * M) this.stan = 'podejscie';
        return;

      case 'powrot': {
        if (odDomu < 8 * M) {
          s.vel.set(0, 0);
          this.stan = 'patrol';
          return;
        }
        this.idz(this.home.x, this.home.y, P.predkosc);
        if (odDomu < this.home.r * 0.9 && dist < P.wzrokM * M * 0.8) this.stan = 'podejscie';
        return;
      }

      case 'podejscie':
      case 'czeka': {
        if (!provoked && dist > P.gubiM * M) {
          s.vel.set(0, 0);
          this.stan = 'patrol';
          return;
        }
        const atak = this.wybierzAtak(now, dist);
        if (atak) {
          const typ = atak === 'rzut' ? 'dystans' : 'wrecz';
          if (this.h.rezerwuj(typ, P.rodzaj === 'boss')) {
            this.rezerwacja = typ;
            this.zacznij(now, atak);
            return;
          }
          this.stan = 'czeka';
        } else if (this.stan === 'czeka') this.stan = 'podejscie';
        this.ustaw(now, dist);
        return;
      }

      case 'zapowiedz':
        s.vel.set(0, 0);
        // Pocisk i taran celują do końca zapowiedzi w miarę wolno – ostatnie 40% to blokada kierunku.
        this.rysujZapowiedz(now);
        if (now >= this.until) this.uderz(now);
        return;

      case 'atak':
        this.trwaAtak(now, dist);
        return;

      case 'odpoczynek':
        s.vel.set(0, 0);
        if (now >= this.until) {
          this.zwolnijRezerwacje();
          this.stan = provoked || dist < P.gubiM * M ? 'podejscie' : 'patrol';
        }
        return;
    }
  }

  // -------------------------------------------------------------- decyzje

  private wybierzAtak(now: number, dist: number): Atak | null {
    const P = this.P, d = dist / M;
    if (P.rodzaj === 'dystans') {
      if (d > P.rzut.zasiegM || d < P.uciekaOdM * 0.6) return null;
      return this.czystaLinia() ? 'rzut' : null;
    }
    if (P.rodzaj === 'boss') {
      if (d <= P.rogi.zasiegM) return Math.random() < 0.5 ? 'rogi' : 'tupniecie';
      if (d <= P.tupniecie.promienM * 0.8) return 'tupniecie';
      if (d <= P.taran.zasiegM && now >= this.taranGotowyOd) return 'taran';
      return null;
    }
    if (P.klin && d <= P.klin.zasiegM) return 'klin';
    if (P.skok && d >= P.skok.odM && d <= P.skok.zasiegM && now >= this.skokGotowyOd) return 'skok';
    if (d <= P.doskok.zasiegM) return 'doskok';
    return null;
  }

  /** Bez zgody na atak: podchodzi, krąży wokół bohatera w odstępach albo (dystans) trzyma dystans. */
  private ustaw(now: number, dist: number) {
    const s = this.s, p = this.h.player, P = this.P;
    let chce: number;
    if (P.rodzaj === 'dystans') chce = ((P.trzymaM[0] + P.trzymaM[1]) / 2) * M;
    else if (P.rodzaj === 'boss') chce = P.rogi.zasiegM * 0.7 * M;
    else chce = (this.stan === 'czeka' ? P.doskok.zasiegM * 1.25 : P.doskok.zasiegM * 0.8) * M;
    const dx = s.x - p.x, dy = s.y - p.y, len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    // Promieniowo: do pożądanej odległości; stycznie: powolne krążenie (gdy już blisko).
    const radial = Phaser.Math.Clamp((chce - dist) / (6 * M), -1, 1);
    const blisko = Math.abs(dist - chce) < 6 * M || this.stan === 'czeka';
    const tang = blisko ? 0.45 : 0;
    if (Math.random() < 0.004) this.krazenie = -this.krazenie;
    let vx = nx * radial + -ny * tang * this.krazenie;
    let vy = ny * radial + nx * tang * this.krazenie;
    // Odstępy od innych.
    for (const o of this.h.inni(s)) {
      const ox = s.x - o.x, oy = s.y - o.y, od = Math.hypot(ox, oy);
      if (od > 0.1 && od < 5 * M) {
        vx += (ox / od) * (1 - od / (5 * M)) * 1.2;
        vy += (oy / od) * (1 - od / (5 * M)) * 1.2;
      }
    }
    const vl = Math.hypot(vx, vy);
    if (vl < 0.08) {
      s.vel.set(0, 0);
      return;
    }
    const v = P.predkosc * M * Math.min(1, vl);
    s.vel.set((vx / vl) * v, (vy / vl) * v);
    void now;
  }

  private idz(x: number, y: number, predkoscMs: number) {
    const d = new Phaser.Math.Vector2(x - this.s.x, y - this.s.y);
    if (d.lengthSq() < 1) return this.s.vel.set(0, 0);
    d.normalize().scale(predkoscMs * M);
    this.s.vel.set(d.x, d.y);
  }

  private czystaLinia() {
    const s = this.s, p = this.h.player;
    const n = Math.ceil(Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) / 4);
    for (let i = 1; i < n; i++) if (this.h.sciana(s.x + ((p.x - s.x) * i) / n, s.y + ((p.y - s.y) * i) / n)) return false;
    return true;
  }

  private zacznij(now: number, atak: Atak) {
    this.silence();
    const s = this.s, p = this.h.player, P = this.P;
    this.atak = atak;
    this.stan = 'zapowiedz';
    this.cel.set(p.x, p.y);
    this.kat = Math.atan2(p.y - s.y, p.x - s.x);
    s.vel.set(0, 0);
    this.until = now + this.zapowiedzMs();
    const clip = atak === 'rzut' ? 'throw' : atak === 'taran' ? 'charge' : atak === 'tupniecie' ? 'stomp'
      : atak === 'rogi' ? 'horns' : atak === 'skok' ? 'pounce' : atak === 'klin' ? 'bite'
      : atak === 'doskok' && (s.kindId === 'wilk' || s.kindId === 'warg') ? 'lunge'
      : s.kindId === 'wodnik' || s.kindId === 'driada' ? 'cast' : 'attack';
    const motionMs = atak === 'taran' && P.rodzaj === 'boss' ? P.taran.dlugoscM / P.taran.predkosc * 1000
      : atak === 'skok' && P.rodzaj === 'doskok' && P.skok ? P.skok.ms
      : atak === 'doskok' && P.rodzaj === 'doskok' ? P.doskok.ms : 350;
    s.modelAttack = { clip, start: now, contact: this.until, end: this.until + motionMs, aim: this.kat };
    if (s.kindId === 'wilk' || s.kindId === 'warg') {
      const stop = this.h.sounds?.at('wolf-growl', 0, this.audible);
      if (stop) this.soundStops.push(stop);
    }
    if (atak === 'skok' && P.rodzaj === 'doskok' && P.skok) this.skokGotowyOd = now + P.skok.coMs;
    if (atak === 'taran' && P.rodzaj === 'boss') this.taranGotowyOd = now + P.taran.coMs;
  }

  private zapowiedzMs() {
    const P = this.P;
    switch (this.atak) {
      case 'doskok': return P.rodzaj === 'doskok' ? P.doskok.zapowiedzMs : 600;
      case 'klin': return P.rodzaj === 'doskok' && P.klin ? P.klin.zapowiedzMs : 800;
      case 'skok': return P.rodzaj === 'doskok' && P.skok ? P.skok.zapowiedzMs : 1300;
      case 'rzut': return P.rodzaj === 'dystans' ? P.rzut.zapowiedzMs : 850;
      case 'taran': return P.rodzaj === 'boss' ? P.taran.zapowiedzMs : 1200;
      case 'tupniecie': return P.rodzaj === 'boss' ? P.tupniecie.zapowiedzMs : 1400;
      case 'rogi': return P.rodzaj === 'boss' ? P.rogi.zapowiedzMs : 1000;
    }
  }

  // -------------------------------------------------------------- zapowiedzi (czerwone obszary = prawdziwe trafienie)

  private rysujZapowiedz(now: number) {
    const s = this.s, g = this.gfx, P = this.P;
    g.clear();
    const caly = this.zapowiedzMs();
    const u = Phaser.Math.Clamp(1 - (this.until - now) / caly, 0, 1); // 0 → 1 w trakcie zapowiedzi
    const puls = 0.55 + 0.35 * Math.sin(now / 90);
    const boss = P.rodzaj === 'boss';
    // Tuż przed uderzeniem krawędź się rozjaśnia (zwykłe) – albo żarzy mocniej (boss).
    const tuz = Phaser.Math.Clamp((u - 0.78) / 0.22, 0, 1);
    const krawedz = boss ? BURSZTYN : tuz > 0 ? BLYSK : PYL;
    const krawedzA = boss ? 0.5 + 0.35 * puls : 0.28 + 0.5 * tuz;
    const tlo = (a: number) => g.fillStyle(CIEN, (boss ? 0.14 : 0.1) * a);
    const postep = () => g.fillStyle(boss ? ZAR : CIEN, boss ? 0.3 : 0.12 + 0.14 * u);
    const a = this.kat;
    // Pęknięcia ziemi bossa: poszarpane linie od stworka, rosnące z zapowiedzią (stałe dla danego ataku).
    const pekniecia = (dl: number, od: number, doK: number) => {
      if (!boss) return;
      const n = 7;
      g.lineStyle(1.2, BURSZTYN, 0.45 + 0.35 * puls);
      for (let i = 0; i < n; i++) {
        const k0 = od + ((doK - od) * (i + 0.5)) / n;
        let x = s.x, y = s.y, k = k0;
        const kroki = 5, L = dl * (0.55 + 0.4 * ((i * 37) % 10) / 10) * u;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 1; j <= kroki; j++) {
          k = k0 + Math.sin(i * 3.1 + j * 1.7) * 0.22;
          x = s.x + Math.cos(k) * L * j / kroki; y = s.y + Math.sin(k) * L * j / kroki;
          g.lineTo(x, y);
        }
        g.strokePath();
      }
    };
    const klin = (dl: number, pol: number) => {
      tlo(1);
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.arc(s.x, s.y, dl, a - pol, a + pol, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(1, krawedz, krawedzA);
      g.strokePath();
      // Wypełnianie od środka – widać, kiedy uderzy.
      postep();
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.arc(s.x, s.y, dl * u, a - pol, a + pol, false);
      g.closePath();
      g.fillPath();
      pekniecia(dl, a - pol, a + pol);
    };
    const pas = (dl: number, szer: number) => {
      const cx = Math.cos(a), cy = Math.sin(a), nx = -cy * szer, ny = cx * szer;
      const pts = [s.x + nx, s.y + ny, s.x + cx * dl + nx, s.y + cy * dl + ny, s.x + cx * dl - nx, s.y + cy * dl - ny, s.x - nx, s.y - ny];
      tlo(1);
      g.fillPoints([0, 2, 4, 6].map((i) => new Phaser.Math.Vector2(pts[i], pts[i + 1])), true);
      g.lineStyle(1, krawedz, krawedzA);
      g.strokePoints([0, 2, 4, 6].map((i) => new Phaser.Math.Vector2(pts[i], pts[i + 1])), true);
      const dl2 = dl * u;
      postep();
      g.fillPoints([[s.x + nx, s.y + ny], [s.x + cx * dl2 + nx, s.y + cy * dl2 + ny], [s.x + cx * dl2 - nx, s.y + cy * dl2 - ny], [s.x - nx, s.y - ny]].map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      if (boss) pekniecia(dl, a - 0.12, a + 0.12);
    };
    switch (this.atak) {
      case 'doskok':
        if (P.rodzaj === 'doskok') pas((P.doskok.zasiegM + P.doskok.trafienieM) * M + 4, P.doskok.trafienieM * M + 3);
        break;
      case 'klin':
        if (P.rodzaj === 'doskok' && P.klin) klin(P.klin.zasiegM * M, P.klin.polKata);
        break;
      case 'skok':
        if (P.rodzaj === 'doskok' && P.skok) pas(Math.min(P.skok.zasiegM, Phaser.Math.Distance.Between(s.x, s.y, this.cel.x, this.cel.y) / M + 3) * M, 1.2 * M + 3);
        break;
      case 'rzut':
        if (P.rodzaj === 'dystans') {
          // Rzut: przerywana smuga pyłu po ziemi tam, gdzie poleci pocisk.
          const dl = P.rzut.zasiegM * M, r = P.rzut.promienM * M + 3;
          g.lineStyle(2 * r, CIEN, 0.07 + 0.05 * puls);
          g.lineBetween(s.x, s.y, s.x + Math.cos(a) * dl, s.y + Math.sin(a) * dl);
          g.fillStyle(krawedz, krawedzA);
          for (let d = 4; d < dl * u; d += 5) g.fillCircle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 0.8);
        }
        break;
      case 'taran':
        if (P.rodzaj === 'boss') pas(P.taran.dlugoscM * M, P.taran.szerM * M);
        break;
      case 'tupniecie':
        if (P.rodzaj === 'boss') {
          const R = P.tupniecie.promienM * M;
          tlo(1);
          g.fillCircle(s.x, s.y, R);
          g.lineStyle(1.5, krawedz, krawedzA);
          g.strokeCircle(s.x, s.y, R);
          postep();
          g.fillCircle(s.x, s.y, R * u);
          pekniecia(R, 0, Math.PI * 2);
        }
        break;
      case 'rogi':
        if (P.rodzaj === 'boss') klin(P.rogi.zasiegM * M, P.rogi.polKata);
        break;
    }
  }

  // -------------------------------------------------------------- atak

  private uderz(now: number) {
    const s = this.s, p = this.h.player, P = this.P;
    this.gfx.clear();
    this.trafil = false;
    const wolf = s.kindId === 'wilk' || s.kindId === 'warg';
    const melee = enemyMeleeSound(s.kindId);
    if (wolf) {
      if (this.atak === 'klin') {
        const stop = this.h.sounds?.at('wolf-bite', 0, this.audible); if (stop) this.soundStops.push(stop);
      } else {
        const stop = this.h.sounds?.at('wolf-leap', 0, this.audible); if (stop) this.soundStops.push(stop);
        const sequence = s.modelAttack;
        const jawAt = this.h.attackMarker?.(s) ?? now + ((sequence?.end ?? now + 300) - now) * .27;
        const bite = this.h.sounds?.at('wolf-bite', Math.max(0, jawAt - now),
          () => this.audible() && this.stan === 'atak' && s.modelAttack === sequence);
        if (bite) this.soundStops.push(bite);
      }
    } else if (melee) {
      const stop = this.h.sounds?.at(melee, 0, this.audible); if (stop) this.soundStops.push(stop);
    } else if (this.atak === 'rzut' && (s.kindId === 'glut' || s.kindId === 'wielki_glut')) {
      this.h.sounds?.at('chestnut-throw', 0, this.audible);
    }
    const dir = new Phaser.Math.Vector2(Math.cos(this.kat), Math.sin(this.kat));
    switch (this.atak) {
      case 'doskok':
        if (P.rodzaj !== 'doskok') break;
        this.stan = 'atak';
        this.ostatnio.od = 0;
        this.until = now + P.doskok.ms;
        s.vel.set(dir.x * P.doskok.predkosc * M, dir.y * P.doskok.predkosc * M);
        return;
      case 'skok':
        if (P.rodzaj !== 'doskok' || !P.skok) break;
        this.stan = 'atak';
        this.ostatnio.od = 0;
        this.until = now + P.skok.ms;
        s.vel.set(dir.x * P.skok.predkosc * M, dir.y * P.skok.predkosc * M);
        return;
      case 'taran':
        if (P.rodzaj !== 'boss') break;
        this.stan = 'atak';
        this.ostatnio.od = 0;
        this.until = now + (P.taran.dlugoscM / P.taran.predkosc) * 1000;
        s.vel.set(dir.x * P.taran.predkosc * M, dir.y * P.taran.predkosc * M);
        return;
      case 'klin':
        if (P.rodzaj === 'doskok' && P.klin && this.wKlinie(P.klin.zasiegM * M, P.klin.polKata)) this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), P.klin.obrazenie);
        this.blysk(0xffc0a0);
        break;
      case 'rogi':
        if (P.rodzaj === 'boss' && this.wKlinie(P.rogi.zasiegM * M, P.rogi.polKata)) this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), P.rogi.obrazenie);
        this.blysk(0xffc0a0);
        break;
      case 'tupniecie':
        if (P.rodzaj === 'boss') {
          if (Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) <= P.tupniecie.promienM * M + 3) {
            this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), P.tupniecie.obrazenie);
            this.h.spowolnij(P.tupniecie.spowolnienie, P.tupniecie.spowolnienieMs);
          }
          this.fala(P.tupniecie.promienM * M);
        }
        break;
      case 'rzut':
        if (P.rodzaj === 'dystans') {
          const v = P.rzut.predkosc * M;
          const origin = this.h.origin?.(s, 'ThrowOrigin', now) ?? { x: s.x + dir.x * 4, y: s.y + dir.y * 4 };
          this.pociski.push({ x: origin.x, y: origin.y, vx: dir.x * v, vy: dir.y * v, zostalo: P.rzut.zasiegM * M, obrazenie: P.rzut.obrazenie, r: P.rzut.promienM * M + 3 });
        }
        break;
    }
    this.odpocznij(now);
  }

  private odpocznij(now: number) {
    const P = this.P;
    this.s.vel.set(0, 0);
    this.stan = 'odpoczynek';
    this.until = now + P.odpoczynekMs;
    // Rezerwacja trwa do końca odpoczynku (brief) – zwalniana w 'odpoczynek'.
  }

  private trwaAtak(now: number, dist: number) {
    const s = this.s, P = this.P;
    const ob = P.rodzaj === 'doskok' ? (this.atak === 'skok' && P.skok ? P.skok.obrazenie : P.doskok.obrazenie) : P.rodzaj === 'boss' ? P.taran.obrazenie : 0;
    const tr = P.rodzaj === 'doskok' ? P.doskok.trafienieM * M : P.rodzaj === 'boss' ? P.taran.szerM * M : 0;
    if (!this.trafil && dist <= tr + s.size + 2) {
      this.trafil = true;
      this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), ob);
    }
    // Uderzył w ścianę (moveActor go zatrzymał): koniec szarży.
    const o = this.ostatnio;
    const stoi = now - o.od > 90 && Math.hypot(s.x - o.x, s.y - o.y) < 0.2;
    if (now - o.od > 90 || o.od === 0) {
      o.x = s.x;
      o.y = s.y;
      o.od = now;
    }
    if (now >= this.until || stoi) this.odpocznij(now);
  }

  private wKlinie(dl: number, pol: number) {
    const s = this.s, p = this.h.player;
    const d = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
    if (d > dl + 4) return false;
    if (d < s.size + 3) return true;
    const a = Math.atan2(p.y - s.y, p.x - s.x);
    return Math.abs(Phaser.Math.Angle.Wrap(a - this.kat)) <= pol + 0.12;
  }

  private blysk(kolor: number) {
    this.s.setTint(kolor);
    this.h.scene.time.delayedCall(120, () => {
      if (!this.s.active) return;
      this.s.clearTint();
      if (this.s.kind.tint) this.s.setTint(this.s.kind.tint);
    });
  }

  private fala(R: number) {
    const sc = this.h.scene;
    const g = sc.add.graphics().setDepth(1_000_000);
    const x = this.s.x, y = this.s.y;
    const t = { u: 0 };
    sc.tweens.add({
      targets: t, u: 1, duration: 380,
      onUpdate: () => {
        g.clear();
        g.lineStyle(3 * (1 - t.u) + 1, 0xffe0b0, 0.8 * (1 - t.u));
        g.strokeCircle(x, y, R * (0.4 + 0.6 * t.u));
      },
      onComplete: () => g.destroy(),
    });
  }

  // -------------------------------------------------------------- pociski (żołędzie)

  private lotPociskow(dt: number) {
    const g = this.gfxPociski;
    g.clear();
    if (!this.pociski.length) return;
    const p = this.h.player;
    this.pociski = this.pociski.filter((q) => {
      const krok = Math.hypot(q.vx, q.vy) * dt;
      const n = Math.max(1, Math.ceil(krok / 3));
      for (let i = 0; i < n; i++) {
        q.x += (q.vx * dt) / n;
        q.y += (q.vy * dt) / n;
        if (this.h.sciana(q.x, q.y)) {
          if (this.s.kindId === 'glut' || this.s.kindId === 'wielki_glut') this.h.sounds?.at('chestnut-hit', 0, this.audible);
          return false;
        }
        if (Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y - 4) <= q.r + 3) {
          if (this.s.kindId === 'glut' || this.s.kindId === 'wielki_glut') this.h.sounds?.at('chestnut-hit', 0, this.audible);
          this.h.hurt(new Phaser.Math.Vector2(q.x - q.vx * 0.05, q.y - q.vy * 0.05), q.obrazenie, this.s.kindId !== 'wodnik');
          return false; // trafia najwyżej raz
        }
      }
      q.zostalo -= krok;
      if (q.zostalo <= 0) return false;
      g.fillStyle(0x1e1a24, 1);
      g.fillCircle(q.x, q.y, 2.2);
      g.fillStyle(0x9a6a32, 1);
      g.fillCircle(q.x, q.y, 1.5);
      g.fillStyle(0x5a3a1a, 1);
      g.fillRect(q.x - 1.2, q.y - 2, 2.4, 0.9);
      return true;
    });
  }
}

