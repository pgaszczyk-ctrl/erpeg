import Phaser from 'phaser';
import type { Slime } from './Slime';
import type { Player } from './Player';
import { TEX } from '../art';
import { zaladujSmoka, kluczSmoka, kluczEfektu, klatkaSmoka, maAnimacje, SKALA_RYSUNKU, zaladujEfektyAtakow, kluczAtaku, type EfektAtaku } from './smokRysunki';
import { RYSUNKI_SMOKOW, EFEKTY_ATAKOW } from '../content/smoki';
import { ATAKI_SMOKA as A, GATUNKI_SMOKOW, TRUDNOSC_SMOKOW, LIMIT_EFEKTOW, PRZERWA_MIEDZY_ATAKAMI, type AtakSmoka, type GatunekId } from '../content/smoki';

// Smok jako dane (content/smoki.ts): gatunek + ataki. Ugryzienie ma każdy; ataki specjalne (ogień, kwas, dym, lot)
// wybiera ważonym losowaniem, gdy gracz jest poza zasięgiem pyska, bez powtarzania tego samego dwa razy z rzędu.
// Każdy atak specjalny ma telegraf: pozę smoka i znacznik na ziemi rysowany kodem (czerwony stożek, okrąg, cień).
// Grafika to zaślepki (zabarwiony smok, kształty z kodu) do czasu zamówień 15/15b.

export type StanGracza = 'podpalenie' | 'oparzenie' | 'zatrucie';

export interface SmokHost {
  player: Player;
  /** Wzrost bohaterki w punktach mapy (jednostka zasięgów W). */
  W: number;
  /** Indeks trudności 0–4 (Dziecięcy … Hardkor). */
  trudnosc: number;
  blocked: (x: number, y: number) => boolean;
  /** Cios (z odrzutem): ułamek pełnego zdrowia, już przemnożony przez trudność. */
  hurt: (from: Phaser.Math.Vector2, czesc: number) => void;
  /** Tik trwającego działania (bez odrzutu i bez chwili nietykalności). */
  drain: (czesc: number) => void;
  /** Stan na gracza na `ms` (przedłuża, nie skraca). */
  stan: (s: StanGracza, ms: number) => void;
  /** Trzęsienie ekranu (px rysunku, ms); gra sprawdza przełącznik w ustawieniach. */
  shake: (px: number, ms: number) => void;
}

type Tryb = 'idzie' | 'gryzie' | 'telegraf' | 'atak' | 'lot' | 'oszolomiony';

/** Efekty na ziemi i w powietrzu (wspólne dla wszystkich smoków, z limitem). */
interface Efekt { g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; do: number; od: number; tick?: (now: number) => void; koniec?: () => void }
const efekty: Efekt[] = [];

/** Warstwy: ślady na ziemi tuż nad mapą (pod postaciami), ogień/dym/fala nad postaciami. */
const ZIEMIA = -1e7;
const POWIETRZE = 1_200_000;

export class SmokAI {
  private tryb: Tryb = 'idzie';
  private until = 0;
  private atak: AtakSmoka | null = null;
  private ostatni: AtakSmoka | null = null;
  private odnowione: Partial<Record<AtakSmoka, number>> = {};
  private kat = 0;
  private cel = { x: 0, y: 0 };
  private znacznik?: Phaser.GameObjects.Graphics;
  private plomien?: Phaser.GameObjects.Graphics;
  /** Płomień od grafika (gdy wczytany) i jego początek. */
  private ogien?: Phaser.GameObjects.Sprite;
  private ogienOd = 0;
  /** Po ataku: do kiedy trzymać pozę „wyrzut” (klatka 2), a potem „powrót” (3), zanim smok znów pójdzie. */
  private pozaWyrzutDo = 0;
  private pozaPowrotDo = 0;
  private pozaKier = { x: 0, y: 1 };
  private tikAt = 0;
  private kule: { img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; vx: number; vy: number; zostalo: number }[] = [];
  private lot?: { mign: number; nastepne: number; cien?: Phaser.GameObjects.Image; px: number; py: number };
  private zycieMax: number;
  private zauwazyl = false;
  /** Kolejny atak specjalny najwcześniej wtedy. */
  private wolnyOd = 0;

  constructor(private scene: Phaser.Scene, readonly d: Slime, readonly gatunek: GatunekId, private host: SmokHost) {
    d.heavy = true;
    d.brain = () => {};
    const g = GATUNKI_SMOKOW[gatunek];
    zaslepki(scene);
    // Zaślepka: szary smok zabarwiony kolorem gatunku (zielony po zabarwieniu robił się bury).
    if (g.kolor !== 0xffffff && scene.textures.exists('dragon-szary')) {
      d.anims.play('dragon-flap-szary');
      d.setTint(g.kolor);
    }
    if (g.skala !== 1) d.setScale(d.scaleX * g.skala);
    this.skala = d.scaleX;
    this.zycieMax = d.hp;
    // Rysunki od grafika (content/smoki.ts RYSUNKI_SMOKOW): wczytywane przy pierwszym smoku tego gatunku.
    // Ogień i kwas od grafika: każdy smok może ich użyć (też Cień smoka w fazach).
    void zaladujEfektyAtakow(scene);
    const r = RYSUNKI_SMOKOW[gatunek];
    if (r) void zaladujSmoka(scene, gatunek).then((ok) => {
      if (!ok || !d.active) return;
      d.anims.stop();
      d.clearTint();
      d.setTexture(kluczSmoka(gatunek), klatkaSmoka(gatunek, 'stoi_przod_1'));
      d.setScale(SKALA_RYSUNKU);
      // Punkt smoka = środek ciała (nie łapy): duży smok zatrzymuje się przed bohaterką, a nie staje na niej.
      d.setOrigin(r.srodek[0] / r.komorka[0], r.srodek[1] / r.komorka[1]);
      d.ownLook = true;
      d.sizeOverride = Math.round(r.komorka[0] * SKALA_RYSUNKU * 0.24);
      d.depthOff = r.stopy ? (r.stopy - r.srodek[1]) * SKALA_RYSUNKU : 0;
      this.skala = SKALA_RYSUNKU;
      this.rysunek = true;
    });
  }

