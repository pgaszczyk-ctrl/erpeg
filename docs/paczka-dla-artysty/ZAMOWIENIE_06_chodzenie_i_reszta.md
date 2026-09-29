# Zamówienie 06 – poprawka chodzenia i wszystko, co zostało

> Zasady ogólne bez zmian (`CZYTAJ_MNIE`, `STYL_SWIATA_steampunk.md`). To zamówienie zbiera **wszystko, co jeszcze jest do zrobienia** (zastępuje 05). Paczka 04d (kocioł, fontanna, wieża, drogowskaz) i „postacie stałe 02” (Luigi, Martin, woźnica) są już w grze – dzięki!

## 0. Jeden styl dla całej gry – NAJWAŻNIEJSZE

Właściciel: „wygląda to jak zlepek 4 różnych stylów” (zrzut `5_zrzuty_z_gry/styl_zlepek_stylow_uwaga_wlasciciela.png`). **Wzorem jest styl ludzików** (mieszkańcy, bohaterowie, stałe postacie) i **przygaszone tekstury podłoża i dachów** – te zostają. Resztę trzeba do nich dopasować, zarówno „w dół”, jak i „w górę”:

**Za dokładne, za jaskrawe (do uproszczenia):** smoczy kocioł (najbardziej), fontanna, wieża zegarowa, w mniejszym stopniu drogowskaz i dekoracje z 04b.
- Mniej kolorów: **ok. 8–12 na obiekt**, bez miękkich przejść i drobnych refleksów; cieniowanie 2–3 tonami, tak jak na ubraniach ludzików.
- **Przygaszone barwy** jak dachy i bruk: mosiądz ciepły i matowy, nie złoty; kamień szary jak bruk, nie jasnobiały.
- **Kontur 1 px `#1e1a24` dookoła całego obiektu**, tak jak u ludzików (dziś kocioł ma go tylko miejscami).
- **Wielkość piksela:** w grze piksel ludzika i piksel obiektu z folderu `swiat/` są na ekranie prawie tej samej wielkości (0,36 i 0,33 punktu mapy). Rysuj obiekty takim samym „grubym” pikselem jak ludziki – duże, czytelne plamy zamiast drobnych detali. Dobry test: obiekt położony obok ludzika w tej samej skali (ludzik 64 × 64 obok kotła 72 × 72) musi wyglądać jak z jednej gry.
- Proszę o **nowe wersje** `kociol_publiczny` (2 klatki: zgaszony / rozpalony), `fontanna_smok`, `wieza_zegarowa` w tych samych rozmiarach i nazwach, a przy okazji przejrzyj dekoracje z 04b pod tym kątem.

**Za mało dokładne (plansza, do „podciągnięcia”):** krawędzie i obrysy. Po naszej stronie: mapa jest już rysowana 2× dokładniej, a obrysy budynków i dróg zrobiliśmy cieńsze i w kolorze konturu ludzików (`#1e1a24`). Od Ciebie – żeby plansza miała ten sam „piksel” co postacie:
- `dach_okap` (sekcja B niżej) – krawędź dachu narysowana pikselami zamiast kreski programu;
- `droga_krawedz` – **pasek 48 × 6, kafelkujący się poziomo**: krawędź drogi / krawężnik (kamienie, trawa wchodząca na drogę) w stylu podłoży; gra położy go wzdłuż brzegów dróg zamiast kreski;
- `sciana_cokol` – **pasek 48 × 6**: dół ściany przy ziemi (cień, kamienie cokołu).

Budynki mają kształty z prawdziwej mapy (bywają powykręcane) – tego nie zmienimy, ale pikselowe krawędzie bardzo to złagodzą.

## A. Chodzenie – najważniejsze (poprawka istniejących arkuszy)

W grze postacie „lewitują”: przy chodzeniu ruszają tylko ręką, a nogi stoją. Powód: w wielu arkuszach **krok A i krok B są prawie identyczne** (zwłaszcza w widoku z boku), a gra przy chodzeniu pokazuje na zmianę właśnie te dwie klatki. Zestawienie: `2_uwagi_do_v1/kroki_A_B_za_podobne.png`.

Na razie gra wstawia pomiędzy kroki klatkę „stoi” (krok A – stoi – krok B – stoi), więc nogi już się ruszają – ale ładny chód będzie dopiero z poprawionych klatek:

- **krok A** = lewa noga wyraźnie do przodu, prawa do tyłu (rozkrok ok. 6–8 px w pliku 64 × 64);
- **krok B** = odwrotnie: prawa do przodu, lewa do tyłu (lustrzanie do A, ale nie ta sama klatka!);
- **stoi** = nogi razem, **ten sam wygląd reszty ciała** (włosy, kucyk, hełm, torba dokładnie jak w krokach);
- ręce: przeciwnie do nóg (lewa noga do przodu → prawa ręka do przodu);
- przy spódnicach i habitach: spod spodu wyraźnie wychodzi raz jedna, raz druga stopa, a rąbek lekko się kołysze;
- sprawdzaj wszystkie trzy rzędy (dół, bok, góra) – najczęściej zawodzi **bok**.

