ID: 43-P001
Odpowiedź na: 39-G005 (HUD „zbiornik v3.1”)
Od: programista
Do: grafik
Status: nowe
Akceptacja: zaakceptowane przez właściciela (26.10.2026: „użyj HUD-u z lewego górnego rogu, tylko dodaj 2 rurki, ewentualnie opisz grafikowi; nie chcę tam baniaka z HP”)
Wykonanie: –
Dotyczy: dwie szklane rurki obok portretu w HUD-zie teleskopowym (życie i siły/mana)

# Zamówienie 43: dwie rurki przy portrecie

## Dlaczego

Na serwerze testowym walka jest znowu na żywo (bez tur). Gracz musi cały czas widzieć **życie** i **siły**
(zmęczenie: miecz/łuk) – a z różdżką w ręce **manę**. Właściciel chce zostawić Twój HUD z portretem
i zbiornikiem EXP (39-G004/G005) i dołożyć do niego tylko **dwie pionowe rurki** – bez osobnego baniaka.
Dziś rurki są narysowane kodem (zrzut: `43_rurki/teraz_rurki_z_kodu.png`, lewy górny róg) – proszę
o wersję w stylu zbiornika.

## Co narysować (warstwy jak przy zbiorniku, @3x)

Wymiary w px HUD-u (×3 w pliku), układ jak na zrzucie: rurki stoją **na prawo od pierścienia portretu**,
połączone z nim krótką mosiężną rurką na wysokości ok. połowy portretu.

| Plik | Rozmiar @1x | Co to |
|---|---|---|
| `rurka_oprawa.png` | 12 × 60 | mosiężna oprawa jednej rurki: kapsle u góry i u dołu, nity, przezroczyste wnętrze |
| `rurka_szklo.png` | 12 × 60 | odblask szkła (półprzezroczysty), kładziony NA płyn |
| `rurka_maska.png` | 12 × 60 | biała maska wnętrza (gdzie może być płyn) |
| `rurka_tafla.png` | 12 × 4 | pasek powierzchni płynu (jasna krawędź menisku) |
| `rurka_lacznik.png` | 10 × 8 | krótka rurka z pierścienia portretu do pierwszej rurki i między rurkami |
| `rurka_podzialka.png` | 12 × 60 | (opcjonalnie) delikatne kreski podziałki co 1/5 wysokości |

Płyn barwimy w kodzie (czerwony życie, niebieski bonus z mikstury na wierzchu, zielony przy zatruciu;
złoty siły, pomarańczowo-czerwony przy wyczerpaniu, niebieski mana), więc **płynu nie rysuj** –
wystarczy maska wnętrza. Kolorystyka oprawy: ten sam mosiądz co pierścień portretu i `lacznik.png`.

## Ograniczenia

- Ma się mieścić na telefonie trzymanym **poziomo** (wysokość ekranu ok. 360–400 px): rurka nie wyższa
  niż portret + tabliczka poziomu (ok. 60 px @1x).
- Czytelna na ciemnym i na jasnym tle mapy (trawa, bruk) – stąd ciemne szkło jak w zbiorniku.
- Bez napisów i liczb (wartość pokazujemy w podpowiedzi po dotknięciu).

## Próba

Najpierw jedna rurka (oprawa + szkło + maska) i podgląd obok portretu ×3; po akceptacji reszta.
