// Actual built game; isolated map/account fixtures. No requests write real player state.
// Like browser-live/lochy, use ostrosc=1: cooldown is active-play time, not wall time;
// software-rendered 2x canvases on shared CI can otherwise time out before 2.5 active seconds.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/pancerz',{recursive:true});
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

 // Real live-combat entry point: compare identical physical hits with/without armour.
 const combat=await g(()=>{
  const s=window.__game.scene.getScene('game'),p=s.player,eq=window.__gear.equip;
  s.noHurtUntil=0;window.__session.level.obrazenia=1;
  const run=(armor,physical=true,damage=1,n=35)=>{
   eq.zbroja=armor;eq.helm=null;eq.buty=null;p.hp=100;p.extra=0;s.wilkCarry=0;
   const host=s.wilkHost();
   for(let i=0;i<n;i++){p.invulnerableUntil=-Infinity;host.hurt(p,damage,physical);}
   return {lost:100-p.hp,carry:s.wilkCarry};
  };
  const result={bare:run(null),armor:run('skorzana_zbroja_jakosc0'),magic:run('skorzana_zbroja_jakosc4',false),weak:run('skorzana_zbroja_jakosc0',true,.1,70)};
  s.noHurtUntil=Infinity;p.hp=10;return result;
 });
 assert.equal(combat.bare.lost,35);assert(Math.abs(combat.armor.lost+combat.armor.carry-30)<1e-8);assert.equal(combat.magic.lost,35);
 assert(Math.abs(combat.weak.lost+combat.weak.carry-6)<1e-8,'weak hits retain fractional mitigation');
 await g(()=>{Object.assign(window.__gear.equip,{zbroja:'skorzana_zbroja_jakosc0',helm:'skorzany_helm',buty:'skorzane_buty'});window.__gear.bag=[{item:'skorzana_zbroja_jakosc4'}];window.__game.scene.getScene('ui').openCharacter('eq');});
 const worn=page.locator('.sl-cell[data-zone="eq"][data-key="zbroja"]');
 await worn.dispatchEvent('pointerdown',{pointerId:1,clientX:1,clientY:1});
 await worn.dispatchEvent('pointerup',{pointerId:1,clientX:1,clientY:1,bubbles:true});
 const card=page.locator('.weapon-card');await card.waitFor();
 assert((await card.innerText()).includes('Pancerz'));assert(!(await card.innerText()).includes('%'));
 assert.equal(await card.locator('.weapon-quality i.filled').count(),1);
 const img=card.locator('.c-card-icon img');await img.evaluate(e=>e.decode());assert((await img.boundingBox()).width>=76);
 const bag=page.locator('.sl-cell[data-zone="bag"][data-key="0"]');
 await bag.dispatchEvent('pointerdown',{pointerId:2,clientX:1,clientY:1});
 await bag.dispatchEvent('pointerup',{pointerId:2,clientX:1,clientY:1,bubbles:true});
 assert.equal(await card.locator('.weapon-quality i.filled').count(),5);
 assert((await card.innerText()).includes('10'));assert(!(await card.innerText()).includes('%'));
 assert(await page.locator('.sl-cell > .weapon-quality').evaluateAll(nodes=>nodes.every(e=>{const s=e.parentElement.getBoundingClientRect();return [...e.children].every(i=>{const b=i.getBoundingClientRect();return b.left>=s.left+2&&b.right<=s.right-2&&b.bottom<=s.bottom-2;});})));
 await page.screenshot({path:`work/pancerz/${name}-armour.png`});
 assert.deepEqual(errors,[]);console.log(`PASS ${name}: actual damage reduction, magic bypass, fractional hits, armour card, image and quality dots`);
 await context.close();
}
}finally{await browser.close();await server.httpServer.close();}
