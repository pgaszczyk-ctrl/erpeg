ID: 38-G001
Odpowiedź na: 38-P001; 38-P002
Od: grafik
Do: programista
Status: przeczytane (38-P003)
Akceptacja: 2026-10-18 właściciel zaakceptował kierunek gladiatora i herbu oraz poprawioną próbę areny; polecił przekazanie do programisty. Eksport warstw wymaga testu w grze.
Wykonanie: próba v1 — dwie warstwy areny 640×600, herb 512×512 i źródła prób; brak wdrożenia w grze
Dotyczy: Arena Cechu — warstwy do pierwszej próby walki

Pliki: `arena/v1/` obok tej wiadomości. Najpierw obejrzyj `podglad_szachownica.png`. Parametry ustawienia podano poniżej.

| Plik | Stan i zastosowanie |
|---|---|
| `arena_plyta.png` | Sam piasek, bez kratek i herbu; przezroczystość poza płytą. Płyta 480×408 px, proporcja 1:0,85. |
| `arena_tyl.png` | Tylne trybuny, brama z pustą tabliczką i barierka. Bez widzów. Rysuj ZA walczącymi. |
| `arena_zlozenie.png` | Kontrolne złożenie dwóch powyższych warstw, nie rysuj go jednocześnie z nimi. |
| `herb_lublin_512.png` | Osobny herb, ostry i bez rozmycia. Gra nakłada na piasek i miesza z nim. |
| `zrodla/` | Dostępne źródła warstw i prób wyglądu, nie gotowe arkusze animacji. |

## Położenie i kolejność

Obie warstwy areny mają dokładnie **640×600 px** i identyczny punkt ustawienia. Nie przycinaj ich osobno do zawartości. Używając origin 0,5/0,5 ustaw oba obrazy w tym samym miejscu.

Środek piaszczystej płyty w pliku: **(320,380)**. To **80 px poniżej środka płótna** (320,300). Przy pozycji świata oznaczającej środek walki ustaw oba obrazy z origin 0,5/0,5 na `(arenaX, arenaY - 80)`. Przy skalowaniu pomnóż przesunięcie 80 px przez tę samą skalę.

Zakres płyty: x=80…559, y=176…583. Półosie około 240 i 204 px; to dane rysunku do testu, nie polecenie zmiany reguł walki. Brak kratek i przedniego łuku jest celowy w tej próbie zgodnie z 38-P002.

Kolejność: płyta → tylna architektura → herb/obiekty na płycie i postacie → przyszły `arena_przod`. Szczegółowy depth zależy od obecnego kodu areny.

## Zakres akceptacji i braki

- Gladiator i herb: właściciel „Super, rób dalej” po pierwszych próbach. Gladiator ma jedynie dwie stojące pozy w źródle; brak chodu, ataku, upadku i masek.
- Sędzia, tablica i chorągiew Lublina: źródłowe próby wyglądu. Nie deklaruję osobnej akceptacji każdego z nich. Tablica wymaga wyrównania geometrii i tego samego wyniku między klatkami.
- Chorągiew Lublina nie zastępuje nowo zamówionej szarej chorągwi z maską.
- Jeszcze nieoddane: przedni łuk, dwie klatki widzów, szara chorągiew z maską, sama kratka, pełne postacie i maski, pozostali gladiatorzy.
- To przekazanie nie oznacza ukończenia całego 38-P001 ani wdrożenia w grze.

Sprawdzenie: obejrzano złożenie na szachownicy w docelowej rozdzielczości; potwierdzono rozmiary, wspólne ustawienie, alpha wyłącznie 0/255, paletę świata + #1e1a24 i brak czarnego tła. Nie zmieniano kodu gry; build i próba walki nie były wykonywane przez grafika.

Proszę o odpowiedź 38-P003 (jeśli numer wolny): potwierdzenie 38-G001/proba_v1, zrzut walki na serwerze testowym i informację o kącie, skali oraz ustawieniu płyty względem tylnej barierki.


Publikacja: 2026-10-18 właściciel wyraźnie potwierdził publiczne przekazanie grafik areny i tej notki w pgaszczyk-ctrl/erpeg.

Dodatkowy manifest JSON pominięto w publikacji po odrzuceniu go przez automatyczną kontrolę. Parametry potrzebne do ustawienia warstw są w tej notce; eksporty PNG są kompletne dla tej próby.
