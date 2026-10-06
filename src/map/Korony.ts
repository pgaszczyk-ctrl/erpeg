import Phaser from 'phaser';
import { klatkiWiatru, GATUNKI, para, klatkaPary, type Obraz, type ZrodloPary } from '../gen';
import { drzewoZ, idDrzewa, OWOCOWE, STAN, type Drzewo09 } from './drzewa09';
import { hash } from '../gen';
import { GEN_DOTS } from './ziemia09';
import { weather } from '../weather';
import { KORONY } from '../content/korony';

// Korony drzew overhaulu 09 (SPEC_09 punkt 3.2, wariant A): każda korona to sprite stojący na pniu namalowanym
// w kawałku mapy, z głębią = podstawa pnia (postać za drzewem chowa się pod koroną).
// Wiatr: 5 gotowych klatek „ścięcia” (wiersze przesunięte o całe piksele, u góry najbardziej), klatka wybierana
// z funkcji wiatru z makiety (docs/paczka-dla-programisty/dane/wiatr.json), siła z prawdziwej pogody.
// Prześwit: korona zasłaniająca postać dostaje własną kopię klatki z dziurą wokół postaci; krawędź dziury
// z szachownicy Bayera liczonej w siatce świata, więc nie „pływa”, gdy postać idzie.

const MARGINES = 6; // klatki wiatru są szersze o 2 × margines
const KLATKI = [-2, -1, 0, 1, 2];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

interface Arkusz { key: string; klatki: Obraz[]; w: number; h: number; kx: number; ky: number }

export interface Korona {
  t: Drzewo09;
  im: Phaser.GameObjects.Image;
  a: Arkusz;
  /** Która klatka wiatru teraz (indeks w KLATKI). */
  k: number;
  /** Promień prześwitu (px generatora) i własna tekstura z dziurą, gdy > 0. */
  r: number;
  wlasna?: Phaser.Textures.CanvasTexture;
  /** Ostatnio namalowana dziura (żeby nie malować tego samego). */
  ostatnia?: string;
  /** Szelest po wejściu postaci (gaśnie). */
  szelest: number;
  ziarno: number;
  /** Korona bez owoców (strząśnięte do końca). */
  pusta?: boolean;
  /** Upada (ścięta): nie odpowiada na nic. */
  pada?: boolean;
}

let licznik = 0;

export class Korony {
  private wszystkie = new Set<Korona>();
  private arkusze = new Map<string, Arkusz>();

  constructor(private scene: Phaser.Scene) {}

