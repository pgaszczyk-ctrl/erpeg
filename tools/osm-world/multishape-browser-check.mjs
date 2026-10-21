const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');import assert from 'node:assert/strict';import fs from 'node:fs';
fs.mkdirSync("artifacts",{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const reports=[];
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.__blocksTest,{timeout:60000});
 const info=await page.evaluate(()=>{const t=window.__blocksTest;return {scale:t.data.scale,modules:t.data.modules.length,multi:t.data.report.multiBlockModules,joins:t.data.buildingJoins.length}});assert.ok(Math.abs(info.scale.denominator-31.48148)<.001);assert.ok(info.multi>0);assert.ok(info.joins>0);
 await page.locator('#overview').click();await page.screenshot({path:`artifacts/multishape-map-${name}.png`});
 await page.locator('#kit-demo').click();await page.waitForFunction(()=>window.__blocksTest.data.synthetic===true);await page.screenshot({path:`artifacts/multishape-gallery-${name}.png`});
 const gallery=await page.evaluate(()=>{const t=window.__blocksTest;const U=t.data.modules.find(m=>m.shapeId==='court-U');return {joints:t.data.buildingJoins.length,shapes:t.data.modules.map(m=>m.shapeId),courtyardFree:t.nav.free([U.pos[0],U.pos[1]+.5]),parts:t.data.modules.find(m=>m.shapeId==='wing-L').parts.length}});assert.equal(gallery.joints,2);assert.ok(gallery.courtyardFree);assert.equal(gallery.parts,5);
 await page.selectOption('#art','elven');await page.locator('#pilot-apartment').click();await page.screenshot({path:`artifacts/multishape-pilot-${name}.png`});
 await page.locator('#kit-demo').click();await page.waitForFunction(()=>!window.__blocksTest.data.synthetic);
 const route=await page.evaluate(()=>{const t=window.__blocksTest,a=t.actor;for(let i=0;i<32;i++){const p=[a[0]+1.2*Math.cos(i*Math.PI/16)+.023,a[1]+1.2*Math.sin(i*Math.PI/16)+.017];if(t.nav.clear(a,p)&&t.route(p))return {p,before:[...a]};}throw Error('No walkable target');});await page.waitForFunction(p=>Math.hypot(window.__blocksTest.actor[0]-p[0],window.__blocksTest.actor[1]-p[1])<.005,route.p,{timeout:7000});
 assert.deepEqual(errors,[]);reports.push({name,modules:info.modules,multi:info.multi,joins:info.joins,denominator:info.scale.denominator,modelSeconds:info.scale.modelTravelSeconds,gallery,continuousMovement:true,errors});await page.close();
}
fs.writeFileSync('data/multishape-browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));await browser.close();
