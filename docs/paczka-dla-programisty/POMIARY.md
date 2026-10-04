# Pomiary generatora (4.10.2026, drzewa 0,6 i gęsty las)

Chromium bez karty graficznej (swiftshader), jeden wątek. Dławienie procesora przez DevTools: **1× = komputer, 4× ≈ średni telefon, 6× ≈ słaby telefon**. Czasy w milisekundach. Kawałek mapy = 1024×1024 px (dzisiejszy kawałek 512 px mapy przy DOTS 2).

| Co | 1× | 4× | 6× |
|---|---|---|---|
| Atlas drzew: 16 rodzajów × 3 warianty × 5 klatek wiatru, skala 0,6 (raz, przy starcie) | 103 | 211.6 | 310.2 |
| Podłoże kawałka 1024×1024 z cieniami budynków | 117.2 | 476.8 | 695.3 |
| Cienie budynków (rasteryzacja) | 6.7 | 18.4 | 31.7 |
| Ciemniejsza obwódka przy drogach | 80.9 | 201.7 | 275.7 |
| Woda ze stopniowaną głębią + brzegi (plaża, szuwary), staw ok. 240 px; tylko kawałki z wodą | 168 | 627.1 | 934.8 |
| Runo rozsypane w kawałku, gęściej (9833 kępek + 158 trzcin) | 42.4 | 114.7 | 179.8 |
| Budynki z obrysów, przyciągnięte do 8 kątów (12 szt., w tym L) | 90.1 | 178.9 | 326.3 |
| Pnie + korony 409 drzew w kawałku (gęsty las) | 67.6 | 176.5 | 245.5 |
| Tor kolejowy przez kawałek | 17 | 34.5 | 45.6 |
| Rurociąg (44 moduły) | 2 | 6.6 | 10.8 |
| Para: 3 rozmiary × 6 klatek (raz) | 6.9 | 28.6 | 49 |
| **Razem jeden kawałek mapy (z wodą)** | **~590** | **~1870** | **~2790** |
| Razem kawałek bez wody | ~420 | ~1250 | ~1850 |

Nie wliczone: mapa rodzajów w demo jest liczona wolną funkcją testową. W grze to wypełnienie obszarów na płótnie, czyli to, co MapRenderer robi już dziś (kilkanaście ms). W grze korony to sprite'y z atlasu (nie malowane w kawałek), więc „drzewa w lesie” w kawałku to tylko pnie i cienie.

**Wniosek:** atlas drzew i para jednorazowo ok. 0.2 s na średnim telefonie. Nowy kawałek mapy ok. 1.25 s na średnim telefonie (ok. 1.9 s, gdy jest w nim woda) → **malować w Web Workerze** (gra się nie przycina). Przy 70 km/h nowy kawałek co ok. 14 s. Przy OSTROSC 1 kawałek 512×512 = 4× mniej pracy. Pamięć bez zmian; odpada pobieranie plików `public/swiat/`.
