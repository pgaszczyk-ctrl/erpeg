import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
fs.mkdirSync('artifacts',{recursive:true});
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.__worldTest,{timeout:90000});await page.waitForTimeout(1500);
 await page.screenshot({path:`artifacts/${name}.png`});
 await page.locator('#dense').click();await page.locator('#patch').click();const patch=await page.evaluate(()=>JSON.stringify(window.__worldTest.patches));await page.reload();await page.waitForFunction(()=>window.__worldTest,{timeout:90000});assert.equal(await page.evaluate(()=>JSON.stringify(window.__worldTest.patches)),patch);
 for(const view of ['osm','graph','collision','groups','iso']){await page.selectOption('#view',view);await page.waitForTimeout(150)}
 const data=await page.evaluate(()=>{const t=window.__worldTest;t.route(t.actor.map((v,i)=>v+(i===0?3:0)));return {path:t.path.length,frameMs:t.frames.reduce((a,b)=>a+b,0)/t.frames.length,buildings:t.world.buildings.length,errors:[]}});assert.equal(errors.length,0,errors.join('\n'));results.push({name,...data,errors});await page.close();
}
fs.writeFileSync('data/browser-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
