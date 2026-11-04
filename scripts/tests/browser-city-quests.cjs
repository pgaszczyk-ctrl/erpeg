const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const {preview}=await import('vite');
 const {materializeScenario}=await import('../../.cache/quest-tests/scenarios.mjs');
 const definitions=JSON.parse(fs.readFileSync('src/content/questy/runtime.json'));
 const retired=new Set(definitions.map(q=>q.id));
 const server=await preview({preview:{host:'127.0.0.1',port:4173}});
 let browser;
 try {browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});}
 catch(error){await new Promise(r=>server.httpServer.close(r));throw error;}
 let latestSave=null, start=null; const errors=[];
 async function pageFor(lang,width,height){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  // All RPCs intercepted: never log in, save or award a real player.
  await page.route('**/rest/v1/rpc/**',async route=>{
   const fn=new URL(route.request().url()).pathname.split('/').pop();
   if(fn==='save_game'){latestSave=route.request().postDataJSON().p_save;return route.fulfill({json:true});}
   if(fn==='login')return route.fulfill({json:{token:'offline-browser-test',player:{name:'Arceus',idik:'TESTCODE',start_place:'Plac Zamkowy',start_x:start.x,start_y:start.y,map_scale:1.92,exp:0,dead:false,died_at:null,age:7,immortal:true,save:latestSave}}});
   return route.fulfill({json:['heartbeat','logout'].includes(fn)?true:[]});
  });
  await page.goto(`http://127.0.0.1:4173/?lang=${lang}`);
  await page.waitForSelector('#menu',{timeout:60000});
  start=await page.evaluate(()=>window.__game.registry.get('city').findAnyStart('Plac Zamkowy','Plac Zamkowy'));
  if(!latestSave){
   const anchor=await page.evaluate(p=>window.__game.registry.get('city').toLatLon(p.x,p.y),start);
   const gen=definitions.map((q,i)=>materializeScenario(q.id,{version:1,mapId:i%2?'pulawy':'lublin',mapName:i%2?'Puławy':'Lublin',giverName:'Archiwum',anchors:[anchor,anchor,anchor,anchor],choices:{},routeM:0}));
   latestSave={coins:10,story:{st:'koniec',walked:0},gen,missions:Object.fromEntries(gen.map((m,i)=>[m.id,['active','goal','done'][i%3]])),etap:Object.fromEntries(gen.map(m=>[m.id,0]))};
  }
  const inputs=page.locator('#menu input');await inputs.nth(0).fill('Arceus');await inputs.nth(1).fill('TESTCODE');
  await page.getByRole('button',{name:'Wczytaj',exact:true}).click();
  await page.waitForFunction(()=>window.__game?.scene.getScene('game').missions?.some(r=>r.m.id==='zamek'),null,{timeout:60000});
  await page.waitForFunction(()=>document.getElementById('loading-map')?.hidden,null,{timeout:60000});
  await page.evaluate(()=>window.__game.events.on('dialog',req=>{window.__dialog=req;}));
  return page;
 }
 async function assertAbsent(page){
  const snapshot=await page.evaluate(()=>{const s=window.__game.scene.getScene('game');return {missions:s.missions.map(r=>r.m.id),markers:[...s.markers.keys()],journal:s.questLog().map(q=>q.id),active:s.activeQuests().map(q=>q.id)};});
  for(const [view,ids] of Object.entries(snapshot))assert(!ids.some(id=>retired.has(id)),`Withdrawn quest in ${view}`);
 }
 async function click(page,label){
  await page.waitForFunction(label=>window.__dialog?.buttons.includes(label),label);
  await page.waitForTimeout(300);
  const p=await page.evaluate(label=>{const ui=window.__game.scene.getScene('ui');const i=window.__dialog.buttons.indexOf(label);const r=ui.dialogButtons.find(b=>b.index===i).rect;return {x:r.x+r.width/2,y:r.y+r.height/2};},label);
  const size=page.viewportSize();assert(p.x>=0&&p.y>=0&&p.x<size.width&&p.y<size.height,`Button outside viewport: ${label}`);
  await page.mouse.click(p.x,p.y);
 }
 try{
  fs.mkdirSync('.cache',{recursive:true});
  let pl=await pageFor('pl',390,844);await assertAbsent(pl);
  await pl.evaluate(()=>{const s=window.__game.scene.getScene('game');s.openMissionDialog(s.missions.find(r=>r.m.id==='zamek'));});
  await pl.screenshot({path:'.cache/quest-rollback-phone-legacy.png'});
  await click(pl,'Przyjmuję');
  await pl.waitForFunction(()=>window.__session.missions.zamek==='active');
  await pl.waitForTimeout(400);assert.equal(latestSave.missions.zamek,'active');
  for(const [i,q] of definitions.entries())if(i%3!==2)assert(latestSave.gen.some(m=>m.id===q.id),'Retired checkpoint must remain in save');
  const coins=latestSave.coins;assert.equal(coins,10,'No retired reward');
  await pl.close();
  const en=await pageFor('en',1280,800);await assertAbsent(en);
  assert.equal(await en.evaluate(()=>window.__session.missions.zamek),'active');
  assert(await en.evaluate(()=>window.__game.scene.getScene('game').activeQuests().some(q=>q.id==='zamek')));
  await en.screenshot({path:'.cache/quest-rollback-desktop.png'});
  // Same saved character in another city: no foreign retired journal entries or offers.
  await en.evaluate(async()=>{const game=window.__game,sc=game.scene.getScene('game');const raw=await(await fetch('map/towns/pulawy.json')).json();const city=new sc.city.constructor(raw,'pulawy');window.__session.arrive=city.places.find(p=>p.kind==='office').door;game.registry.set('city',city);game.scene.stop('ui');sc.scene.restart();});
  await en.waitForFunction(()=>window.__game.scene.getScene('game').city.id==='pulawy',null,{timeout:30000});
  await en.waitForTimeout(17000);await assertAbsent(en);
  await en.setViewportSize({width:390,height:844});
  await en.screenshot({path:'.cache/quest-rollback-phone-pulawy.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: all12 withdrawn quests absent from offers/markers/activities/arrows/journal after real login and PL/EN reload, including active/goal/done and foreign-city saves. Existing zamek quest can be accepted and restored; retired checkpoints retained, no rewards. Phone390x844 and desktop1280x800; all RPCs mocked.');
 }finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
