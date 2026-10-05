# Specyfikacja techniczna – overhaul 09: żywy świat w pixel arcie

> Dla programisty (czat 🛠 Technika i rozwój). Grafik dostaje osobno `docs/paczka-dla-artysty/ZAMOWIENIE_09_pixel_art_swiat.md`. Ten dokument opisuje, **co zmienić w kodzie**, żeby wszystko, co grafik narysuje, dało się wstawić, i co da się zrobić **od razu, na zaślepkach**, zanim grafiki przyjdą.
> Implementacja wzorcowa (działa w przeglądarce): `makieta/zywy-swiat.html`. Opis jej kodu: `makieta/OPIS_KODU.md`.
> Data: 4 października 2026. Decyzje właściciela z czatu 🎨 Grafika.

## 0. Decyzje właściciela (nie do dyskusji bez niego)

1. **Cały świat jako szczegółowy pixel art w stylu konia z wozu.** Jedna gęstość pikseli dla postaci, budynków, drzew, dekoracji i ziemi. Kierunek „malarski” (zamówienie 08, wpis „Art direction 30 Sep” w `CLAUDE.md`) jest **nieaktualny**. Wpis w `CLAUDE.md` trzeba podmienić.
2. **Pixel art także dlatego, że ma być lekki dla telefonu.** Styl malarski wymagałby tekstur w rozdzielczości ekranu (4–9× więcej pamięci).
3. **Świat ma żyć:** korony i trawa kołyszą się na wietrze (siła z prawdziwej pogody, `weather.w`), postać przeciska się pod koronami (prześwit), cienie chmur, para z kratek.
4. **Różne drzewa według danych OSM** (las liściasty, iglasty, mieszany, park, sad, brzeg wody, góry), po kilka wariantów.
5. **Nie każde drzewo da się ściąć.** Ścinalne mają widoczny zacios. Chronione: sady, parki, pomniki przyrody (`denotation=natural_monument`), stare okazy. Pieniek → sadzonka → drzewo.
6. **Gracz musi od pierwszego ciosu wiedzieć, że ścina albo strąca owoce.** Właściciel: „teraz nie wiem, czasem zniknie, czasem nie”.
7. **Budynki z OSM liczone pikselowo** (dach kopertowy z obrysu, rzędy dachówek wzdłuż okapu, obrys, cień), zamiast obracanej tekstury, która „dziwacznie się skaluje”.
8. **Wyraźny steampunk:** rury na części budynków, losowe rurociągi, zawory, manometry, para ze studzienek.
9. **Kolej parowa:** na torach i peronach parowe lokomotywy i wagony dopasowane do krzywizny torów. **Konie z wozem tylko na dworcach autobusowych.** Tory i perony do poprawienia.
10. Widok zostaje szeroki (cała okolica widoczna), mgła wojny bez zmian.

## 1. Stan obecny (sprawdzone w kodzie, gałąź `claude/bold-gauss-peehzd`)

