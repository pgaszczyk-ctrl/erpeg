# 44-G007 — mieszkańcy i pies

Odpowiedź na B2 zamówienia 44-P001. Piętnaście wyglądów mieszkańców z sześciu rodzin sylwetek oraz osobny pies. Postacie nazwane i Mechaniczny Gladiator pozostają kolejną partią. Nie wdrożono do gry.

## Podglądy

- `44_ruchome_3d/partia4_mieszkancy.png`: piętnaście wyglądów oraz pies we wspólnej skali.
- `44_ruchome_3d/partia4_profile.png`: sześć sylwetek i pies z przodu, pod kątem, z boku i od tyłu.
- `44_ruchome_3d/partia4_ruch.gif`: chód, obrót i merdanie ogonem.
- `44_ruchome_3d/partia4_gesty.gif`: rozmowa, powitanie, chód z parasolem i siadanie.
- `44_ruchome_3d/podglad_44.html`: offline, wybór modeli, kierunku, kamery i klipu. Na telefonie domyślnie jedna postać. Grupa nowej partii zawiera siedem reprezentantów, osobna grupa wszystkich mieszkańców.

## Sylwetki i palety

Rodziny: `child_m`, `child_f`, `adult_m`, `adult_f`, `elder_m`, `elder_f`. Proporcje i pozycje stawów różnią się według wieku. Sylwetki damskie mają osobną bryłę spódnicy i fryzury. Seniorzy mają lekko pochylony tułów i krótszy krok. Każdy wygląd jest samodzielnym GLB. Sześć rodzin to wspólna konstrukcja, nie sześć dodatkowych plików.

Pliki i palety: `mieszkancy_warianty.json`. Kolejność według planszy: młoda kobieta, chłopiec, pan z wąsem, babcia, młody mężczyzna, dziewczynka z warkoczykami, chłopiec II, kobieta, mężczyzna, starszy pan, dziewczynka, urwis, starsza pani, starszy pan w kapeluszu, mieszczka.

`extras.paletteGroups` wymienia węzły `skin`, `hair`, `clothes_1`, `clothes_2`, `leather`, `metal`. Kolorować przez `COLOR_0` danego węzła, zachowując jasność ścian. Jeden materiał unlit jest wspólny dla całej postaci; zmiana koloru materiału zmieni wszystko. Fartuszki i obszycia mają dodatkowe kolory; można wyłączyć ich węzły ze zmiany palety. `Hair` i `Hat` to osobne części.

## Animacje mieszkańców

| Klip | Czas | Odtwarzanie |
|---|---:|---|
| `idle` | 2,6 s | pętla |
| `walk` | dziecko 0,78 / dorosły 0,92 / senior 1,08 s | pętla w miejscu |
| `talk` | 2,2 s | pętla, gest i kiwanie głową |
| `wave` | 2,4 s | jednorazowo, wraca do spoczynku |
| `rain` | jak `walk` | pętla z parasolem w ręce |

Ruch w świecie nadaje gra. Wspólne semantyczne węzły: `hips`, `torso`, `head`, `upperL/R`, `foreL/R`, `handL/R`, `thighL/R`, `shinL/R`, `footL/R`, `L_at_hand_grip`, `R_at_hand_grip`, `Mouth`. Przy przenoszeniu klipów zachować docelowe pozycje spoczynkowe i dopasować trajektorie stóp do długości nóg. Nie kopiować absolutnych translacji stawów dorosłego na dziecko.

`Umbrella` jest dzieckiem `R_at_hand_grip`; sztyca przecina chwyt dłoni. Domyślnie skala zero. `rain` włącza parasol i ustawia ramię oraz nadgarstek. Przejścia pogody i blendowanie należą do silnika. Parasol jest tu 3D, bo porusza się z ręką; nie jest płaską nakładką.

## Pies

`pies.glb` według planszy NPC: biały pysk, łapy i końcówka podwiniętego ogona, opadające uszy, ciepłe znaczenia nad oczami. Ma własną geometrię i zaakceptowaną anatomię czworonożnego chodu wilka, w skali 0,86. Bez mechanicznych kończyn.

| Klip | Czas | Odtwarzanie |
|---|---:|---|
| `idle` | 2,4 s | pętla |
| `walk` | 0,95 s | pętla w miejscu |
| `sit` | 1,45 s | przejście do siadu, zatrzymać ostatnią klatkę |
| `wag` | 1,4 s | pętla merdania na stojąco |

`sit` składa tylne łapy i obniża zad, zachowując podparcie na przednich łapach. Odwrócić do wstawania. `wag` nie jest klipem siedzącego psa: połączenie siadu z ruchem ogona wymaga warstwy animacji w silniku. Pies nie zawiera walki.

## Sprawdzenie i ograniczenia

Kontrole geometrii, normalnych, podłoża, zapętleń, podniesienia dłoni, zamocowania parasola i faktycznej zmiany położenia zadu. Sampler JavaScript porównany z Python. Dotychczasowe 12 modeli zachowano bajt w bajt (`preserved_G006_sha256.json`), w tym poprawionego zombie i wilka.

PNG/GIF renderowane z GLB. Bez rzeczywistego testu WebGL/GPU i fizycznego telefonu; sprawdzenie przepływu podglądu używa atrapy WebGL. Każda sztywna część wymaga rysowania; wspólny materiał nie oznacza pojedynczego draw call. Wydajność i przejścia animacji wymagają sprawdzenia w grze. Bez logiki mieszkańców, interakcji i pojedynków: Pojedynkowicz może użyć sylwetki mieszkańca, lecz klipy walki pozostają do dopasowania.

Źródła: `build_batch4.py`, `render_batch4.py`, `check_batch4.py`. Odbudowa: `python rebuild.py`; z GIF-ami `python rebuild.py --gifs`.
