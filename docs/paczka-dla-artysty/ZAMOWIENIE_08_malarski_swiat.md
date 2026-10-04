# Zamówienie 08 – cała mapa w stylu kukieł treningowych

> **NIEAKTUALNE od 4 października 2026.** Właściciel wybrał szczegółowy pixel art w stylu konia z wozu. Obowiązuje `ZAMOWIENIE_09_pixel_art_swiat.md`. Z tego zamówienia zostaje tylko **część G** (pogoda i nowe potwory), rysowana w stylu i skali z 09.

Kukły, tarcza i kryształ (paczka 07) oraz wozy konne to **wzorzec dla całej gry**: miękkie, malarskie cieniowanie, światło z lewej-góry, cienki ciemny kontur, przygaszone ciepłe barwy. Dziś obok nich stoi mapa, która wygląda płasko i „programowo”, więc ładne rzeczy wyglądają na niej jak naklejki. Chcemy, żeby **cała mapa była namalowana w tej samej manierze**.

Z pikseli rezygnujemy: budynki, szyldy, wozy i wiele innych rzeczy już nie są pikselowe.

## Najważniejsze: jak powstaje mapa

Mapy **nie da się namalować w całości**. Gra rysuje ją sama z prawdziwych danych o mieście (każda ulica, budynek, park w Lublinie i w każdym innym mieście na świecie). Dlatego potrzebujemy od Ciebie **klocków**, z których program składa mapę:

- tekstur, które się powtarzają bez szwów,
- pasków na krawędzie (tam, gdzie trawa styka się z drogą),
- pojedynczych obiektów (drzewa, latarnie, ławki…).

**Cienie i światło na ziemi robi program**, żeby wszystko miało jedno słońce: cień budynku, drzewa, ludzika i wozu pada zawsze w tę samą stronę (w prawo-w dół). Program ma już działającą próbę: miękkie cienie budynków i drzew, cień pod stopami i kołami, jaśniejszy lewy-górny róg dachu, duże jasne i ciemne plamy na trawie, żeby tekstura się nie powtarzała. Zrzuty przed i po próbie są w `5_zrzuty_z_gry/proba_malarska_*.jpg (po lewej przed, po prawej po)`.

## Jak pracujemy (tak jak przy wozach – to zadziałało)

1. **Najpierw jedna scena-podgląd do akceptacji:** kawałek miasta widziany tak jak w grze (z góry, lekko z przodu; zrzuty z gry w `5_zrzuty_z_gry/`): ulica z brukiem, chodnik, trawnik z drzewem, dwa-trzy domy z dachami i ścianą frontową, ścieżka ziemna, kawałek wody, ludzik i wóz dla skali. To jest „jak ma wyglądać gra”.
2. Po akceptacji **wycinasz z tej sceny** klocki z listy niżej. Nic nie rysujesz od nowa i nic nie dorysowujesz programem.
3. **Tekstury powtarzalne bez szwów** (lewa krawędź pasuje do prawej, górna do dolnej), kwadrat **512×512 px**, w skali „3 razy większej niż w grze”, jak dotychczasowe `podloze_*`.
4. **Na teksturach bez kierunkowego światła i bez cieni rzucanych.** Dachy są obracane przez program wzdłuż budynku, więc światło w pliku obracałoby się razem z nimi. Światło i cienie dokłada program.
5. **Na obiektach (drzewa, latarnie, ludziki, wozy) nie maluj cienia na ziemi na samym obrazku.** Zamiast tego do każdego obiektu, który stoi na ziemi, dołącz **osobny plik z jego cieniem**: `<nazwa>_cien.png`, tej samej wielkości co obiekt, czarna plama na przezroczystym tle. Namaluj go tak, jak cień leży płasko na ziemi w widoku gry: od punktów, którymi obiekt dotyka ziemi (kopyta, oba koła wozu, stopy, podstawa), w prawo-w dół. Program go zmiękczy, przyciemni i położy pod obiektem. Sam program nie wie, gdzie są koła i nogi, i to wychodzi śmiesznie: w próbie cień był tylko pod jednym kołem wozu. Samo cieniowanie obiektu (światło z lewej-góry) jak najbardziej.
6. **Jedna paleta dla wszystkiego:** przygaszone, ciepłe barwy jak na kukłach. Prosimy o kartę palety (12–16 głównych kolorów). Ziemia ma być **trochę ciemniejsza i mniej nasycona** niż postacie, żeby postacie się czytały, ale nie wyskakiwały z obrazu.
7. **Kontur:** cienki i **nie czarny**: ciemniejsza wersja koloru tego, co obrysowuje (brąz przy drewnie, ciemna zieleń przy liściach, ciemny fiolet przy ubraniu), taki sam na budynkach, obiektach i **postaciach**. Właściciel ocenił próbę: nieczarne obrysy mapy są super, a postacie z czarnym konturem za mocno z niej wyskakują.
8. **Perspektywa obiektów musi pasować do mapy.** Mapa jest widziana **prawie z góry**: ziemia i dachy są pokazane jak na planie, bez skrótu, a pionowe ściany tylko jako niski pasek (dom piętrowy ma ścianę wysokości około 2/3 szerokości drzwi). Dlatego:
   - coś okrągłego leżącego na ziemi (podstawa fontanny, brzeg kotła, studzienka, kwietnik) rysujemy **prawie jako koło**, nie jako płaską elipsę,
   - widzimy **górę** przedmiotów: wnętrze kotła, wodę w fontannie, siedzisko ławki, blat stołu,
   - wysokość rzeczy pionowych (słupy, latarnie, pnie, wieża) jest skrócona do około 2/3.
   
   Na próbie **kocioł na Rynku zupełnie nie pasuje**: jest narysowany z boku, na wysokości oczu, więc wygląda na doklejony. Tak samo fontanna, wieża zegarowa i przyrządy treningowe; przy przemalowaniu trzeba je obrócić „pod mapę”. Ludziki mogą zostać w widoku „z przodu, lekko z góry” jak dziś, bo tak jest przyjęte w grach tego typu i przy ich wielkości to nie razi.

