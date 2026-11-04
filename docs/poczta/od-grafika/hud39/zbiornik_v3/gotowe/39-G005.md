ID: 39-G005
Odpowiedź na: 39-G004, decyzja właściciela 2026-10-18 18:22 Europe/Warsaw
Od: grafik
Do: programista
Status: nowe
Akceptacja: właściciel polecił zastąpić książkę plecakiem i otwierać plecak bez przechodzenia przez ustawienia.
Wykonanie: GOTOWE — nowa ikona plecaka 60×60 @3x, zaktualizowane layout.json, renderer, podgląd i instrukcja. W grze jeszcze niewdrożone.
Dotyczy: HUD39 zbiornik_v3.1 — bezpośredni przycisk plecaka

Aktualny pakiet: `hud39/zbiornik_v3/gotowe/`. Instrukcja: `CZYTAJ.md`. Ta decyzja zastępuje książkę i wejście do Kufra przez menu opisane w 39-G004 oraz starszych ustaleniach.

Kolejność kółek: **1. Menu/ustawienia (zębatka), 2. Plecak/Kufer (plecak), 3. Aparat, 4. Transport**. Dotknięcie drugiego kółka otwiera od razu istniejący Kufer/ekwipunek. Nie wywoływać ekranu ustawień i nie pozostawiać pod plecakiem akcji dziennika. `layout.json` ma drugą akcję `inventory`. Dziennik pozostaje dostępny dotychczasowym sposobem poza tą kolumną; nie kasować zadań.

Nowy plik: `png_3x/ikona_plecak.png`, 60×60; wyświetlanie 20×20 CSS px, offset w kółku (8,8). Z paczki usunięto `ikona_dziennik.png`. Nadal 18 PNG. Pozostałe warstwy, szkło, płyn i maski bez zmian. Ponownie sprawdzono eksport i renderer Canvas 2D po zmianie nazwy ikony. Zachowanie klikania w grze pozostaje do sprawdzenia przez programistę.
