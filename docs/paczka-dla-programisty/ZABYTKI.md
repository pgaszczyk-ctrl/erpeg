# Zabytki: obrazek od grafika na szkielecie z OSM (decyzja właściciela 5.10.2026, wzór: Zamek Lubelski)

Zrzuty: `zabytki/p_0.png` (dziś: generator rysuje zamek jak blok), `zabytki/p_1.png` (szkielet w scenie z numerami części), `zabytki/zamek_szkielet_x4.png` (wejście dla generatora obrazów, tło magenta). Kod wzoru: `zabytki/szkielet_demo.ts`, dane: `zabytki/zamek_lubelski_osm.json`. Zamówienie dla grafika: `docs/paczka-dla-artysty/ZAMOWIENIE_13_zabytki.md`.

## 1. Lista zabytków
`src/content/zabytki.ts`: ręczna lista `{ id: 'zamek_lublin', wikidata: ['Q2604117', 'Q11735166'], osm: [...ids], czesci: { <nazwa/id>: { wysokosc px, kolor szkieletu } }, plik: 'zabytki/zamek_lublin.png' }`. Dopasowanie: w Lublinie po id OSM / wikidata (build-map ma tagi), na mapach świata po wikidata z POI albo po położeniu (obrys najbliższy punktowi). Bez automatu „wszystko z Wikidanych”.

## 2. Szkielet (skrypt `scripts/zabytki-szkielety.mjs`, uruchamiany w GitHub Actions – sandbox nie sięga OSM)
- Obrysy części z OSM (`building`, `building:part`, wysokości `height`/`building:levels`, `roof:shape`, `roof:colour`), rzut gry: dach na obrysie, ściany wiszą w dół o wysokość i w prawo o WALL_SKEW 0,35; wysokości: 1 kondygnacja = 8 px obrazu, max 16 px dla zwykłych części; części wysokie (wieże, `height` > 15 m) ściśnięte: 16 + (h − 15) × 1,6 px (donżon 25 m → ok. 44 px).
- Bufor głębokości: przód = podstawa ściany dalej na południe (`y + H`), inaczej wysoka wieża w środku dziedzińca chowa się pod skrzydłem (sprawdzone na donżonie).
- Wynik: `szkielet_x4.png` (magenta), `szkielet_opis.png` (numery części), `szkielet.json` (prostokąt w px świata, kotwica = lewy-górny róg w px mapy ×2, lista części z wysokościami).

## 3. W grze
- Generator budynków pomija obrysy należące do zabytku; w ich miejscu sprite od grafika (po `wyrownaj.py`) w położeniu z `szkielet.json`. Wczytywany leniwie, gdy bohater jest bliżej niż ~300 m; w kawałku mapy do czasu wczytania – zwykły budynek z generatora.
- Zderzenia, drzwi (`entranceOf`), odkrywanie mgłą – bez zmian, z obrysów OSM.
- Części wyższe niż 16 px wycinamy ze sprite'a do osobnego obiektu sortowanego po `y` podstawy (jak korony drzew), z prześwitem, gdy bohater jest za nimi; reszta zabytku leży w warstwie mapy jak dziś budynki.
- Cień jak u budynków (`cienBudynku` z wysokościami części).

## 4. Zadanie
| # | Zadanie | Gotowe, gdy | Wycena |
|---|---|---|---|
| G12 | Zabytki: lista, skrypt szkieletów w Actions, podmiana budynku na sprite, wysokie części jako obiekty z prześwitem | Zamek Lubelski z obrazka grafika stoi dokładnie na swoim obrysie, bohater chowa się za donżonem | ~350 tys. |
