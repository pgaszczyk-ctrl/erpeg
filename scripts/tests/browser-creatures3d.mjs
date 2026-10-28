// Real built game + real GLBs. Map/login/save are isolated; no player data is accessed.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const phone=process.env.TELEFON==='1',tag=phone?'phone':'desktop';
// Accepted G008 preview passes COLOR_0 palette bytes directly to the display. Detect accidental gamma brightening.
const bytes=await readFile('public/modele/swiat44/zombiak.glb');
const jsonSize=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonSize)),sourcePalette=new Set();
for(const mesh of gltf.meshes)for(const p of mesh.primitives){
  const a=gltf.accessors[p.attributes.COLOR_0],v=gltf.bufferViews[a.bufferView];assert.equal(a.componentType,5121);
  const start=28+jsonSize+(v.byteOffset||0)+(a.byteOffset||0);
  for(let i=0;i<a.count;i++){const b=bytes.subarray(start+i*3,start+i*3+3);sourcePalette.add([...b].join(','));}
}
const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false})
  .catch(async e=>{await new Promise(r=>server.httpServer.close(r));throw e;});
await mkdir('work/creatures3d',{recursive:true});
const context=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1280,height:800},isMobile:phone,hasTouch:phone,reducedMotion:'reduce',locale:'pl-PL'});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],
  lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
