# Siedliska potworów – decyzja architektoniczna (etap 1–2)

20.11.2026 · brief właściciela „System stałych siedlisk potworów i przebudowy fragmentów mapy”.

## Co zastałem (audyt)

| Element | Gdzie | Co robi dziś |
|---|---|---|
| Łowiska | `src/content/lowiska.ts`, `src/scenes/Lowiska.ts` | Komórki 1,1 km, stała kotwica z ziarna mapy i komórki (bez loginu), 3 warstwy, grupy (`Pakiet`) spawnowane w promieniu 220 m, odnowienie po czasie aktywnej gry. Stan tylko w pamięci sesji. |
| Profile walki | `STWORY_AI`, `profilStwora` (lowiska.ts) → `src/objects/StworAI.ts` | Zapowiedź → atak → odpoczynek. Bez pathfindingu (prosto do celu, `moveActor` zatrzymuje na ścianach). |
| Bestiariusz | `ENEMY_KINDS` (`objects/Slime.ts`), `src/content/stwory.ts` (EXP i łup z panelu, RPC `game_stwory`, tabela `stwory_lup`) | Istniejące stworki: wilk, warg, chochlik (`glut`), Mosiężny Kozioł, bandyta, herszt, driada, zombie, szkielet, upiór… Goblina, golema, trolla, Leszego **nie ma**. |
| `docs/bestiary/data/actions.json` | – | Plik **nie istnieje w tym repo**. Komentarz w lowiska.ts mówi „exp-lore docs/bestiary” – to pakiet z osobnego repo/czatu ChatGPT, którego formy ataków zostały już przepisane ręcznie do `STWORY_AI`. Nie odtwarzam go i nie tworzę drugiego bestiariusza. |
| Generator ziemi 09 | `src/map/MapRenderer.ts` `groundOrder` → `src/map/Podloze09.ts` `mapaRodzajow` (mapa rodzajów podłoża z OSM) → Web Worker `src/map/ziemia09.ts` `ziemia` (podłoże, woda, runo, groby, pola, tory, drzewa, budynki) | Wszystko we współrzędnych świata → kawałki łączą się bez szwów. |
| Kolizje | `CityMap.isBlocked` (budynki, woda, niewczytane kafle, strome zbocza) + `Korony.blocked` (pnie) + `Landmarks.blocked` | Używa ich bohater, potwory (`moveActor`/`canMove`), pociski (`StworHost.sciana`), stawianie rzeczy (`isFree`). |

## Decyzja: gdzie siedlisko wchodzi w pipeline

```
OSM (kafle) ──► CityMap ──► Lowiska.planCell (komórka gotowa)
                              │  1. planujObozW: ziarno = mapa + komórka + WERSJA_SIEDLISK
                              │  2. plan.ts planujOboz: obrys z promieni kurczonych do wolnego miejsca,
                              │     bramy, pale, namioty, wieża, rekwizyty, ścieżki, punkty spawnów
                              ▼
                    rejestr.ts dodajSiedlisko(city, s)
                     ├─► CityMap.siedliska + CityMap.przeszkoda  ─► isBlocked (wszyscy respektują palisadę)
                     ├─► MapRenderer: kawałki pod obozem do przemalowania
                     │      groundOrder → mapaRodzajow(…, siedliska): klepisko w obrysie, ścieżki „droga”
                     │      Zlecenie.siedliska → Worker: cienie, palenisko, brak drzew w obrysie (+16 px)
                     └─► Lowiska: dwie grupy z punktami z planu (mieszkańcy; szef + obstawa)
GameScene ─► WidokSiedlisk: palisada odcinkami, namioty, wieża, rekwizyty, ognisko = obiekty z głębią = podstawa
          ─► StworHost.przejscie: potwór za palisadą idzie przez bramę
```

Najważniejsze: **mapa rodzajów podłoża jest zmieniana zanim generator cokolwiek namaluje**. Las w obrysie nie istnieje – generator nie posadzi tam drzew i nie posieje runa, bo podłoże to `klepisko`. Nic nie jest nakładane na gotowy obraz.

### Dlaczego planowanie w `Lowiska.planCell`, a nie w osobnej siatce

- Ten sam warunek gotowości (cała komórka 1,1 km wczytana) → plan zależy tylko od danych OSM, nie od kolejności kafli.
- Obóz losowany w środkowej części komórki (0,3–0,7) → jego obrys z marginesem i szukanie drogi (≤ 140 m) mieszczą się w tej komórce, a łowiska sąsiadów (kotwica ≥ 0,15 komórki od brzegu + 300 m) nigdy go nie dosięgną. Komórka z obozem nie dostaje łowiska. Nie ma zależności od tego, która komórka zaplanowała się pierwsza.

