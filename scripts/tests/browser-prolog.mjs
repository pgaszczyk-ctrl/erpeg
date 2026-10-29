// Full game with real assets/controls/dungeons; RPCs and two map fixtures are isolated from real players.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { preview } from 'vite';
const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const mobile=process.env.TELEFON==='1',lang=process.env.JEZYK||'pl',tag=`${mobile?'phone':'desktop'}-${lang}`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false}).catch(async e=>{await new Promise(resolve=>server.httpServer.close(resolve));throw e;});
await mkdir('work/prolog',{recursive:true});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
const fresh={version:1,status:'active',stage:'intro',originMapId:'',originName:'',anchors:{},rewardsClaimed:[],storyItems:[],pendingRewards:[],bowTried:false,magicTried:false,rescueKilled:[],dungeon:null,service:'guard'};
let saved={coins:0,story:{st:'start',walked:0,prolog:fresh},flagi:{},bag:Array.from({length:20},()=>({item:'zelazny'})),equip:{bron:'zelazny',helm:'zelazny_helm'},language:lang,look:{guard3d:mobile?'k':'m',modul:{g:mobile?'01':'16',c:mobile?'01':'16',p:mobile?'k':'m',s:0,w:2,u:2,u2:1}}},exp=0;
const saves=[],errors=[];let failNext=false,failOrigin=2,originAttempts=0;
const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:lang==='pl'?'pl-PL':'en-US'});
await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
await context.route('**/map/towns/city-b.json',r=>r.fulfill({json:{...map,bounds:{...map.bounds,minLon:29,maxLon:29.1},towns:[['City B',2880,2880]]}}));
await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
await context.route('**/*.supabase.co/**',route=>{
 const name=new URL(route.request().url()).pathname.split('/').pop(),req=route.request().postDataJSON()??{};
 let body=null;
 if(name==='login') console.log('login',saved.tu?.m);
 if(name==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,save:saved,exp,dead:false,died_at:null,age:6,konto:true}};
 if(name==='save_game'){
  const prolog=req.p_save.story?.prolog;
  if(prolog?.originMapId && !Object.keys(prolog.anchors).length){
   originAttempts++;
   if(failOrigin>0){failOrigin--;return route.fulfill({status:500,json:{message:'canceling statement due to statement timeout'}});}
  }
  if(failNext){failNext=false;return route.fulfill({status:503,json:{message:'Test save unavailable'}});}
  saved=structuredClone(req.p_save);exp=req.p_exp;saves.push(structuredClone(saved));body=true;
 }
 if(['heartbeat','logout','log_error'].includes(name))body=true;
 if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(name))body=[];
 if(['game_settings','settings'].includes(name))body={};
 if(name==='server_now')body=new Date().toISOString();
 return route.fulfill({json:body});
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/Ludzik 3D: wyposażenie|Ludzik 3D: nie udało/.test(m.text()))errors.push(m.text());});
await page.addInitScript(()=>{window.__dialogi=[];window.addEventListener('load',()=>{const poll=setInterval(()=>{const game=window.__game;if(!game)return;game.events.on('dialog',d=>window.__dialogi.push(d));clearInterval(poll);},5);});});
const evalGame=(fn,arg)=>page.evaluate(fn,arg);
const waitStage=stage=>page.waitForFunction(st=>{const s=window.__game?.scene.getScene('game');return s?.prolog?.state?.stage===st&&!s.prolog.busy;},stage,{timeout:30000});
const choose=i=>evalGame(i=>{const d=window.__dialogi.at(-1);window.__game.scene.getScene('ui').closeDialog();d.onChoose(i);},i);
const go=async()=>{
 await page.goto('about:blank');
 await page.goto(`http://127.0.0.1:4173/?lang=${lang}&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1#postac=Jam&kod=ANGELIKA`);
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&window.__game.scene.getScene('game').firstViewReady?.(),null,{timeout:120000});
 await page.waitForFunction(()=>document.getElementById('loading-map')?.hidden !== false,null,{timeout:60000});
 console.log('loaded',saved.tu?.m,await page.evaluate(()=>window.__game.scene.getScene('game').city.id));
};
const at=async key=>evalGame(key=>{const s=window.__game.scene.getScene('game'),a=s.prolog.state.anchors[key],p=s.city.fromLatLon(a.lat,a.lon);s.player.setPosition(p.x,p.y);s.talkReadyAt=0;return p;},key);
const interact=async()=>{await evalGame(()=>{const s=window.__game.scene.getScene('game');s.talkReadyAt=0;s.interactChain(s.player.hitPoint(),false,false);});};
const kill=async mode=>evalGame(mode=>{const s=window.__game.scene.getScene('game');const es=mode==='rescue'?[...s.prolog.enemies.keys()]:s.enemies.filter(e=>s.loch.contains(e));for(const e of es){if(e.hit(s.player.getCenter(),s.time.now,10000))s.onEnemyKilled(e);}},mode);
try{
 await go();
 // An actual server timeout during origin saving is a save error, held until explicit retry.
 await page.waitForFunction(()=>/Zapis prologu|Prologue checkpoint/.test(window.__dialogi.at(-1)?.title));
 assert.equal(originAttempts,1);
 await page.screenshot({path:`work/prolog/${tag}-origin-timeout.png`});
 const failedOrigin=await evalGame(()=>window.__game.scene.getScene('game').prolog.state.originMapId);
 await page.waitForTimeout(1200);assert.equal(originAttempts,1,'no per-frame retry storm');
 await choose(0);
 await page.waitForFunction(()=>window.__dialogi.filter(d=>/Zapis prologu|Prologue checkpoint/.test(d.title)).length===2);
 assert.equal(originAttempts,2,'retry repeats the unconfirmed origin save');
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.state.originMapId),failedOrigin);
 await choose(0);
 await page.waitForFunction(()=>window.__dialogi.some(d=>/Starszy strażnik|Senior guard/.test(d.title)),null,{timeout:30000});
 const anchors=await evalGame(()=>window.__game.scene.getScene('game').prolog.state.anchors);
 await page.screenshot({path:`work/prolog/${tag}-intro.png`});
 failNext=true;await choose(0);
 await page.waitForFunction(()=>/Zapis prologu|Prologue checkpoint/.test(window.__dialogi.at(-1)?.title),null,{timeout:10000});
 await choose(0);await waitStage('letter_deliver');
 assert.equal(saved.story.prolog.pendingRewards.length,1,'full bag stores the previous sword');
 assert(saved.equip.bron==='miecz_rekruta');
 await go();await waitStage('letter_deliver');assert.deepEqual(saved.story.prolog.anchors,anchors);
 await at('outpost');await interact();await choose(0);await waitStage('letter_return');
 // A second city during the active quest: no second prologue and no moving the saved instructor.
 saved.tu={m:'city-b',x:2880,y:2880,s:1.92};await go();await waitStage('letter_return');
 assert.match(await evalGame(()=>window.__game.scene.getScene('game').activeQuests()[0].text),/Lublin/);
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.offerChief(()=>{})),false);
 saved.tu={m:'lublin',x:2880,y:2880,s:1.92};await go();await waitStage('letter_return');
 await at('mentor');await interact();await choose(0);await waitStage('rescue_fight');
 await page.waitForFunction(()=>window.__game.scene.getScene('game').prolog.enemies.size===2);
 await kill('rescue');await waitStage('rescue_reward');
 await go();await waitStage('rescue_reward');assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.enemies.size),0);
 await at('ambush');await interact();await choose(0);await waitStage('bow_trial');
 await at('bowPractice');
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.fireShot({id:'luk_rekruta',rodzaj:'luk',miejsce:'bron',moc:2},{x:1,y:0},false,s.time.now);});
 await waitStage('rescue_return');
 await page.waitForFunction(()=>window.__game.scene.getScene('game').ludzik3d?.equipmentKey==='luk:false',null,{timeout:30000});
 await page.screenshot({path:`work/prolog/${tag}-bow.png`});
 await at('mentor');await interact();await choose(0);await waitStage('dungeon_enter');
 await at('dungeonEntrance');
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.inCombat=()=>false;const a=s.prolog.state.anchors.dungeonEntrance,p=s.city.fromLatLon(a.lat,a.lon);s.zejdzDoLochu({id:a.id,rodzaj:'podziemia',seed:s.prolog.state.dungeon.seed,...p});});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').city.loch?.tutorial,null,{timeout:30000});
 await waitStage('dungeon_first_group');
 // Defeat just the first chamber, then pick up the real equipment.
 await evalGame(()=>{const s=window.__game.scene.getScene('game'),d=s.loch;for(const [e,i]of d.zywi)if(d.lokatorzy[i].komnata===d.firstChamber.i){if(e.hit(s.player.getCenter(),s.time.now,10000))s.onEnemyKilled(e);}});
 await waitStage('magic_pickup');
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.player.setPosition(s.loch.magicSpot.x,s.loch.magicSpot.y);});
 const uniform=await evalGame(()=>window.__game.scene.getScene('game').ludzik3d.g.model.getObjectByName('core').geometry.uuid);
 await interact();await choose(0);await waitStage('magic_trial');
 assert(saved.magic);assert.equal(saved.equip.bron,'rozdzka_szkolna');assert.equal(saved.equip.helm,'kapelusz_szkolny');
 assert.equal(saved.story.prolog.rewardsClaimed.filter(x=>x==='magic_set_received').length,1);
 await page.waitForFunction(()=>window.__game.scene.getScene('game').ludzik3d?.equipmentKey==='magia:true',null,{timeout:30000});
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').ludzik3d.g.model.getObjectByName('core').geometry.uuid),uniform,'magic preserves the guard uniform');
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.fireShot({id:'rozdzka_szkolna',rodzaj:'magia',miejsce:'bron',moc:2},{x:1,y:0},false,s.time.now);});
 await waitStage('dungeon_recover');await page.screenshot({path:`work/prolog/${tag}-magic.png`});
 await kill('dungeon');
 await page.waitForFunction(()=>!window.__game.scene.getScene('game').prolog.busy);
 const killed=saved.story.prolog.dungeon.killed.length;assert.equal(killed,3);
 // Reload returns to the entrance; the same tutorial instance has no duplicate monsters or equipment.
 await go();await waitStage('dungeon_recover');await at('dungeonEntrance');
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.inCombat=()=>false;const a=s.prolog.state.anchors.dungeonEntrance,p=s.city.fromLatLon(a.lat,a.lon);s.zejdzDoLochu({id:a.id,rodzaj:'podziemia',seed:s.prolog.state.dungeon.seed,...p});});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').city.loch?.tutorial);
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').loch.zostalo),0);
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.player.setPosition(s.loch.skrzynia.x,s.loch.skrzynia.y);});
 await interact();await choose(0);await waitStage('dungeon_return');
 await evalGame(()=>window.__game.scene.getScene('game').wyjdzZLochu());
 await page.waitForFunction(()=>!window.__game.scene.getScene('game').city.loch);
 await at('mentor');await interact();await choose(0);await waitStage('library_visit');
 await at('library');await interact();await page.screenshot({path:`work/prolog/${tag}-library.png`});await choose(0);await waitStage('completed');
 assert.equal(saved.missions['prolog.recruit.v1'],'done');
 const rewards=structuredClone(saved.story.prolog.rewardsClaimed),pending=structuredClone(saved.story.prolog.pendingRewards),doneExp=exp;
 saved.tu={m:'city-b',x:2880,y:2880,s:1.92};await go();await waitStage('completed');
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.offerChief(()=>{})),false,'another chief cannot restart a completed origin');
 assert.deepEqual(saved.story.prolog.rewardsClaimed,rewards);assert.deepEqual(saved.story.prolog.pendingRewards,pending);assert.equal(exp,doneExp);
 // An old character is guided before opting in, even with low EXP and no completed old tutorial.
 map.pois=[['police','Far post',3800,2880,0],['office','Closer office',2890,2880,0],['police','Nearest post',3100,2880,0]];
 saved={coins:0,story:{st:'koniec',walked:0},flagi:{},look:{modul:{g:'01',c:'01',p:'k',s:0,w:2,u:2,u2:1}}};exp=0;await go();
 const lead='prolog.recruit.v1:lead';
 assert.equal(await evalGame(()=>!!window.__game.scene.getScene('game').prolog.state),false);
 const guide=await evalGame(()=>window.__game.scene.getScene('game').activeQuests()[0]);
 assert.equal(guide.id,lead);assert.deepEqual(guide.pos,{x:3100,y:2880},'nearest police door, not the first station or a closer office');
 assert.match(guide.text,lang==='pl'?/Skąd mam ten uniform\? Nic nie pamiętam\. Muszę się dowiedzieć/:/Where did this uniform come from/);
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').samouczek),null,'no competing newsboy tutorial');
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').questCount()),0,'invitation does not occupy a mission slot');
 await page.waitForFunction(()=>window.__game.scene.getScene('ui').arrows[0]?.visible);
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').questLog()[0].id),lead);
 await page.screenshot({path:`work/prolog/${tag}-uniform-guide.png`});
 await evalGame(()=>{const s=window.__game.scene.getScene('game');s.story.goal=()=>({text:'Existing story',pos:{x:2800,y:2900}});});
 assert(await evalGame(()=>window.__game.scene.getScene('game').activeQuests().some(q=>q.id==='main')),'older quests remain available beside the invitation');
 await go();assert.equal((await evalGame(()=>window.__game.scene.getScene('game').activeQuests()[0])).id,lead,'guide returns on relog without starting the quest');
 await page.waitForFunction(()=>!!window.__game.scene.getScene('game').ludzik3d?.g);
 const identity=await evalGame(()=>{const g=window.__game.scene.getScene('game').ludzik3d.g;return {core:g.model.getObjectByName('core').geometry.uuid,head:g.model.getObjectByName('head').geometry.uuid};});
 const chief=await evalGame(()=>{const s=window.__game.scene.getScene('game');s.player.setPosition(3100,2880);return s.openDoorAt(3100,2880);});
 assert(chief,'the indicated real police door offers an old-character opt-in');
 assert.match(await evalGame(()=>window.__dialogi.at(-1).title),/Szef straży|Guard chief/);
 await choose(0);await waitStage('intro');
 await page.waitForFunction(()=>{const p=window.__game.scene.getScene('game').prolog;return p.state.anchors.mentor&&!p.busy;});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').activeQuests()[0]?.id==='prolog.recruit.v1');
 assert(!(await evalGame(()=>window.__game.scene.getScene('game').activeQuests())).some(q=>q.id===lead),'acceptance replaces the invitation');
 await page.waitForFunction(()=>window.__game.scene.getScene('game').ludzik3d?.equipmentKey==='miecz:false');
 assert.deepEqual(await evalGame(()=>{const g=window.__game.scene.getScene('game').ludzik3d.g;return {core:g.model.getObjectByName('core').geometry.uuid,head:g.model.getObjectByName('head').geometry.uuid};}),identity,'enrollment preserves the visible legacy guard, despite hidden female modular look');
 await page.screenshot({path:`work/prolog/${tag}-legacy-identity.png`});

 // A retained global completion marker alone must hide the invitation, also after changing city.
 saved={coins:0,story:{st:'koniec',walked:0},missions:{'prolog.recruit.v1':'done'},flagi:{samouczek:1},tu:{m:'city-b',x:2880,y:2880,s:1.92}};await go();
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.goal()),null);
 assert.equal(await evalGame(()=>window.__game.scene.getScene('game').prolog.offerChief(()=>{})),false);
 assert.deepEqual(errors,[]);
 console.log(`Prolog ${tag}: full playthrough, save failure/retry, reload, full bag, bow/magic, persistent dungeon, other city active/completed, old character nearest-post guide/relogin/acceptance/completion marker OK (${saves.length} saves)`);
}catch(e){console.error('Prologue test failure',await page.evaluate(()=>({stage:window.__game?.scene.getScene('game')?.prolog?.state?.stage,dialog:window.__dialogi?.at(-1)?.title})));await page.screenshot({path:`work/prolog/${tag}-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