  /** Smok narysowany przez grafika (a nie zaślepka z kodu). */
  private rysunek = false;
  private skala = 1;
  private animacja = '';

  /** Kierunek do kamery/bok/od kamery wg wektora (bok patrzy w lewo, w prawo lustrem). */
  private kierunek(vx: number, vy: number): { k: string; lustro: boolean } {
    if (Math.abs(vx) >= Math.abs(vy) * 0.8) return { k: 'bok', lustro: vx > 0 };
    if (vy < 0 && this.rysunek && RYSUNKI_SMOKOW[this.gatunek]?.tylJakBok) return { k: 'bok', lustro: vx > 0 };
    return { k: vy > 0 ? 'przod' : 'tyl', lustro: false };
  }

  /** Animacja z arkusza grafika (gdy jest): akcja w kierunku, z lustrem; jednorazowe nie zaczynają się od nowa co klatkę. */
  private graj(akcja: string, vx: number, vy: number, kierunekStaly?: string) {
    if (!this.rysunek) return;
    const d = this.d;
    let { k, lustro } = this.kierunek(vx, vy);
    if (kierunekStaly) { k = kierunekStaly; lustro = kierunekStaly === 'bok' ? lustro : false; }
    if (!maAnimacje(this.scene, this.gatunek, akcja, k)) k = maAnimacje(this.scene, this.gatunek, akcja, 'przod') ? 'przod' : 'bok';
    const key = `${kluczSmoka(this.gatunek)}-${akcja}_${k}`;
    d.setFlipX(lustro);
    if (this.animacja !== key || !d.anims.isPlaying && (akcja === 'stoi' || akcja === 'idzie')) {
      this.animacja = key;
      d.anims.play(key, true);
    }
  }

  /** Jedna klatka ataku specjalnego (ziej/pluj nr 1–3) w kierunku celu, bez animacji. */
  private pozaAtaku(nr: number, vx: number, vy: number, atak = this.atak) {
    if (!this.rysunek) return;
    const akcja = atak === 'ogien' ? 'ziej' : atak === 'kwas' ? 'pluj' : '';
    if (!akcja) return;
    let { k, lustro } = this.kierunek(vx, vy);
    let f = klatkaSmoka(this.gatunek, `${akcja}_${k}_${nr}`);
    if (f < 0) { k = 'bok'; f = klatkaSmoka(this.gatunek, `${akcja}_bok_${nr}`); }
    if (f < 0) return;
    this.animacja = '';
    this.d.anims.stop();
    this.d.setFlipX(k === 'bok' && lustro);
    if (this.d.frame.name !== String(f)) this.d.setFrame(f);
  }

  /** Pysk w punktach mapy (z rysunku grafika), inaczej tuż nad środkiem smoka. */
  private pysk(vx: number, vy: number): { x: number; y: number } {
    const d = this.d, r = RYSUNKI_SMOKOW[this.gatunek];
    if (!this.rysunek || !r?.pysk) return { x: d.x, y: d.y - 4 };
    const { k, lustro } = this.kierunek(vx, vy);
    const [px, py] = r.pysk[k as 'bok' | 'przod' | 'tyl'];
    const dx = (px - r.srodek[0]) * this.skala, dy = (py - r.srodek[1]) * this.skala;
    return { x: d.x + (lustro ? -dx : dx), y: d.y + dy };
  }

  private get tf() { return TRUDNOSC_SMOKOW.telegraf[this.host.trudnosc] ?? 1; }
  private get W() { return this.host.W; }

  /** Ataki dostępne teraz (boss w fazach dostaje kolejne, gdy traci życie). */
  private ataki(): [AtakSmoka, number][] {
    const g = GATUNKI_SMOKOW[this.gatunek];
    let a = g.ataki;
    const czesc = this.d.hp / Math.max(1, this.zycieMax);
    for (const f of g.fazy ?? []) if (czesc <= f.odZycia) a = f.ataki;
    return Object.entries(a) as [AtakSmoka, number][];
  }

