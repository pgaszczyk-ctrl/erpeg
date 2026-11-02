// Notes pinned to the city boards (owner, 2 Nov 2026: „kartka z questem przybita gwoździem”, one note per board per
// day, made when the board is opened). Draft texts for the owner's approval – few on purpose: the earlier quest
// generator was „zbyt chaotyczny”. Generator: src/tablice/kartki.ts. Placeholders: {miejsce} (where to go – a park,
// forest, cemetery or address), {zleca} (who pays – usually left to the note's own „Zgłoś się po zapłatę” line), {ile} (how many things).
import type { Txt } from '../i18n';

/** Tunables (distances in metres). */
export const KARTKI = {
  /** Who gives the note: a public place this far from the board (looked for farther if none). */
  zleceniodawcaM: [100, 400] as [number, number],
  zleceniodawcaDalejM: 900,
  /** Kinds of places that may give a note. */
  zleceniodawcy: ['library', 'church', 'office', 'school', 'university', 'hotel', 'bank', 'police', 'hospital'],
  /** How far the job sends the hero, per kind. */
  polowanieM: [300, 1800] as [number, number],
  dostawaM: [300, 1500] as [number, number],
  zbieranieDoM: 2000,
  /** Monsters to drive away. */
  ilePotworow: [3, 5] as [number, number],
  /** Scouting an odd place: how far, clues round it (of which `tropowTrzeba` must be seen), how often something lurks there. */
  zwiadM: [300, 2500] as [number, number],
  tropy: 3,
  tropowTrzeba: 2,
  tropyPromienM: [12, 26] as [number, number],
  zwiadZasadzka: 0.4,
  /** Patrol: a path or river bank this far, checkpoints this far apart along it, and an ambush at the end now and then. */
  patrolM: [200, 1500] as [number, number],
  patrolPunkty: 4,
  patrolOdstepM: 90,
  patrolZasadzka: 0.5,
  /** Pay for scouting/patrols: base + per 100 m of the way there. */
  nagrodaZwiad: 25,
  nagrodaPatrol: 20,
};

/** The look of the paper: plain torn, wanted poster, official with a stamp, old yellowed. */
export type RodzajKartki = 'zwykla' | 'gonczy' | 'urzedowa' | 'stara';

export interface WzorKartki {
  tytul: Txt;
  tresc: Txt;
  /** Short goal line (HUD/quest log). */
  cel: Txt;
  /** What the giver says when paying. */
  koniec: Txt;
}

