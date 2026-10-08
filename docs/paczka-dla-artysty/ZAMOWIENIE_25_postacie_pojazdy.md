# 25 gotowych postaci i pojazdy — decyzja właściciela, 8.10.2026

Generator osobnych głów i ciał zastępuje wybór jednej z 25 kompletnych postaci z paczki `exp_lore_25_postaci_pojazdy_programista.zip`. To aktualne podejście, zamiast zamówienia 22. Każdy strój i sylwetka pozostają jak na rysunku. Nie dodajemy zmiany ubrania ani dowolnego składania części. Jeśli będą potrzebne dodatkowe kolory, maski mają obejmować **wyłącznie skórę i włosy**; paczka nie zawiera tych masek, obecnie używamy oryginalnych kolorów.

## Integracja na serwerze testowym

- 25 wyglądów numerowanych zgodnie z paczką. Wybór w Kufrze → Postać; poprzednie 10 bohaterów i 8 prób modułowych nie występują na testowej liście. Ich pliki pozostają dla produkcji.
- Arkusze 192×192 (9 klatek 64×64): dół / bok / góra; krok A / stoi / krok B. Źródła 160×208 są przycięte do sylwetki i zmniejszone metodą nearest-neighbour, stopy na wierszu 62. Skala jest wspólna dla wszystkich klatek danej postaci. Rysunki faktycznie patrzą w lewo, mimo nazw `prawo_*`; opis w manifest.json nie zastępuje obejrzenia grafiki.
- Rower i hulajnoga: wybór Pieszo / Rower / Hulajnoga parowa w Kufrze. Na teście dostępne bez kupowania. Jazda 1,4× szybciej, nadal z normalnymi kolizjami, spowolnieniem terenu i sterowaniem. Sylwetka jazdy zastępuje widok chodzącego bohatera; po zejściu wraca chód.
- Pozy jazdy są wyłącznie boczne, odbijane przy skręcaniu; podczas ruchu góra/dół nadal widok boczny. Brak pełnej animacji kół oraz widoków jazdy przód/tył. W pierwszych 10 postaciach oba pola jazdy zawierają hulajnogę: użyto jej wyłącznie do hulajnogi; rower składany z osobnej grafiki i sylwetki. W pozostałych postaciach pozy złożono z osobnymi pojazdami. Te pozy warto dopracować z grafikiem po próbie w grze.

Źródła, manifest i opis paczki: `scripts/postacie25-zrodla/`. Powtórzenie przygotowania: `python3 scripts/postacie25.py` (Pillow). Wyniki: `public/postacie/lista25_*.png`, dekoracyjny rower `public/swiat/welocyped_test25.png`.

## Test i produkcja

Tylko w wersji VITE_TEST=1 nowa lista i jazda. Pierwsze dwa wyglądy wylosowano bez powtórzeń: Arceus = 01, Jam = 13 (to dwie postacie dopuszczone przez TEST_POSTACIE). Wybrany później wygląd jest pamiętany w przeglądarce, osobno dla postaci, pod kluczem `exp-test-avatar25:<imię>`. Na nowym urządzeniu będzie początkowy przydział; wybór nie jest synchronizowany między urządzeniami.

Wspólnego zapisu wyglądu produkcyjnego nie przeliczamy na nową listę: test zachowuje oryginalny `look` przy zwykłym zapisie gry. Nie wykonywano migracji SQL ani zmian w bazie. Do dalszej decyzji właściciela: maski skóry/włosów, dopracowanie widoków jazdy, trwały wybór między urządzeniami i warunki zdobywania pojazdów. Produkcja nie otrzymuje tej zmiany bez osobnego polecenia wydania.
