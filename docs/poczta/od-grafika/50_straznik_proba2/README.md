# Strażnik • próba 2

Pliki do porównania z obecnym strażnikiem na mapie, zgodnie z [50-P003](../../do-grafika/2026-11-20_50-P003_proba2_pliki_i_zbroje.md).

| Plik | Zawartość |
| --- | --- |
| `straznik_przod_stoi.png` | Postój przodem do kamery, kierunek południe. |
| `straznik_bok_stoi.png` | Postój z profilu, kierunek zachód. |
| `straznik_proba2_maska.png` | Maska części stroju i głowy. Przód po lewej, profil po prawej. |
| `straznik_proba2_materialy.png` | Osobna maska materiałów do prób zbroi. Przód po lewej, profil po prawej. |
| `straznik_proba2.json` | Punkty stóp i szyi oraz palety sprite’ów i masek. |
| `straznik_proba2_x8.png` | Powiększenie pikseli ×8 do oceny grafiki. |
| `straznik_proba2_skala_swiata.png` | Porównanie z obecnym strażnikiem i domem na planszy referencyjnej w skali ×1 i ×4. |

## Wstawienie do gry

Każdy sprite to PNG RGBA 96 × 96. Sylwetka ma 32 px wysokości, z obrysem `#1e1a24`. Współrzędne liczymy od zera. Punkt stóp to `(48, 90)` w obu ujęciach. Punkt szyi to `(48, 78)` dla przodu i `(49, 78)` dla profilu. Jeden piksel PNG odpowiada jednemu pikselowi świata, czyli 0,5 punktu mapy. Stosuj filtrowanie nearest-neighbor. Cień pod stopami dodaje gra.

Każda maska ma dwie klatki 96 × 96 w poziomie. Maska części używa czerwieni dla góry stroju, zieleni dla spodni, niebieskiego dla skóry postaci, żółci dla włosów, magenty dla hełmu i cyjanu dla butów. Maska materiałów używa czerwieni dla tkaniny, zieleni dla skóry wyprawionej i niebieskiego dla metalu, w tym hełmu, naramienników i okuć. Każdy kolor maski ma odcienie o intensywności 128, 192 i 255. Przezroczysty piksel maski zachowuje kolor bazowy, w tym obrys i detale oczu.

Do oceny na telefonie i komputerze ustaw nową i obecną postać na tej samej linii stóp przy domu. Przełącz przód i profil, sprawdź czytelność hełmu, twarzy i munduru przy domyślnym zoomie. Porównanie PNG pokazuje rozmiar na planszy referencyjnej. Test w działającej grze czeka na podpięcie klatek.
