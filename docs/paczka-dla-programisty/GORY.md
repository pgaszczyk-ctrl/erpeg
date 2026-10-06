# Góry: rozmycie w dół i chodzenie szlakiem (decyzja właściciela 4.10.2026)

Makieta (akceptacja właściciela: „o taki efekt chodzi”): https://claude.ai/artifact/6XtZngSjWajTjdhhPP27VT, kopia w `makieta/gory/makieta_gory.html` (otwiera się bez internetu; szablon bez danych: `makieta_gory_szablon.html`, skrypty danych: `extract2.py`, `route.py`, `pack.py`). Zrzuty: `zrzuty/gory_szlak.png`, `zrzuty/gory_rozmycie_w_dol.png`.

## 1. Co właściciel chce, a czego nie
- **Tak:** góry rysuje ten sam generator co resztę świata (podłoże, runo, kosodrzewina i jałowiec z wiatrem, skały z głazami, ścieżki, budynki z OSM), w zwykłej skali gry, na prawdziwych wysokościach (`terrain.heightAt`, cieniowanie stoków jak dziś w `paintRelief`, tylko jako przyciemnienie/rozjaśnienie pikseli generatora z ditheringiem).
- **Tak:** na stromym stoku **rozmywamy to, co leży niżej od bohatera**. Teren na wysokości bohatera i wyżej zostaje ostry. Bohater zawsze ostry.
- **Nie:** oddalania kamery, zmiany perspektywy, „widoku z mapy” (pierwsza wersja makiety została odrzucona).
- **Ścieżki szlaku szersze, dopasowane do ludzika:** ok. 18 px obrazu (≈ 9 px mapy, ≈ 4,7 m w skali gry) – bohater mieści się na ścieżce. W makiecie było 6 px i właściciel kazał poszerzyć.

## 2. Rozmycie w dół (jak w makiecie, funkcja `render`)
Dla każdego piksela ekranu: `dh = wysokośćBohatera − wysokość(punktu)` [m], promień rozmycia `r = clamp((dh − 3) / 8 × siła, 0, 4)` px obrazu, mgiełka `min(0,32; r × 0,08)` w stronę #b2c6d2. Obraz rozmyty w 4 poziomach (r = 1…4, rozmycie pudełkowe ×2), piksel = mieszanka dwóch sąsiednich poziomów. Działa na gotowym obrazie (ziemia + korony + krzewy), przed narysowaniem bohatera; korony tuż przed bohaterem jak dotąd półprzezroczyste (prześwit).

W grze: **filtr Phaser 4 (shader) na kamerze mapy** zamiast pętli w JS (w makiecie JS daje ~45–60 kl./s na komputerze, na telefonie byłoby za wolno):
- tekstura wysokości okolicy (np. 128×128, siatka jak `paintRelief`, odświeżana gdy bohater przejdzie ~100 m) + wysokość bohatera jako uniform,
- 2 przebiegi: rozmycie poziome i pionowe o zmiennym promieniu z tekstury wysokości (do 4 px × OSTROSC), mgiełka w tym samym przebiegu,
- bohater i HUD poza filtrem (osobna kamera albo kolejność warstw), sprite'y innych postaci można rozmywać razem z mapą (stoją niżej = rozmyte),
- włączać tylko na mapach z terenem i gdy różnica wysokości w widoku > 3 m (w mieście filtr wyłączony, zero kosztu),
- pokrętło admina `gory_rozmycie` (siła 0–2, 0 = wyłączone).

## 3. Chodzenie tylko szlakiem
Gra już ma `CityMap.roughOffPath` (GORY.stromoBezSzlaku 0,45 i skały/lodowce tylko 3 m od drogi lub ścieżki). Do zrobienia:
- urwiska (`earth` kind `cliff` z Protomaps) też tylko szlakiem (blokada w pasie 2 m wzdłuż linii),
- opcja `GORY.parkTylkoSzlakiem` (domyślnie wyłączona, decyzja właściciela po teście): w parku narodowym (`landuse` kind `national_park`) poza 3 m od ścieżki nie wolno chodzić – jak w TPN; dotyczy tylko map z terenem,
- komunikat przy blokadzie (raz na 2 s): „Skały – tu tylko szlakiem” / „Urwisko – tylko szlakiem” / „Za stromo – tylko szlakiem” / „Park narodowy – nie wolno schodzić ze szlaku”,
- ścieżki w górach rysowane szerzej (punkt 1), a strefa „przy szlaku” liczona od krawędzi szerszej ścieżki.

## 4. Kosodrzewina i rodzaje terenu w górach
Z OSM (Protomaps `landuse`): `scrub` → podłoże `zarosla` + gęsta kosodrzewina (siatka 11 px, 80 %), `bare_rock`/`scree` → `skala` + głazy i kamyki, `grassland`/brak danych powyżej górnej granicy lasu → `laka`/`trawa`, `forest` → `las_iglasty` (świerk), pojedyncze jałowce i kosówki na halach. Granice rodzajów wygładzone szumem (makieta: przesunięcie ±7 px), bo dane terenu w górach są zgrubne. Biomy wg wysokości jak w `dane/gatunki_osm.json` (`wysokoscM`).