  update(now: number, dt: number) {
    this.updateKule(dt);
    const d = this.d;
    if (!d.active || d.isDead) return this.sprzataj();
    const p = this.host.player;
    const dx = p.x - d.x, dy = p.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const W = this.W;
    // Zauważa bohaterkę dopiero w swoim promieniu (gatunek.wykrycie); potem walczy do końca.
    if (!this.zauwazyl) {
      if (dist > GATUNKI_SMOKOW[this.gatunek].wykrycie * this.W && this.zycieMax <= d.hp) { d.vel.set(0, 0); this.graj('stoi', 0, 1); return; }
      this.zauwazyl = true;
    }
    d.chasing = true;
    const pysk = d.size + A.ugryzienie.zasieg * W * 0.5;

    if (this.tryb === 'idzie') {
      d.clearTint();
      const g = GATUNKI_SMOKOW[this.gatunek];
      if (g.kolor !== 0xffffff && !this.rysunek) d.setTint(g.kolor);
      if (dist > pysk - 2) d.vel.set(ux * g.predkosc, uy * g.predkosc);
      else d.vel.set(0, 0);
      if (now < this.pozaPowrotDo) {
        // Smok kończy wyrzut ognia/kwasu (klatki 2 → 3 grafika) i dopiero potem rusza.
        d.vel.set(0, 0);
        this.pozaAtaku(now < this.pozaWyrzutDo ? 2 : 3, this.pozaKier.x, this.pozaKier.y, this.ostatni);
      } else this.graj(d.vel.lengthSq() > 1 ? 'idzie' : 'stoi', ux, uy);
      if (dist < pysk && now >= (this.odnowione.ugryzienie ?? 0)) {
        // Ugryzienie: cofa się na chwilę (telegraf), potem kłapie przed siebie.
        this.tryb = 'gryzie';
        this.until = now + A.ugryzienie.telegraf * this.tf;
        this.kat = Math.atan2(uy, ux);
        return;
      }
      if (dist >= pysk) {
        const wybor = this.wybierz(now, dist);
        if (wybor) this.zacznij(wybor, now, ux, uy);
      }
      return;
    }
    if (this.tryb === 'gryzie') {
      this.graj('ugryzienie', Math.cos(this.kat), Math.sin(this.kat));
      const k = (this.until - now) / (A.ugryzienie.telegraf * this.tf);
      d.vel.set(-Math.cos(this.kat) * 14 * k, -Math.sin(this.kat) * 14 * k);
      if (now >= this.until) {
        d.vel.set(0, 0);
        if (dist < pysk + 4) {
          this.host.hurt(new Phaser.Math.Vector2(d.x, d.y), A.ugryzienie.obrazenia);
          klapniecie(this.scene, d.x + ux * d.size, d.y + uy * d.size - 4, Math.atan2(uy, ux));
        }
        this.odnowione.ugryzienie = now + A.ugryzienie.odnowienie;
        this.tryb = 'idzie';
      }
      return;
    }
    if (this.tryb === 'telegraf') {
      d.vel.set(0, 0);
      this.telegraf(now);
      if (now >= this.until) this.czynny(now, ux, uy);
      return;
    }
    if (this.tryb === 'atak') {
      d.vel.set(0, 0);
      this.trwa(now);
      return;
    }
    if (this.tryb === 'lot') {
      d.vel.set(0, 0);
      this.leci(now);
      return;
    }
    if (this.tryb === 'oszolomiony') {
      d.vel.set(0, 0);
      if (!d.inAir) this.graj('ladowanie', 0, 1, 'przod');
      if (now >= this.until) {
        d.clearTint();
        this.tryb = 'idzie';
      }
    }
  }

  /** Atak specjalny: ważony, bez powtórki, w swoim zasięgu, po odnowieniu. */
  private wybierz(now: number, dist: number): AtakSmoka | null {
    const W = this.W;
    if (now < this.wolnyOd) return null;
    const mozliwe = this.ataki().filter(([a]) => a !== this.ostatni || this.ataki().length === 1)
      .filter(([a]) => now >= (this.odnowione[a] ?? 0) && dist <= (A[a as Exclude<AtakSmoka, 'ugryzienie'>].zasieg ?? 4) * W);
    if (!mozliwe.length) return null;
    let s = mozliwe.reduce((t, [, w]) => t + w, 0) * Math.random();
    for (const [a, w] of mozliwe) if ((s -= w) <= 0) return a;
    return mozliwe[0][0];
  }

  private zacznij(a: AtakSmoka, now: number, ux: number, uy: number) {
    const p = this.host.player, d = this.d;
    this.atak = a;
    this.ostatni = a;
    this.kat = Math.atan2(uy, ux); // kierunek blokowany w chwili rozpoczęcia (ogień)
    // Płomień grafika jest w 8 kierunkach: stożek obrażeń i znacznik idą za nim.
    if (a === 'ogien' && this.scene.textures.exists(kluczAtaku('ogien_prawo'))) this.kat = Math.round(this.kat / (Math.PI / 4)) * (Math.PI / 4);
    this.cel = { x: p.x, y: p.y };
    this.znacznik?.destroy();
    this.znacznik = this.scene.add.graphics().setDepth(ZIEMIA + 2);
    if (a === 'lot') {
      this.tryb = 'lot';
      this.until = now + A.lot.start * this.tf;
      // Miejsce upadku: losowo do 2 W od gracza; przy 1. mignięciu jeszcze idzie za graczem.
      const r = Math.random() * A.lot.rozrzut * this.W, t = Math.random() * Math.PI * 2;
      this.lot = { mign: 0, nastepne: this.until, px: p.x + Math.cos(t) * r, py: p.y + Math.sin(t) * r };
      d.setTint(0xd8e4ff);
      return;
    }
    this.tryb = 'telegraf';
    const T = a === 'ogien' ? A.ogien.telegraf : a === 'kwas' ? A.kwas.telegraf : A.dym.telegraf;
    this.until = now + T * this.tf;
  }

  /** Poza smoka i czerwony znacznik na ziemi (stożek, okrąg, cel kwasu). */
  private telegraf(now: number) {
    const d = this.d, g = this.znacznik!, W = this.W;
    const migaj = 0.45 + 0.35 * Math.sin(now / 70);
    g.clear();
    g.lineStyle(1.5, 0xff3b30, migaj);
    if (this.atak === 'ogien') {
      const c = Math.cos(this.kat), s = Math.sin(this.kat);
      if (this.rysunek) this.pozaAtaku(1, c, s); else d.setTint(0xffd0a0);
      const p = this.pysk(c, s);
      stozek(g, p.x, p.y, this.kat, A.ogien.dlugosc * W, A.ogien.szerokosc * W, false);
    } else if (this.atak === 'kwas') {
      const vx = this.cel.x - d.x, vy = this.cel.y - d.y;
      if (this.rysunek) this.pozaAtaku(1, vx, vy); else d.setTint(0xe8ff9a);
      const p = this.pysk(vx, vy);
      g.strokeCircle(this.cel.x, this.cel.y, A.kwas.kaluza.promien * W);
      g.lineBetween(p.x, p.y, this.cel.x, this.cel.y);
    } else if (this.atak === 'dym') {
      d.setTint(0xc8b8e0);
      d.setScale(d.scaleX, d.scaleX * 0.9); // przykuca
      g.strokeCircle(d.x, d.y, A.dym.promien * W);
    }
  }

