# Spotkania i walka półturowa — wycofany prototyp TEST

**WYCOFANE 16.10.2026 na polecenie właściciela.** Wygląd i działanie prototypu zostały odrzucone. Poniżej wyłącznie historia próby; kod i zachowanie gry wracają do stanu sprzed wdrożenia. Nie reaktywować bez nowych ustaleń.

Zamówienie: załączona specyfikacja właściciela z 16.10.2026 (`SPECYFIKACJA_TEST.md`). Dodatkowa decyzja z rozmowy: gang jest zwartą grupką; część grupek wędruje jako jądro z bliskimi „elektronami”, część stoi w miejscu (np. przy znalezionym plecaku). Plecak jest przykładem fabularnym, nie nowym przedmiotem ani zadaniem.

## Parametry startowe

Wszystkie poniższe wartości są próbą do strojenia, nie zatwierdzonym balansem. Konfiguracja: `src/content/spotkania.ts`.

| Reguła | Wartość |
| --- | --- |
| Ruchy bohatera | poziom 1–4: 3; 5–11: 4; 12–20: 5 |
| Atak / przemieszczenie / leczenie | po 1 ruchu |
| Mocny atak | 2 ruchy; dotychczasowy mnożnik broni |
| Przemieszczenie | droga do 12 m, próbkowana co 1 punkt mapy; siatka obejścia 3 punkty |
| Łuk / magia | zasięg 55 m / 45 m; wymagają widocznej, nieprzegrodzonej linii |
| Odpowiedź rywala | 1 działanie: dojście do 9 m ALBO atak |
| Aktywna fala | najwyżej 3 przeciwników (2 przy maksymalnym życiu poniżej 6 połówek serca); pozostali czekają na kolejną falę |
| Banda / mały / wielki gang | odpowiednio 2–3 / 3–4 / 6–8 członków |
| Obrażenia zwykłego wroga | dotychczasowe obrażenia × trudność × 0,65 |
| Krytyk | 8%, obrażenia ×1,6 |
| Unik | 8%, sprawdzany przed blokiem |
| Blok | dotychczasowa szansa z obrony rzeczywiście noszonego ekwipunku |
| Dodatkowy ruch | 6%, tylko raz na początku własnej tury; zwiększa bieżący licznik i jego mianownik |
| Promień małej mgiełki / interakcji | 30 m / 24 m |
| Zwarta grupka | członkowie początkowo do 8 m od jądra, z odstępem i kontrolą przejść |
| Wędrujące grupki | 45%; jądro 1,5 m/s, orbita około 18 s; jądro czeka na blokowanych towarzyszy |
| Animacja działania | około 280 ms; kolejna akcja czeka także na potwierdzenie zapisu |

Trzy początkowe ruchy pozwalają na podejście i dwa ciosy albo mocny oraz zwykły atak. Progi 5/12 i limit pięciu ograniczają długość planowania. Krok 12 m pozwala dojść z dystansu spotkania 24 m do zasięgu broni; wróg porusza się krócej i wybiera między dojściem a ciosem. Mnożnik 0,65 i mniejsza fala w trybie z czterema połówkami życia zapewniają przeżycie pierwszej zwykłej odpowiedzi, także z deszczowym wzmocnieniem; silni bossowie nadal wymagają przygotowania. Szanse 8/8/6% dają rzadkie, zauważalne zdarzenia, a blok wynika z ekwipunku.

Terytoria istniejących gangów zachowują rozmiary 92/184/230 m. Zmniejszone jest rozmieszczenie uczestników, nie mechanicznie całe terytorium. Wędrówka mieści się w obrębie 65% promienia istniejącego terytorium. Przy przeszkodzie jądro zmienia kierunek, uczestnicy poruszają się z kontrolą kolizji i nie teleportują.

## Przebieg i integracja

- Podejście/uniknięcie jest osobnym, bezpiecznym wyborem. Znana wroga grupa uprzedza o walce. Neutralny rozmówca lub spokojny smok prowadzą do dialogu; decyzje głównej historii pozostają w `Story`.
- Rozmowa fabularna i otwarte menu mają pierwszeństwo nad automatycznym spotkaniem. Zastąpienie oferty innym dialogiem zwalnia blokadę wejścia.
- Uniknięte spotkanie odblokowuje automatyczny wybór dopiero po oddaleniu; świadome ponowne wybranie działa bez czekania. Nie ma bezpłatnej ucieczki z rozpoczętego starcia.
- Ruch i atak są oddzielne. Wybór, podgląd i anulowanie są bezpłatne. Podgląd trasy nie zmienia mgły odkrycia; odkrywanie następuje dopiero podczas wykonania.
- Zwykły cios nie odrzuca uczestników. Silniejsi wrogowie przygotowują kierunkowy cios, którego obszar pozostaje przez pełną turę bohatera; zejście z niego pozwala uniknąć ataku.
- Fale oraz pojawienie się herszta nie uruchamiają natychmiastowych ciosów. Nowa fala zaczyna od decyzji bohatera.
- Na TEST dawni przeciwnicy nie chodzą i nie biją niezależnie od spotkań. Podczas planowania stoi symulacja walki, stare pociski, okresowe obrażenia, zbieranie i regeneracja. Rysowanie mapy, pogoda, mgła wojny i animacje dekoracji pozostają aktywne.
- Automatyczny piorun jest rozstrzygany raz na początku własnej tury, bez darmowego treningu ani zużycia broni. Leczenie zużywa 1 ruch oraz istniejące zapasy, z zachowaniem dotychczasowego pierwszeństwa mikstur/owoców/jedzenia. Czas ważności nasycenia broni pozostaje czasem rzeczywistym.
- Zapis `testCombat` jest dodatkowym polem zwykłego zapisu, wyłącznie na TEST. Obejmuje pulę, fazę, już odpowiadających rywali, ich życie i pozycje, stan generatora losowego, zapowiedzi, fazę gangu oraz uzyskany postęp. Następna akcja czeka na potwierdzenie zapisu. Lokalny checkpoint chroni także odświeżenie podczas wysyłki. Przywracanie porównuje bazowy postęp, aby stary lokalny zapis nie zastępował nowszej rozgrywki z produkcji/innego urządzenia. Bez nowych tabel, SQL ani edycji istniejących danych graczy poza zwykłym zapisem rozgrywki.
- Dawny trening strzelania działa poza starciem, ale pociski nie ranią przeciwników z nieprzyjętego spotkania. Ruch przeciwników respektuje dotychczasowe granice terytorium.
- Istniejące funkcje zabicia, łupów, EXP, treningu, zużycia, amunicji i zakończenia zadań pozostają miejscem rozliczania nagród. Łupy walki nie znikają podczas spokojnego wybierania działań i są częścią checkpointu.
- Produkcja nie tworzy kontrolera tur, nie czyta checkpointu TEST i zachowuje dotychczasową walkę. Nie zmieniono `PRODUKCJA`, `WERSJA` ani `produkcja/`.

