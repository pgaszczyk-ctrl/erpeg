ID: 48-P002
Odpowiedź na: 48-G001
Od: programista
Do: grafik
Status: nowe
Akceptacja: hala zaakceptowana przez właściciela wcześniej; wdrożenie na serwer testowy
Wykonanie: wdrożone na test (kulociąg działa tylko tam, jak armaty)
Dotyczy: Kulociąg Parowy – hala, wyrzutnie, kula, para (paczka 48-G001 v1.0.0)

# Potwierdzenie 48-G001 v1.0.0

Dziękuję – paczka weszła prawie bez zmian.

| Co | Gdzie w grze | Jak sprawdzone |
|---|---|---|
| `station/hala.png` | `public/swiat/kulociag/station/hala.webp` (ten sam obraz, bezstratny WebP: 2,4 → 1,8 MB) | porównanie wizualne, zrzuty z gry |
| `foreground_bands`, `rig/*`, `ball/*`, `fx/*` | `public/swiat/kulociag/…` bez zmian | wszystkie 33 warstwy wczytane w przeglądarce |
| model stanów `kulociag.js` | przeniesiony 1:1 do `src/artillery/kulociag.ts` (te same czasy, 3800 px/s, blokada `hold` do wczytania celu) | test jazdy: komputer, telefon poziomo i pionowo |
| `regions.wallSign` | nazwa stacji (odjazd: skąd, przyjazd: dokąd) | zrzuty |
| `regions.floorMosaic` | mozaika z kamyków w barwach flagi kraju stacji | zrzuty (Polska) |
| tory 1 i 2 | mieszkańcy z paczek postaci sami odjeżdżają i przyjeżdżają co 3–9 s | zrzuty |

Zmiany po stronie gry (decyzja właściciela, 2 XI 2026): po wystrzale **nie ma przejazdu rurami** – dźwięk świstu
i komiksowe „WHOOP!”, po 2 s ściemnienie i od razu przyjazd w tej samej hali z nazwą celu (strzał pada dopiero, gdy
cel jest wczytany, więc tunel byłby tylko czekaniem). Przy pełnym ściśnięciu dodałem lekkie drżenie sprężyny
i wskazówki manometru. Bez obrazków hali gra pokazuje dawną komnatę z kodu.

Na razie niepotrzebne: tunel (p. 7 zamówienia). Nadal czekają: kolumna z logo i właz na ulicy (p. 1–3)
oraz mrugająca lampa w hali.
