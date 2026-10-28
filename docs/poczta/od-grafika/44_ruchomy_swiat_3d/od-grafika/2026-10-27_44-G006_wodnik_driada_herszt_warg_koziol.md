ID: 44-G006
Odpowiedź na: 44-P001 i polecenie właściciela „Super, kolejne” po akceptacji partii G004
Status: sześć nowych modeli do oceny; wcześniejsza szóstka zaakceptowana
Wykonanie: Wodnik, wodny blob, Driada, Herszt, Warg, Mosiężny Kozioł; GLB, animacje, podglądy i źródła

# Woda, las i mechanika

Nowa partia zawiera **sześć modeli**. W pełnej paczce są teraz **dwanaście podstawowych modeli przeciwników** oraz otrzymany Strażnik jako wzorzec. Zachowano najnowsze pliki szkieletu, wilka, chochlika, bandyty, zombiaka i Upiora, w tym korektę głębokości brył G005 z równoległego wątku. Nowe humanoidy otrzymały tę samą zasadę głębokości, bez rozciągania hierarchii podczas ruchu.

To gotowe materiały do oceny oraz integracji. Nie zmieniano repozytorium gry, AI, rozstawiania potworów, kolizji ani naliczania obrażeń. Efekty magii i faktyczne przywołanie bloba należą do gry.

## Sylwetki

| Postać | Trójkąty | Co ją wyróżnia |
|---|---:|---|
| Wodnik | 1342 | Kapelusz z trzciną, roślinny zarost, mokra zieleń stroju, laska z wodnym akcentem. Własna sylwetka i czar, bez wyglądu zombiaka. |
| Wodny blob | 180 | Jedna prosta wodna bryła, oczy i jasny refleks. Faluje, podskakuje i zgniata się; bez nóg i ludzkiego szkieletu. |
| Driada | 1470 | Jasnozielona twarz, korona liści, kora i liściasta spódnica. Gest kierowania magią z dłoni. |
| Herszt | 1426 | Masywniejszy goblin w hełmie i pancerzu, drewniana pałka z okuciem. Wolniejszy krok i mocne uderzenie w ziemię. |
| Warg | 760 | Większa, cięższa odmiana psowatego: szersza głowa, ciemna sierść i duże kły. Zachowana anatomia zaakceptowanego wilka. |
| Mosiężny Kozioł | 1442 | Dwunożny mechaniczny boss zgodny z rysunkiem z zamówienia: zakręcone rogi, mosiężny korpus, przeguby i dzielone kopyta. |

Łącznie nowa partia ma **6620 trójkątów**. To budżet geometrii, nie wynik pomiaru FPS. Sztywne części nadal oznaczają wiele wywołań rysowania; wydajność populacji trzeba mierzyć w grze.

Wodnik, Driada, Herszt i Kozioł korzystają ze wspólnej bazy stawów humanoidalnych z dopasowanymi bryłami. Warg ma rodzinę `quadruped_canid_v2`, a blob — `amorphous_rigid_v1`. Mosiężny Kozioł ma mechaniczny charakter ruchu i rodzinę `mechanical_humanoid_v1`.

## Co otworzyć

- `44_ruchome_3d/partia3_potwory.png` — sylwetki, przód, bok i tył w jednej skali świata.
- `44_ruchome_3d/partia3_ruch.gif` — ruch i pełny obrót, układ 2×3.
- `44_ruchome_3d/partia3_ataki.gif` — magia Wodnika, atak bloba, magia Driady, pałka Herszta, skok Warga i szarża Kozła.
- `44_ruchome_3d/podglad_44.html` — wszystkie dwanaście modeli i Strażnik; nowa partia jest układana w siatkę. Na wąskim ekranie domyślnie pokazuje jednego Wodnika.
- `44_ruchome_3d/modele/` — nowe pliki `wodnik.glb`, `wodny_blob.glb`, `driada.glb`, `herszt.glb`, `warg.glb`, `mosiezny_koziol.glb`.
- `44_ruchome_3d/partia3_manifest.json` — parametry partii; `manifest.json` obejmuje wszystkie modele.

