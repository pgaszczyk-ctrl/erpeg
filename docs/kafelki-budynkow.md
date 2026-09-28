# Kafelki budynków – lista do wygenerowania

Skala gry: 1 metr = ok. 2 piksele. Dom 10 × 8 m ma na mapie ok. 20 × 16 pikseli,
ściana frontowa ma 4–8 pikseli wysokości. Kafelki są więc **małe** – liczy się
czytelny wzór, nie drobne detale.

## Zasady dla wszystkich plików
- PNG, piksel-art, bez wygładzania (antyaliasingu), bez rozmycia.
- Światło z lewej-góry (jak w reszcie gry).
- Tekstury dachów i ścian **bez obrysu** i **bez przezroczystości** – gra sama dorysuje
  ciemny kontur budynku. Muszą się „kafelkować”: lewa krawędź pasuje do prawej, górna do dolnej.
- Ozdoby (krzak, beczka…) – przezroczyste tło, obrys 1 px w kolorze `#1e1a24`, jak przedmioty.
- Wrzucaj do `public/budynki/` pod dokładnie tymi nazwami.

## 1. Dachy – tekstury 16 × 16 px (kafelkujące się w obie strony)
Każdy dach w dwóch wersjach: `_jasna` (połać od słońca) i `_ciemna` (połać w cieniu, ten sam wzór, ciemniej).
Rzędy dachówek biegną **poziomo**; gra obraca je wzdłuż kalenicy.

| Plik | Co to | Gdzie |
|---|---|---|
| `dach_dachowka_czerwona_jasna.png` / `_ciemna` | czerwona dachówka | miasta, domy murowane |
| `dach_dachowka_brazowa_jasna.png` / `_ciemna` | brązowa dachówka | wsie, stare domy |
| `dach_lupek_jasna.png` / `_ciemna` | szary łupek | kamienice, Niemcy, kościoły |
| `dach_gont_jasna.png` / `_ciemna` | drewniany gont | drewniane domy na wsi |
| `dach_strzecha_jasna.png` / `_ciemna` | słomiana strzecha | chaty, zagrody |
| `dach_plaski.png` (jedna wersja) | płaski dach (papa, żwir) | bloki, hale, duże budynki |

**Kalenica** – pasek 16 × 3 px, kafelkujący się poziomo, jeden na każdy materiał:
`kalenica_dachowka_czerwona.png`, `kalenica_dachowka_brazowa.png`, `kalenica_lupek.png`,
`kalenica_gont.png`, `kalenica_strzecha.png`.

## 2. Ściany frontowe – paski 16 × 8 px (kafelkujące się poziomo)
Dół obrazka = ziemia. Przy niskich budynkach gra utnie górę (zostanie 4 lub 6 px), więc
okna i drzwi trzymaj w dolnych 6 px. Każdy materiał w trzech wersjach:

| Wersja | Opis |
|---|---|
| `_gladka` | sama ściana |
| `_okno` | ściana z jednym oknem na środku (okno ok. 3 × 3 px) |
| `_drzwi` | ściana z drzwiami na środku (drzwi ok. 4 × 6 px, stoją na dolnej krawędzi) |

Materiały (każdy × 3 wersje):
`sciana_deski`, `sciana_bale` (drewniane bale), `sciana_mur_pruski`, `sciana_cegla`,
`sciana_tynk_bialy`, `sciana_tynk_kremowy`, `sciana_kamien`.

Przykład nazw: `sciana_cegla_gladka.png`, `sciana_cegla_okno.png`, `sciana_cegla_drzwi.png`.

## 3. Ozdoby – przezroczyste tło, obrys `#1e1a24`
| Plik | Rozmiar | Co |
|---|---|---|
| `ozdoba_krzak.png` | 8 × 6 | krzak przy ścianie |
| `ozdoba_plot.png` | 16 × 6 | drewniany płot (kafelkuje się poziomo) |
| `ozdoba_beczka.png` | 5 × 6 | beczka |
| `ozdoba_studnia.png` | 12 × 12 | studnia (podwórka na wsi) |
| `ozdoba_stog.png` | 12 × 10 | stóg siana (pola) |
| `sciezka_kamienna.png` | 8 × 8 | kamienie ścieżki do drzwi (kafelkuje się, bez obrysu) |

## Na start wystarczy (≈ 20 plików)
Dachy: dachówka czerwona, gont, łupek, płaski (7 plików z wersjami jasna/ciemna) + 3 kalenice.
Ściany: deski, cegła, tynk biały (9 plików). Ozdoby: krzak i płot.
Resztę dorobimy, gdy zobaczymy pierwszy efekt w grze.

## Później (osobna lista)
Inne kraje (dachówka japońska, dach tajski, glina/adobe…), zamki (po kilka na region,
ok. 48 × 48 px) i pomniki/dekoracje w miejscach zabytków (wieża z zegarem, łuk, obelisk,
fontanna, posąg; 16–32 px).

## Podpowiedź do generatora
„pixel art seamless tileable texture, 16x16, top-down game, red clay roof tiles in horizontal rows,
lit from top-left, no outline, no anti-aliasing, limited palette” – i osobno druga, ciemniejsza wersja.
