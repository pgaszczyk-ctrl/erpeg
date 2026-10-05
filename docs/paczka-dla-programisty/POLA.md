# Pola uprawne: całe pasy upraw, pory roku, część do zebrania (decyzja właściciela 5.10.2026)

Zamiast pojedynczych grządek marchewki/brokułu/sałaty (dziś `Forest` w Ambient.ts: łóżko 3×4 na 25 % kratek) **całe pole jest obsiane**: obszar `farmland` (i `allotments`) dzielimy na wąskie pasy jak na Lubelszczyźnie, każdy pas jedną uprawą, w równych rzędach wzdłuż pasa. Wygląd zmienia się z miesiącem. Część roślin jest dojrzała i da się ją zebrać (jak drzewa z zaciosem), reszta to dekoracja.

Kod: `generator/pola.ts` (`pasyPola`, `uprawaPasa`, `malujPas`, `UPRAWY`), demo `generator/demo/pola_demo.ts`. Zrzuty: `zrzuty/pola_pazdziernik.png`, `pola_lipiec.png`, `pola_maj.png`, `pola_zblizenie_do_zebrania.png` (żółte kółka = do zebrania; w grze kółek nie ma, dojrzałe widać po wyglądzie).

## 1. Pasy
- `pasyPola(pierścień, ziarno)`: kierunek z najdłuższej krawędzi obszaru, przyciągnięty do 8 kątów pikselowych (jak budynki – równe rzędy), szerokość pasa 60–160 px (15–40 m), na działkach 40–70 px. Między pasami **miedza** 4 px (trawa, latem maki, chabry, rumianek).
- `uprawaPasa(ziarnoPasa, działka, cropOSM)`: tag OSM `crop` (wheat, rape, maize, potato, sugar_beet, hop…) wygrywa; bez tagu losowanie z wag (najwięcej zboża, rzepaku, ziemniaków i kukurydzy). Działki: tylko warzywa. Ziarno pasa z id obszaru OSM, więc wszędzie i zawsze tak samo.

## 2. Uprawy i pory roku (`UPRAWY.fazy`, miesiąc z daty gracza)
| Uprawa | Co widać | Do zebrania |
|---|---|---|
| marchewka | gęste pierzaste naci w rzędach; dojrzała: pomarańczowa główka wystaje z ziemi | VII–IX, `marchewka` |
| brokuł, kapusta, sałata | rozety z obrysem i cieniem; kapusta dojrzała: jasne „serce” | VII–X / VIII–X / VI–IX |
| ziemniak | krzaczki, w VI–VII kwiaty białe i fioletowe; dojrzały: kopczyk bulw | IX–X, nowy przedmiot `ziemniak` |
| burak | liście z czerwoną nasadą | IX–XI, nowy `burak` |
| dynia | pnącza i liście; IX–X pomarańczowe dynie, dojrzała większa | IX–X, nowy `dynia` |
| zboże | ozimina (zielone rzędy) X–III, zielony łan IV–VI, złoty falujący łan VII z makami, ściernisko z belami słomy VIII–IX, orka | – |
| rzepak | zielone rozety, w V żółty łan | – |
| kukurydza | wysokie łodygi z wiatrem, wiechy i kolby, w X ściernisko | – |
| chmiel (Lubelszczyzna!) | słupy i druty, pnącza do 40 px, w VIII szyszki; zimą same słupy | – |
| słonecznik | wysokie łodygi, w VII żółte tarcze, potem brązowe | – |

Wysokie rośliny (kukurydza, słonecznik, chmiel) i łan zboża ruszają się z wiatrem jak trawa (parametr `wiatr`; w grze jako sprite'y z klatkami, tak jak korony drzew). Śnieg: zimą pola przykrywa śnieg z generatora pogody (część G).

## 3. Zbieranie
- `malujPas` zwraca listę `DoZebrania` (x, y, przedmiot): ok. **3,5 % roślin** w warzywach w miesiącach zbioru. Tylko one są obiektami gry (jak drzewa z zaciosem); reszta to obraz w kawałku mapy.
- Zbiór jak dziś (cios → pasek `WARZYWA.zbiorSekund`, przedmiot do plecaka). Po zebraniu w tym miejscu dołek z wilgotną ziemią (mała naklejka na kawałku), roślina odrasta przy kolejnym logowaniu (jak dziś).
- Nowe przedmioty (grupa `warzywa`, jadalne): `ziemniak` 2, `kapusta` 4, `burak` 2, `dynia` 6 monet (do decyzji właściciela, pokrętła cen już są). Ikony 16×16 – do zamówienia albo z generatora.
- Pokrętło admina `pola_dojrzale` (udział dojrzałych, domyślnie 0,035).

## 4. Zadanie
| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| G11 | Pola: pasy na `farmland`/`allotments`, uprawy wg `crop`/wag i miesiąca, miedze, malowanie w kawałek (Web Worker), dojrzałe rośliny jako obiekty do zebrania zamiast dzisiejszych grządek, nowe warzywa | pola obsiane w całości, zmieniają się z miesiącem, część roślin do zebrania; stare grządki 3×4 wyłączone | ~400 tys. |
