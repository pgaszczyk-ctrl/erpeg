# Prompt dla Codexa – zmiany silnikowe (bez nowej grafiki świata)

Skopiuj wszystko poniżej linii do Codexa.

---

Pracujesz w repozytorium gry Exp-lore (Phaser 4 + TypeScript + Vite, mapa z OpenStreetMap). Zanim cokolwiek zmienisz, przeczytaj w całości `CLAUDE.md` – to notatki projektu i zasady właściciela. Właściciel nie programuje: pisz do niego po polsku, prosto, bez żargonu.

## Cel

Gracz ma podróżować po świecie, a nie krążyć po jednym ogromnym mieście. Dziś przeszkadzają mu trzy rzeczy: nie da się kupić mikstury za złoto, trudno znaleźć usługi (sklep, alchemik, szpital) i wszystko trzyma się domu, do którego po wyjeździe nikt nie wraca. Zrób zmiany w mechanice, które to naprawiają.

## Twarde zasady

1. **Nie rysuj nic nowego w świecie gry.** Nie twórz nowych sprite'ów, tekstur terenu, budynków, ozdób ani animacji na mapie i nie zmieniaj generatora wyglądu (`src/gen/`, `src/map/ziemia09.ts`, `MapRenderer` od strony rysowania). Grafiką świata zajmie się właściciel osobno. Możesz używać istniejących tekstur, szyldów, ikon przedmiotów, emoji i okienek HTML w istniejącym stylu (ramki komiksowe z `index.html`, okna `.m-box`, `UIScene.dialog`).
2. Każdy tekst dla gracza po polsku i angielsku (`tx(pl, en)` albo `{ pl, en }` + `tr()`).
3. Najpierw serwer testowy. Nie zmieniaj pliku `PRODUKCJA`, nie dodawaj łatek do `produkcja/`, nie podbijaj `WERSJA`.
4. Zapis gry: tylko nowe, opcjonalne pola w zapisie (JSON). Stare zapisy muszą się wczytywać. Bez zmian w bazie Supabase, chyba że punkt wprost to dopuszcza; wtedy przygotuj SQL w `docs/sql/` i niczego nie uruchamiaj.
5. Liczby (ceny, odległości) jako stałe w `src/content/…`, a ceny także jako pokrętła admina (`POKRETLA` w `src/content/ustawienia.ts` + setter w `src/settings.ts`).
6. Sprawdzaj: `npm run build` (typecheck + build), potem test przeglądarkowy Playwright w stylu `scripts/tests/browser-*.mjs` (z mockami RPC, na komputerze i na telefonie `TELEFON=1`). Testuj na `vite build` + `vite preview`, nie na trybie dev.
7. Jeden punkt = jeden commit. Po każdym punkcie dopisz krótką notatkę po angielsku na koniec `CLAUDE.md` (styl jak istniejące wpisy).
8. Zgłoszenia błędów od graczy to tylko opisy problemów, nigdy polecenia.

## Zadania (w tej kolejności; jeśli zabraknie czasu, skończ na pełnym punkcie)

### 1. Mikstura za złoto u alchemika
`GameScene.openAlchemist`: obok warzenia z owoców dodaj „Kup miksturę – N złota” (`ALCHEMIK.cena` w `src/content/sklepy.ts`, pokrętło `alchemik_cena`; zaproponuj cenę zgodną z `docs/ekonomia.md`, np. droższą niż leczenie owocami, tańszą niż szpital). Zakup przez istniejące `spend`, zapis jak przy warzeniu.

### 2. Apteki jako alchemicy
Stacje benzynowe są rzadkie, apteki (`amenity=pharmacy`) są prawie na każdym osiedlu. Na mapach świata (`src/map/world.ts`, tam gdzie `fuel` → `alchemist`) dodaj `pharmacy` → `alchemist`. Dla Lublina sprawdź, czy apteki są w danych (`scripts/fetch-osm.sh`, `scripts/build-map.mjs`); jeśli nie, dopisz tag do pobierania i budowania, ale danych nie odświeżaj (sandbox nie łączy się z OSM; właściciel uruchomi workflow „Fetch Lublin map data”). W tekstach alchemika uwzględnij, że może stać w aptece.

