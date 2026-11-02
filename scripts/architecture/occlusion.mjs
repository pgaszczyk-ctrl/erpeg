// Exercises the real neighbouring houses at the owner's test spot and a legal position
// behind their walls. The oracle uses surface depth, independent of Phaser sprite order.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire('/workspace/onboarding-tools/package.json')('playwright'));}
const output='work/architecture-occlusion';await mkdir(output,{recursive:true});
const baseline=process.env.MOTION_BASELINE_DIST?path.resolve(process.env.MOTION_BASELINE_DIST):null;
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],timeout:15000});
const results=[],mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
async function files(route){
 const url=new URL(route.request().url());if(url.hostname!=='exp-lore.local')return route.abort();
 const prefix=url.pathname.startsWith('/before/')?'/before/':'/after/',root=prefix==='/before/'?baseline:path.resolve('dist');
 if(!root)return route.abort();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length)));
 if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
 try{return await route.fulfill({body:await readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
}
async function oracle(page){
 return page.evaluate(()=>{
  const lab=window.__test2,projection=lab.metrics().projection.y,view=lab.scene.cameras.main.worldView;
  const surfaces=[...lab.architecture.sprites.entries()].filter(([,s])=>s.image.visible).map(([id,s])=>({id,...s.surface,reveal:s.revealRect}));
  const x0=Math.floor(view.left*2),x1=Math.ceil(view.right*2),y0=Math.floor(view.top*2*projection),y1=Math.ceil(view.bottom*2*projection),samples=[],seen=new Set();let overlapping=0;
  for(let a=0;a<surfaces.length;a++)for(let b=a+1;b<surfaces.length;b++){
   const aa=surfaces[a],bb=surfaces[b],left=Math.max(aa.x,bb.x,x0),right=Math.min(aa.x+aa.width,bb.x+bb.width,x1),top=Math.max(aa.y,bb.y,y0),bottom=Math.min(aa.y+aa.height,bb.y+bb.height,y1);
   for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const ia=(y-aa.y)*aa.width+x-aa.x,ib=(y-bb.y)*bb.width+x-bb.x;if(!aa.pixels[ia*4+3]||!bb.pixels[ib*4+3])continue;
    overlapping++;if((x+y)%3||samples.length>=1600||seen.has(`${x},${y}`))continue;
    const candidates=surfaces.filter(s=>x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height&&s.pixels[((y-s.y)*s.width+x-s.x)*4+3]);
    candidates.sort((a,b)=>{const da=a.depth[(y-a.y)*a.width+x-a.x]+a.depthOffset,db=b.depth[(y-b.y)*b.width+x-b.x]+b.depthOffset;return db-da||b.id.localeCompare(a.id);});
    const winner=candidates[0],r=winner.reveal;
    if(r&&x-winner.x>=r.x&&x-winner.x<r.x+r.width&&y-winner.y>=r.y&&y-winner.y<r.y+r.height)continue;
    samples.push({x,y,winner:winner.id});seen.add(`${x},${y}`);
   }
  }
  return {projection,samples,overlapping};
 });
}
async function checkPixels(page,reference){
 return page.evaluate(({samples,projection})=>{
  const lab=window.__test2,entries=[...lab.architecture.sprites.entries()].filter(([,s])=>s.image.visible).map(([id,s])=>{
   const im=s.image,c=im.texture.getSourceImage();return{id,x:Math.round(im.x*2),y:Math.round(im.y*2*projection),width:c.width,height:c.height,depth:im.depth,order:lab.scene.children.list.indexOf(im),pixels:c.getContext('2d').getImageData(0,0,c.width,c.height).data};
  });let wrong=0,checked=0;
  for(const sample of samples){const drawn=entries.filter(s=>sample.x>=s.x&&sample.x<s.x+s.width&&sample.y>=s.y&&sample.y<s.y+s.height&&s.pixels[((sample.y-s.y)*s.width+sample.x-s.x)*4+3]);drawn.sort((a,b)=>b.depth-a.depth||b.order-a.order);checked++;if(drawn[0]?.id!==sample.winner)wrong++;}
  return {wrong,checked};
 },reference);
}
async function findBehind(page){
 return page.evaluate(()=>{
  const lab=window.__test2,entry=lab.architecture.sprites.get('geometry:ec072c40:59e7a469'),b=lab.architecture.inspect().plan.buildings.find(b=>b.id==='geometry:ec072c40:59e7a469');
  const projection=lab.metrics().projection.y,px=1.92,points=b.footprints.flat(),left=Math.min(...points.map(p=>p[0])),right=Math.max(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
  const canvas=entry.image.texture.getSourceImage(),data=entry.surface?.pixels??canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  const headOffset=24*lab.player.scaleY;
  for(const gap of [3,5,7,9])for(let i=1;i<16;i++){
   const x=(left+(right-left)*i/16)*px,y=(top-gap)*px;if(!lab.architecture.isFree(x,y))continue;
   const u=Math.floor((x-entry.image.x)*2),v=Math.floor((y-headOffset-entry.image.y)*2*projection);
   if(u>=0&&v>=0&&u<canvas.width&&v<canvas.height&&data[(v*canvas.width+u)*4+3]&&entry.image.depth>y)return {x,y};
  }
  throw new Error('No unobstructed ground position behind a real wall');
 });
}
async function hero(page,position){
 await page.evaluate(p=>window.__test2.player.setPosition(p.x,p.y),position);
 await page.waitForTimeout(300);
 await page.waitForFunction(()=>window.__test2.architecture.ready(),null,{timeout:60000});
 return page.evaluate(()=>{
  const lab=window.__test2,b=lab.player.getBounds(),projection=lab.metrics().projection.y;
  const point={x:b.centerX,y:b.centerY},cover=[];
  for(const [id,s]of lab.architecture.sprites){
   if(!s.image.visible||s.image.depth<=lab.player.depth)continue;
   const canvas=s.image.texture.getSourceImage(),x=Math.floor((point.x-s.image.x)*2),y=Math.floor((point.y-s.image.y)*2*projection);
   if(x<0||y<0||x>=canvas.width||y>=canvas.height)continue;
   const alpha=canvas.getContext('2d').getImageData(x,y,1,1).data[3];
   if(s.surface?.pixels[(y*canvas.width+x)*4+3]||alpha)cover.push({id,alpha});
  }
  return {cover,revealed:lab.metrics().architecture.revealedBuildings??0,free:lab.architecture.isFree(lab.player.x,lab.player.y),depth:lab.player.depth,y:lab.player.y};
 });
}
try{
 for(const [device,width,height,dpr]of [['desktop',1080,900,1],['phone',390,844,2]]){
  let reference,position;
  for(const variant of baseline?['after','before']:['after']){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:device==='phone',isMobile:device==='phone'});await context.route('**/*',files);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const r={device,variant};
   try{
    await page.goto(`https://exp-lore.local/${variant}/test2.html?arch=1&lat=51.2450352&lon=22.5326420&zoom=2&ostrosc=1&view=lower`);
    await page.waitForFunction(()=>window.__test2?.ready()&&window.__test2.architecture.ready(),null,{timeout:90000});
    if(variant==='after'){reference=await oracle(page);assert(reference.overlapping>100,'Must exercise actually overlapping house images');assert(reference.samples.length>20);position=await findBehind(page);}
    r.occlusion=await checkPixels(page,reference);await page.screenshot({path:`${output}/${device}-${variant}-neighbours.png`});
    const origin=await page.evaluate(()=>({x:window.__test2.player.x,y:window.__test2.player.y}));
    r.hero=await hero(page,position);await page.screenshot({path:`${output}/${device}-${variant}-behind-wall.png`});
    if(variant==='after'){
     assert.equal(r.occlusion.wrong,0,'Wall/roof depth must win over whole-sprite baseline order');
     assert(r.hero.free);assert.equal(r.hero.depth,r.hero.y,'Keep ordinary character depth ordering');
     assert(r.hero.revealed>0);assert(r.hero.cover.length>0);assert(r.hero.cover.every(c=>c.alpha===0),'Character body must have a transparent local window');
     await hero(page,origin);
     r.restored=await page.evaluate(()=>{const lab=window.__test2;let wrong=0,restored=0;for(const s of lab.architecture.sprites.values())if(s.image.visible&&!s.revealRect){const c=s.image.texture.getSourceImage(),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<data.length;i+=4){if(data[i]!==s.composed.data[i])wrong++;}restored++;}return{wrong,restored};});
     assert.equal(r.restored.wrong,0,'Leaving restores the original composed walls');assert(r.restored.restored>0);
    }
    assert.equal(errors.length,0,errors.join('\n'));r.result='PASS';
   }catch(error){r.result='FAIL';r.error=String(error);r.errors=errors;await page.screenshot({path:`${output}/${device}-${variant}-failure.png`}).catch(()=>{});}
   results.push(r);console.log(JSON.stringify(r));await writeFile(`${output}/results.json`,JSON.stringify({baseline:process.env.MOTION_BASELINE_SHA,results},null,2)+'\n');await context.close();
  }
 }
}finally{await browser.close();}
if(results.some(r=>r.result!=='PASS'))process.exitCode=1;