Blob pozostaje mały także na planszy porównawczej: nie powiększono go sztucznie do wysokości człowieka. Podgląd grupowy ma maksymalnie trzy kolumny i kolejne wiersze, aby nie tworzyć jednego bardzo szerokiego bufora obrazu.

## Klipy

| Model | Klipy / długości |
|---|---|
| Wodnik | `idle` 2,80 s; `walk` 1,10 s; `attack` 1,20 s; `hit` 0,30 s; `death` 1,25 s; `cast` 1,50 s |
| Wodny blob | `idle` 2,20 s; `walk` 0,72 s; `wobble` 0,72 s; `attack` 1,10 s; `hit` 0,30 s; `death` 1,00 s |
| Driada | `idle` 2,40 s; `walk` 1,05 s; `attack` 1,20 s; `hit` 0,30 s; `death` 1,25 s; `cast` 1,60 s |
| Herszt | `idle` 2,40 s; `walk` 1,10 s; `attack` 1,40 s; `hit` 0,30 s; `death` 1,25 s; `slam` 1,65 s |
| Warg | `idle` 2,40 s; `walk` 1,05 s; `attack` 1,05 s; `bite` 1,05 s; `lunge` 1,25 s; `pounce` 1,25 s; `hit` 0,26 s; `death` 1,25 s |
| Mosiężny Kozioł | `idle` 2,40 s; `walk` 1,15 s; `attack` 1,40 s; `horns` 1,40 s; `charge` 1,50 s; `stomp` 1,35 s; `hit` 0,30 s; `death` 1,25 s |

`idle`, `walk` i `wobble` są pętlami; pozostałe akcje odtwarzać jednorazowo. Aliasy są świadome: blob ma ten sam ruch w `walk` i `wobble`; Warg ma `attack` = `bite` i `lunge` = `pounce`; Kozioł ma `attack` = `horns`. Ugryzienie Warga i jego skok to dwa różne ruchy.

## Zdarzenia i ruch po ziemi

| Akcja | Koniec przygotowania | Trafienie / emisja | Przesunięcie do przodu z klipu |
|---|---:|---:|---:|
| Wodnik, zwykły atak | 0,44 s | 0,60 s | brak |
| Wodnik, `cast` | gest w klipie | 0,76 s | brak |
| Blob, `attack` | 0,42 s | 0,60 s | brak; ma krótki ruch wizualny bryły |
| Driada, zwykły atak | 0,44 s | 0,65 s | brak |
| Driada, `cast` | gest w klipie | 0,76 s | brak |
| Herszt, `attack` | 0,60 s | 0,82 s | brak |
| Herszt, `slam` | 0,58 s | 0,82 s | brak |
| Warg, `bite` / `attack` | 0,32 s | 0,56 s | brak |
| Warg, `pounce` / `lunge` | wybicie 0,50 s | 0,70 s; lądowanie 0,90 s | **0,5192 jednostki po +Z** |
| Kozioł, `horns` / `attack` | 0,55 s | 0,78 s | brak |
| Kozioł, `charge` | 0,45 s | 0,94 s | **0,72 jednostki po +Z** |
| Kozioł, `stomp` | 0,48 s | 0,70 s | brak |

Zdarzenia są zapisane też w `extras` GLB. Animacja nie nalicza obrażeń i nie zatwierdza celu. Przy skoku lub szarży ruch korzenia trzeba odczytać i przepuścić przez kolizje, a następnie zużyć dokładnie raz. Nie dodawać równocześnie drugiego doskoku z kodu AI. Po zakończeniu zachować nową pozycję aktora przed przejściem do następnego klipu.

Jeśli to logika gry ma wyznaczać cały tor, należy usunąć/zużyć poziomy ruch wizualnego korzenia i prowadzić aktora własną, zgodną z kolizjami ścieżką. Pionowa prezentacja skoku może pozostać w modelu. Wartości w tabeli są jednostkami modelu, nie metrami rzeczywistej mapy.

## Punkty emisji i rekwizyty

