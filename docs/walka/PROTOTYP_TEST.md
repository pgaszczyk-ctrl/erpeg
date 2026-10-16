# Spotkania i walka półturowa — prototyp TEST

Zamówienie: załączona specyfikacja właściciela z 16.10.2026 (`SPECYFIKACJA_TEST.md`). Dodatkowa decyzja z rozmowy: gang jest zwartą grupką; część grupek wędruje jako jądro z bliskimi „elektronami”, część stoi w miejscu (np. przy znalezionym plecaku). Plecak jest przykładem fabularnym, nie nowym przedmiotem ani zadaniem.

## Parametry startowe

Wszystkie poniższe wartości są próbą do strojenia, nie zatwierdzonym balansem. Konfiguracja: `src/content/spotkania.ts`.

| Reguła | Wartość |
| --- | --- |
| Ruchy bohatera | poziom 1–4: 3; 5–11: 4; 12–20: 5 |
| Atak / przemieszczenie / leczenie | po 1 ruchu |
| Mocny atak | 2 ruchy; dotychczasowy mnożnik broni |
| Przemieszczenie | droga do 12 m, próbkowana co 1 punkt mapy; siatka obejścia 3 punkty |
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

Terytoria istniejących gangów zachowują rozmiary 92/184/230 m. Zmniejszone jest rozmieszczenie uczestników, nie mechanicznie całe terytorium. Wędrówka mieści się w obrębie 65% promienia istniejącego terytorium. Przy przeszkodzie jądro zmienia kierunek, uczestnicy poruszają się z kontrolą kolizji i nie teleportują.

## Przebieg i integracja

- Podejście/uniknięcie jest osobnym, bezpiecznym wyborem. Znana wroga grupa uprzedza o walce. Neutralny rozmówca lub spokojny smok prowadzą do dialogu; decyzje głównej historii pozostają w `Story`.
- Uniknięte spotkanie odblokowuje automatyczny wybór dopiero po oddaleniu; świadome ponowne wybranie działa bez czekania. Nie ma bezpłatnej ucieczki z rozpoczętego starcia.
- Ruch i atak są oddzielne. Wybór, podgląd i anulowanie są bezpłatne. Podgląd trasy nie zmienia mgły odkrycia; odkrywanie następuje dopiero podczas wykonania.
- Zwykły cios nie odrzuca uczestników. Silniejsi wrogowie przygotowują kierunkowy cios, którego obszar pozostaje przez pełną turę bohatera; zejście z niego pozwala uniknąć ataku.
- Fale oraz pojawienie się herszta nie uruchamiają natychmiastowych ciosów. Nowa fala zaczyna od decyzji bohatera.
- Na TEST dawni przeciwnicy nie chodzą i nie biją niezależnie od spotkań. Podczas planowania stoi symulacja walki, stare pociski, okresowe obrażenia, zbieranie i regeneracja. Rysowanie mapy, pogoda, mgła wojny i animacje dekoracji pozostają aktywne.
- Automatyczny piorun jest rozstrzygany raz na początku własnej tury, bez darmowego treningu ani zużycia broni. Leczenie zużywa 1 ruch oraz istniejące zapasy, z zachowaniem dotychczasowego pierwszeństwa mikstur/owoców/jedzenia. Czas ważności nasycenia broni pozostaje czasem rzeczywistym.
- Zapis `testCombat` jest dodatkowym polem zwykłego zapisu, wyłącznie na TEST. Obejmuje pulę, fazę, już odpowiadających rywali, ich życie i pozycje, stan generatora losowego, zapowiedzi, fazę gangu oraz uzyskany postęp. Następna akcja czeka na potwierdzenie zapisu. Lokalny checkpoint chroni także odświeżenie podczas wysyłki. Bez nowych tabel, SQL ani edycji istniejących danych graczy poza zwykłym zapisem rozgrywki.
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

Lokalnie: `npm run build` z `VITE_TEST=1`, `tsc --noEmit`, `git diff --check` oraz `node --experimental-strip-types scripts/tests/combat.mjs` przeszły. Sandbox blokuje lokalny port podglądu (`listen EPERM`), więc rzeczywiste próby przeglądarkowe i zrzuty 390×844/1280×900 uruchomiono w `.github/workflows/combat-checks.yml` w PR #5. Wynik CI i wdrożenia zostanie dopisany po zakończeniu prób; na tym etapie nie zgłoszono ich jako zaliczonych.
