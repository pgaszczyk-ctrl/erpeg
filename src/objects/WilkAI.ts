// ============================================================================
//  WILK AI — test pilota „walka i gęste łowiska” (brief właściciela, 25.10.2026).
//  Czytelny cykl: patrol (stoi, czeka na wzrok) → podejście → zapowiedź (czas na
//  reakcję, kierunek zablokowany) → doskok (jeden możliwy cios) → odpoczynek →
//  znowu podejście albo powrót na terytorium. Zawsze w czasie rzeczywistym –
//  nigdy nie wchodzi w system turowy (scenes/GameScene.ts woła to tylko dla
//  wilka/warga, osobno od walki turowej i smoków).
//
//  Ruch: WilkAI tylko ustawia `slime.vel` – ścianami i zderzeniami zajmuje się
//  już istniejący GameScene.moveActor (ten sam co dla każdego innego wroga),
//  więc doskok automatycznie respektuje kolizje. Jeden cios na jeden doskok
//  (`trafil`), licznik równoczesnych atakujących – przez `host.rezerwuj/zwolnij`.
// ============================================================================

import Phaser from 'phaser';
import type { Slime } from './Slime';
import { PX_PER_M } from '../map/CityMap';
import { LOWISKA, type WilkParam } from '../content/lowiska';

export interface WilkHost {
  scene: Phaser.Scene;
  player: { x: number; y: number };
  /** Obrażenia (połówki serca) na bohatera, gdy doskok trafi. */
  hurt: (from: Phaser.Math.Vector2, obrazenie: number) => void;
  /** Wspólny limit równoczesnych sekwencji ataku: true = zarezerwowano, false = limit zajęty (wilk czeka). */
  rezerwuj: () => boolean;
  zwolnij: () => void;
}

type Stan = 'patrol' | 'podejscie' | 'czeka' | 'zapowiedz' | 'atak' | 'odpoczynek' | 'powrot';

export class WilkAI {
  private stan: Stan = 'patrol';
  private until = 0;
  private cel = new Phaser.Math.Vector2();
  private trafil = false;
  private zarezerwowane = false;
  private gfx: Phaser.GameObjects.Graphics;
  private readonly P: WilkParam;
  // Wszystko przeliczone raz na piksele świata (stałe w content/lowiska.ts są w metrach/m-s).
  private readonly sightPx: number;
  private readonly losePx: number;
  private readonly doskokZasiegPx: number;
  private readonly trafieniePx: number;
  private readonly podejsciePxS: number;
  private readonly doskokPxS: number;

  constructor(
    private h: WilkHost,
    private s: Slime,
    /** Środek i promień terytorium watahy (px świata) – za tą granicą wilk przerywa i wraca. */
    private home: { x: number; y: number; r: number },
    warg: boolean,
  ) {
    this.P = warg ? LOWISKA.warg : LOWISKA.wilk;
    this.sightPx = this.P.sightRange * PX_PER_M;
    this.losePx = this.P.loseRange * PX_PER_M;
    this.doskokZasiegPx = this.P.doskokZasiegM * PX_PER_M;
    this.trafieniePx = this.P.trafienieZasiegM * PX_PER_M;
    this.podejsciePxS = this.P.predkoscPodejscia * PX_PER_M;
    this.doskokPxS = this.P.predkoscDoskoku * PX_PER_M;
    this.gfx = h.scene.add.graphics().setDepth(1_000_000);
  }

  destroy() {
    this.gfx.destroy();
    this.zwolnijRezerwacje();
  }

  private zwolnijRezerwacje() {
    if (!this.zarezerwowane) return;
    this.zarezerwowane = false;
    this.h.zwolnij();
  }

