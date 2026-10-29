// Actual built game; isolated map/account fixtures. No requests write real player state.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/comic-hud',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
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
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&live=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 await page.waitForFunction(()=>document.body.classList.contains('hud-comic-a')&&document.querySelector('.tel-rura.hp'));
 const g=fn=>page.evaluate(fn);
 await g(()=>{const s=window.__game.scene.getScene('game');s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;for(const e of s.enemies)e.destroy();s.enemies=[];});
 assert(await page.locator('.hs-picker').isHidden(),'single skill: no empty selector');
 assert(await page.locator('.hs-atak').isVisible());
 await page.screenshot({path:`work/comic-hud/${name}-closed.png`});
 // Pointer aiming and real touch joystick release after the art replacement.
 const ab=await page.locator('.hs-atak').boundingBox();
 await page.mouse.move(ab.x+ab.width/2,ab.y+ab.height/2);await page.mouse.down();
 assert(await page.locator('.hs-atak').evaluate(e=>e.classList.contains('on')));
 await page.mouse.move(ab.x+ab.width/2+20,ab.y+ab.height/2+12);
 assert(await page.locator('.hs-atak .nub').evaluate(e=>!!e.style.transform));
 await page.mouse.up();
 assert.equal(await page.locator('.hs-atak .nub').evaluate(e=>e.style.transform),'');
 if(mobile){
  const pos=await g(()=>{const u=window.__game.scene.getScene('ui'),v=u.joyHome;return document.documentElement.classList.contains('exp-obrot')?{x:v.y,y:document.documentElement.clientHeight-v.x,rot:true}:{x:v.x,y:v.y,rot:false};});
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pos.x,y:pos.y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pos.x+(pos.rot?0:28),y:pos.y+(pos.rot?-28:0),id:1}]});
  await page.waitForTimeout(200);
  assert(await g(()=>Math.abs(window.__game.scene.getScene('game').player.vel.x)>1),'movement joystick steers');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(150);
  assert(await g(()=>window.__game.scene.getScene('game').player.vel.length()<.01),'joystick releases');
  await cdp.detach();
 }

 // Existing collapsible menu still opens and closes from the portrait.
 await page.locator('.tel-portret').click();
 await page.waitForFunction(()=>document.querySelector('.tel-portret').getAttribute('aria-expanded')==='true');
 await page.waitForTimeout(350);
 assert(await page.locator('.tel-kolo').first().isVisible());
 await page.screenshot({path:`work/comic-hud/${name}-open.png`});
 await page.locator('.tel-portret').click();
 await page.waitForTimeout(350);
 // Skills are actual existing game abilities, gated by weapon level. Selecting never casts or resets cooldown.
 await g(()=>{window.__gear.skills.miecz=1000;window.__game.scene.getScene('game').emitZasoby();});
 assert(await page.locator('.hs-picker').isVisible());
 await page.waitForFunction(()=>window.__zasoby.czas-window.__zasoby.mocnyAt>=2.5,null,{timeout:20000});
 const before=await g(()=>({s:window.__zasoby.s,at:window.__zasoby.mocnyAt}));
 const slider=page.locator('.hs-picker input');await slider.focus();await page.keyboard.press('End');
 assert.equal(await g(()=>window.__session.umiej.miecz),'zamach');
 assert.equal(await g(()=>window.__zasoby.mocnyAt),before.at);
 assert((await g(()=>window.__zasoby.s))>=before.s-.01);
 await page.keyboard.press('Home');assert.equal(await g(()=>window.__session.umiej.miecz),'mocny');
 // Click skill and check shared cooldown, switch, then try to cast the other one immediately.
 await slider.blur();await page.locator('.hs-spec').click({force:true});
 await page.waitForFunction(v=>window.__zasoby.s<v-10,before.s,{timeout:10000});
 const paid=await g(()=>({s:window.__zasoby.s,at:window.__zasoby.mocnyAt}));
 await slider.focus();await page.keyboard.press('End');await slider.blur();await page.locator('.hs-spec').click({force:true});
 assert.equal(await g(()=>window.__zasoby.mocnyAt),paid.at,'selector cannot bypass cooldown');
 assert(await g(()=>window.__zasoby.s)>paid.s-1);
 await page.waitForTimeout(1000);
 const cd=await page.locator('.hs-cd').evaluate(e=>e.style.getPropertyValue('--cd'));
 assert(parseFloat(cd)>0&&parseFloat(cd)<100,'visible progressive cooldown');
 // Real enemy hit path: decimal damage, misses and lethal overkill, one popup per accepted hit.
 const burst=await g(()=>{
  const s=window.__game.scene.getScene('game'),p=s.player;
  const e=s.spawnEnemy(p.x+12,p.y,'comic-fixture','wilk');e.brain=()=>e.vel.set(0,0);window.__comicVictim=e;
  const hp=e.hp;e.hit(p,s.time.now,2.5);s.missText(p.x-15,p.y);
  return {hp,bubbles:s.children.list.filter(o=>o.name?.startsWith('comic-')).map(o=>o.name)};
 });
 assert(burst.bubbles.includes('comic-hit:2,5!'));assert(burst.bubbles.includes('comic-miss:PUDŁO'));
 await page.screenshot({path:`work/comic-hud/${name}-combat.png`});
 await g(()=>{const s=window.__game.scene.getScene('game');window.__comicVictim.hit(s.player,s.time.now,10000);});
 assert(await g(()=>window.__game.scene.getScene('game').children.list.some(o=>o.name==='comic-hit:7,5!')),'overkill shows actual remaining HP');
 await page.waitForTimeout(1300);
 assert.equal(await g(()=>window.__game.scene.getScene('game').children.list.filter(o=>o.name?.startsWith('comic-hit:')||o.name?.startsWith('comic-miss:')).length),0,'effects removed');
 if(mobile)assert(await g(()=>window.__game.scene.getScene('ui').joyBase.texture.key==='comic-joystick'));
 if(name==='upright')assert(await page.locator('html').evaluate(e=>e.classList.contains('exp-obrot')),'portrait page rotated');
 const boxes=await page.locator('.hs-atak,.hs-spec,.hs-lecz,.hs-picker').evaluateAll(nodes=>nodes.filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
 for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,'controls within physical screen');
 assert(saves.length>0,'selection persisted through existing save');assert.deepEqual(errors,[]);
 results.push({name,boxes,cd,saves:saves.length,errors});await context.close();console.log('PASS',name);
}
await writeFile('work/comic-hud/results.json',JSON.stringify(results,null,2));
} finally {await browser.close();await new Promise(r=>server.httpServer.close(r));}
