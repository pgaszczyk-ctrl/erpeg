// The demo started from QR codes (src/demo.ts, scenes/Demo.ts): a stranger
// wakes up by Wawel, eats fruit, remembers who they are, fights the Wawel
// dragon, then wakes up for real where the QR code sends them and walks
// around for a while before "Zacznij własną przygodę".
//
// Link: https://exp-lore.app/?d=<kod>. The codes say nothing on purpose;
// each one sends the hero to a different real place (the table below).

/** Where the hero wakes up after the dream: an address on our Lublin map, or any place on Earth (a world map). */
export type Pobudka =
  | { miasto: string; mapa: 'lublin'; adres: string }
  | { miasto: string; mapa: 'lublin'; lat: number; lon: number }
  | { miasto: string; lat: number; lon: number };

/** QR codes: code → where the hero wakes up. Printed codes must keep working, so never reuse or change a code. */
export const DEMO_KODY: Record<string, Pobudka> = {
  ShgD6aib8: { miasto: 'Lublin', mapa: 'lublin', lat: 51.248833, lon: 22.51734 },
};

/** Names given at random to the demo hero. */
export const DEMO_IMIONA = ['Felicja', 'Gustaw', 'Leonardo'];

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
  /** Sword blows that beat the dragon (how it fights: SMOK in objects/Dragon.ts). */
  ciosow: 6,
  /** Best gear (equip slots of inventory.ts). */
  ekwipunek: { bron: 'rycerski', zbroja: 'kolczuga', helm: 'zelazny_helm', buty: 'zelazne_buty' },
};

/** After waking up: a walk without a timer; past `koniecM` from where the hero woke up the demo ends, and nobody gets further than `granicaM`. */
export const JAWA = { koniecM: 500, granicaM: 1000 };

export const DEMO_TEKSTY = {
  przebudzenieTytul: '…',
  przebudzenie:
    'Gdzie ja jestem…? I kim ja właściwie jestem?\n\nZnam to miejsce… Te mury na wzgórzu… Aha, to Wawel! Jestem w Krakowie.\n\nBurczy mi w brzuchu. Może znajdę tu coś do jedzenia… A ten miecz w ręku to co to? Wygląda na porządny.',
  celZbierz: (masz: number, trzeba: number) => `Zbierz owoce z drzew – uderz drzewo mieczem (${masz}/${trzeba})`,
  celZjedz: 'Zjedz owoce – przycisk 🍎 pod bohaterem (klawisz H)',
  olsnienie: 'OOooo, już wiem kim jestem!',
  kimJestem: (imie: string) => `Jestem ${imie}, pogromca smoków! Smok wawelski znowu grasuje – czeka nad Wisłą.`,
  celSmok: 'Pokonaj smoka wawelskiego!',
  smokPokonany: 'Smok pokonany!',
  pobudkaTytul: '💤 Pobudka',
  pobudka: (miasto: string) => `To dopiero ekscytujący sen…\n\nDobrze znowu być w domu. ${miasto} – tu wszystko wygląda znajomo. Rozejrzę się po okolicy.`,
  koniec: 'Zacznij własną przygodę',
  koniecPodpis: 'Za darmo, nawet bez konta.',
};

/** Where a character made right after the demo starts (owner 7.10.2026): the square in front of Targi Lublin, Dworcowa 11. */
export const PO_DEMO_START = { nazwa: 'Plac przed Targami Lublin', lat: 51.23471, lon: 22.56526 };

/** Set by the demo's end (localStorage): the next new character starts at PO_DEMO_START, no start address to choose. */
export const PO_DEMO_KLUCZ = 'exp-po-demo';
