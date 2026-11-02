import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('.cache',{recursive:true});
execFileSync(process.execPath,['node_modules/rolldown/bin/cli.mjs','scripts/architecture/test.ts','--file','.cache/architecture-tests.mjs','--format','esm','--platform','node'],{stdio:'inherit'});
execFileSync(process.execPath,['.cache/architecture-tests.mjs'],{stdio:'inherit'});
