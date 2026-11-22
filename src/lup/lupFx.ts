// Łup, który cieszy (właściciel, 22.11.2026: „złoto na grudki mniejsze i większe, lekki magnes, animacja wyskakiwania
// po uderzeniu; ze skrzyni też ma wyskakiwać z animacją, dźwiękiem i pulsowaniem; lepsze przedmioty z inną poświatą”).
// Wszystko rysowane kodem w pikselach świata (2 px tekstury = 1 px mapy, NEAREST), jak reszta generatora.
// GameScene trzyma listę `pickups`; tu są: tekstury, wyrzut po łuku, magnes, poświaty rzadkości i błyski.
import Phaser from 'phaser';
import type { OpisRzadkosci } from '../content/rzadkosc';

/** Strojenie (mapa px, ms). */
export const LUP_FX = {
  /** Z jak daleka łup sam podjeżdża do bohatera (≈ 12 m). */
  magnesPx: 24,
  /** Prędkość startowa i największa magnesu, przyspieszenie (px/s, px/s²). */
  magnesStart: 18,
  magnesMaks: 230,
  magnesPrzysp: 520,
  /** Wyrzut: czas lotu i wysokość łuku. */
  lotMs: [420, 620] as [number, number],
  wysokosc: [12, 22] as [number, number],
  /** Jak daleko od miejsca śmierci padają kawałki. */
  rozrzut: [6, 16] as [number, number],
  /** Po ilu ms od wylądowania łup daje się podnieść (żeby było widać, co wypadło). */
  zwlokaMs: 140,
  /** Ile leży złoto/serca, zanim zniknie; przedmioty leżą do końca sceny. */
  zlotoZnikaMs: 45_000,
};

/** Wielkości grudek złota: od jakiej sumy (n) która grudka. */
const PROGI_GRUDEK = [1, 3, 8, 20];

const OUT = '#1e1a24';

/** Grudka złota: nieregularna bryłka z cieniem od NW, pikselowa (2 px tekstury = 1 px mapy). */
function rysujGrudke(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number) {
  let h = seed * 2654435761 >>> 0;
  const los = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const wybrzusz = Array.from({ length: 8 }, () => 0.78 + los() * 0.34);
  const w = Math.ceil(rx * 2 + 4), hh = Math.ceil(ry * 2 + 4);
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - hh / 2);
  const wew: boolean[][] = [];
  const r = (dx: number, dy: number) => {
    const a = Math.atan2(dy / ry, dx / rx);
    const k = ((a / (Math.PI * 2)) * 8 + 8) % 8;
    const i = Math.floor(k), f = k - i;
    return wybrzusz[i] * (1 - f) + wybrzusz[(i + 1) % 8] * f;
  };
  for (let y = 0; y < hh; y++) {
    wew[y] = [];
    for (let x = 0; x < w; x++) {
      const dx = x0 + x + 0.5 - cx, dy = y0 + y + 0.5 - cy;
      wew[y][x] = Math.hypot(dx / rx, dy / ry) < r(dx, dy);
    }
  }
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const dx = x0 + x + 0.5 - cx, dy = y0 + y + 0.5 - cy;
    if (wew[y][x]) {
      const swiatlo = -(dx / rx) * 0.7 - (dy / ry) * 0.9;
      ctx.fillStyle = swiatlo > 0.75 ? '#fff4b0' : swiatlo > 0.2 ? '#ffd23f' : swiatlo > -0.45 ? '#e2a21c' : '#a8670e';
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    } else {
      const sas = (yy: number, xx: number) => wew[yy]?.[xx];
      if (sas(y - 1, x) || sas(y + 1, x) || sas(y, x - 1) || sas(y, x + 1)) {
        ctx.fillStyle = OUT;
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
  }
}

function plotno(scene: Phaser.Scene, key: string, w: number, h: number, rysuj: (c: CanvasRenderingContext2D) => void, gladko = false) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  rysuj(c);
  t.refresh();
  t.setFilter(gladko ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
}