| Obszar | Gdzie | Jak jest dziś | Problem |
|---|---|---|---|
| Kawałki mapy | `MapRenderer.ts` | `CHUNK` 512 px mapy, malowane w Canvas 2D przy `DOTS = OSTROSC` (1 lub 2) px płótna na px mapy, `MAX_CHUNKS` 8 (6 przy `deviceMemory ≤ 4`) przy DOTS 2, ok. 4 MB każdy | budżet pamięci ciasny (~39 MB tekstur po poprawkach z 3 października) |
| Skala plików grafika | `content/swiat.ts` `SKALA_PLIKOW = 3` | pliki 3× większe niż mapa, `artPattern`/`artSheet` zmniejszają je do `DOTS/3` | przy DOTS 2 zmniejszenie 2:3 → piksele różnej wielkości i rozmycie |
| Dachy | `paintBody`, `roofTransform` | wzór dachówki obrócony wzdłuż najdłuższej ściany, przesunięty per budynek | schodki i „mikso-piksele” na skosach, wielkość dachówki zależna od przeskalowania |
| Ściany | `wallHeight` 4/6/8 px mapy, `WALL_SKEW` 0,35, `paintWalls` | wzór ściany ścinany wzdłuż krawędzi | jak wyżej |
| Drzewa ozdobne | `paintGreenery` (`ZIELEN`) | malowane w kawałek, siatka co 16 m, **nie reagują na nic** | wyglądają jak drzewa do ścięcia lub owocowe → gracz uderza i nic się nie dzieje |
| Sosny do ścięcia | `Forest` w `scenes/Ambient.ts` (`LAS`: siatka 30 m, 4 uderzenia = drewno, wracają przy logowaniu) | sprite z klatkami full/stump, przy uderzeniu tween kąta ±5° | brak paska postępu, uderzenie wygląda tak samo jak w drzewo ozdobne |
| Drzewa owocowe | `Orchards` w `Ambient.ts` | uderzenie zrzuca 1 owoc (2–5 na drzewo), tween kąta | owoc „znika” do plecaka bez animacji spadania |
| Postacie grafika | `sprites.ts`, `wyglad.ts` `skala` 0,36 | arkusze 64×64 zmniejszane LINEAR do ~23 px mapy | lekko rozmyte. **Stary bohater `look.ts` (16×20, 1 px = 1 px mapy) ma piksel ~2,5× grubszy** – to „blondynka” ze zrzutu właściciela. Sprawdzić, czy na produkcji gracz nie widzi wciąż `look.ts` |
| Wozy | `placeCarts`, 156×125 na 50 px mapy (0,4 px mapy na px pliku) | najbliżej docelowej gęstości („koń = wzorzec”) | stoją też przy stacjach kolejowych → właściciel chce tam lokomotywy |
| Tory | `paintRail` | linia przerywana + szara kreska | płasko, „programowo” |
| Pogoda | `weather.ts` (`w` = wiatr m/s, `kind`), `WeatherFx.ts` | deszcz, śnieg, mgła, błyski | wiatr nieużywany |
| Kamera | `GameScene` `setZoom(max(2, floor(short/176)) × OSTROSC)` | całkowite powiększenie | przy OSTROSC 1 i bazowym 3 → 1,5 px ekranu na px pliku (patrz 2.3) |

## 2. Nowa skala: piksel do piksela

### 2.1 Zasada

**1 px pliku grafika = 0,5 px mapy** (= 3,84 px na metr przy `PX_PER_M` 1,92). Przy `DOTS = 2` to **dokładnie 1 px płótna kawałka**, więc grafiki kładzie się na płótno 1:1, bez skalowania. Sprite'y Phasera dostają `setScale(0.5)` i filtr NEAREST, więc przy powiększeniu kamery `2 × OSTROSC` każdy piksel pliku to całkowita liczba pikseli ekranu.

- `content/swiat.ts`: `SKALA_PLIKOW = 2` dla nowych plików. **Na czas przejścia** trzymaj skalę per plik (np. `SKALE_PLIKOW: Record<string, number>`, domyślnie 3 dla starych, 2 dla nowych z zamówienia 09), żeby stare i nowe działały naraz.
- `artPattern`/`artSheet`: przy `DOTS === SKALA` żadnego `drawImage` ze skalowaniem. Przy `DOTS = 1` (słabe telefony) zmniejszenie 2:1. Proponuję uśrednianie 2×2 (wygładzanie przeglądarki `imageSmoothingQuality: 'high'`) albo „najbliższy sąsiad”. Do porównania na zrzutach, decyzja po teście.
- Sprite'y nowych grafik: `texture.setFilter(Phaser.Textures.FilterMode.NEAREST)`, `setScale(0.5)`, kamera `roundPixels = true`. Stare arkusze postaci zostają LINEAR 0,36, dopóki nie przyjdą nowe (pole w `Postac`, np. `piksel: true` → NEAREST + 0,5).
- **Postacie (decyzja 4.10, po teście bazy):** maniera „blondynki” (łuczniczka v1), celowo grubszy piksel niż świat. Arkusz 64×64 = siatka 32×32 powiększona 2×, postać ok. 28 px siatki (56 px pliku). Wyświetlać ze skalą **0,375** i NEAREST: 1 px siatki = 0,75 px mapy = 3 px ekranu przy powiększeniu 4 (OSTROSC 2), czyli równo; postać ok. 21 px mapy (dziś 23). Przy OSTROSC 1 wychodzi 1,5 px ekranu (nierówno, do przyjęcia). Broń w dłoni (`bron_<id>_reka` 24×24 = siatka 12×12 ×2) w tej samej skali co postać.

### 2.2 Proporcje budynek–postać (do decyzji właściciela, nie blokuje reszty)

