# Gęstość pikseli: świat i postacie na jednej siatce (uwaga właściciela 6.10, PILNE)

Właściciel o zrzucie z serwera testowego (`zrzuty/gestosc_dzis_z_gry.png`): „gigantyczny dysonans między postaciami a budynkami”.

## Co jest nie tak (pomiar ze zrzutu)
- **Postać:** bohater ma ok. 110 px ekranu wysokości (≈ 23 px mapy), więc 1 px mapy ≈ 4,8 px ekranu. Piksel arkusza postaci to ≈ 1,9 px ekranu. Postać jest rysowana gładko (filtr LINEAR).
- **Świat:** piksel dachu ma ok. **8 px ekranu ≈ 1,67 px mapy**. Specyfikacja i makiety mówią **1 px obrazu generatora = 0,5 px mapy** (bohater ≈ 46–48 px obrazu wysokości). Świat jest więc malowany **ok. 3,3× grubiej**, niż powinien. Do tego jest lekko rozmyty przy powiększaniu, więc schodki krawędzi są wielkie i miękkie.

Porównanie: `zrzuty/gestosc_pikseli.png` (skrypt `makieta/gestosc_porownaj.py`):
- **Dziś:** świat gruby, postać gładka.
- **A:** świat w gęstości z makiet.
- **B:** A plus postać przepróbkowana na tę samą siatkę, w tej samej wielkości. **Polecane.**
- **C:** A plus postać 1:1 z arkusza, ostra, o 25% większa.

## Co zrobić
1. **Świat w docelowej gęstości.** Obraz generatora ma 2 px na 1 px mapy (`budynek()`, `malujPodloze`, drzewa i reszta liczą w px obrazu = 0,5 px mapy).
   - Przy `DOTS = 2` (OSTROSC 2) kawałek mapy ma już 2 px płótna na 1 px mapy, więc obraz generatora kładziemy **1:1, bez skalowania i bez wygładzania** (`imageSmoothingEnabled = false`). Pamięć się nie zmienia.
   - Przy `DOTS = 1` (słabe telefony) zmniejszyć 2× „głosowaniem” (jak `wyrownaj_klatki.py`), nie liniowo.
   - Sprawdzian na zrzucie: piksel dachu ≈ 1/46 wysokości bohatera.
2. **Tekstury kawałków mapy z filtrem NEAREST** (dziś krawędzie są rozmyte). Kamera z całkowitym powiększeniem i `roundPixels`.
3. **Postacie na tej samej siatce (wariant B).** Przy wczytaniu arkusza (`sheetPixels` w `sprites.ts`) przepróbkować każdą klatkę 64 px do siatki świata:
   - skala 46/58 ≈ 0,79, filtr pudełkowy, potem twarda alfa (> 110 → 255);
   - tekstura NEAREST (nie LINEAR);
   - `skala` tak, żeby 1 px tekstury = 0,5 px mapy (wysokość postaci bez zmian, ok. 23 px mapy).
   - Czerwona poświata wrogów zostaje miękka, bo to efekt, a nie rysunek.
   - Wariant C, gdyby właściciel wolał większe postacie: bez przepróbkowania, NEAREST, `skala` 0,5 (postać ok. 29 px mapy).
4. **Arkusze od grafika i ozdoby** po `wyrownaj_klatki.py` są już w tej siatce (1 px = 0,5 px mapy). Kłaść je 1:1.
5. **Zrzut przed i po** z tego samego miejsca (Guliwera, pies, ten sam zoom) – do akceptacji właściciela. Najpierw serwer testowy.