export const WZORY_KARTEK: Record<'polowanie' | 'dostawa' | 'zbieranie', WzorKartki[]> = {
  polowanie: [
    {
      tytul: { pl: 'Poszukiwany pogromca!', en: 'Monster slayer wanted!' },
      tresc: {
        pl: 'W okolicy: {miejsce} zalęgły się stwory i straszą przechodniów. Kto je przegoni, dostanie zapłatę.',
        en: 'Creatures have nested around {miejsce} and scare passers-by. Whoever drives them away will be paid.',
      },
      cel: { pl: 'Przegoń stwory: {miejsce}', en: 'Drive the creatures away: {miejsce}' },
      koniec: { pl: 'Słyszeliśmy, że w okolicy znów spokojnie. Dziękujemy!', en: 'We hear it is quiet there again. Thank you!' },
    },
    {
      tytul: { pl: 'Ogłoszenie straży miejskiej', en: 'Town watch notice' },
      tresc: {
        pl: 'Straż nie ma rąk do pracy. Potrzebny ochotnik, który oczyści teren: {miejsce}.',
        en: 'The watch is short of hands. A volunteer is needed to clear {miejsce}.',
      },
      cel: { pl: 'Oczyść teren: {miejsce}', en: 'Clear the area: {miejsce}' },
      koniec: { pl: 'Teren czysty? Wspaniale. Oto, co się należy.', en: 'Area cleared? Splendid. Here is what you are owed.' },
    },
  ],
  dostawa: [
    {
      tytul: { pl: 'Pilna przesyłka', en: 'Urgent parcel' },
      tresc: {
        pl: 'Szukam kogoś, kto zaniesie paczkę pod adres: {miejsce}. Po doręczeniu wróć po zapłatę.',
        en: 'Looking for someone to carry a parcel to {miejsce}. Come back for your pay once it is delivered.',
      },
      cel: { pl: 'Zanieś paczkę: {miejsce}', en: 'Deliver the parcel: {miejsce}' },
      koniec: { pl: 'Doszła cała? Dziękuję, to dla ciebie.', en: 'Arrived in one piece? Thank you, this is for you.' },
    },
    {
      tytul: { pl: 'List do doręczenia', en: 'Letter to deliver' },
      tresc: {
        pl: 'Zapieczętowany list czeka na posłańca. Adresat mieszka pod adresem: {miejsce}.',
        en: 'A sealed letter awaits a messenger. It goes to {miejsce}.',
      },
      cel: { pl: 'Doręcz list: {miejsce}', en: 'Deliver the letter: {miejsce}' },
      koniec: { pl: 'List doręczony – zuch! Proszę, twoja zapłata.', en: 'Letter delivered – well done! Here is your pay.' },
    },
  ],
  zbieranie: [
    {
      tytul: { pl: 'Skup grzybów', en: 'Buying mushrooms' },
      tresc: {
        pl: 'Kupię {ile} z pobliskiego lasu.',
        en: 'Will buy {ile} from the nearby forest.',
      },
      cel: { pl: 'Przynieś {ile}', en: 'Bring {ile}' },
      koniec: { pl: 'Pachną lasem! Dziękuję.', en: 'They smell of the forest! Thank you.' },
    },
    {
      tytul: { pl: 'Potrzebne drewno', en: 'Wood needed' },
      tresc: {
        pl: 'Na zimę brakuje opału. Kto przyniesie {ile}, dostanie zapłatę. (Drewno da tylko drzewo ścięte siekierą – bez niej leci chrust.)',
        en: 'We are short of firewood for winter. Bring {ile} and be paid. (Only a tree felled with an axe gives wood – without one you get brushwood.)',
      },
      cel: { pl: 'Przynieś {ile}', en: 'Bring {ile}' },
      koniec: { pl: 'Będzie czym palić. Dziękujemy!', en: 'Now we have something to burn. Thank you!' },
    },
  ],
};

/** Odd places (scripts/tablice/osobliwosci.mjs, world.ts rodzajOsobliwosci): what the note calls them. */
export const RODZAJE_OSOBLIWOSCI: Record<string, { pl: string; en: string; wrog: 'glut' | 'szkielet' | 'driada' }> = {
  ruiny: { pl: 'ruiny', en: 'the ruins', wrog: 'szkielet' },
  opuszczony: { pl: 'opuszczony budynek', en: 'the abandoned building', wrog: 'glut' },
  stanowisko: { pl: 'stanowisko archeologiczne', en: 'the dig site', wrog: 'szkielet' },
  fort: { pl: 'stary fort', en: 'the old fort', wrog: 'szkielet' },
  zabytek: { pl: 'zabytek techniki', en: 'the old machinery', wrog: 'glut' },
  wieza: { pl: 'wieża ciśnień', en: 'the water tower', wrog: 'glut' },
  wiatrak: { pl: 'stary wiatrak', en: 'the old windmill', wrog: 'glut' },
  mlyn: { pl: 'stary młyn', en: 'the old mill', wrog: 'glut' },
  gazometr: { pl: 'gazometr', en: 'the gasholder', wrog: 'glut' },
  komin: { pl: 'stary komin', en: 'the old chimney', wrog: 'glut' },
  kapliczka: { pl: 'przydrożna kapliczka', en: 'the wayside shrine', wrog: 'szkielet' },
  widok: { pl: 'punkt widokowy', en: 'the viewpoint', wrog: 'driada' },
};