  /** Koniec telegrafu: część czynna ataku. */
  private czynny(now: number, ux: number, uy: number) {
    const d = this.d, W = this.W;
    d.setScale(d.scaleX, d.scaleX);
    this.znacznik?.clear();
    if (this.atak === 'ogien') {
      this.tryb = 'atak';
      this.until = now + A.ogien.czas;
      this.tikAt = now;
      this.pozaAtaku(2, Math.cos(this.kat), Math.sin(this.kat));
      const p = this.pysk(Math.cos(this.kat), Math.sin(this.kat));
      const ogien = plomienGrafika(this.scene, p.x, p.y, this.kat, A.ogien.dlugosc * W);
      if (ogien) { this.ogien = ogien; this.ogienOd = now; }
      else this.plomien = this.scene.add.graphics().setDepth(POWIETRZE).setBlendMode(Phaser.BlendModes.ADD);
      return;
    }
    if (this.atak === 'kwas') {
      const n = TRUDNOSC_SMOKOW.kulKwasu[this.host.trudnosc] ?? A.kwas.kul;
      this.pozaAtaku(2, this.cel.x - d.x, this.cel.y - d.y);
      this.pozaKier = { x: this.cel.x - d.x, y: this.cel.y - d.y };
      this.pozaWyrzutDo = now + 220;
      this.pozaPowrotDo = now + 400;
      const u = this.pysk(this.cel.x - d.x, this.cel.y - d.y);
      const baza = Math.atan2(this.cel.y - u.y, this.cel.x - u.x);
      const grafika = this.scene.textures.exists(kluczAtaku('pocisk_kwasu'));
      for (let i = 0; i < n; i++) {
        const a = baza + (i - (n - 1) / 2) * 0.22;
        const img = grafika
          ? this.scene.add.sprite(u.x, u.y, kluczAtaku('pocisk_kwasu')).play(kluczAtaku('pocisk_kwasu')).setScale(SKALA_RYSUNKU).setRotation(a).setDepth(POWIETRZE)
          : this.scene.add.image(u.x, u.y, 'smok-kwas').setDepth(POWIETRZE);
        if (grafika) (img as Phaser.GameObjects.Sprite).texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        const zasieg = Math.min(A.kwas.lot * W, Math.hypot(this.cel.x - u.x, this.cel.y - u.y) + 2);
        this.kule.push({ img, vx: Math.cos(a) * A.kwas.predkosc, vy: Math.sin(a) * A.kwas.predkosc, zostalo: zasieg / A.kwas.predkosc });
      }
      this.koniecAtaku(now, A.kwas.odnowienie);
      return;
    }
    if (this.atak === 'dym') {
      chmura(this.scene, d.x, d.y, A.dym.promien * W, now, this.host);
      this.koniecAtaku(now, A.dym.odnowienie);
      return;
    }
    void ux; void uy;
  }

  /** Ogień: stożek trwa, co tik rani tylko w obszarze i podpala; na końcu przypalona plama. */
  private trwa(now: number) {
    const W = this.W, p = this.host.player;
    if (this.atak !== 'ogien') return;
    const L = A.ogien.dlugosc * W, S = A.ogien.szerokosc * W;
    const u = this.pysk(Math.cos(this.kat), Math.sin(this.kat));
    if (this.ogien) {
      // Płomień grafika: 1. klatka buchnięcie, potem migocze 2↔3, na koniec gaśnie na 3.
      const t = now - this.ogienOd, koniec = this.until - now;
      this.ogien.setFrame(t < 120 ? 0 : koniec < 150 ? 2 : 1 + (Math.floor(t / 110) % 2));
    } else if (this.plomien) {
      const g = this.plomien;
      g.clear();
      // Płomień z kodu (zaślepka): kilka nakładających się, migoczących klinów.
      for (let i = 0; i < 4; i++) {
        const k = 0.88 + 0.12 * Math.random();
        g.fillStyle([0xff4a1c, 0xff8a2a, 0xffc84a, 0xfff0a0][i], 0.35 + 0.15 * i);
        stozek(g, u.x, u.y, this.kat + (Math.random() - 0.5) * 0.08, L * k * (1 - i * 0.12), S * k * (1 - i * 0.2), true);
      }
    }
    if (now >= this.tikAt) {
      this.tikAt = now + A.ogien.tik;
      if (wStozku(p.x, p.y - 4, u.x, u.y, this.kat, L, S)) {
        this.host.drain(A.ogien.obrazenia);
        this.host.stan('podpalenie', A.ogien.podpalenie.ms);
      }
    }
    if (now >= this.until) {
      this.plomien?.destroy();
      this.plomien = undefined;
      this.ogien?.destroy();
      this.ogien = undefined;
      this.pozaKier = { x: Math.cos(this.kat), y: Math.sin(this.kat) };
      this.pozaWyrzutDo = now;
      this.pozaPowrotDo = now + 200;
      plama(this.scene, u.x + Math.cos(this.kat) * L * 0.55, u.y + 4 + Math.sin(this.kat) * L * 0.55, L * 0.45, S * 0.4, this.kat, A.ogien.plamaMs, now);
      this.koniecAtaku(now, A.ogien.odnowienie);
    }
  }