## A. Podłoże – tekstury 512×512, bez szwów, po 3 warianty

Trzy warianty tej samej tekstury (A, B, C, w tej samej palecie i jasności) pozwolą programowi mieszać je, żeby nie było widać powtórzeń. Nazwy jak dotąd: `podloze_<rodzaj>_a/_b/_c.png`.

- `trawa` – krótka, miejska, z drobnymi kępkami i pojedynczymi kwiatkami,
- `laka` – wyższa trawa, więcej kwiatów (łąki, pola za miastem),
- `bruk` – kostka brukowa ulic, lekko nierówna, z ciemnymi szparami,
- `chodnik` – płyty chodnikowe, jaśniejsze od bruku,
- `plac` – duże kamienne płyty rynków i placów,
- `droga` – ubita ziemia ścieżek i polnych dróg, z koleinami i kamyczkami,
- `park` – trawa parkowa, staranniejsza od zwykłej,
- `las` – ściółka: igły, liście, mech, korzenie (pod drzewami lasu),
- `pole` – zaorana ziemia albo zboże (dwa rodzaje: `pole_orka`, `pole_zboze`),
- `zarosla` – gęste krzaki od góry,
- `woda` – rzeka i staw: spokojna, z lekkimi refleksami; **3 klatki** delikatnego falowania,
- `piasek` – plaża, piaskownica,
- `parking` – asfalt/żwir z ledwo widocznymi liniami,
- `tory` – podsypka z kamieni pod torami (same szyny rysuje program),
- `cmentarz` – trawa z alejkami (nagrobki osobno, patrz D).

## B. Krawędzie – paski, które program kładzie wzdłuż granic

Dziś trawa i droga stykają się ostrą linią i to najbardziej psuje wrażenie. Każdy pasek: **poziomy, powtarzalny w poziomie, 512 px długości, 48–96 px wysokości**, z jednej strony przezroczysty (program układa go wzdłuż krawędzi i zagina na łukach).

- `krawedz_trawa_droga` – kępki trawy i kamyki nachodzące na ziemną drogę,
- `krawedz_trawa_bruk` – krawężnik z kamienia z trawą przy nim,
- `krawedz_chodnik_jezdnia` – krawężnik między chodnikiem a jezdnią,
- `brzeg_wody` – brzeg: trzciny, kamienie, mokry piasek (strona wody przezroczysta),
- `skraj_lasu` – krzaki i paprocie na skraju lasu,
- `okap_dachu` – krawędź dachu (rynna, dachówki na brzegu) – była już w zamówieniu 06 (`dach_okap`),
- `cokol_sciany` – dół ściany przy ziemi (kamienny cokół, trochę mchu).

## C. Budynki

