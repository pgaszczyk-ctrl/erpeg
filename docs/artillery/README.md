# Miejska Artyleria Pasażerska — TEST

## Zakres uzgodniony 30.10.2026

Tylko duże miasta. Domyślny próg kwalifikacji to 100 000 mieszkańców w danych OSM; brak potwierdzonego dużego miasta oznacza brak sieci. Parametr jest konfigurowalny. Lublin: maksymalnie 10 stanowisk, docelowo 7 miejskich (2 centralne i 5 w pozostałych rejonach) oraz lotniska w Świdniku i Radawcu. Nie budujemy sieci w każdym osiedlu/wsi wyciągu regionalnego. Limit ma pierwszeństwo przed początkowym celem 90 sekund dojścia. Propozycja 441 stanowisk była błędem zakresu, została odrzucona przed aktywacją; żaden gracz nie miał jej odkryć.

Transport jest lokalny. Każdy rejestr jest osobną siecią; nie ma krawędzi pomiędzy miastami. Lotniska nie łączą się ze sobą. Maksymalne przyłączenie lotniska wynosi 22 km, najwyżej 2 kierunki. Miasto: najwyżej 4 kierunki, dwustronne połączenia, spójny szkielet i skróty zmniejszające liczbę przesiadek. Nie ma ukrytego przejazdu do dowolnego punktu ani ekranu listującego wszystkie cele. Mapa diagnostyczna potrafi wyświetlić trasę po rzeczywistych krawędziach.

## Architektura

- `src/artillery/network.ts`: czysty generator w metrach, graf pieszy z poziomami/mostami, bezpieczni kandydaci przy drogach, budżet miasta, dwa punkty centralne i pokrycie pozostałych dzielnic, ograniczony stopień i skróty.
- `scripts/artillery/build.mjs`: kompilator istniejącego wyciągu OSM, rozpoznaje duże miasto i lotniska. Nie pobiera miasta podczas logowania. Czyta GeoJSONSeq strumieniowo, również pliki większe niż limit pojedynczego tekstu Node.
- `public/artillery/index.json`: niewielki indeks regionów; klient pobiera raz tylko właściwy rejestr. Duże tła diagnostyczne nie trafiają do ścieżki logowania.
- `public/artillery/<id>.json`: utrwalone ID, pozycje, wersja, połączenia, pochodzenie i skróty SHA256 danych. Kolejna kompilacja zachowuje istniejące punkty, w tym wyłączone. Nie zmienia aktywnych pozycji na skutek odświeżenia mapy.
- `data/artillery-rules.json`, `data/artillery-<id>-rules.json`: parametry wspólne i budżet konkretnego miasta. To reguły, a nie ręczna lista pozycji.
- `data/artillery-<id>-overrides.json`: poprawki po ID, np. `{"ID":{"x":123,"y":456,"name":"Nowa nazwa","disabled":false}}`. Współrzędne w metrach projekcji rejestru. Korekta ma pierwszeństwo, nie zmienia ID, wyłączenie nie usuwa odkryć. Import SQL stosuje poprawki jawnie i zachowuje pozostałe pozycje.
- `artillery.html`: diagnostyka z punktami, krawędziami, nieobsłużoną zabudową i przyczynami odrzuceń; pan, zoom, wskazanie trasy, desktop/telefon.
- `src/artillery/client.ts`: wspólna interakcja E / AKCJA / kursor użycia, odkrywanie po podejściu, panel bezpośrednich kierunków, transakcja i odzyskiwanie podróży. Brak interakcji przez podwójny atak.
- `src/artillery/flight.ts`: osobna lekka scena chmur, obrót i zbliżenie aktualnego wizerunku GLB, spadochron, siatka i odbicie. Ładowanie mapy odbywa się pod osłoną; sterowanie wraca po przygotowaniu pierwszego widoku i potwierdzeniu transakcji. Ograniczenie animacji systemowe jest respektowane. Grafikę stanowiska rysuje kod; to prototyp, nie zamówiony nowy GLB.

## Uruchomienie i reprodukcja

Dane do walidacji zostały pobrane z Geofabrik (OSM). Narzędzie `extract.py` wymaga `osmium==4.3.2`, zachowuje identyfikatory OSM, bariery, ograniczenia dostępu, warstwy, terminale i pasy. Same nazwy lotnisk nie są regułami. Przed walidacją potrzebne są pasy/aprony i dojście lądowe; niepełny wyciąg oznacza jawny brak.

