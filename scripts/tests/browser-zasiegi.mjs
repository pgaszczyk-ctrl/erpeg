// Built-game combat checks. Map, accounts and all server writes are isolated fixtures.
import {createRequire, stripTypeScriptTypes} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=stripTypeScriptTypes(await readFile('src/content/walka.ts','utf8'),{mode:'transform',disableExperimentalWarning:true});
const {zasiegDystansu}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const level of [1,2,3,4,10,20]) assert(Math.abs(zasiegDystansu(level,20)-40*1.2**Math.max(0,level-3))<1e-7);
const levels={};let points=0;for(let l=1;l<=20;l++){if(l>1)points+=Math.round(100*1.5**(Math.min(l,10)-2)*1.25**Math.max(0,l-10));levels[l]=points;}
await mkdir('work/zasiegi',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4177,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox','--enable-unsafe-swiftshader']});
const results=[];
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
 await page.goto('http://127.0.0.1:4177/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=0&mieszkancy3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 const report=await page.evaluate(({levels})=>{
 const s=window.__game.scene.getScene('game'),gear=window.__gear;
 window.__game.scene.pause('game');
 for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];
 s.player.x+=450;s.player.reach=1;s.player.face(1,0);s.protectUntil=Infinity;s.noHurtUntil=Infinity;
 const reset=()=>{for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();e.destroy();}s.wilki.clear();s.enemies=[];for(const q of s.shots)q.sprite.destroy();s.shots=[];};
 const spawn=(dx,dy=0)=>{const e=s.spawnEnemy(s.player.x+dx,s.player.y+dy,'range-fixture','herszt');e.hp=10000;e.spokojny=false;e.setVisible(true);return e;};
 const accuracy=window.__session.level.celnosc;window.__session.level.celnosc=100;
 const build=s.city.buildingAt;s.city.buildingAt=()=>undefined;
 gear.magic=true;gear.ammo.strzaly=1000;const ranges=[];
 for(const skill of ['luk','magia'])for(const level of [1,2,3,4,10,20]){
 gear.skills[skill]=levels[level];const expected=40*1.2**Math.max(0,level-3);
 if(Math.abs(s.shotRange(skill)-expected)>1e-7)throw Error('wrong skill range '+skill+' '+level);
 reset();gear.equip.bron=skill==='luk'?'luk_rekruta':'rozdzka_szkolna';
 s.fireShot({id:gear.equip.bron,miejsce:'bron',rodzaj:skill,moc:2},{x:1,y:0},false,s.time.now,false,false);
 const q=s.shots[0];if(!q)throw Error('no projectile');
 if(Math.abs(q.left-expected)>1e-7)throw Error('projectile range differs');
 if(skill==='luk'&&level<=3&&!(q.arc>0&&Math.hypot(q.vx,q.vy)<100))throw Error('missing slow arc');
 if(skill==='magia'&&q.arc!==0)throw Error('spell must fly straight');
 s.updateShots(100);if(s.shots.length)throw Error('projectile did not expire');
 if(Math.hypot(q.x-q.originX,q.y-q.originY)>expected+1e-6)throw Error('projectile overshot');
 ranges.push({skill,level,range:expected});
 }
 // Boundaries, including oversized frames and a visible fall: outside is always harmless.
 for(const skill of ['luk','magia'])for(const offset of [-.1,0,.1]){
 reset();gear.skills[skill]=0;gear.equip.bron=skill==='luk'?'luk_rekruta':'rozdzka_szkolna';const e=spawn(40+offset);
 s.fireShot({id:gear.equip.bron,miejsce:'bron',rodzaj:skill,moc:2},{x:1,y:0},false,s.time.now,false,false);s.updateShots(5);
 if((e.hp<10000)!==(offset<=0))throw Error('range edge '+skill+' '+offset);
 if(offset>0&&e.pursuitUntil!==-Infinity)throw Error('out-of-range shot provoked');
 }
 reset();gear.skills.luk=0;gear.equip.bron='luk_rekruta';const near=spawn(19),far=spawn(34);
 s.fireShot({id:'luk_rekruta',miejsce:'bron',rodzaj:'luk',moc:2},{x:1,y:0},false,s.time.now,false,false);s.updateShots(5);
 if(!(near.hp<10000&&far.hp===10000))throw Error('basic shot hit multiple enemies');
 reset();const wallFoe=spawn(32);s.city.buildingAt=(x)=>x>=s.player.x+12?'fixture-wall':undefined;
 s.fireShot({id:'luk_rekruta',miejsce:'bron',rodzaj:'luk',moc:2},{x:1,y:0},false,s.time.now,false,false);s.updateShots(5);
 if(wallFoe.hp!==10000)throw Error('shot passed wall');s.city.buildingAt=()=>undefined;
 reset();gear.equip.bron='zelazny';gear.skills.miecz=levels[10];const front=spawn(14,2),side=spawn(15,4),back=spawn(-5,2);
 s.resolveAttack(s.player.hitPoint(),s.time.now);if(!(front.hp<10000&&side.hp===10000&&back.hp===10000))throw Error('ordinary melee is not single forward target');
 // A miss must not consume the one damage target or provoke the missed enemy.
 reset();gear.equip.bron='luk_rekruta';gear.skills.luk=0;const missed=spawn(20);window.__session.level.celnosc=-100;
 s.fireShot({id:'luk_rekruta',miejsce:'bron',rodzaj:'luk',moc:2},{x:1,y:0},false,s.time.now,false,false);s.updateShots(5);
 if(missed.hp!==10000||missed.pursuitUntil!==-Infinity)throw Error('miss damaged or provoked');
 // Owner 30 Oct 2026: aim assist stays; a lobbed arrow steers onto a moving creature, a spell leads it in a straight line.
 window.__session.level.celnosc=100;
 for(const skill of ['luk','magia']){
 reset();gear.skills[skill]=0;gear.equip.bron=skill==='luk'?'luk_rekruta':'rozdzka_szkolna';const mover=spawn(30,-4);mover.vel.set(0,40);
 s.fireShot({id:gear.equip.bron,miejsce:'bron',rodzaj:skill,moc:2},{x:1,y:0},false,s.time.now,false,true);const q=s.shots[0];
 if(skill==='magia'&&!(q.vy>0))throw Error('spell not led onto the moving target');
 for(let i=0;i<30&&s.shots.length;i++){mover.y+=40*0.03;s.updateShots(0.03);}
 if(mover.hp===10000)throw Error(skill+' missed a moving assisted target');
 }
 window.__session.level.celnosc=accuracy;s.city.buildingAt=build;reset();
 // Let the actual loop create an AI first; the next evaluation exercises its real update.
 window.__rangeEnemy=spawn(600);window.__rangeEnemy.leash={x:window.__rangeEnemy.x,y:window.__rangeEnemy.y,r:20};
 window.__rangeEnemy.hit(s.player,s.time.now,1);
 window.__game.scene.resume('game');return{ranges};
 },{levels});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').wilki.has(window.__rangeEnemy),null,{timeout:15000});
 const chase=await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),e=window.__rangeEnemy,ai=s.wilki.get(e);window.__game.scene.pause('game');
 ai.update(s.time.now+400,.016);if(!(ai.inCombat&&e.vel.x<0))throw Error('distant hit does not chase');
 const until=e.pursuitUntil;e.x=s.player.x+350;ai.update(s.time.now+500,.016);if(!(ai.inCombat&&e.vel.x<0))throw Error('leash interrupted pursuit');
 ai.stan='powrot';e.hit(s.player,s.time.now+600,1);ai.update(s.time.now+1000,.016);if(!ai.inCombat)throw Error('hit during retreat did not re-engage');
 ai.update(e.pursuitUntil+1,.016);if(ai.stan!=='powrot')throw Error('pursuit never disengages after no further hits');
 return{until,returnState:ai.stan};});
 // Check the actual touch/key input observes the ranged cooldown.
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');s.player.lastAttack=-Infinity;s.lastShot=-Infinity;window.__gear.equip.bron='luk_rekruta';window.__gear.skills.luk=0;s.applySkill();s.shots=[];window.__rangeEnemy.hp=0;window.__game.scene.resume('game');});
 if(mobile){await page.locator('.hs-atak').tap();await page.locator('.hs-atak').tap();}else{await page.keyboard.press('Space');await page.keyboard.press('Space');}
 await page.waitForTimeout(100);
 const cooldown=await page.evaluate(()=>{const s=window.__game.scene.getScene('game');window.__game.scene.pause('game');return{shots:s.shots.length,ms:s.player.attackCooldown};});
 assert.equal(cooldown.shots,1,'two immediate real inputs produce one shot');assert.equal(cooldown.ms,650);
 await page.screenshot({path:`work/zasiegi/${mobile?'phone':'desktop'}.png`});assert.deepEqual(errors,[]);
 results.push({mobile,...report,chase,cooldown});console.log('PASS',mobile?'phone':'desktop','ranges / strict boundary / slow arc / single target / walls / miss / distant chase / leash / retreat refresh / input cooldown');await context.close();
}await writeFile('work/zasiegi/results.json',JSON.stringify(results,null,2));}finally{await browser.close();await server.httpServer.close();}