## 5. Zadanie
| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| G10 | Góry: generator na mapach z terenem (punkt 4), szersze ścieżki, filtr „rozmycie w dół” (punkt 2), blokady szlaku z komunikatami (punkt 3) | Zakopane (próbka `data/world-sample/zakopane.pmtiles` + terrarium) wygląda jak makieta, płynnie na telefonie | ~500 tys. |


## 7. Rework 6.10: warstwy co 5 m, mgła, paralaksa (decyzja właściciela; ZASTĘPUJE płynne rozmycie z p. 2)
Właściciel: „nie widać, że chodzimy po górach – wszystko płaskie, drogi się tylko wiją”. Makieta: https://claude.ai/artifact/8j2Trci5Wj4FYDM8C3cby4, kopia `makieta/gory/makieta_gory_warstwy.html` (Kościelec / Hala Gąsienicowa – stromy wycinek, dane: `region2.py`, składanie `zloz3.py`), zrzuty `zrzuty/gory_warstwy_porownanie.png`, `gory_warstwy_grzbiet_start.png`, `gory_warstwy_grzbiet_marsz.png`.
- **Warstwy wg poziomic co 5 m, stałe w świecie:** `b = clamp(floor(hBohatera/5) − floor(hPunktu/5), 0, 4)`. b = 0 (warstwa bohatera i wszystko wyżej) – ostro; b = 1–3 – rozmycie 1/2/3 px i lekki niebieski odcień (5 %/warstwę); b = 4 (≥ 20 m niżej) – rozmycie 4 px **i mgła**: krycie `min(0.82, 0.32 + (dh − 20)/70)` × szum mgły (0,75–1,25), kolor ~#dbe6f0, szum płynie z wiatrem.
- **Paralaksa:** kotwica A goni bohatera z opóźnieniem (`A += (P − A)·(1 − e^(−dt/1,4 s))`); warstwa b rysowana z przesunięciem `(P − A) × PAR[b]`, PAR = [0; 0,07; 0,14; 0,21; 0,3] (maks. 40 px). W marszu niższe warstwy zostają w tyle, na postoju wracają na miejsce (mapa się nie rozjeżdża). Piksel ekranu bierze najpłytszą warstwę, która go „ma” (przy jej przesunięciu); luki – najgłębsza.
- **Progi:** granica warstwy bohatera z niższą – ciemna krawędź (#2e2630, 40–55 %) i cień pod nią; na stromiźnie (nachylenie > 0,55) skalny uskok: ciemny piksel, rozjaśnienie nad nim, 2 px cienia pod nim. Głębsze granice tylko 14 %, w mgle wcale. Docelowo zamiast tego paski urwisk od grafika (`ZAMOWIENIE_16`, p. 1): jeden próg = 5 m = ok. 19 px ściany.
- **Wydajność (ważne):** bo warstwy są skwantowane, obraz warstw zmienia się tylko, gdy bohater przekroczy poziomicę (co 5 m w pionie). W grze: dla każdego kawałka mapy przygotować 5 tekstur warstw (maska b + rozmycie zapieczone) i przeliczać je przy zmianie `floor(hBohatera/5)`; co klatkę tylko rysowanie warstw z przesunięciem paralaksy + mgła (shader albo tekstura mgły ze stałym szumem). Makieta liczy wszystko co klatkę na procesorze (13–30 klatek/s w przeglądarce testowej).
- **Wolniej pod górę:** prędkość `40/(1 + 3·nachylenie)` pod górę, `40/(1 + 0,9·|nachylenie|)` w dół (wcześniej 46/2,5/0,8) – w grze przez `terrain.speedFactor`.
- **Kurz spod butów:** przy podejściu o nachyleniu > 0,28 co 0,22 s obłoczek przy stopach (jasnobeżowy, rośnie i znika w 0,7 s, rozsypany ditheringiem). Docelowo 3 klatki od grafika.
- **Piętra roślin (do strojenia per pasmo):** poniżej 1700 m niskie świerki (zarośla/las i rzadko na trawie), 1700–1880 m kosodrzewina, powyżej 1800 m hala: sama trawa z krokusami (ok. 3,5 % kratek 3 px, fiolet i biel). Progi w `ZONE`; dla innych gór (Beskidy, Karkonosze) obniżyć o 300–500 m.
- **Znaki szlaku:** co ~40 m (150 px) przy krawędzi ścieżki naprzemiennie kamień z paskiem biało-czerwono-białym albo słupek; na skałach co 3. znak to kopczyk. Kolor szlaku z OSM (`osmc:symbol`/`colour` relacji route=hiking); docelowo sprite'y od grafika.

### 7a. Poprawki właściciela 6.10 (po makiecie z 5 m)
Właściciel: „wygląda rewelacyjnie, jeśli to urwisko; jeśli to ścieżka, której nie widać, bo jest stroma – niedobrze”. Zmiany (makieta zaktualizowana, zrzut `zrzuty/gory_warstwy_10m.png`):
- **Warstwy co 10 m** (`WARSTWA = 10`): `b = clamp(floor(hB/10) − floor(hP/10), −2, 4)`; rozmycie 0 dla b ≤ 0, potem 1/2/3/4 px dla b = 1/2/3/4+ (10/20/30/40+ m niżej), odcień 4 %/warstwę.
- **Paralaksa w obie strony:** PAR[b] = [−0,1; −0,05; 0; 0,07; 0,14; 0,21; 0,3] dla b = −2…4 – teren wyżej od bohatera lekko „wyprzedza” (bliżej oka), niższy zostaje w tyle. Piksel bierze najwyższą warstwę, która go ma przy swoim przesunięciu; luki – warstwa bohatera bez przesunięcia.
- **Bez linii poziomic** – granice widać tylko po rozmyciu i przesunięciu; krawędzie urwisk przyjdą od grafika (tylko tam, gdzie naprawdę jest skała/urwisko).
- **Mgła lżejsza:** od 20 m w dół krycie rośnie do 16 % przy 50 m, dopiero niżej gęstnieje do 80 % przy 100 m (× szum 0,7–1,3).

### 7b. Pomniejszenie terenu w dole i mocniejsza paralaksa (właściciel 6.10: „użyć zoomu i pomniejszać to, co niżej; mocniejsza paralaksa”)
Zrzut `zrzuty/gory_zoom_paralaksa.png`, makieta zaktualizowana (ten sam link).
- **Płynnie z wysokością, nie skokami na warstwach** (pierwsza próba ze stałą skalą na warstwę dawała na stromiźnie „plasterki” powtórzonej trawy). Dla piksela ekranu `s` (względem stóp bohatera `c`) szukamy punktu świata `w`, który tu ląduje: `w = c + (s − c) / k(dh) + (P − A) · p(dh)`, gdzie `dh` = hBohatera − h(w). Bo `dh` zależy od `w`, liczymy to 3 razy (start: `w = s`) – wystarcza.
  - skala `k(dh) = 1 / (1 + 0,0075 · min(dh, 60))` dla terenu niżej (20 m → 0,87; 60 m+ → 0,69), `1 + 0,004 · min(−dh, 30)` dla terenu wyżej (do 1,12);
  - paralaksa `p(dh) = 0,0105 · min(dh, 60)` niżej (do 0,63 ruchu), `−0,011 · min(−dh, 30)` wyżej; kotwica A jak w p. 7.
- Rozmycie i mgła bez zmian (warstwy co 10 m, p. 7a) – liczone dla `dh` znalezionego punktu.
- **W grze:** to idealnie pasuje do shadera fragmentów (tekstura wysokości + 3 iteracje + odczyt z tekstury warstwy rozmytej). Bohater, postacie i obiekty na jego poziomie rysowane normalnie, na wierzchu. Zapas wokół ekranu: ok. 140 px obrazu na pomniejszenie i paralaksę.

### 7c. Wydajność: robić to shaderem (sprawdzone 6.10)
Właściciel: „z paralaksą jest koszmarnie spowolnione – jeśli gra nie może działać płynnie z paralaksą, zostajemy przy płynnym rozmyciu bez paralaksy”. Spowolnienie było tylko w makiecie, bo liczyła wszystko na procesorze (5–15 klatek/s). Makieta ma teraz wersję na karcie graficznej (shader WebGL2 w `makieta_gory_warstwy_szablon.html`, `FS`/`initGL`/`renderGL`). Wygląda tak samo i ma **60 klatek/s nawet na programowej karcie graficznej w przeglądarce testowej** (bez sprzętowego GPU), więc na telefonie też będzie płynnie.
- **Tekstury:**
  - ziemia (z krzewami wpieczonymi) z **mipmapami** – rozmycie warstw to po prostu `textureLod(…, 0,4 + 0,6·b)`, bez osobnych tekstur rozmytych;
  - wysokości jako `R32F` (siatka 8 m, dwuliniowo w shaderze).
- **Shader na piksel:** 3 przybliżenia `w = P + (s − c)/k(dh) + (P − A)·p(dh)` (p. 7b), warstwa `b` z poziomic co 10 m, mgła z szumu w shaderze.
- **W Phaserze:** to filtr/shader na warstwie mapy (kawałki mapy złożone w jedną teksturę wokół bohatera albo shader na kamerze). Postacie, drzewa z wiatrem i obiekty na poziomie bohatera rysowane normalnie nad nim. Drzewa i obiekty niżej trzeba albo wpiec w teksturę ziemi (jak w makiecie), albo przesuwać tym samym wzorem (pozycja → `w`).
- **Plan B, jeśli na słabym telefonie zabraknie mocy:** to samo bez paralaksy i pomniejszenia (`uPar = 0`, `k = 1`) – zostaje rozmycie warstw i mgła. Pokrętło admina `gory_paralaksa`.
