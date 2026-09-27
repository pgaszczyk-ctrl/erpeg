// ============================================================================
//  STAŁE POSTACIE (ustawione na sztywno, z własnymi historiami)
//  Teksty są po polsku (pl) i po angielsku (en) – gra wybiera język urządzenia.
//  W zagadkach PIERWSZA odpowiedź jest dobra (gra sama je tasuje).
// ============================================================================

import type { Txt } from '../i18n';

export interface ZagadkaPL {
  pytanie: Txt | string;
  odpowiedzi: (Txt | string)[];
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

// ----------------------------------------------------------------------------
//  BABCIA GRAŻYNKA – chodzi ulicą Kościelną w Garbowie. Najpierw prosi
//  o dużo owoców (razem 500 sztuk, dowolne), za co daje 20 EXP. Potem od
//  razu wysyła do najbliższego sklepu po narzędzia ogrodnicze – po powrocie
//  znów 20 EXP. Na koniec 3 zagadki botaniczne (trudność wg poziomu gry;
//  zła odpowiedź = inna zagadka przy następnej rozmowie). Za wszystkie:
//  200 monet i 500 EXP. Potem można jej sprzedawać owoce.
// ----------------------------------------------------------------------------
export const GRAZYNKA = {
  imie: { pl: 'Babcia Grażynka', en: 'Grandma Grażynka' },
  ulica: 'Kościelna',
  /** Środek Garbowa (jej ulica to Kościelna najbliżej tego miejsca). */
  miejscowosc: { lat: 51.3542, lon: 22.3327, promienKm: 3 },
  predkosc: 0.45,
  owocow: 500,
  expOwoce: 20,
  expNarzedzia: 20,
  zagadek: 3,
  nagroda: { monety: 200, exp: 500 },
  prosba: {
    pl: 'Oj, dziecko drogie! Chcę narobić przetworów na zimę – dżemów, kompotów, powideł – a nogi już nie te. Przyniesiesz mi owoce? Wszystko jedno jakie, byle dużo: 500 sztuk.',
    en: 'Oh, my dear child! I want to make preserves for winter – jams, compotes, butters – but my legs are not what they were. Will you bring me fruit? Any kind, just lots of it: 500 pieces.',
  },
  jeszczeNie: { pl: 'Jeszcze za mało, kochanie. Potrzebuję 500 owoców.', en: 'Not enough yet, sweetie. I need 500 pieces of fruit.' },
  dziekujeOwoce: {
    pl: 'Ależ tego! Dziękuję, złotko! Ale wiesz co? Zostawiłam narzędzia ogrodnicze w sklepie – sekator, grabki i konewkę. Skoczysz po nie? To niedaleko.',
    en: 'Look at all that! Thank you, darling! But you know what? I left my garden tools at the shop – the pruner, the rake and the watering can. Will you run and get them? It is not far.',
  },
  wSklepie: { pl: 'Sprzedawca podaje ci worek: sekator, grabki i konewkę babci Grażynki. Zanieś je do niej!', en: 'The shopkeeper hands you a sack: Grandma Grażynka\'s pruner, rake and watering can. Take them to her!' },
  czekaNaNarzedzia: { pl: 'Sklep jest niedaleko, kochanie. Narzędzia czekają u sprzedawcy.', en: 'The shop is close by, sweetie. The tools are waiting with the shopkeeper.' },
  dziekujeNarzedzia: {
    pl: 'Moje narzędzia! Jesteś kochany. A teraz sprawdzę, czy znasz się na roślinach – odpowiesz na trzy moje pytania?',
    en: 'My tools! You are a treasure. Now let me see if you know your plants – will you answer my three questions?',
  },
  zagadkaWstep: { pl: 'Posłuchaj, dziecko…', en: 'Listen, child…' },
  koniec: {
    pl: 'Brawo! Prawdziwy z ciebie ogrodnik. Masz tu coś na drogę – i pamiętaj: owoce zawsze od ciebie odkupię!',
    en: 'Well done! You are a real gardener. Here is something for the road – and remember: I will always buy fruit from you!',
  },
  skup: { pl: 'Masz owoce? Chętnie je odkupię na przetwory!', en: 'Got fruit? I will gladly buy it for my preserves!' },
  brakOwocow: { pl: 'Przyjdź, jak nazbierasz owoców – odkupię je na przetwory.', en: 'Come back when you have picked some fruit – I will buy it for my preserves.' },
  /** Zagadki botaniczne po poziomach (0 maluch … 3 mędrzec). */
  zagadki: [
    [
      { pytanie: { pl: 'Z czego wyrasta jabłoń?', en: 'What does an apple tree grow from?' }, odpowiedzi: [{ pl: 'Z pestki (nasionka)', en: 'From a pip (seed)' }, { pl: 'Z liścia', en: 'From a leaf' }, { pl: 'Z kamyka', en: 'From a pebble' }] },
      { pytanie: { pl: 'Czego potrzebuje kwiatek w doniczce?', en: 'What does a potted flower need?' }, odpowiedzi: [{ pl: 'Wody i światła', en: 'Water and light' }, { pl: 'Soku i ciemności', en: 'Juice and darkness' }, { pl: 'Cukierków', en: 'Sweets' }] },
      { pytanie: { pl: 'Jakiego koloru są dojrzałe truskawki?', en: 'What colour are ripe strawberries?' }, odpowiedzi: [{ pl: 'Czerwone', en: 'Red' }, { pl: 'Niebieskie', en: 'Blue' }, { pl: 'Białe w kropki', en: 'White with dots' }] },
      { pytanie: { pl: 'Która roślina ma kolce?', en: 'Which plant has thorns?' }, odpowiedzi: [{ pl: 'Róża', en: 'A rose' }, { pl: 'Stokrotka', en: 'A daisy' }, { pl: 'Tulipan', en: 'A tulip' }] },
      { pytanie: { pl: 'Na czym rosną żołędzie?', en: 'What do acorns grow on?' }, odpowiedzi: [{ pl: 'Na dębie', en: 'On an oak' }, { pl: 'Na brzozie', en: 'On a birch' }, { pl: 'Na sośnie', en: 'On a pine' }] },
      { pytanie: { pl: 'Co robimy z konewką?', en: 'What do we do with a watering can?' }, odpowiedzi: [{ pl: 'Podlewamy rośliny', en: 'Water plants' }, { pl: 'Kopiemy dołki', en: 'Dig holes' }, { pl: 'Tniemy gałęzie', en: 'Cut branches' }] },
    ],
    [
      { pytanie: { pl: 'Która część rośliny pobiera wodę z ziemi?', en: 'Which part of a plant takes water from the soil?' }, odpowiedzi: [{ pl: 'Korzeń', en: 'The root' }, { pl: 'Kwiat', en: 'The flower' }, { pl: 'Owoc', en: 'The fruit' }] },
      { pytanie: { pl: 'Które drzewo zrzuca na zimę igły?', en: 'Which tree drops its needles for winter?' }, odpowiedzi: [{ pl: 'Modrzew', en: 'The larch' }, { pl: 'Sosna', en: 'The pine' }, { pl: 'Świerk', en: 'The spruce' }] },
      { pytanie: { pl: 'Kto zapyla kwiaty jabłoni?', en: 'Who pollinates apple blossoms?' }, odpowiedzi: [{ pl: 'Pszczoły i inne owady', en: 'Bees and other insects' }, { pl: 'Krety', en: 'Moles' }, { pl: 'Ryby', en: 'Fish' }] },
      { pytanie: { pl: 'Z którego drzewa zbieramy kasztany?', en: 'Which tree gives us conkers?' }, odpowiedzi: [{ pl: 'Z kasztanowca', en: 'The horse chestnut' }, { pl: 'Z lipy', en: 'The lime tree' }, { pl: 'Z wierzby', en: 'The willow' }] },
      { pytanie: { pl: 'Które warzywo rośnie pod ziemią?', en: 'Which vegetable grows underground?' }, odpowiedzi: [{ pl: 'Marchewka', en: 'The carrot' }, { pl: 'Pomidor', en: 'The tomato' }, { pl: 'Groszek', en: 'The pea' }] },
      { pytanie: { pl: 'Jak nazywa się kwiat, który obraca się za słońcem?', en: 'Which flower turns to follow the sun?' }, odpowiedzi: [{ pl: 'Słonecznik', en: 'The sunflower' }, { pl: 'Mak', en: 'The poppy' }, { pl: 'Bratek', en: 'The pansy' }] },
    ],
    [
      { pytanie: { pl: 'Jak nazywa się zielony barwnik w liściach?', en: 'What is the green pigment in leaves called?' }, odpowiedzi: [{ pl: 'Chlorofil', en: 'Chlorophyll' }, { pl: 'Hemoglobina', en: 'Haemoglobin' }, { pl: 'Melanina', en: 'Melanin' }] },
      { pytanie: { pl: 'Botanicznie pomidor to…', en: 'Botanically, a tomato is…' }, odpowiedzi: [{ pl: 'owoc', en: 'a fruit' }, { pl: 'korzeń', en: 'a root' }, { pl: 'łodyga', en: 'a stem' }] },
      { pytanie: { pl: 'Dlaczego liście jesienią zmieniają kolor?', en: 'Why do leaves change colour in autumn?' }, odpowiedzi: [{ pl: 'Rozkłada się w nich chlorofil', en: 'Their chlorophyll breaks down' }, { pl: 'Bo marzną', en: 'Because they freeze' }, { pl: 'Bo ktoś je maluje', en: 'Because someone paints them' }] },
      { pytanie: { pl: 'Które z nich to grzyb, a nie roślina?', en: 'Which of these is a fungus, not a plant?' }, odpowiedzi: [{ pl: 'Borowik', en: 'A porcini' }, { pl: 'Paproć', en: 'A fern' }, { pl: 'Mech', en: 'Moss' }] },
      { pytanie: { pl: 'Paprocie rozmnażają się przez…', en: 'Ferns reproduce by…' }, odpowiedzi: [{ pl: 'zarodniki', en: 'spores' }, { pl: 'nasiona', en: 'seeds' }, { pl: 'bulwy', en: 'tubers' }] },
      { pytanie: { pl: 'Która roślina jest trująca?', en: 'Which plant is poisonous?' }, odpowiedzi: [{ pl: 'Konwalia', en: 'Lily of the valley' }, { pl: 'Mięta', en: 'Mint' }, { pl: 'Rumianek', en: 'Chamomile' }] },
    ],
    [
      { pytanie: { pl: 'Jak nazywa się przenoszenie pyłku na znamię słupka?', en: 'What do we call moving pollen onto the stigma?' }, odpowiedzi: [{ pl: 'Zapylenie', en: 'Pollination' }, { pl: 'Kiełkowanie', en: 'Germination' }, { pl: 'Transpiracja', en: 'Transpiration' }] },
      { pytanie: { pl: 'Parowanie wody przez liście to…', en: 'Water evaporating from leaves is called…' }, odpowiedzi: [{ pl: 'transpiracja', en: 'transpiration' }, { pl: 'fotosynteza', en: 'photosynthesis' }, { pl: 'fermentacja', en: 'fermentation' }] },
      { pytanie: { pl: 'Które rośliny wiążą azot z powietrza dzięki bakteriom w korzeniach?', en: 'Which plants fix nitrogen from the air with bacteria in their roots?' }, odpowiedzi: [{ pl: 'Motylkowe (np. groch, koniczyna)', en: 'Legumes (e.g. peas, clover)' }, { pl: 'Trawy', en: 'Grasses' }, { pl: 'Kaktusy', en: 'Cacti' }] },
      { pytanie: { pl: 'Co jest produktem fotosyntezy obok tlenu?', en: 'Besides oxygen, what does photosynthesis produce?' }, odpowiedzi: [{ pl: 'Glukoza (cukier)', en: 'Glucose (sugar)' }, { pl: 'Białko', en: 'Protein' }, { pl: 'Tłuszcz', en: 'Fat' }] },
      { pytanie: { pl: 'Szczepienie drzewka owocowego to…', en: 'Grafting a fruit tree means…' }, odpowiedzi: [{ pl: 'łączenie zrazu jednej odmiany z podkładką', en: 'joining a scion of one variety to a rootstock' }, { pl: 'podlewanie go szczepionką', en: 'watering it with a vaccine' }, { pl: 'przycinanie korzeni', en: 'cutting its roots' }] },
      { pytanie: { pl: 'Które drzewo w Polsce żyje najdłużej?', en: 'Which tree lives longest in Poland?' }, odpowiedzi: [{ pl: 'Cis', en: 'The yew' }, { pl: 'Brzoza', en: 'The birch' }, { pl: 'Topola', en: 'The poplar' }] },
    ],
  ] as ZagadkaPL[][],
};

// ----------------------------------------------------------------------------
//  LUIGI – hiszpańskojęzyczny macho, siedzi przed domem przy Nałęczowskiej 18 (nie chodzi). Codziennie
//  3 zagadki: pierwsza o szachach, druga o Pokémonach albo Magic: the
//  Gathering (na zmianę dniami), trzecia z tego, co zostało. Jedna próba na
//  zagadkę. Za każdą dobrą 1 EXP, za wszystkie trzy dobre dodatkowo 20 EXP.
// ----------------------------------------------------------------------------
export const LUIGI = {
  imie: { pl: 'Luigi', en: 'Luigi' },
  adres: 'Nałęczowska 18',
  ulica: 'Nałęczowska',
  expZaZagadke: 1,
  premiaZaTrzy: 20,
  powitanie: { pl: '¡Hola, amigo! Siadaj, siadaj. Luigi ma dla ciebie zagadkę – tylko dla twardzieli!', en: '¡Hola, amigo! Sit down, sit down. Luigi has a riddle for you – only for tough guys!' },
  koniec: { pl: '¡Basta! Na dziś koniec, amigo. Luigi musi odpocząć… i poprawić fryzurę. ¡Hasta mañana!', en: '¡Basta! That is all for today, amigo. Luigi must rest… and fix his hair. ¡Hasta mañana!' },
  brawoTrzy: { pl: '¡Caramba! Wszystkie trzy! Prawie tak dobry jak Luigi. ¡Olé!', en: '¡Caramba! All three! Almost as good as Luigi. ¡Olé!' },
  /** Gdy bohater widział już cień smoka. */
  cien: {
    pl: 'Sí, sí… to mi przypomina Ur-Dragona z Magica. Nie grałem taką talią, amigo, ale ekspertem od smoków jest Martin. Może coś wie, ale musiałbyś iść na Irysową. Jak nie masz co robić, to leć. Albo chodź, zagramy w karty – Luigi nie przegrywa. ¡Nunca!',
    en: 'Sí, sí… it reminds me of the Ur-Dragon from Magic. I never played that deck, amigo, but the dragon expert is Martin. He may know something, but you would have to go to Irysowa Street. If you have nothing to do, off you go. Or come, let us play cards – Luigi never loses. ¡Nunca!',
  },
  tawerna: {
    pl: '¡Oye, amigo! Słyszałeś o tej tawernie, co ostatnio powstała na Guliwera? Nazwali ją dziwacznie – magicownia.pl – ale Luigi lubi tam chodzić i pograć w karty. Señoritas patrzą, jak wygrywam!',
    en: '¡Oye, amigo! Have you heard of the tavern that opened lately on Guliwera Street? They gave it a strange name – magicownia.pl – but Luigi likes going there to play cards. The señoritas watch me win!',
  },
  szachy: [
    { pytanie: { pl: 'Która figura szachowa porusza się „w kształcie litery L”?', en: 'Which chess piece moves in an "L" shape?' }, odpowiedzi: [{ pl: 'Skoczek', en: 'The knight' }, { pl: 'Goniec', en: 'The bishop' }, { pl: 'Wieża', en: 'The rook' }] },
    { pytanie: { pl: 'Ile pól ma szachownica?', en: 'How many squares does a chessboard have?' }, odpowiedzi: [{ pl: '64', en: '64' }, { pl: '100', en: '100' }, { pl: '49', en: '49' }] },
    { pytanie: { pl: 'Który kolor zaczyna partię szachów?', en: 'Which colour moves first in chess?' }, odpowiedzi: [{ pl: 'Białe', en: 'White' }, { pl: 'Czarne', en: 'Black' }, { pl: 'Losowo', en: 'Chosen at random' }] },
    { pytanie: { pl: 'Jak nazywa się ruch, w którym król i wieża zmieniają się miejscami?', en: 'What is the move where the king and rook swap places?' }, odpowiedzi: [{ pl: 'Roszada', en: 'Castling' }, { pl: 'Promocja', en: 'Promotion' }, { pl: 'Bicie w przelocie', en: 'En passant' }] },
    { pytanie: { pl: 'W co zwykle zamienia się pionek, który dojdzie do końca szachownicy?', en: 'What does a pawn usually become when it reaches the far end?' }, odpowiedzi: [{ pl: 'W hetmana', en: 'A queen' }, { pl: 'W króla', en: 'A king' }, { pl: 'W nic – zostaje pionkiem', en: 'Nothing – it stays a pawn' }] },
    { pytanie: { pl: 'Która figura porusza się tylko po skosie?', en: 'Which piece moves only diagonally?' }, odpowiedzi: [{ pl: 'Goniec', en: 'The bishop' }, { pl: 'Wieża', en: 'The rook' }, { pl: 'Skoczek', en: 'The knight' }] },
    { pytanie: { pl: 'Co oznacza „mat” w szachach?', en: 'What does "checkmate" mean?' }, odpowiedzi: [{ pl: 'Król jest atakowany i nie ma ucieczki – koniec gry', en: 'The king is attacked and cannot escape – game over' }, { pl: 'Remis', en: 'A draw' }, { pl: 'Utrata hetmana', en: 'Losing the queen' }] },
    { pytanie: { pl: 'Ile pionków ma każdy gracz na początku partii?', en: 'How many pawns does each player start with?' }, odpowiedzi: [{ pl: '8', en: '8' }, { pl: '6', en: '6' }, { pl: '10', en: '10' }] },
    { pytanie: { pl: 'Która figura jest najsilniejsza w szachach?', en: 'Which chess piece is the most powerful?' }, odpowiedzi: [{ pl: 'Hetman', en: 'The queen' }, { pl: 'Król', en: 'The king' }, { pl: 'Wieża', en: 'The rook' }] },
    { pytanie: { pl: 'Jak nazywa się sytuacja, gdy gracz nie ma żadnego ruchu, ale jego król nie jest szachowany?', en: 'What is it called when a player has no legal move but is not in check?' }, odpowiedzi: [{ pl: 'Pat (remis)', en: 'Stalemate (a draw)' }, { pl: 'Mat', en: 'Checkmate' }, { pl: 'Gambit', en: 'Gambit' }] },
  ],
  pokemony: [
    { pytanie: { pl: 'Jakiego typu jest Pikachu?', en: 'What type is Pikachu?' }, odpowiedzi: [{ pl: 'Elektryczny', en: 'Electric' }, { pl: 'Ognisty', en: 'Fire' }, { pl: 'Wodny', en: 'Water' }] },
    { pytanie: { pl: 'W co ewoluuje Charmander?', en: 'What does Charmander evolve into?' }, odpowiedzi: [{ pl: 'Charmeleon', en: 'Charmeleon' }, { pl: 'Wartortle', en: 'Wartortle' }, { pl: 'Ivysaur', en: 'Ivysaur' }] },
    { pytanie: { pl: 'Czym łapie się Pokémony?', en: 'What do you catch Pokémon with?' }, odpowiedzi: [{ pl: 'Poké Ballem', en: 'A Poké Ball' }, { pl: 'Siatką na motyle', en: 'A butterfly net' }, { pl: 'Wędką', en: 'A fishing rod' }] },
    { pytanie: { pl: 'Który typ jest silny przeciwko typowi ognistemu?', en: 'Which type is strong against Fire?' }, odpowiedzi: [{ pl: 'Wodny', en: 'Water' }, { pl: 'Trawiasty', en: 'Grass' }, { pl: 'Robaczy', en: 'Bug' }] },
    { pytanie: { pl: 'Jak ma na imię chłopiec, który podróżuje z Pikachu w anime?', en: 'What is the name of the boy who travels with Pikachu in the anime?' }, odpowiedzi: [{ pl: 'Ash', en: 'Ash' }, { pl: 'Gary', en: 'Gary' }, { pl: 'Brock', en: 'Brock' }] },
    { pytanie: { pl: 'Jakiego typu jest Bulbasaur?', en: 'What type is Bulbasaur?' }, odpowiedzi: [{ pl: 'Trawiasty i trujący', en: 'Grass and Poison' }, { pl: 'Wodny', en: 'Water' }, { pl: 'Kamienny', en: 'Rock' }] },
    { pytanie: { pl: 'Który Pokémon ciągle śpi i blokuje drogi?', en: 'Which Pokémon is always sleeping and blocking roads?' }, odpowiedzi: [{ pl: 'Snorlax', en: 'Snorlax' }, { pl: 'Jigglypuff', en: 'Jigglypuff' }, { pl: 'Psyduck', en: 'Psyduck' }] },
    { pytanie: { pl: 'Który typ jest silny przeciwko typowi wodnemu?', en: 'Which type is strong against Water?' }, odpowiedzi: [{ pl: 'Elektryczny', en: 'Electric' }, { pl: 'Ognisty', en: 'Fire' }, { pl: 'Normalny', en: 'Normal' }] },
  ],
  magic: [
    { pytanie: { pl: 'Ile kolorów many jest w Magic: the Gathering?', en: 'How many colours of mana are there in Magic: the Gathering?' }, odpowiedzi: [{ pl: '5', en: '5' }, { pl: '3', en: '3' }, { pl: '7', en: '7' }] },
    { pytanie: { pl: 'Z ilu punktów życia zaczyna gracz w zwykłej grze Magic?', en: 'How much life does a player start with in a normal game of Magic?' }, odpowiedzi: [{ pl: '20', en: '20' }, { pl: '10', en: '10' }, { pl: '40', en: '40' }] },
    { pytanie: { pl: 'Jaki kolor many daje karta „Forest” (Las)?', en: 'What colour of mana does a Forest give?' }, odpowiedzi: [{ pl: 'Zielony', en: 'Green' }, { pl: 'Niebieski', en: 'Blue' }, { pl: 'Czarny', en: 'Black' }] },
    { pytanie: { pl: 'Jak nazywa się obrócenie karty bokiem, żeby jej użyć?', en: 'What is turning a card sideways to use it called?' }, odpowiedzi: [{ pl: 'Tap (tapnięcie)', en: 'Tapping' }, { pl: 'Flip', en: 'Flipping' }, { pl: 'Discard', en: 'Discarding' }] },
    { pytanie: { pl: 'Jaki kolor many daje karta „Island” (Wyspa)?', en: 'What colour of mana does an Island give?' }, odpowiedzi: [{ pl: 'Niebieski', en: 'Blue' }, { pl: 'Czerwony', en: 'Red' }, { pl: 'Biały', en: 'White' }] },
    { pytanie: { pl: 'Jak nazywa się miejsce, do którego trafiają zniszczone karty?', en: 'Where do destroyed cards go?' }, odpowiedzi: [{ pl: 'Cmentarz (graveyard)', en: 'The graveyard' }, { pl: 'Ręka', en: 'The hand' }, { pl: 'Biblioteka', en: 'The library' }] },
    { pytanie: { pl: 'Który kolor many kojarzy się z ogniem i smokami?', en: 'Which mana colour is linked with fire and dragons?' }, odpowiedzi: [{ pl: 'Czerwony', en: 'Red' }, { pl: 'Biały', en: 'White' }, { pl: 'Niebieski', en: 'Blue' }] },
    { pytanie: { pl: 'Jak w Magic nazywa się talia, z której dobiera się karty?', en: 'In Magic, what is the deck you draw from called?' }, odpowiedzi: [{ pl: 'Biblioteka (library)', en: 'The library' }, { pl: 'Stos', en: 'The pile' }, { pl: 'Skarbiec', en: 'The vault' }] },
  ],
};

// ----------------------------------------------------------------------------
//  MARTIN – ekspert od smoków, chodzi ulicą Irysową. Zaprasza do tawerny
//  magicownia.pl, a zapytany o cień wie, że to na pewno smok, i wysyła
//  bohatera do maga (popycha główną historię).
// ----------------------------------------------------------------------------
export const MARTIN = {
  imie: { pl: 'Martin', en: 'Martin' },
  ulica: 'Irysowa',
  predkosc: 0.6,
  powitanie: { pl: 'Witaj, wędrowcze! Martin jestem – od smoków, kart i dobrych opowieści.', en: 'Greetings, traveller! I am Martin – dragons, cards and good tales are my trade.' },
  tawerna: {
    pl: 'Karty, piwo korzenne i dobre towarzystwo! Zajrzyj do tawerny magicownia.pl na Guliwera – bywają tam czarodzieje, a ja zawsze wygrywam smokami!',
    en: 'Cards, root beer and good company! Drop in at the magicownia.pl tavern on Guliwera Street – wizards go there, and I always win with dragons!',
  },
  cien: {
    pl: 'Cień z długim ogonem, szerokie skrzydła, ryk jak grzmot? To na pewno smok – żaden ptak tak nie rzuca cienia! Idź do: {cel}. Tam urzęduje mag Albrecht, on ci powie więcej.',
    en: 'A shadow with a long tail, wide wings, a roar like thunder? That is surely a dragon – no bird casts a shadow like that! Go to: {cel}. Wizard Albrecht works there, he will tell you more.',
  },
  pozniej: { pl: 'Słyszałem, że już tropisz tego smoka. Powodzenia – i opowiedz mi potem w tawernie!', en: 'I hear you are already on the dragon\'s trail. Good luck – and tell me all about it at the tavern!' },
};