```sh
npm ci
npm run build
python scripts/artillery/extract.py <region.osm.pbf> <city.geojsonseq.gz> --bbox minLon,minLat,maxLon,maxLat
node --max-old-space-size=3200 scripts/artillery/build.mjs --id lublin --src <city.geojsonseq.gz> --bbox 22.32,51.15,22.78,51.33 --game-map .cache/lublin-full.json --complete
NODE_USE_ENV_PROXY=1 node scripts/artillery/validate-game-map.mjs
node scripts/artillery/seed.mjs lublin
```

`--game-map` dodaje rzeczywiste uproszczone budynki, wodę i szerokości jezdni gry do przeszkód generatora. `--new-proposal` jest tylko do świadomego odrzucenia NIEAKTYWOWANEJ propozycji. Nigdy nie używać do aktywnej sieci. Aktywna sieć przekraczająca zmniejszony budżet powoduje błąd wymagający jawnej migracji, zamiast kasowania ID. Ścieżki danych w `source.file` są informacją o pochodzeniu, nie URL-em pobieranym przez klienta.

Warszawa: wyciąg 20.75,52.05,21.3,52.45. Stambuł: 28.5,40.9,29.4,41.35. Są to jawne zakresy walidacyjne, nie deklaracja pokrycia całych obszarów metropolitalnych. Reguły rozmieszczenia są wspólne; limit Lublina jest konfiguracją miasta.

## Transakcja i baza

`docs/sql/artillery.sql` dodaje tabele z RLS bez polityk dostępu klienta i funkcje `ma_state`, `ma_discover`, `ma_begin`, `ma_settle`. Używa obecnego `_player_by_token`, nie zastępuje `save_game` ani polityk `players`. Sprawdzono rzeczywisty schemat Supabase przed przygotowaniem wdrożenia. Dostęp do podróży na serwerze ograniczono do obecnych postaci TEST: Arceus/Jam. Trigger ochronny uruchamia się tylko dla tych nazw.

Przed startem klient zapisuje bieżący postęp i heartbeat. `ma_begin` blokuje wiersz gracza, sprawdza trasę, odkrycia, odległość, walkę i walutę. Jedna transakcja zapisuje opłatę, docelową pozycję oraz paragon z nonce. Ponowienie tego samego nonce zwraca ten sam wynik; zmiana celu z tym samym nonce jest odrzucana. Częściowy indeks dopuszcza jedną otwartą podróż na gracza. Spóźniony zapis/heartbeat nie może cofnąć celu ani portfela podczas podróży. Odkrycia są osobne od starego zapisu, więc starszy klient ich nie usuwa.

`ma_settle` kończy albo anuluje podróż dokładnie raz. Błąd celu pozwala wrócić z jednorazowym zwrotem. Po utracie odpowiedzi klient ponawia ten sam nonce, a nie nalicza nowej opłaty. Po odświeżeniu serwerowy paragon prowadzi do celu; nie odtwarzamy opłaty ani nie polegamy na animacji. Błąd przygotowania celu podczas wznowienia anuluje transakcję i odtwarza punkt wyjazdu. Porównanie odległości działa także pomiędzy różnymi początkami projekcji map świata.

`seed.mjs` generuje `docs/sql/artillery-lublin-registry.sql` z WYŁĄCZONĄ siecią. Nie uruchamia SQL. Migracja i import wymagają zastosowania na Supabase; włączenie sieci jest osobnym krokiem po walidacji pozycji. Tabele są współdzielone przez produkcję i TEST; kod produkcji/pin wydania nie jest zmieniany.

## Sprawdzenia i ograniczenia

- `scripts/tests/artillery.mjs`: deterministyczność, limity/spójność, skróty, lotniska lokalne, małe miejscowości bez sieci, przesunięcia/wyłączenia i zachowanie ID.
- `scripts/tests/artillery-db.mjs`: dokładna migracja w izolowanym PostgreSQL (PGlite), autoryzacja, odkrycia, walka, krawędzie, nonce, spóźniony zapis, odzyskanie, jednokrotny zwrot i saldo.
- `scripts/tests/browser-artillery.mjs`: zbudowana gra z GLB, izolowane konto/RPC; komputer i telefon, AKCJA/E, odkrycie, blokada walki, utracona odpowiedź po pobraniu opłaty, ta sama podróż bez drugiej opłaty, gotowość celu, powrót HUD-u/sterowania, odświeżenie i logowanie z otwartą podróżą. Bez zapisów na prawdziwych kontach.
- `scripts/tests/browser-artillery-diagnostic.mjs`: rzeczywisty rejestr Lublina, dwa rozmiary ekranu, zoom, wybór punktów i brak udawanej walidacji dla nieobecnego miasta.
- `validate-game-map.mjs`: ładuje rzeczywistą mapę gry/fragmenty mapy świata, sprawdza kolizje, jezdnię i możliwość odejścia każdego stanowiska. Nie przesuwa punktów ręcznie.

