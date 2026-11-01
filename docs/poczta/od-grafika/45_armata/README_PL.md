# EXP-LORE — obrotowa armata C, wersja 1.0

Pierwsza uproszczona realizacja 3D wybranej koncepcji: granatowo-mosiężna lufa, zębata okrągła podstawa, czerwona lampa, drewniane schodki i jasna siatka na bocznym ramieniu. To faktyczny model GLB z animacjami, nie rysunek na płaszczyźnie. Model i podgląd są gotowe; nie wprowadzono zmian w repozytorium ani w działającej grze.

## Pliki

- `armata_C.glb` — model, materiały, nazwane węzły, punkty mocowania i cztery klipy; wszystko w jednym pliku, bez zewnętrznych tekstur.
- `podglad.html` — samodzielny podgląd offline, otwierany w przeglądarce. Pozwala obracać kamerę, wybierać kierunek celu oraz odtworzyć wystrzał i lądowanie. Zawiera oryginalnego strażnika wyłącznie jako odniesienie skali.
- `source/cannon-controller.mjs` — obrót do dowolnego punktu, odtwarzanie klipów oraz sygnał startu postaci.
- `source/build-cannon.mjs` — odtwarzalne, edytowalne źródło modelu.
- `source/preview.mjs`, `source/verify.mjs` — źródło podglądu i testy zachowania.
- `preview/` — obrazy faktycznie wyrenderowanego GLB, nie grafiki koncepcyjne.
- `metrics.json`, `validation.json` — parametry i raport walidacji glTF.

## Skala i styl

Źródłem skali jest `straznik_chibi_wzorzec.glb` z repozytorium `pgaszczyk-ctrl/erpeg`, gałąź `ccr-f1ea7088-mrjcnz`, katalog `docs/poczta/od-grafika/44_ruchomy_swiat_3d/referencja/`. Strażnik ma wysokość 1,25 jednostki. Krawędź wylotu armaty sięga około 5,1 jednostki nad ziemią (około 4,1 wysokości strażnika). Podstawa ma średnicę około 3,54, a całe stanowisko z rozłożoną siatką zajmuje około 6,58 × 4,01 jednostki. Szerokość otworu lufy to około 1,41, siatka ma około 2,1 × 2,2.

Zachowano kolory palety świata, uproszczone bryły i twarde krawędzie. Drobne nity i gęste sploty z ilustracji ograniczono pod kamerę gry. Model ma około 12,2 tys. trójkątów i waży około 1,2 MB. To uproszczona wersja przestrzenna koncepcji, a nie jej identyczna kopia ilustracyjna.

Podgląd gry używa kamery ortograficznej patrzącej około 60° w dół od poziomu (około 30° od pionu), zgodnie z uwagą właściciela o widocznych dachach. Ostatecznie w grze trzeba użyć dokładnie istniejącej kamery modeli postaci. Kąt podglądu jest przybliżeniem na podstawie zrzutu, nie pomiarem kamery gry.

## Klipy GLB

| Nazwa | Czas | Działanie |
|---|---:|---|
| `idle` | 1,0 s | Neutralna pozycja lufy; opcjonalna, kontroler nie musi jej zapętlać. |
| `fire` | 0,9 s | Odrzut 0,38 jednostki w osi lufy, krótki błysk, prosty przestrzenny obłok i powrót do pozycji początkowej. |
| `catch` | 1,2 s | Siatka ugina się w dół o 0,30 jednostki i sprężyście wraca. |
| `turn_demo_360` | 4,0 s | Demonstracja pełnego obrotu. Wyłącznie do inspekcji, nie do celowania w grze. |

Celowanie jest sterowane kodem: `TurretYaw` obraca się najkrótszą drogą do dowolnego kąta. Siatka, schodki i podstawa są nieruchome, obraca się wieża z lufą oraz lampą. Dzięki temu lądowisko nie krąży wokół armaty. Ruch siatki jest niezależny od obrotu i wystrzału.

## Przekazanie programiście

Nie przepuszczać modelu przez funkcję, która automatycznie wyrównuje każdy GLB do wysokości postaci. Armata ma zachować skalę około czterech strażników. Jeśli silnik skaluje modele, zastosować identyczny mnożnik świata do strażnika i armaty.

