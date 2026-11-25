// Special attacks from the equipment (owner, 24 Nov 2026): sword alone → Zamach, sword + shield → Uderzenie tarczą,
// bow → Strzał przebijający, wand alone → Krąg mocy, wand + orb → Fala ognia; a mythic sword's power waits for
// its skill level. Built game, fixture map and server. Usage: npx vite build && node scripts/tests/browser-specjalne.mjs
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
await mkdir('work/specjalne',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4178,strictPort:true}});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce',locale:'pl-PL'});
 await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
 await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
 await context.route('**/*.supabase.co/**',r=>{const fn=new URL(r.request().url()).pathname.split('/').pop();let json=null;
  if(fn==='login')json={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,save:{coins:0,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'zelazny'}}}};
  if(['heartbeat','logout','log_error','save_game'].includes(fn))json=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))json=[];
  if(fn==='game_settings')json={};if(fn==='server_now')json=new Date().toISOString();return r.fulfill({json});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4178/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&chibi=0&mieszkancy3d=0&stwory3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 const r=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game'),gear=window.__gear;
  window.__game.scene.pause('game');
  const reset=()=>{for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];for(const q of s.shots)q.sprite.destroy();s.shots=[];};
  reset();s.player.x+=450;s.player.reach=1;s.player.face(1,0);s.protectUntil=Infinity;s.noHurtUntil=Infinity;
  s.city.buildingAt=()=>undefined;window.__session.level.celnosc=100;gear.magic=true;gear.ammo.strzaly=1000;
  const lv=(n)=>{let p=0;for(let l=2;l<=n;l++)p+=Math.round(100*1.5**(Math.min(l,10)-2)*1.25**Math.max(0,l-10));return p;};
  gear.skills.miecz=lv(3);gear.skills.luk=lv(3);gear.skills.magia=lv(3);
  const spawn=(dx,dy=0)=>{const e=s.spawnEnemy(s.player.x+dx,s.player.y+dy,'fx','herszt');e.hp=10000;e.setVisible(true);return e;};
  const fire=()=>{const z=window.__zasoby??null;s.zaplacMocny=()=>true;s.specjalny(s.time.now);};
  const out={};
  // Sword alone: Zamach hits all round.
  reset();gear.equip.bron='zelazny';gear.equip.dystans=null;out.miecz=s.umiejetnosc().id;
  let a=spawn(12),b=spawn(-12);fire();out.zamach=[a.hp<10000,b.hp<10000];
  // Sword + shield: shove ahead, stuns, not behind.
  reset();gear.equip.dystans='tarcza_drewniana';out.tarcza=s.umiejetnosc().id;
  a=spawn(12);b=spawn(-30);fire();out.tarczaHit=[a.hp<10000,b.hp<10000,(a.dazedUntil??a.stunUntil??0)>s.time.now||a.dazed!==undefined];
  // Bow: piercing shot through 3 in a line.
  reset();gear.equip.bron='luk';gear.equip.dystans=null;out.luk=s.umiejetnosc().id;
  const line=[spawn(20),spawn(30),spawn(40),spawn(50)];fire();for(let i=0;i<20;i++)s.updateShots(16);
  out.przebicie=line.map(e=>e.hp<10000);
  // Wand alone: Krąg mocy; wand + orb: Fala ognia.
  reset();gear.equip.bron='rozdzka';out.rozdzka=s.umiejetnosc().id;a=spawn(14);b=spawn(-14,5);fire();out.krag=[a.hp<10000,b.hp<10000];
  gear.equip.dystans='kula';out.kula=s.umiejetnosc().id;gear.equip.dystans=null;
  // Mythic sword: wieldable at skill 3, its light waits for skill 5.
  gear.equip.bron='swietlisty';gear.skills.miecz=lv(3);
  return out;});
 // Item power gate via the card in the Kufer.
 await page.evaluate(()=>{window.__game.scene.resume('game');window.__game.scene.getScene('ui').openCharacter('eq');});
 await page.waitForSelector('#character',{timeout:10000});
 await page.evaluate(()=>{const c=[...document.querySelectorAll('#character .c-slot, #character [data-slot]')].find(el=>el.querySelector('img')?.src.includes('swietlisty'));c?.click();});
 await page.waitForTimeout(500);
 const karta=await page.evaluate(()=>[...document.querySelectorAll('#character .c-stat')].map(e=>({t:e.textContent.trim(),brak:e.classList.contains('brak')})));
 await page.screenshot({path:`work/specjalne/${mobile?'telefon':'komputer'}-karta.png`});
 console.log(mobile?'phone':'desktop',JSON.stringify(r),JSON.stringify(karta));
 assert.equal(r.miecz,'zamach');assert.deepEqual(r.zamach,[true,true]);
 assert.equal(r.tarcza,'tarcza');assert.deepEqual(r.tarczaHit.slice(0,2),[true,false]);
 assert.equal(r.luk,'przebicie');assert.deepEqual(r.przebicie,[true,true,true,false],'pierces 2 more, stops at the 4th');
 assert.equal(r.rozdzka,'krag');assert.deepEqual(r.krag,[true,true]);assert.equal(r.kula,'wachlarz');
 const moc=karta.find(k=>/Moc od/.test(k.t));assert(moc&&moc.brak,'power row red below skill 5: '+JSON.stringify(karta));
 assert(karta.some(k=>/Atak specjalny/.test(k.t)),'special row on the card');
 assert.deepEqual(errors,[]);
 await context.close();
}}finally{await browser.close();server.httpServer.close();}
console.log('specjalne OK');
