// Real-location regression: Lublin first, known streets, source plan, before/after
// at the same position, named destinations, and no accidental switch to world tiles.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire('/workspace/onboarding-tools/package.json')('playwright'));}
const output='work/lublin-reference';await mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],timeout:15000});
const mime={'.svg':'image/svg+xml','.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'},results=[];
async function ready(page){await page.waitForFunction(()=>window.__test2?.ready()&&(!window.__test2.architecture||window.__test2.architecture.ready()),null,{timeout:90000});await page.waitForFunction(()=>window.__test2.scene.locator.image.complete&&window.__test2.scene.locator.image.naturalWidth>0,null,{timeout:30000});await page.waitForTimeout(350);}
async function point(page){return page.evaluate(()=>{const lab=window.__test2,p=lab.player,c=lab.scene.cameras.main;return{x:p.x,y:p.y,...lab.city.toLatLon(p.x,p.y),map:lab.city.id,mode:lab.metrics().mapMode,zoomX:c.zoomX,zoomY:c.zoomY};});}
async function navigate(page,locator){await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),locator.click()]);await ready(page);}
try{
 for(const [device,width,height,dpr]of [['desktop',1080,900,1],['phone',390,844,2]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:device==='phone',isMobile:device==='phone'}),external=[];
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='exp-lore.local'){external.push(url.hostname);return route.abort();}
   const file=path.resolve('dist','.'+decodeURIComponent(url.pathname));if(!file.startsWith(path.resolve('dist')+path.sep))return route.fulfill({status:403,body:''});
   try{return await route.fulfill({body:await readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const r={device};
  try{
   await page.goto('https://exp-lore.local/test2.html?ostrosc=1');await ready(page);
   r.initial=await point(page);assert.equal(r.initial.map,'lublin');assert.equal(r.initial.mode,'reference');assert(Math.abs(r.initial.lat-51.24775)<.0005&&Math.abs(r.initial.lon-22.56785)<.0005,'Start by Rynek / Trybunał');
   r.label=await page.locator('#where-label').textContent();assert(r.label.startsWith('Lublin · '));assert(!r.label.includes('bezdroża'));
   const osm=new URL(await page.locator('#osm-location').getAttribute('href'));assert.equal(osm.hostname,'www.openstreetmap.org');assert(Math.abs(Number(osm.searchParams.get('mlat'))-r.initial.lat)<.000001);assert(Math.abs(Number(osm.searchParams.get('mlon'))-r.initial.lon)<.000001);
   r.plan=await page.locator('#lublin-map').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=0;i<d.length;i+=4)if(d[i]!==244||d[i+1]!==236||d[i+2]!==217)ink++;return{width:c.width,height:c.height,ink};});assert(r.plan.ink>500);
   await page.screenshot({path:`${output}/${device}-lublin-before.png`});
   await navigate(page,page.locator('#compare-after'));r.after=await point(page);assert.equal(r.after.mode,'generator');assert.equal(r.after.map,'lublin');assert(Math.hypot(r.after.x-r.initial.x,r.after.y-r.initial.y)<.1,'Comparison must not jump to another place');assert.equal(r.after.zoomX,r.initial.zoomX);assert.equal(r.after.zoomY,r.initial.zoomY);
   await page.screenshot({path:`${output}/${device}-lublin-after.png`});
   await page.locator('#map-extent').click();await page.waitForTimeout(400);assert.equal(await page.locator('#map-extent').textContent(),'Cały Lublin');await page.screenshot({path:`${output}/${device}-neighbourhood.png`});
   for(const [name,lat,lon]of [['kul',51.2476,22.5446],['dziewanny',51.2351,22.5166]]){
    await navigate(page,page.locator(`#reference-map [data-location="${name}"]`));const p=await point(page);assert.equal(p.map,'lublin');assert(Math.abs(p.lat-lat)<.001&&Math.abs(p.lon-lon)<.001,`${name}: keep real Lublin coordinates`);r[name]=p;
   }
   await page.goto('https://exp-lore.local/test2.html?mapa=world&lat=35.003&lon=135.778&arch=0&ostrosc=1');await ready(page);r.foreignLink=await point(page);assert.equal(r.foreignLink.map,'lublin');assert(Math.abs(r.foreignLink.lat-51.24775)<.0005);assert.equal(new URL(page.url()).searchParams.get('mapa'),'lublin');
   assert.equal(await page.locator('[data-location="bergen"],[data-location="seville"],[data-location="kyoto"]').count(),0);
   assert.equal(external.length,0,external.join(','));assert.equal(errors.length,0,errors.join('\n'));r.result='PASS';
  }catch(e){r.result='FAIL';r.error=String(e);r.errors=errors;await page.screenshot({path:`${output}/${device}-failure.png`}).catch(()=>{});}
  results.push(r);console.log(JSON.stringify(r));await writeFile(`${output}/results.json`,JSON.stringify({description:'Actual Lublin data and source overview, known-place navigation, matched camera comparison; desktop and simulated phone.',results},null,2)+'\n');await context.close();
 }
}finally{await browser.close();}
if(results.some(r=>r.result!=='PASS'))process.exitCode=1;