## Jak obejrzeć

Na TEST: menu ☰ → „Spotkania (test)” → spokojny smok / pojedynczy przeciwnik / mała grupa / wędrująca lub stojąca grupka. Normalne spotkania są także podłączone do istniejących przeciwników i mieszkańców.

W walce: Atak / Ruch / Specjalne, potem cel oraz Zatwierdź. Klawiatura: 1/A, 2/R, 3/S, Tab zmienia cel; strzałki przesuwają cel przemieszczenia, Enter/Spacja zatwierdza; E kończy turę; Escape anuluje wybór albo otwiera zwykłe menu. Dotyk i mysz mają ten sam jawny przycisk potwierdzenia.

Deterministyczne próby szczęścia na TEST: `__game.scene.getScene('game').turnCombat.forceLuck('krytyk'|'unik'|'blok'|'dodatkowy')`. Blok wymaga noszonego ekwipunku dającego obronę. Żaden z tych przełączników nie istnieje jako stały przycisk koniczynki w walce.

## Granice pierwszej próby

- To pierwsza konfiguracja do oceny tempa i przeżywalności. Silne smoki i bossowie są uprzedzani w opisie; nie są zwykłym spotkaniem dla postaci z kijkiem na poziomie 1.
- Smok w tej próbie ma atak i zapowiadany silny cios w kolejce tur. Przeniesienie wszystkich gatunkowych ataków z czasu rzeczywistego (lot/kwas/dym) do osobnych zdolności tur pozostaje dalszą rozbudową; ich stare pętle obrażeń są wyłączone.
- Nie dodano nowych questów, systemu znajdziek, nowych cech wszystkim butom ani nowych przedmiotów szczęścia. Dotychczasowe zadania jednorazowe i nagrody są zachowane; prośby przechodniów pozostają mechanizmem dotychczasowej sesji.

## Weryfikacja

Lokalnie: `npm run build` z `VITE_TEST=1`, `tsc --noEmit`, `git diff --check` oraz `node --experimental-strip-types scripts/tests/combat.mjs` przeszły. Sandbox blokuje lokalny port podglądu (`listen EPERM`), więc rzeczywiste próby przeglądarkowe i zrzuty 390×844/1280×900 uruchomiono w `.github/workflows/combat-checks.yml` w PR #5. Kontrola walki [38963435000](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/38963435000) przeszła dla kodu `e84dd03`: rzeczywisty Phaser i mapa Lublina, komputer 1280×900, telefon 390×844/DPR2, wybór rozmowy/uniku/walki, pierwszeństwo dialogu, bezpłatne anulowanie, płatny ruch i cios, szybkie kliknięcia, wszystkie cztery zdarzenia szczęścia, wznowienie tury po ponownym logowaniu, faza herszta i jednokrotna nagroda, statyczne/ruchome formacje, trening oraz porażka. Przeszły także osobny build bez TEST i test utraty sesji. Obejrzano zrzuty telefonu i komputera. Wszystkie RPC zastąpiono atrapami; nie logowano się do rzeczywistych postaci. Dwie poprawki scenariusza CI: oczekiwanie uwzględnia ukończone starcie oraz rzeczywistą gotowość HTTP serwera podglądu. Zadania miejskie [38963434996](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/38963434996) także przeszły. PR #5 scalono zwykłym merge `f1ee258`. Publikacja TEST [38965438289](https://github.com/pgaszczyk-ctrl/erpeg/actions/runs/38965438289) zakończona powodzeniem 16.10.2026 o 21:07 UTC. Sprawdzenie z runnera GitHub odczytało publiczne `test/version.json`: `f1ee258 2026-10-16 21:01`; TEST HTML i wejściowy JS: HTTP 200. Produkcyjne `version.json` wskazało nadal pin `6b59d92` (wersja 1.026), TEST: 1.027-test. Bezpośredni odczyt domeny z lokalnego sandboxu i narzędzia WWW był niedostępny; potwierdzenie publicznego adresu pochodzi z kroku „Verify the published TEST build” w zakończonym workflow. Po publikacji zmieniono wyłącznie dokumentację z `[skip ci]`; działająca kompilacja gry pozostaje `f1ee258`.
