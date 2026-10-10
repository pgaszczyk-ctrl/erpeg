import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE, args:['--no-sandbox','--enable-unsafe-swiftshader'], chromiumSandbox:false});
try {
for (const [name, viewport, mobile] of [['desktop',{width:1280,height:900},false],['phone',{width:390,height:844},true]]) {
 const context=await browser.newContext({viewport, isMobile:mobile, hasTouch:mobile, locale:'pl-PL', deviceScaleFactor:mobile?2:1});
 const errors=[];
 await context.route('**/*.supabase.co/**', route => {
  const path=new URL(route.request().url()).pathname;
  let body=null;
  if(path.endsWith('/game_settings')) body={};
  if(path.endsWith('/server_now')) body=new Date().toISOString();
  if(path.endsWith('/weather')) body={cell:'test',at:new Date().toISOString(),h:[]};
  if(path.endsWith('/settings')) body={external:{google:false}};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await context.route('**/sample.pmtiles', async route=>{
  const data=await readFile('data/world-sample/krakow.pmtiles');
  const range=route.request().headers()['range'];
  if(!range) return route.fulfill({status:200,body:data});
  const [,a,b]=/bytes=(\d+)-(\d*)/.exec(range);
  const start=Number(a),end=b?Math.min(Number(b),data.length-1):data.length-1;
  await route.fulfill({status:206,headers:{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Accept-Ranges':'bytes'},body:data.subarray(start,end+1)});
 });
 await context.route('**/terrain/13/*/*.png',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/terrain/','');
  try {await route.fulfill({status:200,contentType:'image/png',body:await readFile('data/world-sample/terrarium/'+path)});} catch {await route.fulfill({status:404,body:''});}
 });
 const page=await context.newPage();
 await context.route('**/swiat/zabytki/targi/targi_lublin.png', async route => {
  await new Promise(resolve=>setTimeout(resolve,1800)); await route.continue();
 });
 page.on('pageerror',e=>errors.push(e.message));


 await page.goto('http://127.0.0.1:4173/?lang=pl&d=ShgD6aib8&world=http://127.0.0.1:4173/sample.pmtiles&terrain=http://127.0.0.1:4173/terrain');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game') && window.__game.scene.getScene('game').demoRun,null,{timeout:90000});
 const testBuild=await page.locator('#test-badge').isVisible().catch(()=>false);
 assert.equal(await page.evaluate(()=>window.__session.name),'');
 await page.waitForFunction(()=>window.__game.scene.getScene('ui').dialogBox,null,{timeout:60000});
 async function choose(index) {
  await page.waitForTimeout(300);
  const at=await page.evaluate(index=>{const ui=window.__game.scene.getScene('ui');const r=ui.dialogButtons.find(b=>b.index===index).rect;return {x:r.x+r.width/2,y:r.y+r.height/2};},index);
  await page.mouse.click(at.x,at.y);
 }
 await choose(0);
 await page.waitForFunction(()=>window.__game.scene.isActive('game'));
 console.log(name,'started');
 // Use real planted trees, falling pickups and inventory collection, without writing any save.
 await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game');let n=0;
  for(const t of s.demoRun.trees)while(n<5&&s.orchards.shake(t)){s.dropFruit(t.x,t.y,t.fruit);n++;}
 });
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.pickups.filter(i=>i.getData('kind')==='fruit:jablko').length+window.__session.stats.fruit>=5;},null,{timeout:30000});
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game');for(const i of [...s.pickups])if(i.getData('kind')==='fruit:jablko')s.collect(i);});
 await page.waitForFunction(()=>window.__game.scene.getScene('ui').dialogChoose&&window.__game.scene.getScene('game').demoRun.fruitHintShown);
 await page.screenshot({path:`work/demo-${name}-apples.png`});
 await choose(0);
 await page.waitForFunction(()=>window.__game.scene.getScene('game').demoRun.dragon,null,{timeout:90000});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon;return s.dragons.has(d);},null,{timeout:60000});
 console.log(name,'dragon');
 const hp=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon,ai=s.dragons.get(d);
  const base=d.hp/18;
  s.noHurtUntil=s.time.now+120000; // Protect only the browser fixture while checking the scripted phases.
  s.player.setPosition(d.x+40,d.y+10);
  s.cameras.main.centerOn(s.player.x,s.player.y);
  ai.wolnyOd=s.time.now+120000;ai.odnowione.ugryzienie=s.time.now+120000;
  d.hit(s.player,s.time.now,base);d.hit(s.player,s.time.now,base);
  return {base,left:d.hp};
 });
 assert(hp.left>hp.base*6,'Must survive more than the old six ordinary hits');
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.demoRun.dragon.inAir&&s.children.getByName('smok-odlot');},null,{timeout:30000});
 const air=await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon,im=s.children.getByName('smok-odlot');const hp=d.hp;d.hit(s.player,s.time.now,d.hp);return {before:hp,after:d.hp,y:im.y};});
 assert.equal(air.before,air.after,'An airborne dragon cannot be hit');
 await page.screenshot({path:`work/demo-${name}-takeoff.png`});
 await page.waitForFunction(y=>{const s=window.__game.scene.getScene('game'),im=s.children.getByName('smok-odlot');return im&&im.y<y-15;},air.y,{timeout:30000});
 await page.screenshot({path:`work/demo-${name}-ascent.png`});
 await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon,l=s.dragons.get(d).lot;
  // Deliberately select a blocked point towards the Vistula; the river is narrower than 300 px.
  for(let r=10;r<=400;r+=10)if(s.city.isBlocked(d.x-r,d.y)){l.px=d.x-r;l.py=d.y;return;}
  throw Error('No blocked bank point in the fixture');
 });
 await page.waitForFunction(()=>!window.__game.scene.getScene('game').demoRun.dragon.inAir,null,{timeout:30000});
 assert.equal(await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon;return s.city.isBlocked(d.x,d.y);}),false);
 // Complete the lethal-hit path: generic corpse is replaced with visible departure.
 await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),d=s.demoRun.dragon;if(d.hit(s.player,s.time.now,d.hp))s.onEnemyKilled(d);});
 assert(await page.evaluate(()=>!!window.__game.scene.getScene('game').children.getByName('smok-odlot')));
 await page.screenshot({path:`work/demo-${name}-defeated.png`});
 await page.waitForFunction(()=>{const s=window.__game.scene.getScene('game');return s.city.id==='lublin'&&s.demoRun;},null,{timeout:90000});
 console.log(name,'waking at Targi');
 const destination=await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),at=s.city.toLatLon(s.player.x,s.player.y);return {name:window.__session.name,...at,busy:s.demoRun.busy};});
 assert.equal(destination.name,'');assert(Math.abs(destination.lat-51.23471)<.0004&&Math.abs(destination.lon-22.56526)<.0004);
 await page.waitForFunction(()=>window.__game.scene.getScene('ui').dialogBox,null,{timeout:90000});
 const art=await page.evaluate(()=>{const s=window.__game.scene.getScene('game'),z=s.zabytki.stoja.find(z=>z.z.id==='targi_lublin');return {ready:s.firstViewReady(),placed:!!z,layers:z?.warstwy.length,texture:z?.im.texture.key,busy:s.demoRun.busy};});
 assert.equal(art.ready,true);assert.equal(art.placed,true);assert.equal(art.layers,4);assert.equal(art.texture,'zabytek-targi_lublin');
 assert.equal(await page.evaluate(()=>!!document.getElementById('demo-end')),false);
 await choose(0);
 await page.screenshot({path:`work/demo-${name}-targi.png`});
 console.log(name,'Targi ready',art);
 const direction=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('game'),p=s.player;
  for(const [key,dx,dy]of [['ArrowDown',0,1],['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1]]){
   let safe=true;
   for(let n=1;n<=20;n++){const x=p.x+dx*n,y=p.y+dy*n+5;if(!s.city.isFree(x,y,2,1.5)||s.orchards.blocked(x,y)||s.forest.blocked(x,y)||s.mapView.korony.blocked(x,y)||s.training.blocked(x,y)||s.landmarks.blocked(x,y))safe=false;}
   if(safe)return key;
  }throw Error('No way to walk a few steps in front of Targi');
 });
 await page.keyboard.down(direction);
 await page.waitForSelector('#demo-end',{timeout:30000});
 await page.keyboard.up(direction);
 assert.equal(await page.locator('#demo-end button').textContent(),'Stwórz nową postać');
 await page.waitForTimeout(2800);
 await page.screenshot({path:`work/demo-${name}-finale.png`});
 const distance=await page.evaluate(()=>window.__game.scene.getScene('game').demoRun.walked/1.92);
 assert(distance>=8&&distance<10);
 await page.locator('#demo-end button').click();
 await page.waitForSelector('#menu',{timeout:60000});
 assert(!new URL(page.url()).searchParams.has('d'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('exp-po-demo')),'1');
 if (!testBuild) {
  await page.locator('#menu input[placeholder="np. Zbyszko"]').waitFor({state:'visible'});
  assert((await page.locator('#menu').textContent()).includes('Plac przed Targami Lublin'));
 } else assert.equal(new URL(page.url()).pathname,'/','Test demo links to production character creation');
 assert.equal(await page.evaluate(()=>window.__session.name),'');
 await page.screenshot({path:`work/demo-${name}-new-character.png`});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({name,testBuild,apples:true,unnamed:true,airInvulnerable:true,visibleAscent:true,safeLanding:true,Targi:art,walkMetres:distance,newCharacter:testBuild?'production redirect':'creation form',errors}));
 await context.close();
}
} finally {await browser.close();}
