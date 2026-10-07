# Zamówienie 19: Brama Krakowska, Nowy Ratusz, Archikatedra z Wieżą Trynitarską (+ cewka Tesli)

Zamek Lubelski z poprzedniej paczki stoi już w grze i zostaje bez zmian. Teraz trzy kolejne zabytki, robione **tą samą metodą co zamek**: malujesz budowlę na szkielecie z mapy, a gra kładzie obraz dokładnie na obrysie.

Wszystkie pliki są w folderze `19_zabytki_szkielety/`.

## Jak (dla każdego zabytku)

1. Na wejście generatora obrazów daj `<zabytek>_szkielet_x4.png` (szkielet 4× na tle magenta) i 2–4 zdjęcia zabytku (linki niżej).
2. `<zabytek>_w_scenie_x2.png` pokazuje, **gdzie zabytek stoi w mieście**: szare bryły to sąsiednie budynki (ich nie malujesz), kolorowa to zabytek, numery to jego części, a bohaterka pokazuje skalę. Północ jest u góry.
3. Wynik ma mieć **ten sam rozmiar, sylwetkę i położenie** co szkielet i **tło magenta**. Zmniejszenie, paletę i obrys robimy my skryptem.
4. Jeśli generator zmieni kształt, powtórz z dopiskiem `do not change the outline, only paint inside it`.
5. Brzegi **bez różowej obwódki** (przy zamku wyczyściliśmy ok. 250 różowych pikseli).

**Rzut gry:** dachy widać z góry na obrysie, a ściany idą w dół (na południe) i lekko w prawo, jak u zamku. Światło z lewej-góry, obrys #1e1a24, grube kwadratowe piksele, 3–5 odcieni na kolor, bez gradientów, bez napisów.

## 1. Brama Krakowska (`brama_krakowska_*`)

- Jedna część: **gotycka wieża bramna z czerwonej cegły**, na górze **biały barokowy hełm** z latarnią i iglicą, na ścianie zegar.
- W szkielecie wieża ma wysokość ok. 30 m (ściany 40 px w rzucie, ściśnięte jak donżon zamku).
- **Przejazd bramny**: przez bramę biegnie ulica (z północnego wschodu na południowy zachód). Na widocznej ścianie namaluj **ostrołukowy przejazd** (ciemne wnętrze łuku), żeby było widać, że to brama.
- Lekki steampunk: **mosiężna tarcza zegara z widocznymi zębatkami** zamiast zwykłego zegara, 1–2 miedziane rurki wzdłuż muru.
- Zdjęcia: https://www.wikidata.org/wiki/Q9663386 (link do Wikimedia Commons na stronie).

## 2. Nowy Ratusz (`nowy_ratusz_*`)

- Urząd Miasta na placu Łokietka, naprzeciw Bramy Krakowskiej. **Nie myl go z Trybunałem Koronnym (Starym Ratuszem) na Rynku.**
- Jedna część: **klasycystyczny gmach**, żółte (piaskowe) ściany, białe gzymsy i obramienia okien, **czerwony dach czterospadowy**; od strony placu fasada z kolumnami/pilastrami i trójkątnym frontonem.
- Lekki steampunk: **mosiężny zegar z wahadłem nad wejściem**, na dachu **antena telegrafu** (mosiężny maszt z izolatorami), wzdłuż jednej ściany **rury poczty pneumatycznej**. Pary nie rysuj, robi ją program.
- Zdjęcia: wyszukaj „Nowy Ratusz Lublin plac Łokietka” na Wikimedia Commons.

## 3. Archikatedra i Wieża Trynitarska (`katedra_*`)

Dwie części (numery w `katedra_w_scenie_x2.png`):

| Nr | Część | Wysokość w rzucie | Opis |
|---|---|---|---|
| 1 | Archikatedra | 24 px (ok. 20 m) | jasne, szarobiałe ściany, zielony (miedziany) dach, od zachodu **portyk z kolumnami** |
| 2 | Wieża Trynitarska | 56 px (40 m) | neogotycka wieża, beżowy kamień, zegar, ostry hełm; stoi przy katedrze od północnego zachodu |

- Zdjęcia: https://www.wikidata.org/wiki/Q9373790 (Wieża Trynitarska) i strona Archikatedry Lubelskiej na Wikidanych/Commons.

### Cewka Tesli na katedrze (animowana)

Na dachu katedry, we wschodniej części, stoi **cewka Tesli**. Miejsce zaznaczyliśmy czerwonym krzyżykiem w `katedra_miejsce_cewki_tesli_x4.png`, a współrzędne są w `katedra.json` (`cewka_tesli_px_1x`).

- **Osobny plik**, bo gra animuje cewkę oddzielnie: `cewka_tesli.png` na magencie.
- Wygląd: miedziana spirala na mosiężnej podstawie z nitami, na górze **metalowy torus (pierścień)**, obok mały mosiężny piorunochron. Wysokość mniej więcej **jak bohaterka** (cewka ma być widoczna z ulicy, ale nie przytłaczać wieży).
- **Klatki (w jednym rzędzie, ta sama skala i podstawa):**
  1. spokojna (bez iskier),
  2. i 3. małe trzaskające iskry wokół torusa (dwa różne układy),
  4. duże wyładowanie: 2–3 jasnoniebieskie łuki od torusa w dół do piorunochronu.
- Iskry jasne, biało-błękitne, z ciemnym obrysem tylko wokół cewki (nie wokół iskier). Poświatę nocą dorobi gra.
- **Nie rysuj cewki na obrazie katedry.** W tym miejscu dach ma być zwykły, a cewkę gra postawi na wierzchu.

## Polecenie dla generatora obrazów (gotowe do wklejenia, podmień nazwę i opis)

```
Repaint this block-out as a detailed pixel art building for a top-down RPG.
Keep EXACTLY the same silhouette, size, position and perspective: roofs seen from above, walls visible below the roofs, leaning slightly to the right. Do not move or resize anything. Keep the flat magenta background #FF00FF.
This is KRAKOW GATE in Lublin, Poland (Brama Krakowska), see the attached photos:
part 1 – a gothic red-brick gate tower with a white baroque helmet roof, a pointed archway passage through it, a brass clock face with visible gears.
Pixel art: chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24, light from the top-left, no anti-aliasing, no gradients, no text.
Very light steampunk touch: brass clockwork, a few copper pipes.
```

Dla cewki Tesli:

```
Pixel art game sprite sheet of a STEAMPUNK TESLA COIL for a top-down RPG, 4 frames in one row, same scale, same baseline:
1) idle, 2) small crackling sparks around the top torus, 3) different small sparks, 4) big discharge: 2-3 bright blue-white arcs from the torus down to a small lightning rod.
Copper coil on a riveted brass base, metal torus on top. Chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24 around the coil only, light from the top-left, no anti-aliasing, no text.
Solid flat background pure magenta #FF00FF, no ground, no shadow.
```

## Kolejność

1. Brama Krakowska (do akceptacji).
2. Nowy Ratusz.
3. Archikatedra z Wieżą Trynitarską i osobno cewka Tesli.

Kolejne zabytki (Brama Grodzka, Trybunał Koronny) dostaniesz w ten sam sposób, gdy przygotujemy ich szkielety.
