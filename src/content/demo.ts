// The demo started from QR codes (src/demo.ts, scenes/Demo.ts), since 18 Oct 2026 the way new players start:
// the name first (a real character is made at once), then a dream below Zamek Lubelski – eat apples, remember
// your name, beat the dragon in the castle wall's gap – and waking up in front of Targi Lublin is the real game.
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

/**
 * The dream: below Zamek Lubelski on the Lublin map (owner, 18 Oct 2026; it used to be Wawel in Kraków). Apple trees
 * south of the castle, the dragon in the gap of the castle's east (right-hand) wall – between the north wing and the
 * chapel, where OSM leaves the courtyard open.
 */
export const SEN = {
  /** Where the hero wakes up in the dream: on the slope south of the castle. */
  start: { lat: 51.24983, lon: 22.57235 },
  /** At the gap in the castle's east wall, on the grass just outside it (in the gap itself it stood on the chapel's roof). */
  smok: { lat: 51.25042, lon: 22.57335 },
  /** Fruit trees planted next to the start: how many, fruit on each, how far (m). */
  drzewa: { ile: 3, owocow: 3, odM: 10, doM: 24 },
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
  /** Metres of walking in the dream before the hero wakes up anyway, dragon fought or not (owner, 12 Oct 2026). */
  limitM: 1000,
  /** "Kliknij, żeby strącić owoce" shows over an apple tree this close to the hero (m). */
  podpowiedzM: 9,
  /** Best gear (equip slots of inventory.ts). */
  ekwipunek: { bron: 'rycerski', zbroja: 'kolczuga', helm: 'zelazny_helm', buty: 'zelazne_buty' },
};

/** Waking up in front of Targi Lublin: the real game starts there (no end after some metres any more, owner 18 Oct 2026). */
export const JAWA = {
  /** A newsboy stands on the round paved square in front of Targi Lublin, between its gas lamps (owner, 11 Oct 2026). */
  gazeciarz: { lat: 51.23464, lon: 22.56560 },
};

export const DEMO_TEKSTY = {
  formularzTytul: 'Jak masz na imię?',
  formularzStart: 'Zaczynamy!',
  formularzKonto: 'Nieobowiązkowo: zapisz postać na koncie, żeby wczytać ją na każdym urządzeniu.',
  przebudzenieTytul: '…',
  przebudzenie:
    'Gdzie ja jestem…? I kim ja właściwie jestem?\n\nZnam to miejsce… Te mury na wzgórzu… To Zamek Lubelski!\n\nBurczy mi w brzuchu. Obok rosną jabłonie… A ten miecz w ręku? Wygląda na porządny.',
  celZbierz: (masz: number, trzeba: number) => `Podejdź do jabłonki i kliknij, żeby strącić owoce (${masz}/${trzeba})`,
  /** Over the apple tree next to the hero. */
  podpowiedz: 'Kliknij, żeby strącić owoce',
  celZjedz: 'Zjedz jabłka – dotknij baniaka życia u dołu ekranu',
  jablka: 'Masz już dość jabłek. Zjedz je, żeby odzyskać siły – dotknij baniaka życia z jabłkiem.',
  /** Added on a computer (no touch screen). */
  jablkaKlawisz: ' Możesz też nacisnąć H.',
  olsnienie: 'OOooo, już wiem kim jestem!',
  imie: (imie: string) => `Jestem ${imie}!`,
  kimJestem: (imie: string) => `Nazywam się ${imie} i poluję na smoki! Jeden czai się przy wyłomie we wschodnim murze zamku.`,
  celSmok: 'Pokonaj smoka przy wyłomie w murze zamku!',
  smokPokonany: 'Smok pokonany! Ucieka w przestworza!',
  zaDaleko: 'Oczy same się zamykają… Ten sen zaraz się skończy.',
  pobudkaTytul: '💤 Pobudka',
  pobudka: (imie: string) => `To dopiero ekscytujący sen…\n\nJestem w Lublinie, na placu przed Targami Lublin. Smoki, zamki… Czas na prawdziwą przygodę, ${imie}!`,
  /** The short tutorial after waking up: where the hero's portrait is. */
  portret: (imie: string, konto: boolean) => konto
    ? `To Ty, ${imie}! Dotknij swojego portretu – tam jest Twój kufer i kod postaci.`
    : `To Ty, ${imie}! Dotknij swojego portretu – znajdziesz tam kod postaci i połączysz ją z kontem, żeby jej nie zgubić.`,
};

/** Where a character made right after the demo starts (owner 7.10.2026): the square in front of Targi Lublin, Dworcowa 11. */
export const PO_DEMO_START = { nazwa: 'Plac przed Targami Lublin', lat: 51.23471, lon: 22.56526 };

/** Set by the demo's end (localStorage): the next new character starts at PO_DEMO_START, no start address to choose. */
export const PO_DEMO_KLUCZ = 'exp-po-demo';
