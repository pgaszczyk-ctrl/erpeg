// Built-game audio integration. All accounts/map/server writes are fixtures.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || chromium.executablePath(),args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const results=[];
await mkdir('work/combat-audio',{recursive:true});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try {
for (const phone of [false,true]) {
 const tag=phone?'phone':'desktop';
 const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:800},isMobile:phone,hasTouch:phone,reducedMotion:'reduce',locale:'pl-PL'});
 await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
 await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
 await context.route('**/*.supabase.co/**',r=>{
  const fn=new URL(r.request().url()).pathname.split('/').pop();let body=null;
  if(fn==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,save:{coins:0,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'zelazny'}}}};
  if(['heartbeat','logout','log_error','save_game'].includes(fn))body=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))body=[];
  if(fn==='game_settings')body={};if(fn==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
 });
 await context.addInitScript(()=>{
  window.__audioStarts=[];
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){window.__audioStarts.push({offset:args[1]||0,duration:this.buffer?.duration,state:this.context.state});return original.apply(this,args);};
 });
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/audio/sfx/')&&!r.ok())failed.push(r.url());});
 const g=(fn,arg)=>page.evaluate(fn,arg);
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1&mieszkancy3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&window.__game.scene.getScene('game').ludzik3d?.widoczny&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 if(phone)await page.locator('.hs-atak').tap();else await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__game.scene.getScene('game').combatAudio.ready===41,null,{timeout:30000});
 await g(()=>{const s=window.__game.scene.getScene('game');s.player.x+=180;s.cameras.main.setZoom(4);});
 const reset=()=>g(()=>{const s=window.__game.scene.getScene('game');s.combatAudio.stop();
  for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();s.wilki.delete(e);e.destroy();}s.enemies=[];for(const q of s.shots)q.sprite.destroy();s.shots=[];
  s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;window.__sounds=[];
  s.events.removeAllListeners('combat-sound');s.events.on('combat-sound',e=>{const model=s.ludzik3d.g;const a=model&&(model.atakGora.isRunning()?model.atakGora:model.atak);window.__sounds.push({...e,remaining:a?Math.max(0,(a.getClip().duration*.40-a.time)/a.timeScale*1000):null});});
  s.events.off('postupdate',window.__traceAudio);window.__traceAudio=undefined;
 });
 await reset();
 await g(()=>{const s=window.__game.scene.getScene('game');s.player.lastAttack=-Infinity;});
 if(phone)await page.locator('.hs-atak').tap();else await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__sounds.some(s=>s.id==='sword-light'));
 const light=await g(()=>window.__sounds.filter(s=>s.id==='sword-light'));
 assert.equal(light.length,1,'one real input → one sword sound');
 // Actual animation clock, not a click timer; both strengths and staff routing.
 for(const [weapon,strong,id] of [['zelazny',true,'sword-heavy'],['kijek',false,'staff-light'],['kijek',true,'staff-heavy']]){
  await reset();
  await g(([weapon,strong])=>{const s=window.__game.scene.getScene('game');window.__gear.equip.bron=weapon;
   const expected=s.time.now+s.ludzik3d.attackEventMs;s.resolveAttack(s.player.hitPoint(),s.time.now,strong);return expected;},[weapon,strong]);
  await page.waitForFunction(id=>window.__sounds.some(s=>s.id===id),id);
  const sound=await g(id=>window.__sounds.find(s=>s.id===id),id);
  assert(sound.remaining!==null&&Math.abs((sound.actionAt-sound.at)-sound.remaining)<5,`hero ${id} follows the actual mixer clock, including delayed frames`);
 }
 await reset();
 // At high weapon skill a fresh legal blow must not restart the model before its sound can fire.
 await g(()=>{const s=window.__game.scene.getScene('game');window.__gear.equip.bron='zelazny';
  s.player.attackCooldown=130;s.player.lastAttack=-Infinity;window.__accepted=0;
  window.__resolveAttack=s.resolveAttack;s.resolveAttack=function(...args){window.__accepted++;return window.__resolveAttack.apply(this,args);};});
 for(let i=0;i<5;i++){
  if(phone)await page.locator('.hs-atak').tap();else await page.keyboard.press('Space');
  await page.waitForTimeout(160);
 }
 await page.waitForTimeout(450);
 const rapid=await g(()=>{const s=window.__game.scene.getScene('game');s.resolveAttack=window.__resolveAttack;s.player.attackCooldown=320;
  return{accepted:window.__accepted,sounds:window.__sounds.filter(s=>s.id==='sword-light').length};});
 assert(rapid.accepted>=3);assert.equal(rapid.sounds,rapid.accepted,'every accepted rapid attack has its own sound');
 await reset();
 // Cue cropping aligns bow release / spell emergence with the real projectile creation.
 for(const [kind,strong,id] of [['luk',false,'bow-quick'],['luk',true,'bow-power'],['magia',false,'fireball'],['magia',true,'heatwave']]){
  const r=await g(([kind,strong])=>{const s=window.__game.scene.getScene('game');window.__gear.ammo.strzaly=20;
   const at=s.time.now;s.fireShot({id:kind==='luk'?'luk_rekruta':'rozdzka_szkolna',miejsce:'bron',rodzaj:kind,moc:2},{x:1,y:0},strong,at);
   return {at,n:window.__sounds.length,shots:s.shots.length};},[kind,strong]);
  const sound=await g(id=>window.__sounds.find(s=>s.id===id),id);
  assert(sound,`${id} plays on emission`);assert(Math.abs(sound.actionAt-r.at)<5);assert(r.shots>0);
 }
 await reset();
 const noAmmo=await g(()=>{const s=window.__game.scene.getScene('game');window.__gear.ammo.strzaly=0;
  s.fireShot({id:'luk_rekruta',miejsce:'bron',rodzaj:'luk',moc:2},{x:1,y:0},false,s.time.now);return window.__sounds.length;});
 assert.equal(noAmmo,0,'no ammunition → no shot sound');
 // Real AI, GLBs and takeoff/jaw clocks.
 const enemyResults=[];
 for(const [kind,expected] of [['wilk','wolf-bite'],['bandyta','dagger'],['szkielet','bone'],['glut','chestnut-throw']]){
  await reset();await g(kind=>{const s=window.__game.scene.getScene('game'),p=s.player;
   window.__enemy=s.spawnEnemy(p.x+(kind==='glut'?30:24),p.y,'audio-fixture',kind);window.__attackTrace=[];
   window.__traceAudio=()=>{const e=window.__enemy,ai=s.wilki.get(e);if(e?.modelAttack)window.__attackTrace.push({now:s.time.now,state:ai?.stan,contact:e.modelAttack.contact,impact:s.stwory3d?.attackMarkerMs(e,'impact')});};
   s.events.on('postupdate',window.__traceAudio);
  },kind);
  await page.waitForFunction(id=>window.__sounds.some(s=>s.id===id),expected,{timeout:30000}).catch(async err=>{console.error('enemy diagnostic',kind,await g(()=>{const s=window.__game.scene.getScene('game'),e=window.__enemy;return{sound:window.__sounds,trace:window.__attackTrace.slice(-12),kind:e.kindId,dead:e.isDead,active:e.active,visible:e.visible,state:s.wilki.get(e)?.stan,peace:e.peaceful,wait:e.spokojny,x:e.x,px:s.player.x};}));throw err;});
  const result=await g(()=>({sounds:window.__sounds,trace:window.__attackTrace}));
  if(kind==='wilk'){
   for(const id of ['wolf-growl','wolf-leap','wolf-bite'])assert(result.sounds.some(s=>s.id===id));
   const jaw=result.sounds.find(s=>s.id==='wolf-bite'),frame=result.trace.find(t=>Number.isFinite(t.impact));
   assert(frame&&Math.abs(jaw.actionAt-frame.impact)<70,'jaw sound follows the rendered GLB impact clock');
  }
  enemyResults.push({kind,sounds:result.sounds});
 }
 // Interrupted wolf windup must never emit the leap or bite later.
 await reset();await g(()=>{const s=window.__game.scene.getScene('game'),p=s.player;window.__enemy=s.spawnEnemy(p.x+24,p.y,'audio-fixture','wilk');});
 await page.waitForFunction(()=>window.__sounds.some(s=>s.id==='wolf-growl'));
 await g(()=>{const s=window.__game.scene.getScene('game');window.__enemy.daze(s.time.now,5000);});
 await page.waitForTimeout(1300);
 assert(!(await g(()=>window.__sounds.some(s=>s.id==='wolf-leap'||s.id==='wolf-bite'))),'stunned windup cancels later phases');
 await reset();
 await g(()=>{const s=window.__game.scene.getScene('game');s.combatAudio.at('sword-light',1000);s.scene.pause();});
 await page.waitForTimeout(1100);
 await g(()=>window.__game.scene.resume('game'));await page.waitForTimeout(1100);
 assert.equal(await g(()=>window.__sounds.length),0,'paused dialog clears future sounds');
 await g(()=>{const s=window.__game.scene.getScene('game');s.combatAudio.at('wolf-growl');s.combatAudio.at('wolf-growl');s.combatAudio.at('wolf-growl');});
 assert.equal(await g(()=>window.__sounds.length),2,'max two simultaneous growls');
 await page.screenshot({path:`work/combat-audio/${tag}.png`});
 const stats=await g(()=>({ready:window.__game.scene.getScene('game').combatAudio.ready,starts:window.__audioStarts.length,running:window.__audioStarts.every(s=>s.state==='running')}));
 assert(stats.running);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 results.push({tag,rapid,stats,enemyResults,errors,failed});await context.close();
}
await writeFile('work/combat-audio/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
