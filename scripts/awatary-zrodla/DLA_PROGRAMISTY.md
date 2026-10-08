# Awatary — poprawiona próba według uwag z 7.10.2026

2 głowy (01, 02), 2 ciała (01, 04), wszystkie 9 klatek i maski. Tułów 01 jest niższy i krępy, tułów 04 wyższy. Głowy nie zawierają szyi. Pozostałe części po akceptacji próby.

## Nowe składanie

Arkusze pozostają 192 × 192, klatki 64 × 64. Wiersze: dół, bok w lewo, góra. Kolumny: krok A, stoi, krok B. Wszystkie współrzędne w metadata.json są lokalne dla klatki i liczone od zera.

Każda część ma tablicę `frames` z 9 wpisami, w kolejności wierszami. Głowy podają `broda`, ciała `szyja` i `stopy`. Dla wybranego wpisu:

```js
const dx = cialo.frames[n].szyja[0] - glowa.frames[n].broda[0];
const dy = cialo.frames[n].szyja[1] - glowa.frames[n].broda[1];
// Najpierw tułów w pozycji postaci, następnie głowa w pozycji + [dx,dy].
```

Usuń tymczasowe opuszczanie każdej głowy o 3 px. Nowe przesunięcie wynika wyłącznie z punktów zaczepienia. Przesuń maskę razem z jej częścią.

W tej próbie tułów 01 ma szyję na y=43, tułów 04 na y=38, stopy obu na y=62. Głowa ma punkt zaczepienia y=38. Zatem głowa na niższym ciele jest przesunięta o +5 px, na wyższym o 0 px. W widoku bocznym zaczepy są na x=31, w pozostałych na x=32. Te liczby opisują tę próbę; docelowo korzystaj z każdego wpisu metadanych, bez stałych w kodzie.

Warstwy: opcjonalne włosy-tył → ciało → głowa. Dla głów 01–02 dodatkowa warstwa włosów-tył nie jest potrzebna.

## Maski i eksport

- Niebieski (0,0,255): skóra.
- Żółty (255,255,0): wszystkie włosy i ich pasemka.
- Czerwony (255,0,0): koszula/sukienka.
- Zielony (0,255,0): kamizelka/fartuch.
- Przezroczystość: obrys, oczy, usta, skóra butów i pasa, metal, mosiądz.

PNG mają binarną przezroczystość bez wygładzania. Import 1:1, nearest neighbour. Nie nakładaj dotychczasowej łaty maski pasemek głowy 01. Maski są przygotowane według części twarzy i włosów, a przypadkowe tony skóry/ust w obszarze włosów zostały przypisane do włosów. Podgląd niebieskich i blond włosów pokazuje wynik.

## Kontrola

Podglądy obejmują wszystkie 4 połączenia, 36 złożonych klatek i 12 GIF-ów chodu. Testy sprawdzają wymiary, przezroczystość, maski, marginesy, punkty zaczepienia, stopy, ruch nóg oraz spójność sylwetek po składaniu. Kontrola jest wykonana na plikach; integracja i przebarwianie shaderem wymagają ponownego sprawdzenia w grze.

Rysunki przygotowano wbudowanym generatorem grafiki. Prompty znajdują się w PROMPTY.txt.
