// ============================================================================
//  STAŁE POSTACIE (ustawione na sztywno, z własnymi historiami)
//  Teksty są po polsku (pl) i po angielsku (en) – gra wybiera język urządzenia.
//  W zagadkach PIERWSZA odpowiedź jest dobra (gra sama je tasuje).
// ============================================================================

import type { Txt } from '../i18n';

export interface ZagadkaPL {
  pytanie: Txt;
  odpowiedzi: Txt[];
}

// ----------------------------------------------------------------------------
//  PIES – biało-czarny, wędruje powoli ulicami Guliwera i Cyda. Szuka swojej
//  świnki (zabawki), która leży w krzakach koło placu zabaw między tymi
//  ulicami. Kto ją przyniesie, dostaje 100 EXP (raz na postać).
// ----------------------------------------------------------------------------
export const PIES = {
  imie: { pl: 'Biało-czarny pies', en: 'Black-and-white dog' },
  ulice: ['Guliwera', 'Cyda'],
  /** Prędkość w metrach na sekundę (powolutku). */
  predkosc: 0.7,
  szczek: { pl: 'Hau hau!', en: 'Woof woof!' },
  prosba: {
    pl: 'Pies patrzy na ciebie smutno, węszy przy ziemi i skomle. Wyraźnie czegoś szuka… Może zgubił zabawkę gdzieś przy placu zabaw?',
    en: 'The dog looks at you sadly, sniffs the ground and whimpers. It is clearly looking for something… Maybe it lost a toy near the playground?',
  },
  dalejSzuka: { pl: 'Pies wciąż węszy. Poszukaj w krzakach koło placu zabaw!', en: 'The dog keeps sniffing. Look in the bushes near the playground!' },
  znaleziono: { pl: 'Znalazłeś gumową świnkę! Zanieś ją psu.', en: 'You found a rubber piggy! Bring it to the dog.' },
  podziekowanie: {
    pl: 'Pies łapie świnkę, merda ogonem jak szalony i radośnie odbiega! Hau hau!',
    en: 'The dog grabs the piggy, wags its tail like crazy and happily runs off! Woof woof!',
  },
  exp: 100,
};

