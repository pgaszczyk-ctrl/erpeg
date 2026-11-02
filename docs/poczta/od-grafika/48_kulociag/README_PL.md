# Kulociąg Parowy — 48-G001, wersja 1.0.0

Odpowiedź na 48-P001. Paczka do wdrożenia zaakceptowanej hali, trzech poziomych wyrzutni i animacji podróży. Nie jest to wdrożenie do repozytorium gry.

## Zacznij tutaj

1. Rozpakuj cały katalog i otwórz `preview.html` w przeglądarce. Wszystkie pliki są lokalne; nie ma zależności ani CDN. Jeśli przeglądarka blokuje lokalne obrazy, uruchom w tym katalogu `python3 -m http.server 8000` i otwórz `http://localhost:8000/preview.html`.
2. Pierwsze stanowisko wystrzeli pasażera, drugie pokaże odjazd i przyjazd. Przyciski pozwalają powtórzyć sekwencje. Odznaczenie „Stacja docelowa gotowa” zatrzymuje pierwszą sprężynę w napięciu.
3. `assets/manifest.json` podaje rozmiary, kotwice, położenia trzech stanowisk i kolejność warstw. Współrzędne odnoszą się do oryginalnego płótna 1672 × 941, początek w lewym górnym rogu. Wszystkie czasy w sekundach.
4. `src/kulociag.js` jest kodem Canvas 2D bez zależności. Można użyć go bezpośrednio lub przenieść model stanów i PNG do silnika gry. `tests/model.cjs` uruchamia się przez `node tests/model.cjs`.

## Co jest w paczce

- `assets/station/hala.png`: tło bez postaci i kul. Zachowuje zaakceptowane światło, meble, schody oraz puste miejsca na nazwę i mozaikę.
- `assets/rig/trough.png`: nieprzezroczysta nakładka na kanał mechanizmu. Przykrywa statyczną sprężynę w tle. Musi być narysowana przed klatkami ruchomymi na wszystkich trzech stanowiskach.
- `spring_0…4.png`, `pistons_0…4.png`: dwie osobne warstwy, wspólne płótna 128 × 224. Klatki 0–3: stopniowe ściskanie; 4: gwałtowne zwolnienie. Nie przycinać przezroczystych marginesów.
- Osobna tarcza manometru, wskazówka i schodki boczne.
- `assets/ball/`: pusta kula podzielona na tył, przód z obręczą, cztery odblaski, cień i otwartą klapę. Płótno 80 × 80; środkiem/kotwicą jest (40,40). W razie potrzeby można wyświetlać w skali 0,8, uzyskując 64 × 64. Zmienić wtedy także rozmiar postaci i położenie klapy.
- `assets/fx/`: osiem klatek pary i smuga wystrzału.
- `assets/station/foreground_bands.png`: nakładka obejm rur, rysowana po kulach. Zawiera fragmenty tła wokół obejm; przeznaczona do tej hali i tej kamery, a nie jako swobodny sprite rur.
- `reference/zaakceptowana_animacja_v2.mp4`: zaakceptowany wcześniejszy prototyp z zastępczymi postaciami.
- `reference/rekonstrukcja_z_warstw.mp4`: odtworzenie animacji z PNG i kodu tej paczki, bez pasażerów (renderer gry wstawi postacie).
- `reference/atlas_kontrolny.png`, zrzuty kontrolne i wynik walidacji.

## Mechanika

Kierunek wystrzału to (0,-1) — w górę obrazu, wzdłuż podłogi. To nie jest pionowa wyrzutnia. Kolejność od dołu: kotwa, sprężyna, tłok, kula, wolna rura. Siłowniki cofają tłok i ściskają sprężynę; kula pozostaje przed tłokiem.

Stanowiska: 0 = gracz; 1 i 2 = tło. Każde ma własny model i zegar; nie ma wspólnej blokady. W kodzie paczki nic nie uruchamia się automatycznie — harmonogram NPC jest tylko w `preview.html`.