/** Tekstury łupu (raz na grę). */
export function przygotujTekstury(scene: Phaser.Scene) {
  plotno(scene, 'grudka-0', 10, 10, (c) => rysujGrudke(c, 5, 5.5, 2.6, 2.1, 3));
  plotno(scene, 'grudka-1', 14, 12, (c) => rysujGrudke(c, 7, 6.5, 4.2, 3.2, 7));
  plotno(scene, 'grudka-2', 18, 15, (c) => { rysujGrudke(c, 11.5, 9, 3.6, 2.8, 11); rysujGrudke(c, 7, 8, 5, 3.9, 5); });
  plotno(scene, 'grudka-3', 24, 19, (c) => {
    rysujGrudke(c, 16.5, 12.5, 4, 3.1, 13); rysujGrudke(c, 6.5, 12.5, 3.6, 2.9, 17);
    rysujGrudke(c, 11.5, 9, 6, 4.6, 19);
  });
  // A sparkle (plus shape) that flashes on gold now and then.
  plotno(scene, 'lup-blysk', 7, 7, (c) => {
    c.fillStyle = '#fffbe0';
    c.fillRect(3, 0, 1, 7); c.fillRect(0, 3, 7, 1);
    c.fillStyle = '#ffffff'; c.fillRect(2, 2, 3, 3);
  });
  // Soft round glow (tinted by rarity, ADD).
  plotno(scene, 'lup-poswiata', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  }, true);
  // A light beam rising from epic and unique items (Diablo-like), brightest at the ground.
  plotno(scene, 'lup-slup', 12, 64, (c) => {
    for (let y = 0; y < 64; y++) {
      const a = Math.pow(y / 63, 1.6);
      const g = c.createLinearGradient(0, 0, 12, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, y, 12, 1);
    }
  }, true);
  // Ground shadow under every piece.
  plotno(scene, 'lup-cien', 12, 5, (c) => {
    c.fillStyle = 'rgba(30,26,36,0.55)';
    c.fillRect(2, 0, 8, 5); c.fillRect(0, 1, 12, 3);
  });
  // A flash ring when a chest bursts open.
  plotno(scene, 'lup-pierscien', 48, 48, (c) => {
    const g = c.createRadialGradient(24, 24, 10, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,240,190,0.9)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = g; c.fillRect(0, 0, 48, 48);
  }, true);
}

/** Tekstura grudki dla tylu monet. */
export function grudkaKlucz(n: number) {
  let i = 0;
  for (let k = 0; k < PROGI_GRUDEK.length; k++) if (n >= PROGI_GRUDEK[k]) i = k;
  return `grudka-${i}`;
}

/** Suma złota rozbita na kilka grudek różnej wielkości (jedna większa, reszta drobniejsza). */
export function podzielZloto(n: number, maks = 5): number[] {
  if (n <= 0) return [];
  const ile = Math.max(1, Math.min(maks, n <= 2 ? 1 : n <= 6 ? 2 : n <= 15 ? 3 : n <= 40 ? 4 : maks));
  const wagi = Array.from({ length: ile }, (_, i) => (i === 0 ? 2.2 : 0.6 + Math.random()));
  const suma = wagi.reduce((a, b) => a + b, 0);
  const out = wagi.map((w) => Math.max(1, Math.floor((w / suma) * n)));
  let reszta = n - out.reduce((a, b) => a + b, 0);
  while (reszta < 0) { const i = out.findIndex((v) => v > 1); if (i < 0) break; out[i]--; reszta++; }
  out[0] += reszta;
  return out.filter((v) => v > 0);
}

interface Fx { obj: Phaser.GameObjects.Image; rodzaj: 'cien' | 'glow' | 'slup' | 'blysk' }

function fxOf(img: Phaser.GameObjects.Image): Fx[] {
  let fx = img.getData('fx') as Fx[] | undefined;
  if (!fx) { fx = []; img.setData('fx', fx); img.once('destroy', () => { for (const f of fx!) f.obj.destroy(); }); }
  return fx;
}

