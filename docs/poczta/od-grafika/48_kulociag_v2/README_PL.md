# 48-G002 v2 — korekta do siatki i kamer gry

Zastępuje odrzuconą v1. Wycofano ustawienie 72 px i poprzednie ilustracyjne postacie, wózek oraz lampę. Napisy komiksowe pozostają elementami UI — nie mają kąta kamery świata.

## Parametry sprawdzone w repo

| Element | Parametry | Źródło |
|---|---|---|
| NPC / bohater | ortograficznie 22° ponad poziomem; klatka64×64; nominalna wysokość modelu54; wewnętrzny render×2 | src/ludzik3d.ts, LUDZIK_3D |
| Stopy | piksel(32,62), granica kotwicy(32,63) | src/content/wyglad.ts, STOPY_PX |
| Siatka świata | 1 piksel świata=0,5px mapy; bloki około2px klatki zakotwiczone w stopach | src/sprites.ts, PIKSEL_SWIATA i naSiatke |
| Dekoracje / armata | kamera ortograficzna50°; poziome koło h/w=sin(50°)≈0,766 | src/artillery/armata3d.ts; ustalenie49-G001 |
| Skala postaci na mapie | 0,36×SKALA_POSTACI; domyślnie SKALA_POSTACI=2/3 | src/sprites.ts, src/skala.ts |

54px określa wysokość modelu przed projekcją. Nie oznacza identycznej obwiedni każdej pozy. Nie należy osobno dopasowywać każdej klatki do zadanej wysokości ani przenosić kamery50° na postacie.

## Poprawione zasoby

Gazeciarz pochodzi z rzeczywistego chlopiec.glb z44-ruchomego-świata, z gazetą przypiętą do chwytu prawej dłoni. Straganiarz korzysta z pan_z_wasem.glb. Zachowano geometrię, proporcje i klipy modeli. Wzorcem kontroli jest straznik_chibi_wzorzec.glb. Porównanie wykonano w tej samej kamerze i tej samej klatce.

`models/` zawiera GLB obu NPC i geometryczne modele straganu oraz lamp. Stragan i lampy wyrenderowano przy50°: skrót oraz widoczność górnych powierzchni wynikają z geometrii. To pochodne zasobów/modeli i stylu rysowania gry, nie nowe ilustracje z ogólnego promptu. Offline raster używa kolorów wierzchołków; nie odtwarza pełnego oświetlenia shadera three.js. W grze modele należy podać istniejącemu rendererowi.

`assets/grid_v2.json` i `assets/manifest.json` zawierają aktualne pliki i parametry. PNG NPC mają kolor i obrys na tej samej siatce2×2, alfę0/255. Kontrola jest wykonywana osobno w każdej klatce, nie przez granice komórek atlasu. Nie zmieniano flag ani kodu renderera gry.

## Eksport i kotwice

- `assets/npc/gazeciarz.png`, `straganiarz.png`:192×192, 3×3 klatki64×64. Wiersze: przód/lewy bok/tył; kolumny:krokA/stoi/krokB. Stopy(32,62), kotwica granicy(32,63). Osobno2 klatki wołania i2 klatki sprzedawcy. Nie przycinać marginesów.
- `assets/npc/stragan.png`:128×128, kotwica(64,103). Skala geometrii54/1,25px na jednostkę; taka sama dla lampy i wzorca strażnika. Sprzedawcę i stragan składać jako grupę: człowiek, potem odpowiednie warstwy wózka. Pozycję za ladą sprawdzić w docelowym rendererze.
- `assets/lamp/lampa_0..2.png`:64×64, kotwica(32,53), świeci/przygasa/gaśnie. Przed wymianą lampy trzeba usunąć stary egzemplarz wypalony w tle. Nie przykrywać go mniejszym nowym PNG. Poblask otoczenia nadal jest częścią starej ilustracji.
- `assets/station/hala_grid.png`: zaakceptowana ilustracja1672×941, przepróbkowana do siatki2×2 od(0,0).18 warstw przednich jest wyrównanych do tej samej globalnej siatki, z zachowaniem położeń i linii podstawy. To nadal ilustracja48-G001, nie nowy model3D hali ani matematyczne potwierdzenie kąta wszystkich jej powierzchni.
- `assets/hall_layout.json`: dane przejść i punktów z tej samej hali. Maski mają rozdzielczość1px, ponieważ są danymi kolizji. Biała posadzka/czarne przeszkody. Nie rozmywać ani nie kwantować maski kolorystycznie.

## Wpięcie w scenę

Stopy i podstawy w ilustracji hali wyrównywać do parzystych współrzędnych. Przykład: stopy(420,560), kotwica(32,63), lewy górny róg klatki(388,497). Wtedy bloki PNG pokrywają się z siatką tła. Całą scenę powiększać wspólnie, NEAREST, bez wygładzania.

Właściwy gracz i NPC mają korzystać z istniejącego przelicznika gry. Najpierw zestawić ich obok siebie, potem ustalić jeden przelicznik całej hali względem świata i mebli. Nie ukrywać niespójności osobnym pomniejszaniem NPC. PNG z hali to kontrolne nałożenie natywnych klatek; nie zatwierdza ostatecznej skali wnętrza. Pasażer wymaga pozy siedzącej mieszczącej się w kuli; animacji właściwego gracza ta korekta nie dodaje.

## Kontrola

`reference/siatka_i_katy_v2.png` pokazuje wzorzec, NPC i dekoracje. `reference/hala_grid_postacie_v2.png` pokazuje kontrolne nałożenie. Nie jest to zrzut z silnika gry. Sprawdzono wszystkie PNG, odwołania manifestów i jednolitość bloków2×2 NPC/lamp. Nie uruchomiono gry, buildu repo ani testu telefonu. Paczka nie jest wdrożona.
