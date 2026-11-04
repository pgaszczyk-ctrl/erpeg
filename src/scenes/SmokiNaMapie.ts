import { PX_PER_M, type CityMap } from '../map/CityMap';
import { rng } from '../rng';
import Phaser from 'phaser';
import { SMOKI_NA_MAPIE as S, SMOKI_TESTOWE, LEGOWISKO as L, GATUNKI_SMOKOW, type GatunekId } from '../content/smoki';
import { GROUND_DEPTH } from '../map/MapRenderer';
import { TEST } from '../version';
import type { Slime } from '../objects/Slime';

// Smoki w terenie (właściciel 7.10.2026: „wg środowiska, rzadko”): w kratce 1 km z małą szansą, tylko poza centrum,
// w punkcie, którego teren pasuje do gatunku. Kratki i miejsca stałe (z id mapy i kratki); pokonany smok nie wraca
// do końca tej wizyty w grze. Smok pojawia się, gdy bohaterka jest w pobliżu, i znika, gdy odejdzie daleko.

const KRATKA_M = 1000;
/** Kłęby legowiska nad mgłą wojny (1 000 000) i dachami: widać je z daleka, także nad nieodkrytym terenem. */
const DYM_NAD_MGLA = 1_000_500;

interface Miejsce {
  key: string; x: number; y: number; g: GatunekId; s?: Slime;
  /** Dym nad legowiskiem (widać z daleka), czy już powiedziano, że to legowisko. */
  dym?: Phaser.GameObjects.Image[]; powiedziane?: boolean;
}

export interface SmokiHost {
  city: CityMap;
  /** Dom (nie bliżej niż odDomuM). */
  home: { x: number; y: number } | null;
  spawn: (x: number, y: number, g: GatunekId) => Slime;
  despawn: (s: Slime) => void;
  /** Smoki w terenie dopiero od poziomu 5 i po odblokowaniu w historii (Mag wysłał na smoka). */
  odblokowane: () => boolean;
  scene: Phaser.Scene;
  toast: (text: string, ms?: number) => void;
}

export class SmokiNaMapie {
  private kratki = new Map<string, Miejsce | null>();
  private pokonane = new Set<string>();
  private zywe = new Map<string, Miejsce>();
  private nastepne = 0;

  constructor(private host: SmokiHost) {}

