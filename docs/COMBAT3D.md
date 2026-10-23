# Próba walki 3D — 23 października 2026

Osobny grywalny eksperyment. Nie zmienia mechaniki, zapisów ani grafiki głównej gry.
Po wdrożeniu standardowej gałęzi testowej: https://exp-lore.app/test/combat3d.html.

## Zakres

- Prawdziwe obrysy OSM Starego Miasta w Lublinie, z ekstraktu już obecnego w repo. Bryły z płaskimi dachami, bez ręcznie modelowanych zabytków. Zagęszczenie przez jednolitą skalę 0,18 jednostki/metr, bez przebudowy topologii ulic.
- Nowe postacie i stworzenia z brył, z animowanymi stawami. To kodowe modele prototypowe, nie docelowe modele artystyczne ani importowane pliki GLB.
- Jedna postać, miecz, magiczny pocisk i sweep. Animacja zamachu i kontaktu, efekty trafienia, dźwięki syntetyczne.
- Dziewięć przeciwników na wolnym terenie: wilki i strzelcy, w tym jeden silniejszy przeciwnik. Zapowiedzi ataków, obrażenia od pocisków i skoku, respawn po 30 sekundach, gdy gracz odejdzie.
- Schronienie, regeneracja poza walką, mikstura z czasem odnowienia, odrodzenie i utrata niesionego złota oraz 10% postępu w aktualnym poziomie (bez utraty poziomu).
- Lokalny dorobek: EXP, odłamki, wybrana broń, zdrowie i pozycja. Nie jest połączony z rzeczywistym ekwipunkiem ani ekonomią. 40 złota startowego służy wyłącznie do sprawdzenia kary za śmierć; nie ma sklepu.

## Sterowanie

Telefon: lewy drążek to ruch; przeciągnij prawy, by wybrać kierunek i puść, by zaatakować. Szybkie dotknięcie pomaga wycelować w widocznego pobliskiego wroga. Osobne przyciski sweepa i mikstury, przełącznik miecz/magia u góry.

Komputer: WASD/strzałki, mysz do celowania, klik lub spacja do ataku; Q sweep, H mikstura, 1/2 broń. P lub Escape pauza. Ukrycie karty/utrata fokusu zatrzymuje próbę. Instrukcja pod przyciskiem „?”. Pauza zatrzymuje także odnowienia i AI.

## Uruchomienie i testy

```bash
npm ci
npm run map:combat3d    # tylko po zmianie danych/ekstraktora; JSON jest w repo
npx tsc --noEmit
npm run test:combat3d
npx vite build
npx vite preview --host 127.0.0.1
```

Otwórz `/combat3d.html`. Pełne `npm run build` nadal przebudowuje mapy całej starej gry i może trwać znacznie dłużej; standardowy proces wdrożenia pozostaje bez zmian.

Przeglądarka: Playwright jest narzędziem testowym, nie zależnością gry. Przy zainstalowanym Playwright i Chromium:

```bash
npm run test:combat3d:browser
```

Opcjonalne zmienne `PLAYWRIGHT_MODULE` oraz `BROWSER_EXECUTABLE` wskazują istniejącą instalację. Skrypt sam uruchamia Vite preview na 127.0.0.1:4178, sprawdza desktop i telefon, zapisuje zrzuty w `work/combat3d/`. Reguły bez renderowania sprawdzają kąty/zasięg trafień, ściany i dziedzińce, szybkie pociski oraz stratę EXP. Odczyt diagnostyki: `window.__combat3d.snapshot()`. Scenariusze QA istnieją tylko po dodaniu `?qa=1`, wyłącznie w tym odseparowanym eksperymencie.

## Izolacja i ograniczenia

- Klucz `exp-lore:combat3d:v1`; reset w instrukcji usuwa tylko ten klucz. Bez konta, RPC, Supabase ani modyfikacji realnych postaci. Nie nadaje się jeszcze do ekonomii z wymianą między graczami.
- AI ma prosty pościg i kolizje, bez pełnego wyszukiwania drogi wokół całych kwartałów. Przeciwnik może zablokować się za przeszkodą. Rozmieszczenie to krótki scenariusz testowy, nie docelowy generator biomów.
- Teren jest płaski. Drzewa nie mają kolizji. Granica wycinka jest nieprzekraczalna. Brak questów, sklepów, transportu i migracji ekwipunku.
- Statyczne cienie budynków są liczone raz. Postacie mają lekkie cienie pod stopami. To celowy kompromis pierwszej próby.
- Modele, dachy, animacje, czasy i obrażenia są do oceny. Wyniki FPS w bezgłowym Chromium z programowym GPU nie są miarą wydajności telefonu. Potrzebny test na fizycznym urządzeniu.
- Cel próby: ocenić czytelność, sterowanie, przyjemność trafienia i kierunek wizualny przed inwestowaniem w pełną przebudowę.

Geografia: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright. Nazwy i bezpieczne strefy w prototypie opisują mechanikę fantastycznej gry.
