# Zamówienie 13 – zabytki na szkielecie z mapy (pierwszy: Zamek Lubelski)

Duże, charakterystyczne budowle (zamek, katedra, wieża Eiffla…) nie mają być zwykłymi blokami z generatora (`10_zabytki/zamek_dzis_z_generatora_x2.png`). Program wycina z mapy OSM dokładny obrys i części budynku i rysuje z nich **szkielet** w rzucie gry: każda część innym kolorem, ściany pod dachem, wysokości ściśnięte jak w grze (`10_zabytki/zamek_szkielet_w_scenie_opis_x2.png`, numery części). Ty malujesz budowlę **na tym szkielecie** – wtedy pasuje co do piksela do mapy, zderzeń i drzwi.

## Jak (generator obrazów, obraz na wejściu)
1. Na wejście daj `10_zabytki/zamek_szkielet_x4.png` (szkielet 4× na tle magenta) i 2–4 zdjęcia zabytku (linki niżej).
2. Wklej polecenie (po angielsku). Wynik ma mieć **ten sam rozmiar, sylwetkę i położenie** co szkielet i **tło magenta** – resztę (zmniejszenie, paleta, obrys) robimy my skryptem `8_wyrownanie/wyrownaj.py`.
3. Jeśli generator zmieni kształt – powtórz z dopiskiem `do not change the outline, only paint inside it`.

```
Repaint this block-out as a detailed pixel art building for a top-down RPG.
Keep EXACTLY the same silhouette, size, position and perspective: roofs seen from above, walls visible below the roofs, leaning slightly to the right. Do not move or resize anything. Keep the flat magenta background #FF00FF.
This is Lublin Castle (Zamek Lubelski, Poland), see the attached photos:
part 1 (grey roof) – the neo-gothic castle: light beige walls, crenellated parapets, pointed gothic windows, small corner turrets, grey-silver roofs;
part 2 (green roof) – the Holy Trinity Chapel: white walls, tall gothic windows, green copper gable roof with a small spire;
part 3 (round) – the round stone donjon tower: lower part grey stone, upper part red brick, crenellated top;
part 4 – small exhibition building.
Pixel art: chunky square pixels, 3-5 shades per colour, 1-pixel dark outline #1e1a24, light from the top-left, no anti-aliasing, no gradients, no text.
Very light steampunk touch allowed: one small brass clock or pipe.
```

Zdjęcia i opis: Zamek w Lublinie https://www.wikidata.org/wiki/Q2604117 · Kaplica Świętej Trójcy https://www.wikidata.org/wiki/Q11735166 (w Wikidanych są linki do zdjęć na Wikimedia Commons).

## Kolejne zabytki
Dla każdego dostaniesz taki sam zestaw: szkielet ×4, opis części, polecenie, linki. Najpierw Zamek Lubelski do akceptacji, potem Brama Grodzka, Brama Krakowska, katedra, Trybunał.
