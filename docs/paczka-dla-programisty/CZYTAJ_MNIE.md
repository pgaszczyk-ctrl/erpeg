# Paczka dla programisty – overhaul 09 „żywy świat w pixel arcie”

Dla czatu 🛠 Technika i rozwój (Claude w repozytorium `pgaszczyk-ctrl/erpeg`). Grafik dostaje osobną paczkę: `docs/paczka-dla-artysty/`.

> **Najnowsza decyzja (4.10.2026): świat rysuje program w telefonie.** Ziemia, drzewa, runo, budynki, rurociągi, para i tory pochodzą z generatora (`generator/`), nie z plików grafika. Grafik robi tylko pojazdy, zabytki, szyldy i nowe postacie (zamówienie 11). Tam, gdzie SPEC mówi o „grafikach od grafika” dla świata, obowiązuje `GENERATOR_SWIATA.md`.

| Plik / folder | Co to |
|---|---|
| `PROMPT_DLA_PROGRAMISTY.md` | gotowe polecenie do wklejenia w czat programisty |
| `GENERATOR_SWIATA.md` | **zacznij tu (punkt 0 = ostatnie decyzje):** co daje generator, pomiary obciążenia telefonu, jak wpiąć w `MapRenderer` i drzewa, zadania G1–G9 z wyceną |
| `generator/` | **gotowy kod TypeScript** (bez Phasera i DOM-u, działa w Web Workerze): drzewa 16 gatunków z klatkami wiatru, podłoże 19 rodzajów (żywa trawa, nierówny chodnik), woda z głębią i brzegami (plaża/szuwary), runo, budynki z obrysu, rurociągi, para, tory; `demo/index.html` = galeria + pomiar czasu |
| `POMIARY.md` | czasy generowania na symulowanym telefonie (CPU 1×, 4×, 6×) |
| `SPEC_09_zywy_swiat.md` | decyzje właściciela, stan obecny w kodzie, skala, wiatr/prześwit/ścinanie z informacją zwrotną, postacie (4a), steampunk, kolej, budżet pamięci, zadania Z0–Z10 |
| `makieta/zywy-swiat.html` | działająca makieta: implementacja wzorcowa efektów (wiatr, prześwit, ścinanie, owoce) |
| `makieta/OPIS_KODU.md` | co gdzie jest w makiecie |
| `makieta/dachy_roofs.py` | wcześniejszy prototyp dachów w Pythonie (zastąpiony przez `generator/budynki.ts`) |
| `shadery/` | szkice: klatki wiatru, maska prześwitu, własny filtr Phaser 4 |
| `dane/` | gatunki wg tagów OSM, parametry drzew, wzory wiatru |
| `zrzuty/` | zrzuty z makiety i galerii generatora, schematy |

Zasada pracy jak zawsze: wszystko za przełącznikiem `?wyglad=09`, najpierw serwer testowy, zrzut w widoku telefonu, na produkcję tylko na polecenie właściciela.