Postać ma 23 px mapy (~12 m według `PX_PER_M`), dom 12×10 m to 23×19 px mapy, więc budynki wyglądają na mniejsze od ludzika (właściciel to zauważył). Dwie drogi:
- **A (zalecana na teraz):** zostawić `PX_PER_M`. To umowna skala gry. Grafik rysuje „pod piksele”, nie „pod metry”.
- **B:** podnieść `PX_PER_M` (np. 2,5–3). Budynki i ulice rosną względem postaci, na ekranie widać mniej miasta, chodzenie trwa dłużej. Zapisane pozycje mają skalę (`map_scale`, `s`), więc konwersja istnieje, ale zmienia się dużo stałych (prędkość, zasięgi, gangi, siatki). Osobna decyzja i osobny test.

### 2.3 Powiększenie kamery

Przy `OSTROSC = 2` powiększenie jest zawsze parzyste, więc 1 px pliku = całkowita liczba pikseli ekranu. Przy `OSTROSC = 1` i bazie 3 (szerokie ekrany) wychodzi 1,5. Propozycja: przy `OSTROSC = 1` brać bazę parzystą (2 lub 4), albo pogodzić się z nierównymi pikselami tylko na słabych telefonach.

## 3. Drzewa, krzaki, trawa (warianty i ich koszt)

### 3.1 Jeden system drzew zamiast trzech

Zastąpić `ZIELEN`/`paintGreenery`, `Forest` (sosny) i `Orchards` **jednym modelem** (np. `src/map/trees.ts` + `scenes/Trees.ts`):

```ts
interface Tree {
  id: number;            // stały: hash z pozycji (mapa + siatka), jak dziś w Forest
  x: number; y: number;  // podstawa pnia, px mapy
  gat: Gatunek;          // 'dab' | 'buk' | 'lipa' | 'brzoza' | 'olcha' | 'wierzba' | 'jablon' | 'grusza' | 'sliwa' | 'sosna' | 'swierk' | 'jodla' | 'kosodrzewina' | 'jalowiec' | 'krzak_…'
  war: 0 | 1 | 2;        // wariant a/b/c
  chop: boolean;         // da się ściąć (ma zacios)
  ochrona?: 'sad' | 'park' | 'pomnik' | 'stary'; // powód, gdy nie da się
  owoce?: number;        // ile zostało (drzewa owocowe)
  stan: 'drzewo' | 'pieniek' | 'sadzonka';
}
```

Rozmieszczenie per komórka 1 km (jak `Forest`/`Townsfolk`, tylko gdy `ready`): Poisson-disk (próby z odrzuceniem, minimalny odstęp zależny od gatunku), gęstość modulowana szumem (kępy i polany), **na skraju obszaru niższe drzewa i krzaki** (odległość od brzegu wielokąta). Seed z mapy i komórki, **nie** z logowania (drzewa stoją zawsze w tym samym miejscu). Szczegółowe wagi i reguły: `dane/gatunki_osm.json`.

Pojedyncze drzewa z OSM (`natural=tree`, punkty) w parkach i przy ulicach: postawić dokładnie tam (z `species`/`genus`/`leaf_type`, jeśli są). Lublin ma ich dużo. **Wymaga zmian w `fetch-osm.sh` i `build-map.mjs`**: dziś `natural=wood`/`landuse=forest` stają się jednym `forest` bez `leaf_type`, a sad (`orchard`) wpada do `farmland`. Do dodania w danych: `leaf_type`, `leaf_cycle`, osobny rodzaj `orchard`, `natural=tree` (node), `denotation`, `natural=heath`, `wetland=reedbed/swamp`. Po zmianie potrzebne odświeżenie danych workflow „Fetch Lublin map data”. Na mapach świata (`world.ts`, Protomaps) `leaf_type` bywa w `landcover`/`landuse`, do sprawdzenia. W razie braku: mieszany las.

**Biomy:** bliskość wody (`CityMap.nearWater`, istnieje) → olcha, wierzba, trzciny. Wysokość (tylko mapy świata, `terrain.heightAt`) → progi z `dane/gatunki_osm.json` (świerk/jodła wyżej, kosodrzewina najwyżej). Lublin bez terenu → bez progów wysokości.

### 3.2 Wariant A (zalecany): korony jako sprite'y z gotowymi klatkami wiatru