  /** Lot: start, 3 mignięcia cienia (miejsce blokowane od 2.), upadek, fala, trzęsienie, oszołomienie. */
  private leci(now: number) {
    const d = this.d, l = this.lot!, p = this.host.player, W = this.W;
    if (l.mign === 0 && now < this.until) {
      // Start: przysiad, skrzydła, wzbicie (rysunek grafika), u zaślepki tylko lekkie urośnięcie.
      if (this.rysunek) this.graj('start', p.x - d.x, p.y - d.y);
      else d.setScale(d.scaleX * 1.002);
      return;
    }
    if (l.mign === 0) {
      d.setVisible(false);
      d.inAir = true;
      d.setScale(this.skala);
    }
    const odstep = TRUDNOSC_SMOKOW.odstepLotu[this.host.trudnosc] ?? A.lot.odstep;
    if (l.mign < A.lot.migniecia && now >= l.nastepne) {
      l.mign++;
      l.nastepne = now + odstep;
      // Do 2. mignięcia miejsce upadku idzie jeszcze za graczem.
      if (l.mign < A.lot.blokadaOd) { l.px += (p.x - l.px) * 0.5; l.py += (p.y - l.py) * 0.5; }
      l.cien?.destroy();
      const k = 0.6 + 0.2 * l.mign;
      // Cień z rysunku lotu z góry (grafik: „cień robimy kodem z tego rysunku”), u zaślepki narysowany cień smoka.
      l.cien = this.rysunek
        ? this.scene.add.image(l.px, l.py, kluczSmoka(this.gatunek), klatkaSmoka(this.gatunek, `lot_gora_${1 + (l.mign % 2)}`)).setTint(0x000000).setScale(this.skala * k)
        : this.scene.add.image(l.px, l.py, TEX.dragonShadow, 'f0').setScale(k * 1.4);
      l.cien.setDepth(ZIEMIA + 3).setAlpha(this.rysunek ? 0.35 + 0.2 * l.mign : 0.2 + 0.15 * l.mign);
      this.scene.tweens.add({ targets: l.cien, alpha: 0, duration: odstep * 0.8, ease: 'Quad.In' });
      this.znacznik!.clear().lineStyle(1.5, 0xff3b30, 0.5 + 0.15 * l.mign).strokeCircle(l.px, l.py, A.lot.promien * W);
      return;
    }
    if (l.mign >= A.lot.migniecia && now >= l.nastepne) {
      // Upadek z góry w wyznaczone miejsce.
      l.cien?.destroy();
      this.znacznik?.clear();
      d.setPosition(l.px, l.py);
      d.setVisible(true);
      d.inAir = false;
      const s = this.skala;
      d.setScale(s * 1.6);
      if (this.rysunek) {
        this.animacja = '';
        d.setFlipX(false);
        d.anims.stop();
        d.setFrame(klatkaSmoka(this.gatunek, 'lot_gora_1'));
      }
      this.scene.tweens.add({ targets: d, scaleX: s, scaleY: s, duration: A.lot.upadek, ease: 'Quad.In', onComplete: () => this.uderzenie(this.scene.time.now) });
      this.tryb = 'oszolomiony';
      this.until = now + A.lot.upadek + A.lot.oszolomienie;
      this.lot = undefined;
    }
  }

  private uderzenie(now: number) {
    const d = this.d, p = this.host.player, W = this.W, R = A.lot.promien * W;
    const dist = Math.hypot(p.x - d.x, p.y - d.y);
    if (dist < R) this.host.hurt(new Phaser.Math.Vector2(d.x, d.y), A.lot.obrazenia * (1 - dist / R));
    // Trzęsienie słabnie z odległością (do 3 promieni).
    const sila = Math.max(0, 1 - dist / (R * 3));
    if (sila > 0) this.host.shake(Math.max(1, Math.round(A.lot.trzesienie.px * sila)), A.lot.trzesienie.ms);
    if (this.scene.textures.exists(kluczEfektu('fala'))) efektyUderzenia(this.scene, d.x, d.y, A.lot.peknieciaMs, now);
    else {
      fala(this.scene, d.x, d.y, R);
      pekniecia(this.scene, d.x, d.y, R * 0.7, A.lot.peknieciaMs, now);
    }
    if (!this.rysunek) d.setTint(0x9a9aa8);
    this.odnowione.lot = now + A.lot.odnowienie;
    this.wolnyOd = now + A.lot.oszolomienie + PRZERWA_MIEDZY_ATAKAMI;
    this.atak = null;
  }

  private koniecAtaku(now: number, odnowienie: number) {
    if (this.atak) this.odnowione[this.atak] = now + odnowienie;
    this.wolnyOd = now + PRZERWA_MIEDZY_ATAKAMI;
    this.atak = null;
    this.tryb = 'idzie';
    this.znacznik?.clear();
  }

  /** Kule kwasu: lecą po prostej w miejsce z chwili wyplucia; trafienie albo koniec lotu → kałuża. */
  private updateKule(dt: number) {
    const p = this.host.player, W = this.W;
    this.kule = this.kule.filter((b) => {
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      b.zostalo -= dt;
      const trafiony = Math.hypot(b.img.x - p.x, b.img.y - (p.y - 3)) < 6;
      if (trafiony) {
        this.host.hurt(new Phaser.Math.Vector2(b.img.x, b.img.y), A.kwas.obrazenia);
        this.host.stan('oparzenie', A.kwas.oparzenie.ms);
      }
      if (trafiony || b.zostalo <= 0 || this.host.blocked(b.img.x, b.img.y)) {
        rozbryzg(this.scene, b.img.x, b.img.y);
        kaluza(this.scene, b.img.x, b.img.y + 4, A.kwas.kaluza.promien * W, this.scene.time.now, this.host);
        b.img.destroy();
        return false;
      }
      return true;
    });
  }