**Do poprawy w pierwszej kolejności** (najmniejsza różnica między A i B): Siostra Margo, Babcia Iwonka, Dziadek Marek (bok), mieszkaniec 15, mieszkańcy 09 i 10 (bok), bandyta (bok), traveler, bohater 05, bohater 10 (bok). W nowej paczce „postacie stałe 02” to samo: **Luigi i Martin w widoku z boku** mają kroki A i B prawie takie same – przy okazji też do poprawy. W kolejnych postaciach pilnuj tego od razu. Potem przejrzyj pozostałych mieszkańców 01–14, bohaterów 04–10, Babcię Grażynkę i maga. Nazwy plików, format i maski bez zmian – podmienimy arkusze 1 : 1.

## B. Latarnie i krawędzie dachów

Właściciel zauważył, że przy pięknych postaciach **latarnie i krawędzie dachów wyglądają słabo**. Po naszej stronie mapa jest już rysowana dwa razy dokładniej (Twoje grafiki tracą mniej szczegółów). Od Ciebie:

1. `latarnia_gazowa` – **nowa wersja 24 × 72, 2 klatki (dzień / noc)**: smuklejszy słup, wyraźna mosiężna głowica z szybkami, nocą ciepły blask narysowany wokół szybek (nie cała klatka). Kontur 1 px, bez rozmytych pikseli.
2. `dach_okap` – **pasek krawędzi dachu 48 × 9, kafelkujący się poziomo**: rynna / okap z dachówek (krawędź od strony patrzącego). Gra położy go wzdłuż dolnych krawędzi każdego dachu zamiast obecnej rysowanej kreski. Jeden wariant ciemny, pasujący do wszystkich dachów.
3. `dach_kalenica` – (opcjonalnie) pasek 48 × 6 kalenicy (grzbietu dachu), kafelkujący się poziomo.

## B2. Wóz woźnicy – `woz_konny`

Na każdej stacji stoi już Twój woźnica, ale obok niego wciąż nasz prosty, rysowany programem wózek z koniem (zrzut `5_zrzuty_z_gry/woznica_przy_wozie.png`) – wygląda przy nim bardzo słabo.

- **3 wersje wozu**, każda jako **arkusz 2 klatek obok siebie po 96 × 72** (razem 192 × 72):
  - `woz_konny_pusty` – pusty wóz,
  - `woz_konny_beczki` – załadowany beczkami,
  - `woz_konny_worki` – załadowany workami;
- koń + wóz w stylu lekkiego steampunku (mosiężne latarenki, okucia), widok z góry-z przodu jak reszta świata, **zwrócony w lewo** (gra odbija w prawo);
- klatka 1: koń stoi; klatka 2: koń lekko przestępuje / macha ogonem (gra zmienia je powoli);
- **maść konia: czarny, brązowy, szary** – najprościej: rysuj konia brązowego i dołącz **maskę** `woz_konny_<wersja>_maska.png` (czerwony = sierść konia, zielony = grzywa i ogon), gra sama przebarwi go na czarnego i szarego (jak ubrania mieszkańców). Jeśli wolisz, możesz zamiast maski narysować 3 osobne maści (`…_czarny`, `…_brazowy`, `…_szary`);
- styl jak w punkcie 0 (gruby piksel, przygaszone barwy, kontur 1 px `#1e1a24`), kotwica: środek dolnej krawędzi, margines 3 px, przezroczyste tło.

## C. Miejsca i postacie (z zamówienia 05)

| Plik | Co | Uwagi |
|---|---|---|
| `medrczyni` | **Wędrowna Mędrczyni** – arkusz postaci 192 × 192 + maska | szata podróżna, torba z mapami, mosiężne gogle albo astrolabium; `plec: k` |
| `medrzec` | (opcjonalnie) Wędrowny Mędrzec, inny niż mag Albrecht | płaszcz podróżny, laska; `plec: m` |
| ikona `podkowa_szczescia` | 16 × 16 jak w `4_przedmioty_obecne` | talizman: żelazo + mosiężne gwoździe |

## D. Zaległości z zamówienia 03

- ściany: biały tynk, deski, kamień, mur pruski, wersje z rurą, witryna sklepu;
- podłoża: działki, cmentarz, parking, boisko, plac zabaw, piasek, mokradło, puszcza;
- dachy: gont, strzecha, miedź;
- postacie: trener Zbyszek, biegaczka Ania, mądrale (kilka osób: uczeni, zielarka, bibliotekarka), pies (osobny format – zapytaj, jeśli nie wiesz jaki).

## Kolejność

1. **0 – jeden styl**: nowe wersje kotła (2 klatki), fontanny i wieży + paski `dach_okap`, `droga_krawedz`, `sciana_cokol`; 2. **A – poprawione kroki** (najpierw lista „w pierwszej kolejności”); 3. **B – latarnia** oraz **B2 – wozy** (3 wersje × maść); 4. mędrczyni i reszta w dowolnej kolejności.