- **Pień** malowany w kawałek mapy (jak dziś drzewa ozdobne): zero kosztu na klatkę.
- **Korona** jako osobny `Image` z `depth = y podstawy` → naturalne sortowanie z postaciami: drzewo za postacią jest za nią, drzewo przed postacią ją zasłania. Makieta robi to samo (`drawSpriteList` dla drzew z `t.y <= player.y` przed postacią, reszta po niej).
- **Wiatr bez shadera:** przy wczytaniu tekstury korony program **sam generuje 5 klatek ścięcia** (przesunięcie każdego wiersza o `round(k × wysokośćWiersza × sztywność)`, k = −2…+2, jak `dx` w makiecie). Co klatkę każde widoczne drzewo wybiera klatkę z `wiatr(x, y, czas)`. Piksele zostają ostre, tekstura atlasu rośnie 5×, ale drzew jest kilkanaście gatunków × 3 warianty.
  - Oszacowanie: 15 gatunków × 3 warianty × 5 klatek × (96×112×4 B) ≈ 9,7 MB, jeśli wszystko naraz. Wczytywać gatunki według biomu w pobliżu i trzymać w jednym atlasie (`DynamicTexture`/canvas), wtedy zwykle 3–5 MB.
- **Szelest:** po wejściu postaci pod koronę lub po uderzeniu przez 0,5–1 s szybkie przełączanie klatek (−1/+1) + cząsteczki liści (Phaser particles, tekstura `efekt_liscie`).
- **Prześwit:** tylko dla koron, które w tej chwili zasłaniają postać (zwykle 0–3): `sprite.filters.internal.addMask(teksturaKółka, true)` z gotową teksturą kółka o postrzępionej krawędzi z macierzy Bayera 4×4 (wygenerować raz na kilka promieni, np. 12/16/20 px mapy). Maska w `viewTransform: 'world'` przesuwana za postacią. Gdy postać wychodzi, filtr zdjąć (filtry kosztują pass renderowania na obiekt).
- Liczba sprite'ów: korona na ekranie ~80 px pliku = 40 px mapy, odstęp ~28 px mapy → w gęstym lesie ok. 100–150 koron w widoku telefonu. Tworzyć tylko w promieniu widoku + margines (pula obiektów, jak `Forest`).

### 3.3 Wariant B (alternatywa): warstwa koron w kawałku + shader

Kawałek mapy dzielony na płótno ziemi i płótno koron (nad postaciami) + maska (wysokość w koronie, sztywność, faza). Filtr przesuwa piksele według wiatru i robi prześwit. Kod GLSL: `shadery/korony.frag.glsl`, kontroler: `shadery/FiltrWiatru.ts`. **Wady:** +4 MB płótna koron + ~1 MB maski na kawałek (×8 kawałków, czyli z ~39 do ~80 MB, za dużo przy dzisiejszym budżecie), brak sortowania głębi pojedynczych drzew, pass filtra na kawałek co klatkę. Opisany dla porządku i do efektów ziemi (3.5).

### 3.4 Krzaki, wysoka trawa, trzciny

- **Krzaki:** jak korony (wariant A), osobna dolna część w kawałku.
- **Niska trawa:** kępki malowane w kawałek (statyczne). Ruch daje „jasny pas podmuchu” (3.5).
- **Wysoka trawa i trzciny:** tylko w obszarach łąk i brzegów, jako małe sprite'y z 3 gotowymi klatkami ścięcia (jak korony) w promieniu widoku. Przy postaci (≤ 9 px mapy) wybór klatki odchylonej od niej + `depth` po podstawie, więc trawa przed postacią zasłania stopy (efekt brodzenia). Pula ≤ 300 obiektów.

### 3.5 Ziemia: podmuch na łące i cienie chmur

- **Podmuch:** jasny pas sunący przez łąki (`gustAt` w makiecie). Najtaniej jako `TileSprite` z ditherowaną teksturą pasa (z macierzy Bayera), tryb mieszania `ADD` o małej sile, maskowany do trawy. Maska trawy = osobne płótno 1/4 rozdzielczości kawałka (0,25 MB) albo kanał alfa w samym kawałku. Prościej: tylko na obszarach `grass`/`meadow`/`park`, rysowany pod postaciami.
- **Cienie chmur:** jeden `TileSprite` 512×512 z ditherowanymi plamami (wygenerowany raz z szumu), mieszanie MULTIPLY, przesuwany z wiatrem, `depth` nad postaciami i drzewami, pod mgłą wojny i HUD. Przy `kind` pochmurno/deszcz więcej plam, przy czystym niebie mniej, nocą wyłączone.

### 3.6 Wiatr z pogody

