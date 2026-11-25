// ============================================================================
//  ŻYWIOŁY I ODPORNOŚCI (owner, 25 Nov 2026: „rób żywioły i odporności” – żeby gracz zmieniał sprzęt pod wroga)
//
//  Każdy cios i pocisk bohatera ma żywioł: zwykle `fizyczny` (miecz, strzała), czar różdżki to `magia`.
//  Inny żywioł daje: esencja wtarta w broń (alchemik), moc przedmiotu (Excalibur = światło, Gromowładny = piorun)
//  albo atak specjalny (Fala ognia = ogień, Łańcuch piorunów = piorun).
//  Wróg dostaje obrażenia × mnożnik z tabeli: < 1 odporny, > 1 słaby, 0 = całkiem odporny. Brak wpisu = 1.
//  Liczby to pierwsza próba, do zbalansowania.
// ============================================================================

import type { RodzajWroga } from './fabula';
import type { GatunekId } from './smoki';
import { tx } from '../i18n';

export type Zywiol = 'fizyczny' | 'ogien' | 'mroz' | 'piorun' | 'swiatlo' | 'magia';

export const ZYWIOLY: Record<Zywiol, { readonly nazwa: string; ikona: string; kolor: number }> = {
  fizyczny: { get nazwa() { return tx('Fizyczny', 'Physical'); }, ikona: '⚔', kolor: 0xd9d4c7 },
  ogien: { get nazwa() { return tx('Ogień', 'Fire'); }, ikona: '🔥', kolor: 0xff7a2e },
  mroz: { get nazwa() { return tx('Mróz', 'Frost'); }, ikona: '❄', kolor: 0x8fdcff },
  piorun: { get nazwa() { return tx('Piorun', 'Lightning'); }, ikona: '⚡', kolor: 0xfff06a },
  swiatlo: { get nazwa() { return tx('Światło', 'Light'); }, ikona: '☀', kolor: 0xfff3c4 },
  magia: { get nazwa() { return tx('Magia', 'Arcane'); }, ikona: '✦', kolor: 0xc79bff },
};

export type Odpornosci = Partial<Record<Zywiol, number>>;

/** Odporności zwykłych wrogów (rodzaj z ENEMY_KINDS). */
export const ODPORNOSCI: Partial<Record<RodzajWroga, Odpornosci>> = {
  // Chochliki to ogniste stworki: ogień je łaskocze, mróz boli.
  glut: { ogien: 0.5, mroz: 1.5 },
  wielki_glut: { ogien: 0.5, mroz: 1.5 },
  // Driada to drewno i liście.
  driada: { ogien: 1.75, mroz: 0.75 },
  // Nieumarli: światło i ogień ich palą, zimno im nie szkodzi.
  zombie: { ogien: 1.5, swiatlo: 1.5, mroz: 0 },
  szkielet: { fizyczny: 0.75, swiatlo: 2, mroz: 0 },
  upior: { fizyczny: 0.6, swiatlo: 2, magia: 1.25, mroz: 0.5 },
  // Woda: piorun przewodzi, ogień syczy i gaśnie, mróz ścina.
  blob: { piorun: 2, ogien: 0.5, mroz: 1.5 },
  wodnik: { piorun: 1.75, ogien: 0.5, mroz: 1.5 },
  // Mosiężny automat: twardy, ognia i mrozu się nie boi, piorun przepala mu tryby.
  koziol: { fizyczny: 0.8, ogien: 0.5, mroz: 0.5, piorun: 1.5 },
  // Zwierzęta w grubych futrach.
  wilk: { mroz: 0.5, ogien: 1.25 },
  warg: { mroz: 0.5, ogien: 1.25 },
};

/** Smoki według gatunku (wszystkie mają rodzaj `smok`). */
export const ODPORNOSCI_SMOKOW: Record<GatunekId, Odpornosci> = {
  ognisty: { ogien: 0, mroz: 1.5 },
  lesny: { ogien: 1.5, mroz: 0.75 },
  kwasowy: { piorun: 1.25, ogien: 0.75 },
  trujacy: { swiatlo: 1.5, magia: 0.75 },
  gorski: { fizyczny: 0.85, piorun: 0.5, mroz: 1.25 },
  cien: { swiatlo: 1.75, magia: 0.5 },
};

export function mnoznikZywiolu(o: Odpornosci | undefined, z: Zywiol) {
  return o?.[z] ?? 1;
}

/** Krótki dopisek przy liczbie obrażeń. */
export function opisMnoznika(m: number): string | null {
  if (m <= 0) return tx('NIEWRAŻLIWY', 'IMMUNE');
  if (m < 0.95) return tx('odporny', 'resists');
  if (m > 1.05) return tx('SŁABOŚĆ!', 'WEAK!');
  return null;
}

/** Słaby i odporny wróg w jednym zdaniu (dla podpowiedzi raz na sesję). */
export function opisOdpornosci(o: Odpornosci | undefined) {
  const slaby = Object.entries(o ?? {}).filter(([, m]) => m! > 1.05).map(([z]) => ZYWIOLY[z as Zywiol]);
  const odporny = Object.entries(o ?? {}).filter(([, m]) => m! < 0.95).map(([z]) => ZYWIOLY[z as Zywiol]);
  return { slaby, odporny };
}
