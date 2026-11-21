// Drogowskazy niebezpieczeństwa (właściciel, 21.11.2026; dane w content/drogowskazy.ts): przy najważniejszym dużym
// skrzyżowaniu (albo rondzie) każdego kilometra kwadratowego miasta stoi drewniany znak z niedbale namalowanym stworem
// i strzałką do najbliższego średniego lub większego siedliska potworów. Bez nowych danych mapy: skrzyżowania z linii
// dróg, cel z tych samych stałych planów siedlisk co w Lowiska (dalsze komórki planowane na żądanie, gdy ich kafle
// się wczytają). Znaki bez celu w zasięgu nie stają wcale.
import Phaser from 'phaser';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import type { Lowiska } from '../scenes/Lowiska';
import type { Siedlisko } from '../siedliska/typy';
import { DROGOWSKAZY as D, STWORY_ZNAKU, STWOR_DOMYSLNY, NAZWA_SIEDLISKA, RYSUNKI_ZNAKU, type RysunekZnaku } from '../content/drogowskazy';
import { wolneMiejsce } from '../tablice/swiatowe';
import { tx } from '../i18n';
import type { RodzajWroga } from '../content/fabula';

export interface Drogowskaz {
  id: string;
  /** Skrzyżowanie i miejsce znaku (px mapy). */
  kx: number; ky: number;
  x: number; y: number;
  cel?: { s: Siedlisko; d: number; kind: RodzajWroga };
  /** Szukanie: komórki kandydatów (najbliższe pierwsze), indeks, czy skończone. */
  kand?: { cx: number; cy: number; d: number }[];
  i: number;
  gotowy: boolean;
  img?: Phaser.GameObjects.Image;
  cien?: Phaser.GameObjects.Image;
  napis?: Phaser.GameObjects.Text;
}

const KIERUNKI = [
  ['na wschód', 'east'], ['na południowy wschód', 'south-east'], ['na południe', 'south'], ['na południowy zachód', 'south-west'],
  ['na zachód', 'west'], ['na północny zachód', 'north-west'], ['na północ', 'north'], ['na północny wschód', 'north-east'],
] as const;

/** 0 = wschód, dalej zgodnie z ruchem wskazówek zegara (oś y w dół), co 45°. */
export function osemka(dx: number, dy: number) {
  return ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
}

export function opisOdleglosci(m: number) {
  if (m < 950) return tx(`ok. ${Math.max(100, Math.round(m / 100) * 100)} m`, `about ${Math.max(100, Math.round(m / 100) * 100)} m`);
  const km = Math.round(m / 500) / 2;
  const t = String(km).replace('.', ',');
  return tx(`ok. ${t} km`, `about ${km} km`);
}

/** Najważniejsze skrzyżowanie w pudełku: wierzchołek wspólny dróg o stopniu ≥ 3, w którym spotykają się duże drogi. */
export function skrzyzowanie(lines: { kind: string; pts: number[] }[], box: { x0: number; y0: number; x1: number; y1: number }) {
  const w = new Map<string, { x: number; y: number; st: number; duze: number; major: number; linie: number }>();
  for (const l of lines) {
    if (!D.drogi.includes(l.kind)) continue;
    const duza = D.duze.includes(l.kind);
    const n = l.pts.length / 2;
    const byly = new Set<string>();
    for (let i = 0; i < n; i++) {
      const x = l.pts[i * 2], y = l.pts[i * 2 + 1];
      if (x < box.x0 || x >= box.x1 || y < box.y0 || y >= box.y1) continue;
      const k = `${Math.round(x / 2)},${Math.round(y / 2)}`;
      const waga = i === 0 || i === n - 1 ? 1 : 2;
      let v = w.get(k);
      if (!v) w.set(k, (v = { x, y, st: 0, duze: 0, major: 0, linie: 0 }));
      v.st += waga;
      if (duza) v.duze += waga;
      if (l.kind === 'major') v.major += waga;
      if (!byly.has(k)) { byly.add(k); v.linie++; }
    }
  }
  let best: { x: number; y: number; wynik: number } | null = null;
  for (const v of w.values()) {
    if (v.st < 3 || v.linie < 2) continue;
    if (v.duze < 3 && !(v.duze >= 2 && v.st >= 4)) continue;
    const wynik = v.duze * 2 + v.st + v.major;
    if (!best || wynik > best.wynik || (wynik === best.wynik && (v.y < best.y || (v.y === best.y && v.x < best.x)))) best = { x: v.x, y: v.y, wynik };
  }
  return best;
}