### Dlaczego konstrukcje to osobne obiekty, a nie piksele kawałka

Pal ma ~0,9 wysokości bohatera. Gdyby był namalowany w kawałku mapy, bohater stojący za palisadą zawsze byłby rysowany na niej. Odcinki po 4 pale, namioty i wieża mają głębię = podstawa (jak korony drzew i zabytki), więc zasłanianie działa w obie strony. Cienie, klepisko, ścieżki i palenisko są w podłożu kawałka – razem z resztą generowanego świata.

### Szwy kawałków

Plan jest liczony raz (main thread) i ten sam obiekt trafia do każdego kawałka, którego okno (z marginesem na drzewa i cienie) dotyka ramki obozu. Worker maluje we współrzędnych świata. Test `scripts/tests/siedliska.mjs` maluje obóz w 4 częściach i w całości i porównuje piksel po pikselu (0 różnic).

## Respawn i zapis

| Co | Stałe / dynamiczne | Gdzie |
|---|---|---|
| Geometria, punkty spawnów | stałe (ziarno + mapa + wersja) | plan.ts |
| Żyjący mieszkańcy | dynamiczne, sesja | `Pakiet.alive` |
| Odnowienie mieszkańców | 180 s aktywnej gry od wybicia, tylko gdy bohater > 260 m | `ODNOWIENIE_SIEDLISK.zwykliS` |
| Pokonanie szefa | **zapisywane**: `session.daily['siedlisko:<id>'].n` = minuta czasu rzeczywistego | przeżywa logowanie; szef wraca po 6 h |

Spawn tylko przy 220 m (poza ekranem), nigdy w odległości < 260 m przy odnowieniu – istniejące zasady łowisk.

## Wyłączenie

`?siedliska=0` (zapamiętane w `exp-siedliska`) → `Lowiska.obozy = false` → nic nie trafia do rejestru → mapa rodzajów, drzewa i kolizje dokładnie jak przedtem. Zapis (`daily['siedlisko:…']`) jest po prostu ignorowany. Siedliska są tylko przy łowiskach (pakiet „nowa walka”), nigdy w demie i w lochach.

## Pliki

- `src/content/siedliska.ts` – liczby (rozmiary, teren, mieszkańcy, odnowienie, wersja generatora).
- `src/siedliska/typy.ts` – dane siedliska i interfejs terenu dla planera.
- `src/siedliska/plan.ts` – planer obozu (czysta funkcja).
- `src/siedliska/kolizje.ts` – wnętrze, kolizje konstrukcji, obejście przez bramę.
- `src/siedliska/ziemia.ts` – szczegóły podłoża w Workerze.
- `src/siedliska/rysunki.ts` – rysunki konstrukcji w px generatora.
- `src/siedliska/Widok.ts` – obiekty świata w scenie.
- `src/siedliska/rejestr.ts`, `wlacznik.ts`.
- Zmiany: `CityMap` (rejestr + `przeszkoda`), `Podloze09.mapaRodzajow`, `ziemia09` (rodzaj `klepisko`, drzewa), `gen/podloze.ts` (kolory klepiska), `MapRenderer` (przekazanie i przemalowanie), `Lowiska` (planowanie, stałe grupy, zapis szefa), `StworAI` (`przejscie`), `GameScene` (podpięcie).

## Wyniki sprawdzenia (20.11.2026)

