const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///home/claude/szyldy/index.html');await p.waitForFunction(()=>window.__ok);await (await p.$('#scena')).screenshot({path:'scena.png'});await b.close();})();
