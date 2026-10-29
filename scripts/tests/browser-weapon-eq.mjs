// Actual built game; isolated map/account fixtures. No requests write real player state.
// Like browser-live/lochy, use ostrosc=1: cooldown is active-play time, not wall time;
// software-rendered 2x canvases on shared CI can otherwise time out before 2.5 active seconds.
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
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 await page.waitForFunction(()=>document.body.classList.contains('hud-comic-a')&&document.querySelector('.tel-rura.hp'));
 const g=fn=>page.evaluate(fn);
 await g(()=>{const s=window.__game.scene.getScene('game');s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;for(const e of s.enemies)e.destroy();s.enemies=[];});

 await g(()=>{window.__gear.equip.bron='stalowy_jakosc4';window.__gear.bag=[{item:'zelazny_jakosc0'}];window.__game.scene.getScene('ui').openCharacter('eq');});
 await page.locator('#character .weapon-card').waitFor();
 assert.equal(await page.locator('.weapon-card .weapon-quality i.filled').count(),5);
 assert((await page.locator('.weapon-card').innerText()).includes('11–14'));
 assert((await page.locator('.weapon-card').innerText()).includes('Mocny cios'));
 const img=page.locator('.weapon-card .c-card-icon img');
 assert(await img.evaluate(e=>e.complete && e.naturalWidth>0));
 assert((await img.boundingBox()).width>=76);
 await page.screenshot({path:`work/comic-hud/${name}-weapon.png`});
 // Tap a backpack weapon: it has one quality dot and its own base damage range.
 const slot=page.locator('.sl-cell[data-zone="bag"][data-key="0"]');
 await slot.dispatchEvent('pointerdown',{pointerId:1,clientX:1,clientY:1});
 await slot.dispatchEvent('pointerup',{pointerId:1,clientX:1,clientY:1,bubbles:true});
 assert.equal(await page.locator('.weapon-card .weapon-quality i.filled').count(),1);
 assert((await page.locator('.weapon-card').innerText()).includes('5–7'));
 assert(!(await page.locator('.weapon-card').innerText()).includes('Aktywny atak specjalny'));
 assert.deepEqual(errors,[]);
 console.log(`PASS ${name}: large weapon card, image, damage, actual active skill, quality and bag selection`);
 await context.close();
}
}finally{await browser.close();await server.httpServer.close();}
