// A live (real-time) fight on the Arena Cechu (owner, 3 Nov 2026: „na arenie walki nie powinny być turowe, tylko
// normalne”). The hero moves and strikes like on the street (joystick/keys, tap = attack, hold = strong, a bow/wand
// shoots); the rival – another player's ghost or the Mechanical Gladiator – walks up, shows a red warning and strikes,
// or keeps its distance and shoots. Same numbers both ways as before: life and blows in weapon units
// (ARENA.jednostka of them to a half-heart), hit chance, block and armour from the ghost's snapshot.

import Phaser from 'phaser';
import type { Player } from '../objects/Player';
import { PLAYER } from '../objects/Player';
import type { Slime } from '../objects/Slime';
import { ARENA, ARENA_ZYWA as Z } from '../content/arena';
import { W } from '../walka/tryb';
import { WALKA } from '../content/walka';
import { poPancerzu } from '../content/pancerz';
import { OSTROSC } from '../screen';
import { TEX } from '../art';
import {
  keyboardDir, touchInput, consumeAttack, consumeStrong, consumeRelease, consumeHeal, consumeInteraction,
  attackAim, mouse,
} from '../controls';
import {
  ammoOf, cooldown, defense, gearAimBonus, hitChance, meleeDamage, rangedWeapon, shotDamage, strongFactor, takeAmmo,
} from '../inventory';
import { ustawRurki } from '../ui/hudTeleskop';
import type { DuchAreny } from '../api';

const CZERWONY = 0xff3b1f;
const HERO_R = 0.3 * W;

export interface ArenaWalkaHost {
  scene: Phaser.Scene;
  player: Player;
  rywal: Slime;
  dane: DuchAreny;
  /** Inside the sand floor (feet). */
  wolne(x: number, y: number): boolean;
  napis(x: number, y: number, t: string, kolor: string, ms?: number): void;
  zamach(aim: number): void;
  cwiczenie(skill: 'miecz' | 'luk' | 'magia', pkt: number): void;
  koniec(wygrana: boolean): void;
}

type Pocisk = { x: number; y: number; vx: number; vy: number; zostalo: number; obraz: Phaser.GameObjects.Image; dmg: number; magia: boolean; odBohatera: boolean };

