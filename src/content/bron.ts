import { PRZEDMIOTY, type Przedmiot } from './przedmioty';

/** Persistent numeric settings use the existing authenticated admin RPC.
 * A range is one integer, so saving can never publish half of a min/max pair. */
export const BRON_BONUS = { poziom: .02, wyszkolenie: .06 };
export const bronie = () => PRZEDMIOTY.filter(p => p.miejsce === 'bron').sort((a, b) =>
  (a.baza ?? a.id).localeCompare(b.baza ?? b.id) || (a.jakosc ?? 0) - (b.jakosc ?? 0));
export const kluczTrwalosci = (id: string) => `bron_${id}_trwalosc`;
export const kluczBroni = (id: string) => `bron_${id}_zakres`;
export function kodujZakres(min: number, max: number) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > 10000) throw new Error('Obrażenia: liczby całkowite od 1 do 10000; minimum nie większe od maksimum.');
  return min * 10001 + max;
}
const trwalosc = new Map(bronie().map(p => [p.id, p.wytrzymalosc]));
const bazowe = new Map(bronie().map(p => [p.id, p.obrazenia && [...p.obrazenia] as [number, number]]));
export function ustawBronie(values: Record<string, number>) {
  for (const p of bronie()) {
    const life = values[kluczTrwalosci(p.id)];
    if (Number.isInteger(life) && life >= 1 && life <= 1000000) p.wytrzymalosc = life;
    else {
      const base = trwalosc.get(p.id), multiplier = Number.isFinite(values.wytrzymalosc_mnoznik) ? Math.max(.1, Math.min(20, values.wytrzymalosc_mnoznik)) : 1;
      p.wytrzymalosc = base ? Math.max(1, Math.round(base * (p.szklany ? 1 : multiplier))) : undefined;
    }
    const n = values[kluczBroni(p.id)];
    const min = Math.floor(n / 10001), max = n % 10001;
    p.obrazenia = Number.isInteger(n) && min >= 1 && max >= min && max <= 10000
      ? [min, max] : bazowe.get(p.id)?.slice() as [number, number] | undefined;
  }
}
export function obrazeniaBroni(p: Przedmiot, poziom: number, wyszkolenie: number, los?: () => number) {
  if (!p.obrazenia) return null;
  const [min, max] = p.obrazenia;
  const baza = los ? min + Math.min(max - min, Math.floor(Math.max(0, los()) * (max - min + 1))) : (min + max) / 2;
  return baza * (1 + BRON_BONUS.poziom * Math.max(0, poziom - 1) + BRON_BONUS.wyszkolenie * Math.max(0, wyszkolenie));
}