- `node scripts/tests/siedliska.mjs`: 300 ziaren na sztucznej mapie → 245 obozów (średnie 136, duże 90, małe 19), każdy zaplanowany 2× identycznie, bramy przechodnie z obu stron, palisada bez dziur (72 promienie), namioty i spawny w środku, nic na drodze ani w budynku/wodzie, obejście prowadzi do bramy, 4 kawałki = całość (0 różnych pikseli).
- `scripts/tests/browser-siedliska.mjs` (prawdziwa mapa Lublina, komputer i telefon w poziomie): obóz `lublin:oboz:4,13` w lesie na południu miasta (średni, 4 namioty, wieża, 2 bramy, 148 pali), 9 bandytów + herszt z istniejącego bestiariusza, marsz klawiszami w palisadę zatrzymuje bohatera na zewnątrz, ruch gry (`moveActor`) przechodzi przez bramę, po ponownym wczytaniu i przy podejściu z innej strony plan identyczny, `?siedliska=0` → ten sam las bez obozu i bez kolizji. Zrzuty: `docs/siedliska/zrzuty/`.
- Wydajność: obóz to ~40–60 dodatkowych obrazów (odcinki palisady, namioty, rekwizyty), ukrywanych poza ekranem; planowanie raz na komórkę 1,1 km. Pomiaru FPS na prawdziwym telefonie nie robiłem (headless Chromium nie jest miarodajny).
- Poprawki po pierwszych zrzutach: obóz trafił na pole uprawne przy domu (pasy pola przykryły klepisko) i w mgłę gangu → pola wykluczone (`TEREN_SIEDLISK`), klepisko i ścieżki malowane ponownie po polach, gangi omijają siedliska (także te zaplanowane wcześniej w sesji), grzyby nie rosną na klepisku, brama poszerzona do 8,5 m (stopy bohatera przy skośnej bramie).

## Rozmiary (właściciel 20.11.2026: „w grze muszą mieć różne wielkości”)

Pięć rozmiarów (`OBOZ.rozmiary`, wersja generatora 2): czujka 13 m (1 namiot, czasem wieża, szef = bandyta), mały 19 m, średni 28 m, duży 41 m (2 bramy, 6–8 namiotów, wieża), warownia 58 m (2 bramy, 9–12 namiotów, 2–3 wieże, szef = wielki herszt z 3 ochroniarzami). Losowany z wag; gdy brakuje miejsca – kolejny mniejszy. Pole obrysu na makiecie: 500 → 1 100 → 2 400 → 5 100 → 10 300 m². W lasach Lublina (10 obozów w teście) wyszły czujka, małe, średnie i duże; warownia potrzebuje ~85 m dziczy bez ścieżek i budynków, więc w Lublinie się nie zmieściła – pojawi się w większych lasach na mapach świata. Zrzuty: `zrzuty/rozmiary-makieta.png`, `zrzuty/rozmiary-w-grze.png`.

## Etap 2b–4 (właściciel 21.11.2026: „duuużo większe, zajmujące pojedyncze budynki, zejście do jaskini, trudniejsze potworki, różne rodzaje, życie!”)

- **Wielkie obozy**: nowe rozmiary `wielki` (85 m) i `twierdza` (125 m), `warownia` też może objąć budynek. Palisada omija budynki (6 m) i twarde linie, w obrysie mogą stać pojedyncze budynki (`zBudynkami`, z dala od wsi: ≤ 10 budynków w promieniu +150 m). Ścieżki i polne drogi przecinające palisadę dostają bramy (`TerenSiedliska.przeciecia`), więc nic nie zostaje odcięte; nic nie stoi na ścieżce (ognisko, namioty, wieże, rekwizyty). Promień kierunku sprawdzany na całej długości (obrys nie przeskoczy drogi ani rzeki).
- **Osiedla**: duże obozy mają kilka ognisk (do 6) z kręgami namiotów, wydeptane przejścia między nimi; klepisko tylko w plackach (`Siedlisko.placki`) i pasem wzdłuż palisady – między osiedlami trawa i co trzecie drzewo.
- **Życie obozu**: nad ogniskami gar na trójnogu (bulgocze, para) albo rożen z obracaną pieczenią, pieńki do siedzenia, przy namiocie szefa sterta łupów (zwoje miedzianego drutu, wiązki mosiężnych rur, skrzynie z trybikami), dym z ognisk.
- **Trudniejsi mieszkańcy**: skład zależny od rozmiaru (bandyci + wargi + wilki), szaleńcy (berserkerzy z gangów), `moc` ×1,15–1,5 (ten sam mechanizm co pogoda, EXP i łup bez zmian), wielki herszt z obstawą 3–4. Mieszkańcy wielkich obozów w ćwiartkach (budzą się tylko ci w pobliżu).
- **Jaskinia**: nowy rodzaj lochu `jaskinia` (content/lochy.ts, src/loch/plan.ts): komnaty-elipsy o poszarpanym brzegu, kręte korytarze, wygładzone skały, stalagmity, kryształy, świecące grzybki; potwory ×1,4, strażnik Mosiężny Kozioł. Wejście (skalna szczelina) za namiotem szefa w twierdzy/wielkim (zawsze), warowni (60 %), dużym (25 %), w rumowisku (45 %).
- **Rumowisko** (`planujRumowisko`): skupiska głazów (bryły z code-drawn ściankami, różna wysokość, kolizja), łuki głazów z przesmykami, plac w środku; skała tylko pod skupiskami, reszta terenu zostaje (30 % drzew). Wargi, wilki, szkielety, szef Mosiężny Kozioł.
- **Bagno** (`planujBagno`): podstawa mokradło, plamy błota (×0,55), płycizny (×0,4 – bród), głębokie oczka (blokują), suche wyspy w zaroślach, martwe drzewa, groble do środka; ścieżki mogą biec przez bagno. Topielce, driady, wodne bańki, szef wodnik. Plamy mają poszarpany brzeg wspólny dla malowania i kolizji (`brzegPlamy`).
- Typ wybierany wg terenu (przy mokradłach/wodzie głównie bagno), `WERSJA_SIEDLISK` 3.
- Testy: Node (determinizm, bramy na ścieżkach, palisada nie w budynku, ścieżka przez obóz wolna, rumowiska/bagna przejezdne, 600 planów lochu z jaskinią), przeglądarka na Lublinie: wszystkie rozmiary i typy znalezione (bagno koło Zalewu Zemborzyckiego), zejście do jaskini z 34 mieszkańcami. Zrzuty: `zrzuty/typy-w-grze.png`, `zycie-obozu-gra.png`, `rozmiary-makieta.png`.
- Nie zrobione: twierdza nie zmieściła się w lasach Lublina (wielki tak); potwory nie zwalniają w błocie (tylko bohater); ruiny i leśne legowisko; panel administratora.