- **Dachy w stylu kukieł**, tekstury 512×512 bez szwów i bez kierunkowego światła, wszystkie rodziny kolorów: dachówka czerwona, dachówka brązowa, łupek, blacha zielona, papa szara, miedź z patyną (zielonkawa). Dotychczasowe `dach_*` zostają, jeśli pasują do sceny-podglądu.
- **Ściany frontowe** jak w paczce 03c (`sciana_<materiał>_gladka/okno/drzwi`), ale w nowej manierze: tynk kremowy, cegła, tynk żółty, tynk szary, drewno.
- **Dachy ważnych miejsc** (sklep, szkoła, kościół…) są dziś płaską farbą w jednym kolorze. Program może zabarwić zwykłe dachówki kolorem miejsca. Jeśli masz pomysł na coś ładniejszego (np. wieżyczka, flaga, szyld na dachu), pokaż go na podglądzie.

## D. Obiekty na mapie (każdy: jeden obraz albo kilka klatek obok siebie, obiekt na dolnej krawędzi, środek podstawy na środku)

Część już jest (latarnia, ławka, kosz, hydrant, słup ogłoszeniowy, studzienka, zegar, donica, skrzynie, welocyped, automat pocztowy, fontanna, kocioł, wieża, drogowskaz, drzewa, krzak, sosna, grzyb, kłoda). Prosimy o **przemalowanie ich w manierze kukieł**, żeby miały tę samą dokładność: dziś każdy ma inną wielkość piksela. Nowe:

- `nagrobek` (3 rodzaje), `krzyz_przydrozny`, `plot_drewniany` i `plot_kuty` (już są – do sprawdzenia w nowym stylu), `murek`,
- `trzciny` (kępa przy wodzie), `kamienie` (2 rodzaje), `kwiaty` (kępa, 3 kolory),
- `drzewo_lisciaste` w **3 odmianach i 2 wielkościach** (dziś jedno drzewo powtarza się w całym parku).

## E. Przedmioty i ikony

Ikony przedmiotów (miecze, łuki, zbroje, hełmy, buty, talizmany, esencje, owoce, grzyby, drewno…) są dziś **pikselowe 16×16** i najbardziej odstają od reszty. Prosimy o **wszystkie w stylu kukieł**, kwadrat **256×256 px**, przezroczyste tło, kontur jak na kukłach. Lista obecnych: `4_przedmioty_obecne/`. Nowe, do drugiej ręki: **tarcza drewniana**, **tarcza okuta**, **kołczan ze strzałami**.

## F. Postacie – na koniec, po teście mapy

**Wzór stylu:** `1_format/wzor_stylu_postaci_trener_biegaczka.png` (trener i biegaczka, z których zrezygnowaliśmy w grze, ale ich wygląd jest dokładnie tym kierunkiem). Bierzemy z nich:
- **proporcje:** duża głowa (ok. 40–45% wysokości postaci), krótkie ciało, wyraźna sylwetka, czytelna z daleka;
- **kroki:** w klatkach kroku nogi są wyraźnie rozstawione, a ręce idą na zmianę. Dziś u wielu mieszkańców kroki A i B są prawie takie same i ludzie wyglądają, jakby lewitowali;
- **charakter:** każda postać ma 1–2 znaki rozpoznawcze (czapka i gwizdek, kucyk i opaska);
- **trzy kierunki** (przód, bok, tył) jak dotąd.

**Co zmieniamy względem wzoru** (bo mapa nie jest pikselowa):
1. **Rysujemy dokładniej, bez widocznych pikseli:** miękkie cieniowanie jak na kukłach i wozach, 3–4 odcienie na każdy kolor przechodzące płynnie, delikatny połysk na włosach i metalu.
2. **Kontur cienki i nie czarny:** ciemniejsza wersja koloru, który obrysowuje (ciemny granat przy granatowej kurtce, ciemny brąz przy włosach, ciemny róż przy skórze). Grubość około 1/60 wysokości postaci, czyli mniej niż połowa konturu wzoru. Kontur zewnętrzny może być odrobinę mocniejszy od wewnętrznych linii.
3. **Kolory przygaszone** o mniej więcej 20% względem wzoru: czerwień bardziej ceglana, żółć bardziej miodowa, granat szarawy. Zasada: postać ma być o krok jaśniejsza i żywsza od ziemi, ale z tej samej palety (patrz punkt 6 wyżej).
4. **Światło z lewej-góry**, tak jak na mapie i kukłach. Bez cienia na ziemi (ten dokłada program).
5. **Lekki steampunk** tylko w drobiazgach (mosiężny guzik, klamra, gogle na czapce), jak w `STYL_SWIATA_steampunk.md`.

