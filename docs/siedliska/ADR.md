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

## Czego jeszcze nie ma (kolejne etapy, po akceptacji obozu)

- Rumowisko, bagno (nawierzchnie z mnożnikiem prędkości: `CityMap.surfaceAt` + nowy rodzaj podłoża), leśne legowisko, ruiny – ten sam rejestr i ten sam pipeline, nowe `TypSiedliska`.
- Panel administratora (ręczne siedliska w Supabase z pierwszeństwem) – tabela + RPC dopiero po zatwierdzeniu wyglądu.
- Wejście do podziemi z obozu (`LochyWejscia.dodajMisyjne` ma już mechanizm wejść dodawanych z kodu).
- Nocna poświata latarni i ogniska, dym z ogniska.
- Pathfinding potworów jest prosty: z wnętrza wychodzą bramą (`obejscie`), ale nie omijają namiotów inteligentnie.
