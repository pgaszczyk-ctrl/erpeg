import { tx } from '../i18n';

// Zdania pokazywane w czasie ładowania gry (właściciel, 5.10.2026: bez „wczytuję mapę Lublina”,
// tylko o mapie wyciąganej z plecaka). Zmieniają się co LADOWANIE_CO_MS, w losowej kolejności.
export const LADOWANIE = [
  tx('Wyciągam mapę z plecaka…', 'Pulling the map out of my backpack…'),
  tx('Znowu się pogniotła, już prostuję…', 'Crumpled again, smoothing it out…'),
  tx('Gdzie ja ją włożyłem… o, jest!', 'Where did I put it… oh, here it is!'),
  tx('Rozkładam mapę na kolanie…', 'Unfolding the map on my knee…'),
  tx('Strzepuję okruszki z mapy…', 'Brushing crumbs off the map…'),
  tx('Szukam, gdzie jest góra, a gdzie dół…', 'Working out which way is up…'),
  tx('Wygładzam zagięcia…', 'Ironing out the folds…'),
  tx('Przyciskam rogi kamykami…', 'Weighing the corners down with pebbles…'),
];
export const LADOWANIE_CO_MS = 1600;