**Format bez zmian, tylko większy:** arkusz 3×3 (wiersze: przód, bok patrzący w lewo, tył; kolumny: krok A, stoi, krok B), **klatka 192×192 px** (cały arkusz 576×576), stopy 6 px nad dolną krawędzią klatki, postać na środku klatki. We wszystkich klatkach głowa na tej samej wysokości (±2 px), a stojąca klatka dokładnie w tym samym miejscu co kroki (dziś u rycerza i łuczniczki była przesunięta o kilka pikseli i chodzenie drgało). Do każdej postaci, jak dotąd, **maska ubrania** `<nazwa>_maska.png` (czerwony = ubranie, zielony = drugi kolor), żeby program mógł zmieniać kolory strojów.

**Kolejność:** najpierw jedna postać (np. obecny `knight`) w nowym stylu, na scenie-podglądzie obok wozu i domów. Po akceptacji reszta: 10 bohaterów, 15 mieszkańców, postacie stałe, wrogowie.

## G. Pogoda i nowe potwory (gra już pobiera prawdziwą pogodę)

Gra zna pogodę za oknem w miejscu gracza (deszcz, ulewa, burza, śnieg, mgła, mróz, śnieg leżący na ziemi). Deszcz, płatki, mgłę i błyski rysuje program. Od Ciebie potrzebujemy:

**1. Śnieg na ziemi, 2 poziomy** (dla każdej tekstury z części A i dachów z C, te same zasady: 512×512, bez szwów, 3 warianty):
- `_snieg1` – **drobny śnieg**: biały puch w zagłębieniach, trawa i kostka brukowa przebijają spod spodu (widać ok. połowę podłoża),
- `_snieg2` – **duży śnieg**: wszystko białe, miękkie zaspy; na drogach (`droga`, `bruk`, `chodnik`) śnieg **odgarnięty**, tylko przyprószony, z koleinami i wałami śniegu na brzegach (pasek krawędzi `krawedz_zaspa`),
- dachy ze śniegiem (dwa poziomy) i ośnieżone wersje drzew, krzaków, sosen, latarni, ławek.

**2. Kałuże** – 3 rodzaje małych kałuż (widok z góry, z odbiciem nieba), gra rozkłada je na drogach w deszczu i po deszczu.

**3. Parasole** dla mieszkańców – osobny obrazek parasola do „założenia” nad głowę (widok jak ludziki: z przodu, lekko z góry), 4 kolory w jednym arkuszu, 2 klatki (lekkie kołysanie). Dziś rysuje go program (prosty półokrąg).

**4. Nowe potwory** (arkusze jak postacie: 3×3 klatki, maniera kukieł, bez czarnego konturu):
- **wodny blob** – mała, galaretowata kropla wody z oczkami, półprzezroczysta, niebieska; skacze (2 klatki podskoku wystarczą). W deszczu zastępuje chochliki. Wielkość: do kolan dorosłego ludzika.
- **wodnik** – „pan” blobów, jak właściciel prowadzący 1–2 psy: wodny czarodziej w pelerynie z wodorostów, z laską z muszlą albo kulą wody; mokre włosy, lekko niebieskawa skóra, trochę straszny, ale nie za bardzo (grają dzieci). Klatki: chód (3 kierunki) + **2 klatki czarowania** (unosi laskę, z której płynie niebieska nić magii). Dziś zastępuje go przebarwiony zombiak.
- **smok ognisty** i **smok wodny** – dwa kolejne smoki obok obecnego (ognisty słabnie i znika w ulewie, wodny jest wtedy mocniejszy o 20%): ta sama wielkość co obecny smok, lot 2–4 klatki, widok jak cień smoka (z góry, głowa w kierunku lotu) i jak postać (z boku) do walki.

## Czego nie trzeba

- **Mgły wojny** (pergamin) – zostaje jak jest. Program zmiękcza jej krawędź i odsuwa ją od ścian.
- **Cieni na ziemi** – robi je program.
- **Całych ulic i placów** – program składa je sam z klocków.

## Wydajność (dla porządku)

Program maluje mapę **raz na każdy kwadrat 512×512** (nie co klatkę), więc dokładne tekstury prawie nie kosztują płynności. Próba z cieniami wydłużyła to malowanie o 15–30%. Ważne jest tylko, żeby **tekstury nie były większe niż 512×512** i żeby animowane były tylko drobne rzeczy (woda, para, płomień).