`S = clamp(weather.w / 7, 0.1, 2.2)` (m/s). Parametry fal: `dane/wiatr.json` (te same co w makiecie: `windAt`, `gustAt`). Kierunek: na razie stały z zachodu (podmuch w prawo). Docelowo dodać `wind_from_direction` z MET (pole `d` w `weather_cells.hours`, `weather_collect`). Burza: S ≥ 1,8 + więcej liści. Śnieg: wiatr słabszy, korony w wersji ze śniegiem (część G).

## 4. Ścinanie i owoce: informacja zwrotna

Wymaganie właściciela: **od pierwszego ciosu widać, że coś się dzieje.**

| Zdarzenie | Co widać i słychać |
|---|---|
| Uderzenie w drzewo z zaciosem | pasek postępu nad koroną (`LAS.uderzenNaDrzewo` segmentów, mosiężna ramka `pasek_postepu`, ikonka `ikona_siekiera`), szelest korony, `efekt_wiory` + `efekt_uderzenie` przy pniu, dźwięk „stuk” (`sfx.ts`), `navigator.vibrate?.(15)` |
| Kolejne uderzenia | pasek przyrasta, szelest mocniejszy |
| Ostatnie uderzenie | `efekt_upadek_drzewa` (4 klatki) + obłok liści, korona znika, pień → pieniek, „+1 drewno” unoszące się nad pniem (jak `+N` przy pasku umiejętności) |
| Odejście w trakcie | pasek gaśnie po 3 s, postęp przepada |
| Uderzenie w drzewo chronione | krótkie drgnięcie korony, głuchy dźwięk, **dymek z powodem** (pierwszy raz na rodzaj ochrony, potem tylko ikonka): „Pomnik przyrody – chroniony”, „Drzewo w parku – nie wolno ścinać”, „Za grube – szukaj drzew z zaciosem” |
| Drzewo owocowe | **potrząsanie zamiast ścinania**: korona się trzęsie, z warstwy owoców znika 1 owoc, który widocznie spada (`owoc_*`, łuk + odbicie), turla się i leci do bohatera (albo leży jako zbieralny), „+1 jabłko”. Gdy owoców brak: korona bez warstwy owoców i dymek „Już puste – wrócą przy następnym logowaniu” |

Stany i odrastanie: `pieniek` → po X minutach gry `sadzonka` → po Y minutach `drzewo`. Albo, prościej i zgodnie z dzisiejszą zasadą, wszystko wraca przy następnym logowaniu, a pieniek i sadzonka są tylko w obrębie sesji. Decyzja właściciela, w makiecie 10 s i 14 s.

## 4a. Postacie: prosty wygląd, wspólny szkielet, atak bez animacji postaci

Decyzja właściciela po pierwszym podglądzie grafika: postać ma być **prostsza**, z ruchem w **3 kierunkach (ewentualnie 5)**, resztę daje lustro, a **atak jest wspólny dla wszystkich i zależy tylko od broni** (zamówienie 09, punkt 4).

- **Nowy format arkusza:** wiersze = kierunki (3: przód, bok w lewo, tył; albo 5: przód, skos przód-lewo, bok w lewo, skos tył-lewo, tył), kolumny = `stoi`, `krok1…krok4`. Klatki 64×64, stopy y = 62, środek x = 32. Arkusz 320×192 albo 320×320. `sprites.ts` dziś zakłada 192×192 3×3 i `WALK = [1, 2]`: dodać rozpoznawanie formatu (po wymiarach albo polu `format: 'v9'` w `Postac`) i cykl 4 klatek (`WALK_V9 = [1, 2, 3, 4]`, ok. 8 kl./s).
- **Kierunek z kąta ruchu:** 3 kierunki: jak dziś. 5 kierunków: 8 sektorów po 45°; prawe (E, SE, NE) = lewe (W, SW, NW) z `flipX`. Uwaga na kotwicę dłoni przy odbiciu (x → 63 − x).
- **Wspólne bazy:** `baza_dorosly`, `baza_dziecko`, `baza_starszy`, (`baza_chochlik`…): wszystkie postacie z jednej bazy mają identyczne pozy, więc **kotwica dłoni jest jedna na bazę** (`baza_<nazwa>_dlon.png`: jeden czerwony piksel w klatce → przy wczytaniu zamienić na tablicę `[kierunek][klatka] = {x, y}`). Pole `baza` w `Postac`.
- **Atak:** `swingWeapon` (GameScene) już rysuje broń niezależnie od postaci (dziś obraca ikonę 16×16). Zmiana: postać na czas ciosu w klatce `stoi` kierunku ciosu, wypad 1–2 px w stronę ciosu i powrót; broń z arkusza `bron_<id>_reka` (16 kątów co 22,5°, rękojeść w środku płótna), wybierana klatka najbliższa bieżącemu kątowi łuku, zaczepiona w kotwicy dłoni. **Bez obracania pixel artu** (zamiast `setRotation` wybór klatki), dopóki są klatki; bez nich zostaje dzisiejsze obracanie ikony. Smuga: `smuga_ciecie/obuch/magia` (4 klatki) zamiast dzisiejszego `drawSweep` z Graphics. Łuk: `luk_napiety` przy celowaniu, `strzala` 16 kątów w locie. Siekiera (ścinanie) i potrząsanie drzewem używają tego samego mechanizmu.
- **Bohater gracza:** `look.ts` (16×20, gruby piksel, „blondynka”) do wycofania, gdy będą nowe arkusze. Wszystkie postacie z arkuszy, `setScale(0.375)` + NEAREST (punkt 2.1).

