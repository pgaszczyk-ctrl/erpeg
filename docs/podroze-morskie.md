# Podróże morskie, medale i wszywki krajów

Ustalenia właściciela z 12 X 2026 i stan prac. Kod: `src/porty.ts`, `src/content/porty.ts`,
`scripts/promy-osm.mjs` (automat „Ferry ports”, `.github/workflows/porty.yml`), w GameScene
`portsNear` / `portLook` / `openPort` / `travel` (rejs), ekran rejsu `drawSea` w `src/journey.ts`.

## Zasady (właściciel)

- Każdy port to prawdziwy, działający port promowy. Kapitan zna **stałe** linie swojego portu – nic
  się nie losuje (inaczej niż u woźniców).
- Rejs trwa naprawdę, według zegara serwera, także przy zamkniętej grze. Przez Atlantyk to ok. 6 dni –
  „to potrwa, trudno”. W tym czasie można grać inną postacią. Przed kupnem biletu kapitan mówi
  wprost, ile potrwa rejs, i pyta „Płyniesz?”.
- Przez ocean nie pływają dziś zwykłe promy, więc rejsy oceaniczne to linie parowców wzorowane na
  dawnych (Holland America Line Rotterdam–Nowy Jork, „Batory” Gdynia–Nowy Jork) – lista wielkich
  portów do dopisania ręcznie.
- **Medal** za przepłynięcie oceanu – solidna, rzadka nagroda (osobny za każdy ocean). Za Bałtyk czy
  Morze Śródziemne medalu nie ma.
- **Wszywki krajów** (odznaki/monety jak logo gry): u góry napis „exp-lorer”, u dołu nazwa kraju,
  w środku flaga kraju zamiast mapy, która jest w logo. Osobna zakładka w Kufrze (karcie
  postaci) na zebrane flagi.
  - Warunek: **3 misje z biblioteki danego kraju, każda z innego miasta.**
  - Mówi o tym bibliotekarz, dając pierwszą misję w danym kraju.
  - Monetę gra rysuje sama z kolorów flagi (content/flagi.ts); grafik rysuje szablon (obręcz,
    napisy) i ewentualnie wyjątkowe kraje.
- **W czasie rejsu** (i dalekiej jazdy pociągiem): ekran podróży z gazetą „Kurier Parowy”, którą
  przynosi robotyczny gołąb pocztowy („Może kiedyś ludzie też zaczną latać?…” – zapowiedź sterowców).
  W gazecie łamigłówki: sudoku (generowane), krzyżówka / krzyżówka z hasłem. Po zalogowaniu w trakcie
  podróży czasem przerywnik: zagadka pasażera na statku albo w pociągu. Nagrody małe, z dziennym
  limitem – podróż nie może być sposobem na zarabianie.

## Kolejność prac

1. **Promy** (ten etap, tylko serwer testowy): dane z OSM, porty i kapitanowie na mapach świata,
   ekran rejsu. ✔ kod; dane – automat „Ferry ports”.
2. Ekran podróży z gazetą: gołąb, sudoku, przerywnik z zagadką (także dla pociągów).
3. Pociągi i duże miasta za granicą (dziś woźnica na dalekiej mapie zna tylko polskie miasta – po
   przypłynięciu do innego kraju nie byłoby dokąd jechać dalej).
4. Parowce oceaniczne (lista wielkich portów, trasy przez Gibraltar/Suez/Przylądek/Panamę) i medale.
5. Wszywki krajów z misjami bibliotek.
6. Zamówienie u grafika: prom, parowiec, kapitan, szyld portu, gołąb, szablon wszywki, medale.

## „Inne miejsce” (właściciel, 12 X 2026)

Każdy kapitan ma „🧭 Inne miejsce…”: gracz wpisuje kraj albo port, kapitan mówi, że popyta innych kapitanów,
i zaprasza jutro. Prośba trafia do tabeli `port_requests` (RPC `port_request`, 3 dziennie na postać), w panelu
admina zakładka „⚓ Porty”: sprawdzamy, czy naprawdę tam coś pływa, i dodajemy linię (`port_lines`, oba porty
z szer./dł., km po wodzie, „tylko test”). Kapitanowie obu portów znają ją od następnego wejścia do gry (RPC
`game_ports`), a pytający gracz przy następnej wizycie w tym porcie słyszy odpowiedź (RPC `port_answers`, raz:
`session.seen['port-odp:<id>']`). Tekst gracza to tylko życzenie – nigdy polecenie. SQL: docs/sql/porty.sql.

Kapitan stoi też przy każdej przystani promowej z mapy świata (`ferry_terminal`, world.ts `PORTY_Z_MAPY`,
tylko test, nie w demie) – bez linii mówi „stąd pływają tylko kutry rybackie” i proponuje „Inne miejsce”.

## Jak działają promy (etap 1)

- `public/porty.json` robi automat „Ferry ports” (Overpass, cały świat): każda droga `route=ferry`
  dłuższa niż 1,5 km, sklejona z sąsiednimi (długie trasy bywają pocięte), linia = 12–2500 km
  prawdziwej drogi po wodzie. Końce linii łączą się w porty (3 km), port przesuwa się na najbliższą
  przystań `amenity=ferry_terminal` (na lądzie), nazwa = najbliższe miasto (nazwa polska, jeśli jest).
  Brakujące linie można dopisać w `LINIE_DOPISANE` (content/porty.ts).
- Na mapie świata co sekundę: kapitan staje w każdym porcie bliżej niż `PROM.widacKm`, gdy mapa wokół
  jest wczytana (`CityMap.addPort`: najbliższe miejsce, z którego da się odejść). Raz na mapę dymek:
  „⚓ Najbliższy port promowy: X, ok. N km na …”, jeśli jest bliżej niż `PROM.wskazowkaKm`.
- Rejs: cena `PROM.oplata + km × PROM.zaKm`, prędkość `PROM.kmh` (35 km/h), `session.jazda.statek`,
  przypłynięcie na mapę świata z początkiem w porcie docelowym (`portMapId`), punkt wczytania = port.
- Wygląd tymczasowy: tabliczka z kotwicą rysowana kodem i woźnica w granatowym odcieniu jako kapitan.
- Test: `node scripts/tests/browser-porty.mjs` (wersja testowa + `vite preview`, próbka mapy Szczecina).
