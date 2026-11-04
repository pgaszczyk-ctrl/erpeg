import type { Misja } from './fabula';

// W rozmowach i wskazówkach mówimy o świątyniach. Prawdziwe nazwy miejsc
// (także ulic i historycznych budynków) zachowujemy. Poniższe znane zwroty
// odświeżają starsze misje z serwera i zapisane zlecenia bez zmiany ich zasad.
const ZWROTY: [string, string][] = [
  ['Prośba proboszcza', 'Prośba opiekuna świątyni'],
  ['Sprawa parafialna', 'Sprawa świątyni'],
  ['Proboszcz prosi o pomoc:', 'Opiekun świątyni prosi o pomoc:'],
  ['Przegoń je, a Bóg ci wynagrodzi.', 'Przegoń je, mieszkańcy będą ci wdzięczni.'],
  ['kiermaszu parafialnego', 'kiermaszu przy świątyni'],
  ['kiermasz parafialny', 'kiermasz przy świątyni'],
  ['zaproszenie na odpust', 'zaproszenie na święto przy świątyni'],
  ['Siostry gotują zupę dla ubogich.', 'Opiekunowie świątyni gotują zupę dla potrzebujących.'],
  ['Bóg zapłać.', 'Dziękujemy za pomoc.'],
  ['Bóg zapłać!', 'Dziękujemy za pomoc!'],
  ['w stronę katedry', 'w stronę świątyni'],
  ['Fundamenty starej fary', 'Fundamenty dawnej świątyni'],
  ['z klasztoru przy Złotej', 'ze świątyni przy Złotej'],
  ['przy klasztorze', 'przy świątyni'],
];

// Tylko tekst opowieści. Adresy, miejsca, imiona, identyfikatory, nazwy
// przedmiotów fabularnych, wymagania i nagrody przechodzą bez zmian.
const POLA_TEKSTU = new Set([
  'tytul', 'opis', 'zakonczenie', 'cel', 'komunikat', 'pytanie',
  'odpowiedzi', 'podpowiedz', 'tekst',
]);

export function odswiezSlownictwoMisji(m: Misja): Misja {
  const odswiez = (value: unknown, pole = ''): unknown => {
    if (typeof value === 'string') {
      if (!POLA_TEKSTU.has(pole)) return value;
      let text = value;
      for (const [stary, nowy] of ZWROTY) text = text.replaceAll(stary, nowy);
      return text;
    }
    if (Array.isArray(value)) return value.map((v) => odswiez(v, pole));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, odswiez(v, k)]));
    }
    return value;
  };
  return odswiez(m) as Misja;
}
