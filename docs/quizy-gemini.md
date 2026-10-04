# Quizy od Gemini

Pytania do szkół w grze może pisać Gemini. Są dwa sposoby:

1. **Ręcznie** – w panelu admina, zakładka **🧠 Quizy**: kopiujesz polecenie, wklejasz je w czacie Gemini, a jego odpowiedź wklejasz z powrotem w panelu („Sprawdź”, potem „Wgraj do gry”). Panel sam odrzuca złe pytania (brak odpowiedzi, powtórki, zły poziom) i mówi, ile przeszło.
2. **Automatycznie** – program na harmonogramie (np. Google Apps Script albo Cloud Scheduler) co dzień pyta Gemini i wysyła wynik do gry funkcją `add_quizzes` z kluczem z panelu (zakładka 🧠 Quizy → „Wygeneruj nowy klucz”).

Każda paczka jest ważna 5 dni. Gdy przez kilka dni nic nie przyjdzie, gra bierze stare pytania z zapasu (najpierw te, na które nikt jeszcze nie odpowiedział), a gdy i zapasu brak – układa więcej rachunków. Powtórki są odrzucane na zawsze (`quiz_history`).

## Polecenie dla Gemini

To samo co w panelu (`src/content/quizyGemini.ts`, `POLECENIE_GEMINI`):

```
Przygotuj 200 nowych pytań quizowych po polsku do gry przygodowej dla dzieci i dorosłych (szkoły w grze zadają je graczom).

Po 50 pytań na każdy poziom:
- level 0: dzieci 5–7 lat (proste słowa, rachunki do 10, zwierzęta, kolory),
- level 1: 8–9 lat (tabliczka mnożenia, ortografia, przyroda, Polska),
- level 2: 10–12 lat (ułamki, procenty, geografia świata, historia Polski),
- level 3: nastolatki i dorośli (wiedza szkolna i ogólna).

Kategorie: matematyka, łamigłówka, zagadka, przyroda, geografia, historia, język, nauka, sztuka, sport, Lubelszczyzna. Mniej więcej jedna trzecia pytań to matematyka i łamigłówki liczbowe.

Kraj (pole "country"): gra toczy się na prawdziwej mapie świata i szkoła zadaje pytanie tylko tam, gdzie ma ono sens.
- "" (puste) – pytanie ogólne, dobre w każdym kraju (matematyka, przyroda, nauka, historia i geografia świata, np. piramidy w Egipcie jako ciekawostka o świecie).
- Kod kraju, np. "PL" – pytanie o historię, geografię, kulturę, język, święta lub sławnych ludzi jednego kraju (np. chrzest Polski, Wisła, ortografia polska, kategoria Lubelszczyzna = zawsze "PL"). Takie pytanie dostaną tylko gracze w szkołach w tym kraju, więc nikt w Polsce nie zostanie zapytany o historię feudalnej Japonii ("JP").
Większość pytań niech będzie ogólna albo "PL"; pytania o inne kraje (np. "JP", "FR", "IT", "GB", "DE") tylko czasem, jako ciekawostki dla podróżników.

Zasady:
1. Każde pytanie ma 3–4 krótkie odpowiedzi. PIERWSZA odpowiedź jest poprawna (gra sama je tasuje). Pozostałe są wiarygodne, ale na pewno złe.
2. Każdy fakt musi być pewny i niezmienny w czasie (żadnych rekordów, rankingów, cen, „obecnych” prezydentów, liczby ludności).
3. Pytanie jednoznaczne: tylko jedna odpowiedź może być dobra, także przy zagadkach.
4. Język przyjazny dzieciom, bez przemocy i treści dla dorosłych.
5. Bez powtórek i bez pytań bardzo podobnych do siebie.
6. Sprawdź każdy rachunek dwa razy.

Odpowiedz wyłącznie obiektem JSON w formacie:
{"quizzes": [{"level": 0, "category": "przyroda", "country": "", "question": "Które zwierzę mówi „muu”?", "answers": ["Krowa", "Kot", "Kaczka", "Pies"]}, {"level": 2, "category": "historia", "country": "PL", "question": "W którym roku odbył się chrzest Polski?", "answers": ["966", "1025", "1410", "1569"]}]}
```

## Schemat odpowiedzi

Plik `docs/quiz-schema.json` (to samo co `SCHEMAT_QUIZOW`). W Gemini API ustaw:

- `generationConfig.responseMimeType` = `"application/json"`,
- `generationConfig.responseSchema` = zawartość `docs/quiz-schema.json`.

Wtedy Gemini zawsze odda obiekt `{"quizzes": [ … ]}`, w którym każde pytanie ma:

| pole | co to |
|---|---|
| `level` | 0 maluch (5–7 lat), 1 uczeń (8–9), 2 odkrywca (10–12), 3 mędrzec (starsi i dorośli) |
| `category` | jedna z: matematyka, łamigłówka, zagadka, przyroda, geografia, historia, język, nauka, sztuka, sport, Lubelszczyzna |
| `country` | `""` = pytanie ogólne (zadawane w każdym kraju) albo kod kraju (dwie litery, np. `PL`, `JP`), gdy pytanie dotyczy tylko jednego kraju – wtedy zadają je tylko szkoły w tym kraju (gra rozpoznaje kraj po miejscu szkoły, `src/kraj.ts`). Lubelszczyzna = zawsze `PL`. Bez pola = ogólne. W panelu kraj każdego pytania można zmienić (przycisk w kolumnie „Kraj”). |
| `question` | pytanie po polsku, do 300 znaków |
| `answers` | 3–4 odpowiedzi, **pierwsza dobra**, każda do 120 znaków, wszystkie różne |

## Wysyłanie do gry (program)

```
POST https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/add_quizzes
apikey: sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA
Authorization: Bearer sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA
Content-Type: application/json

{ "p_key": "<KLUCZ Z PANELU>", "p_days": 5, "p_quizzes": <lista "quizzes" od Gemini> }
```

Odpowiedź: `{"added": 180, "repeated": 15, "skipped": 5, "active": 400}` albo `{"error": "…"}`. Klucza nie wklejaj nigdzie publicznie; 5 złych prób blokuje go na 10 minut.

## Przykład: Google Apps Script (raz dziennie)

```js
function quizyDoGry() {
  const GEMINI_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  const QUIZ_KEY = PropertiesService.getScriptProperties().getProperty('QUIZ_KEY');
  const prompt = '…polecenie z panelu…';
  const schema = { /* zawartość docs/quiz-schema.json */ };
  const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }),
  });
  const quizzes = JSON.parse(JSON.parse(r.getContentText()).candidates[0].content.parts[0].text).quizzes;
  const up = UrlFetchApp.fetch('https://iiffchuhrhsjjgmstypx.supabase.co/rest/v1/rpc/add_quizzes', {
    method: 'post', contentType: 'application/json',
    headers: { apikey: 'sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA', Authorization: 'Bearer sb_publishable_lvVeo1Qv3E_4wTQ2oUeI1Q_2_gAgUdA' },
    payload: JSON.stringify({ p_key: QUIZ_KEY, p_days: 5, p_quizzes: quizzes }),
  });
  Logger.log(up.getContentText());
}
```

Model i nazwy pól API mogą się zmienić – sprawdź aktualną dokumentację Gemini przed uruchomieniem.
