// Tests the Vite build without opening a listening port. All local HTTP responses come from dist/.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'));}
catch(error){if(process.env.PLAYWRIGHT_MODULE)throw error;({chromium}=createRequire('/workspace/onboarding-tools/package.json')('playwright'));}
const root=process.cwd(),output='docs/architecture/artifacts';await mkdir(output,{recursive:true});
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],chromiumSandbox:false,timeout:15000});
const results=[];
const places=[['kul',51.2476,22.5446,'lublin'],['dziewanny',51.2351,22.5166,'lublin'],['szczytowa',51.2230,22.5349,'lublin'],['old-town',51.2483,22.5679,'lublin'],['apartments',51.2314,22.534,'lublin'],['homes',51.2434,22.5344,'lublin'],['industrial',51.2308,22.599,'lublin'],['bergen',60.3971,5.3245,'world'],['seville',37.3886,-5.9953,'world'],['kyoto',35.003,135.778,'world']].filter(p=>!process.env.ARCHITECTURE_PLACES||process.env.ARCHITECTURE_PLACES.split(',').includes(p[0]));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.woff2':'font/woff2'};
async function staticFiles(route){
 const url=new URL(route.request().url());
 if(url.hostname!=='exp-lore.local'){
  if(url.hostname.endsWith('r2.dev'))try{const res=await route.fetch({timeout:20000});return await route.fulfill({response:res,headers:{...res.headers(),'access-control-allow-origin':'*'}});}catch{}
  return route.abort();
 }
 const name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(root,'dist','.'+name);
 if(!file.startsWith(path.resolve(root,'dist')+path.sep))return route.fulfill({status:403,body:'Forbidden'});
 try{return await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{return route.fulfill({status:404,body:'Not found'});}
}
try{
 for(const [device,width,height,dpr]of [['desktop',1080,900,1],['phone',390,844,2]]){
  for(const [name,lat,lon,mapa]of places){
   if(device==='phone'&&!['homes','dziewanny'].includes(name))continue;
   for(const arch of [0,1]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:device==='phone',isMobile:device==='phone',locale:'pl-PL'});
    await context.route('**/*',staticFiles);
    const page=await context.newPage(),errors=[],glErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/.test(m.text()))glErrors.push(m.text());});
    const url=`https://exp-lore.local/test2.html?lat=${lat}&lon=${lon}&mapa=${mapa}&arch=${arch}&zoom=4&ostrosc=1&view=lower`;
    const entry={device,name,arch,url};
    try{
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
     await page.waitForFunction(()=>window.__test2?.ready(),null,{timeout:120000});
     await page.waitForTimeout(300);
     entry.metrics=await page.evaluate(()=>window.__test2.metrics());
     entry.errors=errors;entry.glErrors=glErrors;
     if(arch){assert.equal(entry.metrics.architecture.failures.length,0);assert(entry.metrics.architecture.visible>0);}
     assert.equal(errors.length,0);assert.equal(glErrors.length,0);
     const file=`${name}-${device}-${arch?'after':'before'}.png`;await page.screenshot({path:`${output}/${file}`});entry.screenshot=file;entry.result='PASS';
     if(arch){
      entry.styleDecisions=await page.evaluate(()=>{const plan=window.__test2.architecture.inspect().plan;return plan.buildings.map(b=>({id:b.id,style:b.decision.style,source:b.decision.source,rule:b.decision.rule,region:b.decision.region,angle:b.angle}));});
      // Real WASD input and camera motion, not just changing the hero's coordinates.
      const start=await page.evaluate(()=>({x:window.__test2.player.x,y:window.__test2.player.y}));
      await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.up('KeyD');
      entry.movement=await page.evaluate(start=>Math.hypot(window.__test2.player.x-start.x,window.__test2.player.y-start.y),start);
      await page.getByRole('link',{name:'Obecny',exact:true}).click();
      await page.waitForFunction(()=>window.__test2.ready(),null,{timeout:60000});
      entry.projectionSwitch=await page.evaluate(()=>window.__test2.metrics().projection.y);
      assert.equal(entry.projectionSwitch,1);
     }
    }catch(e){entry.result='FAIL';entry.error=String(e);entry.errors=errors;entry.glErrors=glErrors;entry.status=await page.locator('#lab-status').textContent().catch(()=>null);entry.metrics=await page.evaluate(()=>window.__test2?.metrics()).catch(()=>null);await page.screenshot({path:`${output}/${name}-${device}-${arch}-failure.png`}).catch(()=>{});}
    results.push(entry);console.log(JSON.stringify({device,name,arch,result:entry.result,error:entry.error,metrics:entry.metrics}));await context.close();
    await writeFile(`${output}/browser-results.json`,JSON.stringify({environment:'Chromium headless / SwiftShader; not a physical Android benchmark',results},null,2)+'\n');
   }
  }
 }
}finally{await browser.close();}
if(!results.length||results.some(r=>r.result!=='PASS'))process.exitCode=1;