  private sprzataj() {
    this.znacznik?.destroy();
    this.znacznik = undefined;
    this.plomien?.destroy();
    this.plomien = undefined;
    this.ogien?.destroy();
    this.ogien = undefined;
    this.lot?.cien?.destroy();
  }

  destroy() {
    this.sprzataj();
    for (const b of this.kule) b.img.destroy();
    this.kule = [];
    this.d.inAir = false;
  }
}

/** Co klatkę: tiki kałuż i chmur, blaknięcie śladów (wywołuje GameScene). */
export function aktualizujEfekty(now: number) {
  for (let i = efekty.length - 1; i >= 0; i--) {
    const e = efekty[i];
    e.tick?.(now);
    if (now >= e.do) {
      e.koniec?.();
      e.g.destroy();
      efekty.splice(i, 1);
    }
  }
}

/** Nowa scena: stare efekty precz. */
export function wyczyscEfekty() {
  for (const e of efekty) e.g.destroy();
  efekty.length = 0;
}

function dodaj(e: Efekt) {
  efekty.push(e);
  while (efekty.length > LIMIT_EFEKTOW) {
    const s = efekty.shift()!;
    s.koniec?.();
    s.g.destroy();
  }
}

function stozek(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, L: number, S: number, pelny: boolean) {
  const cx = Math.cos(a), cy = Math.sin(a), nx = -cy, ny = cx;
  const pts = [new Phaser.Math.Vector2(x + nx * 2, y + ny * 2), new Phaser.Math.Vector2(x + cx * L + nx * S / 2, y + cy * L + ny * S / 2), new Phaser.Math.Vector2(x + cx * L - nx * S / 2, y + cy * L - ny * S / 2), new Phaser.Math.Vector2(x - nx * 2, y - ny * 2)];
  if (pelny) g.fillPoints(pts, true);
  else g.strokePoints(pts, true);
}

function wStozku(px: number, py: number, x: number, y: number, a: number, L: number, S: number) {
  const dx = px - x, dy = py - y;
  const t = dx * Math.cos(a) + dy * Math.sin(a);
  if (t < 0 || t > L) return false;
  const s = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
  return s <= 2 + (S / 2 - 2) * (t / L);
}

function klapniecie(scene: Phaser.Scene, x: number, y: number, a: number) {
  const g = scene.add.graphics().setDepth(POWIETRZE);
  g.lineStyle(2, 0xffffff, 1);
  for (const s of [-1, 1]) g.lineBetween(x + Math.cos(a + s * 0.6) * 6, y + Math.sin(a + s * 0.6) * 6, x + Math.cos(a) * 2, y + Math.sin(a) * 2);
  scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
}

/** Przypalona plama po ogniu (dekoracja, bez obrażeń). */
function plama(scene: Phaser.Scene, x: number, y: number, rx: number, ry: number, a: number, ms: number, now: number) {
  if (scene.textures.exists(kluczAtaku('przypalona_plama'))) {
    // Rysunek grafika: świeża → stygnie → wyblakła, przez cały czas plamy.
    const img = efektAtaku(scene, 'przypalona_plama', x, y, rx * 2.2).setDepth(ZIEMIA + 1);
    dodaj({ g: img, od: now, do: now + ms, tick: (t) => { img.setFrame(Math.min(2, Math.floor(((t - now) / ms) * 3))); img.setAlpha(Math.min(1, (now + ms - t) / 3000)); } });
    return;
  }
  const g = scene.add.graphics().setDepth(ZIEMIA + 1);
  g.fillStyle(0x1e1a24, 0.35);
  g.fillEllipse(x, y, rx * 2 * Math.abs(Math.cos(a)) + ry * 2 * Math.abs(Math.sin(a)), rx * 2 * Math.abs(Math.sin(a)) + ry * 2 * Math.abs(Math.cos(a)));
  g.fillStyle(0x3a2a20, 0.3);
  g.fillEllipse(x + 2, y + 1, rx, ry);
  dodaj({ g, od: now, do: now + ms, tick: (t) => g.setAlpha(Math.min(1, (now + ms - t) / 3000)) });
}

/** Kałuża kwasu: rani stojących w niej, bąbelkuje, blaknie. */
function kaluza(scene: Phaser.Scene, x: number, y: number, r: number, now: number, host: SmokHost) {
  const K = A.kwas.kaluza;
  let tik = now + K.tik;
  const rani = (t: number) => {
    if (t < tik) return;
    tik = t + K.tik;
    const p = host.player;
    if (((p.x - x) / r) ** 2 + ((p.y - y) / (r * 0.65)) ** 2 <= 1) host.drain(K.obrazenia);
  };
  if (scene.textures.exists(kluczAtaku('kaluza_kwasu'))) {
    const s = efektAtaku(scene, 'kaluza_kwasu', x, y, r * 2).setDepth(ZIEMIA + 1);
    s.play(kluczAtaku('kaluza_kwasu'));
    dodaj({ g: s, od: now, do: now + K.ms, tick: (t) => { s.setAlpha(Math.min(1, ((now + K.ms - t) / K.ms) * 3)); rani(t); } });
    return;
  }
  const g = scene.add.graphics().setDepth(ZIEMIA + 1);
  dodaj({
    g, od: now, do: now + K.ms,
    tick: (t) => {
      const zostalo = (now + K.ms - t) / K.ms;
      g.clear();
      g.fillStyle(0x9ad83a, 0.55 * Math.min(1, zostalo * 3));
      g.fillEllipse(x, y, r * 2, r * 1.3);
      g.fillStyle(0xd8ff7a, 0.7 * Math.min(1, zostalo * 3));
      for (let i = 0; i < 4; i++) { // bąbelki
        const f = ((t / 600 + i * 0.27) % 1);
        if (f < 0.6) g.fillCircle(x + Math.cos(i * 2.1) * r * 0.5, y + Math.sin(i * 1.7) * r * 0.3, 0.8 + f * 1.2);
      }
      rani(t);
    },
  });
}