// ----------------------------------------------------------------------------
//  SIOSTRA MARGO – szara postać (zakonnica), chodzi ulicą Orlanda.
//  Trzeba ją zagadać 3 razy w ciągu dnia (kiedykolwiek) – wtedy zadaje
//  zagadkę. Potem tego dnia można ją zagadać jeszcze 2 razy: pyta
//  o dobre maniery (savoir-vivre) na poziomie 7-latka. Każda dobra
//  odpowiedź to 10 EXP.
// ----------------------------------------------------------------------------
export const MARGO = {
  imie: { pl: 'Siostra Margo', en: 'Sister Margo' },
  ulica: 'Orlanda',
  predkosc: 0.6,
  /** Za którym razem w ciągu dnia zadaje pierwszą zagadkę. */
  zagadkaZaRazem: 3,
  /** Ile zagadek dziennie razem. */
  zagadekDziennie: 3,
  exp: 10,
  /** Co mówi, zanim zada zagadkę (1. i 2. zagadnięcie). */
  zbywa: [
    { pl: 'Szczęść Boże, dziecko. Teraz się spieszę…', en: 'God bless you, child. I am in a hurry now…' },
    { pl: 'Znowu ty? Hmm… zagadnij mnie jeszcze raz, to pogadamy.', en: 'You again? Hmm… talk to me once more and we will chat.' },
  ],
  koniec: { pl: 'Na dziś wystarczy nauki. Wróć jutro, dziecko!', en: 'That is enough learning for today. Come back tomorrow, child!' },
  pierwsza: {
    pytanie: { pl: 'Co robimy zimą po wejściu do domu?', en: 'What do we do in winter after coming home?' },
    odpowiedzi: [
      { pl: 'Zdejmujemy ubrania i wieszamy na wieszaczki', en: 'We take off our coats and hang them up' },
      { pl: 'Idziemy się bawić', en: 'We go and play' },
      { pl: 'Idziemy jeść', en: 'We go and eat' },
    ],
  } as ZagadkaPL,
  /** Kolejne zagadki o dobrych manierach (losowane każdego dnia). */
  maniery: [
    {
      pytanie: { pl: 'Ktoś dał ci prezent. Co mówisz?', en: 'Someone gave you a present. What do you say?' },
      odpowiedzi: [{ pl: 'Dziękuję!', en: 'Thank you!' }, { pl: 'Nic nie mówię', en: 'Nothing' }, { pl: 'Tylko tyle?', en: 'Is that all?' }],
    },
    {
      pytanie: { pl: 'Kichasz przy stole. Co robisz?', en: 'You sneeze at the table. What do you do?' },
      odpowiedzi: [{ pl: 'Zasłaniam usta łokciem lub chusteczką', en: 'I cover my mouth with my elbow or a tissue' }, { pl: 'Kicham na talerz', en: 'I sneeze on my plate' }, { pl: 'Kicham na kolegę', en: 'I sneeze at my friend' }],
    },
    {
      pytanie: { pl: 'Wchodzisz do sklepu. Co mówisz pani ekspedientce?', en: 'You walk into a shop. What do you say to the shop assistant?' },
      odpowiedzi: [{ pl: 'Dzień dobry!', en: 'Good morning!' }, { pl: 'Dawaj cukierki!', en: 'Give me sweets!' }, { pl: 'Nic, udaję, że jej nie ma', en: 'Nothing, I pretend she is not there' }],
    },
    {
      pytanie: { pl: 'Chcesz coś pożyczyć od kolegi. Jak zapytasz?', en: 'You want to borrow something from a friend. How do you ask?' },
      odpowiedzi: [{ pl: 'Czy mogę pożyczyć? Proszę.', en: 'May I borrow it, please?' }, { pl: 'Daj to!', en: 'Give it!' }, { pl: 'Biorę bez pytania', en: 'I take it without asking' }],
    },
    {
      pytanie: { pl: 'Starsza pani wchodzi do pełnego autobusu. Co robisz?', en: 'An old lady gets on a full bus. What do you do?' },
      odpowiedzi: [{ pl: 'Ustępuję jej miejsca', en: 'I give her my seat' }, { pl: 'Udaję, że śpię', en: 'I pretend to sleep' }, { pl: 'Kładę plecak na wolnym miejscu', en: 'I put my backpack on the free seat' }],
    },
    {
      pytanie: { pl: 'Co robimy przed jedzeniem?', en: 'What do we do before eating?' },
      odpowiedzi: [{ pl: 'Myjemy ręce', en: 'We wash our hands' }, { pl: 'Skaczemy po kanapie', en: 'We jump on the sofa' }, { pl: 'Karmimy psa z talerza', en: 'We feed the dog from our plate' }],
    },
    {
      pytanie: { pl: 'Ktoś mówi, a ty chcesz coś powiedzieć. Co robisz?', en: 'Someone is talking and you want to say something. What do you do?' },
      odpowiedzi: [{ pl: 'Czekam, aż skończy', en: 'I wait until they finish' }, { pl: 'Krzyczę głośniej', en: 'I shout louder' }, { pl: 'Zatykam mu usta', en: 'I cover their mouth' }],
    },
    {
      pytanie: { pl: 'Niechcący popchnąłeś kogoś. Co mówisz?', en: 'You accidentally pushed someone. What do you say?' },
      odpowiedzi: [{ pl: 'Przepraszam!', en: 'Sorry!' }, { pl: 'Twoja wina!', en: 'Your fault!' }, { pl: 'Nic, uciekam', en: 'Nothing, I run away' }],
    },
  ] as ZagadkaPL[],
};

