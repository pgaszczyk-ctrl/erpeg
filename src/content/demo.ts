// The demo started from QR codes (src/demo.ts, scenes/Demo.ts): a stranger
// wakes up by Wawel, eats fruit, remembers who they are, fights the Wawel
// dragon, then wakes up in front of Targi Lublin and takes a few steps
// before the existing invitation to create a new character.
//
// Link: https://exp-lore.app/?d=<kod>. The codes say nothing on purpose;
// printed codes stay valid; their earlier destinations are retained below.

/** Where the hero wakes up after the dream: an address on our Lublin map, or any place on Earth (a world map). */
export type Pobudka =
  | { miasto: string; mapa: 'lublin'; adres: string }
  | { miasto: string; mapa: 'lublin'; lat: number; lon: number }
  | { miasto: string; lat: number; lon: number };

/** Existing QR registrations. Wake-up is now always PO_DEMO_START; never reuse a printed code. */
export const DEMO_KODY: Record<string, Pobudka> = {
  ShgD6aib8: { miasto: 'Lublin', mapa: 'lublin', lat: 51.248833, lon: 22.51734 },
};

/** The dream: by Wawel in Kraków (world map). */
export const SEN = {
  /** Where the hero wakes up in the dream (Planty below Wawel). */
  start: { lat: 50.0552, lon: 19.9352 },
  /** The Wawel dragon statue by the Vistula. */
  smok: { lat: 50.05318, lon: 19.93305 },
  /** Fruit trees planted next to the start: how many, fruit on each, how far (m). */
  drzewa: { ile: 3, owocow: 3, odM: 12, doM: 30 },
  /** Fruit eaten to heal one heart in the demo (the normal game needs 20). */
  owocowNaSerce: 5,
  /** Hero's experience in the dream (level 20). */
  exp: 19000,
  /** Health in ordinary sword blows; strong blows still do more damage. */
  ciosow: 18,
  /** Take flight after losing this many ordinary blows, even in close combat. */
  ciosyDoLotu: 2,
  /** Dragon attack timing/damage: medium, independently of the demo's forgiving controls. */
  trudnoscSmoka: 2,
  /** Best gear (equip slots of inventory.ts). */
  ekwipunek: { bron: 'rycerski', zbroja: 'kolczuga', helm: 'zelazny_helm', buty: 'zelazne_buty' },
};

/** A few actual steps before the existing invitation to create a character; no time limit. */
export const JAWA = { koniecM: 8, predkoscM: 2 };

export const DEMO_TEKSTY = {
  przebudzenieTytul: '…',
  przebudzenie:
    'Gdzie ja jestem…? I kim ja właściwie jestem?\n\nZnam to miejsce… Te mury na wzgórzu… Aha, to Wawel! Jestem w Krakowie.\n\nBurczy mi w brzuchu. Może znajdę tu coś do jedzenia… A ten miecz w ręku to co to? Wygląda na porządny.',
  celZbierz: (masz: number, trzeba: number) => `Zbierz owoce z drzew – uderz drzewo mieczem (${masz}/${trzeba})`,
  celZjedz: 'Zjedz jabłka – przycisk leczenia w prawym dolnym rogu (H)',
  jablkaTytul: '🍎 Zjedz zebrane jabłka',
  jablka: 'Masz już dość jabłek. Teraz trzeba je zjeść, żeby odzyskać siły.\n\nNaciśnij „Zjedz jabłka” albo użyj przycisku leczenia w prawym dolnym rogu ekranu (klawisz H).',
  olsnienie: 'OOooo, już wiem kim jestem!',
  kimJestem: 'Jestem pogromcą smoków! Smok wawelski znowu grasuje – czeka nad Wisłą.',
  celSmok: 'Pokonaj smoka wawelskiego!',
  smokPokonany: 'Smok pokonany! Ucieka w przestworza!',
  pobudkaTytul: '💤 Pobudka',
  pobudka: 'To dopiero ekscytujący sen…\n\nJestem w Lublinie, na placu przed Targami Lublin. Przejdę kilka kroków i rozejrzę się.',
  koniec: 'Stwórz nową postać',
  koniecPodpis: 'Zacznij własną przygodę. Za darmo, nawet bez konta.',
};

/** Where a character made right after the demo starts (owner 7.10.2026): the square in front of Targi Lublin, Dworcowa 11. */
export const PO_DEMO_START = { nazwa: 'Plac przed Targami Lublin', lat: 51.23471, lon: 22.56526 };

/** Set by the demo's end (localStorage): the next new character starts at PO_DEMO_START, no start address to choose. */
export const PO_DEMO_KLUCZ = 'exp-po-demo';
