const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');import assert from 'node:assert/strict';import fs from 'node:fs';
fs.mkdirSync("artifacts",{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4174');await page.waitForFunction(()=>window.__blocksTest,{timeout:60000});
 const load=await page.evaluate(()=>{const t=window.__blocksTest;return {assets:t.artwork.size,pilots:t.data.modules.filter(m=>t.artFor(m)).length,water:t.data.water.length,grass:t.data.terrainCleanup.paving.length}});assert.equal(load.assets,4);assert.ok(load.pilots>0);
 await page.locator('#pilot-house').click();await page.screenshot({path:`artifacts/pilot-house-${name}.png`});
 await page.locator('#pilot-apartment').click();await page.screenshot({path:`artifacts/pilot-apartment-${name}.png`});
 await page.selectOption('#art','elven');await page.screenshot({path:`artifacts/pilot-elven-${name}.png`});await page.selectOption('#art','simple');assert.equal(await page.evaluate(()=>window.__blocksTest.data.modules.filter(m=>window.__blocksTest.artFor(m)).length),0);await page.selectOption('#art','steam');
 if(await page.evaluate(()=>window.__blocksTest.data.synthetic===true)){await page.locator('#kit-demo').click();await page.waitForFunction(()=>!window.__blocksTest.data.synthetic);}
 await page.locator('#home').click();
 const target=await page.evaluate(()=>{const t=window.__blocksTest,a=t.actor,roads=new Set(t.data.roadCells.map(c=>c.xy.join(',')));for(let radius=1;radius<4;radius+=.5)for(let i=0;i<32;i++){const angle=i*Math.PI/16,p=[a[0]+Math.cos(angle)*radius+.023,a[1]+Math.sin(angle)*radius+.017];if(!roads.has(p.map(Math.floor).join(','))&&t.nav.free(p)&&t.nav.clear(a,p)){if(t.route(p))return p;}}throw Error('No nearby free grass target');});
 await page.waitForFunction(p=>Math.hypot(window.__blocksTest.actor[0]-p[0],window.__blocksTest.actor[1]-p[1])<.005,target,{timeout:7000});
 const movement=await page.evaluate(()=>{const t=window.__blocksTest;for(const [key,d] of [['d',[.5,-.5]],['a',[-.5,.5]],['w',[-.5,-.5]],['s',[.5,.5]]])if(t.nav.clear(t.actor,t.actor.map((v,i)=>v+d[i])))return {key,before:[...t.actor]};throw Error('No manual space');});
 await page.locator('#map').click({position:{x:20,y:190}}); // clear focus; replace any click route with keyboard input
 await page.keyboard.down(movement.key);await page.waitForTimeout(250);await page.keyboard.up(movement.key);const after=await page.evaluate(()=>window.__blocksTest.actor);assert.ok(Math.hypot(after[0]-movement.before[0],after[1]-movement.before[1])>.1);
 const collision=await page.evaluate(()=>{const t=window.__blocksTest;return t.route(t.data.modules[0].pos)});assert.equal(collision,false);
 assert.deepEqual(errors,[]);results.push({name,...load,freeGrassTarget:target,keyboardMoved:true,blockedBuilding:true,errors});await page.close();
}
fs.writeFileSync('data/free-pilot-browser-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