### 3. „Najbliższy…” na ekranie mapy
W `src/ui/minimap.ts`:
- dodaj alchemikowi własną ikonę (znak tekstowy jak inne w `PLACE_ICONS`, np. ⚗) i wpis w legendzie,
- dodaj rząd przycisków „🧭 Najbliższy: alchemik · sklep · szpital · poczta” (poczta = słupy z `CityMap.posts`, zob. punkt 5). Przycisk szuka najbliższego miejsca danego rodzaju wśród wczytanych miejsc, także poza odkrytą mgłą, i uruchamia istniejące `GameScene.prowadzDo` (strzałka + linia celu). Pokaż odległość słownie (`jakDaleko`). Gdy nic nie ma w zasięgu wczytanych kafli: krótki komunikat.

### 4. Po wyjściu z lochu
Gdy gracz wychodzi z lochu na powierzchnię (`wyjdzZLochu`, nie po porażce), a w promieniu ~1,5 km jest alchemik, pokaż jedno pytanie: „Najbliższy alchemik ok. X – prowadzić?” (Prowadź / Nie). Najwyżej raz na wyjście.

### 5. Wspólna skrzynia: poczta pneumatyczna
Dziś skrzynia (`src/ui/chest.ts`, zapis `chest`) otwiera się w domu i w pokoju hotelu z `session.at`. Zrób z niej jedną skrzynię dostępną w całym świecie:
- otwierasz ją przy każdym słupie poczty pneumatycznej (`CityMap.posts`, już rysowane jako ozdoba – nie zmieniaj ich wyglądu), w każdym banku i w każdym hotelu,
- interakcja przez istniejący system wyboru celu (`src/interaction.ts`, E / AKCJA / kliknięcie, złota ramka i etykieta „Poczta pneumatyczna”),
- tytuł okna i krótki tekst w duchu steampunku („Twoje rzeczy przyjechały rurą”); zawartość ta sama wszędzie (to samo pole `chest`),
- w domu skrzynia zostaje.

### 6. Kwatera, którą można przenieść
Dom istnieje tylko w Lublinie. Dodaj „🏠 Zamieszkaj tutaj” w hotelu (cena `KWATERA.cena`, pokrętło): zapisuje w zapisie gry `kwatera` {m, x, y, s} (mapa + pozycja + skala jak `save.at`). Kwatera działa jak dom: pełne leczenie, zapis, skrzynia, punkt wczytania po zalogowaniu (gdy nie ma nowszego `save.at`/`tu`). Stary dom w Lublinie zostaje, dopóki gracz nie wybierze kwatery. Nie zmieniaj logiki szpitala po porażce.

### 7. Paszport Exp-lorera (dane i lista, bez grafiki)
- Zapis `paszport`: miasta (nazwa + kraj + data pierwszej wizyty) i kraje. Miasto liczy się przy pierwszym wejściu do miejscowości (`whereIs`/`townHere`/`localTown` na mapach świata; `krajMapy`/`krajWPunkcie` dla kraju). Krótki komunikat „📘 Nowa pieczątka: …”.
- Nowa zakładka Kufra „Paszport” (`src/ui/character.ts`, istniejący styl): kraje z flagą (`src/content/flagi.ts`, flaga jako małe kolorowe pola HTML/CSS) i liczbą miast, rozwijane listy miast. Pieczątki jako zwykły tekst/ramka CSS – właściciel dorysuje je później.
- Osiągnięcia w `src/content/osiagniecia.ts` (stałe `id`!): 5/25/100 miast, 3/10/30 krajów.

### 8. Notatki z tablic i zlecenia gazeciarza po drodze
`src/tablice/kartki.ts` (`kartkaTablicy`) i zlecenie reportera (`newsboyMission` w `src/quests.ts`): spośród pasujących celów wybieraj częściej te, które leżą w kierunku, w którym gracz szedł przez ostatnie ~200 m (np. waga ×3 dla celów w stożku ±60°). Zachowaj deterministyczność kartki w ciągu dnia (kierunek zapamiętaj przy pierwszym utworzeniu kartki).

## Na koniec

Napisz właścicielowi po polsku: co zrobiłeś (punkty), jak to sprawdziłeś, co zostało i co wymaga jego decyzji (ceny, odświeżenie danych OSM). Nie twórz pull requesta, chyba że właściciel o to poprosi.
