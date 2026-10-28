# Pierwsza służba — wdrożenie

Stan: kod wdrożenia przygotowany i sprawdzony lokalnie. Właściciel wyraźnie zatwierdził publikację całego wdrożenia do pgaszczyk-ctrl/erpeg i uruchomienie na serwerze testowym (27.10.2026). Publikacja TEST zakończona; wyniki poniżej.

27.10.2026. Scenariusz: PR #21, modele: PR #23. Ten dokument opisuje kod; PROLOG_REKRUTA.md pozostaje źródłowym projektem.

## Raz na postać, niezależnie od miasta

Stały identyfikator: `prolog.recruit.v1`. Stan jest częścią istniejącego zapisu fabuły: `save.story.prolog`. Równolegle `save.missions['prolog.recruit.v1']` przechowuje `active` / `done`. Nie ma identyfikatora miasta ani numeru sesji w kluczu misji.

Nowa postać jest rozpoznawana wyłącznie po udanym normalnym `create_character` w tej sesji klienta. Klient zapisuje stan przed wpuszczeniem do gry. EXP ani metry nie służą do uznawania starej postaci za nową. Dotychczasowa postać może świadomie rozpocząć szkolenie przy drzwiach policji: **Rozpocznij pierwszą służbę**. QR demo zachowuje osobny przebieg.

Rozmowa z szefem straży w innym mieście nie tworzy drugiej kopii: aktywne zadanie wskazuje startowe miasto, ukończone nie wraca do ofert. Zmiana skinu ani profesji nie zeruje flagi. W tym wdrożeniu zakończenie prologu pozostawia bohatera w służbie; odejście i kolejna linia straży pozostają osobnym zakresem.

## Grywalny ciąg

Instruktor → list i potwierdzenie → ratunek łucznika → stary łuk i 20 strzał, opcjonalna próba → raport → mały loch → pierwsza komnata → różdżka i kapelusz → opcjonalna próba magii, odzyskanie misia → raport → bibliotekarz.

Dialogi i nowe instrukcje są PL/EN; humor ma metadane. Prolog zastępuje prowadzenie do gazeciarza dla uczestniczącej postaci; historia cienia smoka czeka do końca szkolenia. Jeden cel jest pokazywany w HUD-zie i dzienniku.

## Miejsca i loch

Ograniczone dogranie 520 m mapy; lokalne wyszukiwanie przechodniego gruntu w promieniu 480 m, z kontrolą odcinków i gabarytów bohatera. Preferowane prawdziwe miejsca: policja, urząd, biblioteka oraz dostępne wejście do lochu. Fallbacki są jawne: punkt straży, dyżur bibliotekarza i piwnica patrolowa. Nie udają prawdziwych POI. Kotwice geograficzne zapisują się raz, z nazwą i miastem pochodzenia.

Loch używa istniejących `planLochu`, `mapaLochu`, `LochWnetrze` i `StworAI`. Wariant `loch:prolog:...` ma cztery połączone komnaty, bez bossa; jest osobną instancją bohatera, różną od zwykłego lochu odwiedzonego wcześniej. Pokonane potwory i miś są zapisane poza pamięcią sesji. Po reloadzie wracamy przy wejściu; po ponownym zejściu nie odradzają się rozliczone grupy. Zwykła skrzynia nie może przyznać nagród zamiast fabularnego misia. Porażka nadal korzysta z istniejącego powrotu przez szpital.

## Nagrody i sprzęt

Zapis obejmuje etap, list/potwierdzenie/misia, sprzęt, amunicję i listę odebranych nagród. Dwie śmierci w jednej klatce są wspólnie dopisywane do potwierdzonego checkpointu. Podczas oczekiwania nie przechodzimy do kolejnej interakcji. Błąd zapisu wyświetla ponowienie bez ponownego rozdania przedmiotów.

Podstawowe przedmioty szkoleniowe mają cenę 0 (katalog wyklucza je ze sprzedaży sklepowej). Bezstratna zamiana zachowuje poprzednią broń i nakrycie głowy, także kijek. Pełny plecak kieruje rzeczy do trwałego depozytu `pendingRewards`; przycisk odbioru jest przy nagłówku plecaka w Kufrze. Magia (`gear.magic`) odblokowuje się już przy komplecie, biblioteka nie żąda ponownej zapłaty.

Model m/f zachowuje korpus munduru. Łuk/różdżka podmieniają grupę Weapon i animację ataku; kapelusz używa głowy odpowiedniego maga z tej samej twarzy i włosów co strażnik. Głowa ma płaski materiał, postać nie dostaje brody. Atak dystansowy uruchamia animację, a nogi nadal chodzą w marszu. NPC używają dotychczasowego modularnego renderera sprite'ów; przebudowa wszystkich NPC i potworów na 3D jest osobnym zadaniem.

## Kontrola