## Schronienia wg regionu (właściciel 21.11.2026: „namioty to czasem tylko szałasy, ale też zależnie od kraju”)

`SCHRONIENIA` (content/siedliska.ts) na regionach `stylRegionu` (te same co budynki): umiarkowany (Polska) – płócienne namioty i szałasy z gałęzi; północ – stożkowe namioty z żerdzi i skór; śródziemnomorski/Bałkany – namioty, szałasy, niskie wełniane; strefa sucha – niskie wełniane namioty w pasy; Azja – jurty; Afryka – okrągłe chaty z ochrowej gliny i strzechy; Ameryka Łacińska – chaty z palmową strzechą. Szef ma większą wersję głównego kształtu regionu. Okrągłe kształty to bryły obrotowe (przekroje od ziemi do szczytu). `WERSJA_SIEDLISK` 4. Palisada wielkich obozów sprawdzana na całych odcinkach (nie tylko w wierzchołkach). Zrzuty: `zrzuty/schronienia-regiony.png`, `zrzuty/szalasy-gra.png`. Inne regiony niż Polska sprawdzone tylko na makiecie (bez map świata w kontenerze).

## Czego jeszcze nie ma (kolejne etapy, po akceptacji obozu)

- Rumowisko, bagno (nawierzchnie z mnożnikiem prędkości: `CityMap.surfaceAt` + nowy rodzaj podłoża), leśne legowisko, ruiny – ten sam rejestr i ten sam pipeline, nowe `TypSiedliska`.
- Panel administratora (ręczne siedliska w Supabase z pierwszeństwem) – tabela + RPC dopiero po zatwierdzeniu wyglądu.
- Wejście do podziemi z obozu (`LochyWejscia.dodajMisyjne` ma już mechanizm wejść dodawanych z kodu).
- Nocna poświata latarni i ogniska, dym z ogniska.
- Pathfinding potworów jest prosty: z wnętrza wychodzą bramą (`obejscie`), ale nie omijają namiotów inteligentnie.

## Wąskie ścieżki przez obozy (21.11.2026, WERSJA_SIEDLISK 5)

Właściciel: „Obozy mogą być przecinane wąskimi ścieżkami, to nie problem”. Każda wielkość obozu omija teraz tylko twarde linie (`liniaTwarda`: drogi dla aut, tory, rzeki); ścieżki, polne i dojazdowe drogi (`OBOZ.przechodnie`) mogą przez niego biec – każde przecięcie z palisadą dostaje bramę. Ognisko, namioty i rekwizyty nie stają na ścieżce; namiot szefa odsuwa się w bok, gdy naprzeciw głównej bramy też jest brama. Czujki i małe obozy zwykle i tak się na ścieżce nie mieszczą (za ciasno). Test: `siedliska.mjs` – część „obozy na wąskiej ścieżce”. Wydane na produkcji w 1.059.
