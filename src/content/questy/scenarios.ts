import catalog from './catalog.json';
import runtime from './runtime.json';
import { questText } from './text';
import { lang, tx } from '../../i18n';
import type { Etap, Misja, Miejsce } from '../fabula';

export interface QuestResult { originMap: string; choices: Record<string, string>; routeM: number; reading?: number }
export interface CityBinding {
  version: 1;
  mapId: string;
  mapName: string;
  giverName: string;
  anchors: Exclude<Miejsce, string>[];
  choices: Record<string, string>;
  routeM: number;
}
export const CITY_SCENARIOS = runtime;
export function scenarioPending(id: string, states: Record<string, string>, taken: Record<string, Misja>) {
  // A character owns one scenario instance across ALL cities and logins.
  return !['active', 'goal', 'done'].includes(states[id]) && !taken[id];
}
export function materializeScenario(id: string, binding: CityBinding): Misja {
  const definition = runtime.find(q => q.id === id);
  const authored = catalog.quests.find(q => q.id === id);
  if (!definition || !authored || binding.anchors.length < definition.anchorCount) throw new Error(`Invalid city scenario: ${id}`);
  const stages: Etap[] = definition.stages.map(stage => {
    // Runtime data stores text references, never language-dependent answer IDs.
    const s = stage as unknown as Record<string, unknown>;
    const out = { ...s, dialogueMeta:{language:lang,localHumor:false}, miejsce: binding.anchors[s.anchor as number] } as unknown as Etap;
    for (const field of ['cel', 'tekst', 'pytanie', 'podpowiedz'] as const) if (typeof s[field] === 'string') out[field] = questText(s[field] as string);
    if (Array.isArray(s.odpowiedzi)) out.odpowiedzi = (s.odpowiedzi as string[]).map(ref => questText(ref));
    if (Array.isArray(s.opcje)) out.opcje = (s.opcje as NonNullable<Etap['opcje']>).map(o => ({ ...o, tekst: questText(o.tekst), wynik: questText(o.wynik) }));
    delete (out as unknown as Record<string, unknown>).anchor;
    return out;
  });
  return {
    id, scenariusz: binding, adres: `${binding.giverName} · ${binding.mapName}`,
    postac: { imie: tx('Pomocnik z warsztatu', 'Workshop helper') },
    tytul: questText(authored.textRefs.title), opis: questText(authored.textRefs.offer),
    zadanie: stages[0], etapy: stages, zakonczenie: questText(authored.textRefs.finish),
    // Small ordinary rewards, no premium currency, items or shop-price changes.
    nagroda: 10, doswiadczenie: 20, naMiejscu: true,
    wymaga: definition.requires.length ? { misje: definition.requires } : undefined,
  };
}
export function restoreScenario(m: Misja): Misja {
  if (!m.scenariusz) return m;
  try { return materializeScenario(m.id, m.scenariusz); } catch { return m; } // retain unknown future/legacy data
}
