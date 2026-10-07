# Zamówienie 21: Targi Lublin (Dworcowa 11) jako osobny budynek

Tą samą metodą co Zamek Lubelski: malujesz budynek na szkielecie z mapy, a gra kładzie obraz dokładnie na obrysie. Pliki są w folderze `21_targi_lublin/`.

**Dlaczego to ważne:** na placu przed Targami zaczyna się przygoda każdego gracza, który właśnie skończył demo. Targi to pierwsza rzecz, jaką zobaczy, więc mają robić wrażenie.

## Co jest w folderze

- `targi_lublin_szkielet_x4.png` – szkielet 4× na magencie. To jest wejście dla generatora obrazów.
- `targi_lublin_szkielet_1x.png` – ten sam szkielet w rozmiarze gry (854 × 617 px).
- `targi_lublin_w_scenie_x2.png` – gdzie Targi stoją. Numery części:
  1. **Hala A**, czyli duża hala wystawowa od wschodu.
  2. **Hala B**, czyli mały łącznik.
  3. **Hala C**, czyli największa, długa hala ustawiona skosem.
  
  Bohaterka w rogu pokazuje skalę, a północ jest u góry.
- `targi_lublin.json` – położenie w grze (dla programisty).

## Jak (jak przy zamku)

1. Daj generatorowi szkielet x4 i 2–4 zdjęcia Targów Lublin (wyszukaj „Targi Lublin hala” albo „Targi Lublin Dworcowa 11”).
2. Wynik ma mieć **ten sam rozmiar, sylwetkę i położenie** co szkielet, na tle magenta #FF00FF i bez różowej obwódki.
3. **Rzut gry:** dachy widać z góry na obrysie, a ściany idą w dół (na południe) i lekko w prawo. Światło pada z lewej-góry, obrys #1e1a24, grube kwadratowe piksele, 3–5 odcieni na kolor, bez gradientów i bez napisów (poza szyldem, patrz niżej).
4. Wysokość ścian w szkielecie to 16 px, czyli jeden wysoki poziom hali.

## Wygląd: steampunkowe hale wystawowe

- Duże **hale z żeliwa i szkła**, jak dziewiętnastowieczne pawilony wystawowe: przeszklone dachy w żeliwnej kracie, mosiężne kalenice, nity.
- Na dachu hali C kilka **wentylatorów i kominków parowych**. Pary nie rysuj, robi ją gra.
- **Wejście główne od południa**, od strony placu: szeroka brama z łukiem i wielkim **mosiężnym szyldem „TARGI”**. Wyjątkowo jeden napis jest tu dozwolony.
- **Flagi i proporce** na masztach przy wejściu.
- Hala B to niski, przeszklony łącznik.

## Polecenie dla generatora (do wklejenia)

```
Repaint this block-out as a detailed pixel art building complex for a top-down RPG.
Keep EXACTLY the same footprint, size, position and perspective: roofs seen from above, walls visible below the roofs, leaning slightly to the right. Keep the flat magenta background #FF00FF.
STEAMPUNK EXHIBITION HALLS (Lublin Trade Fair): 19th-century cast-iron and glass pavilions, glazed roofs in an iron lattice, brass ridges and rivets, a few steam vents and fans on the long hall's roof, a wide arched main entrance facing south with a big brass sign "TARGI", flags on masts by the entrance; part 2 is a low glazed connector.
Pixel art: chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24, light from the top-left, no anti-aliasing, no gradients, no other text.
```