## 5. Budynki liczone piksel po pikselu

Wzór: `makieta/dachy_roofs.py` (port makiety w Pythonie, uogólniony na dowolny wielokąt) i `zrzuty/dachy_*.png`.

Algorytm (dla każdego piksela płótna w obrysie, przy DOTS 2):
1. **Najbliższa krawędź** obrysu (odcinek) = połać, `d` = odległość do niej.
2. Normalna krawędzi na zewnątrz → jasność połaci z `-(nx·0,6 + ny·0,8)` (światło z lewej-góry) → odcień 0–3 z palety materiału.
3. Rzędy dachówek: `floor(d) % 3 === 2` → odcień ciemniej (łupek: co 2 + spoiny co 4 wzdłuż krawędzi, przesunięte w co drugim rzędzie).
4. Naroża (dwie najbliższe krawędzie sąsiednie, |d1 − d2| < 0,75) → odcień jaśniej. Kalenica: dwie najbliższe krawędzie **przeciwległe** (iloczyn normalnych < −0,5) i |d1 − d2| < 0,75 → kolor kalenicy. Uwaga: w `dachy_roofs.py` kalenica to „`d` bliskie maksimum”, co działa tylko dla wypukłych obrysów. Dla L/U użyć kryterium przeciwległych krawędzi.
5. Obrys `#1e1a24` na brzegu dachu. Ściany jak dziś: obrys opuszczony o `wallHeight` i przesunięty w prawo (`WALL_SKEW` zostaje, właściciel tego chciał). Kolumnami: odcień ściany z nachylenia krawędzi, cokół, linia cienia pod okapem, stemple okien (`okno_*`, nocą `_noc`), drzwi w miejscu prawdziwych drzwi (`entranceOf`), rury z 6.4 zamówienia.
6. Cień rzucany w prawo-w dół (makieta: `inFP(x − k, y − k/2)` dla k ≤ 0,9·H), ditherowana krawędź.

Wydajność: dom ~90×80 px płótna × ~10 krawędzi = ok. 70 tys. operacji. Kawałek z 300 budynkami to kilka milionów operacji, ok. 10–30 ms. Malowanie kawałka trwa dziś ~17 ms, więc trzeba zmierzyć. Gdy za wolno: liczyć w Web Workerze (OffscreenCanvas) albo raz przy `build-map` zapisywać „szkielet dachu” (krawędzie kalenic i naroży) w kafelkach mapy.

Obecne mechanizmy do zachowania: `partsOf` (wielkie hale w 2–5 częściach, każda liczona osobno), `highlight` (miejsca specjalne: zamiast przebarwiania inny materiał + `dodatek_<miejsce>` z zamówienia), kominy (`KOMINY`), odkrywanie budynku przez mgłę (`markBuilding`).

Opcjonalnie (przełącznik, decyzja po teście): **przyciąganie kąta budynku** do 0°/26,565°/45°/63,435° przy odchyłce ≤ 10° (`snapA` w makiecie), obrót wokół środka. Uwaga na kolizje (`CityMap.buildingAt`), bo obrys się przesuwa. Najlepiej robić to w `build-map`, nie w kliencie.

## 6. Steampunk na mapie