await context.route('**/*.supabase.co/**',r=>{
  const name=new URL(r.request().url()).pathname.split('/').pop();let body=null;
  if(name==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,
    exp:0,dead:false,age:12,konto:true,save:{coins:0,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'zelazny'}}}};
  if(['heartbeat','logout','log_error','save_game'].includes(name))body=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(name))body=[];
  if(name==='game_settings')body={};if(name==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
});
const page=await context.newPage(),errors=[],warnings=[];let wargRequests=0;
page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
page.on('console',m=>{if(/Stwory 3D:|Shader Error|VALIDATE_STATUS/.test(m.text()))warnings.push(m.text());});
await page.route('**/modele/swiat44/warg.glb',r=>++wargRequests===1?r.fulfill({status:503,body:'deliberate fixture failure'}):r.continue());
const game=fn=>page.evaluate(fn);
const reset=()=>game(()=>{
  const s=window.__game.scene.getScene('game');for(const e of [...s.enemies]){s.wilki.get(e)?.destroy();s.wilki.delete(e);e.destroy();}
  s.enemies=[];s.noHurtUntil=Infinity;s.protectUntil=Infinity;window.__session.immortal=true;
  const p=s.player;s.vision=[p.x-300,p.y-300,p.x+300,p.y-300,p.x+300,p.y+300,p.x-300,p.y+300];
  s.lastVision={x:p.x,y:p.y,a:Math.atan2(p.facing.y,p.facing.x)};
});
const shot=name=>page.screenshot({path:`work/creatures3d/${tag}-${name}.png`});
try{
  await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&live=1&ludzik3d=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(()=>window.__game?.scene.getScene('game').ludzik3d?.widoczny&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
  await game(()=>{const s=window.__game.scene.getScene('game');s.player.x+=150;s.cameras.main.setZoom(4);});await reset();
  await game(()=>{
    const s=window.__game.scene.getScene('game'),p=s.player;window.__actors=[];
    for(const[i,k]of['wilk','warg','zombie','szkielet','glut','bandyta','upior','wodnik','blob','driada','herszt','koziol','wielki_glut','wielki_herszt'].entries()){
      const e=s.spawnEnemy(p.x-34+i%5*17,p.y-28+Math.floor(i/5)*24,'models-fixture',k);e.brain=()=>e.vel.set(0,0);e.spokojny=false;window.__actors.push(e);}
  });
  await page.waitForFunction(()=>window.__actors.every(e=>e.model3d),null,{timeout:60000});
  const gallery=await game(()=>{
    const m=window.__game.scene.getScene('game').stwory3d,g=m.g,gl=g.renderer.getContext(),c=g.renderer.domElement;
    const pixels=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const colors=new Set();let opaque=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){opaque++;colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);}
    return {stats:m.stats,colors:colors.size,palette:[...colors],opaque,kinds:window.__actors.map(e=>e.kindId)};
  });
  assert.equal(gallery.stats.loaded,12);assert.equal(gallery.stats.contexts,1);assert.equal(gallery.stats.visible,14);assert.equal(wargRequests,2);
  gallery.paletteMatches=gallery.palette.filter(c=>sourcePalette.has(c)).length;delete gallery.palette;
  assert(gallery.paletteMatches>=12,'actual render preserves the accepted COLOR_0 palette');
  assert(gallery.colors>20&&gallery.opaque>1000);await shot('gallery');
  const poses=await game(()=>{
    const m=window.__game.scene.getScene('game').stwory3d;let n=0;
    for(const model of m.models.values())for(const[name,clip]of model.clips){m.sample(model,name,clip.duration*.65,.7);
      model.root.traverse(node=>{if(!node.matrixWorld.elements.every(Number.isFinite))throw Error('nonfinite '+name);});
      for(const root of model.root.children)if(Math.abs(root.position.x)>.001||Math.abs(root.position.z)>.001)throw Error('duplicate root motion');n++;}return n;
  });assert(poses>=60);
  assert(await game(()=>{const s=window.__game.scene.getScene('game');s.stwory3d.update([],s.time.now);return window.__actors.every(e=>!e.model3d);}));
  await page.waitForFunction(()=>window.__actors.every(e=>e.model3d));
  await reset();await game(()=>{
    const s=window.__game.scene.getScene('game'),p=s.player;window.__wolf=s.spawnEnemy(p.x+24,p.y,'models-fixture','wilk');window.__trace=[];
    s.events.on('postupdate',()=>{const e=window.__wolf;if(!e?.active)return;const a=s.wilki.get(e),slot=s.stwory3d.slots.get(e);
      window.__trace.push({state:a?.stan,clip:slot?.clip,time:slot?.time,x:e.x,root:s.stwory3d.models.get('wilk')?.root.children[0].position.z});
      if(window.__trace.length>500)window.__trace.shift();});
  });
  await page.waitForFunction(()=>window.__trace.some(f=>f.state==='zapowiedz'&&f.clip==='lunge'),null,{timeout:20000});await shot('wolf-windup');
  await page.waitForFunction(()=>window.__trace.some(f=>f.state==='atak'&&f.clip==='lunge'),null,{timeout:20000});await shot('wolf-lunge');
  await page.waitForFunction(()=>window.__trace.some(f=>f.state==='odpoczynek'),null,{timeout:20000});
  const trace=await game(()=>window.__trace);assert(trace.some(f=>Math.abs(f.x-trace[0].x)>1));assert(trace.every(f=>!f.root||Math.abs(f.root)<.001));
  await reset();await game(()=>{
    const s=window.__game.scene.getScene('game'),p=s.player;window.__imp=s.spawnEnemy(p.x+34,p.y,'models-fixture','glut');window.__emissions=[];
    const socket=s.stwory3d.socket.bind(s.stwory3d);s.stwory3d.socket=(e,name,now)=>{const result=socket(e,name,now);window.__emissions.push({name,result,now});return result;};
  });
  await page.waitForFunction(()=>window.__imp.model3d&&window.__emissions.some(e=>e.result),null,{timeout:20000});
  const emission=await game(()=>{const s=window.__game.scene.getScene('game'),e=window.__imp;return{last:window.__emissions.at(-1),projectiles:s.wilki.get(e)?.pociski.length,action:e.modelAttack.clip};});
  assert.equal(emission.last.name,'ThrowOrigin');assert.equal(emission.action,'throw');assert(emission.projectiles>0);await shot('throw');
  await reset();await game(()=>{const s=window.__game.scene.getScene('game'),p=s.player;window.__victim=s.spawnEnemy(p.x+9,p.y,'models-fixture','zombie');
    window.__victim.brain=()=>window.__victim.vel.set(0,0);p.face(1,0);});
  await page.waitForFunction(()=>window.__victim.model3d);
  await game(()=>{const s=window.__game.scene.getScene('game');window.__victim.hit(s.player,s.time.now,.01);});
  await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d.slots.get(window.__victim)?.clip==='hit');await page.waitForTimeout(500);
  await game(()=>{window.__victim.hp=.001;window.__game.scene.getScene('game').player.face(1,0);});
  if(phone)await page.locator('.hs-atak').tap();else await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__victim.isDead,null,{timeout:10000});
  await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d.slots.get(window.__victim)?.clip==='death');
  assert(await game(()=>window.__victim.active));await shot('death');await page.waitForFunction(()=>!window.__victim.active);
  await reset();await game(()=>{const s=window.__game.scene.getScene('game'),p=s.player;window.__crowd=[];
    for(let i=0;i<40;i++){const e=s.spawnEnemy(p.x-40+i%8*11,p.y-30+Math.floor(i/8)*12,'models-fixture',i%2?'wilk':'zombie');e.brain=()=>e.vel.set(0,0);window.__crowd.push(e);}});
  await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d.stats.visible===32);
  const crowd=await game(()=>({...window.__game.scene.getScene('game').stwory3d.stats}));assert.equal(crowd.contexts,1);assert.equal(crowd.atlasBytes,2097152);await shot('crowd');
  const measure=()=>game(()=>new Promise(resolve=>{const start=performance.now(),frames=[];let before=start;
    const tick=now=>{frames.push(now-before);before=now;if(now-start<2000)return requestAnimationFrame(tick);
      const sorted=[...frames].sort((a,b)=>a-b);resolve({fps:frames.length/(now-start)*1000,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)]});};requestAnimationFrame(tick);}));
  const modelFrames=await measure();
  await game(()=>{const s=window.__game.scene.getScene('game');window.__suspended=s.stwory3d;s.stwory3d.update([],s.time.now);s.stwory3d=undefined;});
  const spriteFrames=await measure();await game(()=>{window.__game.scene.getScene('game').stwory3d=window.__suspended;});
  if(phone){await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(800);await page.locator('.hs-atak').tap();await shot('portrait');}
  await game(()=>{const s=window.__game.scene.getScene('game');window.__oldModels=s.stwory3d;s.scene.restart();});
  await page.waitForFunction(()=>window.__game.scene.getScene('game').stwory3d!==window.__oldModels);
  assert.equal(await game(()=>window.__oldModels.stats.contexts),0);assert.deepEqual(errors,[]);assert.equal(warnings.length,1);
  // Explicit comparison switch disables downloads and the shared renderer.
  await page.goto('http://127.0.0.1:4173/?stwory3d=0&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(()=>window.__game?.scene.getScene('game').player&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:60000});
  assert.equal(await game(()=>!!window.__game.scene.getScene('game').stwory3d),false);
  const result={tag,browser:browser.version(),gallery,poses,emission,crowd,modelFrames,spriteFrames,wargRequests,errors,expectedWarnings:warnings.length,
    checks:['12 GLBs/14 kinds','real colored pixels','73 clip poses','root motion once','slot restoration','AI windup/lunge/recovery','hand emitter/projectile',
      'hit','death via keyboard/touch','40 actor bound','scene restart','explicit off switch',...(phone?['portrait rotation']:[])]};
  await writeFile(`work/creatures3d/${tag}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(e){console.error(errors,warnings);console.error(await game(()=>{const s=window.__game?.scene.getScene('game');return{stats:s?.stwory3d?.stats,paused:s?.scene.isPaused(),trace:window.__trace?.slice(-10),actors:window.__actors?.map(e=>[e.kindId,e.visible,e.model3d])};}).catch(()=>null));
  await shot('failure').catch(()=>{});throw e;
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
