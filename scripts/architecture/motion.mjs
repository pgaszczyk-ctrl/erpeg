// Real Phaser regression: a house must keep its position relative to a tree and terrain
// through fractional camera moves, zoom/projection changes and actual keyboard walking.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire('/workspace/onboarding-tools/package.json')('playwright'));}
const root=process.cwd(),output='work/architecture-motion';await mkdir(output,{recursive:true});
const before=process.env.MOTION_BASELINE_DIST?path.resolve(process.env.MOTION_BASELINE_DIST):null;
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],timeout:15000});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.css':'text/css','.woff2':'font/woff2'};
const results=[];
async function files(route){
 const url=new URL(route.request().url());if(url.hostname!=='exp-lore.local')return route.abort();
 const prefix=url.pathname.startsWith('/before/')?'/before/':'/after/';
 const base=prefix==='/before/'?before:path.resolve(root,'dist');
 if(!base)return route.abort();
 const file=path.resolve(base,decodeURIComponent(url.pathname.slice(prefix.length)));
 if(!file.startsWith(base+path.sep))return route.fulfill({status:403,body:'Forbidden'});
 try{return await route.fulfill({body:await readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Not found'});}
}
async function trace(page){
 return page.evaluate(async()=>{
  const lab=window.__test2,scene=lab.scene,camera=scene.cameras.main;
  const entries=lab.architecture.sprites;
  const id='geometry:ec072c40:59e7a469',entry=entries.get(id);
  if(!entry)throw new Error(`Expected house missing; loaded=${entries.size}`);
  const house=entry.image;
  const tree=[...lab.renderer.korony.wszystkie].filter(k=>!k.pada&&k.im.visible).map(k=>k.im).sort((a,b)=>Math.hypot(a.x-house.x,a.y-house.y)-Math.hypot(b.x-house.x,b.y-house.y))[0];
  const ground=[...lab.renderer.chunks.values()].find(c=>c.img.visible)?.img;
  if(!tree||!ground)throw new Error('Tree/terrain reference missing');
  const box=house.getBounds(),view=camera.worldView;
  if(Math.min(box.right,view.right)-Math.max(box.left,view.left)<5||Math.min(box.bottom,view.bottom)-Math.max(box.top,view.top)<5)throw new Error('House is outside the actual viewport');
  const canvas=house.texture.getSourceImage(),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===255)opaque++;
  if(opaque<100)throw new Error('House texture is empty');
  const frame=()=>new Promise(resolve=>scene.events.once('postupdate',resolve));
  const project=object=>camera.matrix.transformPoint(object.x-camera.scrollX,object.y-camera.scrollY);
  const sample=()=>{
   const h=project(house),t=project(tree),g=project(ground);
   return {x:house.x,y:house.y,treeX:h.x-t.x,treeY:h.y-t.y,groundX:h.x-g.x,groundY:h.y-g.y,cameraX:camera.scrollX,cameraY:camera.scrollY};
  };
  camera.stopFollow();const origin={x:camera.scrollX,y:camera.scrollY},samples=[];
  for(let i=0;i<32;i++){
   camera.setScroll(origin.x+(i*.137)%2-.9,origin.y+(i*.193)%2-.9);
   await frame();samples.push(sample());
  }
  camera.setScroll(origin.x,origin.y);camera.startFollow(lab.player,true,1,1);await frame();
  window.__motion={samples,walk:[],house,tree,ground,sample};
  scene.events.on('postupdate',window.__motion.record=()=>window.__motion.walk.push(sample()));
  return {id,opaque,samples,projection:lab.metrics().projection,zoomX:camera.zoomX,zoomY:camera.zoomY};
 });
}
function drift(samples){
 const fields=['treeX','treeY','groundX','groundY'];
 return Math.max(...fields.map(key=>Math.max(...samples.map(s=>s[key]))-Math.min(...samples.map(s=>s[key]))));
}
try{
 for(const [device,width,height,dpr]of [['desktop',1080,900,1],['phone',390,844,2]]){
  for(const variant of before?['before','after']:['after']){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:device==='phone',isMobile:device==='phone'});
   await context.route('**/*',files);const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const result={device,variant};
   try{
    await page.goto(`https://exp-lore.local/${variant}/test2.html?arch=1&lat=51.2450352&lon=22.5326420&zoom=2&ostrosc=1&view=lower`);
    await page.waitForFunction(()=>window.__test2?.ready()&&window.__test2.architecture.ready(),null,{timeout:90000});
    await page.screenshot({path:`${output}/${device}-${variant}-lower.png`});
    result.lower=await trace(page);result.lower.drift=drift(result.lower.samples);
    const start=await page.evaluate(()=>({x:window.__test2.player.x,y:window.__test2.player.y}));
    await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyA');await page.waitForTimeout(700);await page.keyboard.up('KeyA');
    result.walk=await page.evaluate(start=>{
     const m=window.__motion,scene=window.__test2.scene;
     scene.events.off('postupdate',m.record);
     return {samples:m.walk,travel:window.__test2.metrics().distanceM,net:Math.hypot(window.__test2.player.x-start.x,window.__test2.player.y-start.y)};
    },start);result.walk.drift=drift(result.walk.samples);
    assert(result.walk.samples.length>5);assert(result.walk.travel>1,'Actual walking must happen');
    await page.getByRole('link',{name:'Obecny',exact:true}).click();
    await page.waitForFunction(()=>window.__test2.ready()&&window.__test2.architecture.ready(),null,{timeout:60000});
    result.normal=await trace(page);result.normal.drift=drift(result.normal.samples);
    await page.evaluate(()=>{window.__test2.scene.events.off('postupdate',window.__motion.record);});
    await page.getByRole('button',{name:'Przybliż widok',exact:true}).click();
    await page.waitForFunction(()=>window.__test2.ready()&&window.__test2.architecture.ready(),null,{timeout:60000});
    result.zoomed=await trace(page);result.zoomed.drift=drift(result.zoomed.samples);
    await page.evaluate(()=>{window.__test2.scene.events.off('postupdate',window.__motion.record);});
    await page.screenshot({path:`${output}/${device}-${variant}-zoomed.png`});
    assert.equal(errors.length,0,errors.join('\n'));
    if(variant==='after')for(const phase of ['lower','normal','zoomed','walk'])assert(result[phase].drift<.0001,`${phase}: house drifts relative to tree/terrain by ${result[phase].drift} screen px`);
    result.result='PASS';
   }catch(error){result.result='FAIL';result.error=String(error);result.errors=errors;await page.screenshot({path:`${output}/${device}-${variant}-failure.png`}).catch(()=>{});}
   results.push(result);console.log(JSON.stringify({device,variant,result:result.result,error:result.error,drift:Object.fromEntries(['lower','normal','zoomed','walk'].filter(k=>result[k]).map(k=>[k,result[k].drift]))}));
   await writeFile(`${output}/results.json`,JSON.stringify({baselineCommit:process.env.MOTION_BASELINE_SHA,description:'Actual scene; fractional camera samples and real keyboard walking. Drift = change of house offset relative to tree and terrain, in canvas pixels.',results},null,2)+'\n');
   await context.close();
  }
 }
}finally{await browser.close();}
if(results.some(r=>r.result!=='PASS'))process.exitCode=1;
