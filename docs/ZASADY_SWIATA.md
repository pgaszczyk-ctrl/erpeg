# Jeden świat niezależnie od sposobu przybycia

Reguły z 3 listopada 2026. Podróż ustala miejsce przybycia, a nie tworzy własnej wersji miasta.

## Tożsamość miejsca

1. Wejściem są szerokość i długość geograficzna. Nie używamy imienia gracza, czasu logowania, rodzaju pojazdu ani miejsca rozpoczęcia podróży do wyboru mapy.
2. `getSurfaceMap` wybiera jednego właściciela punktu: obszar przygotowanego Lublina, następnie przygotowane obszary regionu w stałej kolejności identyfikatorów, następnie siatkę świata. Obszar sprawdzamy w rzeczywistej granicy mapy; sam prostokąt z katalogu służy do szybkiego odrzucania kandydatów.
3. Siatka świata ma sektory 0,1 stopnia. Początek sektora zależy wyłącznie od położenia; przedziały są lewostronnie domknięte. Warszawskie punkty startu postaci testowej, dworca i armaty nie ustalają już osobnych początków mapy.
4. Armata, kulociąg, pociąg, woźnica, prom, podróż za diamenty, wejście pieszo, testowy sen, powrót z lochu, powrót po porażce i wczytanie zapisu przechodzą przez ten sam wybór geograficzny. Przy przejściu pieszo zmiana sektora zachodzi na stałej granicy, również poza Lublinem.
5. Jeden właściciel oznacza jeden obiekt mapy w pamięci i jeden klucz odkrytego terenu. Równoległe żądania przygotowanej mapy współdzielą również jej wczytywanie.

## Dane i generowanie

- Duże archiwum OSM/Protomaps pozostaje w istniejącym magazynie Cloudflare R2. Gra pobiera potrzebne fragmenty, bez kopiowania całego świata do GitHuba.
- Wersja archiwum jest przypięta w `src/map/worldRules.ts`: `world-20261103.pmtiles`. Zmiana zewnętrznego `world.json` nie przestawia już kolejnych graczy na inne dane w trakcie działania tej samej wersji gry. Nie usuwać przypiętego archiwum przy publikowaniu następnego.
- Przygotowane dane Lublina i regionu pozostają wspólnymi danymi geograficznymi. Powstające z nich `public/map/` jest ignorowane przez Git. Katalog regionów zawiera teraz ich granice wyszukiwania. Brak lub nieaktualny katalog jest błędem wczytywania; nie uruchamia innego źródła jako cichego zastępstwa.
- Zwykłe domy, nawierzchnie i ozdoby nadal rysuje wspólny renderer i istniejące generatory. Kolejność zwracanych dróg, obszarów i budynków jest uporządkowana po stabilnym identyfikatorze, a wybór kolidującego budynku nie zależy od kolejności odpowiedzi sieciowych. Ponowne wczytanie budynku nie przypisuje jego adresu do ostatniego innego budynku.
- Ta zmiana ujednolica wybór, współrzędne i odtwarzanie świata. Nie zastępuje dwóch istniejących importerów geometrii jednym importerem: Lublin/region korzystają z przygotowanego ekstraktu OSM, pozostały świat z Protomaps. Źródło dla danego punktu jest jednak zawsze takie samo, niezależnie od gracza i podróży. Ewentualne późniejsze zastąpienie ekstraktu Lublina Protomaps wymaga osobnego przeniesienia adresów, obrysów i ręcznych dekoracji.

## Wyjątki autorskie i postęp gracza

- Ręcznie ustawione zabytki (`ZABYTKI`), Targi z rzeźbami, mozaiki oraz elementy questów pozostają na obecnych współrzędnych i w istniejących warstwach. Podróż nie zastępuje ich zwykłym domem. Nie zmieniamy ich plików, skali ani reguł przykrywania.
- Stare pozycje najpierw odczytujemy w ich dawnym układzie, przeliczamy na położenie geograficzne, a dopiero potem na układ wspólnej mapy. Obejmuje to hotel, ostatnią pozycję, wznowienie po aktualizacji, niezakończoną sesję wraz z przeciwnikami oraz potwierdzenia lotu. Nie wolno przypisać starego `x/y` do nowego początku mapy.
- Przyjęte scenariusze i prolog zachowują swoje instancje, decyzje, nagrody i identyfikatory lochów. Kotwice geograficzne pozwalają kontynuować zadanie na obu stronach granicy sektora. Migrowane zwykłe zlecenia otrzymują również geograficzne miejsce zleceniodawcy na wypadek zmiany identyfikatora drzwi.
- Odkrywanie terenu nadal jest indywidualne. Przejazd w obrębie tej samej mapy i powrót pieszo przywracają ten sam zapis mgły. Historyczna mgła zapisana pod innym początkiem mapy nie jest bezpośrednio nakładana na nowy układ: część świata może wymagać ponownego odkrycia. Nie wykonujemy zbiorczego usuwania zapisów graczy ani migracji bazy danych.
- Losowanie przeciwników, zleceń i odrastanie zasobów nadal mają własne dotychczasowe reguły sesji. Nie wyznaczają geometrii świata.

## Sprawdzenie i publikacja

- `scripts/tests/world-identity.mjs`: rzeczywiste drogi i budynki Warszawy, różne stare początki, niezależny drugi gracz, powtórne fragmenty, Lublin i region, zachowanie pozycji i stanu questów, granica sektorów, brak cichego zastępowania źródła.
- `scripts/tests/browser-world-identity.mjs`: zbudowana gra z odizolowanym kontem, rzeczywiste próbki Krakowa i Lublina; stary zapis, przejazd miasta do tego samego miasta, przejście pieszo i powrót, odkryty teren oraz Targi po restarcie sceny. Komputer i telefon, zrzuty w ignorowanym `work/world-identity/`.
- Istniejący `browser-artillery.mjs` sprawdza lot, potwierdzenie, odzyskanie i anulowanie podróży, również na telefonie.
- Ta praca jest przeznaczona do TEST. Pin produkcji, wersja wydania i produkcyjne poprawki pozostają nietknięte.
