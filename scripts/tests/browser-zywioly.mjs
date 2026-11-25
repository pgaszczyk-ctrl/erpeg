// Elements, resistances and item requirements (owner, 25 Nov 2026): a skeleton resists the sword and burns in light,
// essences give the blows an element, Excalibur needs level 10 + krzepa 5 and wakes at krzepa 7 (light + Blask),
// Gromowładny needs level 8 + krzepa 6 and with magic 3 its blows may jump as chain lightning.
// Usage: npx vite build && node scripts/tests/browser-zywioly.mjs
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
await mkdir('work/zywioly',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4179,strictPort:true}});
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
 await page.goto('http://127.0.0.1:4179/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&chibi=0&mieszkancy3d=0&stwory3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 const r=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game'),gear=window.__gear,inv=window.__inv,ses=window.__session;
  window.__game.scene.pause('game');
  const reset=()=>{for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];};
  reset();s.player.x+=450;s.player.reach=1;s.player.face(1,0);s.protectUntil=Infinity;s.noHurtUntil=Infinity;
  s.city.buildingAt=()=>undefined;ses.level.celnosc=100;gear.magic=true;s.practiced=()=>{};
  const lv=(n)=>{let p=0;for(let l=2;l<=n;l++)p+=Math.round(100*1.5**(Math.min(l,10)-2)*1.25**Math.max(0,l-10));return p;};
  const exp=(n)=>50*(n-1)*n;
  gear.skills.miecz=lv(3);gear.skills.magia=lv(1);
  const spawn=(kind,dx,dy=0)=>{const e=s.spawnEnemy(s.player.x+dx,s.player.y+dy,'fx',kind);e.hp=10000;e.setVisible(true);return e;};
  const V=(x,y)=>new (s.player.facing.constructor)(x,y);
  // The table: a fixed blow of 10 with an element.
  const trafiony=(kind,zywiol)=>{reset();const e=spawn(kind,12);e.hit(V(s.player.x,s.player.y),s.time.now,10,{bohater:true,zywiol});return 10000-e.hp;};
  // A real swing: which element did the blow carry?
  const zywiolCiosu=()=>{reset();spawn('herszt',12);let z='?';const f=(t)=>{z=t.fx.zywiol??'fizyczny';};s.events.once('trafienie',f);
    s.resolveAttack(V(s.player.x+12,s.player.y+2),s.time.now);s.events.off('trafienie',f);return z;};
  const out={};
  gear.equip.bron='zelazny';gear.equip.dystans=null;gear.imbue={};
  out.zwykly=trafiony('herszt');out.szkielet=trafiony('szkielet');out.szkieletSwiatlo=trafiony('szkielet','swiatlo');
  out.chochlikOgien=trafiony('glut','ogien');out.driadaOgien=trafiony('driada','ogien');out.zombieMroz=trafiony('zombie','mroz');
  out.cioszwykly=zywiolCiosu();
  gear.imbue={zelazny:{e:'swiatlo',until:Date.now()+600000}};out.zywiolSwiatlo=inv.zywiolBroni();out.ciosSwiatlo=zywiolCiosu();
  gear.imbue={};
  // Excalibur: level and krzepa first, then the power at krzepa 7.
  ses.exp=exp(9);out.ex9=inv.weaponRequirement('excalibur');
  ses.exp=exp(10);out.ex10k3=inv.weaponRequirement('excalibur');
  gear.skills.miecz=lv(5);out.ex10k5=inv.weaponRequirement('excalibur');
  gear.equip.bron='excalibur';out.exSpec5=s.umiejetnosc().id;out.exZyw5=inv.zywiolBroni()??null;
  gear.skills.miecz=lv(7);out.exSpec7=s.umiejetnosc().id;out.exZyw7=inv.zywiolBroni()??null;
  reset();const a=spawn('szkielet',14),b=spawn('herszt',-14,4);s.zaplacMocny=()=>true;s.specjalny(s.time.now);
  out.blask=[10000-a.hp,10000-b.hp,(a.dazedUntil??0)>s.time.now];
  // Gromowładny: level 8, krzepa 6, chain with magic 3.
  gear.skills.miecz=lv(5);ses.exp=exp(7);out.gr7=inv.weaponRequirement('gromowladny');
  ses.exp=exp(8);out.gr8k5=inv.weaponRequirement('gromowladny');
  gear.skills.miecz=lv(6);out.gr8k6=inv.weaponRequirement('gromowladny');
  gear.equip.bron='gromowladny';out.grZyw=inv.zywiolBroni()??null;out.lancuchM1=!!inv.lancuchBroni();
  gear.skills.magia=lv(3);out.lancuchM3=!!inv.lancuchBroni();
  return out;});
 // Chain lightning needs the scene running (the jump comes a moment after the blow).
 const lancuch=await page.evaluate(async()=>{
  const s=window.__game.scene.getScene('game');window.__game.scene.resume('game');
  for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];
  const sp=(dx,dy=0)=>{const e=s.spawnEnemy(s.player.x+dx,s.player.y+dy,'fx','herszt');e.hp=10000;e.setVisible(true);e.brain=()=>{};e.chasing=false;return e;};
  const t=[sp(12),sp(30,4),sp(46,-4),sp(140)];
  const L=window.__inv.lancuchBroni();const sz=L.szansa;L.szansa=1;
  try{s.resolveAttack(new (s.player.facing.constructor)(s.player.x+12,s.player.y+2),s.time.now);}finally{L.szansa=sz;}
  await new Promise(r=>setTimeout(r,400));
  return t.map(e=>10000-e.hp);});
 // The Kufer card of Excalibur shows its requirements and power.
 await page.evaluate(()=>{const g=window.__gear;const lv=(n)=>{let p=0;for(let l=2;l<=n;l++)p+=Math.round(100*1.5**(Math.min(l,10)-2)*1.25**Math.max(0,l-10));return p;};
  window.__session.exp=50*9*10;g.skills.miecz=lv(7);g.equip.bron='excalibur';window.__game.scene.getScene('ui').openCharacter('eq');});
 await page.waitForSelector('#character',{timeout:10000});
 await page.evaluate(()=>{const c=[...document.querySelectorAll('#character .c-slot, #character [data-slot]')].find(el=>el.querySelector('img')?.src.includes('swietlisty'));c?.click();});
 await page.waitForTimeout(500);
 const karta=await page.evaluate(()=>[...document.querySelectorAll('#character .c-stat')].map(e=>({t:e.textContent.trim(),brak:e.classList.contains('brak')})));
 await page.screenshot({path:`work/zywioly/${mobile?'telefon':'komputer'}-excalibur.png`});
 console.log(mobile?'phone':'desktop',JSON.stringify(r),JSON.stringify(lancuch),JSON.stringify(karta.slice(0,9)));
 const near=(a,b)=>Math.abs(a-b)<=Math.max(0.05,b*0.02);
 assert.equal(r.zwykly,10);assert(near(r.szkielet,7.5),'skeleton resists physical');
 assert.equal(r.zywiolSwiatlo,'swiatlo');assert(near(r.szkieletSwiatlo,20),'skeleton weak to light');
 assert.equal(r.cioszwykly,'fizyczny');assert.equal(r.ciosSwiatlo,'swiatlo','the essence gives the swing its element');
 assert(near(r.chochlikOgien,5),'imp resists fire');assert(near(r.driadaOgien,17.5),'dryad burns');
 assert(near(r.zombieMroz,5),'zombie resists frost');
 assert.match(r.ex9,/poziomu postaci: 10/);assert.match(r.ex10k3,/krzepy: 5/);assert.equal(r.ex10k5,null);
 assert.equal(r.exSpec5,'zamach');assert.equal(r.exZyw5,null);
 assert.equal(r.exSpec7,'blask');assert.equal(r.exZyw7,'swiatlo');
 assert(r.blask[0]>0&&r.blask[1]>0&&r.blask[0]>r.blask[1],'Blask hits all round, the skeleton harder: '+r.blask);
 assert.match(r.gr7,/poziomu postaci: 8/);assert.match(r.gr8k5,/krzepy: 6/);assert.equal(r.gr8k6,null);
 assert.equal(r.grZyw,'piorun');assert.equal(r.lancuchM1,false);assert.equal(r.lancuchM3,true);
 assert(lancuch[0]>0&&lancuch[1]>0&&lancuch[2]>0&&lancuch[3]===0,'chain jumps to the two near ones, not the far one: '+lancuch);
 assert(karta.some(k=>/Wymaga poziomu/.test(k.t)&&!k.brak),'level row met: '+JSON.stringify(karta));
 assert(karta.some(k=>/Moc od krzepy 7/.test(k.t)&&!k.brak),'power row awake at krzepa 7');
 assert(karta.some(k=>/Atak specjalny/.test(k.t)&&/Blask/.test(k.t)),'special = Blask');
 assert.deepEqual(errors,[]);
 await context.close();
}}finally{await browser.close();server.httpServer.close();}
console.log('zywioly OK');
