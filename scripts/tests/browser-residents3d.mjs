// Built game + actual GLBs, native Townsfolk/FixedNpcs owners; isolated map and RPC fixtures.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const phone=process.env.TELEFON==='1',tag=phone?'phone':'desktop';
const server=await preview({build:{outDir:process.env.PREVIEW_OUTDIR||'dist'},preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
await mkdir('work/residents3d',{recursive:true});
const context=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1280,height:800},isMobile:phone,hasTouch:phone,reducedMotion:'reduce',locale:'pl-PL'});
const ring=[0,0,5760,0,0,5760,-5760,0];
await context.route('**/map/lublin.json',r=>r.fulfill({json:{unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]}}));
await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
await context.route('**/*.supabase.co/**',r=>{
 const n=new URL(r.request().url()).pathname.split('/').pop();let body=null;
 if(n==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:0,dead:false,age:12,konto:true,save:{coins:0,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'zelazny'}}}};
 if(['heartbeat','logout','log_error','save_game'].includes(n))body=true;
 if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(n))body=[];
 if(n==='game_settings')body={};if(n==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
});
const page=await context.newPage(),errors=[],warnings=[];let failedLoads=0;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Stwory 3D:|Shader Error/.test(m.text()))warnings.push(m.text());});
await page.route('**/modele/swiat44/chlopiec.glb',r=>++failedLoads===1?r.fulfill({status:503,body:'fixture retry'}):r.continue());
const game=(fn,arg)=>page.evaluate(fn,arg),shot=n=>page.screenshot({path:`work/residents3d/${tag}-${n}.png`});
const choose=()=>game(()=>{const d=window.__dialog;window.__game.scene.getScene('ui').closeDialog();d.onChoose(0);});
try{
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.getScene('game').ludzik3d?.widoczny&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 const fixtures=await game(()=>{
  const s=window.__game.scene.getScene('game'),p=s.player;s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;
  for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();s.wilki.delete(e);e.destroy();}s.enemies=[];
  s.cameras.main.setZoom(4);s.vision=[p.x-300,p.y-300,p.x+300,p.y-300,p.x+300,p.y+300,p.x-300,p.y+300];s.updateFog=()=>{};
  for(const f of s.folk.active){f.sprite?.destroy();f.umbrella?.destroy();}s.folk.active.clear();s.folk.cells.clear();
  const groups=[['kobieta',3],['wasacz',3],['dziewczynka',2],['chlopiec',3],['babcia',2],['dziadek',2]],chosen=[],seen=new Set();
  // Pick IDs through the real deterministic sex/age mapper, then let the normal owner spawn/update them.
  for(const[look,count]of groups){let n=0;for(let j=0;n<count&&j<100;j++){
   const i=chosen.length,x=p.x-38+i%5*18,y=p.y-26+Math.floor(i/5)*22;
   const f={id:look+'-'+j,role:'wita',beaten:true,name:'Fixture '+look,tex:'hd-'+look,x,y,waiting:true,walker:{x,y,step(){return 0;}}};
   const sprite=s.add.sprite(x,y,p.texture.key,p.frame.name);f.sprite=sprite;s.folk.active.add(f);
   const model=s.stwory3d.residentRequests(s.time.now).find(v=>v.actor===sprite)?.model;s.folk.active.delete(f);sprite.destroy();f.sprite=undefined;
   if(!model||seen.has(model))continue;seen.add(model);chosen.push(f);n++;
  }}
  const key=Math.floor(p.x/1920)+':'+Math.floor(p.y/1920);s.folk.cells.set(key,chosen);s.folk.next=0;
  s.folk.update(0,p.x,p.y,s.time.now,()=>true);
  const dog={id:'pies',x:p.x+60,y:p.y+20,walker:{x:p.x+60,y:p.y+20,step(){return 0;}},sprite:s.add.sprite(p.x+60,p.y+20,chosen[0].tex,'down-0'),label:s.add.text(p.x+60,p.y+6,'')};
  s.fixed.list.push(dog);window.__dog=dog;window.__folk=chosen;
  window.__game.events.on('dialog',d=>window.__dialog=d);
  const e=s.spawnEnemy(p.x+62,p.y-25,'shared-fixture','szkielet');e.brain=()=>e.vel.set(0,0);e.spokojny=false;
  window.__enemy=e;return [...seen];
 });
 assert.equal(fixtures.length,15,'all resident variants are reachable with matching sex/age');
 await page.waitForFunction(()=>{const m=window.__game.scene.getScene('game').stwory3d;return m?.residents.size===16&&window.__enemy.model3d;},null,{timeout:60000});
 assert.equal(failedLoads,2,'failed asset retries without losing actor');
 const gallery=await game(()=>{const m=window.__game.scene.getScene('game').stwory3d;return {stats:m.stats,models:[...m.models.keys()],dog:m.models.get('pies').root.userData,scales:window.__folk.map(f=>m.residents.get(f.sprite).image.scaleX)};});
 assert.equal(gallery.stats.contexts,1);assert.equal(gallery.stats.visible,17);
 assert.equal(gallery.models.length,17);assert(gallery.scales.every(s=>s===gallery.scales[0]));
 // This is the byte-exact approved G010 geometry, not the previous G008/G009 dog.
 const dogBytes=await readFile('public/modele/swiat44/pies.glb'),dogJSON=JSON.parse(dogBytes.subarray(20,20+dogBytes.readUInt32LE(12)));
 assert.equal(dogJSON.extras.revision,'44-G010-dog-chibi');await shot('gallery');
 // Native owner movement keeps the frame in the atlas and turns the model (no 2D animation overwrites).
 await game(()=>{const s=window.__game.scene.getScene('game'),f=window.__folk[0];f.waiting=false;f.walker.step=dt=>{f.walker.x+=7*dt;f.walker.y+=5*dt;};window.__start={x:f.x,y:f.y};});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game'),f=window.__folk[0];return f.x>window.__start.x+.5&&s.stwory3d.residents.get(f.sprite)?.visual.clip==='walk';});
 assert(await game(()=>window.__folk[0].sprite.isCropped&&window.__game.scene.getScene('game').stwory3d.residents.get(window.__folk[0].sprite).image.texture.key==='stwory3d-atlas'));
 // The umbrella comes from the animated GLB, the placeholder never flashes between atlas frames.
 await game(()=>{const s=window.__game.scene.getScene('game'),f=window.__folk[0];s.folk.wet=()=>true;f.umbrella=s.add.graphics();});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game'),f=window.__folk[0];return s.stwory3d.residents.get(f.sprite)?.visual.clip==='rain'&&!f.umbrella.visible;});
 await shot('rain');
 // A real passer-by dialog pauses all gameplay; only that actor's talk clip advances on the existing atlas.
 await game(()=>{const s=window.__game.scene.getScene('game');s.talkableAt(window.__folk[0].x,window.__folk[0].y,3)();});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game'),v=s.stwory3d.residents.get(window.__folk[0].sprite).visual;return s.scene.isPaused()&&s.stwory3d.models.get(v.model).current.getClip().name==='talk';});
 const t0=await game(()=>{const s=window.__game.scene.getScene('game'),v=s.stwory3d.residents.get(window.__folk[0].sprite).visual;return s.stwory3d.models.get(v.model).current.time;});
 await page.waitForTimeout(350);
 assert(await game(t0=>{const s=window.__game.scene.getScene('game'),v=s.stwory3d.residents.get(window.__folk[0].sprite).visual;return s.stwory3d.models.get(v.model).current.time!==t0;},t0));await shot('talk');await choose();
 // Real dog conversation and its original one-time quest/reward semantics are retained.
 await game(()=>{const s=window.__game.scene.getScene('game');s.talkableAt(window.__dog.x,window.__dog.y,6)();});
 await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d.models.get('pies').current.getClip().name==='wag');await shot('dog-talk');await choose();
 assert.equal(await game(()=>window.__session.missions['npc-pies']),'active');
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.stwory3d.residents.get(window.__dog.sprite)?.visual.clip==='sit';});await shot('dog-sit');
 // Find the real quest toy, return it, receive exactly one reward, then the dog leaves.
 const exp0=await game(()=>{const s=window.__game.scene.getScene('game'),p=s.player;s.fixed.piggyAt={x:p.x,y:p.y+5};return window.__session.exp;});
 await page.waitForFunction(()=>window.__session.missions['npc-pies']==='goal');
 await game(()=>{const s=window.__game.scene.getScene('game');s.talkableAt(window.__dog.x,window.__dog.y,6)();});
 assert.equal(await game(()=>window.__session.missions['npc-pies']),'done');
 assert.equal(await game(()=>window.__session.exp),exp0+100);
 assert(await game(()=>!window.__game.scene.getScene('game').fixed.at(window.__dog.x,window.__dog.y,6)));
 await choose();await page.waitForFunction(()=>!window.__dog.sprite.active);
 // Each comparison switch restores only its own actor family on the running scene.
 await game(()=>history.replaceState({},'','?mieszkancy3d=0'));
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.stwory3d.residents.size===0&&window.__enemy.model3d;});
 await game(()=>history.replaceState({},'','?stwory3d=0'));
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.stwory3d.residents.size===15&&!window.__enemy.model3d;});
 await game(()=>history.replaceState({},'','?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1'));
 await page.waitForFunction(()=>window.__enemy.model3d);
 // Duel hides the citizen; the original duel fighter takes over and it returns afterward.
 await game(()=>window.__game.scene.getScene('game').folk.away(window.__folk[1],true));
 await page.waitForFunction(()=>!window.__game.scene.getScene('game').stwory3d.residents.has(window.__folk[1].sprite));
 assert(await game(()=>!window.__folk[1].sprite.visible));
 await game(()=>window.__game.scene.getScene('game').folk.away(window.__folk[1],false));
 await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d.residents.has(window.__folk[1].sprite));
 // No surface actors are retained underground, and atlas capacity stays bounded in a crowd.
 await game(()=>{const s=window.__game.scene.getScene('game');s.scene.pause();s.stwory3d.update(s.enemies,1e8,[]);});
 assert.equal(await game(()=>window.__game.scene.getScene('game').stwory3d.residents.size),0);
 await game(()=>{const s=window.__game.scene.getScene('game'),p=s.player,m=s.stwory3d;window.__crowd=[];
  const tex=window.__folk[0].tex;for(let i=0;i<45;i++)window.__crowd.push({actor:s.add.sprite(p.x+i%9,p.y+Math.floor(i/9),tex,'down-0'),model:'mloda_kobieta',angle:0,clip:'idle',time:0});
  m.update(s.enemies,1e8+100,window.__crowd);});
 assert(await game(()=>{const m=window.__game.scene.getScene('game').stwory3d;return m.residents.size===31&&m.slots.size===1&&m.stats.contexts===1;}));
 // Disposal removes every model, restores actors and unregisters the paused-dialog listener.
 const disposal=await game(()=>{const s=window.__game.scene.getScene('game'),m=s.stwory3d;m.destroy();s.stwory3d=undefined;return {contexts:m.stats.contexts,models:m.models.size,residents:m.residents.size,oldTexture:window.__folk[0].sprite.texture.key,cropped:window.__folk[0].sprite.isCropped};});
 assert.equal(disposal.contexts,0);assert.equal(disposal.models,0);assert.equal(disposal.residents,0);assert.notEqual(disposal.oldTexture,'stwory3d-atlas');assert.equal(disposal.cropped,false);
 assert.deepEqual(errors,[]);assert.equal(warnings.filter(x=>!x.includes('chlopiec load failed')).length,0);
 await writeFile(`work/residents3d/${tag}-results.json`,JSON.stringify({fixtures,gallery,failedLoads,disposal,errors},null,2));
 console.log('PASS residents/dog/shared atlas '+tag,JSON.stringify({models:gallery.models.length,contexts:gallery.stats.contexts,failedLoads}));
}catch(e){console.log('DEBUG',await game(()=>{const s=window.__game.scene.getScene('game'),m=s.stwory3d;return {paused:s.scene.isPaused(),speaking:m?.speaking?{at:m.speaking.at,next:m.speaking.next}:null,models:[...m?.models||[]].map(([id,v])=>[id,v.current?.getClip().name]),dialog:window.__dialog?.title};}).catch(()=>null),errors);await shot('failure');throw e;}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
