// Buduje i uruchamia scripts/tests/siedliska.ts (rolldown z node_modules), jak lochy-plan.mjs.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(mkdtempSync(join(tmpdir(), 'siedliska-')), 'test.mjs');
execFileSync('npx', ['rolldown', 'scripts/tests/siedliska.ts', '--file', out, '--format', 'esm', '--platform', 'node'], { stdio: 'inherit' });
execFileSync('node', [out], { stdio: 'inherit' });
