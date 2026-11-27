// Illustrated character creation and the in-game difficulty window. Built game, mocked server.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/trudnosc',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({executablePath: process.env.CHROME_PATH, args:['--no-sandbox','--enable-unsafe-swiftshader']});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try {
for(const [name,width,height,mobile] of [['desktop',1280,800,false],['phone',390,844,true]]) {
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,locale:'pl-PL',reducedMotion:'reduce'});
 const errors=[],zmiany=[];let made=null;
 await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
 await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
 await context.route('**/*.supabase.co/**',r=>{
  const fn=new URL(r.request().url()).pathname.split('/').pop(),arg=r.request().postDataJSON()??{};let body=null;
  if(fn==='create_character'){made=arg;body={error:'Test zakończony'};}
  if(fn==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,trudnosc_wybrana:true,trudnosc_dzis:false,save:{coins:10,story:{st:'koniec',walked:99},flagi:{samouczek:1}}}};
  if(fn==='zmien_trudnosc'){zmiany.push(arg);body={ok:true,age:arg.p_age};}
  if(['save_game','heartbeat','logout','log_error'].includes(fn))body=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))body=[];
  if(fn==='game_settings')body={};if(fn==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 // 1. Three illustrated buttons, default Adventure, a preview with movement and a Hardcore warning.
 await page.goto('http://127.0.0.1:4173/?lang=pl#nowa');
 const cards=page.locator('#menu .m-wariant');
 await cards.first().waitFor({timeout:60000});
 assert.equal(await cards.count(),3);
 assert.equal(await page.locator('[data-wariant="przygoda"]').getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>[...document.querySelectorAll('.m-wariant img')].every(img=>img.complete&&img.naturalWidth>0));
 const preview=page.locator('#menu .m-rekrut');
 await page.waitForFunction(()=>{
   const canvas=document.querySelector('.m-rekrut');
   return canvas?.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some(value=>value>0);
 });
 const pose=await preview.evaluate(c=>c.toDataURL());
 await page.waitForTimeout(350);
 assert.equal(await preview.evaluate(c=>c.toDataURL()),pose,'reduced motion holds the recruit still');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(p=>document.querySelector('.m-rekrut')?.toDataURL()!==p,pose);
 const select=page.locator('[data-wariant="hardkor"]');
 await select.click();
 assert.equal(await select.getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('.m-wariant-ostrzezenie').textContent(),/10% całego EXP/);
 await page.locator('.m-plec-btn[data-plec="k"]').click();
 await page.getByPlaceholder(/Zamkowa 9/).fill('Test road');
 const submit=page.getByRole('button',{name:'Stwórz postać'});
 const bbCreate=await submit.boundingBox();
 assert(bbCreate && bbCreate.x>=0 && bbCreate.x+bbCreate.width<=width+1 && bbCreate.y+bbCreate.height<=height+1,
   `create button on screen: ${JSON.stringify(bbCreate)}`);
 await page.screenshot({path:`work/trudnosc/${name}-formularz.png`});
 await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/create_character')),submit.click()]);
 assert.equal(made?.p_age,19);
 // 2. In the game: the menu's difficulty window, tap Rodzinny, confirm → one change as an age.
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 await page.evaluate(()=>window.__game.scene.getScene('game').wyborTrudnosci(false));
 await page.waitForSelector('.tr-okno .tr-os');
 assert(await page.evaluate(()=>window.__game.scene.isPaused('game')),'world paused under the window');
 await page.screenshot({path:`work/trudnosc/${name}-okno-start.png`});
 assert.equal(await page.locator('.tr-okno .tr-os').getAttribute('aria-valuenow'),'1');
 await page.locator('.tr-okno .tr-ludzik').nth(0).click({force:true});
 await page.waitForFunction(()=>/Wybieram: Rodzinny/.test(document.querySelector('.tr-okno .m-primary').textContent),null,{timeout:5000});
 await page.screenshot({path:`work/trudnosc/${name}-okno.png`});
 const bb=await page.locator('.tr-okno .m-primary').boundingBox();
 assert(bb&&bb.x>=0&&bb.y>=0&&bb.x+bb.width<=width+1&&bb.y+bb.height<=height+1,`confirm button on screen: ${JSON.stringify(bb)}`);
 await page.locator('.tr-okno .m-primary').click();
 await page.waitForFunction(()=>window.__session.level.nazwa==='Rodzinny',null,{timeout:10000});
 assert.deepEqual(zmiany.map(z=>[z.p_age,z.p_pierwszy]),[[6,false]]);
 assert(!(await page.evaluate(()=>window.__game.scene.isPaused('game'))),'world resumes');
 // The same character can enter Hardcore. One defeat at exactly level 20 must cross its threshold.
 await page.evaluate(()=>{window.__session.trudnoscDzis=false;window.__game.scene.getScene('game').wyborTrudnosci(false);});
 await page.locator('.tr-okno .tr-os').focus();await page.keyboard.press('End');
 await page.locator('.tr-okno .m-primary').click();
 await page.waitForFunction(()=>window.__session.level.nazwa==='Hardkor');
 const penalty=await page.evaluate(()=>{
   const g=window.__game.scene.getScene('game'), s=window.__session;
   s.exp=19000;
   g.offerRescue();
   g.offerRescue();
   return [s.exp,s.level.hpWrogow,s.level.obrazenia];
 });
 assert.deepEqual(penalty,[17100,2.4,1.2]);
 // Escape = cancel, nothing changes.
 await page.evaluate(()=>{window.__session.trudnoscDzis=false;window.__game.scene.getScene('game').wyborTrudnosci(false);});
 await page.waitForSelector('.tr-okno .tr-os');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.tr-okno'));
 assert.equal(zmiany.length,2);
 assert.deepEqual(errors,[]);
 console.log(name,'OK');
 await context.close();
}
} finally { await browser.close(); server.httpServer.close(); }