export class ArenaWalka {
  private stan: 'idzie' | 'zapowiedz' | 'odpoczynek' = 'idzie';
  private until = 0;
  private kat = 0;
  private mocnyDucha = false;
  private leczenieBohatera = true;
  private leczenieDucha = true;
  private carry = 0;
  private hp0: number;
  private skonczona = false;
  private mocnyAt = -Infinity;
  private lastShot = -Infinity;
  private krazy = Math.random() < 0.5 ? 1 : -1;
  private pociski: Pocisk[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  private paski: Phaser.GameObjects.Graphics;
  private poddaj: HTMLButtonElement;
  private klawisz = (e: KeyboardEvent) => { if (e.key === 'Escape') this.poddajSie(); };

  constructor(private h: ArenaWalkaHost) {
    const sc = h.scene;
    this.hp0 = h.rywal.hp;
    const p = h.player;
    const r = rangedWeapon();
    p.attackCooldown = cooldown(r ? (r.rodzaj === 'magia' ? 'magia' : 'luk') : 'miecz');
    this.gfx = sc.add.graphics().setDepth(1_000_000);
    this.paski = sc.add.graphics().setDepth(1_150_000);
    this.until = sc.time.now + Z.startMs;
    this.stan = 'odpoczynek';
    // Giving up = a loss (as the old „Uciekaj” in the turn fight).
    const b = document.createElement('button');
    b.id = 'arena-poddaj';
    b.className = 'm-btn';
    b.textContent = '🏳 Poddaj walkę';
    Object.assign(b.style, { position: 'fixed', bottom: 'calc(14px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: '30', fontSize: '14px', padding: '6px 12px' });
    b.addEventListener('click', () => this.poddajSie());
    document.body.append(b);
    this.poddaj = b;
    window.addEventListener('keydown', this.klawisz);
    this.zycieBohatera();
  }

  destroy() {
    this.skonczona = true;
    this.gfx.destroy();
    this.paski.destroy();
    for (const q of this.pociski) q.obraz.destroy();
    this.pociski = [];
    this.poddaj.remove();
    window.removeEventListener('keydown', this.klawisz);
  }

  private poddajSie() {
    if (this.skonczona) return;
    if (this.poddaj.dataset.pewny !== '1') {
      this.poddaj.dataset.pewny = '1';
      this.poddaj.textContent = '🏳 Na pewno? (przegrana)';
      setTimeout(() => { if (!this.skonczona) { this.poddaj.dataset.pewny = ''; this.poddaj.textContent = '🏳 Poddaj walkę'; } }, 3000);
      return;
    }
    this.zakoncz(false);
  }

  private zakoncz(wygrana: boolean) {
    if (this.skonczona) return;
    this.skonczona = true;
    this.h.player.vel.set(0, 0);
    this.h.player.move(0, 0, this.h.scene.time.now);
    this.gfx.clear();
    this.h.koniec(wygrana);
  }

  /** Every frame (ArenaScene.update). */
  update(now: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const p = this.h.player, e = this.h.rywal;
    this.lot(dt, now);
    this.rysujPaski();
    if (this.skonczona) {
      consumeAttack(); consumeStrong(); consumeRelease(); consumeHeal(); consumeInteraction();
      return;
    }
    // The hero: walks like on the street.
    const kd = keyboardDir();
    const klaw = kd.x !== 0 || kd.y !== 0;
    p.move(klaw ? kd.x : touchInput.x, klaw ? kd.y : touchInput.y, now);
    this.przesun(p, p.vel.x * dt, p.vel.y * dt, HERO_R);
    if (consumeHeal()) this.leczSie();
    consumeInteraction();
    this.bohaterAtakuje(now);
    // The rival.
    if (e.active && !e.isDead) {
      this.duch(now);
      this.przesun(e, e.vel.x * dt, e.vel.y * dt, e.size);
      e.updateLook();
      e.setDepth(e.y + 200_000);
    }
  }

  /** Moves a figure inside the floor, sliding along the edge. */
  private przesun(o: Phaser.GameObjects.Sprite, dx: number, dy: number, _r: number) {
    if (!dx && !dy) return;
    const w = this.h.wolne;
    if (w(o.x + dx, o.y + dy)) o.setPosition(o.x + dx, o.y + dy);
    else if (dx && w(o.x + dx, o.y)) o.setX(o.x + dx);
    else if (dy && w(o.x, o.y + dy)) o.setY(o.y + dy);
  }

  // ------------------------------------------------------------------ the hero

  private bron() {
    return rangedWeapon();
  }

  private bohaterAtakuje(now: number) {
    const p = this.h.player, e = this.h.rywal;
    const bron = this.bron();
    const atak = consumeAttack();
    if (atak) {
      if (attackAim) {
        const w = this.naSwiat(attackAim.x, attackAim.y);
        p.face(w.x - p.x, w.y - (p.y + 2));
      } else this.patrzNaRywala(1.6);
      if (bron) this.strzal(now, bron, false, this.kierunekStrzalu());
      else this.cios(now, false);
    }
    // Holding the stick (or the mouse/space) a second = a strong attack; dragging a bow/wand aims.
    const r = consumeRelease();
    const mocnyGuzik = consumeStrong();
    if (r || mocnyGuzik) {
      const mocny = mocnyGuzik || (!!r && r.held >= WALKA.mocnyPoMs);
      if (bron) {
        if (r && (r.dragged || r.held >= 250)) {
          const k = this.kierunek(r.mode, r.dx, r.dy);
          p.face(k.x, k.y);
          this.strzal(now, bron, mocny && this.mocnyGotowy(now), k);
        } else if (mocnyGuzik) this.strzal(now, bron, this.mocnyGotowy(now), this.kierunekStrzalu());
      } else if (mocny && this.mocnyGotowy(now)) {
        this.patrzNaRywala(WALKA.zasiegMiecz * 1.6);
        this.cios(now, true);
      } else if (r && r.dragged && r.mode === 'touch') {
        const k = this.kierunek(r.mode, r.dx, r.dy);
        p.face(k.x, k.y);
        this.cios(now, false);
      }
    }
    void e;
  }

  private mocnyGotowy(now: number) {
    if (now - this.mocnyAt < Z.mocnyCoMs) return false;
    this.mocnyAt = now;
    return true;
  }

  private naSwiat(sx: number, sy: number) {
    const cam = this.h.scene.cameras.main;
    return { x: (sx * OSTROSC) / cam.zoomX + cam.worldView.x, y: (sy * OSTROSC) / cam.zoomY + cam.worldView.y };
  }

  private kierunek(mode: string, dx: number, dy: number) {
    const p = this.h.player;
    if (mode === 'mouse') {
      const w = this.naSwiat(mouse.x, mouse.y);
      const v = new Phaser.Math.Vector2(w.x - p.x, w.y - p.y);
      if (v.lengthSq() > 1) return v.normalize();
    }
    const v = new Phaser.Math.Vector2(dx, dy);
    return v.lengthSq() > 1 ? v.normalize() : p.facing.clone().normalize();
  }

  /** Turns the hero to the rival when it's near (like faceFoe on the street). */
  private patrzNaRywala(razy: number) {
    const p = this.h.player, e = this.h.rywal;
    if (!e.active || e.isDead) return;
    if (Math.hypot(e.x - p.x, e.y - p.y) <= (PLAYER.attackReach + PLAYER.attackRadius) * razy + e.size) p.face(e.x - p.x, e.y - p.y);
  }

  /** The way a shot goes: towards the rival when it is within the aim-assist angle of where the hero looks. */
  private kierunekStrzalu() {
    const p = this.h.player, e = this.h.rywal;
    const f = p.facing.clone().normalize();
    if (e.active && !e.isDead) {
      const v = new Phaser.Math.Vector2(e.x - p.x, e.y - p.y).normalize();
      if (Math.acos(Phaser.Math.Clamp(f.dot(v), -1, 1)) <= (WALKA.celowanieStopnie * Math.PI) / 180 * 2) return v;
    }
    return f;
  }

  private cios(now: number, mocny: boolean) {
    const p = this.h.player, e = this.h.rywal;
    if (!mocny && !p.tryAttack(now)) return;
    const aim = Math.atan2(p.facing.y, p.facing.x);
    this.h.zamach(aim);
    if (!e.active || e.isDead) return;
    const zasieg = (PLAYER.attackReach + PLAYER.attackRadius) * (mocny ? WALKA.zasiegMiecz : 1) + e.size;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    const kat = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - p.y, e.x - p.x) - aim));
    if (d > zasieg || (d > e.size + HERO_R + 2 && kat > Z.katCiosu)) return;
    this.h.cwiczenie('miecz', 1);
    if (Math.random() >= hitChance('miecz', mocny, gearAimBonus())) return this.h.napis(e.x, e.y - 14, 'pudło!', '#e8e4f0', 650);
    const dmg = meleeDamage(Math.random) * (mocny ? strongFactor('miecz') : 1);
    this.trafRywala(dmg, mocny, false, now);
  }