/** Główny mieszkaniec siedliska (najczęstszy wśród zwykłych mieszkańców, inaczej szef). */
export function glownyStwor(s: Siedlisko): RodzajWroga {
  const ile = new Map<RodzajWroga, number>();
  for (const k of s.stwory.czlonkowie) ile.set(k, (ile.get(k) ?? 0) + 1);
  let best: RodzajWroga = s.stwory.szef, n = 0;
  for (const [k, v] of ile) if (v > n) { n = v; best = k; }
  return best;
}

export function nazwaCelu(s: Siedlisko, kind: RodzajWroga) {
  const st = STWORY_ZNAKU[kind] ?? STWOR_DOMYSLNY;
  const t = NAZWA_SIEDLISKA[s.typ];
  return tx(`${t.pl} ${st.pl}`, `${t.en} ${st.en}`);
}

/** Pikselowy obrazek znaku: deska na słupku, niedbały stwór farbą i strzałka węglem w jednym z 8 kierunków. */
function obrazZnaku(rys: RysunekZnaku, k: number) {
  const W = 34, H = 40;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, kol: string) => { g.fillStyle = kol; g.fillRect(x, y, 1, 1); };
  const INK = '#1e1a24';
  let ziarno = 1 + rys.length * 31 + k * 7;
  const los = () => ((ziarno = (ziarno * 16807) % 2147483647) / 2147483647);
  // Słupek (dwa odcienie, światło z NW), wbity w ziemię.
  for (let y = 16; y < H - 1; y++) {
    px(16, y, INK); px(19, y, INK);
    px(17, y, '#8c5d36'); px(18, y, '#5e3b22');
  }
  for (let x = 15; x <= 20; x++) px(x, H - 1, '#3b2a1c');
  // Deska: słoje, sęk, gwoździe, obwódka atramentem.
  const x0 = 2, y0 = 2, x1 = W - 3, y1 = 18;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const brzeg = x === x0 || x === x1 || y === y0 || y === y1;
    if (brzeg) { px(x, y, INK); continue; }
    const slój = Math.sin(x * 0.55 + Math.sin(y * 1.7) * 1.8 + y * 0.9) > 0.86;
    const ton = y === y0 + 1 ? '#c08a55' : y === y1 - 1 ? '#6e4527' : slój ? '#7b4e2c' : (y + (x >> 3)) % 5 === 0 ? '#93633a' : '#a5703f';
    px(x, y, ton);
  }
  px(x0 + 2, y0 + 2, '#2a1d14'); px(x1 - 2, y0 + 2, '#2a1d14');
  px(x0 + 2, y1 - 2, '#2a1d14'); px(x1 - 2, y1 - 2, '#2a1d14');
  // Stwór: farba w pośpiechu – rzędy przesunięte o piksel, dziury, zacieki.
  const mask = RYSUNKI_ZNAKU[rys], sx = x0 + 3, sy = y0 + 3;
  const farba = '#a3271a', farbaC = '#6f1a12';
  for (let r = 0; r < 12; r++) {
    const dx = los() < 0.25 ? (los() < 0.5 ? -1 : 1) : 0;
    for (let q = 0; q < 12; q++) {
      if (mask[r][q] !== 'X' || los() < 0.06) continue;
      const x = sx + q + dx, y = sy + Math.floor(r * 11 / 12);
      if (y >= y1 - 1) continue;
      px(x, y, los() < 0.2 ? farbaC : farba);
      if (r >= 9 && los() < 0.12 && y + 2 < y1) { px(x, y + 1, farbaC); if (los() < 0.5) px(x, y + 2, farbaC); }
    }
  }
  // Strzałka węglem (prawa połowa deski), grubość 3 piksele, grot.
  const cx = x1 - 8, cy = Math.round((y0 + y1) / 2), a = (k * Math.PI) / 4, ux = Math.cos(a), uy = Math.sin(a);
  const wegiel = '#241812';
  for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = cx - 7; x <= x1 - 2; x++) {
    const rx = x - cx, ry = y - cy;
    const u = rx * ux + ry * uy, v = -rx * uy + ry * ux;
    const trzon = u >= -6 && u <= 1.5 && Math.abs(v) <= 1;
    const grot = u > 0.5 && u <= 6 && Math.abs(v) <= (6 - u) * 0.95 + 0.4;
    if ((trzon || grot) && los() > 0.04) px(x, y, wegiel);
  }
  return c;
}