/** Cień pod kawałkiem łupu (każdy wyrzucony go ma). */
function dodajCien(scene: Phaser.Scene, img: Phaser.GameObjects.Image) {
  const cien = scene.add.image(img.x, img.y, 'lup-cien').setScale(0.5 * Math.max(0.7, img.displayWidth / 7)).setDepth(-1e7 + 2);
  fxOf(img).push({ obj: cien, rodzaj: 'cien' });
}

/** Błysk na złocie co kilka sekund. */
export function dodajBlysk(scene: Phaser.Scene, img: Phaser.GameObjects.Image) {
  const b = scene.add.image(img.x, img.y, 'lup-blysk').setScale(0.5).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
  fxOf(img).push({ obj: b, rodzaj: 'blysk' });
  img.setData('faza', Math.random() * 4000).setData('okres', 2200 + Math.random() * 2600);
}

/** Poświata (i słup światła) wg rzadkości albo podanego koloru (diament). */
export function dodajPoswiate(scene: Phaser.Scene, img: Phaser.GameObjects.Image, r: Pick<OpisRzadkosci, 'kolor' | 'poziom' | 'slup'>) {
  if (r.poziom <= 0) return;
  const glow = scene.add.image(img.x, img.y, 'lup-poswiata').setTint(r.kolor).setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.55 + r.poziom * 0.18).setAlpha(0.8).setDepth(img.depth - 0.4);
  fxOf(img).push({ obj: glow, rodzaj: 'glow' });
  if (r.slup) {
    const slup = scene.add.image(img.x, img.y, 'lup-slup').setOrigin(0.5, 1).setTint(r.kolor).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1, r.poziom >= 4 ? 1.2 : 0.9).setAlpha(0.8).setDepth(img.depth + 0.3);
    fxOf(img).push({ obj: slup, rodzaj: 'slup' });
  }
  img.setData('pulsKolor', r.poziom);
  if (img.getData('faza') === undefined) img.setData('faza', Math.random() * 4000).setData('okres', 2200 + Math.random() * 2600);
}

/** Pokazuje/chowa dodatki razem z łupem (mgła wojny). */
export function pokazFx(img: Phaser.GameObjects.Image, widoczny: boolean) {
  const fx = img.getData('fx') as Fx[] | undefined;
  if (fx) for (const f of fx) if (f.rodzaj !== 'blysk') f.obj.setVisible(widoczny);
}

/**
 * Wyrzut po łuku: z `od` (np. z ciała potwora albo ze skrzyni) na miejsce, gdzie łup już stoi (img.x/y), z małym
 * odbiciem przy lądowaniu. Do wylądowania nie da się go podnieść.
 */
export function wyrzuc(scene: Phaser.Scene, img: Phaser.GameObjects.Image, od: { x: number; y: number }, opozn = 0, naLadowanie?: () => void) {
  const tx = img.x, ty = img.y;
  const [l0, l1] = LUP_FX.lotMs, [h0, h1] = LUP_FX.wysokosc;
  const dur = l0 + Math.random() * (l1 - l0);
  const H = h0 + Math.random() * (h1 - h0);
  const obrot = (Math.random() < 0.5 ? -1 : 1) * (img.getData('kind') === 'coin' ? 360 + Math.random() * 360 : 0);
  const teraz = scene.time.now;
  img.setData('bx', tx).setData('by', ty).setData('lup', true).setData('gotowyAt', teraz + opozn + dur * 1.35 + LUP_FX.zwlokaMs);
  dodajCien(scene, img);
  img.setPosition(od.x, od.y).setDepth(ty);
  const sx = img.scaleX, sy = img.scaleY;
  img.setScale(sx * 0.4, sy * 0.4);
  const cien = fxOf(img).find((f) => f.rodzaj === 'cien')!.obj;
  cien.setPosition(od.x, od.y + 1);
  scene.tweens.addCounter({
    from: 0, to: 1, duration: dur, delay: opozn,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      const gx = od.x + (tx - od.x) * t, gy = od.y + (ty - od.y) * t;
      const h = H * 4 * t * (1 - t);
      img.setPosition(gx, gy - h).setAngle(obrot * t);
      const k = Math.min(1, 0.4 + t * 1.6);
      img.setScale(sx * k, sy * k);
      cien.setPosition(gx, gy + 1).setAlpha(1 - (h / H) * 0.6);
    },
    onComplete: () => {
      img.setAngle(0).setScale(sx, sy);
      // A small hop on landing.
      scene.tweens.addCounter({
        from: 0, to: 1, duration: dur * 0.35,
        onUpdate: (tw) => { const t = tw.getValue() ?? 0; img.setPosition(tx, ty - H * 0.16 * 4 * t * (1 - t)); },
        onComplete: () => { img.setPosition(tx, ty); naLadowanie?.(); },
      });
    },
  });
}

