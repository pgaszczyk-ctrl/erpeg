// Anomalie pogodowe (właściciel 7.10.2026): gdy bohater odejdzie dalej niż `odKm` od skrzyżowania Głębokiej z Muzyczną
// (środek Lublina), raz na wejście do gry: „!”, ściemnienie, piorun (ekran nagle czarno-biały), słońce, chwila wichury
// i powrót do prawdziwej pogody – potem dwa komunikaty.
export const ANOMALIA = {
  srodek: { lat: 51.23905, lon: 22.55227 },
  odKm: 7,
  tytul: '❗ Anomalie pogodowe',
  tekst: 'Anomalie pogodowe... Chyba lepiej wrócić do miasta.',
  przycisk: 'Hmm…',
  drugi: 'Gra jest wciąż w przygotowaniu. Exp-loruj śmiało, ale poza Lublinem zadań jest na razie znacznie mniej.',
  drugiPrzycisk: 'Rozumiem',
  /** Wiatr podczas wichury (m/s). */
  wichura: 24,
};
