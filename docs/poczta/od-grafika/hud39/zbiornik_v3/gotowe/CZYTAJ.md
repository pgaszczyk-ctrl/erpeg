# HUD39 — gotowe grafiki v3.1: bezpośredni plecak

Aktualna decyzja właściciela: **drugie kółko ma ikonę plecaka i od razu otwiera Kufer/ekwipunek**, bez przechodzenia przez ustawienia. Pierwsze kółko (zębatka) pozostaje menu/ustawieniami. Patrz 39-G005.

18 oddzielnych PNG RGBA w `png_3x/`, bez tła mapy, twarzy i wypalonych liczb. Rozdzielczość @3x pozwala wyświetlać mały HUD z gładkimi krawędziami. To eksport do gry, nie wycięta makieta.

| Warstwa | Plik / wymiary tekstury | Wyświetlanie |
|---|---|---|
| Oprawa | portret_oprawa.png, 168×168 | 56×56 CSS px |
| Maski portretu i zbiornika | portret_maska.png, zbiornik_maska.png, 168×168 | 56×56; biała alpha jest obszarem widocznym |
| Pusta komora, płyn, szkło | zbiornik_tlo.png, zbiornik_plyn.png, zbiornik_szklo.png, 168×168 | wspólny środek (84,84) w teksturze |
| Refleks tafli | zbiornik_tafla.png, 168×9 | przyciąć do komory i przesuwać/obracać z taflą |
| Pusta tabliczka | poziom_pusty.png, 72×36 | 24×12; cyfry dodaje gra |
| Cztery stany kółek | przycisk_normalny/wcisniety/aktywny/niedostepny.png, 108×108 | 36×36; hitbox nadal 44×44 |
| Pięć ikon | ikona_menu/plecak/aparat/welocyped/hulajnoga.png, 60×60 | 20×20; offset w kółku (8,8) CSS px |
| Łącznik | lacznik.png, 24×48 | 8×16 CSS px |

Cała kolumna ma 56×272 CSS px. Pozycje i sumy kontrolne są w `layout.json`. Odstępy między hitboxami wynoszą 8 px; wyśrodkowane grafiki kółek są mniejsze od hitboxów. Dodać safe-area telefonu do całego zespołu. Cztery akcje: menu/ustawienia, bezpośredni plecak/Kufer, aparat, transport; ikona transportu zależy od pojazdu. Mapa i sakiewka pozostają bez zmian. Drugi przycisk ma action `inventory`, nie `journal`; sama podmiana obrazka bez zmiany akcji byłaby błędem.

## Składanie i ciecz

1. Wybrany portret gry pod maską `portret_maska` (promień 47 w teksturze).
2. Pusta komora `zbiornik_tlo`.
3. Płyn przycięty **jednocześnie** maską pierścienia i dolną półpłaszczyzną wyznaczoną przez taflę.
4. Tafla/refleks, także przycięta maską komory.
5. Szkło i oprawa, na końcu tabliczka i cyfry poziomu.

Pierścień ma promienie 56 i 74, środek (84,84). EXP oznacza udział powierzchni/objętości komory, nie liniową wysokość. Nie obracać samej tekstury płynu razem z oprawą ani nie przesuwać całego pierścienia: obraca się półpłaszczyzna tafli, a maska komory pozostaje nieruchoma. Wypełnienie 0 i 100% musi być całkowicie puste/pełne dla każdego kąta. Obrazy mają zwykłą alpha RGBA (straight alpha); sposób premultiplikacji dobiera renderer.

`renderer.js` to działający, niezależny od silnika przykład Canvas 2D używający tych PNG. Zawiera obliczenie poziomu z objętości, maskowanie i nieruchomą oprawę. `sprawdz_png.html` otwiera pliki i umożliwia sprawdzenie procentu EXP, pochylenia tafli oraz obu stanów menu. Nie wymaga instalacji pakietów; można otworzyć lokalnie lub przez serwer projektu. Jest narzędziem kontroli, nie nowym interfejsem gry.

## Telefon i animacja — wymaganie właściciela

Na telefonie gra podaje wygładzony kąt z orientacji/grawitacji urządzenia, tak aby powierzchnia cieczy zachowywała poziom względem ziemi; dodać małą bezwładność i tłumienie. Funkcja `surfaceAngleFromDownVector(gx,gy)` przyjmuje wektor grawitacji już przeliczony do osi ekranu (x w prawo, y w dół). Nie podawać surowych kątów telefonu bez uwzględnienia orientacji ekranu. Podłączenie czujników i ewentualna prośba o zgodę pozostają po stronie programisty. Odmowa/brak czujników/komputer/ograniczone animacje: statyczna pozioma tafla. Nie poruszać twarzy, oprawy i przycisków.

Kółka wysuwają się pionowo jedno po drugim, kolejność Menu/ustawienia → Plecak/Kufer → Aparat → Transport, starty co 55 ms, ruch każdego około 120 ms. Przy zamykaniu odwrotnie. Pierwszy tap tylko otwiera, następny wybiera akcję; zwijanie po 4 s bez obsługi. Zablokować przechodzenie dotyku do joysticka/mapy. Kufer otwiera się bezpośrednio z drugiego kółka. Zachować istniejący dostęp do dziennika poza tą kolumną; nie usuwać funkcji zadań.

## Stan wykonania i kontrola

Wszystkie 18 PNG zostało wyeksportowanych i złożonych do kontroli. Automatycznie sprawdzono kanał alpha, przezroczysty środek oprawy oraz 56 kombinacji EXP/kąta: 0/5/25/50/65/75/95/100% przy −90/−45/−20/0/20/45/90°. Różnica objętości w rasteryzacji poniżej 0,6 punktu procentowego. Renderer JS sprawdzono dodatkowo w rzeczywistym Canvas 2D/Skia, dekodując wszystkie PNG i rysując 9 kombinacji wypełnienia/kąta. Szczegółowy wynik w `kontrola/weryfikacja.json`. Testu w przeglądarce nie wykonano: Chromium nie jest dostępny, a pobranie zakończyło się błędem.

Nie podmieniono HUD-u w grze i nie testowano fizycznego telefonu. Gotowe są grafiki, maski i przykład renderowania. Pakiet zastępuje pikselowy wygląd `teleskop_v2`; pozioma rurka EXP została usunięta. Herszt i smoki są poza tym pakietem.

Grafiki źródłowe oprawy, stanów przycisków, tabliczki i łącznika wygenerowano wbudowanym ImageGen zgodnie z zaakceptowanym kierunkiem. Piktogramy pochodzą z wcześniejszego wygenerowanego atlasu, a plecak wygenerowano osobno po decyzji 39-G005; eksport obejmuje kadrowanie i skalowanie do @3x. Maski i warstwy techniczne są obliczone dokładnie do wspólnej geometrii, bez generatywnych napisów.
