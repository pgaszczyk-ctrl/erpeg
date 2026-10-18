ID: 39-G001
Odpowiedź na: 39-P001; polecenie właściciela dołączenia poprawionego herszta
Od: grafik
Do: programista
Status: nowe
Akceptacja: właściciel zlecił wykonanie 39-P001 i dołączenie herszta (2026-10-18). Pierwsza próba HUD-u i poprawiony ruch do oceny; nie oznacza akceptacji wyglądu ani wdrożenia.
Wykonanie: próba v1 zakresu A+B+C+aparat+welocyped+G; dodatkowo A2 i herszt v4. Brak wdrożenia w grze.
Dotyczy: górny HUD — pierwsza próba i poprawa chodu herszta

Pliki: `hud39/proba_v1/`. Zacznij od `makiety/G_telefon_zwiniety_390x844.png`, `makiety/G_telefon_rozwiniety_390x844.png` oraz `makiety/G_komputer_1280x800.png`.

## Grafiki (`grafiki/`)

| Pliki | Rozmiar / warstwy |
|---|---|
| A_medalion_oprawa.png | 52×52, bez twarzy; okno kołowe Ø36, środek (26,26), przezroczyste |
| A_exp_tor.png / A_exp_pelny.png | 52×52; oddzielny zewnętrzny pierścień. Nakładaj tor, potem pełny pierścień przycięty kątem; początek u góry, zgodnie z ruchem wskazówek. |
| A_awans_1.png … A_awans_3.png | 3 osobne klatki 52×52, same drobne błyski; nakładaj nad medalionem |
| A_awans_3kl.png | te same 3 klatki obok siebie, 156×52 |
| A2_poziom_pusty.png | 28×14; pusta tabliczka, liczby rysuje gra |
| B_zwiniety.png / B_rozwiniety.png / B_wcisniety.png | 34×34, odpowiednio chevron w dół / w górę / wciśnięty |
| C_zwykle.png / C_wcisniete.png / C_aktywne.png / C_niedostepne.png | 44×44, puste gniazda; ikony nakładaj osobno centralnie |
| D_aparat.png / D_welocyped.png | 24×24 |

Pliki PNG mają twardą alpha 0/255 i paletę świata z konturem #1e1a24. Eksport nearest neighbour. B i C obejmują wymienione stany; E i F pozostają poza pierwszą próbą zgodnie z końcówką 39-P001.

## Rozmieszczenie i zachowanie do wdrożenia

Na telefonie grafiki 1:1, na komputerze ×2. Makieta telefonu ma medalion w (12,20), tabliczkę poziomu w (24,75). B ma grafikę w (77,29), ale osobny obszar dotyku **44×44** od (72,24). Medalion kończy się na x64: do strefy B jest 8 px. Bezpieczny margines telefonu dodaje kod.

Rozwinięte gniazda: (76,108), (128,108), (180,108), (232,108). Każde 44×44; odstępy 8 px. Wyśrodkowana ikona 24×24 ma margines 10 px. Na dole makiety nie ma żadnego przycisku.

Makiety pokazują zdrowego bohatera: kocioł i leczenie są niewidoczne. W tej próbie nie dostarczono F/F2. Aparat i welocyped są nowe; koło zębate oraz stary dziennik w makiecie są pomocniczymi znakami układu, nie nowymi oddanymi ikonami D. Mapa i sakiewka są uproszczonym przedstawieniem obecnych kontrolek na potrzeby makiety; nie zlecam ich zmiany. Tło to poglądowy starszy zrzut mapy, oczyszczony z dawnego HUD-u.

Grafiki nie implementują logiki. Do kodu pozostaje: 1 tap otwiera pas, następny wybiera akcję, samoczynne zwinięcie po 4 s, medalion otwiera Kufer i zatrzymuje grę. Pozostałe ikony D, szyna E i wskaźnik F po ocenie pierwszej próby, jak w 39-P001. Produkcyjny HUD pozostaje bez zmian.

## Herszt — `herszt/`

- `herszt_chod_v4.png`: 192×192, klatki 64×64. Rzędy: przód / bok W LEWO / tył. Kolumny: krok A / stoi / krok B.
- `herszt_chod_v4.gif`: podgląd trzech kierunków, kolejność [0,1,2,1], 100 ms na klatkę (10 fps). W grze idling to środkowa klatka; chód pętla [0,1,2,1] z danego rzędu. Jeśli obecna konfiguracja używa innej kolejności lub FPS, proszę sprawdzić i dostosować — sam PNG nie zmienia timingu.
- Poprzedni eksport v3 błędnie zmniejszał tył dodatkowym ograniczeniem szerokości i miał zbyt wolny podgląd. V4 używa wspólnego wzrostu kierunków i poprawionego punktu ustawienia, bez zmiany ręki z pałką.
- Zmierzone wysokości sylwetek: przód 53/53/53 px, bok 53/53/53 px, tył 53/52/53 px. Główne klatki stóp kończą się na y62; środkowa tylna ma 1 px różnicy. Brak przycięć i drobnych fragmentów sąsiednich klatek. Paleta 16 kolorów, twarda alpha.
- To poprawka samego chodu. Nie oddaję tu ataku/upadku. Proszę nie wracać do v2/v3; wygląd herszta był przyjęty przez właściciela, ruch wymaga oceny w grze.

## Weryfikacja

Obejrzano obie makiety telefonu i komputer oraz arkusze w rozmiarze docelowym. Sprawdzono rozmiary plików, okno medalionu, alpha 0/255, strefy 44 px/odstępy 8 px i równy wzrost herszta między kierunkami. Kod gry, produkcja i dane graczy nietknięte; brak builda i testu interakcji w grze, bo to przekazanie grafiki.

Proszę o odpowiedź 39-P002 (jeżeli wolne): odbiór 39-G001 / próba v1, wynik próby HUD-u i herszta, zrzut telefonu/komputera. Smoki są na razie odłożone na polecenie właściciela i nie należą do tej paczki.
