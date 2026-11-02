ID: 47-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: czeka na właściciela
Wykonanie: –
Dotyczy: Kulociąg Parowy – podziemny pinball w miastach z metrem (kolumna z logo, stacja, wyrzutnia, kula, rury)

# Zamówienie 47: Kulociąg Parowy

W miastach z prawdziwym metrem (Warszawa, Praga, Paryż…) zamiast armat jeździ się podziemnym pinballem. Program już
działa (kolejność scen, czekanie na wczytanie celu), ale rysunki z kodu właściciel odrzucił: „bez klimatu steampunk,
jakby dziecko rysowało”. **Wzór stylu: Arena Cechu** (`wzor_styl_arena_tyl.png`, Twoje płyta/trybuny/kratki z zam. 38):
ta sama gęstość, ciepłe mosiądze, cegła, para, obrys #1e1a24, paleta świata. Zrzuty obecnego stanu z kodu
(`teraz_*.png`) pokazują tylko układ – nie styl.

1. **Logo „Kulociąg Parowy”** (EN „Steam Ballway”): emaliowany szyld w mosiężnej ramie, motyw kuli w rurze/zębatki.
   Dwie wersje: pozioma ok. 240×60 px i mała do kolumny ok. 48×20 px w pikselach świata. Napis PL i osobno EN.
2. **Kolumna przy włazie (na ulicy)** – musi być widać ją z daleka: mosiężna kolumna ok. 1,8 wysokości postaci,
   żeliwna stopa, na górze szklana kula ze światłem, logo z p. 1, rura wychodząca z ziemi przy włazie, gwizdek z boku.
   2 klatki (spokój / bucha para). Podstawa = dół środka.
3. **Właz** – żeliwna pokrywa w mosiężnym pierścieniu, widziana z góry pod kątem budynków; osobno pokrywa i otwór
   (program ją przesuwa). Ok. 20×12 px świata.
4. **Hala stacji (pod ziemią)** – jasna, klimatyczna, wyraźnie jaśniejsza niż loch: kafle, mosiądz, lampy gazowe,
   schody w górę ze światłem dnia. Jedno tło sceny 1280×720 (lub 640×360 ×2), bez napisów – w dwóch miejscach zostaw
   wolne pola: **tablica** (emaliowana, ok. 440×70 px) i **mozaika w posadzce** (ok. 520×180 px) – tam program wpisze
   nazwę stacji i ułoży mozaikę w barwach flagi kraju (nazwa musi być czytelna, każda stacja ma inną).
   Wystarczą puste ramy tablicy i mozaiki jako osobne warstwy.
5. **Wyrzutnia** – maszyna stojąca w hali: szklana rura w górę, sprężyna z tłokiem, manometr, zawory, kotłownia.
   Klatki napięcia: 4 klatki ściskania sprężyny (luz → pełne), 1 klatka „puszcza”, osobno wskazówka manometru
   (program ją obraca) i 2–3 kłęby pary.
6. **Kula** – szklana kula z mosiężną obręczą (program wkłada w nią postać), 64×64, 4 klatki obrotu odblasku.
7. **Rury między stacjami** – kafelkowalne pionowo tło ceglanego tunelu (np. 640×256) + odcinek mosiężnej rury
   i 2 odbijacze (zgaszony/świecący) jak w flipperze.

Kolejność: najpierw próba – logo (p. 1) i kolumna (p. 2) na ulicy, potem hala i wyrzutnia. Rysujemy w pikselach świata
(PALETA_SWIATA, obrys 1 px #1e1a24, bez wygładzania), tło przezroczyste.
