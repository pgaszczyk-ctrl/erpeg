import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const file=join(mkdtempSync(join(tmpdir(),'prolog-')),'test.mjs');
execFileSync('npx',['rolldown','scripts/tests/prolog.ts','--file',file,'--format','esm','--platform','node'],{stdio:'inherit'});
execFileSync('node',[file],{stdio:'inherit'});