Stany odjazdu: `board → compress → hold → release → recoil → empty`. Po 0,4 s zamykania i 1,35 s ściskania mechanizm czeka minimum 0,3 s. `hold` może trwać dowolnie długo, aż wywołasz `setReady(true)` po poprawnym wczytaniu miejsca docelowego. `cancel()` pozwala przerwać przed wystrzałem.

Kula od pierwszej chwili `release` porusza się ze stałą dużą prędkością 3800 px/s. Cały widoczny przelot trwa około 0,2 s. Nie dodawać ease-in. Odbicie sprężyny i para trwają po zniknięciu kuli. Prędkość odnosi się do płótna źródłowego; skalowanie widoku nie zmienia czasu.

Stany przyjazdu: `arrive → brake → settle → exit → idle`. Przyjazd 1,6 s, amortyzacja parą 0,8 s, powrót tłoka 0,9 s, wysiadanie 0,7 s. Obecna trasa jest prosta w obrębie rury; nie zawiera pełnej trasy między miastami ani odbijaczy.

## Wpięcie do gry

```js
const station = await new Kulociag.Station({
  assetRoot: '/swiat/kulociag/',
  onEvent(event) { /* koniec podróży, dźwięki, aktywacja postaci */ },
  drawPassenger(ctx, passenger, info) {
    // ctx ma już pozycję pasażera; narysuj aktualny wygląd postaci.
    // Gdy inside=true, callback jest przycięty do wnętrza kuli.
    // Punkt (0,0) odpowiada stopom; zmieść postać mniej więcej w 42 × 44 px.
  }
}).load();

station.lanes[0].depart(player, { ready: false });
// Gdy miejsce docelowe jest wczytane i zweryfikowane:
station.lanes[0].setReady(true);
// Pętla gry:
station.update(deltaSeconds);
station.draw(ctx, { width: viewWidth, height: viewHeight });
// Na stacji przyjazdu:
station.lanes[0].arrive(player);
```

Ruch pieszy do schodków, wybór celu i przeniesienie postaci należą do gry. Wywołaj `depart` po dotarciu postaci do bocznego wejścia. Podczas animacji ukryj jej zwykły model w hali; callback wstawia ją do kuli. Po zakończeniu `exit` przejmij postać rendererem świata przy punkcie `boarding` z manifestu. Kod nie modyfikuje konta, ekwipunku, świata ani bazy.

NPC i gazeciarz nie są wrysowani w tło ani w PNG kuli. Gra dodaje ich osobno. Callback w `preview.html` rysuje wyłącznie zastępczego pasażera do demonstracji.

Nazwę stacji wpisuje gra w `regions.wallSign`; mozaikę w `regions.floorMosaic`. Te regiony wskazują wolne wnętrze ram, nie ich zewnętrzny obrys. Dopasuj font i długość napisu. Nie rysować tekstów na stałe w tle.

## Granice oddania

Ta paczka obejmuje halę i ruchome warstwy wyrzutni, kuli oraz efektów. Grafika ulicznego wejścia ze spiralą, pełny powtarzalny tunel podróży i ozdoby regionalne nie są tu przedstawiane jako ukończone zasoby produkcyjne. Wcześniejsze koncepcje tych elementów nie zastępują osobnego eksportu.

Tło jest spłaszczoną ilustracją. Nakładki pozwalają ożywić mechanizmy i poprawnie zasłaniać kulę obejmami w ustalonej kamerze. Nie jest to zestaw brył 3D ani pełna dekompozycja całej architektury na edytowalne warstwy. PNG kuli i pary celowo używają częściowej przezroczystości.

Sprawdzono model stanów, blokadę gotowości, prędkość impulsu, niezależność od kroku czasowego, anulowanie, odczyt PNG i rekonstrukcję z warstw. Nie sprawdzono integracji w repo gry, kolizji, prawdziwego modelu gracza ani wydajności na fizycznym telefonie.
