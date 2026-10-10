import catalog from './catalog.json';
import runtime from './runtime.json';
import { questText, translateMission, dialogueMetadata } from './text';
import { lang, tx } from '../../i18n';
import type { Etap, Misja, Miejsce } from '../fabula';

export interface QuestResult { originMap: string; choices: Record<string, string>; routeM: number; reading?: number }
export interface CityBinding {
  version: 1;
  revision?: 2;
  mapId: string;
  mapName: string;
  giverName: string;
  anchors: Exclude<Miejsce, string>[];
  choices: Record<string, string>;
  routeM: number;
}
// Withdrawn by the owner on 10 Oct 2026. Keep definitions only to read existing saves.
const withdrawnCityQuestIds = new Set([
  'quest.clock_opinion', 'quest.postman_stamp', 'quest.sleepy_guardian', 'quest.two_seals',
  'quest.tea_map', 'quest.flask_guardian', 'quest.garden_wheels', 'quest.noisy_neighbours',
  'quest.pact_pages', 'quest.core_trip', 'quest.helper_workshop', 'quest.old_sign_new_note',
]);
export function isWithdrawnCityQuest(id: string) { return withdrawnCityQuestIds.has(id); }
export const CITY_SCENARIOS = runtime.filter(q => !isWithdrawnCityQuest(q.id));
export function scenarioPending(id: string, states: Record<string, string>, taken: Record<string, Misja>) {
  // A character owns one scenario instance across ALL cities and logins.
  return !isWithdrawnCityQuest(id) && !['active', 'goal', 'done'].includes(states[id]) && !taken[id];
}
export function materializeScenario(id: string, binding: CityBinding): Misja {
  const definition = runtime.find(q => q.id === id);
  const authored = catalog.quests.find(q => q.id === id);
  if (!definition || !authored || binding.anchors.length < definition.anchorCount) throw new Error(`Invalid city scenario: ${id}`);
  const compile = (s: Record<string, unknown>): Etap => {
    const out = { ...s, dialogueMeta:{language:lang,localHumor:false},
      ...(typeof s.anchor === 'number' ? {miejsce:binding.anchors[s.anchor]} : {}) } as unknown as Etap;
    for (const field of ['cel', 'tekst', 'pytanie', 'podpowiedz', 'komunikat'] as const)
      if (typeof s[field] === 'string') out[field] = questText(s[field] as string);
    if (out.tekst || out.pytanie) out.dialogueMeta = {language:lang,...dialogueMetadata(out.tekst || out.pytanie!)};
    if (Array.isArray(s.odpowiedzi)) out.odpowiedzi = (s.odpowiedzi as string[]).map(ref => questText(ref));
    if (Array.isArray(s.opcje)) out.opcje = (s.opcje as NonNullable<Etap['opcje']>).map(o => ({ ...o, tekst: questText(o.tekst), wynik: questText(o.wynik) }));
    if (Array.isArray(s.karty)) out.karty = (s.karty as NonNullable<Etap['karty']>).map(c => ({...c,tekst:questText(c.tekst)}));
    if (Array.isArray(s.tropy)) out.tropy = (s.tropy as {id:string;anchor:number;tytul:string;tekst:string}[]).map(c => ({id:c.id,miejsce:binding.anchors[c.anchor],tytul:questText(c.tytul),tekst:questText(c.tekst)}));
    if (Array.isArray(s.warianty)) out.warianty = (s.warianty as {klucz:string;wartosc:string;etap:Record<string,unknown>}[]).map(v => ({...v,etap:compile(v.etap)}));
    delete (out as unknown as Record<string, unknown>).anchor;
    return out;
  };
  const stages = definition.stages.map(stage => compile(stage as unknown as Record<string,unknown>));
  binding.revision = 2;
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
  // Accepted revision 1 missions retain their original stages and answers, even when content changes.
  if (!m.scenariusz.revision) return translateMission(m);
  try { return materializeScenario(m.id, m.scenariusz); } catch { return m; } // retain unknown future/legacy data
}