export class Drogowskazy {
  znaki = new Map<string, Drogowskaz>();
  private puste = new Set<string>();
  private czekaKafle = new Set<string>();
  private ostatnio = 0;
  private K = D.komorkaM * PX_PER_M;

  constructor(private scene: Phaser.Scene, private city: CityMap, private lowiska: Lowiska, private host: { widac: (x: number, y: number) => boolean }) {
    (window as unknown as { __drogowskazy?: Drogowskazy }).__drogowskazy = this;
  }

  /** Raz na ~0,5 s: plan znaków wokół bohatera, szukanie celu dla najbliższego niegotowego, obrazki i napisy. */
  update(hx: number, hy: number, now: number) {
    if (now - this.ostatnio < 500) return this.napisy(hx, hy);
    this.ostatnio = now;
    const K = this.K, R = D.widacM * PX_PER_M;
    for (let cx = Math.floor((hx - R) / K); cx <= Math.floor((hx + R) / K); cx++)
      for (let cy = Math.floor((hy - R) / K); cy <= Math.floor((hy + R) / K); cy++) this.planujKomorke(cx, cy);
    // Szukanie celu: jeden znak na raz, najbliższy bohaterowi.
    let szukany: Drogowskaz | null = null, sd = D.szukajM * PX_PER_M;
    for (const z of this.znaki.values()) {
      if (z.gotowy) continue;
      const d = Math.hypot(z.x - hx, z.y - hy);
      if (d < sd) { sd = d; szukany = z; }
    }
    if (szukany) this.szukaj(szukany);
    for (const z of this.znaki.values()) {
      const blisko = Math.hypot(z.x - hx, z.y - hy) < R * 1.3;
      if (blisko && z.gotowy && z.cel && !z.img) this.postaw(z);
      else if (!blisko && z.img) this.zdejmij(z);
    }
    this.napisy(hx, hy);
  }

  private planujKomorke(cx: number, cy: number) {
    const key = `${cx},${cy}`;
    if (this.znaki.has(key) || this.puste.has(key)) return;
    const K = this.K, box = { x0: cx * K, y0: cy * K, x1: (cx + 1) * K, y1: (cy + 1) * K };
    if (!this.city.ready(box)) return;
    const q = this.city.query(box);
    if (q.buildings.filter((b) => !b.open).length < D.minBudynkow) { this.puste.add(key); return; }
    const s = skrzyzowanie(q.lines, box);
    if (!s) { this.puste.add(key); return; }
    // Kierunek najbliższej drogi przy skrzyżowaniu – znak staje z boku, nie na jezdni.
    let dx = 1, dy = 0;
    for (const l of q.lines) {
      if (!D.drogi.includes(l.kind)) continue;
      for (let i = 0; i + 3 < l.pts.length; i += 2) if (Math.hypot(l.pts[i] - s.x, l.pts[i + 1] - s.y) < 3) { dx = l.pts[i + 2] - l.pts[i]; dy = l.pts[i + 3] - l.pts[i + 1]; break; }
    }
    const m = wolneMiejsce(this.city, { x: s.x, y: s.y, dx, dy });
    if (!m) { this.puste.add(key); return; }
    this.znaki.set(key, { id: `${this.city.id}:znak:${key}`, kx: s.x, ky: s.y, x: m.x, y: m.y, i: 0, gotowy: false });
  }

  /** Najbliższe średnie+ siedlisko: komórki od najbliższych, dalsze planowane po wczytaniu ich kafli. */
  private szukaj(z: Drogowskaz) {
    const L = this.lowiska, K = L.komorkaPx, R = D.zasiegM * PX_PER_M;
    if (!z.kand) {
      z.kand = [];
      for (let cx = Math.floor((z.x - R) / K); cx <= Math.floor((z.x + R) / K); cx++)
        for (let cy = Math.floor((z.y - R) / K); cy <= Math.floor((z.y + R) / K); cy++) {
          if (!L.mozeSiedlisko(cx, cy)) continue;
          // Środek obozu leży w środkowej części komórki (0,3–0,7).
          const qx = Math.max((cx + 0.3) * K, Math.min((cx + 0.7) * K, z.x)), qy = Math.max((cy + 0.3) * K, Math.min((cy + 0.7) * K, z.y));
          const d = Math.hypot(qx - z.x, qy - z.y);
          if (d <= R) z.kand.push({ cx, cy, d });
        }
      z.kand.sort((a, b) => a.d - b.d || a.cx - b.cx || a.cy - b.cy);
    }
    for (let krok = 0; krok < 3 && z.i < z.kand.length; krok++) {
      const c = z.kand[z.i];
      if (z.cel && c.d > z.cel.d) break;
      if (!L.zaplanowana(c.cx, c.cy) && !L.zaplanuj(c.cx, c.cy)) {
        const k = `${c.cx},${c.cy}`;
        if (!this.czekaKafle.has(k)) { this.czekaKafle.add(k); void this.city.ensure((c.cx + 0.5) * K, (c.cy + 0.5) * K, K * 0.75).catch(() => {}); }
        return;
      }
      const s = L.siedliskoKomorki(c.cx, c.cy);
      if (s && D.rozmiary.includes(s.rozmiar)) {
        const d = Math.hypot(s.x - z.x, s.y - z.y);
        if (d <= R && (!z.cel || d < z.cel.d)) z.cel = { s, d, kind: glownyStwor(s) };
      }
      z.i++;
    }
    if (z.i >= z.kand.length || (z.cel && z.kand[z.i] && z.kand[z.i].d > z.cel.d)) z.gotowy = true;
  }