- `VITE_TEST=1 npm run build`: pełne mapy, TypeScript i Vite — przechodzi.
- `npm run test:prolog`: globalna jednorazowość, zapis/odczyt, nagrody, pełny plecak/depozyt, przeszkody i objazdy, dwa miasta, 100 połączonych małych lochów.
- `node scripts/tests/lochy-plan.mjs`: 600 zwykłych planów, bez regresji.
- `npm run test:quests`: istniejące zadania, warianty i zapis.
- `scripts/tests/prolog-real-maps.ts` po bundlowaniu rolldown: plan na danych Lublina i Puław; wszystkie sześć miejsc na przechodnim gruncie, odpowiednio około 833 i 600 m obowiązkowego chodzenia w tych próbach.
- `scripts/tests/browser-prolog.mjs`: pełen ciąg w prawdziwej grze i z prawdziwymi modelami, ponowne logowania, błąd zapisu i ponowienie, pełny plecak, łuk, magia i zachowany korpus munduru, utrwalony loch, drugie miasto w trakcie i po ukończeniu, stara postać. RPC i dwie mapy są kontrolowanymi atrapami; pokonania testowe przechodzą przez hit/onEnemyKilled. Zrzuty w `work/prolog/`. Kontrola na komputerze PL i emulowanym telefonie EN; CI dodatkowo obejmuje pozostałe kombinacje.

Nie wykonywano zapisów prawdziwych graczy ani testu na fizycznym telefonie. Nie zmieniono SQL/RLS. Nie zmieniamy produkcyjnego pinu, wersji ani plików produkcyjnych w ramach tego zadania. Publikacja dotyczy gałęzi i serwera testowego; wydanie produkcyjne wymaga osobnego zlecenia.

## Końcowy wynik publikacji (uzupełnienie 28.10.2026)

Scalono [PR #28](https://github.com/pgaszczyk-ctrl/erpeg/pull/28) jako 575c51a2b167b1b9183980d61fa6710ceaeb9fab, po integracji wydania 1.035. Zdalne drzewo implementacji jest identyczne z lokalnie sprawdzonym d7d40b665e0129993731334bb480a69f0693a322.

- [Prolog CI](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/40588238397): sukces wszystkich czterech wariantów PL/EN × PC/emulowany telefon.
- [City quest checks](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/40588238252): sukces pełnego buildu map, reguł i regresji przeglądarkowej istniejących questów.
- [Publikacja](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/40588986778): success, w tym oba buildy i publish.
- Publiczny odczyt po publikacji: /test/version.json = 575c51a 2026-10-27 21:53; main-BfpER3NI.js (SHA256 df1332d72a72792e51570b931814531fdf16870d8c9c1de3253687cd0a62d113) zawiera prolog.recruit.v1. Wszystkie sześć opublikowanych GLB jest bajtowo zgodne ze sprawdzonymi plikami. Produkcja nadal z niezmienionego pinu 01c06c9, bez prologu.
- Dodatkowa próba pełnego przejścia bezpośrednio na domenie nie ma potwierdzonego wyniku: środowisko przeglądarki wymagało obsługi certyfikatu pośrednika, następnie utracono lokalne środowisko. Nie zastępuje to ani nie unieważnia zakończonych testów lokalnych/CI; nie deklarujemy przejścia na domenie ani fizycznym telefonie.
- Stary [Hela production release check](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/40588238323) nie przeszedł przygotowania produkcji: cp zakłada istnienie produkcja/*.patch usuniętych przy pełnym wydaniu. Błąd przed uruchomieniem gry; odczyt katalogu przeszedł. Ten niezależny workflow i pin nie zostały zmienione.

Wdrożenie TEST zakończone. Dokumentacyjne uzupełnienie [skip ci] nie zmienia gry ani ponownie jej nie publikuje.

## 28.10.2026 — prowadzenie starszej postaci do posterunku

Po zalogowaniu postać bez stanu prologu i bez globalnego znacznika dostaje cel „Skąd mam ten uniform? Nic nie pamiętam. Muszę się dowiedzieć. Porozmawiaj z szefem straży na posterunku.” (PL/EN). Złota strzałka wskazuje najbliższe drzwi `police` według odległości na bieżącej mapie. Nie wybiera urzędu ani pierwszego posterunku z listy. Dla map kafelkowych korzysta z indeksu miejsc; dla świata cel aktualizuje się wraz z dogrywaniem miejsc. Bez znanego posterunku cel pozostaje w dzienniku bez fałszywej strzałki; pod ziemią nie pokazuje celu z powierzchni.

Wskazówka ma oddzielny identyfikator `prolog.recruit.v1:lead`. Nie zapisuje startu misji ani nagród, nie zabiera limitu zadań i nie ukrywa wcześniejszych zleceń. Stary samouczek gazeciarza nie konkuruje z tym prowadzeniem. Po przyjęciu pierwszej służby wskazówkę zastępuje prolog; rozpoczęty, ukończony lub zachowany sam globalny znacznik wyklucza powrót zaproszenia po logowaniu i w innym mieście.

Sprawdzenie tej zmiany: rozszerzony browser-prolog obejmuje wybór najbliższego z dwóch posterunków mimo bliższego urzędu, widoczną strzałkę, dziennik, brak automatycznego startu, wznowienie wskazówki po logowaniu, zachowanie starszej historii, limit misji, przyjęcie u wskazanego szefa i brak wskazówki przy globalnym ukończeniu. Wyniki oraz publikacja: dziennik przekazania.

Wynik: wdrożone na TEST przez PR30 (7e44653). Lokalny pełny build i przebiegi PC PL/emulowany telefon EN przeszły, podobnie wszystkie 4 warianty CI prologu40648158201 oraz regresja istniejących questów40648158223. Publikacja40648727489 success. Publiczny odczyt potwierdził nowy build7e44653 i tekst celu o uniformie w main-Dlh39kIV.js. Produkcja pozostaje z dotychczasowego pinu/łatek1.036, bez tej wskazówki. Testy gry używały atrap RPC; fizycznego telefonu i zapisów prawdziwego gracza nie sprawdzano.
