// Archives still used by TEST, the production pin or production overlay patches.
// The monthly uploader must not delete them when its manifest advances.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const sources = [readFileSync('src/map/worldRules.ts', 'utf8')];
const production = readFileSync('PRODUKCJA', 'utf8').trim();
if (!/^[a-f0-9]{40}$/.test(production)) throw new Error('Invalid production commit');
// Older production did not pin an archive. Missing history is not safe to ignore.
execFileSync('git', ['cat-file', '-e', `${production}^{commit}`], { stdio: 'pipe' });
const present = execFileSync('git', ['ls-tree', '--name-only', production, '--', 'src/map/worldRules.ts'], { encoding: 'utf8' }).trim();
if (present) sources.push(execFileSync('git', ['show', `${production}:src/map/worldRules.ts`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
if (existsSync('produkcja')) for (const file of readdirSync('produkcja').filter(f => f.endsWith('.patch')))
  sources.push(readFileSync(`produkcja/${file}`, 'utf8'));
const pins = new Set(sources.flatMap(s => [...s.matchAll(/WORLD_ARCHIVE\s*=\s*['"](world-[a-zA-Z0-9_.-]+\.pmtiles)['"]/g)].map(m => m[1])));
if (!pins.size) throw new Error('No active world archive found');
process.stdout.write([...pins].sort().join('\n') + '\n');
