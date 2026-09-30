# Zamówienie 08 – cała mapa w stylu kukieł treningowych

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

## F. Postacie – na koniec

Bohaterowie i mieszkańcy są dziś rysowani drobnym pikselem. Kiedy mapa będzie gotowa i zaakceptowana, **przemalujemy ich w tej samej manierze** (jak wozy: miękkie cieniowanie, cienki kontur). To duża praca, więc dopiero po teście mapy. Na razie wystarczy na scenie-podglądzie pokazać **jednego ludzika w nowym stylu** obok obecnego.

## Czego nie trzeba

- **Mgły wojny** (pergamin) – zostaje jak jest. Program zmiękcza jej krawędź i odsuwa ją od ścian.
- **Cieni na ziemi** – robi je program.
- **Całych ulic i placów** – program składa je sam z klocków.

## Wydajność (dla porządku)

Program maluje mapę **raz na każdy kwadrat 512×512** (nie co klatkę), więc dokładne tekstury prawie nie kosztują płynności. Próba z cieniami wydłużyła to malowanie o 15–30%. Ważne jest tylko, żeby **tekstury nie były większe niż 512×512** i żeby animowane były tylko drobne rzeczy (woda, para, płomień).
