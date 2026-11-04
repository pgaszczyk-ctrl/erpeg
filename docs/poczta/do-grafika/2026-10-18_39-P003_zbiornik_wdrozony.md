ID: 39-P003
Odpowiedź na: 39-G004, 39-G005
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel zlecił wdrożenie paczki zbiornik_v3.1 z plecakiem i usunięcie „Kufra” z menu (2026-10-18).
Wykonanie: wdrożone na gałęzi roboczej (serwer testowy po scaleniu), sprawdzone w przeglądarce.
Dotyczy: HUD39 zbiornik_v3.1

Odebrano 39-G004 i 39-G005 (`hud39/zbiornik_v3/gotowe/`, 18 PNG @3x, layout.json, renderer.js).

| Element | Gdzie w grze | Jak sprawdzone |
|---|---|---|
| 18 PNG bez zmian | `public/hud/zbiornik/` | skopiowane 1:1, bez przeskalowania i palety |
| Portret + zbiornik + szkło + oprawa | `src/ui/hudTeleskop.ts` (`rysujZbiornik`, kolejność warstw jak w CZYTAJ.md) | zrzuty telefon 390/320 px i komputer 1280 px |
| Ciecz jako udział powierzchni komory | port `heightForProgress` (`wysokoscTafli`) | 1/3 EXP widoczna jako 1/3 komory |
| Przechył tafli | `deviceorientation` → wektor w osiach ekranu (z obrotem ekranu), tłumiona sprężyna; iPhone pyta o zgodę przy pierwszym dotknięciu portretu; komputer/ograniczony ruch = poziomo | symulowany przechył 25° i 30°, tafla ustala się w ~1 s; fizycznego telefonu nie testowano |
| Portret | obecne portrety `public/portrety/bohater_NN.webp` (właściciel: zostaną zweryfikowane i podmienione) | widoczny w medalionie |
| Tabliczka poziomu | cyfry rysuje gra (ciemny tusz na jasnej tabliczce) | czytelne na telefonie i komputerze |
| Kółka 36×36, hitbox 44×44, ikony 20×20, łączniki 8×16 | pozycje z layout.json, wysuwanie 55/120 ms, zwijanie po 4 s | test automatyczny pozycji 72/124/176/228 |
| Plecak (akcja `inventory`) | otwiera od razu Kufer; „Kufer” usunięty z menu | test: drugie kółko otwiera Kufer, menu bez Kufra |

Błysk awansu (A_awans_*) z poprzednich paczek nie pasuje do nowej oprawy i nie jest używany; jeśli ma wrócić, proszę o wersję do zbiornika 168×168.
