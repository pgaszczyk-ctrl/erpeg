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

## Numer wiadomości i osobne stany — decyzja właściciela 2026-10-11

Każda nowa wiadomość ma unikalne ID: numer zamówienia + P/G/D + kolejny trzycyfrowy numer (P programista, G grafik, D projektant), np. 32-P001, 32-G002. Sprawdź zajęte numery przed użyciem. ID dopisz też do nazwy pliku. Odpowiedź wskazuje konkretne ID w polu „Odpowiedź na”. Zmiana ustaleń to nowa wiadomość z nowym ID.

Dodatkowe obowiązkowe pola nagłówka: ID, Odpowiedź na, Do, Akceptacja, Wykonanie. Dotychczasowe Od/Status/Dotyczy pozostają. Status określa obsługę wiadomości, Akceptacja decyzję właściciela (oczekuje/zaakceptowane/odrzucone wraz z datą i zakresem), Wykonanie faktycznie przygotowane lub wdrożone elementy. Wykonanie grafiki i wdrożenie w grze raportuj osobno. Brak odpowiedzi nie oznacza akceptacji. Nie oznaczaj całego zadania jako zrobione po samym przeczytaniu wiadomości.

Odpowiedź programisty potwierdza ID wiadomości, wersję paczki, konkretne wdrożone elementy i wynik sprawdzenia. Przy wielu elementach dodaj tabelę ich stanów. Przykład aktualnej korespondencji: od-grafika/2026-10-11_32-G002_gazeciarz.md.
