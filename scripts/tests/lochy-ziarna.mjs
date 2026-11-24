// Ziarna lochów o zadanej liczbie poziomów (src/loch/plan.ts poziomyLochu), do testów w przeglądarce.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = join(mkdtempSync(join(tmpdir(), 'lochy-ziarna-')), 'plan.mjs');
execFileSync('npx', ['rolldown', 'src/loch/plan.ts', '--file', out, '--format', 'esm', '--platform', 'node'], { stdio: 'ignore' });
const { poziomyLochu } = await import(pathToFileURL(out).href);
/** First seed (from 1) of `rodzaj` whose levels match: { normalne, ukryty }. */
export function ziarno(rodzaj, normalne, ukryty) {
  for (let s = 1; s < 1e6; s++) { const p = poziomyLochu(rodzaj, s); if (p.normalne === normalne && p.ukryty === ukryty) return s; }
  throw new Error('brak ziarna');
}
