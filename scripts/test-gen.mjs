// Buduje scripts/test-gen.ts (rolldown) i uruchamia.
import { execFileSync } from 'node:child_process';
const out = '.cache/test-gen.mjs';
execFileSync('npx', ['rolldown', 'scripts/test-gen.ts', '--file', out, '--format', 'esm', '--platform', 'node'], { stdio: 'inherit' });
execFileSync('node', [out], { stdio: 'inherit' });