/** Scouting an odd place: the note (a scientific society or the watch wants to know what goes on there). */
export const WZORY_ZWIADU: WzorKartki[] = [
  {
    tytul: { pl: 'Dziwne światła', en: 'Strange lights' },
    tresc: {
      pl: 'Nocą nad miejscem: {miejsce} widać dziwne światła. Rozejrzyj się tam i zdaj relację.',
      en: 'Strange lights are seen at night over {miejsce}. Have a look around and report back.',
    },
    cel: { pl: 'Zbadaj: {miejsce}', en: 'Scout: {miejsce}' },
    koniec: { pl: 'Tak myślałem… Dobrze, że ktoś tam zajrzał. Proszę, to za fatygę.', en: 'Just as I thought… Good that someone looked. Here, for your trouble.' },
  },
  {
    tytul: { pl: 'Potrzebny zwiadowca', en: 'Scout wanted' },
    tresc: {
      pl: 'Od czasu komety coś się dzieje w miejscu: {miejsce}. Sprawdź ślady i wróć z relacją.',
      en: 'Something has been going on at {miejsce} since the comet. Check the traces and come back with a report.',
    },
    cel: { pl: 'Sprawdź ślady: {miejsce}', en: 'Check the traces: {miejsce}' },
    koniec: { pl: 'Twoja relacja trafi do akt. Dziękujemy!', en: 'Your report goes into the files. Thank you!' },
  },
];

/** What the hero finds round an odd place (clues; texts shown when one is looked at). */
export const TROPY_ZWIADU: { tytul: Txt; tekst: Txt }[] = [
  { tytul: { pl: 'Zadrapania', en: 'Scratches' }, tekst: { pl: 'Świeże zadrapania małych pazurków – chochliki tu bywają.', en: 'Fresh scratches of small claws – imps come here.' } },
  { tytul: { pl: 'Ciepły odłamek', en: 'A warm shard' }, tekst: { pl: 'Mały odłamek, wciąż ciepły i lekko świecący. Pachnie jak po burzy.', en: 'A small shard, still warm and faintly glowing. It smells like after a storm.' } },
  { tytul: { pl: 'Popiół', en: 'Ashes' }, tekst: { pl: 'Popiół po ognisku i kilka zardzewiałych zębatek.', en: 'Ashes of a campfire and a few rusty cogs.' } },
  { tytul: { pl: 'Ślady', en: 'Footprints' }, tekst: { pl: 'Ślady stóp – za małe na człowieka, za duże na kota.', en: 'Footprints – too small for a person, too big for a cat.' } },
  { tytul: { pl: 'Para', en: 'Steam' }, tekst: { pl: 'Spod kamieni sączy się cienka strużka pary.', en: 'A thin wisp of steam seeps from under the stones.' } },
  { tytul: { pl: 'Zgubiona rękawica', en: 'A lost glove' }, tekst: { pl: 'Skórzana rękawica z mosiężnymi nitami. Ktoś uciekał w pośpiechu.', en: 'A leather glove with brass rivets. Someone left in a hurry.' } },
];

/** Patrol along a path or a river bank: checkpoints one after another, then report. */
export const WZORY_PATROLU: Record<'rzeka' | 'sciezka', WzorKartki> = {
  rzeka: {
    tytul: { pl: 'Patrol nad wodą', en: 'Riverside patrol' },
    tresc: {
      pl: 'Chochliki znów kręcą się przy brzegu. Obejdź {ile} punkty wzdłuż: {miejsce} i wróć z raportem.',
      en: 'Imps are about the bank again. Walk {ile} checkpoints along {miejsce} and report back.',
    },
    cel: { pl: 'Patrol: {miejsce}', en: 'Patrol: {miejsce}' },
    koniec: { pl: 'Brzeg sprawdzony – mieszkańcy będą spać spokojniej.', en: 'The bank is checked – people will sleep easier.' },
  },
  sciezka: {
    tytul: { pl: 'Obchód ścieżki', en: 'Path round' },
    tresc: {
      pl: 'Straż prosi o obchód: {ile} punkty wzdłuż: {miejsce}. Zajrzyj w każdy i wróć z raportem.',
      en: 'The watch asks for a round: {ile} checkpoints along {miejsce}. Look into each and report back.',
    },
    cel: { pl: 'Obchód: {miejsce}', en: 'Round: {miejsce}' },
    koniec: { pl: 'Obchód zrobiony. Dobra robota!', en: 'Round done. Good work!' },
  },
};

