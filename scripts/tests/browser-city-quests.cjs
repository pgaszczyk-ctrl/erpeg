const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const {preview}=await import('vite');
 const server=await preview({preview:{host:'127.0.0.1',port:4173}});
 let browser;
 try {browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});}
 catch(error){await new Promise(r=>server.httpServer.close(r));throw error;}
 let latestSave=null, start=null; const errors=[];
 async function pageFor(lang,width,height){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  // Every RPC is intercepted: no real login, heartbeat or save reaches Supabase.
  await page.route('**/rest/v1/rpc/**',async route=>{
   const fn=new URL(route.request().url()).pathname.split('/').pop();
   const body=route.request().postDataJSON();
   if(fn==='save_game'){latestSave=body.p_save;return route.fulfill({json:true});}
   if(fn==='login')return route.fulfill({json:{token:'offline-browser-test',player:{name:'Arceus',idik:'TESTCODE',start_place:'Plac Zamkowy',start_x:start.x,start_y:start.y,map_scale:1.92,exp:0,dead:false,died_at:null,age:7,immortal:true,save:latestSave??{coins:10,story:{st:'koniec',walked:0}}}}});
   return route.fulfill({json:['heartbeat','logout'].includes(fn)?true:[]});
  });
  await page.goto(`http://127.0.0.1:4173/?lang=${lang}`);
  await page.waitForSelector('#menu',{timeout:60000});
  start=await page.evaluate(()=>window.__game.registry.get('city').findAnyStart('Plac Zamkowy','Plac Zamkowy'));
  const inputs=page.locator('#menu input');await inputs.nth(0).fill('Arceus');await inputs.nth(1).fill('TESTCODE');
  await page.getByRole('button',{name:lang==='pl'?'Wczytaj':'Wczytaj',exact:true}).click();
  await page.waitForFunction(()=>window.__game?.scene.getScene('game').missions?.some(r=>r.m.id==='quest.clock_opinion')||window.__session.missions['quest.clock_opinion']==='done',null,{timeout:60000});
  await page.waitForFunction(()=>document.getElementById('loading-map')?.hidden,null,{timeout:60000});
  await page.evaluate(()=>window.__game.events.on('dialog',req=>{window.__dialog=req;}));
  return page;
 }
 async function click(page,label){
  await page.waitForFunction(label=>window.__dialog?.buttons.includes(label),label);
  await page.waitForTimeout(300);
  const p=await page.evaluate(label=>{const ui=window.__game.scene.getScene('ui');const i=window.__dialog.buttons.indexOf(label);const r=ui.dialogButtons.find(b=>b.index===i).rect;return {x:r.x+r.width/2,y:r.y+r.height/2};},label);
  const size=page.viewportSize();assert(p.x>=0&&p.y>=0&&p.x<size.width&&p.y<size.height,`Button outside viewport: ${label}`);
  await page.mouse.click(p.x,p.y);
 }
 async function offer(page,id){await page.evaluate(id=>{const sc=window.__game.scene.getScene('game');const rm=sc.missions.find(r=>r.m.id===id);sc.openMissionDialog(rm);},id);}
 async function goToGoal(page,id){await page.evaluate(id=>{const sc=window.__game.scene.getScene('game'),rm=sc.missions.find(r=>r.m.id===id);sc.player.setPosition(rm.target.x,rm.target.y);},id);await page.waitForTimeout(400);}
 try{
  let pl=await pageFor('pl',390,844);
  const offers=await pl.evaluate(()=>window.__game.scene.getScene('game').missions.filter(r=>r.m.scenariusz).map(r=>r.m.id));assert(offers.length>=4);
  await offer(pl,'quest.clock_opinion');await pl.screenshot({path:'.cache/quest-phone-offer.png'});
  await click(pl,'Przyjmuję');await goToGoal(pl,'quest.clock_opinion');
  await click(pl,'A');await click(pl,'Spróbuję jeszcze raz');await click(pl,'B');
  await click(pl,'Wymienię czujnik B');
  await pl.waitForFunction(()=>window.__dialog?.buttons.includes('Dziękuję!'),null,{timeout:20000});
  await pl.screenshot({path:'.cache/quest-phone-completion.png'});await click(pl,'Dziękuję!');
  await pl.waitForFunction(()=>window.__session.missions['quest.clock_opinion']==='done');
  await pl.waitForTimeout(300);assert.equal(latestSave.missions['quest.clock_opinion'],'done');assert(!latestSave.gen.some(m=>m.id==='quest.clock_opinion'));
  // A real two-of-three investigation: inspect out of order, save one clue, change language.
  await offer(pl,'quest.pact_pages');await click(pl,'Przyjmuję');await click(pl,'Ruszam!');
  async function clue(page,id){await page.evaluate(id=>{const sc=window.__game.scene.getScene('game'),m=window.__session.gen['quest.pact_pages'];const c=m.etapy[0].tropy.find(c=>c.id===id);const at=sc.city.fromLatLon(c.miejsce.lat,c.miejsce.lon);sc.player.setPosition(at.x,at.y);},id);await page.waitForTimeout(400);}
  await clue(pl,'receiver_bc');await click(pl,'Zapisz trop');await pl.waitForTimeout(300);
  assert.equal(latestSave.gen.find(m=>m.id==='quest.pact_pages').scenariusz.choices['clues:0'],'receiver_bc');
  const notebook=await pl.evaluate(()=>({hud:window.__game.scene.getScene('game').activeQuests().find(q=>q.id==='quest.pact_pages').text,log:window.__game.scene.getScene('game').questLog().find(q=>q.id==='quest.pact_pages').text}));
  assert(!notebook.hud.includes('{B, C}'));assert(notebook.log.includes('{B, C}'));
  await pl.screenshot({path:'.cache/quest-phone-investigation.png'});
  await pl.close();pl=await pageFor('en',390,844);await pl.waitForTimeout(2000);
  await clue(pl,'receiver_bd');await click(pl,'Record clue');await goToGoal(pl,'quest.pact_pages');await click(pl,'B');
  // Wrong card gives a retry without damage. Correct partial arrangements survive another login.
  const hp=await pl.evaluate(()=>window.__game.scene.getScene('game').player.hp);
  await click(pl,'Comet: awakening');await click(pl,'Try again');await click(pl,'Pact: shared energy');
  await pl.screenshot({path:'.cache/quest-phone-cards-en.png'});await click(pl,'Later');await pl.waitForTimeout(300);
  assert.equal(latestSave.gen.find(m=>m.id==='quest.pact_pages').scenariusz.choices['cards:2'],'pact');
  assert.equal(await pl.evaluate(()=>window.__game.scene.getScene('game').player.hp),hp);
  await pl.close();pl=await pageFor('pl',390,844);await pl.waitForTimeout(2000);await goToGoal(pl,'quest.pact_pages');
  await click(pl,'Wojna: odejście smoków');await click(pl,'Kometa: przebudzenie');await click(pl,'Dziękuję!');await pl.waitForTimeout(300);
  assert.equal(latestSave.missions['quest.pact_pages'],'done');
  // Travel the same character to Puławy and retain the global completion ledger.
  await pl.evaluate(async()=>{const game=window.__game,sc=game.scene.getScene('game');const raw=await(await fetch('map/towns/pulawy.json')).json();const city=new sc.city.constructor(raw,'pulawy');const p=city.places.find(p=>p.kind==='office').door;window.__session.arrive=p;game.registry.set('city',city);game.scene.stop('ui');sc.scene.restart();});
  await pl.waitForFunction(()=>window.__game.scene.getScene('game').city.id==='pulawy'&&window.__game.scene.getScene('game').missions.some(r=>r.m.id==='quest.flask_guardian'),null,{timeout:20000});
  assert.equal(await pl.evaluate(()=>window.__game.scene.getScene('game').missions.some(r=>r.m.id==='quest.clock_opinion')),false);
  await offer(pl,'quest.flask_guardian');await click(pl,'Przyjmuję');await goToGoal(pl,'quest.flask_guardian');await click(pl,'Liść: filtr wyciszający');await click(pl,'Dalej');
  await pl.waitForTimeout(300);assert.equal(latestSave.gen.find(m=>m.id==='quest.flask_guardian').scenariusz.choices.essence,'leaf');assert.equal(latestSave.etap['quest.flask_guardian'],1);
  await pl.close();
  // Actual login/load path in another language reconstructs the accepted scenario.
  const en=await pageFor('en',1280,800);await en.waitForTimeout(2000);
  const state=await en.evaluate(()=>({done:window.__session.missions['quest.clock_opinion'],bound:window.__session.gen['quest.flask_guardian'].scenariusz,log:window.__game.scene.getScene('game').questLog(),offered:window.__game.scene.getScene('game').missions.map(r=>r.m.id)}));
  assert.equal(state.done,'done');assert.equal(state.bound.mapId,'pulawy');assert.equal(state.bound.choices.essence,'leaf');assert(!state.offered.includes('quest.flask_guardian'));assert(state.log.some(q=>q.id==='quest.flask_guardian'&&q.text.includes('Continue in Puławy')));
  await offer(en,'quest.helper_workshop');await en.screenshot({path:'.cache/quest-desktop-en.png'});
  const metadata=await en.evaluate(()=>({language:window.__dialog.language,humor:window.__dialog.localHumor,buttons:window.__dialog.buttonMetadata,text:window.__dialog.text}));assert.equal(metadata.language,'en');assert.equal(typeof metadata.humor,'boolean');assert(metadata.buttons.every(b=>b.language==='en'&&typeof b.localHumor==='boolean'));assert(!metadata.text.includes('Pomocnik'));
  assert.deepEqual(errors,[]);console.log('PASS: real login/save/reload; full clock quest with incorrect answer and repair; completed Puławy→Lublin block; active quest origin and choices; two-of-three evidence and partial-card reload in PL/EN; no wrong-card damage; PL/EN phone 390×844 / EN desktop 1280×800. All RPCs mocked.');
 }finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
