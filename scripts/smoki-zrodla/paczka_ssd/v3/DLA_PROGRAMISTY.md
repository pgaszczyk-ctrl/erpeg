# Wersja poprawiona 7.10.2026 — zastępuje wcześniejszą paczkę v3

# Smoki i chochlik — paczka v3

## Co podmienić

| Folder | Zawartość | Działanie |
|---|---|---|
| `smok_ognisty/` | 39 klatek, nazwy jak wcześniej | Podmienić cały zestaw ognistego z poprzedniej paczki. |
| `smok_kwasowy/` | 39 klatek, nazwy jak wcześniej | Podmienić cały zestaw kwasowego z poprzedniej paczki. |
| `chochlik/chochlik.png` | Arkusz 192 × 192, klatki 64 × 64 | Nowy wygląd chochlika. Dopasować ścieżkę do nazwy zasobu w projekcie. |
| `chochlik/chochlik_32.png` | Arkusz 96 × 96, klatki 32 × 32 | Alternatywa dla loadera używającego klatek 32 × 32; nie ładować równocześnie obu wersji. |
| `smok_lesny_probki/` | 2 klatki stania, bok w lewo | Próbki nowej sylwetki; nie pełny zestaw animacji. |
| `smok_trujacy_probki/` | 2 klatki stania, bok w lewo | Próbki nowej sylwetki bez rogów; nie pełny zestaw animacji. |

## Smoki

W każdym kompletnym gatunku są: po 2 klatki stania, 4 chodu, 3 ugryzienia i 3 ataku specjalnego dla boku, przodu i tyłu; dodatkowo 3 klatki śmierci z boku. Ognisty używa `ziej`, kwasowy `pluj`.

Poprawka po zgłoszeniu właściciela: wszystkie 78 klatek smoków pochodzą teraz z ponownie wyciętych arkuszy. Zastąpiono też 24 wcześniejsze klatki od tyłu, ponieważ seria plucia miała uciętą górę głowy. Wykluczono fragmenty sąsiednich klatek, wyrównano pozycję i odtworzono GIF-y z czyszczeniem tła między klatkami. `metadata.json` oznacza wszystkie pliki jako `new`.

Klatki mają 220 × 200 px i wspólną paletę maksymalnie 16 kolorów na gatunek, w tym tło #FF00FF. Bok stania ma około 160 px długości. Eksport używa najbliższego sąsiada, bez ditheringu. Punkt odniesienia [110, 170] pozostaje taki jak w poprzednim pełnym zestawie; próbna paczka v2 miała [110, 165]. Nie mieszać wersji v2 i v3.

Cień pod smokiem zostaje w silniku. Nie dodano go do sprite’ów. Ogień, kwas, efekty uderzenia, świnka i dekoracje z poprzednich paczek zostają; ta paczka ich nie powiela. Punkt wylotu efektu należy dopasować do nowego położenia pyska dla każdej klatki ataku.

Podglądy GIF pokazują wszystkie serie. Sprawdzone są pliki i renderowane podglądy, nie integracja z działającym silnikiem. Przed wdrożeniem sprawdzić chód i zmianę kierunku w grze; szczególnie ocenić przejście bok–tył i zgodność punktu wylotu kwasu oraz ognia.

## Chochlik

Rzędy arkusza: dół, bok patrzący w lewo, góra. Kolumny: krok A, stoi, krok B. Dla chodu można użyć sekwencji 0–1–2–1. Pivot dla klatki 64 × 64: [32, 62]; dla 32 × 32: [16, 31]. Stopy są wyrównane, wszystkie kierunki korzystają z tej samej skali. Postać ma około 46 px wysokości w większej wersji i około 23 px w mniejszej.

PNG mają przezroczyste tło, alfa 0/255, bez czerwonej poświaty i bez cienia. Poświatę przeciwnika i cień dodać tak jak obecnie w kodzie. Używać filtrowania nearest-neighbor. Arkusz 64 × 64 można rysować w rozmiarze zgodnym z innymi przeciwnikami, bez zwiększania rozdzielczości całego świata.

Styl oparto na wcześniejszym arkuszu zombie: duża głowa, krótki tułów, czytelne pola barw. Dodano brwi, kształt pyska, wnętrze uszu, pasek i sakiewkę. Dołączono też 9 pojedynczych klatek.

## Zakres i pliki pomocnicze

Leśny i trujący mają obecnie wyłącznie dwie próbki stania z boku. Pozostałe kierunki i animacje tych gatunków, pełna poprawka górskiego oraz Cień smoka nie są częścią tej paczki. Arkusze źródłowe generatora pozostają materiałem roboczym poza tą paczką. Do importu służą wyłącznie wyeksportowane pliki; zapobiega to pomyleniu ich z niewyrównanymi źródłami.

`WERYFIKACJA.md` opisuje kontrolę poprzedniej paczki i zakres obecnych zmian. `sprawdz_paczke.py` sprawdza kompletność, formaty, marginesy, palety i przezroczystość. Rysunki powstały w generatorze obrazów; polecenia znajdują się w `PROMPTY.txt`. Obróbka techniczna ogranicza się do cięcia, skali, wyrównania, palety i eksportu.
