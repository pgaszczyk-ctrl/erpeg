// Buduje i uruchamia scripts/tests/lochy-plan.ts (rolldown z node_modules).
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(mkdtempSync(join(tmpdir(), 'lochy-')), 'test.mjs');
execFileSync('npx', ['rolldown', 'scripts/tests/lochy-plan.ts', '--file', out, '--format', 'esm', '--platform', 'node'], { stdio: 'inherit' });
execFileSync('node', [out], { stdio: 'inherit' });
