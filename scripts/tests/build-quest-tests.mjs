import { build } from 'vite';
await build({configFile:false, logLevel:'warn', build:{outDir:'.cache/quest-tests', emptyOutDir:true, lib:{entry:{planner:'src/content/questy/planner.ts', scenarios:'src/content/questy/scenarios.ts', text:'src/content/questy/text.ts', city:'src/map/CityMap.ts'},formats:['es'],fileName:(_format,name)=>`${name}.mjs`}}});
