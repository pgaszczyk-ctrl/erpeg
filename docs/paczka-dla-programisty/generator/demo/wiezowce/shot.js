const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1100,height:1300}});p.on('console',m=>console.log(m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///home/claude/wiezowce/index.html');await p.waitForFunction(()=>window.__ok,null,{timeout:60000});
const c=await p.$$('div');for(let i=0;i<c.length;i++)await c[i].screenshot({path:`p_${i}.png`});await b.close();})();
