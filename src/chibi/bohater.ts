// Which hero figure a scene shows: the code-drawn chibi (default), the 3D model (`?chibi=0`), or the drawn sheet.
import type Phaser from 'phaser';
import { Ludzik3D, ludzik3d } from '../ludzik3d';
import { LudzikChibi, chibi } from './LudzikChibi';

export type Bohater = Ludzik3D | LudzikChibi;

export function nowyBohater(scene: Phaser.Scene, opcje: { klucz?: string; skala?: number } = {}): Bohater | undefined {
  if (chibi()) return new LudzikChibi(scene, opcje);
  if (ludzik3d()) return new Ludzik3D(scene, opcje);
  return undefined;
}
