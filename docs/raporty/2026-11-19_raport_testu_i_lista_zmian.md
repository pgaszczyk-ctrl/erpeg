# Exp-lore – raport z testu i lista zmian

19.11.2026 · Paweł (właściciel) · wersja gry 1.049

Kopia dokumentu z claude.ai (https://claude.ai/artifact/5LUfBaUyHn6XJPvd6yK4Kc), zapisana w repozytorium, żeby programista i grafik mieli ją w gicie. Przy rozbieżnościach aktualny jest ten plik, dopóki właściciel nie zdecyduje inaczej.

Klimat i dopracowanie okien są mocne, ale pierwsze 10 minut zniechęca: samouczek potrafi zabić, łuk nie trafia, za walkę nie ma łupu, a poza Lublinem świat jest polski z nazwy i z wyglądu. Najpierw trzeba naprawić prolog poza Lublinem, walkę dystansową i łup, potem przejść na nowe postacie i zróżnicować regiony.

## Zakres testu i zastrzeżenia

Grałem wersją produkcyjną 1.049 zbudowaną lokalnie, z atrapą serwera. Dwie postacie na poziomie Średnim: „Rycerz Tibiak” w Lublinie (pełna mapa) i „Druid Burgas” w Burgas (wycinek mapy świata ok. 6 × 7 km).

- Grafika była emulowana (10–19 klatek/s), więc powolne chodzenie i ładowanie nie są winą gry.
- Dłuższe przejścia skracałem, przestawiając postać. Do testu sklepu dałem sobie 2000 złota.
- Tabelę łupu (`stwory_lup`) sprawdziłem na produkcyjnej bazie: jest pusta. Brak łupu to prawdziwy stan gry, nie efekt atrapy.
- Podwójny heartbeat widziałem w ruchu sieciowym; przyczyny w kodzie nie potwierdziłem.
- Czcionki Google były zablokowane, więc część dialogów na zrzutach ma czcionkę zastępczą.

## Wszystkie zmiany

Dziewięć rzeczy jest pilnych (P0): blokują nowego gracza albo psują pierwsze wrażenie. Wysiłek to szacunek: mały = godziny, średni = dni, duży = tygodnie z grafikiem.

| # | Zmiana | Obszar | Priorytet | Wysiłek |
| --- | --- | --- | --- | --- |
| 1 | Prolog poza Lublinem: osoby i punkty stoją w budynkach (łucznik w Burgas nie do osiągnięcia) | Prolog | P0 | mały |
| 2 | Walki prologu nie mogą zabić nowego gracza | Prolog, walka | P0 | mały |
| 3 | Łuk: naprowadzanie, zasięg i celność na 1. poziomie | Walka | P0 | średni |
| 4 | Łup: tabela na produkcji jest pusta – ustawić łup z potworów | Ekonomia | P0 | mały |
| 5 | Spacja (atak) nie może zamykać ważnych okien (śmierć, nagroda) | Interfejs | P0 | mały |
| 6 | Zadania przyjęte w trakcie prologu muszą być widoczne | Zadania | P0 | mały |
| 7 | Koniec prologu: nagroda i wskazówka, co dalej | Prolog | P0 | mały |
| 8 | Styl regionu: kraj spoza listy dostaje polski wygląd (błąd) | Świat | P0 | mały |
| 9 | Lokalne imiona ludzi i nazwy miejsc | Lokalność | P0 | średni |
| 10 | Nowe działanie mocnego ciosu (jeden sposób uruchamiania, widoczne odnowienie) | Walka | P1 | średni |
| 11 | Nowe postacie: rysowane chibi fantasy/steampunk zamiast modeli 3D, 8 kierunków jak w Diablo, warstwy (strój z 4 kolorami, hełm, broń), nazwa i pasek życia w walce | Grafika | P1 | duży |
| 12 | Ceny i zarobek: pierwszy zakup w ciągu 15–20 minut gry | Ekonomia | P1 | średni |
| 13 | Czytelność wrogów: nazwa, pasek życia, widoczność pod drzewami | Walka | P1 | średni |
| 14 | E/AKCJA: osoba przed drzwiami, mniejszy napis nad bohaterem | Interfejs | P1 | mały |
| 15 | HUD: podpisy rur, portret zgodny z postacią, moneta „gość” nie w walce | Interfejs | P1 | mały |
| 16 | Heartbeat co 3 s, do tego zdublowany | Technika | P1 | mały |
| 17 | Zapis nie tylko przy budynkach | Rozgrywka | P1 | średni |
| 18 | Więcej różnorodności: budynki, rośliny, ludzie, morze | Świat | P1 | duży |
| 19 | Jeden styl dialogów (dziś dwa różne) | Interfejs | P2 | średni |
| 20 | Mapa: morze, legenda ikon, podpisy nie ucięte | Interfejs | P2 | średni |
| 21 | Bohater stoi na dachach (dach wystaje nad ulicę) | Grafika | P2 | średni |
| 22 | Mgła wojny ma kwadratowe krawędzie | Grafika | P2 | mały |
| 23 | Sklep: po zakupie zaznaczenie wraca na strzały; opisy szablonowe | Sklep | P2 | mały |
| 24 | Drobne: imię „Ivy”, „PD” obok „EXP”, formularz na ekranie 720 px | Interfejs | P2 | mały |
| 25 | Profesje (rycerz, łowca, mag) z wyborem na ok. 5. poziomie – po naprawie łuku | Rozgrywka | P1 | duży |

## Dla programisty: zadania na dziś

Kolejność to numery P0 z tabeli. Każde zadanie ma miejsce w kodzie i warunek „zrobione”. Zmiany idą na serwer testowy; produkcja tylko na polecenie właściciela (zasada z CLAUDE.md). Testy przeglądarkowe z atrapą serwera są w `scripts/tests/` (np. `browser-prolog.mjs`).

1. **Punkty prologu w budynkach (#1)**
   - Gdzie: `src/prolog/planner.ts` (`planAnchors`), wywołanie w `src/scenes/PrologRekruta.ts` (ok. linii 131).
   - Co wiadomo: planer bierze punkty z sieci przejść (`localRoutes`), więc w chwili planowania były wolne. W Burgas punkt „ambush” po doczytaniu mapy leży w budynku (`city.isBlocked` = true). Hipoteza: plan powstaje, zanim doczytają się wszystkie kafle w promieniu 480 m (na mapach świata budynki przychodzą z kaflami).
   - Zrobić: planować dopiero, gdy cały promień jest wczytany; przy każdym wejściu sprawdzać zapisane punkty i przesuwać zablokowany na najbliższy osiągalny z drogi. To samo dla osób przy zadaniach.
   - Gotowe, gdy: prolog przechodzi w Lublinie i w Burgas (próbka `data/world-sample/burgas.pmtiles` na gałęzi `claude/ecstatic-franklin-suctsf`), żaden punkt nie leży w budynku.
2. **Prolog bez śmierci (#2)**
   - Gdzie: obrażenia bohatera i `onPlayerDeath` w `src/scenes/GameScene.ts`; etap prologu w `this.prolog.state.stage`.
   - Zrobić: dopóki prolog trwa, życie nie spada poniżej 1. Wzór już jest: w demie GameScene ogranicza obrażenia w fazie walki ze smokiem.
   - Gotowe, gdy: na poziomie Hardkor walka przy łuczniku i loch nie kończą się szpitalem.
3. **Łuk (#3)**
   - Gdzie: `src/content/walka.ts` (`celowanieStopnie`, `dystans`, tabela trafień łuku), `aimAssist` i `fireShot` w GameScene (ok. linii 6665–6700), wybór interakcji przy kliknięciu w potwora.
   - Zrobić: cel automatyczny (najbliższy widoczny wróg w zasięgu), stożek 60°, zasięg na starcie 4× miecz, trafienie na 1. poziomie ok. 70%, klik w potwora z łukiem lub różdżką = strzał.
   - Gotowe, gdy: w lochu prologu chochlik ginie od łuku w kilku strzałach, a pudła widać.
4. **Łup (#4)** – bez kodu: panel admina, zakładka Stworki. Tabela `stwory_lup` na produkcji jest pusta; co i z jaką szansą – decyzja właściciela.
5. **Spacja w ważnych oknach (#5)**
   - Gdzie: `src/scenes/UIScene.ts`, obsługa Spacji/Entera w dialogu (ok. linii 1154 i 1233).
   - Zrobić: okna śmierci, szpitala i nagród nie reagują na Spację przez pierwsze 0,5–0,8 s albo wymagają kliknięcia.
6. **Zadania ukryte w prologu (#6)**
   - Gdzie: `activeQuests()` w GameScene (ok. linii 7683): `if (recruit && session.story.prolog) return [recruit];` zwraca wyłącznie cel prologu.
   - Zrobić: cel prologu na górze, pozostałe zadania pod nim (HUD, dziennik, strzałki).
7. **Koniec prologu (#7)**
   - Gdzie: zakończenie u bibliotekarza w `src/scenes/PrologRekruta.ts`.
   - Zrobić: nagroda (kwota do decyzji właściciela), okno z wyborem 2–3 kierunków i strzałka do wybranego.
8. **Styl regionu (#8)**
   - Gdzie: `stylRegionu` w `src/content/styleRegionow.ts`: `if (kraj) return … ?? STYL_DOMYSLNY`.
   - Zrobić: gdy kraj nie pasuje do żadnego stylu, sprawdzić obszary; dopisać BG, RO, RS, MK, AL, TR.
   - Gotowe, gdy: Burgas dostaje styl śródziemnomorski.
9. **Heartbeat (#16)**
   - Gdzie: GameScene ok. linii 1058–1075 (`HEARTBEAT_MS` = 3000).
   - Do sprawdzenia: w Burgas wywołania szły parami, 0,3 s od siebie. Postać była utworzona po wyjściu poprzedniej do menu, bez przeładowania strony – sprawdzić, czy stara scena gry nie zostaje z własnym licznikiem.

Imiona lokalne (#9) wymagają najpierw decyzji o pisowni (zob. Decyzje). Struktura: listy na kraj w `src/content/mieszkancy.ts`, wybór w `src/scenes/Townsfolk.ts` (ok. linii 147).

## Łuk i naprowadzanie

Łuk na starcie jest bezużyteczny: w lochu 22 strzały dały zero trafień, a miecz zabijał tego samego chochlika w 2 ciosach. Powody są cztery i wszystkie da się poprawić liczbami i jedną nową zasadą.

**Co jest dziś**

- Naprowadzanie działa tylko na wroga w stożku 35° od kierunku strzału i tylko w zasięgu (`WALKA.celowanieStopnie`, `aimAssist`).
- Zasięg na 1.–3. poziomie to 2× zasięg miecza, czyli ledwie kilka kroków. Strzały do chochlika 100 px dalej znikały w powietrzu.
- Celność na 1. poziomie: 40% (miecz: 85%).
- Na klawiaturze strzał leci tam, gdzie postać ostatnio szła. Kliknięcie w cel nie strzela, tylko mówi „Podejdź bliżej”.
- W próbie łuku trafiłem dopiero po idealnym ustawieniu się w osi celu. „Cel treningowy” wygląda jak żywy człowiek.

**Co zmienić**

1. Cel automatyczny jak w Tibii: ATAK bez celowania strzela w najbliższego widocznego wroga w zasięgu. Wybrany cel ma kółko pod stopami; Tab (komputer) albo stuknięcie we wroga (telefon) zmienia cel.
2. Kliknięcie we wroga z łukiem lub różdżką = strzał w niego, nigdy „Podejdź bliżej”.
3. Stożek naprowadzania 35° → ok. 60° dla celowania ręcznego.
4. Zasięg na 1. poziomie co najmniej 4× zasięg miecza (ok. 1/3 ekranu), potem wolniejszy wzrost. Dzisiejszy wzór daje 44× na 20. poziomie, co jest przesadą w drugą stronę.
5. Celność na 1. poziomie 40% → ok. 70%, do 95% na wysokich poziomach.
6. Pudło widoczne: strzała leci obok celu i napis „pudło” nad wrogiem, nie znika bez śladu.
7. Próba łuku w prologu zawsze trafia, a cel to tarcza na stojaku, nie postać.

## Mocny cios

Rekomendacja: mocny cios uruchamiany tylko przyciskiem (Q na komputerze), z widocznym odnowieniem na przycisku i krótkim zamachem, który widać – bez przytrzymywania ataku. Dziś dwa sposoby uruchamiania się gryzą, a efekt jest tak mocny, że zwykły cios traci sens.

**Co jest dziś**

- Dwa wyzwalacze: przytrzymanie ataku przez 1 s i przycisk MOCNY CIOS. Oba biorą staminę i mają wspólne odnowienie.
- Efekt miecza: ×3 do ×5 obrażeń, 1,3× dalej, zawsze trafia, ogłusza.
- Na telefonie przytrzymanie ataku to też celowanie, więc gracz nie wie, czy celuje, czy ładuje.
- Stamina to nieopisana żółta rura; gracz nie wie, dlaczego cios nie wychodzi.

**Proponowane działanie**

1. Jeden wyzwalacz: przycisk umiejętności (Q). Przytrzymanie ataku zostaje tylko do celowania.
2. Na przycisku odliczanie (ciemnienie zgodnie z ruchem wskazówek) i liczba sekund.
3. Krótki zamach (ok. 0,3 s) z widocznym łukiem przed bohaterem: trafia każdego w tym łuku.
4. Obrażenia ×2 zamiast ×3–×5, odrzut i krótkie ogłuszenie. Bez „zawsze trafia” – trafia, bo jest szeroki.
5. Koszt staminy podpisany na przycisku; brak staminy = przycisk szary z dymkiem „Brak sił”.
6. Każda broń ma własny wariant: miecz – zamach, łuk – strzała przebijająca kilku wrogów w linii, różdżka – kula z wybuchem. To baza pod późniejsze czary jak „exori” w Tibii.

Alternatywa, jeśli przytrzymanie ma zostać: tylko na komputerze, z wyraźnym paskiem ładowania nad bohaterem, a na telefonie wyłącznie przycisk.

## Postacie: rysowane chibi w steampunku, ruch jak w Diablo

Nowe postacie to rysowane sprite'y chibi w klimacie fantasy i steampunku, składane z warstw: ciało, głowa, hełm, broń. Dzięki warstwom ruch jak w Diablo (8 kierunków, płynny chód, zamach bronią) da się narysować w rozsądnym czasie.

**Decyzje właściciela (19.11.2026)**

- Obecne postacie 3D odpadają: są za małe i nieczytelne, wszyscy wyglądają tak samo, a wygląd 3D nie pasuje do świata.
- Styl: rysowane chibi, fantasy i steampunk (gogle, mosiądz, skóra, płaszcze).
- Różnorodność jak w Tibii: strój plus 4 kolory do wyboru (nakrycie głowy, góra, dół, buty); kolejne stroje i dodatki jako nagrody.
- Na postaci widać hełm i broń w ręce.
- Ruch jak w Diablo: 8 kierunków i płynny chód.
- Nazwa i pasek życia tylko w walce.

**Warstwy z punktami zaczepienia**

| Warstwa | Co rysuje grafik | Jak gra to składa |
| --- | --- | --- |
| Ciało w stroju | pełna animacja + maska kolorów stroju i skóry | przebarwia maską według kolorów gracza |
| Głowa (twarz, włosy) | 1 rysunek na kierunek + maska skóry i włosów | przypina w punkcie szyi zapisanym dla każdej klatki ciała |
| Hełm lub nakrycie | 1 rysunek na kierunek, osobno dla każdego wyglądu | przypina do głowy |
| Broń w ręce | 1 rysunek na kierunek, osobno dla każdego rodzaju broni | przypina w punkcie dłoni, z kątem zapisanym dla każdej klatki |

W chibi głowa jest duża i sztywna, więc głowa i hełm nie potrzebują animacji klatka po klatce. Animuje się tylko ciało – to tnie koszt rysowania kilkunastokrotnie. Bez warstw każde połączenie stroju, hełmu i broni wymagałoby osobnej animacji.

**Animacje ciała**

| Element | Ilość |
| --- | --- |
| Kierunki | 8; rysowane 5 (dół, dół-lewo, lewo, góra-lewo, góra), prawa strona = odbicie |
| Postój | 1 klatka (opcjonalnie 4 klatki oddechu) |
| Chód | 8 klatek |
| Atak (zamach bronią) | 5 klatek |
| Razem na jeden strój | ok. 70 klatek + maski |
| Dane do każdej klatki | punkt szyi, punkt dłoni, kąt broni (plik danych obok arkusza) |

Uczciwie o koszcie: to ok. 8× więcej klatek ciała niż w stylu Tibii (70 zamiast 9 na strój). Mieszkańcy w tle mogą mieć lżejszy zestaw: 4 kierunki, chód 4 klatki, bez ataku.

**Wygląd ekwipunku: klasy, nie przedmioty**

- Hełmy i nakrycia: brak, czapka, skórzany, żelazny, kapelusz maga, korona – 6 wyglądów × 5 kierunków = 30 rysunków.
- Broń: miecz, topór, łuk, kusza, różdżka, kij – 6 × 5 = 30 rysunków.
- Przedmiot dostaje pole „wygląd” (np. każdy skórzany hełm = „skórzany”); nowy przedmiot nie wymaga nowego rysunku. Jakość zmienia tylko odcień.

**Wielkość, styl, czytelność**

- Postać ok. 1,2–1,3× większa niż dziś, głowa ok. 40% wysokości (chibi). Potwierdzić zrzutem z telefonu.
- Gęstość pikseli jak świat (1 piksel rysunku = 0,5 punktu mapy), ciemny obrys w kolorze obrysów gry, nasycone kolory.
- Nazwa i pasek życia nad wrogiem i bohaterem tylko w walce: pojawiają się przy pierwszym ciosie lub gdy wróg atakuje, gasną kilka sekund po walce.

**Kolejność**

1. Pilotaż: strój strażnika startowego w 8 kierunkach (postój, chód, atak), 1 głowa, 2 hełmy, 2 bronie (miecz, łuk), z danymi punktów zaczepienia – w dwóch wariantach obok siebie: A rysowany ręcznie, B wyrenderowany z obecnego modelu 3D strażnika i przerobiony na piksele. Oba w grze obok dzisiejszej postaci; zrzuty i nagranie chodu na telefonie w Lublinie i Burgas. Jeśli B wygląda dobrze, kolejne przedmioty modeluje się raz, a kierunki i klatki wychodzą same. Zamówienie: `docs/poczta/do-grafika/2026-11-19_50-P001_postacie_chibi_pilotaz.md`, prompt dla ChatGPT obok w `50_postacie_chibi/PROMPT_GPT.md`.
2. Stroje profesji (rycerz, łowca, mag), reszta hełmów i broni.
3. Mieszkańcy w lżejszym zestawie, 6–8 strojów różnych wiekiem i płcią.
4. Potwory w tym samym stylu (dziś są modelami 3D).

**Gdzie w kodzie**: dziś `src/sprites.ts` obsługuje arkusze 3 × 3 (3 kierunki, 3 klatki). Potrzebne: arkusze 5 kierunków z odbiciem, wybór jednego z 8 kierunków z kierunku ruchu, składanie warstw w punktach zaczepienia (baza: przebarwianie z masek w `src/ui/modulPostac.ts`). Modele 3D do wyłączenia po przejściu: `src/ludzik3d.ts`, `src/mieszkancy3d.ts`, `src/stwory3d.ts` (przełączniki `?ludzik3d=0`, `?mieszkancy3d=0`, `?stwory3d=0` już działają). Portret w HUD i w Kufrze z głowy tej samej postaci.

## Lokalność: imiona i miejsca

W Burgas ludzie nazywają się „Pani Ania”, sprzedawca to „Kowal za ladą” jak w Biedronce, a ulice są tylko cyrylicą. Imiona przechodniów pochodzą z jednej polskiej listy (`MIESZKANCY.imiona` / `imionaWg` w `content/mieszkancy.ts`) bez względu na kraj.

**Co zmienić**

1. Listy imion na kraj: co najmniej 30 męskich i 30 żeńskich, osobno dla dzieci, dorosłych i starszych. Na początek kraje, w których gracze faktycznie zaczynają, plus zapas według regionu (np. imiona południowosłowiańskie dla krain bez własnej listy).
2. Forma zwracania się lokalna, nie „Pan/Pani”: w Bułgarii np. „Baj Iwan”, „Kaka Mara”, w Anglii „Mr Smith”. Na początek wystarczy samo imię.
3. Pisownia: imię w alfabecie łacińskim (Ivan, Mariya), w polskim interfejsie po polsku (Iwan, Maria). Oryginał (Иван) może stać drobnym drukiem w dialogu.
4. Ulice: w HUD zapis łaciński z oryginałem obok, np. „Dunaw (Дунав)”. Dziś gracz nie umie przeczytać, gdzie jest.
5. Sklepy bez nazwy w danych: zamiast polskiego „Sklep” nazwa lokalna („Магазин / Magazin”) albo ogólna w języku gracza.
6. Sprzedawca zależny od rodzaju sklepu: supermarket – kasjerka, sklep budowlany – kowal/majster, targ – handlarz. „Kowal za ladą” w Biedronce i w MiniMarcie łamie klimat.
7. Postacie prologu (strażnik, dyżurny, łucznik, bibliotekarz) dostają lokalne imiona i lokalny wygląd, a nazwy punktów zastępczych są zapisane w obu językach naraz („Punkt straży / Guard post” w pliku src/prolog/planner.ts) – trzeba je tłumaczyć jak resztę tekstów.
8. Kurier Parowy i gazeciarze w innym kraju: lokalna nazwa gazety lub przynajmniej lokalne wieści.

Język dialogów nadal idzie za graczem (Polak w Bułgarii czyta po polsku) – to jest dobrze i tego nie zmieniamy.

## Różnorodność świata

Burgas wygląda jak Lublin: te same kamienice z muru pruskiego, czerwone dachówki, te same drzewa i ludzie. Częściowo to błąd, a częściowo brak treści.

**Błąd do poprawy od razu**

`stylRegionu` w `content/styleRegionow.ts` najpierw sprawdza kraj. Gdy kraj jest znany, ale nie ma go na żadnej liście (Bułgaria), od razu zwraca styl polski i nie patrzy już na prostokąty obszarów. Burgas leży w prostokącie śródziemnomorskim, a dostał polski. Poprawka: przy znanym kraju spoza list sprawdzać obszary, dopiero potem styl domyślny. Do tego dopisać kraje: BG, RO, RS, MK, AL, TR do odpowiednich stylów.

**Co dodać, warstwa po warstwie**

| Warstwa | Dziś | Propozycja |
| --- | --- | --- |
| Budynki | 7 stylów, większość świata dostaje polski | więcej stylów; osobny styl „blokowisko” dla miast postsocjalistycznych (bloki z wielkiej płyty, dużo balkonów), białe domy z płaskimi dachami na południu |
| Kościoły i świątynie | jeden wygląd | wygląd z danych OSM o wyznaniu: cerkiew z kopułami, meczet z minaretem, świątynia buddyjska |
| Roślinność | te same liściaste drzewa wszędzie | gatunki według klimatu: palmy i cyprysy na południu, brzozy i świerki na północy, kaktusy w klimacie suchym |
| Morze i plaża | piasek jest, morza na mapie nie widać | fale, linia brzegu, plaża z leżakami, port z łodziami |
| Ludzie | jedna pula wyglądów i ubrań | palety ubrań i karnacji według regionu (działa już przebarwianie przez maski) |
| Potwory | takie same w każdym mieście | wariant regionalny: np. nad morzem wodne stwory, na południu jaszczurki zamiast wilków |
| Detale ulicy | latarnie i dekoracje jednego rodzaju | lokalne szyldy, typ latarni, kioski, tablice z lokalną nazwą miasta |

Największy efekt przy najmniejszej pracy da kolejność: poprawka błędu, roślinność według klimatu, świątynie według wyznania, styl „blokowisko”.

## Ekonomia, łup i ryzyko

W Tibii hunt jest emocjonujący, bo jest ryzyko straty i szansa na dobry łup. W Exp-lore dziś nie ma ani jednego, ani drugiego: łupu prawie nie ma, a ryzyko jest tam, gdzie nie powinno go być (samouczek).

**Liczby z testu**

| Co | Ile |
| --- | --- |
| Złoto po całym prologu i jednym zadaniu | 29 monet |
| Najtańszy przedmiot w sklepie (buty) | 600 monet |
| Miecz treningowy w sklepie | 1500 monet |
| Złoto z 5 wilków | 4 monety |
| Nagroda za rozbicie grupki potworów | 8 monet + 15 EXP |
| Nagroda za zadanie ze świątyni (3 chochliki, 700 m) | 27 monet + 27 EXP |
| Wpisy w tabeli łupu na produkcji | 0 |

Przy takich liczbach pierwszy zakup wymaga ok. 20 zadań. Jedyny przedmiot, który wpadł (hełm doskonały), pojawił się po cichu, bez komunikatu.

**Co zmienić**

1. Ustawić łup w panelu admina (zakładka Stworki). Towary już istnieją (np. kieł za 15 monet); dodać skórę wilka, żołędzie chochlika i rzadkie przedmioty.
2. Rzadki łup widoczny: kolor rzadkości, dźwięk, napis nad potworem i wpis w dzienniku „Zdobyłeś: …”.
3. Pierwszy własny zakup w ciągu 15–20 minut gry: albo tańsze przedmioty startowe, albo nagroda 600–800 monet na koniec prologu.
4. Szpital nie za darmo – lub darmowy tylko do 5. poziomu. Dziś darmowe pełne leczenie sprawia, że mikstury i owoce są zbędne.
5. Kara za śmierć jak w Tibii: część plecaka, nie tylko złoto. W zamian zapis w wielu miejscach, nie tylko przy budynkach.
6. Łowiska z wyraźnym ryzykiem: im głębiej, tym silniej i lepszy łup, z ostrzeżeniem na granicy.
7. „Analizator huntu” w Kufrze: zysk i strata, EXP na godzinę, zdobyte rzeczy. To mała rzecz, a fani Tibii ją uwielbiają.

## Profesje

Wybór profesji na ok. 5. poziomie, po „drugiej służbie” strażników, w prawdziwym miejscu w mieście. Profesja zmienia tempo rozwoju i ataki, ale nie blokuje broni – jak w Tibii. Prolog już daje po kolei miecz, łuk i różdżkę, a umiejętności rosną od używania, więc brakuje tylko momentu decyzji.

**Kiedy i gdzie**

- Nie zaraz po dzisiejszym prologu: kończy się po ok. 10 minutach na 2. poziomie, za wcześnie, żeby poczuć różnice.
- Po prologu „druga służba”: kilka zadań strażniczych, w których trzeba użyć każdej broni. Wybór odblokowuje się, gdy jest ukończona i gracz ma ok. 5. poziom (ćwierć drogi do maksymalnego 20).
- Wybór jako zadanie w prawdziwym miejscu: rycerz u szefa straży na posterunku, łowca na strzelnicy lub w sklepie sportowym, mag w bibliotece.

**Co zmienia profesja**

| Profesja | Broń | Zasób | Tempo umiejętności | Ataki specjalne |
| --- | --- | --- | --- | --- |
| Strażnik / Rycerz | miecz, tarcza | stamina | Krzepa ×1,5; Celność i Skupienie ×0,7 | mocny cios, zamach |
| Łowca | łuk, kusza, pistolet parowy | stamina | Celność ×1,5; pozostałe ×0,7 | mocny strzał, salwa |
| Mag | różdżka, kula, księga | mana | Skupienie ×1,5; pozostałe ×0,7 | mocny czar, wachlarz ognia |

Czwarta profesja (druid lub alchemik: leczenie, esencje, mikstury, rośliny) pasuje do alchemików i esencji, które już są w grze. Dodawać ją dopiero, gdy trzy pierwsze będą zrównoważone.

**Zasady**

1. Zmiana profesji możliwa za opłatą (zadanie albo diamenty), nie nigdy. Gracz mobilny, który źle wybrał, po prostu odejdzie.
2. Awans ok. 15. poziomu („mistrz” profesji) z nowym atakiem i wyglądem – długi cel jak promocja w Tibii.
3. Profesja zmienia bazowy strój postaci (mundur, płaszcz łowcy, szata maga); gracz dobiera 4 kolory, a dodatki do stroju są nagrodami – zob. sekcję o postaciach.
4. Najpierw naprawić łuk, inaczej łowca jest wyborem martwym od pierwszego dnia.
5. Istniejące postacie przy pierwszym logowaniu dostają wybór z podpowiedzią opartą na najwyżej rozwiniętej umiejętności.
6. Arena: duchy innych graczy pokazują profesję; dobór przeciwników może ją później uwzględniać.

**Gdzie w kodzie**: punkty umiejętności w `gear.skills` (`src/inventory.ts`), ataki specjalne w `src/content/umiejetnosci.ts`, stamina i mana w `src/content/zasoby.ts`. Profesja to nowe pole zapisu (np. `profesja`) i mnożnik przy przyznawaniu punktów umiejętności.

## Wprowadzenie i pierwsze 10 minut

Prolog „Pierwsza służba” ma dobry pomysł (list, ratunek, loch, miś), ale dzieje się w promieniu ok. 100 m od startu, potrafi zabić i kończy się w pustkę. Gracz nie dowiaduje się, jak leczyć, sprzedawać, kupować ani zapisywać grę.

**Co się wydarzyło w teście**

1. Starszy strażnik: list do dyżurnego 40 m dalej. Proste i czytelne.
2. Łucznik i dwa chochliki: zbiły mnie do 2 z 10 HP, potem zginąłem. Obudziłem się w „Klinice chirurgii onkologicznej” 500 m dalej, z mniejszym EXP. Komunikat o śmierci zamknąłem spacją, nie wiedząc o tym.
3. Próba łuku: zob. sekcja o łuku.
4. Kościół obok strażnika dał zadanie, które po przyjęciu zniknęło z HUD i dziennika aż do końca prologu (przyczyna w kodzie: zob. zadanie 6 dla programisty).
5. Loch: klimatyczny, czytelny, dobra krótka przygoda. Różdżka i kapelusz założyły się same i zdjęły miecz, który przed chwilą wybrałem.
6. Bibliotekarz: przycisk „Poznaj podstawy” kończy prolog bez żadnej lekcji. Koniec: „Dalsze zlecenia straży pojawią się osobno” i pusta linia zadania.
7. W Burgas ten sam prolog, po polsku, z samymi punktami zastępczymi; łucznik stoi w budynku i dalej się nie da.

**Co zmienić**

1. Punkty prologu wybierać tylko tam, gdzie da się dojść z drogi (sprawdzenie drogi, nie tylko „wolny punkt”) – i to samo dla osób przy zadaniach.
2. Walki prologu bez śmierci: chochliki słabsze albo życie bohatera nie spada poniżej 1 do końca prologu.
3. Rozciągnąć prolog na 300–600 m, żeby pokazać kawałek prawdziwego miasta.
4. Dodać brakujące lekcje: leczenie (H / przycisk), sprzedaż łupu, zakup w sklepie za nagrodę, mapa, zapis.
5. Koniec z nagrodą i wyborem 2–3 kierunków: gazeciarz (Kurier), tablica z kartkami, najbliższe łowisko – ze strzałką do wybranego.
6. Respawn w szpitalu, ale z neutralną nazwą w dialogu („Szpital”), bez wyświetlania nazw w stylu „Klinika chirurgii onkologicznej”.
7. Przedmioty z prologu nie zdejmują broni bez pytania: „Założyć teraz? Tak / Do plecaka”.

## Interfejs

Okna (Kufer, sklep) są ładne i czytelne; problem leży w tym, co dzieje się na ekranie gry: za dużo napisów nad bohaterem, za mało informacji o wrogach i dwa różne style dialogów.

| Obszar | Problem | Zmiana |
| --- | --- | --- |
| Interakcja E/AKCJA | Strażnik w drzwiach kościoła: E kilka razy otworzyło kościół zamiast rozmowy | osoba z „!” ma pierwszeństwo przed drzwiami; po zakończonym zadaniu „!” znika |
| Napis nad bohaterem | „Wejdź: Kościół pw. Świętego Ducha” dużą czcionką zasłania bohatera | mniejszy napis przy obiekcie, nie nad głową; długie nazwy skracane |
| Rury przy portrecie | dwie rury bez podpisów; druga raz żółta, raz niebieska | ikony serca i kropli/błyskawicy przy rurach, liczby po najechaniu |
| Portret | portret (dziewczyna w goglach) nie przypomina postaci w świecie | portret z tej samej postaci (po przejściu na sprite'y – głowa z arkusza) |
| Moneta „gość” | obraca się w środku walki i zasłania HUD | nie w walce i nie w dialogu |
| Wrogowie | brak nazwy i paska życia; chochliki giną na tle dachów, wilki znikają pod koronami drzew | pasek życia nad wrogiem w walce, nazwa po najechaniu, korony prześwitują nad wrogami |
| Okna dialogów | prolog w prostym oknie, reszta w oknie z portretami | jeden styl: okno z portretami dla wszystkich rozmów |
| Spacja | zamyka okno śmierci i nagrody, gdy gracz atakuje | ważne okna zamyka tylko klik / Enter po 0,5 s |
| Podpowiedź na dole | „SPACJA lub klik – miecz”, gdy w ręku łuk | tekst według broni w ręce |
| Sklep | po zakupie zaznaczenie wraca na strzały, więc drugie „KUP” kupi strzały | zaznaczenie zostaje na następnej rzeczy tego rodzaju |
| Mapa | prawie cała czarna, bez morza i legendy, podpisy ucięte | morze i ląd zawsze, legenda ikon, podpisy w obrębie mapy |
| Formularz postaci | na ekranie 720 px nie mieści się; domyślne imię „Ivy” | niższy układ; domyślne imię w języku gracza |
| Nazewnictwo | „+20 PD”, gdzie indziej „EXP” | jedno słowo w całej grze |

## Technika i wydajność

Najważniejsze jest obciążenie serwera przez heartbeat; reszta to tropy do sprawdzenia na prawdziwym telefonie.

| Temat | Co widziałem | Propozycja |
| --- | --- | --- |
| Heartbeat | ustawiony co 3 s (`HEARTBEAT_MS` w GameScene), a w praktyce w parach co 0,3 s: 220 wywołań w 6 minut od jednej postaci | sprawdzić, czy po restarcie sceny nie zostaje stary licznik; rozważyć co 10–15 s i dodatkowo przy wejściu w walkę |
| Obraz na komputerze | przy zwykłym monitorze gra rysuje 2560 × 1440 zamiast 1280 × 720; w emulacji 4 klatki/s zamiast 19 | sprawdzić na słabszym laptopie; jeśli tnie, zacząć od zwykłej ostrości i podnosić tylko przy zapasie klatek |
| Liczba obiektów | ok. 6800 obiektów w scenie gry | dalej ukrywać obiekty poza ekranem; mierzyć przy każdym wydaniu |
| Model 3D bohatera i potworów | osobny silnik 3D rysuje bohatera (do 20 razy na sekundę, gdy coś się zmienia) i potwory we wspólnym atlasie | zniknie po przejściu na sprite'y |
| Odczyty z płótna | dziesiątki ostrzeżeń przeglądarki o częstym odczycie pikseli | ustawić tryb częstego odczytu dla tych płócien |
| Czcionki | bez dostępu do Google Fonts część dialogów ma czcionkę zastępczą | trzymać wszystkie czcionki na własnym serwerze |
| Zapis | zapis tylko przy budynkach i końcu misji; menu ostrzega, że reszta przepadnie | zapis cichy co kilka minut poza walką |

## Kolejność prac i decyzje

Proponuję cztery etapy: najpierw to, co blokuje nowych graczy, na końcu duże prace graficzne.

1. **Szybkie poprawki (P0, małe):** punkty prologu dostępne z drogi, prolog bez śmierci, spacja nie zamyka ważnych okien, zadania widoczne w trakcie prologu, koniec prologu z nagrodą i kierunkiem, błąd stylu regionu, heartbeat, ustawienie łupu w panelu.
2. **Walka i ekonomia:** naprowadzanie i liczby łuku, nowy mocny cios, paski życia wrogów, ceny i pierwszy zakup, kara za śmierć i zapis, analizator huntu, a po naprawie łuku – profesje z „drugą służbą”.
3. **Lokalność:** listy imion na kraj, zapis ulic łacińsko + oryginał, sprzedawcy według rodzaju sklepu, lokalne postacie prologu.
4. **Grafika i różnorodność:** pilotaż nowych postaci chibi (strój strażnika w 8 kierunkach, 2 hełmy, 2 bronie), potem stroje profesji i mieszkańców, potem roślinność według klimatu, świątynie według wyznania, styl „blokowisko”, morze i plaże, regionalne potwory.

**Decyzje dla właściciela**

- [ ] Mocny cios: tylko przycisk (rekomendacja) czy przytrzymanie zostaje na komputerze?
- [x] Postacie: pilotaż u grafika zaakceptowany 19.11.2026 – porównanie wariantu rysowanego z wyrenderowanym z modelu 3D (zamówienie 50-P001)
- [x] Ekwipunek na postaci: hełm i broń w ręce widoczne; ruch jak w Diablo; nazwa i pasek życia tylko w walce; styl rysowane chibi fantasy/steampunk (zdecydowane 19.11.2026)
- [ ] Imiona: w polskim interfejsie po polsku (Iwan) czy w zapisie łacińskim (Ivan)?
- [ ] Kara za śmierć: zostać przy złocie i EXP, czy dodać część plecaka w zamian za częstszy zapis?
- [ ] Szpital: płatny od 5. poziomu czy zawsze za darmo?
- [ ] Profesje: trzy na start (rycerz, łowca, mag) czy od razu cztery z druidem/alchemikiem?
- [ ] Moment wyboru: ok. 5. poziom po „drugiej służbie” czy inny?
- [ ] Zmiana profesji: za zadanie, za diamenty, czy wcale?
- [ ] Nagroda na koniec prologu: ile monet?
