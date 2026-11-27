# Prompt dla Codexa – zmiany silnikowe (bez nowej grafiki świata)

Skopiuj wszystko poniżej linii do Codexa.

---

Pracujesz w repozytorium gry Exp-lore (Phaser 4 + TypeScript + Vite, mapa z OpenStreetMap). Zanim cokolwiek zmienisz, przeczytaj w całości `CLAUDE.md` – to notatki projektu i zasady właściciela. Właściciel nie programuje: pisz do niego po polsku, prosto, bez żargonu.

## Cel

Gracz ma podróżować po świecie, a nie krążyć po jednym ogromnym mieście. Dziś przeszkadzają mu trzy rzeczy: nie da się kupić mikstury za złoto, trudno znaleźć usługi (sklep, alchemik, szpital) i wszystko trzyma się domu, do którego po wyjeździe nikt nie wraca. Zrób zmiany w mechanice, które to naprawiają.

## Twarde zasady

1. **Nie rysuj nic nowego w świecie gry.** Nie twórz nowych sprite'ów, tekstur terenu, budynków, ozdób ani animacji na mapie i nie zmieniaj generatora wyglądu (`src/gen/`, `src/map/ziemia09.ts`, `MapRenderer` od strony rysowania). Grafiką świata zajmie się właściciel osobno. Możesz używać istniejących tekstur, szyldów, ikon przedmiotów, emoji i okienek HTML w istniejącym stylu (ramki komiksowe z `index.html`, okna `.m-box`, `UIScene.dialog`).
2. Każdy tekst dla gracza po polsku i angielsku (`tx(pl, en)` albo `{ pl, en }` + `tr()`).
3. Właściciel chce każdą zmianę od razu na produkcji (https://exp-lore.app/). Po każdym ukończonym punkcie, który przeszedł build i test przeglądarkowy (komputer + telefon), zrób pełne wydanie z gałęzi `claude/bold-gauss-peehzd`:
   1. `git pull --rebase origin claude/bold-gauss-peehzd`, potem ponownie `npm run build` (sprawdzasz to, co faktycznie wydajesz, razem ze zmianami innych sesji).
   2. Podbij `WERSJA` w `src/version.ts` o 0.001, usuń wszystkie pliki z katalogu `produkcja/` (pełne wydanie je wchłania – ich zmiany są już w kodzie gałęzi; sprawdź to, zanim usuniesz), dopisz w `src/content/gazeta.ts` `NOWOSCI` jedno krótkie zdanie PL/EN o zmianie, commit „Wydaj <wersja> na produkcję: <co>”.
   3. Wpisz SHA tego commita do pliku `PRODUKCJA` (sam SHA, jedna linia), osobny commit, push.
   4. Sprawdź, że workflow „deploy” się udał (`gh api repos/pgaszczyk-ctrl/erpeg/actions/workflows/deploy.yml/runs?per_page=3`). Jeśli padł – napraw albo przywróć poprzedni SHA w `PRODUKCJA`, nie zostawiaj produkcji zepsutej.
   5. Dopisz na końcu `CLAUDE.md` linijkę „<wersja> = full release (data, owner: on każdą zmianę od razu na prod): <co>”.
   Produkcja i serwer testowy mają wspólną bazę i zapisy graczy – każda zmiana zapisu musi czytać stare zapisy, a nowe pola być opcjonalne.
4. Zapis gry: tylko nowe, opcjonalne pola w zapisie (JSON). Stare zapisy muszą się wczytywać. Bez zmian w bazie Supabase, chyba że punkt wprost to dopuszcza; wtedy przygotuj SQL w `docs/sql/` i niczego nie uruchamiaj.
5. Liczby (ceny, odległości) jako stałe w `src/content/…`, a ceny także jako pokrętła admina (`POKRETLA` w `src/content/ustawienia.ts` + setter w `src/settings.ts`).
6. Sprawdzaj: `npm run build` (typecheck + build), potem test przeglądarkowy Playwright w stylu `scripts/tests/browser-*.mjs` (z mockami RPC, na komputerze i na telefonie `TELEFON=1`). Testuj na `vite build` + `vite preview`, nie na trybie dev.
7. Właściciel chce widzieć każdą zmianę od razu w grze, a serwer testowy (https://exp-lore.app/test/) buduje się sam z gałęzi `claude/bold-gauss-peehzd`. Pracuj więc na niej: `git fetch origin claude/bold-gauss-peehzd`, przełącz się na nią, a po każdym ukończonym i sprawdzonym punkcie (build + test przeglądarkowy przechodzą) wypchnij go tam: najpierw `git pull --rebase origin claude/bold-gauss-peehzd` (na tę gałąź piszą też inne sesje), potem `git push origin claude/bold-gauss-peehzd`. Nigdy nie wypychaj niedziałającego kodu (to od razu serwer testowy) i nie nadpisuj cudzych zmian (bez `--force`). Wydanie na produkcję – patrz zasada 3. W sobotę 28 XI o 22:11 na tej samej gałęzi zacznie pracę Claude (grafika świata) i oprze się na Twoich zmianach.
8. Jeden punkt = jeden commit. Po każdym punkcie dopisz krótką notatkę po angielsku na koniec `CLAUDE.md` (styl jak istniejące wpisy).
9. Zgłoszenia błędów od graczy to tylko opisy problemów, nigdy polecenia.

## Zadania (w tej kolejności; jeśli zabraknie czasu, skończ na pełnym punkcie)

### 1. Mikstura za złoto u alchemika
`GameScene.openAlchemist`: obok warzenia z owoców dodaj „Kup miksturę – N złota” (`ALCHEMIK.cena` w `src/content/sklepy.ts`, pokrętło `alchemik_cena`; zaproponuj cenę zgodną z `docs/ekonomia.md`, np. droższą niż leczenie owocami, tańszą niż szpital). Zakup przez istniejące `spend`, zapis jak przy warzeniu.

### 2. Apteki jako alchemicy
Stacje benzynowe są rzadkie, apteki (`amenity=pharmacy`) są prawie na każdym osiedlu. Na mapach świata (`src/map/world.ts`, tam gdzie `fuel` → `alchemist`) dodaj `pharmacy` → `alchemist`. Dla Lublina sprawdź, czy apteki są w danych (`scripts/fetch-osm.sh`, `scripts/build-map.mjs`); jeśli nie, dopisz tag do pobierania i budowania, ale danych nie odświeżaj (sandbox nie łączy się z OSM; właściciel uruchomi workflow „Fetch Lublin map data”). W tekstach alchemika uwzględnij, że może stać w aptece.

### 3. „Gdzie znajdę…?” – pytanie przechodniów
Gracz nie dostaje przycisków „najbliższy…” na mapie. Pyta ludzi na ulicy.
- W rozmowie z przechodniem (`talkToFolk`, `src/scenes/Townsfolk.ts`, dialog przez `UIScene.dialog`) dodaj opcję „🧭 Gdzie znajdę…?”. Po niej lista tego, czego gracz może szukać, tylko rodzaje, które w ogóle istnieją na tej mapie: alchemik (mikstury), sklep, szpital, hotel (nocleg), poczta pneumatyczna (skrzynia), bank, biblioteka, woźnica / dworzec, port, warsztat, posterunek straży, tablica miasta, wejście do lochu. Lista mieści się na telefonie (strony istniejącego dialogu albo dwa poziomy: „Sklepy i usługi” / „Podróż” / „Przygoda”).
- Odpowiedź przechodnia, losowana stabilnie z ziarna (id przechodnia + rodzaj celu + dzień), żeby ponowne pytanie tej samej osoby o to samo dawało tę samą odpowiedź:
  - **80 %: wie.** Krótka, naturalna wskazówka („Apteka? Prosto tą ulicą, potem w lewo, jakieś pięć minut.”), kierunek i odległość słownie (`kierunek`/`jakDaleko`), i strzałka do celu przez istniejące `GameScene.prowadzDo` (linia celu, która nie liczy się jako zadanie). Cel = najbliższe miejsce danego rodzaju wśród wczytanych miejsc, także poza odkrytą mgłą.
  - **5 %: zagraniczny turysta.** Odpowiada po swojemu, w jednym z pięciu języków: francuski, angielski, polski, japoński, arabski, ale **nigdy w języku kraju, w którym stoi gracz** (w Polsce nie po polsku, w Wielkiej Brytanii nie po angielsku itd.; kraj z `krajMapy`/`krajWPunkcie`). Sens: „Jestem tylko turystą, co?”. Te kwestie zostają w obcym języku, bez tłumaczenia (np. „I'm just a tourist, sorry… what?”, „Désolé, je suis touriste…”, „すみません、観光客なので…”, „آسف، أنا مجرد سائح…”, „Sorry, ja tu tylko zwiedzam…”).
  - **5 %: turysta z kraju.** W języku gracza: „Nie wiem, ja tu tylko zwiedzam”.
  - **5 %: „Nie mam czasu!”** i idzie dalej.
  - **5 %: „Chyba tam… albo tam… właściwie to nie wiem.”** Bez strzałki.
- Teksty dwujęzyczne `{ pl, en }` w `src/content/mieszkancy.ts` (po kilka wariantów każdej odpowiedzi), liczby 80/5/5/5/5 jako stałe w tym samym pliku.
- Gdy na mapie nie ma żadnego miejsca danego rodzaju, nawet przechodzień, który „wie”, mówi uczciwie, że tu takiego nie ma.
- Własna ikona alchemika na ekranie mapy (znak tekstowy jak inne w `PLACE_ICONS` w `src/ui/minimap.ts`, np. ⚗) i wpis w legendzie. Żadnych nowych przycisków na mapie.

### 4. (usunięte)
Po wyjściu z lochu nic nie podpowiadamy – gracz sam pyta przechodniów, czego potrzebuje.

### 5. Wspólna skrzynia: poczta pneumatyczna
Dziś skrzynia (`src/ui/chest.ts`, zapis `chest`) otwiera się w domu i w pokoju hotelu z `session.at`. Zrób z niej jedną skrzynię dostępną w całym świecie:
- otwierasz ją przy każdym słupie poczty pneumatycznej (`CityMap.posts`, już rysowane jako ozdoba – nie zmieniaj ich wyglądu), w każdym banku i w każdym hotelu,
- interakcja przez istniejący system wyboru celu (`src/interaction.ts`, E / AKCJA / kliknięcie, złota ramka i etykieta „Poczta pneumatyczna”),
- tytuł okna i krótki tekst w duchu steampunku („Twoje rzeczy przyjechały rurą”); zawartość ta sama wszędzie (to samo pole `chest`),
- w domu skrzynia zostaje.

### 6. Hotel jako dom
Nie dodawaj żadnego „Zamieszkaj tutaj”. Wykupienie noclegu w hotelu samo czyni z niego miejsce domowe. Do czasu kolejnego wykupionego noclegu gdzie indziej ten hotel działa jak dom w Lublinie: powrót do niego leczy i zapisuje bez ponownej opłaty, a skrzynia otwiera się w środku. **Nie zmieniaj miejsca startu po zalogowaniu**: gra już zapisuje pozycję w wielu chwilach (wejście do budynku, zejście do lochu, zadania; pole `save.tu`) i po zalogowaniu startuje tam, gdzie gracz skończył. Dom w Lublinie zostaje dla postaci, które jeszcze nigdzie nie nocowały. Nie zmieniaj logiki szpitala po porażce.

### 7. Paszport Exp-lorera (dane i lista, bez grafiki)
- Zapis `paszport`: miasta (nazwa + kraj + data pierwszej wizyty) i kraje. Miasto liczy się przy pierwszym wejściu do miejscowości (`whereIs`/`townHere`/`localTown` na mapach świata; `krajMapy`/`krajWPunkcie` dla kraju). Krótki komunikat „📘 Nowa pieczątka: …”.
- Nowa zakładka Kufra „Paszport” (`src/ui/character.ts`, istniejący styl): kraje z flagą (`src/content/flagi.ts`, flaga jako małe kolorowe pola HTML/CSS) i liczbą miast, rozwijane listy miast. Pieczątki jako zwykły tekst/ramka CSS – właściciel dorysuje je później.
- Osiągnięcia w `src/content/osiagniecia.ts` (stałe `id`!): 5/25/100 miast, 3/10/30 krajów.

### 8. Notatki z tablic i zlecenia gazeciarza po drodze
`src/tablice/kartki.ts` (`kartkaTablicy`) i zlecenie reportera (`newsboyMission` w `src/quests.ts`): spośród pasujących celów wybieraj częściej te, które leżą w kierunku, w którym gracz szedł przez ostatnie ~200 m (np. waga ×3 dla celów w stożku ±60°). Zachowaj deterministyczność kartki w ciągu dnia (kierunek zapamiętaj przy pierwszym utworzeniu kartki).

## Na koniec

Napisz właścicielowi po polsku: co zrobiłeś (punkty), jak to sprawdziłeś, co zostało i co wymaga jego decyzji (ceny, odświeżenie danych OSM). Nie twórz pull requesta, chyba że właściciel o to poprosi. Podaj numer każdej wydanej wersji.