  update(now: number) {
    const s = this.s, p = this.h.player;
    const dist = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
    const odDomu = Phaser.Math.Distance.Between(s.x, s.y, this.home.x, this.home.y);

    // Zbyt daleko za granicą terytorium (gonitwa albo doskok wyniosły za daleko): przerwij i wróć.
    if (this.stan !== 'patrol' && this.stan !== 'powrot' && odDomu > this.home.r * 1.3) {
      this.zwolnijRezerwacje();
      this.gfx.clear();
      this.stan = 'powrot';
      return;
    }

    switch (this.stan) {
      case 'patrol':
        s.vel.set(0, 0);
        if (dist < this.sightPx) this.stan = 'podejscie';
        return;

      case 'powrot': {
        if (odDomu < 8 * PX_PER_M) {
          s.vel.set(0, 0);
          this.stan = 'patrol';
          return;
        }
        const d = new Phaser.Math.Vector2(this.home.x - s.x, this.home.y - s.y).normalize();
        s.vel.set(d.x * this.podejsciePxS, d.y * this.podejsciePxS);
        return;
      }

      case 'podejscie':
        if (dist > this.losePx) {
          s.vel.set(0, 0);
          this.stan = 'patrol';
          return;
        }
        if (dist <= this.doskokZasiegPx) {
          this.probujZapowiedz(now, dist);
          return;
        }
        {
          const d = new Phaser.Math.Vector2(p.x - s.x, p.y - s.y).normalize();
          s.vel.set(d.x * this.podejsciePxS, d.y * this.podejsciePxS);
        }
        return;

      case 'czeka':
        // Limit atakujących zajęty: krąży w miejscu widząc bohatera, próbuje co klatkę.
        s.vel.set(0, 0);
        if (dist > this.losePx) {
          this.stan = 'patrol';
          return;
        }
        if (dist > this.doskokZasiegPx) {
          this.stan = 'podejscie';
          return;
        }
        this.probujZapowiedz(now, dist);
        return;

      case 'zapowiedz':
        s.vel.set(0, 0);
        this.rysujZapowiedz(now);
        if (now >= this.until) {
          this.gfx.clear();
          this.stan = 'atak';
          this.until = now + this.P.doskokMs;
          this.trafil = false;
          const d = new Phaser.Math.Vector2(this.cel.x - s.x, this.cel.y - s.y).normalize();
          s.vel.set(d.x * this.doskokPxS, d.y * this.doskokPxS);
        }
        return;

      case 'atak':
        // Jeden cios na jeden doskok: trafia najwyżej raz, nawet przy niskim FPS.
        if (!this.trafil && dist <= this.trafieniePx + s.size) {
          this.trafil = true;
          this.h.hurt(new Phaser.Math.Vector2(s.x, s.y), this.P.obrazenie);
        }
        if (now >= this.until) {
          s.vel.set(0, 0);
          this.zwolnijRezerwacje();
          this.stan = 'odpoczynek';
          this.until = now + this.P.odpoczynekMs;
        }
        return;

      case 'odpoczynek':
        s.vel.set(0, 0);
        if (now >= this.until) this.stan = dist < this.losePx ? 'podejscie' : 'patrol';
        return;
    }
  }

  /** Spróbuj zająć wspólny limit atakujących; po sukcesie zablokuj kierunek na obecnej pozycji bohatera. */
  private probujZapowiedz(now: number, _dist: number) {
    const s = this.s, p = this.h.player;
    s.vel.set(0, 0);
    if (!this.h.rezerwuj()) {
      this.stan = 'czeka';
      return;
    }
    this.zarezerwowane = true;
    this.stan = 'zapowiedz';
    this.until = now + this.P.zapowiedzMs;
    this.cel.set(p.x, p.y);
  }

  /** Czytelna zapowiedź: pulsujący czerwony klin od wilka w stronę zablokowanego celu. */
  private rysujZapowiedz(now: number) {
    const s = this.s;
    const g = this.gfx;
    g.clear();
    const a = Math.atan2(this.cel.y - s.y, this.cel.x - s.x);
    const dl = this.doskokZasiegPx + this.trafieniePx;
    const puls = 0.55 + 0.35 * Math.sin(now / 90);
    const szer = 0.3;
    g.fillStyle(0xff3b1f, 0.18 + 0.16 * puls);
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.lineTo(s.x + Math.cos(a - szer) * dl, s.y + Math.sin(a - szer) * dl);
    g.lineTo(s.x + Math.cos(a + szer) * dl, s.y + Math.sin(a + szer) * dl);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0xff3b1f, 0.5 + 0.3 * puls);
    g.strokePath();
  }
}
