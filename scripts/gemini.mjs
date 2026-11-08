#!/usr/bin/env node
// Pytanie do Gemini (doradca/recenzent projektu).
// Użycie: node scripts/gemini.mjs pytanie.md [plik-z-kontekstem ...]
//     lub: echo "pytanie" | node scripts/gemini.mjs
// Klucz dokłada sieć środowiska (nagłówek Authorization) – w kodzie go nie ma.
// Wysyłamy przez curl: fetch w Node omija pośrednika, który dokłada klucz.
// Odpowiedź strumieniem, bo pośrednik zrywa ciche połączenia po ~30 s.
// GEMINI_MODEL wymusza model; inaczej próbujemy po kolei MODELE (503 = przeciążony).

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MODELE = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
const ADRES = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const NAMYSL = process.env.GEMINI_NAMYSL || 'medium'; // low | medium | high

const ROLA = `Jesteś doradcą i recenzentem projektu gry Exp-lore (Phaser 4 + TypeScript, gra na prawdziwej mapie, telefony przede wszystkim).
Właściciel nie programuje; decyzje o produkcji, danych graczy i bazie należą wyłącznie do niego.
Programistą jest Claude. Odpowiadaj po polsku, konkretnie: priorytety, ryzyka, lepsze alternatywy, uwagi do planu.
Nie wymyślaj faktów o kodzie, którego nie widzisz – pytaj albo zaznacz założenie.`;

const pliki = process.argv.slice(2);
const pytanie = pliki.length
  ? pliki.map((p, i) => (i === 0 ? '' : `\n\n--- ${p} ---\n`) + readFileSync(p, 'utf8')).join('')
  : readFileSync(0, 'utf8');
if (!pytanie.trim()) {
  console.error('Brak pytania.');
  process.exit(1);
}

function zapytaj(model) {
  const body = JSON.stringify({
    model,
    stream: true,
    reasoning_effort: NAMYSL,
    messages: [
      { role: 'system', content: ROLA },
      { role: 'user', content: pytanie },
    ],
  });
  const r = spawnSync(
    'curl',
    ['-sS', '-N', '-m', '600', ADRES, '-H', 'Authorization: Bearer proxy-injected',
      '-H', 'Content-Type: application/json', '--data-binary', '@-'],
    { input: body, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const out = r.stdout || '';
  let tekst = '';
  for (const linia of out.split('\n')) {
    if (!linia.startsWith('data: ') || linia === 'data: [DONE]') continue;
    try {
      tekst += JSON.parse(linia.slice(6)).choices?.[0]?.delta?.content ?? '';
    } catch { /* niepełny kawałek */ }
  }
  if (tekst) return { ok: true, tekst };
  return { ok: false, blad: (out || r.stderr || '').slice(0, 500) };
}

for (const model of MODELE) {
  const w = zapytaj(model);
  if (w.ok) {
    console.error(`[Gemini: ${model}]`);
    console.log(w.tekst);
    process.exit(0);
  }
  console.error(`[${model} nie odpowiedział] ${w.blad.replace(/\s+/g, ' ')}`);
}
process.exit(1);
