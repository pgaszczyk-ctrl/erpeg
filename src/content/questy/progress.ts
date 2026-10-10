import type { Etap, Misja } from '../fabula';

/** Stable keys keep partial investigations and card arrangements across saves and languages. */
export const progressKey = (stage: number, kind: 'clues' | 'cards') => `${kind}:${stage}`;
export function readProgress(choices: Record<string, string>, key: string, allowed: string[]) {
  return [...new Set((choices[key] ?? '').split(',').filter(id => allowed.includes(id)))];
}
export function effectiveStage(m: Misja, index: number): Etap {
  const base: Etap = m.etapy?.length ? m.etapy[index] : m.zadanie;
  const choices = m.scenariusz?.choices ?? {};
  const variant = base.warianty?.find(v => choices[v.klucz] === v.wartosc);
  return variant ? { ...base, ...variant.etap } : base;
}
export function addClue(choices: Record<string, string>, key: string, allowed: string[], id: string) {
  const found = readProgress(choices, key, allowed);
  if (allowed.includes(id) && !found.includes(id)) found.push(id);
  choices[key] = found.join(',');
  return found;
}
export function missionNotes(m: Misja) {
  return (m.etapy ?? []).flatMap((stage,index) => {
    const found=readProgress(m.scenariusz?.choices ?? {},progressKey(index,'clues'),(stage.tropy ?? []).map(c=>c.id));
    return (stage.tropy ?? []).filter(c=>found.includes(c.id)).map(c=>`${c.tytul}: ${c.tekst}`);
  }).join('\n');
}
/** Reject invalid/duplicate picks; only a correct prefix is persisted. */
export function arrangeCard(choices: Record<string, string>, key: string, order: string[], id: string) {
  let prefix = readProgress(choices, key, order);
  if (prefix.some((v, i) => v !== order[i])) prefix = [];
  const correct = id === order[prefix.length];
  choices[key] = correct ? [...prefix, id].join(',') : '';
  return { correct, complete: correct && prefix.length + 1 === order.length };
}