// ----------------------------------------------------------------------------
//  DZIADEK MAREK albo BABCIA IWONKA – każdego dnia losowo jedno z nich
//  spaceruje koło bloku Jana Śnieżyńskiego 19–27. Zagadki naukowe dla
//  10–12-latków, jedna dziennie, za 50 EXP.
// ----------------------------------------------------------------------------
export const DZIADKOWIE = {
  osoby: [
    { imie: { pl: 'Dziadek Marek', en: 'Grandpa Marek' }, powitanie: { pl: 'Siadaj, wnusiu, mam dla ciebie naukową zagadkę!', en: 'Sit down, kiddo, I have a science riddle for you!' } },
    { imie: { pl: 'Babcia Iwonka', en: 'Grandma Iwonka' }, powitanie: { pl: 'Kochanie, sprawdźmy, co wiesz o świecie!', en: 'Sweetie, let us see what you know about the world!' } },
  ],
  ulica: 'Jana Śnieżyńskiego',
  adresy: ['Jana Śnieżyńskiego 19', 'Jana Śnieżyńskiego 21', 'Jana Śnieżyńskiego 23', 'Jana Śnieżyńskiego 25', 'Jana Śnieżyńskiego 27'],
  predkosc: 0.5,
  exp: 50,
  jutro: { pl: 'Na dziś koniec zagadek. Przyjdź jutro, pogadamy!', en: 'No more riddles today. Come tomorrow and we will chat!' },
  zagadki: [
    { pytanie: { pl: 'Dlaczego niebo jest niebieskie?', en: 'Why is the sky blue?' }, odpowiedzi: [{ pl: 'Powietrze rozprasza najbardziej niebieskie światło', en: 'Air scatters blue light the most' }, { pl: 'Bo odbija się w nim morze', en: 'Because it reflects the sea' }, { pl: 'Bo ktoś je pomalował', en: 'Because someone painted it' }] },
    { pytanie: { pl: 'Co jest potrzebne roślinom do fotosyntezy?', en: 'What do plants need for photosynthesis?' }, odpowiedzi: [{ pl: 'Światło, woda i dwutlenek węgla', en: 'Light, water and carbon dioxide' }, { pl: 'Tylko cukier', en: 'Only sugar' }, { pl: 'Ciemność i sól', en: 'Darkness and salt' }] },
    { pytanie: { pl: 'W jakiej temperaturze wrze woda (na poziomie morza)?', en: 'At what temperature does water boil (at sea level)?' }, odpowiedzi: [{ pl: '100 °C', en: '100 °C' }, { pl: '50 °C', en: '50 °C' }, { pl: '200 °C', en: '200 °C' }] },
    { pytanie: { pl: 'Która planeta nazywana jest Czerwoną Planetą?', en: 'Which planet is called the Red Planet?' }, odpowiedzi: [{ pl: 'Mars', en: 'Mars' }, { pl: 'Wenus', en: 'Venus' }, { pl: 'Neptun', en: 'Neptune' }] },
    { pytanie: { pl: 'Ile kości ma dorosły człowiek?', en: 'How many bones does an adult human have?' }, odpowiedzi: [{ pl: 'Około 206', en: 'About 206' }, { pl: 'Około 50', en: 'About 50' }, { pl: 'Około 1000', en: 'About 1000' }] },
    { pytanie: { pl: 'Co przyciąga nas do Ziemi?', en: 'What pulls us towards the Earth?' }, odpowiedzi: [{ pl: 'Grawitacja', en: 'Gravity' }, { pl: 'Magnetyzm butów', en: 'Magnetic shoes' }, { pl: 'Wiatr', en: 'The wind' }] },
    { pytanie: { pl: 'Z czego zbudowana jest woda?', en: 'What is water made of?' }, odpowiedzi: [{ pl: 'Z wodoru i tlenu', en: 'Hydrogen and oxygen' }, { pl: 'Z węgla i azotu', en: 'Carbon and nitrogen' }, { pl: 'Z żelaza', en: 'Iron' }] },
    { pytanie: { pl: 'Dlaczego mamy dzień i noc?', en: 'Why do we have day and night?' }, odpowiedzi: [{ pl: 'Bo Ziemia obraca się wokół własnej osi', en: 'Because the Earth spins on its axis' }, { pl: 'Bo Słońce gaśnie na noc', en: 'Because the Sun switches off at night' }, { pl: 'Bo Księżyc zasłania Słońce', en: 'Because the Moon covers the Sun' }] },
    { pytanie: { pl: 'Który zmysł działa dzięki uszom?', en: 'Which sense do ears give us?' }, odpowiedzi: [{ pl: 'Słuch', en: 'Hearing' }, { pl: 'Węch', en: 'Smell' }, { pl: 'Smak', en: 'Taste' }] },
    { pytanie: { pl: 'Co to jest wulkan?', en: 'What is a volcano?' }, odpowiedzi: [{ pl: 'Góra, z której wydobywa się magma', en: 'A mountain that lets out magma' }, { pl: 'Bardzo wysokie drzewo', en: 'A very tall tree' }, { pl: 'Rodzaj chmury', en: 'A kind of cloud' }] },
    { pytanie: { pl: 'Jak nazywa się przejście wody w parę?', en: 'What do we call water turning into vapour?' }, odpowiedzi: [{ pl: 'Parowanie', en: 'Evaporation' }, { pl: 'Zamarzanie', en: 'Freezing' }, { pl: 'Topnienie', en: 'Melting' }] },
    { pytanie: { pl: 'Które zwierzę jest płazem?', en: 'Which animal is an amphibian?' }, odpowiedzi: [{ pl: 'Żaba', en: 'Frog' }, { pl: 'Jaszczurka', en: 'Lizard' }, { pl: 'Wąż', en: 'Snake' }] },
    { pytanie: { pl: 'Co jest źródłem energii dla Ziemi?', en: 'What is the main source of energy for the Earth?' }, odpowiedzi: [{ pl: 'Słońce', en: 'The Sun' }, { pl: 'Księżyc', en: 'The Moon' }, { pl: 'Gwiazda Polarna', en: 'The North Star' }] },
    { pytanie: { pl: 'Dźwięk najszybciej rozchodzi się w…', en: 'Sound travels fastest through…' }, odpowiedzi: [{ pl: 'ciałach stałych (np. stali)', en: 'solids (like steel)' }, { pl: 'powietrzu', en: 'air' }, { pl: 'próżni', en: 'a vacuum' }] },
  ] as ZagadkaPL[],
};
