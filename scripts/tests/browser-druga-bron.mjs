// Dual wielding (owner, 25 Nov 2026): a one-handed weapon in the second hand – its powers work, +50 % of its damage.
// Usage: npx vite build && node scripts/tests/browser-druga-bron.mjs
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
await mkdir('work/druga-bron',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4181,strictPort:true}});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce',locale:'pl-PL'});
 await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
 await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
 await context.route('**/*.supabase.co/**',r=>{const fn=new URL(r.request().url()).pathname.split('/').pop();let json=null;
  if(fn==='login')json={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:50*9*10,dead:false,age:12,konto:true,save:{coins:0,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'stalowy'},bag:[{item:'gromowladny'},{item:'luk'}]}}};
  if(['heartbeat','logout','log_error','save_game'].includes(fn))json=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))json=[];
  if(fn==='game_settings')json={};if(fn==='server_now')json=new Date().toISOString();return r.fulfill({json});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4181/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&chibi=0&mieszkancy3d=0&stwory3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 // Skills high enough for the thunder sword, then drag it from the backpack onto „Druga ręka” in the Kufer.
 await page.evaluate(()=>{const g=window.__gear;const lv=(n)=>{let p=0;for(let l=2;l<=n;l++)p+=Math.round(100*1.5**(Math.min(l,10)-2)*1.25**Math.max(0,l-10));return p;};
  g.skills.miecz=lv(7);g.skills.magia=lv(3);window.__game.scene.getScene('ui').openCharacter('eq');});
 await page.waitForSelector('#character',{timeout:10000});
 await page.waitForTimeout(400);
 // Drag with the pointer: backpack cell → second-hand cell.
 const boxes=await page.evaluate(()=>{
  const from=[...document.querySelectorAll('#character .sl-cell[data-zone=bag]')].find(c=>c.title.includes('Gromowładny'));
  const to=document.querySelector('#character .sl-cell[data-zone=eq][data-key=dystans]');
  from?.scrollIntoView({block:'center'});
  const b=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};};
  return {from:b(from),to:b(to)};});
 console.log(mobile?'phone':'desktop','cells',JSON.stringify(boxes));
 if(boxes.from&&boxes.to){
  await page.mouse.move(boxes.from.x,boxes.from.y);await page.mouse.down();
  for(let k=1;k<=10;k++)await page.mouse.move(boxes.from.x+(boxes.to.x-boxes.from.x)*k/10,boxes.from.y+(boxes.to.y-boxes.from.y)*k/10);
  await page.mouse.up();await page.waitForTimeout(300);
 }
 const eq=await page.evaluate(()=>({bron:window.__gear.equip.bron,dystans:window.__gear.equip.dystans}));
 await page.screenshot({path:`work/druga-bron/${mobile?'telefon':'komputer'}-kufer.png`});
 assert.equal(eq.dystans,'gromowladny','dragged onto the second hand: '+JSON.stringify(eq));
 // The bow can't go there.
 const lukZostal=await page.evaluate(()=>window.__gear.bag.some(s=>s.item==='luk'));assert(lukZostal);
 // Close the Kufer, then: the thunder sword in the left hand strikes by itself, and the blow is stronger.
 await page.keyboard.press('Escape');await page.waitForTimeout(300);
 const fight=await page.evaluate(async()=>{
  const s=window.__game.scene.getScene('game'),g=window.__gear;
  if(!window.__game.scene.isActive('game'))window.__game.scene.resume('game');
  for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];
  s.protectUntil=Infinity;s.noHurtUntil=Infinity;s.player.x+=450;s.city.buildingAt=()=>undefined;
  const e=s.spawnEnemy(s.player.x+20,s.player.y,'fx','herszt');e.hp=10000;e.setVisible(true);e.brain=()=>{};e.chasing=false;
  s.lastBolt=0;await new Promise(r=>setTimeout(r,1500));
  const bolt=10000-e.hp;
  return {bolt,inv:window.__inv.zywiolBroni()};});
 console.log(mobile?'phone':'desktop',JSON.stringify(eq),JSON.stringify(fight),errors);
 assert(fight.bolt>0,'lightning from the second-hand sword');
 assert.equal(fight.inv,'piorun');
 assert.deepEqual(errors,[]);
 await context.close();
}}finally{await browser.close();await server.close();}
console.log('browser-druga-bron OK');