Pokrycie jest modelem grafu dróg plus przybliżone dojście z komórki zabudowy; nie jest pomiarem każdej bramy, prywatnego płotu ani prędkości na wzniesieniach. Nominalna prędkość 70 km/h daje 1750 m w 90 s. Limit dziewięciu/dziesięciu stanowisk oznacza większe odległości dojścia w części dzielnic. Braki danych nie tworzą fikcyjnych przystanków.

Scena lotu zachowuje rzeczywisty wyrenderowany wygląd i wyposażenie, ale jej lotnik jest sześcioma wyrenderowanymi pozami aktualnego modelu z machaniem rękami, nie osobnym nowym klipem GLB. Dopracowanie ruchu obsługi/wsiadania/oddawania spadochronu pozostaje pracą wizualną. Nie oznaczać pełnego wdrożenia na prawdziwej bazie, zanim migracja, import, aktywacja i rzeczywista podróż TEST nie zostaną potwierdzone.


## Wynik dostarczenia 30.10.2026

Po korekcie zakresu: Lublin 9 stanowisk / 14 krawędzi / maks. 2 przesiadki / pokrycie 90 s 31,8%; Warszawa 42 / 80 / maks. 4 przesiadki / 50,4%; Stambuł 44 / 83 / maks. 5 przesiadek / 24,5%. Wszystkie aktywne punkty należą do dużych miast; jedyne rozszerzenia poza miasto to lokalne lotniska. Rejestry miast nie są ze sobą połączone. Liczby są wynikiem zadanych zakresów walidacji, nie spisem całych metropolii.

Lublin ma dwa punkty centralne (Plac Zamkowy i 3 Maja), pięć pozostałych miejskich oraz Radawiec i Port Lotniczy Lublin. Wszystkie 9 przeszło sprawdzenie kolizji, jezdni i możliwości odejścia w aktualnej mapie gry; lotnisko w Świdniku korzysta z prawdziwych doczytywanych fragmentów mapy świata. Oba lotniska mają po dwa lokalne kierunki. Szczegóły: `validation.json` i `lublin-game-map-validation.json`.

W Stambule jeden bezimienny obiekt aerodrome nie dostał stanowiska: brak wystarczających danych o pasie/dojściu. Nie uznajemy go za zwalidowane lotnisko. Dane Bosforu/Wisły uczestniczą w odrzucaniu kandydatów i grafie pieszym; dokładny audyt kolizji mapy gry wykonano wyłącznie dla Lublina, nie dla wszystkich punktów Warszawy i Stambułu.

Migracje `municipal_passenger_artillery_test_additive` oraz `municipal_artillery_timed_effects_and_indexes` zastosowano w projekcie erpeg. Pierwszy import rejestru Lublina pozostawił sieć wyłączoną do weryfikacji. Zapytanie kontrolne potwierdziło 9 punktów, spójność, limit 4 kierunków, limit 2 na lotniskach, RLS i brak bezpośredniego dostępu anon do tabel/helperów. Nie zmieniano zapisów postaci. Aktywacja TEST jest zapisana osobno w `docs/sql/artillery-lublin-enable-test.sql`.

Paragon zachowuje także dodatkowe serca i czasowe przyspieszenie wraz z terminami ważności. Wznowienie/zmiana sceny przywraca je bez wydłużania czasu działania. Heartbeat sceny wyjazdu nie jest wysyłany w trakcie lotu. Testy przeszły dla 1280×800, 844×390 oraz obróconego 390×844, z utraconą odpowiedzią, odświeżeniem, błędem celu, zwrotem, ekwipunkiem, wyglądem i efektami czasowymi.

Audyt Supabase: dołożono indeksy dla nowych kluczy obcych. Informacje o RLS bez polityk i ostrzeżenia o wykonywalnych SECURITY DEFINER RPC są świadomą architekturą tej gry: tabele są niedostępne bezpośrednio, a każda nowa funkcja danych gracza sprawdza istniejący token i uprawnienia do postaci TEST. Nie zmieniano niezwiązanych funkcji ani polityk. Opis tych ogólnych wskazań narzędzia: [RLS bez polityk](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [RPC SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Ponowny import krawędzi jest jawny: `node scripts/artillery/seed.mjs lublin --replace-links`, po wcześniejszym wyłączeniu sieci. Domyślny pierwszy import niczego nie usuwa i odrzuca próbę nadpisania aktywnej sieci.
