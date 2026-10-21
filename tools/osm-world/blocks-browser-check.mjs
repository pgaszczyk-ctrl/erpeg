const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const result=[];
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['phone',{width:390,height:844}]]) {
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.__blocksTest);await page.waitForTimeout(200);
 await page.screenshot({path:`artifacts/blocks-${name}.png`});
 await page.selectOption('#view','grid');await page.locator('#next').click();assert.ok(await page.evaluate(()=>window.__blocksTest.selected.ports.length));
 await page.screenshot({path:`artifacts/blocks-grid-${name}.png`});
 for(const mode of ['ports','source','iso']){await page.selectOption('#view',mode);await page.waitForTimeout(50);}
 const route=await page.evaluate(()=>{const t=window.__blocksTest,a=t.actor;const near=t.data.roadCells.filter(c=>Math.hypot(c.xy[0]+.5-a[0],c.xy[1]+.5-a[1])>3&&Math.hypot(c.xy[0]+.5-a[0],c.xy[1]+.5-a[1])<5);for(const c of near)if(t.route(c.xy.map(v=>v+.5)))return {before:[...t.actor],path:t.path.length};throw Error('No nearby connected route');});assert.ok(route.path>0);await page.waitForTimeout(1200);const actor=await page.evaluate(()=>window.__blocksTest.actor);assert.ok(Math.hypot(actor[0]-route.before[0],actor[1]-route.before[1])>.1);
 await page.locator('#build').click();await page.waitForTimeout(400);const partial=await page.evaluate(()=>window.__blocksTest.visibleCount);assert.ok(partial>0&&partial<1600);await page.locator('#build').click();
 assert.deepEqual(errors,[]);result.push({name,errors,partialBlocks:partial,routeCells:route.path,actorMoved:true});await page.close();
}
fs.writeFileSync('data/blocks-browser-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