  private strzal(now: number, bron: NonNullable<ReturnType<typeof rangedWeapon>>, mocny: boolean, k: Phaser.Math.Vector2) {
    const p = this.h.player;
    const skill = bron.rodzaj === 'magia' ? 'magia' : 'luk';
    if (now - this.lastShot < cooldown(skill)) return;
    const ammo = ammoOf(bron);
    if (ammo && !takeAmmo(ammo)) return this.h.napis(p.x, p.y - 20, 'brak amunicji', '#ffd0c0', 900);
    this.lastShot = now;
    const v = Z.pociskPx;
    const obraz = this.h.scene.add.image(p.x, p.y - 4, skill === 'magia' ? TEX.magicShot : TEX.arrowShot)
      .setRotation(Math.atan2(k.y, k.x)).setDepth(1_100_000);
    if (mocny) obraz.setScale(1.5).setTint(0xffd84a);
    this.h.cwiczenie(skill, 1);
    const trafi = Math.random() < hitChance(skill, mocny, gearAimBonus());
    const dmg = trafi ? shotDamage(bron, Math.random) * (mocny ? strongFactor(skill) : 1) : 0;
    this.pociski.push({ x: p.x, y: p.y - 4, vx: k.x * v, vy: k.y * v, zostalo: Z.zasiegStrzaluW * W, obraz, dmg, magia: skill === 'magia', odBohatera: true });
  }

