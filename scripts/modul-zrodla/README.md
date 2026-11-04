# Exp-lore — postacie modułowe v6.3

20 postaci, po 2 części: głowa z włosami/zarostem/nakryciem oraz kompletne ciałko. 7 ciałek `f` i 13 ciałek `m`. Oznaczenie dotyczy przypisania do pierwowzoru postaci.

## Korekta 41-G004 — szyja, rewizja 6.3

Zmieniono punkty szyi: każde `neck.y` jest o 1 px niżej niż w v6.2, przy granicy kołnierza. Głowa zasłania przez to wystający fragment szyi. Osie X, punkty głów i wszystkie piksele części oraz masek są zachowane. Użyj nowego manifestu albo gotowego `dla_programisty/src/content/modulDane.ts`. Nie dodawaj osobnego przesunięcia w kodzie. W `dla_programisty/` są też cztery gotowe paski PNG do repozytorium.

Porównanie: `preview/41-G004_szyja_przed_po.png`. Pełny opis: `developer/41-G004_szyja.md`. Podgląd HTML i główne GIF-y pokazują nowy montaż; podglądy z numerami wcześniejszych wiadomości pozostają dokumentacją historyczną.

## Korekta 41-G003 — rewizja 6.2

Uzupełniono maski skóry na policzkach, uszach i pod okularami w 23 widokach głów. Usunięto 13 luźnych pikseli z frontowej głowy 06. Wszystkie ciałka, ich maski i wszystkie kotwice są identyczne z v6.1. Dodano trzy ikony w `ui_icons/`, diagnozę i minimalną poprawkę CSS w `developer/41-G003_*` oraz porównanie przed/po w `preview/41-G003_maski_i_sepia.png`. Wyłączyć sepię na całej postaci, aby podgląd pokazywał wybrane kolory.

## Korekta 41-P002 — rewizja 6.1

Oczyszczono ciałka z odłączonych i przyklejonych pozostałości włosów, bród i nakryć głowy. Pod nimi odtworzono kołnierze i ubrania. Usunięto również wskazane odłamki głów. Kotwice oraz dotychczasowe nazwy części są zachowane. Manifest utrzymuje `version: 6`, a dodatkowe `revision: "6.1"` identyfikuje poprawkę. Plik `kontrola_41-P002.json` zawiera wyniki kontroli i listę zmienionych części. Podglądy kontrolne w `preview/41-P002_*` pokazują wszystkie klatki samych ciałek i złożenia z głową kowala lub hełmem strażnika.

## Nazwy i płeć

`01_warkocze_f_front_idle_body.png` — żeńskie ciałko w widoku przód, stanie.
`02_kowal_m_left_step_a_body.png` — męskie ciałko w lewym profilu, krok A.
Maska otrzymuje dodatkowe `_mask`. Arkusze: `01_warkocze_f_body_3x3.png`.

- `f`: 01 warkocze, 03 pilotka, 05 kucharka, 06 ogrodniczka, 08 kurierka, 15 gospodyni, 18 łuczniczka.
- `m`: 02 kowal, 04 profesor, 07 maszynista, 09 wynalazca, 10 karczmarz, 11 czarodziej, 12 zwiadowca, 13 dżentelmen, 14 podróżnik senior, 16 strażnik, 17 rudobrody, 19 listonosz, 20 mechanik.

Manifest podaje `gender: f/m` i zgodne ze starszym systemem `plec: k/m`. Stabilne `id` nie zawiera dopisku płci, więc można zachować zapisane identyfikatory. Listy `heads` i `bodies` zawierają także ścieżki i kotwice nieruchomego przodu dla dotychczasowego kreatora. Pełna animacja jest w `characters[].directions`.

## Arkusze 3×3

Każda komórka ma 64×64 px. Arkusz: 192×192 px. Wersje większe są powiększone 8× metodą nearest-neighbor: klatka 512×512, arkusz 1536×1536.

| Rząd / kolumna | 0: krok A | 1: stanie | 2: krok B |
|---|---|---|---|
| 0 | przód | przód | przód |
| 1 | lewy profil | lewy profil | lewy profil |
| 2 | tył | tył | tył |

