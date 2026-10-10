import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const artifacts = process.env.HUD_ARTIFACTS || '.cache/hud-v6';
await mkdir(artifacts, { recursive: true });
const base=process.env.HUD_BASE || 'http://127.0.0.1:4173/';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const results=[];
try {
 for (const [name,width,height,dpr,mobile] of [['desktop',1440,900,1,false],['phone',390,844,2,true],['small-phone',320,740,2.625,true]]) {
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'pl-PL',reducedMotion:'reduce'});
  let start,latestSave;const errors=[],requests=[];
  await ctx.route('**/*.supabase.co/**',async route=>{
   const fn=new URL(route.request().url()).pathname.split('/').pop();
   const body=route.request().postDataJSON();
   let json=[];
   if(fn==='login') json={token:'offline-hud-test',player:{name:'Arceus',idik:'OFFLINE',start_place:'Plac Zamkowy',start_x:start.x,start_y:start.y,map_scale:1.92,exp:25,dead:false,age:7,immortal:true,save:{coins:1000,look:{postac:0},story:{st:'koniec',walked:0},mikstury:2,bag:[{goods:'owoce',counts:{jablko:50}},{item:'rower'},{item:'paczek'}]}}};
   else if(fn==='save_game') {latestSave=body?.p_save;json=true;}
   else if(fn==='server_now') json=new Date().toISOString();
   else if(fn==='game_settings') json={};
   else if(fn==='weather') json={cell:'test',at:new Date().toISOString(),h:[]};
   else if(fn==='settings') json={external:{google:false}};
   else if(['heartbeat','logout'].includes(fn))json=true;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(json)});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('hud/v6'))requests.push(r.url());});
  await page.goto(base+'?lang=pl');
  await page.locator('#menu').waitFor({state:'visible',timeout:90000});
  start=await page.evaluate(()=>window.__game.registry.get('city').findAnyStart('Plac Zamkowy','Plac Zamkowy'));
  const inputs=page.locator('#menu input');await inputs.nth(0).fill('Arceus');await inputs.nth(1).fill('OFFLINE');
  await page.getByRole('button',{name:'Wczytaj',exact:true}).click();
  await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden,null,{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('.hud-avpic')?.dataset.portrait==='1',null,{timeout:30000});
  assert.equal(new Set(requests.filter(s=>s.includes('/portrety/'))).size,1,'Only selected portrait should load');
  await page.evaluate(()=>{const sc=window.__game.scene.getScene('game');sc.player.hp=4;window.__session.exp=60;window.__session.mikstury=2;window.__gear.bag=[{goods:'owoce',counts:{jablko:50}},{item:'paczek'},{item:'rower'}];sc.emitHud();});
  await page.waitForTimeout(300);
  assert((await page.locator('.hud-heal').getAttribute('aria-label')).includes('miksturę'));
  const before=await page.evaluate(()=>({hp:window.__game.scene.getScene('game').player.hp,potions:window.__session.mikstury,fruit:window.__gear.bag.find(s=>s.goods==='owoce').counts.jablko}));
  await page.locator('.hud-heal').click();
  const after=await page.evaluate(()=>({hp:window.__game.scene.getScene('game').player.hp,potions:window.__session.mikstury,fruit:window.__gear.bag.find(s=>s.goods==='owoce').counts.jablko,extra:window.__game.scene.getScene('game').player.extra}));
  assert(after.hp>before.hp);assert.equal(after.potions,before.potions-1);assert.equal(after.fruit,before.fruit);assert(after.extra>0);
  await page.screenshot({path:`${artifacts}/hud-v6-${name}-bonus.png`});
  await page.evaluate(()=>{const sc=window.__game.scene.getScene('game');sc.player.hp=4;sc.player.extra=0;window.__session.mikstury=0;sc.emitHud();});
  assert((await page.locator('.hud-heal').getAttribute('aria-label')).includes('owoców'));
  await page.locator('.hud-heal').click();
  const fruitAfter=await page.evaluate(()=>({hp:window.__game.scene.getScene('game').player.hp,fruit:window.__gear.bag.find(s=>s.goods==='owoce').counts.jablko,food:window.__gear.bag.filter(s=>s.item==='paczek').length}));
  assert.equal(fruitAfter.fruit,50-20);assert.equal(fruitAfter.food,1);assert(fruitAfter.hp>4);
  await page.evaluate(()=>{const sc=window.__game.scene.getScene('game');sc.player.hp=4;window.__gear.bag=[{item:'paczek'},{item:'rower'}];sc.emitHud();});
  assert((await page.locator('.hud-heal').getAttribute('aria-label')).includes('jedzenie'));
  // The overlapping smaller bottle lies inside the same healing hit area.
  const lifeBox=await page.locator('.hud-heal').boundingBox();await page.mouse.click(lifeBox.x+lifeBox.width*.82,lifeBox.y+lifeBox.height*.75);
  const foodAfter=await page.evaluate(()=>({hp:window.__game.scene.getScene('game').player.hp,food:window.__gear.bag.filter(s=>s.item==='paczek').length}));
  assert.equal(foodAfter.food,0);assert(foodAfter.hp>4);
  await page.evaluate(()=>{const sc=window.__game.scene.getScene('game');sc.player.hp=4;window.__gear.bag=[{item:'rower'}];sc.emitHud();});
  assert(await page.locator('.hud-heal').isDisabled());
  await page.evaluate(()=>{const sc=window.__game.scene.getScene('game');sc.player.hp=4;window.__session.mikstury=2;window.__gear.bag=[{item:'rower'}];sc.emitHud();});
  // A drag over the tank must not consume healing.
  const b=await page.locator('.hud-heal').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+16,b.y+b.height/2,{steps:4});await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__session.mikstury),2);
  const box=await page.locator('.hud-m').boundingBox();assert(box.x>=0&&box.x+box.width<=width+.1,'HUD fits viewport');assert(box.height<120,'Compact height');
  const geometry=await page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};return {exp:r('.hud-m button[aria-label^="Doświadczenie"]'),portrait:r('.hud-av'),life:r('.hud-heal'),camera:r('.hud-b1'),bike:r('.hud-rower')};});
  assert(geometry.exp.x<geometry.portrait.x&&geometry.portrait.x<geometry.life.x&&geometry.life.x<geometry.camera.x&&geometry.camera.x<geometry.bike.x);
  for(const r of Object.values(geometry)){assert(r.width>=44&&r.height>=44);}
  assert(geometry.life.height>geometry.camera.height&&geometry.life.width>geometry.camera.width);
  await page.screenshot({path:`${artifacts}/hud-v6-${name}.png`});
  await page.locator('.hud-rower').click();assert.equal(await page.locator('.hud-rower').getAttribute('aria-pressed'),'true');
  await page.locator('.hud-rower').click();assert.equal(await page.locator('.hud-rower').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{window.__gear.bag.push({item:'hulajnoga_parowa'});window.__game.scene.getScene('game').emitHud();});
  await page.waitForFunction(()=>!document.querySelector('.hud-hulajnoga').hidden);
  const both=await page.locator('.hud-m').boundingBox();assert(both.x>=0&&both.x+both.width<=width+.1,'Two vehicles fit');
  await page.locator('.hud-hulajnoga').click();assert.equal(await page.locator('.hud-hulajnoga').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:`${artifacts}/hud-v6-${name}-both.png`});
  await page.evaluate(()=>{window.__gear.bag=[];window.__game.scene.getScene('game').emitHud();});
  await page.waitForFunction(()=>document.querySelector('.hud-rower').hidden&&document.querySelector('.hud-hulajnoga').hidden);
  await page.locator('.hud-av').click();await page.locator('#character').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#character').waitFor({state:'hidden'});
  await page.waitForTimeout(100);
  await page.locator('.hud-b1').click();await page.waitForFunction(()=>document.querySelector('#photo')||[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Zapisz')));
  await page.locator('#brag').getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.locator('#brag').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('off'));
  // Sample changed heroes and verify all 25 on desktop.
  for(const index of name==='desktop'?Array.from({length:25},(_,i)=>i):[12,24]){
   await page.evaluate(index=>{window.__session.look.postac=index;window.__game.scene.getScene('game').refreshLook();},index);
   await page.waitForFunction(index=>document.querySelector('.hud-avpic')?.dataset.portrait===String(index+1),index,{timeout:30000});
  }
  await page.evaluate(()=>{window.__session.look.postac=0;window.__session.exp=60;window.__gear.bag=[{item:'rower'}];window.__session.mikstury=2;const sc=window.__game.scene.getScene('game');sc.player.hp=6;sc.refreshLook();sc.emitHud();});
  await page.waitForFunction(()=>document.querySelector('.hud-avpic')?.dataset.portrait==='1');
  await page.screenshot({path:`${artifacts}/hud-v6-${name}-final.png`});
  if(name==='phone'){
   await page.setViewportSize({width:844,height:390});
   const rotated=await page.locator('.hud-m').boundingBox();assert(rotated.x>=0&&rotated.x+rotated.width<=844);
   await page.screenshot({path:`${artifacts}/hud-v6-phone-landscape.png`});
  }
  assert.deepEqual(errors,[]);
  results.push({name,before,after,fruitAfter,foodAfter,geometry,errors,saveMocked:!!latestSave});console.log(JSON.stringify(results.at(-1)));
  await ctx.close();
 }
 await writeFile(`${artifacts}/hud-v6-checks.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
