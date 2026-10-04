// ============================================================================
//  QUIZY OD GEMINI: schemat odpowiedzi i polecenie (panel admina → 🧠 Quizy,
//  kopia w docs/quizy-gemini.md). Gemini zwraca JSON zgodny ze SCHEMAT_QUIZOW,
//  który wkleja się w panelu albo wysyła funkcją add_quizzes z kluczem.
// ============================================================================

export const KATEGORIE_QUIZOW = ['matematyka', 'łamigłówka', 'zagadka', 'przyroda', 'geografia', 'historia', 'język', 'nauka', 'sztuka', 'sport', 'Lubelszczyzna'] as const;

export const POZIOMY_QUIZOW = ['0 – maluch (5–7 lat)', '1 – uczeń (8–9 lat)', '2 – odkrywca (10–12 lat)', '3 – mędrzec (nastolatki i dorośli)'];

/**
 * Schemat odpowiedzi dla Gemini (structured output: responseMimeType "application/json",
 * responseSchema = to). Format OpenAPI, który Gemini rozumie.
 */
export const SCHEMAT_QUIZOW = {
  type: 'object',
  properties: {
    quizzes: {
      type: 'array',
      description: 'Pytania quizowe po polsku.',
      items: {
        type: 'object',
        properties: {
          level: { type: 'integer', minimum: 0, maximum: 3, description: '0: 5–7 lat, 1: 8–9 lat, 2: 10–12 lat, 3: nastolatki i dorośli' },
          category: { type: 'string', enum: [...KATEGORIE_QUIZOW] },
          question: { type: 'string', maxLength: 300, description: 'Pytanie po polsku, jednoznaczne.' },
          answers: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string', maxLength: 120 }, description: 'PIERWSZA odpowiedź jest dobra, pozostałe wiarygodne, ale na pewno złe. Wszystkie różne.' },
        },
        required: ['level', 'category', 'question', 'answers'],
        propertyOrdering: ['level', 'category', 'question', 'answers'],
      },
    },
  },
  required: ['quizzes'],
};

/** Polecenie dla Gemini (do wklejenia w czacie albo w programie na harmonogramie). */
export const POLECENIE_GEMINI = `Przygotuj 200 nowych pytań quizowych po polsku do gry przygodowej dla dzieci i dorosłych (szkoły w grze zadają je graczom).

Po 50 pytań na każdy poziom:
- level 0: dzieci 5–7 lat (proste słowa, rachunki do 10, zwierzęta, kolory),
- level 1: 8–9 lat (tabliczka mnożenia, ortografia, przyroda, Polska),
- level 2: 10–12 lat (ułamki, procenty, geografia świata, historia Polski),
- level 3: nastolatki i dorośli (wiedza szkolna i ogólna).

Kategorie: ${KATEGORIE_QUIZOW.join(', ')}. Mniej więcej jedna trzecia pytań to matematyka i łamigłówki liczbowe.

Zasady:
1. Każde pytanie ma 3–4 krótkie odpowiedzi. PIERWSZA odpowiedź jest poprawna (gra sama je tasuje). Pozostałe są wiarygodne, ale na pewno złe.
2. Każdy fakt musi być pewny i niezmienny w czasie (żadnych rekordów, rankingów, cen, „obecnych” prezydentów, liczby ludności).
3. Pytanie jednoznaczne: tylko jedna odpowiedź może być dobra, także przy zagadkach.
4. Język przyjazny dzieciom, bez przemocy i treści dla dorosłych.
5. Bez powtórek i bez pytań bardzo podobnych do siebie.
6. Sprawdź każdy rachunek dwa razy.

Odpowiedz wyłącznie obiektem JSON w formacie:
{"quizzes": [{"level": 0, "category": "przyroda", "question": "Które zwierzę mówi „muu”?", "answers": ["Krowa", "Kot", "Kaczka", "Pies"]}]}`;

export interface PytanieZGemini { level: number; category: string; question: string; answers: string[] }

/** Sprawdza wklejoną odpowiedź: zwraca dobre pytania i opis błędów (numer pytania od 1). */
export function sprawdzQuizy(text: string): { ok: PytanieZGemini[]; bledy: string[] } {
  const bledy: string[] = [];
  let data: unknown;
  // Gemini bywa, że otacza JSON znakami ``` – zdejmujemy je.
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    data = JSON.parse(clean);
  } catch (e) {
    return { ok: [], bledy: [`To nie jest poprawny JSON: ${(e as Error).message}`] };
  }
  const list = Array.isArray(data) ? data : (data as { quizzes?: unknown })?.quizzes;
  if (!Array.isArray(list)) return { ok: [], bledy: ['Brak listy „quizzes”.'] };
  const ok: PytanieZGemini[] = [];
  const seen = new Set<string>();
  list.forEach((q: Partial<PytanieZGemini>, i) => {
    const n = i + 1;
    const ans = Array.isArray(q?.answers) ? q.answers.map((a) => String(a).trim()).filter(Boolean) : [];
    if (!Number.isInteger(q?.level) || q.level! < 0 || q.level! > 3) return void bledy.push(`${n}: level musi być 0–3.`);
    if (!q.question || !String(q.question).trim()) return void bledy.push(`${n}: brak pytania.`);
    if (String(q.question).length > 300) return void bledy.push(`${n}: pytanie dłuższe niż 300 znaków.`);
    if (ans.length < 2 || ans.length > 5) return void bledy.push(`${n}: potrzeba 2–5 odpowiedzi.`);
    if (new Set(ans).size !== ans.length) return void bledy.push(`${n}: odpowiedzi się powtarzają.`);
    const k = String(q.question).trim().toLowerCase();
    if (seen.has(k)) return void bledy.push(`${n}: to samo pytanie drugi raz.`);
    seen.add(k);
    ok.push({ level: q.level!, category: String(q.category ?? '').slice(0, 40), question: String(q.question).trim(), answers: ans });
  });
  return { ok, bledy };
}