  private trafRywala(dmg: number, mocny: boolean, magia: boolean, now: number) {
    const e = this.h.rywal, p = this.h.player, d = this.h.dane;
    if (!mocny && Math.random() < d.blok) return this.h.napis(e.x, e.y - 18, '🛡 Blok', '#cfe6ff', 800);
    if (d.pancerz) dmg = poPancerzu(dmg, d.pancerz, !magia);
    const zabity = e.hit(new Phaser.Math.Vector2(p.x, p.y), now, dmg);
    this.h.napis(e.x, e.y - 22, `−${Math.round(dmg * 10) / 10}`, '#ffe3a0', 800);
    // A hit breaks its warning (like a stagger), unless it was a strong one of its own.
    if (this.stan === 'zapowiedz' && !this.mocnyDucha && mocny) this.przerwa(now, Z.odpoczynekMs);
    if (zabity) {
      this.h.scene.time.delayedCall(700, () => this.zakoncz(true));
      this.skonczonaZaChwile();
    }
  }

  private skonczonaZaChwile() {
    this.gfx.clear();
    this.stan = 'odpoczynek';
    this.until = Infinity;
  }

  private leczSie() {
    const p = this.h.player;
    if (!this.leczenieBohatera) return this.h.napis(p.x, p.y - 22, 'leczenie zużyte', '#ffd0c0', 900);
    if (p.hp >= PLAYER.maxHp) return;
    this.leczenieBohatera = false;
    p.heal(Math.ceil(PLAYER.maxHp * ARENA.leczenie));
    this.h.napis(p.x, p.y - 22, '✚', '#9dff9a', 900);
    this.zycieBohatera();
  }

  private zycieBohatera() {
    ustawRurki({ hp: this.h.player.hp, hpMax: PLAYER.maxHp, extra: 0, zatruty: false });
  }

  /** Half-hearts to the hero (fractions carried over); a loss when it runs out. */
  private ranBohatera(bron: number, fizyczne: boolean) {
    const p = this.h.player;
    const pending = this.carry + poPancerzu(bron / ARENA.jednostka, defense(), fizyczne);
    const dmg = Math.floor(pending);
    this.carry = pending - dmg;
    if (dmg <= 0) return this.h.napis(p.x, p.y - 20, 'draśnięcie', '#ffd0c0', 700);
    this.h.scene.cameras.main.shake(110, 0.003);
    p.setTint(0xff6a6a);
    this.h.scene.time.delayedCall(140, () => p.clearTint());
    p.drain(dmg);
    this.h.napis(p.x, p.y - 22, `−${dmg % 2 ? (dmg / 2).toFixed(1) : dmg / 2} ♥`, '#ff8a8a', 900);
    this.zycieBohatera();
    if (p.hp <= 0) {
      this.skonczonaZaChwile();
      this.h.scene.time.delayedCall(500, () => this.zakoncz(false));
    }
  }

  // ------------------------------------------------------------------ the rival

  private get zasiegDucha() {
    return this.h.rywal.size + HERO_R + Z.zasiegCiosuW * W;
  }

