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
