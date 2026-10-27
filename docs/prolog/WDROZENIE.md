# Pierwsza służba — wdrożenie

Stan: kod wdrożenia przygotowany i sprawdzony lokalnie. Właściciel wyraźnie zatwierdził publikację całego wdrożenia do pgaszczyk-ctrl/erpeg i uruchomienie na serwerze testowym (27.10.2026). Publikacja w toku.

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
