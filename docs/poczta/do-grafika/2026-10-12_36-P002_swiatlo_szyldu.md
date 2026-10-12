ID: 36-P002
Odpowiedź na: 36-G002
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel jeszcze nie ocenił wdrożenia w grze
Wykonanie: wdrożone na gałęzi claude/hopeful-davinci-kcj9bh (serwer testowy po scaleniu); produkcja bez zmian
Dotyczy: zamówienie 36 — światło szyldów, miganie za dnia, bujanie tablicy

# 36-P002 — wdrożenie 36-G002 (test)

| Plik od grafika | Gdzie w grze | Jak użyty |
|---|---|---|
| snop_64.png | public/swiat/szyldy/snop.png → tekstura `snop-szyldu` | ADD, zaczep lampy (32, 8,4), plama (32, 55,5) przy stopie słupa; rozmiar liczony z odległości lampa–ziemia (ok. 23 punkty mapy); ten sam snop pod szyldami na ścianach i straganach |
| tablica_sklep_bujanie.png | public/swiat/szyldy/tablica_sklep_bujanie.png → `tablica-sklep-bujanie` (3 klatki 32×32) | tylko tablica sklepu; zaczep (16, 8,5) w tym samym punkcie co góra dawnej tablicy 22×20; skala tak, by widoczne ~24 px miało szerokość dawnych 22 px; NEAREST |
| pozostałe pliki | tylko w poczcie | GIF i pojedyncze klatki – do porównania |

**Czasy i alfa** (content/swiat.ts `SNOP_SZYLDU`):
- Dzień: każde miejsce swój okres 2000–3000 ms; rozbłysk 0,85 przez 100 ms → przygaszenie 0,15 przez 120 ms → rozbłysk 0,85 przez 100 ms → baza 0,35. Podczas rozbłysków widać też samą lampę na słupie (źródło), nie tylko plamę.
- Noc: bez zmian – 0,85 i dotychczasowe krótkie „zwarcie” co 7–18 s; lampa świeci.
- Bujanie wszystkich tablic na słupach (pod poprzeczką i na ramieniu): środek 400 → przód 220 → środek 400 → tył 220 ms, każda tablica inna faza; snop i owal stoją w miejscu. Dawne bujanie na boki (obrót ±4°) wyłączone. Pozostałe 11 tablic wychyla się kodem: przód = szerzej o 4 %, tył = niżej o 12 % i lekko przyciemniona, zaczep u góry.
- `prefers-reduced-motion`: tablica w środkowej klatce, światło stałe (dzień 0,35, noc 0,85).
- Warstwy pokazują się tylko przy szyldach na ekranie (te same zasady co sam szyld).

**Sprawdzenie**: scripts/tests/browser-szyldy.mjs (komputer dzień, komputer noc, telefon dzień; mapa Lublina, wersja testowa): snop to grafika `snop-szyldu`, za dnia pojawiają się alfy 0,85 / 0,15 / 0,35, tablica sklepu przechodzi przez klatki 0, 1, 2, brak błędów strony.

**Uwaga do dalszej pracy**: jeśli właściciel zechce klatki bujania dla pozostałych 11 tablic, to osobne zamówienie (te same 3 pozy, ta sama geometria).
