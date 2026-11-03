import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],chromiumSandbox:false});
await mkdir('work/interactions',{recursive:true});
try {
 for(const phone of [false,true]) {
  const context=await browser.newContext(phone?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'pl-PL'}:{viewport:{width:1280,height:720},locale:'pl-PL'});
  if(process.env.STATIC_FILES==='1')await context.route('http://127.0.0.1:4173/**',r=>{const p=new URL(r.request().url()).pathname;try{const data=readFileSync('dist'+(p==='/'?'/index.html':p));const ext=p.split('.').at(-1);return r.fulfill({body:data,contentType:({js:'application/javascript',css:'text/css',json:'application/json',png:'image/png',webp:'image/webp',svg:'image/svg+xml'})[ext]??(p==='/'?'text/html':'application/octet-stream')});}catch{return r.fulfill({status:404,body:''});}});
  const ring=[0,0,6000,0,0,6000,-6000,0];
  await context.route('**/map/lublin.json',r=>r.fulfill({json:{unitsPerM:1.92,w:6000,h:6000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,3000,6000,0],'Test']],buildings:[],pois:[],towns:[['Lublin',3000,3000]]}}));
  await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
  await context.route('**/*.supabase.co/**',r=>{
   const p=new URL(r.request().url()).pathname;let body=true;
   if(p.endsWith('/login'))body={token:'t',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:3000,start_y:3000,map_scale:1.92,save:{coins:500,missions:{'focus-a':'active','focus-b':'active'},story:{st:'koniec',walked:99},flagi:{samouczek:1}},exp:400,dead:false,died_at:null,age:12}};
   if(p.endsWith('/game_settings')||p.endsWith('/game_stwory'))body={};
   if(p.endsWith('/game_content')||p.endsWith('/school_quizzes')||p.endsWith('/game_ports'))body=[];
   if(p.endsWith('/server_now'))body=new Date().toISOString();
   if(p.endsWith('/weather'))body={cell:'test',at:new Date().toISOString(),h:[]};
   return r.fulfill({json:body});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/?lang=pl&live=1&pogoda=czysto&ostrosc=1&skrot=0.8#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&window.__game.scene.getScene('game').firstViewReady?.(),null,{timeout:120000});
  await page.waitForFunction(()=>document.getElementById('loading-map')?.hidden,null,{timeout:60000});
  await page.waitForTimeout(1000);
  const setup=await page.evaluate(()=>{
   const s=window.__game.scene.getScene('game'),p=s.player;
   window.__game.scene.getScene('ui').closeDialog();s.scene.resume();s.witam=false;s.lingerUntil=0;s.talkReadyAt=0;
   s.streets.update=()=>{};s.folk.update=()=>{};s.prolog=undefined;s.elzet=undefined;
   s.city.places=[];s.city.tablice=[];s.npcs.list.splice(0);s.fixed.positions=()=>[];s.folk.interactionPeople=()=>[];s.training.visibleNpcs=()=>[];s.training.hitAt=()=>null;s.story.wizardSpot=()=>null;s.stalls=[];s.wozy=[];s.artillery=undefined;s.lochy.lista.splice(0);
   const door={x:p.x,y:p.y};s.cameras.main.stopFollow();s.cameras.main.centerOn(p.x,p.y);s.cameras.main.preRender();
   const missions=['Strażnik','Kronikarz'].map((name,i)=>({m:{id:`focus-${i?'b':'a'}`,postac:{imie:name},adres:'Test',tytul:`Zadanie ${name}`,opis:`Rozmowa ${name}`,zadanie:{typ:'idz',miejsce:'Test',cel:'Dojdź do punktu'},zakonczenie:'Gotowe',nagroda:1},door,target:{x:p.x+1000,y:p.y}}));
   s.missions=missions;s.etapy.update(missions,s.time.now,0);
   s.city.places.push({id:'focus-door',name:'Piwnica',kind:'shop',door});
   // A visible stand-in doorway: the interaction still uses the real GameScene openPlace callback.
   s.add.rectangle(door.x,door.y-8,14,18,0x6b4220).setStrokeStyle(2,0xb38b55).setDepth(door.y);
   window.__focusOpened=[];
   const missionDialog=s.openMissionDialog.bind(s);
   s.openMissionDialog=r=>{window.__focusOpened.push(r.m.id);missionDialog(r);};
   s.openPlace=r=>window.__focusOpened.push(r.id);
   p.setPosition(door.x,door.y+12);s.interactionSelection.clear();s.updateInteractionTarget();
   return s.etapy.interactionTargets().map(t=>({id:t.id,x:t.x,y:t.y,label:t.label}));
  });
  assert.equal(setup.length,2,'two separate quest givers');
  assert(Math.hypot((setup[0].x-setup[1].x)/30,(setup[0].y-setup[1].y)*.8/40)>=1,'bodies separated on screen');
  const focus=async(id)=>{
   await page.waitForTimeout(350);
   // Move into reach without changing any interaction callback; click/touch the actual canvas.
   const xy=await page.evaluate(id=>{
    const s=window.__game.scene.getScene('game');let t=s.interactionCandidates().find(t=>t.id===id);
    if(!t)throw new Error('missing '+id);
    s.player.setPosition(t.x,t.y+6);s.cameras.main.preRender();
    const cam=s.cameras.main, lx=(t.x-cam.worldView.x)*cam.zoomX,ly=(t.y-(t.kind==='talk'?12/.8:3)-cam.worldView.y)*cam.zoomY;
    const canvas=document.querySelector('#game canvas'),rot=document.documentElement.classList.contains('exp-obrot');
    return rot?[ly,844-lx]:[lx+canvas.offsetLeft,ly+canvas.offsetTop];
   },id);
   // Pin another valid target so this click demonstrates selection before action.
   await page.evaluate(id=>{const s=window.__game.scene.getScene('game');const other=s.interactionCandidates().find(t=>t.id!==id&&Math.hypot(t.x-s.player.x,t.y-s.player.y)<36);if(!other)throw new Error('no alternate target');s.interactionSelection.pick(other);},id);
   if(phone)await page.touchscreen.tap(...xy);else await page.mouse.click(...xy);
   await page.waitForTimeout(120);
   const state=await page.evaluate(()=>{const s=window.__game.scene.getScene('game');return{id:s.interactionSelection.id,label:s.interactionLabel.text,opened:window.__focusOpened.slice()};});
   if(state.id!==id){
    console.log('pick mismatch',id,xy,state,await page.evaluate(()=>{const s=window.__game.scene.getScene('game');return {active:s.scene.isActive(),blocked:s.interactionBlocked(),view:s.cameras.main.worldView,zoom:[s.cameras.main.zoomX,s.cameras.main.zoomY],rect:document.querySelector('#game canvas').getBoundingClientRect().toJSON()};}));
    await page.screenshot({path:'work/interactions/failed.png'});
   }
   assert.equal(state.id,id,'pointer selected exact object');
   assert(state.label.includes(id==='place:focus-door'?'Piwnica':id.endsWith('a')?'Strażnik':'Kronikarz'),'label matches object');
   return state;
  };
  // First inspect each person through the same hit test used by native controls.
  for(const id of ['giver:focus-a','giver:focus-b','place:focus-door']) {
   await focus(id);
   await page.screenshot({path:`work/interactions/${phone?'phone':'desktop'}-${id.replaceAll(':','-')}.png`});
   const before=await page.evaluate(()=>window.__focusOpened.length);
   if(phone)await page.locator('.hs-akcja').click({force:true});else await page.keyboard.press('e');
   await page.waitForTimeout(180);
   assert.equal(await page.evaluate(()=>window.__focusOpened.at(-1)),id.replace('giver:','').replace('place:',''),'Action/E exact highlighted callback');
   assert.equal(await page.evaluate(()=>window.__focusOpened.length),before+1,'exactly one callback');
   if(id.startsWith('giver:')) {
    assert(await page.evaluate(()=>window.__game.scene.getScene('ui').hasDialog),'real quest conversation opens');
    await page.evaluate(()=>{window.__game.scene.getScene('ui').closeDialog();const s=window.__game.scene.getScene('game');s.scene.resume();s.talkReadyAt=0;});
   }
  }
  const stable=await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),id=s.interactionSelection.id;for(let i=0;i<30;i++){s.player.x+=Math.sin(i)*.1;s.updateInteractionTarget();if(s.interactionSelection.id!==id)return false;}return true;});
  assert(stable,'small movement keeps focus');
  await page.evaluate(()=>{const s=window.__game.scene.getScene('game');s.player.x+=200;s.updateInteractionTarget();});
  assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').interactionLabel.visible),false,'out of reach removes highlight');
  assert.deepEqual(errors,[]);
  console.log('PASS',phone?'phone 390×844':'desktop','two quest NPCs + doorway, native picking, E/Action, jitter, reach');
  await context.close();
 }
} finally {await browser.close();}
