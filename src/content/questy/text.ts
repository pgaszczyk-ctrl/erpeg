import catalog from './catalog.json';
import legacy from './legacy.json';
import { lang, type Lang } from '../../i18n';

/** Metadata belongs to each translation, including response labels. */
export interface DialogueVariant { language: string; localHumor: boolean; text: string }
export interface DialogueText { id: string; variants: DialogueVariant[] }
const texts = new Map<string, DialogueText>([...catalog.texts, ...legacy].map(t => [t.id, t]));
export function questText(id: string, language: Lang = lang): string {
  const t = texts.get(id);
  if (!t) throw new Error(`Missing quest text: ${id}`);
  const v = t.variants.find(v => v.language === language);
  if (!v) throw new Error(`Missing ${language} quest text: ${id}`);
  return v.text;
}
export const questTextMetadata = (id: string) => texts.get(id);
const dictionary = new Map(legacy.map(t => [t.variants.find(v => v.language === 'pl')!.text, t.variants.find(v => v.language === 'en')!.text]));
/** Exact legacy matches only; IDs, names of actual places and game logic are never translated. */
export function legacyText(text: string): string { const localize = (line: string) => lang === 'en' ? dictionary.get(line) ?? line : [...dictionary].find(([,en]) => en === line)?.[0] ?? line; return localize(text).split('\n').map(localize).join('\n'); }

const common: Record<string, string> = {
  'Dalej':'Next', 'Dobrze':'All right', 'Do widzenia':'Goodbye', 'Przyjmuję':'Accept', 'Nie teraz':'Not now',
  'Dziękuję!':'Thank you!', 'Dziękujemy jeszcze raz za pomoc!':'Thanks again for your help!',
  'Później':'Later', 'Wyjdź':'Leave', 'Wrócę silniejszy':'I’ll return stronger', 'Dobrze! ':'Correct! ',
  'Muszę pomyśleć':'Let me think', 'Spróbuję jeszcze raz':'Try again',
};
for (const [pl, en] of Object.entries(common)) dictionary.set(pl,en);
export function dialogueMetadata(text: string): { localHumor: boolean; textId?: string } {
  for (const t of texts.values()) {
    const variant = t.variants.find(v => v.language === lang && v.text === text);
    if (variant) return { localHumor:variant.localHumor, textId:t.id };
  }
  return {localHumor:false};
}

/** Localise only fields which the player reads. Save IDs and map anchors are unchanged. */
export function translateMission<T extends import('../fabula').Misja>(mission: T): T {
  const translate = (stage: import('../fabula').Etap) => ({ ...stage,
    cel:legacyText(stage.cel),
    ...(stage.tekst ? {tekst:legacyText(stage.tekst)} : {}),
    ...(stage.komunikat ? {komunikat:legacyText(stage.komunikat)} : {}),
    ...(stage.pytanie ? {pytanie:legacyText(stage.pytanie)} : {}),
    ...(stage.podpowiedz ? {podpowiedz:legacyText(stage.podpowiedz)} : {}),
    ...(stage.odpowiedzi ? {odpowiedzi:stage.odpowiedzi.map(legacyText)} : {}),
  });
  return { ...mission, tytul:legacyText(mission.tytul), opis:legacyText(mission.opis), zakonczenie:legacyText(mission.zakonczenie),
    zadanie:translate(mission.zadanie), ...(mission.etapy ? {etapy:mission.etapy.map(translate)} : {}) };
}