/** Gdzie położyć kawałek łupu obok `x,y`: wolna ziemia w losowym kierunku (albo w podanym wycinku kąta). */
export function miejsceObok(x: number, y: number, wolne: (x: number, y: number) => boolean, kat?: [number, number], zasieg = LUP_FX.rozrzut) {
  for (let proba = 0; proba < 8; proba++) {
    const a = kat ? kat[0] + Math.random() * (kat[1] - kat[0]) : Math.random() * Math.PI * 2;
    const d = zasieg[0] + Math.random() * (zasieg[1] - zasieg[0]) * (1 - proba / 10);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.75;
    if (wolne(px, py)) return { x: px, y: py };
  }
  return { x, y };
}

/**
 * Co klatkę: magnes, kołysanie, pulsowanie poświat i błyski. `cel` = gdzie bohater zbiera (stopy), `moze` = czy
 * ten kawałek wolno przyciągać (np. plecak nie jest pełny).
 */
export function animujLup(items: Phaser.GameObjects.Image[], cel: { x: number; y: number }, now: number, dt: number, moze: (i: Phaser.GameObjects.Image) => boolean) {
  for (const img of items) {
    if (!img.active || !img.getData('lup')) continue;
    if (now < (img.getData('gotowyAt') as number)) continue;
    let bx = img.getData('bx') as number, by = img.getData('by') as number;
    const d = Math.hypot(cel.x - bx, cel.y - by);
    if (d < LUP_FX.magnesPx && d > 0.5 && moze(img)) {
      let v = (img.getData('v') as number | undefined) ?? LUP_FX.magnesStart;
      v = Math.min(LUP_FX.magnesMaks, v + LUP_FX.magnesPrzysp * dt);
      img.setData('v', v);
      const krok = Math.min(d, v * dt);
      bx += ((cel.x - bx) / d) * krok;
      by += ((cel.y - by) / d) * krok;
      img.setData('bx', bx).setData('by', by).setDepth(by);
    } else if (img.getData('v')) img.setData('v', 0);
    const faza = (img.getData('faza') as number | undefined) ?? 0;
    const bob = img.getData('bob') ? 1 + Math.sin((now + faza) / 260) : 0;
    img.setPosition(bx, by - bob);
    const fx = img.getData('fx') as Fx[] | undefined;
    if (!fx) continue;
    const okres = (img.getData('okres') as number | undefined) ?? 3000;
    const pf = ((now + faza) % okres);
    for (const f of fx) {
      switch (f.rodzaj) {
        case 'cien': f.obj.setPosition(bx, by + 1).setAlpha(1); break;
        case 'glow': f.obj.setPosition(bx, by - 1).setAlpha(0.55 + 0.3 * Math.sin((now + faza) / 230)); break;
        case 'slup': f.obj.setPosition(bx, by).setAlpha(0.6 + 0.3 * Math.sin((now + faza) / 380)); break;
        case 'blysk': {
          const on = img.visible && pf < 280;
          f.obj.setVisible(on);
          if (on) {
            const s = Math.sin((pf / 280) * Math.PI);
            f.obj.setPosition(bx + (img.displayWidth * 0.2), by - img.displayHeight * 0.3 - bob).setScale(0.25 + 0.35 * s).setAlpha(s).setDepth(by + 0.5);
          }
          break;
        }
      }
    }
  }
}
