# Quizy w szkołach – jak wgrywać nowe pytania

Szkoły w grze zadają quizy. Pytania pochodzą z trzech źródeł:

1. **z serwera** – tabela `quizzes`, wgrywana przez zewnętrzny program (np. inny AI uruchamiany codziennie),
2. **wbudowane** – `src/content/quizy.ts` (gdy serwer nic nie da),
3. **losowane przez grę** – rachunki, ciągi liczb, zegar, zadania z treścią (nigdy się nie kończą).

Każda paczka z serwera jest ważna **2 dni** (dziś i jutro). Program wgrywa nową paczkę codziennie, więc zawsze są pytania na dziś, nawet gdy jedno wgranie się nie uda. Przy każdym wgraniu przeterminowane pytania znikają same.

## Klucz

Panel admina → Ustawienia → „🧠 Quizy w szkołach” → **Wygeneruj nowy klucz**. Klucz jest pokazany tylko raz. Wpisz go do programu (nie wklejaj go nigdzie publicznie). Pięć złych prób blokuje klucz na 10 minut.

## Wgrywanie (HTTP)

```
POST https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/add_quizzes
apikey: sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA
Authorization: Bearer sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA
Content-Type: application/json

{
  "p_key": "<KLUCZ>",
  "p_days": 2,
  "p_quizzes": [
    { "level": 0, "category": "przyroda", "question": "Które zwierzę robi „muu”?", "answers": ["Krowa", "Kot", "Kaczka", "Pies"] }
  ]
}
```

Odpowiedź: `{"added": 120, "skipped": 0, "active": 240}` albo `{"error": "…"}`.

Zasady:

- `level`: 0 maluch (do 7 lat), 1 uczeń (8–9), 2 odkrywca (10–12), 3 mędrzec (starsi i dorośli),
- `answers`: 2–5 różnych odpowiedzi, **pierwsza jest dobra** (gra je tasuje), każda do 120 znaków,
- `question`: do 300 znaków, `category`: krótko (np. matematyka, łamigłówka, przyroda, geografia, historia, język, nauka),
- najwyżej 1000 pytań naraz, `p_days` od 1 do 7 (domyślnie 2).

Dobrze jest wgrywać codziennie ok. 50–100 pytań na każdy poziom. Każda szkoła zadaje 50 pytań dziennie (od 31. trudniejsze o poziom, od 41. o dwa) (`SZKOLA_QUIZ` w `src/content/quizy.ts`).

## Gotowe polecenie dla innego AI (uruchamianego codziennie)

> Przygotuj 300 nowych pytań quizowych po polsku do gry dla dzieci i dorosłych: po 75 na poziom 0 (5–7 lat), 1 (8–9 lat), 2 (10–12 lat) i 3 (nastolatki i dorośli). Mieszaj kategorie: matematyka i łamigłówki logiczne, zagadki słowne, przyroda, geografia (także Lubelszczyzna i Polska), historia Polski, język polski, nauka. Każde pytanie ma 3–4 krótkie odpowiedzi, pierwsza jest dobra, pozostałe są wiarygodne, ale jednoznacznie złe. Sprawdź każdą dobrą odpowiedź. Nie powtarzaj pytań z poprzednich dni. Wyślij je jednym zapytaniem POST na adres powyżej jako `p_quizzes` (format JSON jak w przykładzie), z `p_key` = [KLUCZ] i `p_days` = 2, a potem podaj, co odpowiedział serwer.

## Codzienny generator (Claude)

Routine „Quizy do szkół (Erpeg)” (claude.ai → Routines) uruchamia się codziennie o 2:45 czasu polskiego, uruchamia się w rozmowie Claude, która ma dostęp do bazy, pisze 200 nowych pytań (po 50 na poziom) i wgrywa je przez Supabase (`select public._insert_quizzes(…, 2)`). Tabela `quiz_history` pamięta każde pytanie, jakie kiedykolwiek wgrano, więc powtórki są odrzucane.
