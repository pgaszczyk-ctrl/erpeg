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

/** Names of the places a hunt can go to, by area kind. */
export const MIEJSCA_POLOWAN: Record<string, { pl: string; en: string; wrog: 'glut' | 'driada' | 'szkielet' }> = {
  forest: { pl: 'las', en: 'the forest', wrog: 'driada' },
  scrub: { pl: 'zarośla', en: 'the thicket', wrog: 'driada' },
  park: { pl: 'park', en: 'the park', wrog: 'glut' },
  cemetery: { pl: 'cmentarz', en: 'the cemetery', wrog: 'szkielet' },
};
