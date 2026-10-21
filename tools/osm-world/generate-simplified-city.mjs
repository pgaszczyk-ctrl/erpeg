import fs from 'node:fs';import {simplifyCity} from './simplified-city.mjs';
const city=simplifyCity(JSON.parse(fs.readFileSync(process.argv[2]||'public/world.json')));fs.writeFileSync('public/city-5x5.json',JSON.stringify(city));fs.writeFileSync('data/city-5x5-report.json',JSON.stringify(city.report,null,2)+'\n');console.log(city.report);