- **Rury na ścianach:** ok. 30% budynków (seed) dostaje pionową rurę `rura_sciana_<8|12|16>` na jednej ścianie frontowej przy narożniku, część poziomy odcinek pod oknami, manometr lub zawór przy drzwiach miejsc.
- **Dachy:** ok. 10% zbiornik lub kocioł na dachu (stemple w obrysie, jak `paintChimney`), wentylatory 3 klatki (tylko w widoku, sprite).
- **Rurociągi (zmiana 4.10):** tylko **równolegle do dróg, w stałym odsunięciu za chodnikiem, tym samym łukiem co droga**; na końcach wejście do budynku albo pod ziemię (studzienka). Żadnych tras „Manhattan” przez trawniki. Szczegóły i kod: `GENERATOR_SWIATA.md` punkt 0.6, `generator/steampunk.ts` (`trasaPrzyDrodze`, `rurociagWzdluz`). Przecieki i para jako sprite'y w widoku (punkty zwraca `rurociagWzdluz`).
- **Para ze studzienek:** dziś `studzienka_para` to statyczna klatka w kawałku. Dodać pulę sprite'ów obłoczków (`para_*`, 4–6 klatek) nad kratkami w widoku, losowe odstępy 2–6 s. To samo przy kominach i kotłach.

## 7. Kolej parowa (zamiast koni na stacjach kolejowych)

- **Rozróżnić stacje:** dziś `station` to zarówno kolej (OSM `railway=station/halt`), jak i dworce autobusowe (`amenity=bus_station`, build-map i `world.ts`). Dodać do miejsca pole, np. `rodzaj: 'kolej' | 'autobus'` (build-map, split-map, `world.ts` `rememberMap`). **Przy dworcach autobusowych zostaje wóz konny i woźnica** (`placeCarts`, `STALE_HD.woznica`). **Przy stacjach kolejowych: skład parowy na torze + konduktor** (nowa postać stała; do czasu arkusza od grafika woźnica w czapce, czyli zaślepka). Okna przejazdu (`openCoach`) przy stacji kolejowej mówią „pociąg/konduktor”.
- **Zaślepki pojazdów do czasu arkuszy grafika:** `generator/pojazdy.ts` (lokomotywa, tender, wagony z prostego modelu 3D, dowolny kierunek, `klatkaKierunku`, cień). Arkusze grafika przed użyciem przechodzą przez `docs/paczka-dla-artysty/8_wyrownanie/wyrownaj.py` (paleta świata, obrys, twarda przezroczystość).
- **Tory** (`paintRail` → `tor()` z generatora): podsypka, podkłady, szyny.
- **Perony:** OSM `railway=platform` (dodać do `fetch-osm.sh`/`build-map`, jeśli brak), płyty z jasną krawędzią, wiata z modułów, latarnie, ławki.
- **Ustawienie składu:** znaleźć linię `rail` najbliższą miejscu stacji (najlepiej przy peronie), punkt na niej najbliższy drzwiom stacji, i od niego rozstawić pojazdy wzdłuż linii **po długości łuku**: lokomotywa, tender, 1–4 wagony (seed ze stacji), odstęp = długość pojazdu + 2 px. Dla każdego pojazdu kąt stycznej toru w jego środku → klatka z arkusza:
  - **lokomotywa i tender: 16 kierunków** (co 22,5°, mają przód i tył), `klatka = round(kąt / 22,5°) mod 16`,
  - **wagony: 8 kierunków** (co 22,5° w zakresie 0–157,5°; wagon jest symetryczny, więc kąt+180° = ta sama klatka): `round((kąt mod 180°) / 22,5°) mod 8`.
  - Największy błąd dopasowania do toru to 11,25°. Przy pojazdach długości 30–64 px to najwyżej 1–2 px na końcach, niewidoczne. Więcej kierunków nie trzeba (32 kierunki podwoiłyby pracę grafika bez widocznej różnicy).
  - Do czasu arkuszy od grafika: zaślepka rysowana programem (prostokąt z kabiną i kominem w danym kierunku).
- Para z komina (`para()`), okna wagonów nocą. Później (opcja): pociąg przyjeżdża i odjeżdża po torze, te same klatki.

## 8. Pamięć i wydajność – budżet

| Pozycja | Dziś | Po zmianach (wariant A) |
|---|---|---|
| Kawałki mapy (8 × 4 MB) | ~32 MB | ~32 MB (bez zmian) |
| Atlas koron (5 klatek) | – | 3–5 MB (gatunki z okolicy) |
| Krzaki, trawa wysoka, efekty | – | ~1–2 MB |
| Pojazdy kolei (16 kier. × 4 typy) | – | ~1,5 MB |
| Stemple budynków, moduły rur, para | – | < 1 MB |
| Cienie chmur, podmuch (TileSprite) | – | 1–2 MB |
| **Razem tekstury świata** | ~39 MB | **~45–50 MB** |