  private duch(now: number) {
    const e = this.h.rywal, p = this.h.player, d = this.h.dane;
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    if (e.ogluszony(now)) return; // knocked back by a blow: its vel is the push
    // Heals once when low.
    if (this.leczenieDucha && e.hp < this.hp0 * ARENA.duchLeczyPonizej && this.stan !== 'zapowiedz') {
      this.leczenieDucha = false;
      e.hp = Math.min(this.hp0, e.hp + this.hp0 * ARENA.leczenie);
      this.h.napis(e.x, e.y - 22, '✚ leczy się', '#9dff9a', 900);
      return this.przerwa(now, Z.odpoczynekMs);
    }
    switch (this.stan) {
      case 'idzie': {
        if (d.strzal) {
          if (dist > Z.strzelaZW * W) return this.idz(p.x, p.y, 1);
          if (dist < Z.trzymaW * W) return this.idz(e.x * 2 - p.x, e.y * 2 - p.y, 0.8);
          return this.zapowiedz(now);
        }
        if (dist > this.zasiegDucha * 0.9) return this.idz(p.x, p.y, 1);
        return this.zapowiedz(now);
      }
      case 'zapowiedz':
        e.vel.set(0, 0);
        this.rysujZapowiedz(now);
        if (now >= this.until) this.uderz(now);
        return;
      case 'odpoczynek': {
        this.gfx.clear();
        // Circles round the hero a little while catching its breath.
        if (dist < this.zasiegDucha * 2.2 && dist > 1) {
          const a = Math.atan2(e.y - p.y, e.x - p.x) + this.krazy * 0.6;
          const t = { x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist };
          this.idz(t.x, t.y, 0.45);
        } else e.vel.set(0, 0);
        if (now >= this.until) this.stan = 'idzie';
        return;
      }
    }
  }

  private idz(x: number, y: number, ile: number) {
    const e = this.h.rywal;
    const v = new Phaser.Math.Vector2(x - e.x, y - e.y);
    if (v.lengthSq() < 1) return void e.vel.set(0, 0);
    v.normalize().scale(PLAYER.speed * Z.predkosc * ile);
    e.vel.set(v.x, v.y);
  }

  private zapowiedz(now: number) {
    const e = this.h.rywal, p = this.h.player, d = this.h.dane;
    this.stan = 'zapowiedz';
    this.kat = Math.atan2(p.y - e.y, p.x - e.x);
    this.mocnyDucha = !d.strzal && Math.random() < ARENA.duchMocny;
    this.until = now + (this.mocnyDucha ? Z.zapowiedzMocnyMs : d.strzal ? Z.zapowiedzStrzalMs : Z.zapowiedzMs);
    if (this.mocnyDucha) this.h.napis(e.x, e.y - 24, 'Mocny atak!', '#ffd34a', 700);
    e.vel.set(0, 0);
    e.updateLook();
  }