  update(hx: number, hy: number) {
    const now = performance.now();
    if (now < this.nastepne) return;
    this.nastepne = now + 1000;
    if (TEST) this.testowe(hx, hy);
    this.legowiska(hx, hy);
    if (!this.host.odblokowane()) return;
    const K = KRATKA_M * PX_PER_M;
    const cx = Math.floor(hx / K), cy = Math.floor(hy / K);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
      const key = `${this.host.city.id}|${x},${y}`;
      if (!this.kratki.has(key)) {
        const box = { x0: x * K, y0: y * K, x1: (x + 1) * K, y1: (y + 1) * K };
        if (!this.host.city.ready(box)) continue;
        this.kratki.set(key, this.zaplanuj(key, box));
      }
      const m = this.kratki.get(key);
      if (!m || m.s || this.pokonane.has(key)) continue;
      if (Math.hypot(m.x - hx, m.y - hy) > S.odRuchu * PX_PER_M * 0.6) continue;
      m.s = this.host.spawn(m.x, m.y, m.g);
      this.zywe.set(key, m);
    }
    // Daleko od bohaterki i nie w walce: znika (wróci, gdy podejdzie).
    for (const [key, m] of this.zywe) {
      if (!m.s || !m.s.active) { this.zywe.delete(key); m.s = undefined; continue; }
      if (m.s.chasing) continue;
      if (Math.hypot(m.x - hx, m.y - hy) > S.odRuchu * PX_PER_M) {
        this.host.despawn(m.s);
        m.s = undefined;
        this.zywe.delete(key);
      }
    }
  }

  /** Serwer testowy: smoki w stałych miejscach (content/smoki.ts SMOKI_TESTOWE), bez poziomu i historii. */
  private testowe(hx: number, hy: number) {
    const c = this.host.city;
    for (const t of SMOKI_TESTOWE) {
      const key = `test|${t.miejsce}`;
      if (!this.kratki.has(key)) {
        const p = c.places.find((q) => q.id === t.miejsce);
        if (!p) continue;
        const at = c.freeNear(p.door.x + t.odM * PX_PER_M * 0.8, p.door.y + t.odM * PX_PER_M * 0.6);
        this.kratki.set(key, { key, x: at.x, y: at.y, g: t.gatunek });
      }
      const m = this.kratki.get(key)!;
      if (m.s || this.pokonane.has(key)) continue;
      if (Math.hypot(m.x - hx, m.y - hy) > S.odRuchu * PX_PER_M * 0.6) continue;
      m.s = this.host.spawn(m.x, m.y, m.g);
      this.zywe.set(key, m);
    }
  }

  /** Pokonany: nie wraca do końca tej wizyty (jego dym też znika). */
  pokonany(s: Slime) {
    for (const [key, m] of this.zywe) if (m.s === s) { this.pokonane.add(key); this.zywe.delete(key); m.s = undefined; this.zgasDym(m); }
  }

  /** Legowiska w pobliżu: dym z daleka, komunikat przy wejściu (raz na wizytę). */
  private legowiska(hx: number, hy: number) {
    const M = PX_PER_M;
    for (const [key, m] of this.kratki) {
      if (!m) continue;
      const d = Math.hypot(m.x - hx, m.y - hy);
      const zywy = !this.pokonane.has(key) && (key.startsWith('test|') || this.host.odblokowane());
      if (zywy && d < L.widacM * M) { if (!m.dym) this.rozpalDym(m); }
      else if (m.dym) this.zgasDym(m);
      if (zywy && !m.powiedziane && d < L.promienM * M * 1.2) {
        m.powiedziane = true;
        this.host.toast(`🐉 Legowisko: ${GATUNKI_SMOKOW[m.g].nazwa.toLowerCase()}! Uważaj.`, 3500);
      }
    }
  }

  private teksturyDymu() {
    const tex = this.host.scene.textures;
    if (tex.exists('smok-klab')) return;
    const n = 64;
    const c = tex.createCanvas('smok-klab', n, n)!;
    const ctx = c.getContext();
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = r >= 1 ? 0 : Math.round(255 * (1 - r * r) ** 1.6);
    }
    ctx.putImageData(img, 0, 0);
    c.refresh();
  }

  /** Kłęby dymu w kolorze gatunku wokół legowiska (część okopcona), lekka mgiełka w środku. */
  private rozpalDym(m: Miejsce) {
    this.teksturyDymu();
    const sc = this.host.scene, R = L.promienM * PX_PER_M, kolor = GATUNKI_SMOKOW[m.g].kolor;
    let h = 0;
    for (let i = 0; i < m.key.length; i++) h = (h * 31 + m.key.charCodeAt(i)) | 0;
    const r = rng((h >>> 0) ^ 0x51ab);
    const d = GROUND_DEPTH + 1.5;
    const dym: Phaser.GameObjects.Image[] = [sc.add.image(m.x, m.y, 'smok-klab').setDisplaySize(R * 2.2, R * 2.2).setTint(kolor).setAlpha(L.wnetrzeAlfa).setDepth(d)];
    const n = Math.max(14, Math.round((Math.PI * 2 * R) / L.klebyCoPx));
    for (let i = 0; i < n; i++) {
      const a = ((i + r() * 0.8) / n) * Math.PI * 2, rr = R + (r() * 2 - 1) * L.rozrzut;
      const size = L.klebyPx[0] + r() * (L.klebyPx[1] - L.klebyPx[0]);
      const alfa = L.klebyAlfa[0] + r() * (L.klebyAlfa[1] - L.klebyAlfa[0]);
      const p = sc.add.image(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, 'smok-klab')
        .setDisplaySize(size, size * (0.75 + r() * 0.3)).setTint(r() < 0.35 ? L.sadza : kolor).setAlpha(alfa).setDepth(DYM_NAD_MGLA);
      p.setData('a', alfa).setData('s', p.scaleX).setData('f', r() * Math.PI * 2).setData('t', 3 + r() * 3).setData('u', r() * 6);
      dym.push(p);
    }
    m.dym = dym;
  }

  private zgasDym(m: Miejsce) {
    for (const o of m.dym ?? []) o.destroy();
    m.dym = undefined;
  }

  /** Co klatkę: kłęby w widoku powoli oddychają i unoszą się; poza ekranem są ukryte. */
  dym(now: number) {
    const v = this.host.scene.cameras.main.worldView, t = now / 1000;
    for (const m of this.kratki.values()) {
      if (!m?.dym) continue;
      for (const p of m.dym) {
        const on = p.x > v.x - 60 && p.x < v.right + 60 && p.y > v.y - 60 && p.y < v.bottom + 60;
        p.setVisible(on);
        if (!on || p.getData('a') === undefined) continue;
        const w = Math.sin((t * Math.PI * 2) / (p.getData('t') as number) + (p.getData('f') as number));
        p.setAlpha((p.getData('a') as number) * (0.75 + 0.25 * w));
        const s = (p.getData('s') as number) * (1 + 0.1 * w);
        p.setScale(s, s * (p.scaleY / p.scaleX));
      }
    }
  }

  private zaplanuj(key: string, box: { x0: number; y0: number; x1: number; y1: number }): Miejsce | null {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const r = rng(h >>> 0);
    if (r() >= S.szansa) return null;
    const c = this.host.city;
    // Poza centrum: mało miejsc (sklepów, szkół…) w kratce.
    const miejsca = c.places.filter((p) => p.door.x >= box.x0 && p.door.x < box.x1 && p.door.y >= box.y0 && p.door.y < box.y1);
    if (miejsca.length > S.maksMiejsc) return null;
    const M = PX_PER_M;
    for (let i = 0; i < S.prob; i++) {
      const x = box.x0 + r() * (box.x1 - box.x0), y = box.y0 + r() * (box.y1 - box.y0);
      if (c.isBlocked(x, y)) continue;
      const home = this.host.home;
      if (home && Math.hypot(home.x - x, home.y - y) < S.odDomuM * M) continue;
      if (miejsca.some((p) => Math.hypot(p.door.x - x, p.door.y - y) < S.odMiejscM * M)) continue;
      const g = this.gatunekW(x, y, r);
      if (g) return { key, x, y, g };
    }
    return null;
  }

  /** Teren → gatunek (tabela 2 zadania): góry, las/park, woda/bagno, cmentarz, tory (teren kolejowy, przemysł). */
  private gatunekW(x: number, y: number, r: () => number): GatunekId | null {
    const c = this.host.city, M = PX_PER_M;
    if (c.terrain && c.terrain.heightAt(x, y) > 700) return 'gorski';
    const kinds = c.areaKindsAt(x, y);
    if (kinds.includes('cemetery')) return 'trujacy';
    if (kinds.includes('wetland')) return r() < 0.5 ? 'kwasowy' : 'trujacy';
    if (c.nearWater(x, y, 30 * M)) return r() < 0.6 ? 'kwasowy' : 'trujacy';
    if (kinds.includes('forest') || kinds.includes('park') || kinds.includes('scrub')) return 'lesny';
    const tory = c.query({ x0: x - 60 * M, y0: y - 60 * M, x1: x + 60 * M, y1: y + 60 * M }).lines.some((l) => l.kind === 'rail');
    if (tory || kinds.includes('sand')) return 'ognisty';
    return null;
  }
}
