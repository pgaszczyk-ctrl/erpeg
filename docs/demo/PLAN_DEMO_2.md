# Demo 2 – „Strażnik pod zamkiem” (plan, 1.11.2026)

Stan: propozycja do akceptacji właściciela. Nic z tego nie jest jeszcze w kodzie.

## Prośba właściciela

Zamiast snu z jabłkami i smokiem: krótko i dynamicznie przy Zamku Lubelskim –
strącić jabłka z drzewa → rozbić grupkę chochlików pilnujących wejścia do katakumb →
zejść → wyczyścić katakumby → koniec. Dalej grać tą samą postacią; imię dopiero na końcu,
na początku jest strażnik z prologu.

## Przebieg (cel: 4–6 minut)

| # | Krok | Czego uczy | Co widzi gracz |
|---|------|-----------|----------------|
| 0 | Start bez formularza: logo → mapa → zbliżenie na park pod zamkiem | – | Strażnik (model 3D) w mundurze, ⅗ życia |
| 1 | „Ała… te chochliki mnie poturbowały. Te jabłka dodadzą sił.” Strącić 5 jabłek | chodzenie, ATAK, podnoszenie | podpowiedź nad jabłonką, licznik 0/5 |
| 2 | Świeci przycisk leczenia → zjeść jabłka | leczenie (przyda się w lochu) | pełne życie |
| 3 | Strzałka do zejścia do katakumb u stóp wzgórza zamkowego. Pilnuje go 4–5 chochlików w czerwonej mgiełce | walka na żywo: atak, mocny cios, unik telegrafów | toast stanu grupki, „Poziom 2!” po rozbiciu |
| 4 | Przy drzwiczkach: przycisk AKCJA → „Schodzę” | interakcja (AKCJA / E / podwójne stuknięcie) | – |
| 5 | Katakumby: 4 komnaty (istniejący wariant „tutorial” lochu), stała mapa dla wszystkich; w ostatniej Upiór krypty | walka w ciasnym miejscu, pochodnie, mgła | – |
| 6 | Skrzynia: złoto + mikstura + przedmiot pamiątkowy (np. „Klucz do katakumb”) | – | „Poziom 3!” |
| 7 | Schody w górę → na powierzchni przy zamku: **„Jak masz na imię, strażniku?”** | – | formularz: imię, opcjonalnie konto, „Mam już postać” |
| 8 | Postać zapisana z całym dorobkiem; gra toczy się dalej w tym samym miejscu | – | instruktor czeka przy wyjściu z katakumb |

## Połączenie z dalszą grą

**Technika:** demo działa w pamięci (bez zapisu na serwerze, jak dziś). Po wpisaniu imienia:
`create_character` z imieniem i domem, potem od razu `save_game` z tym, co gracz zdobył
(EXP, ekwipunek, złoto, statystyki, mgła, flagi). Bez nowych tabel. Żeby odświeżenie strony
nie kasowało 5 minut gry, szkic stanu demo trzymamy w localStorage do chwili zapisania postaci.

**Fabuła – demo jako pierwszy rozdział prologu rekruta:** prolog ma dziś kolejność
list → łucznik → loch → biblioteka. Demo przesuwa loch na początek:
- po nadaniu imienia przy wyjściu stoi Starszy strażnik: „To ty wyczyściłeś te katakumby? Sam?
  …No dobrze, rekrucie. Mam list na posterunek.” – dalej list i łucznik jak w prologu;
- etapy lochu w prologu oznaczamy jako zrobione (flaga w `prolog.recruit.v1`), więc gracz nie
  robi drugiego lochu; po łuczniku instruktor wysyła od razu do biblioteki;
- różdżka i kapelusz (dziś znajdowane w lochu prologu) – albo w skrzyni katakumb demo,
  albo przenosimy je do nagrody za łucznika. Proponuję skrzynię: od razu widać, że
  „bohater może być też magiem”.

**Gdzie dom:** proponuję dom przy zamku (tam, gdzie zaczęła się historia), a Hela Trybik
z Targów pojawia się w dzienniku jako następna przygoda po prologu. Alternatywa: zostawić dom
przed Targami – wtedy trzeba by gracza tam przenieść, co rwie ciągłość.

## Co zmienia się w kodzie (etapami)

1. **Walka na żywo w demo** – dziś demo wyłącza `live()` i walczy turowo. Lochy działają tylko na
   żywo, więc demo przechodzi na żywą walkę (`live.ts`, Demo.ts). Smok, sen, pobudka przed Targami
   i „OOooo, już wiem kim jestem” – do usunięcia.
2. **Scena demo od nowa** (`src/scenes/Demo.ts`, `src/content/demo.ts`): kroki 1–4, jabłonie
   (zostają), stała grupka chochlików (`StreetEnemies.placeGang`, mały gang bez herszta albo z
   słabym), stałe wejście do katakumb przy zamku (`LochyWejscia` z ustalonym ziarnem).
3. **Katakumby demo** – istniejący `loch:prolog:…` (2×2 komnaty) z ustalonym ziarnem, nagrody
   ze skrzyni w content/demo.ts.
4. **Imię na końcu** – formularz z `ui/demoStart.ts` przeniesiony na wyjście z lochu; zapis
   dorobku; szkic w localStorage.
5. **Prolog po demie** – flaga „loch zaliczony” w PrologRekruta, instruktor przy zamku.
6. **Test** – nowy `scripts/tests/browser-demo-loch.mjs` (komputer + telefon poziomo):
   całe demo, odświeżenie w połowie, nadanie imienia, zapis, ciąg dalszy prologu.

## Uwagi i ryzyka

- **Same jabłka nie mają sensu** bez powodu – dlatego strażnik zaczyna poturbowany i jabłka
  uczą leczenia, które przyda się w lochu.
- **Śmierć w demo:** życie nie spada poniżej 1 (jak dziś przy smoku); w lochu przy krytycznym
  życiu krótki komunikat „Wycofaj się i zjedz coś” zamiast szpitala. Nie chcemy, żeby ktoś
  z ulotki zginął w 3. minucie.
- **Poziom:** start na poziomie 1, chochliki osłabione tylko w demo; nagroda EXP ustawiona tak,
  żeby wyjść z lochu na poziomie 2–3 (wyraźny „awans”).
- **Kto zostawi demo przed imieniem** – traci postęp (poza szkicem na tym urządzeniu). To uczciwe:
  dziś imię jest pierwszym krokiem i statystyki z ulotek (112 wejść, 0 postaci) pokazały, że
  formularz na starcie odstrasza.
- **Gracze z zapamiętaną postacią**, którzy zeskanują QR: mały przycisk „▶ Kontynuuj: <imię>”
  w rogu przez pierwsze sekundy.
- **Telefon:** żywa walka obraca stronę poziomo – demo od początku będzie w poziomie.
- Kody QR z ulotek zostają ważne (ten sam `?d=`).
