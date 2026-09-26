// Builds every game map: Lublin (public/map/lublin.json) and, when the
// region data is there (data/towns.json from scripts/fetch-towns.sh), a small
// map for each town by a railway station (public/map/towns/<id>.json), plus
// public/map/world.json: the towns, their stations and the train links the
// coachmen use. Each map is rebuilt only when its data or the script changed.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';

const run = (args) =>
  new Promise((ok, no) => {
    const p = spawn(process.execPath, ['scripts/build-map.mjs', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (code) => (code === 0 ? ok(out) : no(new Error(`build-map ${args.join(' ')} failed (${code})`))));
  });

process.stdout.write(await run([]));

mkdirSync('public/map', { recursive: true });
if (!existsSync('data/towns.json')) {
  writeFileSync('public/map/world.json', JSON.stringify({ lublin: [], towns: [], edges: [] }));
  console.log('towns: no region data yet (run the "Fetch Lublin map data" workflow)');
  process.exit(0);
}

const plan = JSON.parse(readFileSync('data/towns.json', 'utf8'));
const towns = plan.towns.filter((t) => existsSync(`data/towns/${t.id}.geojsonseq.gz`));
let next = 0;
let built = 0;
const worker = async () => {
  while (next < towns.length) {
    const t = towns[next++];
    const out = await run(['--src', `data/towns/${t.id}.geojsonseq.gz`, '--out', `public/map/towns/${t.id}.json`, '--bbox', t.bbox.join(',')]);
    if (!out.includes('up to date')) built++;
  }
};
await Promise.all(Array.from({ length: Math.max(1, cpus().length) }, worker));
console.log(`towns: ${towns.length} town maps (${built} rebuilt)`);

const rail = existsSync('data/rail.json') ? JSON.parse(readFileSync('data/rail.json', 'utf8')) : { edges: [] };
writeFileSync('public/map/world.json', JSON.stringify({
  lublin: plan.lublin,
  towns: towns.map(({ id, name, stations }) => ({ id, name, stations })),
  edges: rail.edges,
}));
