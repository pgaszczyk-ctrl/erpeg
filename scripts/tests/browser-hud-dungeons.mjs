// Actual built game; isolated map/account fixtures. No requests write real player state.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/comic-hud',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4181,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const results=[];
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try {
for(const [name,width,height,mobile] of [['desktop',1280,800,false],['phone',844,390,true],['upright',390,844,true]]) {
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,locale:'pl-PL',reducedMotion:'reduce'});
 const errors=[],saves=[];
 await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
 await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
 await context.route('**/*.supabase.co/**',r=>{
  const fn=new URL(r.request().url()).pathname.split('/').pop();let body=null;
  if(fn==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,save:{coins:124,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'zelazny'},skills:{miecz:0,luk:0,magia:0},mikstury:3}}};
  if(fn==='save_game'){saves.push(r.request().postDataJSON());body=true;}
  if(['heartbeat','logout','log_error'].includes(fn))body=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))body=[];
  if(fn==='game_settings')body={};if(fn==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4181/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 await page.waitForFunction(()=>document.body.classList.contains('hud-comic-a')&&document.querySelector('.tel-rura.hp'));
 const g=(fn,arg)=>page.evaluate(fn,arg);
 await g(()=>{
  const s=window.__game.scene.getScene('game');
  s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;
  for(const e of s.enemies)e.destroy();s.enemies=[];
  window.__dialogs=[];const orig=s.dialog.bind(s);s.dialog=d=>{window.__dialogs.push(d);return orig(d)};
  window.__w={id:'fixture-crypt',rodzaj:'krypta',x:s.player.x,y:s.player.y-10,seed:271};
  s.lochy.addTutorial(window.__w);s.player.face(0,-1);
 });
 const cdp=await context.newCDPSession(page);
 const tap=async(x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 const checks=[];
 const physical=([x,y])=>name==='upright'?[y,height-x]:[x,y];
 for(const method of ['E','map-double','attack-double','touch-attack-double','touch-map-double','range-E']){
  await g(()=>{const s=window.__game.scene.getScene('game');window.__game.scene.getScene('ui').closeDialog();s.scene.resume();s.talkReadyAt=0;s.lingerUntil=0;s.player.setPosition(window.__w.x,window.__w.y+10);s.player.face(0,-1);window.__dialogs=[];});
  await page.waitForTimeout(600);
  const b=await page.locator('.hs-atak').boundingBox(),ax=b.x+b.width/2,ay=b.y+b.height/2;
  const xy=await g(()=>{const s=window.__game.scene.getScene('game'),c=s.cameras.main;const ratio=window.__game.scale.width/window.innerWidth;return[(window.__w.x-c.worldView.x)*c.zoomX/ratio,(window.__w.y-c.worldView.y)*c.zoomY/ratio]});
  const [mx,my]=physical(xy);
  if(method==='E')await page.keyboard.press('KeyE');
  if(method==='map-double')await page.mouse.dblclick(mx,my,{delay:75});
  if(method==='attack-double')await page.mouse.dblclick(ax,ay,{delay:75});
  if(method==='touch-attack-double'){await tap(ax,ay);await page.waitForTimeout(75);await tap(ax,ay);}
  if(method==='touch-map-double'){await tap(mx,my);await page.waitForTimeout(75);await tap(mx,my);}
  if(method==='range-E'){await g(()=>{window.__gear.skills.miecz=1000;window.__game.scene.getScene('game').emitZasoby()});await page.locator('.hs-picker input').focus();await page.keyboard.press('ArrowRight');assert.equal(await g(()=>window.__session.umiej.miecz),'zamach');await page.keyboard.press('KeyE');}
  await page.waitForTimeout(800);
  checks.push(await g(method=>{const s=window.__game.scene.getScene('game');return{method,dialogs:window.__dialogs.map(d=>d.title),ui:window.__game.scene.getScene('ui').hasDialog,hp:s.player.hp,dist:Math.hypot(s.player.x-window.__w.x,s.player.y-window.__w.y),combat:s.inCombat(),focus:document.activeElement?.outerHTML.slice(0,100)}},method));
 }
 // The actual confirmation must use the drawn UI button, not its callback.
 await g(()=>{document.activeElement?.blur();const s=window.__game.scene.getScene('game');window.__game.scene.getScene('ui').closeDialog();s.scene.resume();s.talkReadyAt=0;window.__dialogs=[];});
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__game.scene.getScene('ui').hasDialog);
 await page.waitForTimeout(400);
 const button=await g(()=>{const u=window.__game.scene.getScene('ui'),b=u.dialogButtons.find(b=>b.index===0).rect.getBounds();return[b.centerX,b.centerY]});
 const [bx,by]=physical(button);
 await page.screenshot({path:`work/comic-hud/${name}-dungeon-confirm.png`});
 if(mobile)await tap(bx,by);else await page.mouse.click(bx,by);
 await page.waitForFunction(()=>!!window.__game.scene.getScene('game').city.loch&&window.__game.scene.isActive('game'),null,{timeout:30000});
 checks.push({method:'confirm-enter',entered:true});
 console.log(name,JSON.stringify(checks));
 for(const check of checks) if(check.method!=='confirm-enter') assert(check.dialogs.some(d=>/Krypta/.test(d)),`${name}: ${check.method} opens the crypt`);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:`work/comic-hud/${name}-dungeon-diagnosis.png`});
 await cdp.detach();
 results.push({name,checks,errors});await context.close();
}
await writeFile('work/comic-hud/dungeon-diagnosis.json',JSON.stringify(results,null,2));
} finally {await browser.close();await new Promise(r=>server.httpServer.close(r));}
