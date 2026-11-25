import { tx } from '../i18n';
import { losoweImie } from './imiona';

export const TYTULY_POSTACI = [
  ['Budowniczy', 'Budowniczka', 'the Builder'],
  ['Łaskawy', 'Łaskawa', 'the Merciful'],
  ['Śmiały', 'Śmiała', 'the Bold'],
  ['Cierpliwy', 'Cierpliwa', 'the Patient'],
  ['Milczący', 'Milcząca', 'the Silent'],
  ['Ciekawski', 'Ciekawska', 'the Curious'],
  ['Uparty', 'Uparta', 'the Stubborn'],
  ['Pogodny', 'Pogodna', 'the Cheerful'],
  ['Nieustraszony', 'Nieustraszona', 'the Fearless'],
  ['Niestrudzony', 'Niestrudzona', 'the Tireless'],
  ['Nocny Marek', 'Nocna Sowa', 'the Night Owl'],
  ['Chytry Lis', 'Chytra Lisica', 'the Sly Fox'],
  ['Zegarmistrz', 'Zegarmistrzyni', 'the Clockmaker'],
  ['Złota Rączka', 'Złota Rączka', 'the Tinkerer'],
  ['Gaduła', 'Gaduła', 'the Chatterbox'],
  ['Szczęściarz', 'Szczęściara', 'the Lucky'],
  ['Wędrowiec', 'Wędrowniczka', 'the Wanderer'],
  ['Tropiciel', 'Tropicielka', 'the Tracker'],
  ['Latarnik', 'Latarniczka', 'the Lamplighter'],
  ['Kartograf', 'Kartografka', 'the Mapmaker'],
  ['Gawędziarz', 'Gawędziarka', 'the Storyteller'],
  ['Zbieracz Skarbów', 'Zbieraczka Skarbów', 'the Treasure Collector'],
  ['Bez Grosza', 'Bez Grosza', 'the Penniless'],
  ['o Złotym Sercu', 'o Złotym Sercu', 'the Kindhearted'],
  ['z Długą Listą Spraw', 'z Długą Listą Spraw', 'with Too Much to Do'],
  ['Bystrooki', 'Bystrooka', 'the Keen-Eyed'],
  ['Złotousty', 'Złotousta', 'the Silver-Tongued'],
  ['Niezłomny', 'Niezłomna', 'the Steadfast'],
  ['Przekorny', 'Przekorna', 'the Contrarian'],
  ['Pechowiec', 'Pechowa', 'the Unlucky'],
  ['Wiecznie Spóźniony', 'Wiecznie Spóźniona', 'the Ever-Late'],
  ['Wiecznie Głodny', 'Wiecznie Głodna', 'the Ever-Hungry'],
  ['Żelazna Dłoń', 'Żelazna Dłoń', 'Ironhand'],
  ['Koci Krok', 'Koci Krok', 'Catstep'],
  ['Cichy Gwizd', 'Cichy Gwizd', 'Softwhistle'],
  ['Klucznik', 'Kluczniczka', 'the Keeper of Keys'],
  ['Rymarz', 'Rymarka', 'the Saddler'],
  ['Piwowar', 'Piwowarka', 'the Brewer'],
  ['Wytwórca Zabawek', 'Wytwórczyni Zabawek', 'the Toymaker'],
  ['Łowca Plotek', 'Łowczyni Plotek', 'the Rumor Hunter'],
] as const;

export const MAKS_NAZWY_POSTACI = 40;

export function losowaNazwaPostaci(plec: 'm' | 'k' = 'm'): string {
  const [meski, zenski, angielski] = TYTULY_POSTACI[Math.floor(Math.random() * TYTULY_POSTACI.length)];
  return `${losoweImie(plec)} ${tx(plec === 'k' ? zenski : meski, angielski)}`;
}