/** Rysunek efektu od grafika zaczepiony w swoim punkcie, przeskalowany do `dl` punktów mapy (długość/szerokość rysunku). */
function efektAtaku(scene: Phaser.Scene, n: EfektAtaku, x: number, y: number, dl: number) {
  const e = EFEKTY_ATAKOW[n];
  return scene.add.sprite(x, y, kluczAtaku(n), 0).setOrigin(e.kotwica[0] / e.bok, e.kotwica[1] / e.bok).setScale(dl / e.dlugosc);
}

/** Płomień od grafika w jednym z 8 kierunków (lewe lustrem), wylot w pysku; null bez rysunków. */
function plomienGrafika(scene: Phaser.Scene, x: number, y: number, kat: number, L: number): Phaser.GameObjects.Sprite | null {
  if (!scene.textures.exists(kluczAtaku('ogien_prawo'))) return null;
  const o = ((Math.round(kat / (Math.PI / 4)) % 8) + 8) % 8; // 0 prawo, 2 dół, 4 lewo, 6 góra
  const nazwy: EfektAtaku[] = ['ogien_prawo', 'ogien_prawo_dol', 'ogien_dol', 'ogien_prawo_dol', 'ogien_prawo', 'ogien_prawo_gora', 'ogien_gora', 'ogien_prawo_gora'];
  const lustro = o >= 3 && o <= 5;
  const n = nazwy[o], e = EFEKTY_ATAKOW[n];
  const s = scene.add.sprite(x, y, kluczAtaku(n), 0).setScale(L / e.dlugosc).setDepth(POWIETRZE).setFlipX(lustro);
  s.setOrigin((lustro ? e.bok - e.kotwica[0] : e.kotwica[0]) / e.bok, e.kotwica[1] / e.bok);
  return s;
}

/** Rozbryzg kwasu przy uderzeniu kuli (raz). */
function rozbryzg(scene: Phaser.Scene, x: number, y: number) {
  if (!scene.textures.exists(kluczAtaku('rozbryzg_kwasu'))) return;
  const s = efektAtaku(scene, 'rozbryzg_kwasu', x, y, 24).setDepth(POWIETRZE);
  s.play(kluczAtaku('rozbryzg_kwasu'));
  s.once('animationcomplete', () => s.destroy());
}

/** Trujący dym: rośnie, trwa w miejscu wydechu, rzednie; w środku zatrucie. */
function chmura(scene: Phaser.Scene, x: number, y: number, R: number, now: number, host: SmokHost) {
  const D = A.dym;
  const kl: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < 6; i++) kl.push(scene.add.image(x + Math.cos(i) * R * 0.3, y + Math.sin(i * 1.3) * R * 0.25, 'smok-dym').setDepth(POWIETRZE - 1).setAlpha(0));
  const g = scene.add.graphics();
  const caly = D.rosnie + D.trwa + D.rzednie;
  let tik = now + D.tik;
  dodaj({
    g, od: now, do: now + caly,
    koniec: () => kl.forEach((k) => k.destroy()),
    tick: (t) => {
      const u = t - now;
      const k = u < D.rosnie ? u / D.rosnie : 1;
      const a = u > D.rosnie + D.trwa ? 1 - (u - D.rosnie - D.trwa) / D.rzednie : 1;
      kl.forEach((c, i) => {
        c.setDisplaySize(R * 1.4 * k, R * 1.1 * k).setAlpha(0.42 * a).setRotation(t / 4000 + i);
        c.setPosition(x + Math.cos(i + t / 3000) * R * 0.35 * k, y + Math.sin(i * 1.3 + t / 3500) * R * 0.25 * k);
      });
      if (t >= tik && a > 0.3) {
        tik = t + D.tik;
        const p = host.player;
        if (Math.hypot(p.x - x, (p.y - y) * 1.25) <= R * k) host.stan('zatrucie', D.poWyjsciu); // obrażenia daje sam stan
      }
    },
  });
}

/** Fala uderzeniowa i pył po upadku. */
function fala(scene: Phaser.Scene, x: number, y: number, R: number) {
  const g = scene.add.graphics().setDepth(POWIETRZE);
  const o = { r: 2 };
  scene.tweens.add({
    targets: o, r: R, duration: 380, ease: 'Quad.Out',
    onUpdate: () => {
      g.clear();
      g.lineStyle(2, 0xf2ead2, 1 - o.r / R);
      g.strokeEllipse(x, y, o.r * 2, o.r * 1.3);
      g.fillStyle(0xb8a888, 0.35 * (1 - o.r / R));
      for (let i = 0; i < 8; i++) g.fillCircle(x + Math.cos(i * 0.8) * o.r * 0.8, y + Math.sin(i * 0.8) * o.r * 0.5, 3 + (o.r / R) * 4);
    },
    onComplete: () => g.destroy(),
  });
}