- Wodnik: `Water_focus` to laska przy prawej dłoni; `WaterOrigin` wskazuje koniec laski. `WaterOrb` pojawia się tylko podczas czaru. Gra przy zdarzeniu tworzy `wodny_blob` lub własny efekt — przywołana postać nie jest wypalona w animacji Wodnika.
- Driada: `VineOrigin` jest punktem przy dłoni, `Vine_focus` sygnalizuje gest. Pnącza, ich trasa, obszar i obrażenia są efektami/logiką gry.
- Herszt: `Club` jest dzieckiem `R_at_hand_grip`; `SlamOrigin` leży przy końcu pałki. Nie ma pożyczonego żołędzia ani klipu `throw`.
- Warg: pysk ma `Mouth`; źródła kłów i bryła szczęki są stałą geometrią. Nie ma broni w powietrzu przed postacią.
- Kozioł: `HornOrigin` jest punktem przy rogach. Ręce mają wspólne nazwy chwytów, ale w tej dostawie Kozioł walczy rogami, szarżą i kopytem.

Stałe bryły pozostają nieprzezroczyste. Wodna masa bloba korzysta z palety i jasnego refleksu, zamiast kosztownych nakładanych warstw przezroczystości. Płomienie, mgła, pnącza, rozpryski i fale ataków mogą nadal być efektami 2D/cząstkami świata.

## Osadzenie na ziemi i skala

Zmiana bryły po wypaleniu bazowych animacji może zmienić punkt kontaktu przy upadku: np. kapelusz i laska Wodnika mają inne granice niż włosy bandyty. Dlatego nowa partia ponownie wyznacza pozycję względem ziemi po przebudowie geometrii. Zachowuje przy tym zamierzony wznios podczas lotu, zamiast kasować skok przy wyrównywaniu modelu do podłoża.

Warg jest szerszy i większy od wilka, lecz korzysta z tej samej anatomii łap. Herszt jest cięższy od chochlika. Warianty „Wielki chochlik” i „Wielki herszt” mogą używać istniejących modeli ze skalą gry; wymagają osobnego dopasowania kolizji i balansu. Nie dodano osobnych zduplikowanych GLB.

Format: kolory wierzchołków, normalne, `KHR_materials_unlit`, +Y w górę, przód +Z, sztywne części i animacje TRS. Czar oraz deformacja bloba wykorzystują skalę. Obrys dodaje renderer. Materiał unlit sam nie reaguje na lampy.

## Kontrola i ograniczenia

Sprawdzane są geometria, normalne, wszystkie klipy, domknięcie pętli i położenie nad ziemią. Osobne sprawdzenia obejmują: niezmienność sześciu zatwierdzonych GLB, ukryte/aktywne akcenty magii, falowanie i spłaszczenie bloba, powiązanie pałki z dłonią, skok Warga, monotoniczny ruch szarży i podniesienie oraz lądowanie kopyta.

Podglądy renderuje się z wyeksportowanych GLB. Weryfikowany jest też odczyt animacji JavaScript/Python oraz przebieg podglądu z zastępczym WebGL. To nie jest rzeczywisty test GPU, test na fizycznym telefonie ani wynik oficjalnego walidatora Khronos. Wdrożenie, pomiar FPS i próba w silniku gry pozostają do wykonania. Wyniki znajdują się w `kontrola_modeli.json`.

## Stan listy z zamówienia 44

Dostarczono dwanaście podstawowych typów potworów B1. Pojedynkowicz ma korzystać z bazy mieszkańca, więc przechodzi razem z mieszkańcami do następnej części. Kolejne etapy: mieszkańcy i pies, imienne NPC i Mechaniczny Gladiator, pojazdy oraz smoki. Nowa partia G005 pozostaje do oceny; wcześniejsza szóstka jest zaakceptowana.

## Połączenie z nowszą paczką

Aktualizację oparto na odczytanej bieżącej wersji 4 paczki. Zachowano modele i podglądy poprawione w G005, plik `kontrola_objetosci.json`, planszę `partia2_profil_porownanie.png` i odpowiedź `44-G005_pelniejsze_bryly.md`. Nowa partia dostała osobny numer **44-G006**. Źródło fabryki zachowuje głębokość poprzednich modeli jako ustawienie domyślne; sześć nowych modeli dołączono po ponownej walidacji.
