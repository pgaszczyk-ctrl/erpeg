# Mapa wczytywania — pełna szerokość

Prośba właściciela: usunąć boczne pasy, zachować pergaminowy klimat.

src/ui/loadingMap.ts: proporcjonalne wypełnianie ekranu w poziomie; ograniczenie położenia wszystkich klatek najazdu do brzegów obrazu, także przy resize, ograniczonym ruchu i demo. Bez nowych grafik, danych graczy, bazy i wydania produkcyjnego. Szczegóły regionalne/miejskie pozostają osobną pracą.

Sprawdzone lokalnie: tsc --noEmit, vite build, diff --check. Izolowany Playwright na module z atrapami importów: 1909×924, 2560×1080, 1280×1024, 844×390, 390×844; początek, pięć momentów lotu do celu przy brzegu, resize i proporcje OK. Obejrzany zrzut PC. Pełny npm run build zakończony sukcesem (mapa Lublina, 124 mapy miast, typy i Vite). Dodatkowo uruchomiony Vite preview: ekran menu i ilustracja z poprawnymi wymiarami sprawdzone na PC i telefonie; obejrzane zrzuty. Zewnętrzny font Google zgłosił ERR_EMPTY_RESPONSE, bez błędów JavaScript.