/** Upadek z rysunkami grafika: fala (4 klatki), pył (3), pęknięcia (świeże → wyblakłe), odłamki rozrzucone kodem. */
function efektyUderzenia(scene: Phaser.Scene, x: number, y: number, ms: number, now: number) {
  const K = SKALA_RYSUNKU;
  const fala = scene.add.sprite(x, y, kluczEfektu('fala'), 0).setScale(K).setDepth(POWIETRZE);
  let f = 0;
  scene.time.addEvent({ delay: 90, repeat: 3, callback: () => { f++; if (f < 4) fala.setFrame(f); else scene.tweens.add({ targets: fala, alpha: 0, duration: 200, onComplete: () => fala.destroy() }); } });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const pyl = scene.add.sprite(x + Math.cos(a) * 14, y + Math.sin(a) * 8, kluczEfektu('pyl'), 0).setScale(K).setDepth(POWIETRZE - 1);
    let k = 0;
    scene.time.addEvent({ delay: 160, repeat: 2, callback: () => { k++; if (k < 3) pyl.setFrame(k); } });
    scene.tweens.add({ targets: pyl, y: pyl.y - 10, alpha: 0, delay: 250, duration: 700, onComplete: () => pyl.destroy() });
  }
  const pek = scene.add.image(x, y, kluczEfektu('pekniecia'), 0).setScale(K).setDepth(ZIEMIA + 1);
  dodaj({ g: pek, od: now, do: now + ms, tick: (t) => { if (t > now + ms / 2 && pek.frame.name !== '1') pek.setFrame(1); pek.setAlpha(Math.min(1, (now + ms - t) / 4000)); } });
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 22;
    const o = scene.add.image(x, y - 4, kluczEfektu('odlamek'), i).setScale(K).setDepth(POWIETRZE);
    scene.tweens.add({ targets: o, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.6, angle: (Math.random() - 0.5) * 360, duration: 420, ease: 'Quad.Out' });
    scene.tweens.add({ targets: o, alpha: 0, delay: 1800, duration: 600, onComplete: () => o.destroy() });
  }
}

/** Śmierć smoka z rysunkiem: kopia leży i gaśnie (3 klatki z boku), bo prawdziwy obiekt gra zaraz usuwa. */
export function smokSmierc(scene: Phaser.Scene, d: Slime, gatunek: GatunekId) {
  const key = `${kluczSmoka(gatunek)}-smierc_bok`;
  if (!scene.anims.exists(key)) return;
  const c = scene.add.sprite(d.x, d.y, kluczSmoka(gatunek)).setOrigin(d.originX, d.originY).setScale(d.scaleX).setFlipX(d.flipX).setDepth(d.depth);
  c.play(key);
  scene.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 900, onComplete: () => c.destroy() });
}

/** Pęknięcia ziemi po upadku (dekoracja). */
function pekniecia(scene: Phaser.Scene, x: number, y: number, r: number, ms: number, now: number) {
  const g = scene.add.graphics().setDepth(ZIEMIA + 1);
  g.lineStyle(1, 0x1e1a24, 0.7);
  for (let i = 0; i < 7; i++) {
    let a = (i / 7) * Math.PI * 2 + Math.random() * 0.4, px = x, py = y;
    for (let k = 0; k < 4; k++) {
      const nx = px + Math.cos(a) * r / 4, ny = py + Math.sin(a) * r / 4 * 0.65;
      g.lineBetween(px, py, nx, ny);
      px = nx; py = ny; a += (Math.random() - 0.5) * 0.9;
    }
  }
  dodaj({ g, od: now, do: now + ms, tick: (t) => g.setAlpha(Math.min(1, (now + ms - t) / 4000)) });
}

/** Zaślepki z kodu: kula kwasu i kłąb dymu (do czasu rysunków grafika, zamówienie 15b). */
function zaslepki(scene: Phaser.Scene) {
  if (!scene.textures.exists('dragon-szary') && scene.textures.exists(TEX.dragon)) {
    // Szara kopia smoka-zaślepki (czerwony obrys wroga zostaje), do zabarwienia kolorem gatunku.
    const src = scene.textures.get(TEX.dragon);
    const img = src.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    const t = scene.textures.createCanvas('dragon-szary', img.width, img.height)!;
    const c = t.getContext();
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
      if (r > 150 && g < 90 && b < 90) continue; // obrys wroga
      const l = Math.min(255, Math.round((0.3 * r + 0.59 * g + 0.11 * b) * 1.35 + 30));
      d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
    }
    c.putImageData(d, 0, 0);
    for (const name of src.getFrameNames()) {
      const f = src.get(name);
      t.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
    }
    t.refresh();
    scene.anims.create({ key: 'dragon-flap-szary', frames: [{ key: 'dragon-szary', frame: 'f0' }, { key: 'dragon-szary', frame: 'f1' }], frameRate: 3, repeat: -1 });
  }
  if (!scene.textures.exists('smok-kwas')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x1e1a24, 1).fillCircle(4, 4, 4);
    g.fillStyle(0x8ac63a, 1).fillCircle(4, 4, 3);
    g.fillStyle(0xd8ff7a, 1).fillCircle(3, 3, 1.4);
    g.generateTexture('smok-kwas', 8, 8);
    g.destroy();
  }
  if (!scene.textures.exists('smok-dym')) {
    const n = 48;
    const t = scene.textures.createCanvas('smok-dym', n, n)!;
    const c = t.getContext();
    const grd = c.createRadialGradient(n / 2, n / 2, 2, n / 2, n / 2, n / 2);
    grd.addColorStop(0, 'rgba(150,120,170,0.9)');
    grd.addColorStop(0.6, 'rgba(120,100,140,0.6)');
    grd.addColorStop(1, 'rgba(110,90,130,0)');
    c.fillStyle = grd;
    c.fillRect(0, 0, n, n);
    t.refresh();
  }
}
