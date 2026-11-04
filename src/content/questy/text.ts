import catalog from './catalog.json';
import legacy from './legacy.json';
import extras from './legacyExtras.json';
import { lang, type Lang } from '../../i18n';

/** Metadata belongs to each translation, including response labels. */
export interface DialogueVariant { language: string; localHumor: boolean; text: string }
export interface DialogueText { id: string; variants: DialogueVariant[] }
const texts = new Map<string, DialogueText>([...catalog.texts, ...legacy, ...extras].map(t => [t.id, t]));
export function questText(id: string, language: Lang = lang): string {
  const t = texts.get(id);
  if (!t) throw new Error(`Missing quest text: ${id}`);
  const v = t.variants.find(v => v.language === language);
  if (!v) throw new Error(`Missing ${language} quest text: ${id}`);
  return v.text;
}
export const questTextMetadata = (id: string) => texts.get(id);
const dictionary = new Map([...catalog.texts, ...legacy, ...extras].map(t => [t.variants.find(v => v.language === 'pl')!.text, t.variants.find(v => v.language === 'en')!.text]));
const escape = (s:string) => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates = [...dictionary].filter(([pl])=>/\{\w+\}/.test(pl)).flatMap(([pl,en])=>[
  {source:pl,target:en,language:'en'}, {source:en,target:pl,language:'pl'},
]).map(t=>{
  const names=[...t.source.matchAll(/\{(\w+)\}/g)].map(m=>m[1]);
  return {...t,names,pattern:new RegExp('^'+t.source.split(/\{\w+\}/).map(escape).join('(.+?)')+'$')};
});
/** Translate known templates, leaving real names/addresses and all save IDs intact. */
export function legacyText(text: string): string {
  const localize = (line: string) => {
    const exact=lang==='en' ? dictionary.get(line) : [...dictionary].find(([,en])=>en===line)?.[0];
    if(exact)return exact;
    for(const t of templates) {
      if(t.language!==lang)continue;
      const match=t.pattern.exec(line);
      if(!match)continue;
      const values=Object.fromEntries(t.names.map((name,i)=>[name,match[i+1]]));
      if(values.towar && lang==='en') values.towar=({'grzyby':'mushrooms','grzybów':'mushrooms','kawałki drewna':'pieces of wood','kawałków drewna':'pieces of wood'} as Record<string,string>)[values.towar] ?? values.towar;
      if(values.towar && lang==='pl') {
        const n=Number(values.ile),few=n%10>=2 && n%10<=4 && (n%100<12 || n%100>14);
        values.towar=({'mushrooms':few?'grzyby':'grzybów','pieces of wood':few?'kawałki drewna':'kawałków drewna'} as Record<string,string>)[values.towar] ?? values.towar;
      }
      return t.target.replace(/\{(\w+)\}/g,(_,name:string)=>values[name]);
    }
    return line;
  };
  return localize(text).split('\n').map(localize).join('\n');
}

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
  const translate = (stage: import('../fabula').Etap): import('../fabula').Etap => {
    const source=stage.tekst || stage.pytanie || stage.cel, localized=legacyText(source), meta=dialogueMetadata(localized);
    return { ...stage,
    dialogueMeta:{language:localized!==source || meta.textId ? lang : stage.dialogueMeta?.language ?? lang,localHumor:meta.textId ? meta.localHumor : stage.dialogueMeta?.localHumor ?? false},
    cel:legacyText(stage.cel),
    ...(stage.tekst ? {tekst:legacyText(stage.tekst)} : {}),
    ...(stage.komunikat ? {komunikat:legacyText(stage.komunikat)} : {}),
    ...(stage.pytanie ? {pytanie:legacyText(stage.pytanie)} : {}),
    ...(stage.podpowiedz ? {podpowiedz:legacyText(stage.podpowiedz)} : {}),
    ...(stage.odpowiedzi ? {odpowiedzi:stage.odpowiedzi.map(legacyText)} : {}),
    ...(stage.opcje ? {opcje:stage.opcje.map(o=>({...o,tekst:legacyText(o.tekst),wynik:legacyText(o.wynik)}))} : {}),
    ...(stage.pytania ? {pytania:stage.pytania.map(q=>({...q,pytanie:legacyText(q.pytanie),odpowiedzi:q.odpowiedzi.map(legacyText)}))} : {}),
    ...(stage.strony ? {strony:stage.strony.map(p=>({...p,tekst:legacyText(p.tekst),wybory:p.wybory?.map(w=>({...w,tekst:legacyText(w.tekst)}))}))} : {}),
    ...(stage.tropy ? {tropy:stage.tropy.map(c=>({...c,tytul:legacyText(c.tytul),tekst:legacyText(c.tekst)}))} : {}),
    ...(stage.karty ? {karty:stage.karty.map(c=>({...c,tekst:legacyText(c.tekst)}))} : {}),
    ...(stage.warianty ? {warianty:stage.warianty.map(v=>({...v,etap:translate({...stage,warianty:undefined,...v.etap})}))} : {}),
  };};
  return { ...mission, tytul:legacyText(mission.tytul), opis:legacyText(mission.opis), zakonczenie:legacyText(mission.zakonczenie),
    zadanie:translate(mission.zadanie), ...(mission.etapy ? {etapy:mission.etapy.map(translate)} : {}) };
}
