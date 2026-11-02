# Raport zgodności — 1 listopada 2026

**Stan: implementacja laboratoryjna; odbiór wizualny i pomiar Androida pozostają otwarte.** Nie wykonano publikacji ani wydania produkcyjnego.

Wykonano `npm run build`, sprawdzenie TypeScript, 13 testów architektury oraz oględziny programowo renderowanego arkusza brył i atlasu dekoracji. Dane pomiarowe: [artifacts/unit-results.json](artifacts/unit-results.json). Podgląd techniczny: [artifacts/preview.html](artifacts/preview.html). Te obrazy **nie są zrzutami gry**.

**Aktualna decyzja właściciela:** źródłowe 1–3 kondygnacje dają jedną w grze, 4–6 dają dwie, powyżej 6 daje trzy. Każdy poziom ma duże okna, otwór drzwiowy pozostaje o 12% wyższy i szerszy od postaci. Test obejmuje progi 3/4 i 6/7 oraz źródłowe 11/99; wysokość już przeliczonych dwóch/trzech poziomów nie jest kompresowana drugi raz. Szeroki parter pozostaje niski. Sprawdzono większą postać i drzwi w dalekim LOD. [Porównanie wysokości z ludzikiem](artifacts/height-comparison.png). [Podział KUL i osiedla](massing/README.md) jest już w lokalnym generatorze gry: 4 skrzydła KUL, 2–4 na Dziewanny, 7 na Szczytowej, z niskimi płaskimi łącznikami. [Podglądy generatora](artifacts/massing/index.html) nie są zrzutami sceny. Przy skali 2.0 wskazane przykłady są odrzucane przez kontrolę ulic; problem rozmieszczenia pozostaje otwarty.

| Kryterium | Wynik | Wniosek |
|---|---|---|
| Dom większy od drzewa, czytelne fasady przy 1080 px | Częściowo | Skala 2 i 1,5 jest dostępna; wysokość kondygnacji dopasowana do postaci, kompresja 1–3 / 4–6 / >6 → 1 / 2 / 3. Brak odbioru pełnego kadru w przeglądarce. |
| Co najmniej trzy kąty na ekranie | Częściowo | Rasteryzator sprawdzony dla 0°, 22,5°, 67,5°; próbki Lublina mają liczne orientacje. Nie potwierdzono pojedynczego kadru gry. |
| Proste połacie, bez poszarpanych dachów OSM | Test geometrii zaliczony | Prostokątne skrzydła, płaskie trójkąty, odrębne modele dachów; obejrzano arkusz techniczny. |
| Zero kolorów budynków spoza palety | Test rasteryzatora zaliczony | 16 kolorów źródłowych, indeksowane materiały; wszystkie nieprzezroczyste piksele testowanych dachów i kątów należą do palety. WebGL nieodebrany. |
| Zero kolizji budynek–droga i budynek–budynek | Test geometrii zaliczony | Audyt czterech dzielnic Lublina uwzględnia powiększone podstawy, okapy i rysowaną szerokość dróg. Brak testu nieograniczonego streamingu. |
| Brak migotania podczas ruchu | Niepotwierdzony | Natywne targety, nearest-neighbor i kwantyzacja przesunięcia są podłączone; nie uruchomiono testu ruchu w Chromium. |
| Co najmniej cztery style na trasie Lublina | Test klasyfikacji zaliczony | Próbki obejmują wszystkie wymagane rodziny, w tym bloki i przemysł. Przejazd przez scenę i zrzuty nie zostały wykonane. |
| Ten sam wygląd po przeładowaniu | Test danych zaliczony | Identyczne plany po zmianie kolejności źródeł i sklonowaniu wejścia; sprawdzono również odwrócenie kierunku ulicy. Nie jest to jeszcze przeglądarkowy test cache. |
| Bergen, Sewilla, Kioto bez zmian kodu | Częściowo | Granice Natural Earth i konfiguracje wybierają odpowiednie regiony; rzeczywiste kadry i zagraniczne obrysy nie były sprawdzone. |
| Przyroda i drogi pikselowo identyczne | Test fragmentu zaliczony | Te same piksele, drzewa i rury we fragmencie bez rysunku budynków, także przy obecności źródłowego budynku poza kadrem. Brak porównania zrzutów pełnej sceny. |
| Kontur 1 px i zasłanianie | Częściowo | Jeden piksel natywnego targetu; ID/głębia wewnątrz obrazu budynku, pomiędzy obiektami sortowanie Phasera. Nie jest to globalny pass ID/głębi całej sceny. |
| Dekoracje i limit 30% wystawania | Częściowo | 7 rodzin po 3 warianty, animacje i kotwice dostarczone; docelowe zasłanianie i limit dla wszystkich kątów wymagają odbioru gry. |
| 60 FPS na Galaxy A54, pierwszy kadr <3 s | Niepotwierdzony | Brak fizycznego telefonu i pomiaru gotowej sceny. Czasy planowania w kontenerze nie są FPS ani czasem pierwszego kadru. |

## Zrzuty przed/po

Nie wykonano zrzutów gry. Chromium kończy uruchamianie komunikatem `setsockopt: Operation not permitted`; podgląd Vite również nie mógł otworzyć portu. Próby uruchomienia z dodatkowymi uprawnieniami mimo zgody właściciela nie zwróciły wyniku. Nie oznaczono tych testów jako zaliczone i nie podstawiono arkusza brył w miejsce zrzutów.

Gotowy skrypt `npm run test:architecture:browser` zapisuje kadry przed/po czterech dzielnic Lublina, trzech lokalizacji zagranicznych oraz widok telefonu i wyniki JSON. Używa gotowej kompilacji, bez potrzeby otwierania portu lokalnego serwera. Wymaga działającego Chromium/Playwright i dostępu do istniejącej mapy świata.

## Różnice względem pełnej specyfikacji

- Three.js w workerze rasteryzujący i buforujący pojedyncze budynki zastępuje planowany własny RenderNode Phasera. Phaser otrzymuje gotowe obrazy i zachowuje sortowanie istniejących obiektów. Nie ma InstancedMesh ani zbiorczego renderowania geometrii całego chunku.
- Kontur jest liczony w natywnej rozdzielczości obrazu budynku; nie wdrożono globalnego bufora ID/depth wszystkich budynków i dekoracji ani obrysu jednego fizycznego piksela wyświetlacza przy dowolnym zoomie.
- Zwykła gra i jej zapisane miejsca nie zostały przeniesione na nowe obrysy. W laboratorium działa adapter kolizji i generowane położenie drzwi; integracja misji oraz pełnej mgły widoczności należy do przyszłego wdrożenia gry.
- Obecny lokalny wyciąg Lublina wymaga 149 717 ID zastępczych geometrii. Odzyskanie ID OSM nastąpi dopiero po ponownym wykonaniu istniejącego workflow pobierania danych. Nie uruchamiano go z tej sesji.
- Rezerwacja miejsc jest zachowawcza, więc może usuwać więcej domów niż optymalny układ. Pokrycie i czytelność Starego Miasta trzeba ocenić na zrzutach przed dopuszczeniem nowej warstwy do zwykłej gry.
