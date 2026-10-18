ID: 39-G004
Odpowiedź na: 39-G003 i polecenie właściciela przygotowania plików do gry
Od: grafik
Do: programista
Status: nowe
Akceptacja: właściciel zaakceptował wygląd zbiornika wokół portretu, płyn reagujący na przechylenie telefonu, mniejszą skalę i zażądał gotowych plików zamiast makiet (2026-10-18).
Wykonanie: GOTOWE 18 osobnych PNG RGBA @3x, maski i osobne warstwy cieczy, renderer Canvas 2D, layout.json i instrukcja. Nie wdrożono do gry.
Dotyczy: HUD39 zbiornik_v3 — produkcyjny eksport grafiki

Pliki: `hud39/zbiornik_v3/gotowe/`. Zacznij od `CZYTAJ.md`.

**Późniejsza decyzja właściciela 39-G005: drugie kółko to plecak, otwierający bezpośrednio Kufer/ekwipunek. Zastępuje książkę i wejście przez menu/ustawienia. Pakiet i instrukcja są już zaktualizowane do v3.1.**

18 PNG w `png_3x/`: oprawa z przezroczystym środkiem i komorą, maska portretu, maska zbiornika, tło komory, tekstura płynu, szkło, refleks tafli, pusta tabliczka poziomu, 4 stany przycisku, 5 ikon i łącznik. Brak tła mapy, twarzy i wypalonych cyfr w tych plikach. Nie używać poprzednich makiet jako źródła do wycinania.

Rozmiar wyświetlania: medalion 56×56 CSS px, kółka 36×36, ikony 20×20. Hitboxy kółek nadal 44×44, odstęp 8 px. Cała kolumna 56×272. Native tekstury @3x pozwalają wyświetlać dopracowane gładkie krawędzie w małym HUD-zie. Współrzędne i sumy plików w `layout.json`.

Ruch płynu: geometria pierścienia i tafli jest odseparowana od oprawy oraz twarzy. `renderer.js` działa na dostarczonych PNG i demonstruje maskowanie, objętość zgodną z procentem EXP i pochylenie tafli. Czujniki telefonu trzeba podłączyć w grze; neutralna tafla na komputerze/przy odmowie zgody/braku czujników/ograniczonych animacjach. Szczegóły w CZYTAJ.md oraz 39-G003.

Weryfikacja: wszystkie PNG poprawnie dekodowane, środek oprawy przezroczysty; test 56 kombinacji EXP i kąta daje błąd objętości poniżej 0,6 pp; wykonano 9 rzeczywistych renderów Canvas 2D/Skia z gotowych PNG i sprawdzono funkcję przeliczenia grawitacji. Test w przeglądarce nie odbył się — brak Chromium i nieudane pobranie; HTML kontrolny pozostaje do sprawdzenia przez programistę. W grze i na fizycznym telefonie nie testowano. Produkcja i kod gry bez zmian.

To zastępuje stan „warstwy do wykonania” z 39-G003. Historia i makiety pozostają obok, ale właściwy eksport to wyłącznie podfolder `gotowe/`. Proszę potwierdzić odbiór 39-G004, wdrożone elementy i wynik prób na telefonie/komputerze; nie oznaczać wdrożenia po samym pobraniu paczki.
