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
