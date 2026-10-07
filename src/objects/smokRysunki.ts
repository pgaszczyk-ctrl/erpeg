import Phaser from 'phaser';
import { RYSUNKI_SMOKOW, EFEKTY_SMOKOW, type GatunekId } from '../content/smoki';

// Rysunki smoków od grafika (content/smoki.ts RYSUNKI_SMOKOW): arkusz wczytywany dopiero przy pierwszym smoku
// danego gatunku (1,5 MB), animacje „<akcja>_<kierunek>” tworzone raz. Skala 1/2: 2 px obrazu na punkt mapy.

export const SKALA_RYSUNKU = 0.5;

const KLATKI_NA_S: Record<string, number> = { stoi: 2, idzie: 6, ugryzienie: 7, start: 6, ladowanie: 6, smierc: 5, lot: 4 };

const ladowanie = new Map<string, Promise<boolean>>();

export const kluczSmoka = (g: GatunekId) => `smok-${g}`;
export const kluczEfektu = (n: keyof typeof EFEKTY_SMOKOW) => `smok-efekt-${n}`;

/** Wczytuje arkusz gatunku (i efekty uderzenia) – raz; true, gdy są. */
export function zaladujSmoka(scene: Phaser.Scene, g: GatunekId): Promise<boolean> {
  const r = RYSUNKI_SMOKOW[g];
  if (!r) return Promise.resolve(false);
  const key = kluczSmoka(g);
  if (scene.textures.exists(key)) return Promise.resolve(true);
  let p = ladowanie.get(key);
  if (p) return p;
  p = new Promise<boolean>((ok) => {
    scene.load.spritesheet(key, r.plik, { frameWidth: r.komorka[0], frameHeight: r.komorka[1] });
    if (r.efekty) for (const [n, [w, , h]] of Object.entries(EFEKTY_SMOKOW)) {
      scene.load.spritesheet(kluczEfektu(n as keyof typeof EFEKTY_SMOKOW), `swiat/smoki/efekt_${n}.png`, { frameWidth: w, frameHeight: h });
    }
    scene.load.once('complete', () => {
      const ok2 = scene.textures.exists(key);
      if (ok2) {
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        for (const n of Object.keys(EFEKTY_SMOKOW)) if (scene.textures.exists(kluczEfektu(n as keyof typeof EFEKTY_SMOKOW))) scene.textures.get(kluczEfektu(n as keyof typeof EFEKTY_SMOKOW)).setFilter(Phaser.Textures.FilterMode.NEAREST);
        stworzAnimacje(scene, g);
      }
      ok(ok2);
    });
    scene.load.start();
  });
  ladowanie.set(key, p);
  return p;
}

function stworzAnimacje(scene: Phaser.Scene, g: GatunekId) {
  const r = RYSUNKI_SMOKOW[g]!;
  const key = kluczSmoka(g);
  const grupy = new Map<string, number[]>();
  r.klatki.forEach((n, i) => {
    const m = n.match(/^(.*)_(\d+)$/);
    if (!m) return;
    const a = m[1];
    if (!grupy.has(a)) grupy.set(a, []);
    grupy.get(a)!.push(i);
  });
  for (const [a, fr] of grupy) {
    const k = `${key}-${a}`;
    if (scene.anims.exists(k)) continue;
    const akcja = a.split('_')[0];
    const petla = akcja === 'stoi' || akcja === 'idzie' || akcja === 'lot';
    scene.anims.create({ key: k, frames: fr.map((f) => ({ key, frame: f })), frameRate: KLATKI_NA_S[akcja] ?? 6, repeat: petla ? -1 : 0 });
  }
}

/** Numer klatki po nazwie („lot_gora_1”). */
export function klatkaSmoka(g: GatunekId, nazwa: string) {
  return RYSUNKI_SMOKOW[g]?.klatki.indexOf(nazwa) ?? -1;
}

/** Czy jest animacja tej akcji w tym kierunku. */
export function maAnimacje(scene: Phaser.Scene, g: GatunekId, akcja: string, kier: string) {
  return scene.anims.exists(`${kluczSmoka(g)}-${akcja}_${kier}`);
}
