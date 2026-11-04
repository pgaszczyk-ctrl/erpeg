import { PRZEDMIOTY, type Przedmiot } from './przedmioty';

export const jestPancerzem = (p: Przedmiot) => ['zbroja', 'helm', 'buty'].includes(p.miejsce);
export const pancerze = () => PRZEDMIOTY.filter(jestPancerzem).sort((a, b) =>
  (a.baza ?? a.id).localeCompare(b.baza ?? b.id) || (a.jakosc ?? 0) - (b.jakosc ?? 0));
export const kluczPancerza = (id: string) => `pancerz_${id}`;
const domyslne = new Map(pancerze().map(p => [p.id, p.moc]));
export function ustawPancerze(values: Record<string, number>) {
  for (const p of pancerze()) {
    const n = values[kluczPancerza(p.id)];
    p.moc = Number.isInteger(n) && n >= 0 && n <= 10000 ? n : domyslne.get(p.id)!;
  }
}
/** Work in the caller's units, before its fractional-heart accumulator.
 * Armour never cancels a positive hit. Magic/poison bypass it. */
export function poPancerzu(obrazenia: number, pancerz: number, fizyczne = true) {
  return Math.max(0, obrazenia) * (fizyczne ? 30 / (30 + Math.max(0, pancerz)) : 1);
}

/** One armour drop at most; admin loot tables replace this fallback. */
export function losujPancerz(los: () => number, jakosc: (los: () => number) => number): string | null {
  if (los() >= .12) return null;
  const rodziny = ['skorzana_zbroja', 'skorzany_helm', 'skorzane_buty'];
  const id = rodziny[Math.min(2, Math.floor(Math.max(0, los()) * 3))];
  const q = jakosc(los);
  return q === 1 ? id : `${id}_jakosc${q}`;
}
