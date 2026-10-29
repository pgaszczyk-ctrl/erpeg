// Real MP3 streams and gain nodes; all account writes use fixtures. PC + rotated phone, /test/ URL.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await preview({preview:{host:'127.0.0.1',port:4183,strictPort:true}});
const proxy = createServer(async (req,res) => {
 try {
  const url = (req.url || '/').replace(/^\/test\//,'/');
  const r = await fetch('http://127.0.0.1:4183'+url,{headers:req.headers.range?{range:req.headers.range}:{}});
  res.writeHead(r.status,Object.fromEntries([...r.headers].filter(([k])=>!['content-encoding','transfer-encoding','content-length'].includes(k))));
  res.end(Buffer.from(await r.arrayBuffer()));
 } catch { res.writeHead(502);res.end(); }
});
await new Promise(resolve=>proxy.listen(4184,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
await mkdir('work/music',{recursive:true});const results=[];
const ring=[0,0,5760,0,5760,5760,0,5760];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try {for(const phone of [false,true]) {
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
  window.__music=[];window.__contexts=[];
  const NativeAudio=window.Audio;
  window.Audio=function(...args){const m=new NativeAudio(...args);window.__music.push(m);return m;};window.Audio.prototype=NativeAudio.prototype;
  const original=AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource=function(m){
   window.__contexts.push(this);const src=original.call(this,m),connect=src.connect;
   src.connect=function(g){m.__gain=g;const c=g.connect;g.connect=function(master){m.__master=master;return c.call(this,master);};return connect.call(this,g);};return src;
  };
 });
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(/audio\/(caravan|catacombs|skirmish)/.test(r.url())&&!r.ok())failed.push(r.url());});
 const go=()=>page.goto('http://127.0.0.1:4184/test/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&stwory3d=0&mieszkancy3d=0#postac=Jam&kod=ANGELIKA');
 await go();
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 assert(await page.evaluate(()=>window.__music.every(m=>m.__gain.gain.value===0||document.getElementById('loading-map')?.hidden!==false)),'sound only after map reveal');
 await page.locator('canvas').first().dispatchEvent('pointerdown'); // a synthetic event does not unlock autoplay
 if(phone)await page.locator('.hs-atak').tap();else await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__music.some(m=>m.src.endsWith('caravan-trails-1.mp3')&&!m.paused&&m.__gain.gain.value>.9),null,{timeout:30000});
 const stream=await page.evaluate(()=>window.__music.map(m=>({url:m.src,duration:m.duration,error:m.error?.code})));
 assert(stream.every(m=>m.url.includes('/test/audio/')),'base URL supports TEST subpath');
 const state=()=>page.evaluate(()=>window.__music.map(m=>({name:m.src.split('/').pop(),paused:m.paused,time:m.currentTime,mix:m.__gain.gain.value,master:m.__master.gain.value,error:m.error?.code})));
 // Preserve the real state's wiring, then isolate the transition tests from AI time.
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');window.__originalMusicState=s.musicState;window.__desiredMusic={underground:false,combat:false};s.musicState=()=>window.__desiredMusic;});
 await page.evaluate(()=>{window.__desiredMusic.combat=true;});
 await page.waitForFunction(()=>window.__music[3].__gain.gain.value>.95);
 assert((await state())[0].mix<.1,'world bed fades out in combat');
 await page.evaluate(()=>{window.__desiredMusic.combat=false;});
 await page.waitForFunction(()=>window.__music[3].__gain.gain.value<.8);
 const fadeStart=Date.now();await page.waitForFunction(()=>window.__music[3].paused);const fadeTail=Date.now()-fadeStart;
 assert(fadeTail>900&&fadeTail<4000,'two-second combat fade, not a hard cut');
 assert((await state())[0].mix>.9);
 await page.evaluate(()=>{window.__desiredMusic.underground=true;});
 await page.waitForFunction(()=>window.__music[2].__gain.gain.value>.95);
 await page.evaluate(()=>{window.__desiredMusic.combat=true;});
 await page.waitForFunction(()=>window.__music[3].__gain.gain.value>.95);
 await page.evaluate(()=>{window.__desiredMusic.combat=false;});
 await page.waitForFunction(()=>window.__music[2].__gain.gain.value>.95&&window.__music[3].paused);
 assert((await state())[0].paused,'returns to catacombs, not world');
 // Alternating the two real surface files without waiting five minutes.
 await page.evaluate(()=>{window.__desiredMusic.underground=false;});
 await page.waitForFunction(()=>window.__music[0].__gain.gain.value>.95);
 await page.evaluate(()=>{const m=window.__music[0];m.currentTime=m.duration-.15;});
 await page.waitForFunction(()=>window.__music[1].__gain.gain.value>.95);
 // Open via the actual Phaser settings callback; HTML controls must not move/attack.
 await page.evaluate(()=>{const u=window.__game.scene.getScene('ui');u.openSettingsMenu();window.__musicChoice=u.dialogButtons.find(b=>/Muzyka/.test(b.text?.text||b.label?.text||''))?.index;});
 await page.evaluate(()=>{const u=window.__game.scene.getScene('ui');const choose=u.dialogChoose;u.closeDialog();choose(3);});
 await page.locator('#music-settings').waitFor();
 await page.locator('#music-volume').fill('31');
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>localStorage.getItem('exp-music-volume')),'0.31');
 assert(Math.abs((await state())[1].master-.31)<.01,'slider changes actual music bus');
 await page.locator('#music-settings button').first().click();
 await page.waitForTimeout(150);assert((await state()).every(m=>m.paused),'toggle stops all music');
 await page.locator('#music-settings button').first().click();
 await page.waitForFunction(()=>window.__music.some(m=>!m.paused));
 await page.screenshot({path:`work/music/${phone?'phone':'desktop'}-settings.png`});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#music-settings').count(),0);
 // Restore the actual AI/dungeon-state reader and test real retreat detection.
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');s.musicState=window.__originalMusicState; s.scene.resume();window.__musicEnemy=s.spawnEnemy(s.player.x+30,s.player.y,'music-fixture','wilk');});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').wilki.has(window.__musicEnemy));
 const wiring=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game');s.musicState=window.__originalMusicState;
  const e=window.__musicEnemy,ai=s.wilki.get(e);
  ai.stan='atak';const combat=s.musicState().combat;ai.stan='powrot';const retreat=s.musicState().combat;
  ai.destroy();s.wilki.delete(e);e.destroy();s.enemies=s.enemies.filter(x=>x!==e);
  return {combat,retreat};
 });
 assert(wiring.combat&&!wiring.retreat,'actual AI starts music; retreat ends combat');
 // The actual dungeon scene restart changes the bed, and stairs restore the surface bed.
 await page.evaluate(()=>{const u=window.__game.scene.getScene('ui');u.closeDialog();const s=window.__game.scene.getScene('game');s.scene.resume();s.zejdzDoLochu({rodzaj:'krypta',seed:12345,x:s.player.x,y:s.player.y});});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').city?.loch&&window.__game.scene.isActive('game'),null,{timeout:30000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');for(const [e,ai] of s.wilki){ai.destroy();e.destroy();}s.wilki.clear();s.enemies=[];s.atakiWrecz=s.atakiDystans=0;s.scene.pause();});
 await page.waitForFunction(()=>window.__music[2].__gain.gain.value>.95&&window.__music[0].paused&&window.__music[1].paused,null,{timeout:15000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');s.scene.resume();s.wyjdzZLochu();});
 await page.waitForFunction(()=>!window.__game.scene.getScene('game').city?.loch&&window.__game.scene.isActive('game'),null,{timeout:30000});
 await page.waitForFunction(()=>window.__music.slice(0,2).some(m=>m.__gain.gain.value>.95)&&window.__music[2].paused,null,{timeout:15000});
 // Backgrounding pauses every stream; returning resumes only the desired one.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert((await state()).every(m=>m.paused));
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>window.__music.some(m=>!m.paused));
 // Logout / leaving the active map stops immediately, also from a settings dialog.
 await page.evaluate(()=>{window.__session.token=null;});
 await page.waitForFunction(()=>window.__music.every(m=>m.paused));
 assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
 results.push({phone,streams:stream,fadeTailMs:fadeTail,wiring,errors,failed});
 await context.close();
}
 await writeFile('work/music/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {await browser.close();proxy.close();await server.close();}
