ID: 36-G002
Odpowiedź na: 36-P001; próba 36-G001; uwagi właściciela 12.10.2026 17:56 Europe/Warsaw
Od: grafik
Do: programista
Status: przeczytane (odpowiedź 36-P002)
Akceptacja: właściciel zaakceptował nocne światło i kierunek graficzny; zażądał częstszego migania za dnia oraz trzech klatek bujania przód/środek/tył. Polecił przekazać programiście. Nowe bujanie nie było jeszcze ocenione w działającej grze.
Wykonanie: snop PNG 64×64, trzy klatki tablicy 32×32, arkusz 96×32, GIF podglądowy oraz parametry animacji gotowe; wdrożenie w grze pozostaje do wykonania
Dotyczy: zamówienie 36 — czytelność za dnia, zachowanie zaakceptowanej nocy, bujanie szyldu

# 36-G002 — miganie za dnia i bujanie tablicy

## Decyzja właściciela — dokładny zakres
„W dzień wciąż niewidoczne. W dzień musi mrugać częściej, w nocy super. Dodaj bujanie czyli że 3 klatki jak jest wybijane do przodu i tyłu, jakoś musimy zwrócić uwagę gracza. Jest dużo wyraźniejsze niż obecne, tak trzymaj i podeślij programiście.”

Zachowaj wygląd nocnego światła z próby 36-G001; popraw uwagę za dnia rytmem i kontrastem zmian. Poniższe czasy są propozycją grafika do pierwszego wdrożenia — właściciel nie podał dokładnych milisekund.

## Pliki w repozytorium
Folder: docs/poczta/od-grafika/swiatlo_szyldu/v2/
- snop_64.png — 64×64 RGBA, ciepły snop + owal na ziemi; soft alpha, przezroczyste tło. Zmniejszony master z próby v1, nie zmieniono kierunku nocnej grafiki.
- tablica_sklep_przod.png — 32×32: dolna część tablicy wychyla się do gracza.
- tablica_sklep_srodek.png — 32×32: neutralne zawieszenie.
- tablica_sklep_tyl.png — 32×32: tablica wychylona w głąb.
- tablica_sklep_bujanie.png — 96×32, te same trzy klatki w jednym rzędzie: przód / środek / tył.
- podglad_bujania.gif — 256×256; powiększona sama tablica, nie nagranie silnika gry.
- animacja.json — parametry poniżej.

Klatki powstały w imagegen. Arkusz źródłowy 2172×724 rozcięto na trzy równe pola 724×724, dopasowano wysokość zaczepów translacją i zmniejszono nearest neighbour do 32 px. Konwersja formatu nie przerysowuje rysunku. Tablice mają alpha wyłącznie 0/255; snop zachowuje łagodne alpha.

Duże źródła, makieta i pełna instrukcja są również w paczce właściciela 36_swiatlo_szyldu_animacja_v2.zip. Makieta z v1 to koncepcja, nie faktyczny zrzut wdrożenia.

## 1. Miganie za dnia — propozycja do testu
- Oddziel dzienne i nocne mrugCoMs. W dzień krótki cykl przyciągający uwagę co 2000–3000 ms, z inną fazą dla każdego miejsca, zamiast 7–18 sekund.
- Krótki podwójny impuls: bazowa jasność → rozbłysk 100 ms → przygaszenie 120 ms → rozbłysk 100 ms → bazowa jasność. Cały akcent 320 ms, potem spokój do następnego cyklu.
- Punkt wyjścia dla ADD: dzień alpha bazowe 0,35, rozbłysk 0,85, przygaszenie 0,15. Kluczowe jest zauważalne przejście, nie większa stała poświata. Jeśli ADD wypala bruk, stroić te liczby na aktualnym tle — nie traktować ich jako pomiaru z silnika.
- Impuls musi obejmować widoczne źródło w lampie i rozświetlenie tablicy, nie tylko szeroką plamę na ziemi. Pojedynczy jasny blik brzegu tablicy może być tintem; nie rysować nowych grafik każdego miejsca.
- Zachować ciepły kolor; nie dodawać złotego koła za szyldem.

## 2. Noc
- ZACHOWAĆ nocny wygląd, wielkość i intensywność zgodne z zaakceptowaną makietą 36-G001; dziennego szybkiego rytmu nie przenosić na noc.
- Spokojne migotanie jak dotychczas, co 7–18 s. Nie przyciemniać zaakceptowanego snopu na stałe i nie zwiększać rozbłysku do bieli.
- Te same źródła światła obsługują obie pory dnia; różni się rytm i siła.

## 3. Bujanie — trzy różne klatki
- Bujamy TABLICĄ, nie całym słupem ani latarnią. To wychylenie w przód/tył wokół poziomej osi zawieszenia; nie obrót całego obiektu na boki.
- Kolejność: środek → przód → środek → tył → środek. Pętla: przód 220 ms, środek 400 ms, tył 220 ms, środek 400 ms = 1240 ms. Na wejściu stan neutralny. Ma być widoczne, ale nie przeszkadzać odczytać symbolu.
- Przybliżony zaczep klatek 32×32: (16,8,5), czyli środek między dwoma uchwytami. Dopasuj do rzeczywistego mocowania słupa, nie do środka całego przezroczystego pola.
- Rysunek zajmuje około 24×20 px wewnątrz klatki 32×32. Dotychczasowa tablica 22×20 nie ma takiego marginesu. Nowego arkusza NIE rysować z dawnym originem dla 22×20 ani nie skalować według rozmiaru całej klatki — dopasować widoczną tablicę do poprzedniej wielkości.
- Snop i owal pozostają nieruchome pod lampą. Do migania użyj alpha/intensywności, nie rotacji snopu.
- Każdy szyld otrzymuje inną fazę; mruganie i bujanie nie muszą występować zawsze jednocześnie.
- To próbka sklepu. Dla pozostałych 11 znaków zachowaj obecne symbole i stosuj tę samą geometrię wychylenia kodem (skalowanie/perspektywa z górnym zaczepem), zamiast podmieniać je na wagę sklepu. Jeżeli wybierzesz klatki dla każdego rodzaju, zgłoś oddzielne zamówienie.

## 4. Sprawdzenie i wdrożenie
- Najpierw serwer testowy, bez ruszania PRODUKCJA i danych graczy.
- Sprawdź dzień/noc na bruku i trawie, także na telefonie w normalnej skali gry.
- Upewnij się, że alpha działa z ADD, snop zaczyna się przy lampie, owal leży przy stopie i że tablica nie przeskakuje na zawieszeniu.
- Wszystkie warstwy muszą być ukrywane zgodnie z widocznością szyldu i mgłą wojny: nie zdradzać nieodkrytych miejsc.
- prefers-reduced-motion: neutralna tablica i czytelne stałe światło bez szybkiego mrugania.
- Proszę o odpowiedź 36-P002 z Odpowiedź na: 36-G002: commit, użyte pliki, czasy, zaczepy i ustawione alpha, wynik próby komputer/telefon, stan testu i produkcji.

## Stan weryfikacji grafika
Zweryfikowano rozmiary, twardą przezroczystość tablic, soft alpha snopu, trzy różne klatki, kolejność i czasy GIF oraz kompletność paczki. Nie wykonano wdrożenia ani próby Phaser; GIF pokazuje komponent, nie całą scenę. Nie oznaczać całego zamówienia jako ukończonego do sprawdzenia w grze.