Cykl chodu: kolumny `0,1,2,1`, przykładowe czasy `180,110,180,110 ms`. Głowa jest identyczna w trzech klatkach jednego kierunku. Ciałko ma trzy różne klatki. Punkt szyi i punkt montażu głowy są stałe w obrębie kierunku.

Prawy profil powstaje przez lustrzane odbicie całego złożenia lewego profilu. Nie przeliczaj osobno zaokrąglonego przesunięcia dla lustra — połówki pikseli mogłyby dodać błąd 1 px. Lustrzane odbicie części wokół komórki 64×64 daje kotwicę `x' = 64 − x` i przesunięcie `dx' = −dx`.

## Montaż

Najpierw narysuj ciałko, potem głowę:

```js
dx = Math.round(bodyFrame.neck.x - headFrame.head_mount.x);
dy = Math.round(bodyFrame.neck.y - headFrame.head_mount.y);
```

Współrzędne w manifeście dotyczą komórki 64×64 i krawędzi pikseli: środek pierwszego piksela to `(0.5,0.5)`. Dla wersji 512 pomnóż gotowe przesunięcie przez 8. Nie dopasowuj niczego do granic włosów, kapelusza ani brody. W przodzie oś głowy jest środkiem pomiędzy oczami. W profilu i z tyłu punkty odpowiadają projekcji szyi — nie ma tam pary oczu wyznaczającej oś.

Zalecane płótno do złożenia: 96×96 z początkiem ciałka w `(16,16)`, ponieważ głowa może wyjść poza pierwotną komórkę po dopasowaniu do innego ciałka. Głowy frontowe zachowano z v5, usuwając odłamki pod warkoczami 01. Bok i tył oraz ciałka z chodem powstały z nowych arkuszy tego samego stylu. Nie skalowano osobno szerokości i wysokości.

We wszystkich 180 klatkach ciałek dolna krawędź stóp to `y=61` (ostatni zajęty rząd ma indeks 60). Dotyczy to również 09 i 18. Nie dodawaj już dawnych korekt podnoszących te dwa ciałka.

## Maski kolorów

| Dokładny RGB maski | Znaczenie |
|---|---|
| `#FF0000` | główne ubranie |
| `#00FF00` | drugi materiał ubrania |
| `#0000FF` | skóra: twarz, uszy, dłonie, szyja, dekolt |
| `#FFFF00` | włosy, brwi i zarost |
| alpha 0 | bez zmian |

Nakrycia głowy, gogle, obrys i oczy pozostają poza maskami. Niektóre kierunki mają mało widocznych włosów lub wcale, np. tył strażnika pod hełmem. Maski głów i ciałek korzystają z tego samego kodowania.

Nie nakładaj maski jako widocznej grafiki. Podmieniaj kolor z zachowaniem oryginalnego alpha i względnego cieniowania materiału. Wartość jasności należy odnieść do jasności danego materiału, a nie do bieli: inaczej czarne włosy pozostaną ciemne po wyborze blondu. `developer/modular_character.mjs` zawiera przykład oraz funkcję obliczania kotwic i odbijania profilu. Dla spójności kolorów w chodzie można używać poziomów odniesienia materiału wyliczonych z klatki stania w danym kierunku.

## Kontrola i podglądy

- 3600 obliczeń montażu: 20 głów × 20 ciałek × 3 kierunki × 3 klatki.
- Sprawdzono niezmienne kotwice, identyczne głowy w danym kierunku, odmienne klatki kroków, wspólne stopy, binarne alpha, kodowanie masek i dokładne powiększenie NN.
- `podglad_interaktywny.html`: lokalny wybór głowy, ciałka, kierunku, animacji i kolorów.
- `animations`: 20 plików GIF, po trzy kierunki obok siebie.
- `kierunki_i_kolory.png`: widoki bazowe i przykłady przebarwienia.

Kontrola kotwic i łączności nie zastępuje oceny wyglądu każdej kombinacji w działającej grze. Paczka nie została automatycznie wdrożona do repozytorium ani na serwer.
