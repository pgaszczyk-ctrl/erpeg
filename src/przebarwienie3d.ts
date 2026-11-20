// Kolory postaci 3D (właściciel, 20.11.2026: „zostaniemy przy obecnych modelach, tylko je odrobinę przypicujemy”;
// raport: wszyscy wyglądają tak samo). Model strażnika ma jedną paletę wierzchołków: granatowy mundur, szare spodnie,
// brązowe włosy, jasną skórę. Każda postać dostaje własne kolory z wyglądu (look.modul: s skóra, w włosy, u mundur,
// u2 spodnie – te same, co portret w HUD), z zachowaniem cieniowania każdego wierzchołka. Mosiądz, hełm, buty i broń
// zostają bez zmian. Bez Phasera.
import type * as THREE from 'three';
import { SKORY_MODUL, WLOSY_MODUL, UBRANIA_MODUL } from './content/modul';

export interface KoloryPostaci { s: number; w: number; u: number; u2: number }

type Klasa = 'skora' | 'wlosy' | 'mundur' | 'spodnie';
/** Jasność wzorcowa każdej klasy w palecie modelu (HSL L) – wierzchołek ciemniejszy od niej zostaje ciemniejszy. */
const WZOR: Record<Klasa, number> = { skora: 0.775, wlosy: 0.25, mundur: 0.21, spodnie: 0.24 };
/** Mundur i spodnie nieco przygaszone, żeby zostały „mundurem”, a nie kostiumem. */
const SILA: Record<Klasa, number> = { skora: 1, wlosy: 1, mundur: 0.82, spodnie: 0.7 };

function hsl(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return { h, s, l };
}

/** Which part of the palette a vertex colour belongs to (null = keep: brass, steel, leather, weapon). */
function klasa(czesc: string, r: number, g: number, b: number): Klasa | null {
  const { h, s, l } = hsl(r, g, b);
  if (h >= 0.04 && h <= 0.11 && s > 0.45 && l > 0.6) return 'skora';
  if (czesc === 'head' && h <= 0.08 && s > 0.45 && l > 0.12 && l < 0.45) return 'wlosy';
  if (/^(core|upper|fore)/.test(czesc) && h >= 0.55 && h <= 0.7 && l < 0.36) return 'mundur';
  if (/^thigh/.test(czesc) && l < 0.4) return 'spodnie';
  return null;
}

/** Recolours one mesh's vertex colours in place (call on a geometry owned by this model only). */
export function przebarwGeometrie(geo: THREE.BufferGeometry, czesc: string, k: KoloryPostaci) {
  const attr = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!attr) return;
  const cel: Record<Klasa, [number, number, number]> = {
    skora: SKORY_MODUL[k.s % SKORY_MODUL.length], wlosy: WLOSY_MODUL[k.w % WLOSY_MODUL.length],
    mundur: UBRANIA_MODUL[k.u % UBRANIA_MODUL.length], spodnie: UBRANIA_MODUL[k.u2 % UBRANIA_MODUL.length],
  };
  for (let i = 0; i < attr.count; i++) {
    const r = attr.getX(i), g = attr.getY(i), b = attr.getZ(i);
    const kl = klasa(czesc, r, g, b);
    if (!kl) continue;
    const t = cel[kl], tl = hsl(t[0] / 255, t[1] / 255, t[2] / 255).l || 0.5;
    // Shading kept: the vertex's lightness against its class's reference, applied to the target colour.
    const f = (hsl(r, g, b).l / WZOR[kl]) * SILA[kl] * (kl === 'skora' ? 1 : Math.min(1.6, 0.42 / tl + 0.4));
    attr.setXYZ(i, Math.min(1, (t[0] / 255) * f), Math.min(1, (t[1] / 255) * f), Math.min(1, (t[2] / 255) * f));
  }
  attr.needsUpdate = true;
}

/** Every mesh of a model (its geometries are cloned first, so a shared file isn't changed). */
export function przebarwModel(root: THREE.Object3D, k: KoloryPostaci) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (/weapon|sword/i.test(m.name) || /weapon|sword/i.test(m.parent?.name ?? '')) return;
    m.geometry = m.geometry.clone();
    przebarwGeometrie(m.geometry, m.name, k);
  });
}

/** Colours of a character: its modular look, else a stable pick from the name. */
export function koloryZWygladu(modul: { s?: number; w?: number; u?: number; u2?: number } | undefined, imie: string): KoloryPostaci {
  if (modul && typeof modul.u === 'number') return { s: modul.s ?? 0, w: modul.w ?? 0, u: modul.u, u2: modul.u2 ?? 5 };
  let h = 2166136261;
  for (const ch of imie) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h >>>= 0;
  return { s: h % 3, w: (h >>> 3) % WLOSY_MODUL.length, u: (h >>> 7) % UBRANIA_MODUL.length, u2: 5 };
}
