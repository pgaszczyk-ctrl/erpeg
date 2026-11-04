# Questy — materiały do konsultacji

Przygotowane 12.10.2026 dla właściciela, projektanta gry i programisty. Wątek: **Q-20261012-P001**.

**Status: do konsultacji. Paczka 12 questów pozostaje odrzucona i wyłączona.** Udostępnienie tych danych nie jest zgodą na jej reaktywację ani na kolejną masową serię. Właściciel chce osobiście skupić się na dopracowaniu questów.

## Od czego zacząć

| Plik | Zawartość | Status |
|---|---|---|
| [BRIEF_WLASCICIELA.md](BRIEF_WLASCICIELA.md) | Kierunek z rozmowy, ton/lore, uniwersalny początek, mapa, tempo, zapis i języki | Wymagania oraz jawnie oznaczone pomysły do decyzji |
| [SCHEMATY_40.md](SCHEMATY_40.md) | 40 kart: czynność, miejsca, wejścia/wyjścia, reguła ukończenia, oryginalne teksty PL/EN i humor | Archiwalne propozycje; nie gotowy generator |
| [ARCHIWUM_12_QUESTOW.md](ARCHIWUM_12_QUESTOW.md) | Tytuły, teksty, etapy, wybory, tropy, odpowiedzi, karty i warianty ostatniej paczki | Odrzucone i wycofane, wyłącznie materiał do oceny |
| [DANE_ARCHIWALNE.json](DANE_ARCHIWALNE.json) | Kompletny snapshot katalogu i definicji: 40 modułów, 12 questów, 515 rekordów z wariantami PL/EN | Dane do odczytu; nie importować jako aktywną zawartość gry |

Źródłowy commit: `29d1b12f1935f31ee57b68019ae865befc4bf3c1`. Snapshot nie zawiera danych graczy, ich współrzędnych, zapisów ani dostępu do bazy. Archiwalne pola katalogu typu `implementationStatus` i `status` zachowano bez przerabiania — nadrzędny stan konsultacji opisuje nagłówek snapshotu.

## Co ocenić

| Odbiorca | Pytanie do rozstrzygnięcia | Wynik konsultacji |
|---|---|---|
| Projektant / właściciel | Który pojedynczy quest ma ciekawą historię, wyraźne wskazówki i satysfakcjonującą czynność? Czy w ogóle warto zachować któryś schemat? | Wybrany i opisany przypadek; nie automatyczna akceptacja 40 pozycji |
| Projektant / właściciel | Co gracz robi od pierwszych minut „Cienia smoka”, zanim dotrze do ograniczenia poziomu 5? | Przebieg prologu uniwersalnego, niezależnego od promocji Lublina |
| Projektant / programista | Jak ta sama intencja działa w Lublinie, Hongkongu, małym mieście i okolicy bez wody/gór? | Wymagane role miejsc, dozwolone warianty i reguła niedostępności |
| Projektant / programista | Które wybory zmieniają czynność lub rezultat, a które tylko tekst? | Konkretny zakres mechanik i skutków, także brakujących w silniku |
| Programista | Jak zapewnić stałe ID, jedno przyjęcie między miastami, checkpointy i zmianę języka? | Specyfikacja zapisu i kompatybilności, z zachowaniem starszych zleceń |
| Właściciel / projektant | Czy próg 40 tys., gęstość 4/1–2/1 i prędkość około 50 km/h są właściwe? | Decyzje po ocenie treści i tempa; liczby nie są zatwierdzoną konfiguracją |
| Autor / tłumacz | Jak uprościć dialogi, zachować chronologię smoków i adaptować lokalny humor? | Jedna uzgodniona wersja lore i tekstów do zatwierdzenia |

## Gdzie jest kod i starszy materiał

- [Katalog źródłowy](../../src/content/questy/catalog.json) i [ostatnie definicje etapów](../../src/content/questy/runtime.json).
- [Wyłączenie konkretnych ID i odczyt zapisów](../../src/content/questy/scenarios.ts), [dobór miejsc i tras](../../src/content/questy/planner.ts), [postęp kart/tropów](../../src/content/questy/progress.ts), [teksty i metadane](../../src/content/questy/text.ts).
- [Opis wcześniejszego wdrożenia i wycofania](../QUESTY_MIASTA_I_JEZYKI.md), [dziennik przekazania](../PRZEKAZANIE_chatgpt.md).
- [Główna historia — teksty i ograniczenie poziomu](../../src/content/historia.ts), [przebieg głównego wątku](../../src/scenes/Story.ts).
- [Materiały lore dla autora](../swiat-dla-autora.md), [starszy zarys świata](../lore-zarys.md), [wiedza o questach](../wiedza/3_questy.md). Starsze fragmenty lore bywają sprzeczne; szczegóły w briefie.
- [„Serce Zębatka”](../historie/serce-zebatka.json) — historia lokalna, nie uniwersalny początek.
- [Istniejące osiągnięcia](../../src/content/osiagniecia.ts); [starsze tłumaczenia](../../src/content/questy/legacy.json) i [tłumaczenia szablonów](../../src/content/questy/legacyExtras.json) są osobne od 515 rekordów snapshotu.

Odnośniki względne prowadzą do bieżących plików repo. Dla dokładnego odtworzenia tej konsultacji użyć źródłowego commita podanego wyżej lub pliku snapshotu.

## Odpowiedzi projektanta i programisty

Punkt wejścia w poczcie: [Q-20261012-P001](../poczta/do-projektanta/2026-10-12_Q-20261012-P001_questy-konsultacja.md). Odpowiedź projektanta powinna wskazywać to ID i otrzymać nowe ID, np. `Q-20261012-D001`, w `docs/poczta/od-projektanta/` zgodnie z protokołem poczty. Odpowiedź programisty może mieć kolejne ID `Q-20261012-P002` i odnieść się do konkretnej wersji specyfikacji.

Rozdzielać **akceptację właściciela**, **przygotowanie materiału** i **wdrożenie w grze**. Nie oznaczać konsultacji jako zakończonej po samym przeczytaniu. Nie ma tu nowych questów uruchomionych w grze.