Osie: +Y do góry; w pozie zerowej lufa kieruje się ku +Z. W dołączonym kontrolerze +X oznacza prawo na mapie, +Z dół na mapie. Dlatego dla różnicy współrzędnych celu `dx, dy` kąt wynosi `atan2(dx, dy)`. Jeżeli istniejący renderer inaczej odwzorowuje osie, należy przekształcić je przed wywołaniem `aimTo`, zamiast zmieniać globalną kamerę gry.

Sekwencja docelowa: po akceptacji podróży przez serwer zablokować sterowanie; przywrócić wieżę do pozycji wejścia (`home`); doprowadzić gracza przez `EntrySocket` i `LoadingSocket`; przenieść oryginalny model postaci do `PassengerSocket` wewnątrz lufy; obrócić do celu; uruchomić `fire`. Postać faktycznie opuszcza lufę w callbacku `onLaunch` po 0,12 s od początku klipu. Po doleceniu uruchomić `catch` przy celu, przyczepić postać do `LandingSocket`, a po ustaniu kołysania przenieść na bezpieczną pozycję wyjścia. Współrzędne `ExitSocket` są wskazówką wizualną, nie zastępują walidacji kolizji mapy i zatwierdzonego punktu przybycia.

```js
import { CannonController } from './cannon-controller.mjs';
const gltf = await loader.loadAsync('armata_C.glb');
const cannon = new CannonController(gltf, {
  onLaunch: ({ position, direction }) => {
    // Przenieś żywy model bohatera do sceny lotu; position/direction są światowe.
  },
});
scene.add(gltf.scene);
// Przez całą obecność stanowiska:
cannon.update(deltaSeconds);
// Po załadowaniu podróżnego:
cannon.aimTo(targetMapX - stationMapX, targetMapY - stationMapY);
// Dopiero gdy cannon.aim === null:
cannon.fire();
// Przy celu:
cannon.catch();
// Przy usunięciu stanowiska/sceny:
cannon.dispose();
```

`aimTo` oczekuje współrzędnych lokalnej płaszczyzny mapy, nie stopni geograficznych. Przy redukcji ruchu można podać czas obrotu 0 i uprościć prezentację wystrzału, zachowując jeden moment startu podróżnego. Klip `fire` nie zawiera toru lotu ani dźwięku; wizualny obłok jest prostą niskopoligonową animacją, którą można zastąpić istniejącym efektem gry.

Docelowo `src/artillery/client.ts` powinien zastąpić obecny rysunek Phaser obiektem korzystającym z tego GLB. Nie wolno zmieniać opłat, RPC, tokenów podróży ani warunków bezpiecznego przybycia przy samej wymianie grafiki. Same pliki modelu i kontrolera nie podłączają automatycznie animacji do obecnego klienta Phaser.

## Weryfikacja

- Khronos glTF Validator: zero błędów i zero ostrzeżeń.
- GLTFLoader ładuje GLB i wszystkie cztery klipy.
- Sprawdzone osiem kierunków, przejście 179° → −179° najkrótszą drogą, blokada ponownego strzału, jeden sygnał startu przy 0,12 s także po opóźnionej klatce, zachowanie kąta przy wystrzale i powrót siatki oraz lufy do spoczynku.
- Faktyczne renderowanie w Chromium/SwiftShader: pulpit 1440 × 1000 i telefon 390 × 844; podgląd działa również bez serwera przez plik HTML.
- Nie sprawdzano jeszcze wydajności ani kolizji stanowisk wewnątrz działającej gry; ten pakiet nie stanowi wdrożenia.

## Odtworzenie źródeł

Źródła wymagają Node i `three@0.186.1`. Z katalogu paczki: `npm install --ignore-scripts --no-audit --no-fund three@0.186.1`, potem `node source/build-cannon.mjs` i `node source/verify.mjs`. GLB jest samodzielny i nie wymaga tych zależności po wyeksportowaniu. Gotowy `podglad.html` zawiera również bibliotekę Three.js i model strażnika; otwarcie gotowego podglądu nie wymaga instalowania niczego.