  private rysujZapowiedz(now: number) {
    const e = this.h.rywal, g = this.gfx, a = this.kat, d = this.h.dane;
    const puls = 0.55 + 0.35 * Math.sin(now / 70);
    g.clear();
    if (d.strzal) {
      const dl = Z.zasiegStrzaluW * W;
      g.lineStyle(5, CZERWONY, 0.1 + 0.12 * puls);
      g.lineBetween(e.x, e.y - 6, e.x + Math.cos(a) * dl, e.y - 6 + Math.sin(a) * dl);
      return;
    }
    const dl = this.zasiegDucha, pol = Z.katCiosu;
    const kolor = this.mocnyDucha ? 0xffb020 : CZERWONY;
    g.fillStyle(kolor, 0.14 + 0.16 * puls);
    g.beginPath();
    g.moveTo(e.x, e.y);
    g.arc(e.x, e.y, dl, a - pol, a + pol, false);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, kolor, 0.6 + 0.3 * puls);
    g.strokePath();
  }

  private uderz(now: number) {
    const e = this.h.rywal, p = this.h.player, d = this.h.dane;
    this.gfx.clear();
    if (d.strzal) {
      const v = Z.pociskDuchaPx;
      const trafi = Math.random() < d.trafienie;
      const obraz = this.h.scene.add.image(e.x, e.y - 6, d.magicznyAtak ? TEX.magicShot : TEX.arrowShot)
        .setRotation(this.kat).setDepth(1_100_000).setTint(0xff9a8a);
      this.pociski.push({ x: e.x, y: e.y - 6, vx: Math.cos(this.kat) * v, vy: Math.sin(this.kat) * v, zostalo: Z.zasiegStrzaluW * W, obraz, dmg: trafi ? d.strzal! : 0, magia: !!d.magicznyAtak, odBohatera: false });
      return this.przerwa(now, Z.odstepStrzalMs);
    }
    // The blow lands on whatever stands in the warned area now.
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    const kat = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(p.y - e.y, p.x - e.x) - this.kat));
    this.blysk();
    if (dist <= this.zasiegDucha + 2 && (dist < e.size + HERO_R + 2 || kat <= Z.katCiosu + 0.12)) {
      if (!this.mocnyDucha && Math.random() >= d.trafienie) this.h.napis(p.x, p.y - 20, 'pudło!', '#e8e4f0', 650);
      else this.ranBohatera(d.atak * (this.mocnyDucha ? d.mocny : 1), !d.magicznyAtak);
    }
    this.przerwa(now, this.mocnyDucha ? Z.odpoczynekMs * 1.5 : Z.odpoczynekMs);
  }

  private przerwa(now: number, ms: number) {
    this.stan = 'odpoczynek';
    this.until = now + ms;
    this.gfx.clear();
  }

  private blysk() {
    const e = this.h.rywal;
    const sw = this.h.scene.add.graphics().setDepth(e.depth + 1);
    sw.lineStyle(2, this.mocnyDucha ? 0xffd34a : 0xffe6b0, 0.9);
    sw.beginPath();
    sw.arc(e.x, e.y - 2, this.zasiegDucha * 0.8, this.kat - Z.katCiosu, this.kat + Z.katCiosu);
    sw.strokePath();
    this.h.scene.tweens.add({ targets: sw, alpha: 0, duration: 180, onComplete: () => sw.destroy() });
  }

  // ------------------------------------------------------------------ shots and bars

  private lot(dt: number, now: number) {
    const p = this.h.player, e = this.h.rywal;
    this.pociski = this.pociski.filter((q) => {
      const krok = Math.hypot(q.vx, q.vy) * dt;
      const n = Math.max(1, Math.ceil(krok / 3));
      for (let i = 0; i < n; i++) {
        q.x += (q.vx * dt) / n;
        q.y += (q.vy * dt) / n;
        if (q.odBohatera) {
          if (e.active && !e.isDead && Math.hypot(q.x - e.x, q.y - (e.y - 4)) <= e.size + 2) {
            if (q.dmg > 0 && !this.skonczona) this.trafRywala(q.dmg, false, q.magia, now);
            else this.h.napis(e.x, e.y - 14, 'pudło!', '#e8e4f0', 650);
            q.obraz.destroy();
            return false;
          }
        } else if (Math.hypot(q.x - p.x, q.y - (p.y - 4)) <= HERO_R + 2) {
          if (this.skonczona) { /* over */ } else if (q.dmg > 0) this.ranBohatera(q.dmg, !q.magia);
          else this.h.napis(p.x, p.y - 20, 'pudło!', '#e8e4f0', 650);
          q.obraz.destroy();
          return false;
        }
      }
      q.zostalo -= krok;
      if (q.zostalo <= 0 || !this.h.wolne(q.x, q.y + 4)) {
        q.obraz.destroy();
        return false;
      }
      q.obraz.setPosition(q.x, q.y);
      return true;
    });
  }

  /** The rival's life over its head (the hero's is in the HUD's tube and over him too). */
  private rysujPaski() {
    const g = this.paski, e = this.h.rywal, p = this.h.player;
    g.clear();
    const pasek = (x: number, y: number, f: number, kolor: number) => {
      const w = 22;
      g.fillStyle(0x1e1a24, 1).fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
      g.fillStyle(0x4a3a3a, 1).fillRect(x - w / 2, y, w, 2);
      g.fillStyle(kolor, 1).fillRect(x - w / 2, y, Math.max(0, w * Phaser.Math.Clamp(f, 0, 1)), 2);
    };
    if (e.active && !e.isDead) pasek(e.x, e.y - 24, e.hp / this.hp0, 0xe05a3a);
    pasek(p.x, p.y - 24, p.hp / PLAYER.maxHp, 0x6fd06a);
  }
}