  private postaw(z: Drogowskaz) {
    const c = z.cel!;
    const rys = (STWORY_ZNAKU[c.kind] ?? STWOR_DOMYSLNY).rys;
    const k = osemka(c.s.x - z.x, c.s.y - z.y);
    const klucz = `drogowskaz-${rys}-${k}`;
    if (!this.scene.textures.exists(klucz)) this.scene.textures.addCanvas(klucz, obrazZnaku(rys, k))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    if (!this.scene.textures.exists('drogowskaz-cien')) {
      const cc = document.createElement('canvas'); cc.width = 16; cc.height = 5;
      const g = cc.getContext('2d')!; g.fillStyle = 'rgba(30,26,36,0.35)';
      for (let y = 0; y < 5; y++) { const w = Math.round(8 * Math.sqrt(1 - ((y - 2) / 2.6) ** 2)); g.fillRect(8 - w, y, w * 2, 1); }
      this.scene.textures.addCanvas('drogowskaz-cien', cc)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    z.cien = this.scene.add.image(z.x + 1.5, z.y, 'drogowskaz-cien').setScale(0.5).setDepth(-1e7 + 2);
    z.img = this.scene.add.image(z.x, z.y + 0.5, klucz).setOrigin(0.5, 1).setScale(0.5).setDepth(z.y);
  }

  private zdejmij(z: Drogowskaz) {
    z.img?.destroy(); z.cien?.destroy(); z.napis?.destroy();
    z.img = z.cien = z.napis = undefined;
  }

  /** Pełny opis celu znaku (napis, okno). */
  opis(z: Drogowskaz) {
    const c = z.cel!;
    const k = osemka(c.s.x - z.x, c.s.y - z.y);
    return `⚠ ${nazwaCelu(c.s, c.kind)} – ${opisOdleglosci(c.d / PX_PER_M)} ${tx(KIERUNKI[k][0], KIERUNKI[k][1])}`;
  }

  private napisy(hx: number, hy: number) {
    const R = D.napisM * PX_PER_M;
    let najblizszy: Drogowskaz | null = null, nd = R;
    for (const z of this.znaki.values()) {
      if (!z.img) continue;
      z.img.setVisible(this.host.widac(z.x, z.y - 6));
      z.cien!.setVisible(z.img.visible);
      const d = Math.hypot(z.x - hx, z.y - hy);
      if (d < nd && z.img.visible) { nd = d; najblizszy = z; }
    }
    for (const z of this.znaki.values()) if (z !== najblizszy && z.napis) { z.napis.destroy(); z.napis = undefined; }
    if (najblizszy && !najblizszy.napis) {
      const z = najblizszy;
      z.napis = this.scene.add.text(z.x, z.y - 22, this.opis(z), { fontFamily: 'Alegreya Sans, sans-serif', fontSize: '22px', color: '#ffe9c7', stroke: '#1e1a24', strokeThickness: 5, align: 'center', wordWrap: { width: 520 } })
        .setOrigin(0.5, 1).setScale(0.25).setResolution(2).setDepth(1_040_000);
    }
  }

  /** Znaki w zasięgu interakcji (GameScene.interactionCandidates). */
  widoczne() { return [...this.znaki.values()].filter((z) => z.img?.visible && z.cel); }

  destroy() {
    for (const z of this.znaki.values()) this.zdejmij(z);
    this.znaki.clear();
  }
}
