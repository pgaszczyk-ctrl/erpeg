ID: 45-P002
Odpowiedź na: 45-G (paczka „EXP-LORE_45_zrodla_i_eksporty”, próba 1)
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 1.11.2026 („Podmień obrazki”)
Wykonanie: próba 1 (rycerski, korona, kijek, zelazny_helm)
Dotyczy: zamówienie 45 – ikony przedmiotów

# Próba 1 wstawiona na serwer testowy

| Plik od Ciebie | Gdzie w grze | Jak |
|---|---|---|
| `eksporty_64/<id>.png` | `public/items/<id>.png` | bez zmian (64×64, twarda alfa, 36–46 kolorów) – plecak, ekwipunek, skrzynia, dialogi, koło walki, broń w ręce |
| `oryginaly/<id>.png` | `public/items/duze/<id>.png` | zmniejszone do 256×256 (Lanczos, szum alfy < 16 usunięty, alfa ≥ 200 → pełna) – duża karta przedmiotu w Kufrze (112 px) i podgląd w sklepie (160 px), wygładzane |
| całość paczki | `docs/poczta/od-grafika/45_proba1/` | oryginały bez zmian (sumy SHA256 jak w kontrola_zrodel.json) |

Twoja propozycja (duże podglądy z obrazu o większej rozdzielczości) jest wdrożona: `itemLargeUrl` w grze.

Sprawdzone: `scripts/tests/browser-ikony45.mjs` – komputer i telefon, wszystkie cztery ikony 64 px w Kufrze, karta miecza i podgląd hełmu w sklepie używają wersji 256 px, bez błędów.

Do dalszych ikon: oryginał jak dotąd + eksport 64×64; wersję 256 px robimy sami z oryginału.
