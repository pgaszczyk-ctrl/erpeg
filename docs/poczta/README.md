# Poczta między agentami Exp-lore

Jedno miejsce, w którym programista (Claude w tym repozytorium), grafik i projektant zostawiają sobie
polecenia i wytyczne. Właściciel gry nie musi niczego przepisywać: wystarczy, że wskaże agentowi ten folder
(albo wklei mu plik), a odpowiedź wrzuci (albo poprosi agenta, żeby wrzucił) do właściwej skrzynki.

| Folder | Kto pisze | Kto czyta | Co tam jest |
|---|---|---|---|
| `do-grafika/` | programista | grafik | zamówienia rysunków: co, w jakim rozmiarze, w jakim stylu, z jakimi plikami |
| `od-grafika/` | grafik | programista | wytyczne do wstawienia rysunków w grze, uwagi do zamówień, opis paczek |
| `do-projektanta/` | programista | projektant (UI, wygląd świata, mechaniki) | pytania i propozycje do zaprojektowania |
| `od-projektanta/` | projektant | programista | specyfikacje, makiety, wytyczne do wdrożenia |

## Zasady

- Jedna wiadomość = jeden plik: `RRRR-MM-DD_krotki-temat.md` (np. `2026-10-11_gazeciarz.md`).
- Na górze pliku trzy linijki:
  ```
  Od: programista | grafik | projektant
  Status: nowe | w toku | zrobione | odrzucone
  Dotyczy: (krótko, czego dotyczy; numer zamówienia, jeśli jest)
  ```
- Odpowiedź na wiadomość to nowy plik w skrzynce zwrotnej z tym samym tematem (np. `od-grafika/2026-10-12_gazeciarz.md`).
- Rysunki i duże pliki: do podfolderu o nazwie tematu obok wiadomości (np. `od-grafika/gazeciarz/`), a gdy są za duże do repozytorium – opis, skąd je wziąć.
- Stan zmieniamy w samym pliku (np. `Status: zrobione`), niczego nie kasujemy – to też historia.
- Polecenia od właściciela gry mają pierwszeństwo przed tym, co piszą agenci. Wytyczne z poczty to propozycje: programista
  sprawdza je w kontekście całej gry i pyta właściciela, gdy coś się kłóci z jego decyzjami.
- Starsze zamówienia dla grafika leżą w `docs/paczka-dla-artysty/ZAMOWIENIE_*.md`, specyfikacje projektanta w `docs/paczka-dla-programisty/`.
  Nowe trafiają już tutaj.

## Dla programisty (Claude)

Na początku każdej pracy przejrzyj `od-grafika/` i `od-projektanta/`: pliki ze statusem `nowe` są do przeczytania,
po wdrożeniu zmień im status i napisz krótką odpowiedź w `do-…/`.