Kryteria (telefon średniej klasy, OSTROSC 2, Arceus): las Dąbrowa + centrum Lublina, ≥ 45 kl./s po 2 min chodzenia, brak „WebGL context lost”, malowanie kawałka ≤ 40 ms. Pomiar: licznik klatek w `watchSpeed` + własny licznik bajtów tekstur (suma `width × height × 4` przy tworzeniu). Uwaga z `CLAUDE.md`: w headless Chromium czasy klatek skaczą, porównywać z poprzednią wersją na tej samej maszynie.

## 9. Zadania (kolejność, kryteria, wycena w tokenach)

Wszystko za przełącznikiem `?wyglad=09` (i w `localStorage`), dopóki właściciel nie zaakceptuje. Najpierw na serwerze testowym.

| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| Z0 | Przełącznik `wyglad=09`, licznik pamięci tekstur, zrzuty porównawcze | przełącza się bez przeładowania mapy albo po przeładowaniu, liczby w `window.__game` | ~100 tys. |
| Z1 | Skala piksel do piksela (2.1–2.3): skale per plik, NEAREST, zoom | nowy plik testowy 2× wygląda ostro przy DOTS 1 i 2, stare pliki bez zmian | ~300 tys. |
| Z2 | Jeden system drzew (3.1) + **zaślepki** generowane jak w makiecie (`buildCrown`) do czasu grafik + zmiany w danych OSM | drzewa według tagów i biomu, te same przy każdym logowaniu, `ZIELEN`/`Forest`/`Orchards` zastąpione | ~800 tys. |
| Z3 | Wiatr koron (3.2): klatki ścięcia, wybór klatki, szelest, siła z pogody | kołysanie widać przy wietrze > 3 m/s, ruch zawsze o całe piksele | ~300 tys. |
| Z4 | Prześwit pod koronami (maska z Bayerem) | postać widoczna pod każdą koroną, krawędź z szachownicy, bez spadku FPS | ~150 tys. |
| Z5 | Ścinanie i owoce z informacją zwrotną (4) | właściciel przy pierwszym ciosie wie, co się dzieje; drzewa chronione mówią dlaczego | ~400 tys. |
| Z6 | Trawa wysoka, trzciny, podmuch, cienie chmur (3.4–3.5) | brodzenie w trawie, pas podmuchu, chmury zależne od pogody | ~400 tys. |
| Z7 | Budynki pikselowe (5) + stemple | dachy jak w `dachy_katy_x4.png`, także L/U, czas malowania kawałka w budżecie | ~1 mln |
| Z8 | Steampunk na mapie (6): rury, rurociągi, para | rurociągi i para widoczne w centrum i na osiedlach, nie gęściej niż właściciel zaakceptuje | ~500 tys. |
| Z4a | Postacie v9 (4a): nowy format arkusza, 4-klatkowy chód, lustro dla 5 kierunków, kotwica dłoni, broń z 16 klatek i smugi; na zaślepce (prostokątna „baza” rysowana programem) | ruch w 3/5 kierunkach bez drgań, cios wygląda tak samo dla każdej postaci, zależy od broni | ~400 tys. |
| Z9 | Kolej (7): tory, perony, składy na stacjach, konduktor | lokomotywy na stacjach dopasowane do łuków, konie tylko przy dworcach autobusowych | ~600 tys. |
| Z10 | Podmiana na grafiki grafika partiami (zamówienie 09, pkt 12) | każda partia na serwerze testowym, zrzut do właściciela | ~100–200 tys. na partię |

Z2–Z6 da się zrobić od razu na zaślepkach z makiety. Z7 i Z9 też (palety z makiety, pojazdy jako proste prostokąty w 16 kierunkach). Grafiki grafika tylko podmieniają wygląd.

## 10. Na koniec każdego zadania

- `npm run build` + zrzut w widoku telefonu (Playwright), porównanie przed/po.
- Wpis w `CLAUDE.md` (krótko, po angielsku jak reszta), w tym podmiana akapitu „Art direction (owner, 30 Sep 2026)” na decyzję z 4 października.
- Notka do czatu 🎨 Grafika (co gotowe, czego brakuje od grafika).
