ID: 51-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel zamówił 25.11.2026 („Tak, zamów”)
Wykonanie: —
Dotyczy: mapa świata do najazdu przy wczytywaniu gry (świat → kontynent → kraj)

# Zamówienie 51: malowana mapa świata do najazdu przy wczytywaniu

## O co chodzi

Gdy gracz wchodzi do gry, ekran wczytywania robi najazd: widać cały świat, potem kontynent, a na końcu
kraj, w którym jest gracz (widok ok. 1300 km szerokości, np. cała Polska z sąsiadami). Najazd ma
pokazać tylko orientacyjnie, gdzie jesteśmy. Nie pokazuje ulic, napisów, pinezek ani granic.

Styl ma być taki jak plakat wczytywania (`wzor_stylu/plakat_wczytywania.webp`):
- morze to po prostu pergamin, a przy brzegach jest turkusowa akwarelowa obwódka;
- wybrzeża obrysowane grubym, czarnym tuszem;
- ląd w kolorach ochry, oliwki i musztardy, a pustynie pomarańczowe;
- lasy to kępy malowanych choinek, z wolnym terenem pomiędzy;
- góry to pasma ośnieżonych szczytów;
- rzeki i jeziora turkusowe;
- bajkowo i lekko steampunkowo, bez fotorealizmu.

Obecnie w grze jest tymczasowa mapa, którą rysuje generator (`wzor_stylu/tymczasowa_z_generatora_*.png`).
Pokazuje ona, co ma być gdzie, ale wygląda zbyt technicznie. Twoja wersja ją zastąpi.

## Najważniejsze: malujesz na moim podkładzie

W folderze są podkłady `podklad_<kadr>.png`. To prawdziwe zarysy lądów z siatką co 10° (na
kontynentach także co 5°), w rzucie, którego używa gra (Web Mercator). Do nich dołączone są przezroczyste
warstwy `kontur_<kadr>.png` z samym obrysem.

- **Wybrzeża muszą leżeć na liniach podkładu** (dopuszczalne odchylenie: kilka pikseli). Gra umieszcza
  gracza według współrzędnych. Jeśli ląd się przesunie, gracz z Polski „wyląduje” na Ukrainie.
- Gotowy plik musi mieć dokładnie ten sam rozmiar i kadr co podkład (wymiary w `kadry.json`).
- Siatka i szary ląd z podkładu nie mogą zostać w gotowym obrazku.
- Małe wysepki można pominąć albo uprościć, ale duże lądy, półwyspy i zatoki muszą się zgadzać.

## Część A: mapa świata (1 plik)

- `mapa_swiat.png`, 4096 × 4096 px, na podkładzie `podklad_swiat.png`.
- To najdalszy widok, więc wystarczą duże plamy terenu, główne pasma górskie i największe lasy.
- Bieguny mogą być ozdobnie zamglone albo zaśnieżone, bo gracz tam nie trafia.

## Część B: plansze kontynentów (6 plików)

Każda na swoim podkładzie, w rozmiarze z `kadry.json`:

| Plik | Podkład | Rozmiar |
|---|---|---|
| `mapa_europa.png` | `podklad_europa.png` | 4096 × 4072 |
| `mapa_azja.png` | `podklad_azja.png` | 3778 × 4096 |
| `mapa_afryka.png` | `podklad_afryka.png` | 3792 × 4096 |
| `mapa_ameryka_polnocna.png` | `podklad_ameryka_polnocna.png` | 4096 × 3897 |
| `mapa_ameryka_poludniowa.png` | `podklad_ameryka_poludniowa.png` | 2540 × 4096 |
| `mapa_australia_oceania.png` | `podklad_australia_oceania.png` | 4096 × 2917 |

- Na kontynentach ma być więcej szczegółów niż na mapie świata: osobne kępy lasów, pasma górskie,
  główne rzeki i większe jeziora.
- Kadry zachodzą na siebie (np. Turcja jest i w Europie, i w Azji). W części wspólnej teren ma wyglądać
  podobnie, żeby przejście było niewidoczne.
- Wielkość znaczków: choinka ok. 20–28 px wysokości, góra ok. 40–60 px szerokości. Gra pokazuje te plansze
  w przybliżeniu, więc znaczki nie mogą być drobne.

## Część C: pędzle do najbliższego poziomu (kraj)

Najbliższy widok (cały kraj z sąsiadami) dalej rysuje generator, ale Twoimi pędzlami, żeby wyglądał jak
Twoje plansze. Wszystkie pliki na przezroczystym tle (bez magenty), z twardą albo miękką krawędzią, tak jak
malujesz:

| Plik | Ile | Rozmiar | Uwagi |
|---|---|---|---|
| `choinka_01…06.png` | 6 | ok. 64 px wysokości | różne kształty, światło z lewej góry |
| `drzewo_lisciaste_01…04.png` | 4 | ok. 64 px | |
| `palma_01…03.png` | 3 | ok. 64 px | do tropików |
| `gora_snieg_01…06.png` | 6 | ok. 128 px szerokości | podstawa na dole obrazka |
| `gora_01…04.png` | 4 | ok. 128 px | bez śniegu, brązowe lub skaliste |
| `pagorek_01…03.png` | 3 | ok. 96 px | |
| `wydma_01…03.png` | 3 | ok. 96 px | |
| `pergamin.png` | 1 | 1024 × 1024 | brzegi pasujące przy powtarzaniu, bez napisów |
| `probka_wybrzeza.png` | 1 | dowolny | kawałek lądu z obrysem i turkusową obwódką: wzór grubości tuszu i szerokości obwódki |

## Część D: chmury do spadania

Podczas najazdu kamera „spada” przez chmury.

- `chmura_01…05.png`: 5 chmur po ok. 1024 px szerokości, na przezroczystym tle, w stylu plakatu (nie
  fotograficzne).
- `zaslona_chmur.png`: opcjonalnie, gęsta warstwa chmur na cały ekran, 2048 × 1024.

## Format

- PNG bez strat, kolor RGB(A) 8 bit. Na lżejsze pliki do gry przerobię sam.
- Bez napisów, nazw krajów, granic, róży wiatrów i ramek. Ozdobną ramkę dodajemy w grze osobno, jeśli
  będzie potrzebna.

## Kolejność

1. **Próba:** `mapa_europa.png` oraz po 2 choinki i 2 góry. Właściciel ocenia styl i zgodność z podkładem.
2. Po akceptacji: reszta kontynentów i mapa świata.
3. Na końcu reszta pędzli i chmury.

## Co jest w paczce

- `podklad_*.png`: podkłady do malowania (zarysy lądów z siatką).
- `kontur_*.png`: same obrysy na przezroczystym tle, do nałożenia na swój obraz przy sprawdzaniu.
- `kadry.json`: rozmiary i współrzędne rogów każdego kadru.
- `wzor_stylu/`: plakat wczytywania (wzór stylu) i obecna tymczasowa mapa z generatora (wzór, co gdzie
  ma być).