/** Gathering by the weather (owner's plan: „zbieranie zależne od pogody”): which good, how many, and the note. */
export const ZBIERANIE_POGODA: Record<'po_deszczu' | 'mroz' | 'owoce', { towar: string; ile: [number, number]; zaSztuke: number; wzor: WzorKartki }> = {
  po_deszczu: {
    towar: 'grzyb', ile: [6, 10], zaSztuke: 14,
    wzor: {
      tytul: { pl: 'Wysyp po deszczu!', en: 'After the rain!' },
      tresc: { pl: 'Po deszczu las pełen grzybów. Kupię {ile}, póki świeże.', en: 'After the rain the forest is full of mushrooms. Will buy {ile} while they are fresh.' },
      cel: { pl: 'Przynieś {ile}', en: 'Bring {ile}' },
      koniec: { pl: 'Jeszcze mokre od deszczu – wspaniałe!', en: 'Still wet from the rain – splendid!' },
    },
  },
  mroz: {
    towar: 'drewno', ile: [3, 6], zaSztuke: 30,
    wzor: {
      tytul: { pl: 'Zimno! Potrzebny opał', en: 'Cold! Firewood needed' },
      tresc: {
        pl: 'Mróz chwycił, a piece stygną. Kto przyniesie {ile}, dostanie zapłatę. (Drewno da tylko drzewo ścięte siekierą.)',
        en: 'The frost has set in and the stoves are cooling. Bring {ile} and be paid. (Only a tree felled with an axe gives wood.)',
      },
      cel: { pl: 'Przynieś {ile}', en: 'Bring {ile}' },
      koniec: { pl: 'Nareszcie ciepło. Dziękujemy!', en: 'Warm at last. Thank you!' },
    },
  },
  owoce: {
    towar: 'jablko', ile: [8, 14], zaSztuke: 6,
    wzor: {
      tytul: { pl: 'Owoce na powidła', en: 'Fruit for jam' },
      tresc: { pl: 'Słońce, owoce dojrzały. Kupię {ile} na powidła.', en: 'Sunshine, the fruit is ripe. Will buy {ile} for jam.' },
      cel: { pl: 'Przynieś {ile}', en: 'Bring {ile}' },
      koniec: { pl: 'Pachną latem! Dziękuję.', en: 'They smell of summer! Thank you.' },
    },
  },
};

/** The last stage of scouting and patrols: back to the giver. */
export const POWROT_KARTKI = {
  cel: { pl: 'Wróć z relacją: {zleca}', en: 'Report back to {zleca}' },
  zasadzka: { pl: 'Coś się poruszyło! Przegoń stwory', en: 'Something moved! Drive the creatures away' },
  przycisk: { pl: 'Sprawdzone', en: 'Checked' },
  punkt: { pl: 'Punkt obchodu', en: 'Checkpoint' },
  punktTekst: { pl: 'Wszystko w porządku – idź dalej.', en: 'All quiet here – move on.' },
} satisfies Record<string, Txt>;

/** Names of the places a hunt can go to, by area kind. */
export const MIEJSCA_POLOWAN: Record<string, { pl: string; en: string; wrog: 'glut' | 'driada' | 'szkielet' }> = {
  forest: { pl: 'las', en: 'the forest', wrog: 'driada' },
  scrub: { pl: 'zarośla', en: 'the thicket', wrog: 'driada' },
  park: { pl: 'park', en: 'the park', wrog: 'glut' },
  cemetery: { pl: 'cmentarz', en: 'the cemetery', wrog: 'szkielet' },
};