  /** Tekstura z 5 klatkami wiatru dla gatunku i wariantu (owoce kołyszą się razem z koroną). */
  private arkusz(g: string, w: number, bezOwocow = false): Arkusz {
    const key = `drz09-${g}-${w}${bezOwocow ? '-p' : ''}`;
    let a = this.arkusze.get(key);
    if (a) return a;
    const d = drzewoZ(g, w);
    const kor: Obraz = { w: d.korona.w, h: d.korona.h, px: d.korona.px.slice() };
    if (d.owoce && !bezOwocow) for (let i = 0; i < kor.px.length; i++) if (d.owoce.px[i] >>> 24) kor.px[i] = d.owoce.px[i];
    const klatki = klatkiWiatru(kor, d.koronaGora, d.koronaDol, GATUNKI[g].sztywnosc, MARGINES);
    const W = klatki[0].w, H = klatki[0].h;
    if (!this.scene.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = W * klatki.length;
      c.height = H;
      const ctx = c.getContext('2d')!;
      klatki.forEach((k, i) => ctx.putImageData(obrazDanych(k), i * W, 0));
      const tex = this.scene.textures.addCanvas(key, c)!;
      KLATKI.forEach((k, i) => tex.add(`w${k}`, 0, i * W, 0, W, H));
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    a = { key, klatki, w: W, h: H, kx: d.kotwica[0] + MARGINES, ky: d.kotwica[1] + 1 };
    this.arkusze.set(key, a);
    return a;
  }

  make(t: Drzewo09): Korona {
    const pusta = OWOCOWE.has(t.g) && this.owoce(t) === 0;
    const a = this.arkusz(t.g, t.w, pusta);
    const x = t.x / GEN_DOTS, y = t.y / GEN_DOTS;
    const im = this.scene.add.image(x, y, a.key, 'w0').setOrigin(a.kx / a.w, a.ky / a.h).setScale(1 / GEN_DOTS).setDepth(y);
    const k: Korona = { t, im, a, k: 2, r: 0, szelest: 0, ziarno: (t.x * 7919 + t.y * 104729) % 1000, pusta };
    this.wszystkie.add(k);
    const c = this.kratka(x, y);
    let zb = this.siatka.get(c);
    if (!zb) this.siatka.set(c, (zb = new Set()));
    zb.add(k);
    return k;
  }

  drop(k: Korona) {
    this.wszystkie.delete(k);
    this.siatka.get(this.kratka(k.t.x / GEN_DOTS, k.t.y / GEN_DOTS))?.delete(k);
    this.zdejmijDziure(k);
    if (!k.pada) k.im.destroy();
  }

  // ------------------------------------------------------------ para (perony, zawory, manometry)

  private obloczki = new Set<Phaser.GameObjects.Image>();

  /** Obłoczek pary w punkcie (px generatora): 6 klatek z generatora, unosi się i rozwiewa w pętli. */
  steam(px: number, py: number, glebia?: number) {
    if (!this.scene.textures.exists('para09')) {
      const R = 24;
      const c = document.createElement('canvas');
      c.width = R * 6;
      c.height = R;
      const ctx = c.getContext('2d')!;
      for (let k = 0; k < 6; k++) ctx.putImageData(obrazDanych(para(R, k, 7)), k * R, 0);
      const tex = this.scene.textures.addCanvas('para09', c)!;
      for (let k = 0; k < 6; k++) tex.add(`p${k}`, 0, k * R, 0, R, R);
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const x = px / GEN_DOTS, y = py / GEN_DOTS;
    const im = this.scene.add.image(x, y, 'para09', 'p0').setOrigin(0.5, 1).setScale(1 / GEN_DOTS).setDepth(glebia ?? y + 1);
    im.setData('x0', x).setData('y0', y).setData('faza', hash(px, py, 13) * 6);
    this.obloczki.add(im);
    return im;
  }

  /** Krótkie wyrzuty pary z budynku (GENERATOR_SWIATA 0.11): obłoczek tylko w chwili wyrzutu (`klatkaPary`), inaczej ukryty. */
  private wyrzuty = new Set<Phaser.GameObjects.Image>();
  wyrzut(z: ZrodloPary) {
    const im = this.steam(z.x, z.y);
    this.obloczki.delete(im);
    im.setData('z', z).setScale(z.rozmiar / 24 / GEN_DOTS).setDepth(z.y / GEN_DOTS + 40).setVisible(false);
    this.wyrzuty.add(im);
    return im;
  }

  private updateWyrzuty(T: number, cam: Phaser.Geom.Rectangle) {
    const wiatr = Math.max(-1, Math.min(1, (weather.wind - 2) / 8));
    for (const im of this.wyrzuty) {
      const x0 = im.getData('x0') as number, y0 = im.getData('y0') as number;
      if (x0 < cam.x - 30 || x0 > cam.right + 30 || y0 < cam.y - 30 || y0 > cam.bottom + 40) {
        im.setVisible(false);
        continue;
      }
      const k = klatkaPary(im.getData('z') as ZrodloPary, T);
      if (k < 0) {
        im.setVisible(false);
        continue;
      }
      im.setVisible(true).setFrame(`p${k}`).setPosition(Math.round((x0 + wiatr * k) * 2) / 2, Math.round((y0 - k * 1.2) * 2) / 2).setAlpha(k < 5 ? 1 : 0.6);
    }
  }

  dropSteam(im: Phaser.GameObjects.Image) {
    this.wyrzuty.delete(im);
    this.obloczki.delete(im);
    this.fale.delete(im);
    im.destroy();
  }

  // ------------------------------------------------------------ zmarszczki na wodzie (właściciel 5.10.2026)

  private fale = new Set<Phaser.GameObjects.Image>();

  /** Błysk/zmarszczka na wodzie w punkcie (px generatora): pojawia się, wydłuża i gaśnie, lekko dryfuje; bez względu na wiatr. */
  fala(px: number, py: number) {
    if (!this.scene.textures.exists('fala09')) {
      const W = 8, H = 3, J = ['#9ecbe0', '#cfeaf4', '#eef9fc'].map((h) => h);
      const c = document.createElement('canvas');
      c.width = W * 5;
      c.height = H;
      const g = c.getContext('2d')!;
      // klatki: 0 nic, 1 krótka kreska, 2 dłuższa z błyskiem, 3 dwie kreski (fala się łamie), 4 kropka
      const kres = (k: number, x: number, y: number, w: number, col: string) => { g.fillStyle = col; g.fillRect(k * W + x, y, w, 1); };
      kres(1, 3, 1, 2, J[0]);
      kres(2, 1, 1, 5, J[0]); kres(2, 2, 0, 2, J[2]);
      kres(3, 0, 1, 2, J[1]); kres(3, 5, 1, 2, J[0]);
      kres(4, 4, 2, 1, J[0]);
      const tex = this.scene.textures.addCanvas('fala09', c)!;
      for (let k = 0; k < 5; k++) tex.add(`f${k}`, 0, k * W, 0, W, H);
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const x = px / GEN_DOTS, y = py / GEN_DOTS;
    const im = this.scene.add.image(x, y, 'fala09', 'f0').setOrigin(0.5).setScale(1 / GEN_DOTS).setDepth(-1e8 + 3).setAlpha(0.85);
    im.setData('x0', x).setData('y0', y).setData('faza', hash(px, py, 21) * 7).setData('okres', 2.2 + hash(px, py, 22) * 1.6);
    this.fale.add(im);
    return im;
  }

  private updateFale(T: number, cam: Phaser.Geom.Rectangle) {
    const KL = [0, 1, 2, 2, 3, 4, 0, 0];
    for (const im of this.fale) {
      const x0 = im.getData('x0') as number, y0 = im.getData('y0') as number;
      if (x0 < cam.x - 10 || x0 > cam.right + 10 || y0 < cam.y - 10 || y0 > cam.bottom + 10) {
        if (im.visible) im.setVisible(false);
        continue;
      }
      if (!im.visible) im.setVisible(true);
      const okres = im.getData('okres') as number, t = ((T + (im.getData('faza') as number)) % okres) / okres;
      im.setFrame(`f${KL[Math.min(KL.length - 1, Math.floor(t * KL.length))]}`);
      im.setPosition(Math.round((x0 + Math.sin((T + x0) * 0.6) * 1.5) * 2) / 2, y0);
    }
  }

  /** Para: co ~1,2 s nowy obłoczek, unosi się o kilka px i rzednie (klatki 0–5); silniejszy wiatr znosi ją w bok. */
  private updateSteam(T: number, cam: Phaser.Geom.Rectangle) {
    const wiatr = Math.max(-1, Math.min(1, (weather.wind - 2) / 8));
    for (const im of this.obloczki) {
      const x0 = im.getData('x0') as number, y0 = im.getData('y0') as number;
      if (x0 < cam.x - 30 || x0 > cam.right + 30 || y0 < cam.y - 30 || y0 > cam.bottom + 40) {
        if (im.visible) im.setVisible(false);
        continue;
      }
      if (!im.visible) im.setVisible(true);
      const t = ((T * 0.85 + (im.getData('faza') as number)) % 1.4) / 1.4; // 0..1 w cyklu
      const k = Math.min(5, Math.floor(t * 6));
      im.setFrame(`p${k}`).setPosition(Math.round((x0 + wiatr * t * 6) * 2) / 2, Math.round((y0 - t * 7) * 2) / 2).setAlpha(t < 0.8 ? 1 : (1 - t) * 5);
    }
  }

  // ------------------------------------------------------------ stan drzew (do następnego logowania)

  /** Kratki 32 px mapy z koronami (szukanie drzewa pod ciosem i pni pod stopami). */
  private siatka = new Map<string, Set<Korona>>();
  private kratka = (x: number, y: number) => `${Math.floor(x / 32)},${Math.floor(y / 32)}`;

  /** Ścięte drzewa (idDrzewa): pieniek w kawałku, bez korony. Wracają przy następnym logowaniu. */
  sciete() {
    return [...STAN.sciete];
  }

  /** Ile owoców zostało na drzewie (na początku 2–5, jak dawne drzewa owocowe). */
  owoce(t: Drzewo09) {
    const id = idDrzewa(t);
    if (!STAN.owoce.has(id)) STAN.owoce.set(id, 2 + Math.floor(hash(t.x, t.y, 611) * 4));
    return STAN.owoce.get(id)!;
  }

  /** Drzewo (korona, która jeszcze stoi), którego pień leży najbliżej ciosu w (x, y), w px mapy. */
  hitAt(x: number, y: number, zasieg: number): Korona | null {
    let best: Korona | null = null, bd = zasieg;
    for (let gy = Math.floor((y - zasieg) / 32); gy <= Math.floor((y + zasieg + 8) / 32); gy++)
      for (let gx = Math.floor((x - zasieg) / 32); gx <= Math.floor((x + zasieg) / 32); gx++)
        for (const k of this.siatka.get(`${gx},${gy}`) ?? []) {
          if (k.pada) continue;
          // Trafia się w pień i dół korony (krzak: w środek).
          const d = Math.hypot(k.t.x / GEN_DOTS - x, k.t.y / GEN_DOTS - (k.t.g.startsWith('krzak') ? 4 : 7) - y);
          if (d < bd) { bd = d; best = k; }
        }
    return best;
  }

  /** Czy w punkcie (px mapy) stoi pień (kolizje postaci); krzaki i pieńki nie zatrzymują. */
  blocked(x: number, y: number) {
    for (const k of this.siatka.get(this.kratka(x, y)) ?? []) {
      if (k.pada || k.t.g.startsWith('krzak') || hash(k.t.x, k.t.y, 211) >= KORONY.pnieBlokuja) continue;
      if (Math.abs(k.t.x / GEN_DOTS - x) < KORONY.pienSzer && Math.abs(k.t.y / GEN_DOTS - y) < KORONY.pienWys) return true;
    }
    return false;
  }

  /** Potrząśnięcie koroną (cios, strącony owoc): szelest i krótkie drgnięcie. */
  trzes(k: Korona, mocno = false) {
    k.szelest = 1;
    const x = k.im.x;
    this.scene.tweens.add({ targets: k.im, x: { from: x - (mocno ? 1.5 : 0.8), to: x + (mocno ? 1.5 : 0.8) }, duration: 45, yoyo: true, repeat: mocno ? 2 : 1, onComplete: () => k.im.active && k.im.setX(x) });
  }

  /** Strąca jeden owoc; false, gdy drzewo już puste. */
  strac(k: Korona): boolean {
    const n = this.owoce(k.t);
    this.trzes(k, true);
    if (n <= 0) return false;
    STAN.owoce.set(idDrzewa(k.t), n - 1);
    if (n - 1 === 0) {
      // Bez owoców: ten sam kształt, inna tekstura (też w klatkach wiatru).
      k.a = this.arkusz(k.t.g, k.t.w, true);
      k.pusta = true;
      this.zdejmijDziure(k);
      k.im.setTexture(k.a.key, `w${KLATKI[k.k]}`);
    }
    return true;
  }

  /** Ścina drzewo: korona przewraca się i znika; pień w kawałku zmieni się w pieniek przy przemalowaniu. */
  zetnij(k: Korona, wPrawo: boolean) {
    STAN.sciete.add(idDrzewa(k.t));
    k.pada = true;
    this.zdejmijDziure(k);
    const im = k.im;
    this.scene.tweens.add({
      targets: im,
      angle: wPrawo ? 86 : -86,
      alpha: { from: 1, to: 0 },
      duration: 650,
      ease: 'Quad.easeIn',
      onComplete: () => im.destroy(),
    });
  }

  /** Co klatkę gry: wiatr i prześwit koron w widoku. `hx, hy` = stopy postaci (px mapy). */
  update(now: number, dt: number, cam: Phaser.Geom.Rectangle, hx: number, hy: number) {
    const T = now / 1000;
    if (this.obloczki.size) this.updateSteam(T, cam);
    if (this.wyrzuty.size) this.updateWyrzuty(T, cam);
    if (this.fale.size) this.updateFale(T, cam);
    const S = Math.max(0.1, Math.min(2.2, weather.wind / 7));
    // Środek postaci w px generatora.
    const px = hx * GEN_DOTS, py = (hy - KORONY.srodekPostaci) * GEN_DOTS;
    const m = 40;
    for (const k of this.wszystkie) {
      const im = k.im;
      // Off-screen crowns are not drawn at all (report 56: 5000 crowns alive, ~500 on screen, phone at 21 fps).
      if (im.x < cam.x - m || im.x > cam.right + m || im.y < cam.y - m || im.y > cam.bottom + 2 * m) {
        if (im.visible && !k.pada) im.setVisible(false);
        continue;
      }
      if (!im.visible) im.setVisible(true);
      // Prześwit: tylko korona przed postacią (podstawa niżej niż stopy), gdy postać stoi pod jej liśćmi.
      const lx = Math.round(px - (k.t.x - k.a.kx)), ly = Math.round(py - (k.t.y - k.a.ky));
      const pod = k.t.y > hy * GEN_DOTS && lx >= 0 && ly >= 0 && lx < k.a.w && ly < k.a.h && zaslania(k.a.klatki[2], lx, ly);
      const cel = pod ? KORONY.promien : 0;
      if (pod && k.r < 0.5) k.szelest = 1;
      k.r += (cel - k.r) * Math.min(1, dt * KORONY.szybkoscPrzeswitu);
      if (!pod && k.r < 0.5) k.r = 0;
      k.szelest *= Math.exp(-2.4 * dt);
      // Wiatr (dane/wiatr.json) + szelest; klatki mają już w sobie sztywność gatunku.
      const xf = k.t.x, yf = k.t.y - k.a.ky / 2;
      const p = (((xf * 0.8 + yf * 0.35) * 0.0055 - T * 0.26) % 1 + 1) % 1;
      const poryw = Math.exp(-(((p - 0.5) * 6) ** 2));
      let w = (S * (0.32 * Math.sin(T * 2.1 + xf * 0.07 + yf * 0.03) + 0.14 * Math.sin(T * 3.4 - xf * 0.05 + yf * 0.06) + 1.25 * poryw)) / 1.25;
      if (k.szelest > 0.02) w += Math.sin(T * 26 + k.ziarno) * k.szelest * 1.4;
      const idx = Math.max(0, Math.min(4, Math.round(w) + 2));
      if (k.r > 0) this.dziura(k, idx, px, py);
      else {
        if (k.wlasna) this.zdejmijDziure(k);
        if (idx !== k.k || im.texture.key !== k.a.key) im.setTexture(k.a.key, `w${KLATKI[idx]}`);
      }
      k.k = idx;
    }
  }

  /** Własna kopia klatki z dziurą wokół postaci (krawędź z szachownicy w siatce świata). */
  private dziura(k: Korona, idx: number, px: number, py: number) {
    const R = k.r, pas = KORONY.pas;
    const ox = k.t.x - k.a.kx, oy = k.t.y - k.a.ky;
    const sx = Math.round(px), sy = Math.round(py);
    const znak = `${idx}|${sx}|${sy}|${Math.round(R * 2)}`;
    if (znak === k.ostatnia && k.wlasna) return;
    k.ostatnia = znak;
    if (!k.wlasna) {
      k.wlasna = this.scene.textures.createCanvas(`drz09-p${licznik++}`, k.a.w, k.a.h)!;
      k.wlasna.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const src = k.a.klatki[idx];
    const dane = new Uint32Array(src.px);
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const o = j * src.w + i;
      if (!dane[o]) continue;
      const X = ox + i, Y = oy + j;
      const d = Math.hypot(X + 0.5 - px, (Y + 0.5 - py) * 1.05);
      if (d >= R) continue;
      if (d < R - pas || BAYER[((Y & 3) << 2) | (X & 3)] < (R - d) / pas) dane[o] = 0;
    }
    const ctx = k.wlasna.getContext();
    ctx.clearRect(0, 0, k.a.w, k.a.h);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(dane.buffer), src.w, src.h), 0, 0);
    k.wlasna.refresh();
    if (k.im.texture !== k.wlasna) k.im.setTexture(k.wlasna.key);
  }

  private zdejmijDziure(k: Korona) {
    if (!k.wlasna) return;
    const key = k.wlasna.key;
    k.wlasna = undefined;
    k.ostatnia = undefined;
    if (k.im.active) k.im.setTexture(k.a.key, `w${KLATKI[k.k]}`);
    this.scene.textures.remove(key);
  }
}

/** Czy w otoczeniu punktu (lx, ly) są liście (nie zostawiamy dziury w pustym miejscu przy brzegu korony). */
function zaslania(o: Obraz, lx: number, ly: number) {
  let n = 0;
  for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
    const x = lx + dx, y = ly + dy;
    if (x >= 0 && y >= 0 && x < o.w && y < o.h && o.px[y * o.w + x] >>> 24) n++;
  }
  return n >= 6;
}

function obrazDanych(o: Obraz) {
  return new ImageData(new Uint8ClampedArray(o.px.buffer as ArrayBuffer, o.px.byteOffset, o.px.byteLength).slice(), o.w, o.h);
}
