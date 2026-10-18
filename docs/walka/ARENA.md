# Arena Cechu – asynchroniczne PvP (etap 1, TEST)

Decyzje właściciela (18.10.2026): Arena Cechu poza mapą; wpisowe 100, wygrana 150; rywal = duch innej postaci ±1 poziom;
duch walczy automatycznie danego dnia tylko, jeśli jego właściciel stoczył tego dnia choć jedną walkę na arenie;
raz dziennie list w skrzyni w domu z podsumowaniem, po otwarciu 10 złota za każdą automatycznie wygraną walkę;
limit 5 walk na godzinę, 15 dziennie; wspólny zestaw (1 leczenie na walkę, mikstury z plecaka nie znikają).

- Wejście: Sędzia Areny na dużych boiskach/stadionach (Ambient.ts `judgeOf`, rola `sedzia`, tylko gdy `tury()`).
- Scena `arena` (src/scenes/ArenaScene.ts): okrągła płyta poza mapą; wygląd jeden z ARENY_WYGLADY (mosiężna / kamienna / ogrodowa)
  wybrany po nazwie miasta, 8 masztów z flagą kraju (content/flagi.ts), tabliczka „ARENA CECHU · MIASTO”, trybuny z widzami, para.
  Herb/flaga miasta – czeka na rysunki grafika.
- Walka: TuryWalki z `pvp` (duch: atak, trafienie, blok, mocny cios, jedno leczenie, strzał), ucieczka = przegrana.
- Brak rywala: Mechaniczny Gladiator (ARENA.gladiator).
- Serwer: docs/sql/arena.sql (tabele arena_duchy, arena_bilety, arena_obrony; RPC arena_rywal, arena_wynik, arena_listy,
  arena_odbierz, arena_ranking; Elo K=32, start 1000; postacie testowe spotykają tylko testowe i nie ma ich w rankingu).
- Liczby: src/content/arena.ts. Test: scripts/tests/browser-arena.mjs (TELEFON=1).
- Środek płyty: herb miasta z HERBY_ARENY (content/arena.ts, nazwa miasta → plik), a bez niego logo Exp-lore (public/logo-256.png)
  „wsypane” w piasek jak mozaika Targów (GODLO_W_PIASKU: rozmycie, mieszanie z piaskiem, nasypy, postrzępiony brzeg; ArenaScene.godloWPiasku).
- Zamówienie dla grafika: docs/poczta/do-grafika/2026-10-18_38-P001_arena.md (herb Lublina, gladiatorzy, Sędzia, tablica wyników, arena).
- Grafiki grafika (38-G001, wdrożone 18.10.2026 na test): `scripts/arena-grafiki.py` kopiuje płytę/tył/herb do public/swiat/arena/ i składa Sędziego i Gladiatora (public/postacie/sedzia_proba, gladiator_proba; STALE_HD.sedzia/gladiator). ArenaScene.rysujArene: ARENA_RYSUNEK w content/arena.ts (środek płyty, półoś, spłaszczenie 0,85, maszty flag, tabliczka); ruch tylko w elipsie płyty; kamera pokazuje całą arenę (TuryWalki host `kadr`). Stary rysunek kodem zostaje jako zapas, gdy obrazki się nie wczytają. Odpowiedź dla grafika: 38-P003.
- Tło (właściciel 18.10.2026: „nie podoba mi się czarne tło”): za areną widać zatrzymane miasto, w którym stoi Sędzia – rozmyte (blur kamery gry, filters.external; internal na zatrzymanej scenie dawał czerń), przyciemnione (ARENA.tloRozmycie/tloPrzyciemnienie) i z miękkim cieniem pod budowlą.
