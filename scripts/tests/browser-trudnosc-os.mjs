// Difficulty on one axis of poses (owner, 22 Nov 2026): the new-character form and the in-game window
// (game menu / after the demo). Built game, mocked server. Run: npx vite build && node scripts/tests/browser-trudnosc-os.mjs
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/trudnosc',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
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
  if(fn==='create_character'){made=arg;body={name:arg.p_name,idik:'TESTKOD1'};}
  if(fn==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,trudnosc_wybrana:true,trudnosc_dzis:false,save:{coins:10,story:{st:'koniec',walked:99},flagi:{samouczek:1}}}};
  if(fn==='zmien_trudnosc'){zmiany.push(arg);body={ok:true,age:arg.p_age};}
  if(['save_game','heartbeat','logout','log_error'].includes(fn))body=true;
  if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))body=[];
  if(fn==='game_settings')body={};if(fn==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 // 1. The form: five figures, the default (Dziecięcy) lit, a drag along the axis picks Wysoki.
 await page.goto('http://127.0.0.1:4173/?lang=pl#nowa');
 await page.waitForSelector('#menu .tr-os',{timeout:60000});
 assert.equal(await page.locator('#menu .tr-ludzik').count(),5);
 assert.equal(await page.locator('#menu .tr-os').getAttribute('aria-valuenow'),'0');
 await page.locator('#menu .tr-os').scrollIntoViewIfNeeded();
 const r=await page.locator('#menu .tr-os').boundingBox();
 await page.mouse.move(r.x+r.width*.1,r.y+r.height*.4);await page.mouse.down();
 await page.mouse.move(r.x+r.width*.7,r.y+r.height*.4,{steps:5});await page.mouse.up();
 assert.equal(await page.locator('#menu .tr-os').getAttribute('aria-valuenow'),'3');
 assert.match(await page.locator('#new-character-difficulty-details').textContent(),/^Wysoki:/);
 await page.locator('#menu .tr-os').focus();await page.keyboard.press('End');
 assert.equal(await page.locator('#menu .tr-os').getAttribute('aria-valuetext'),'Hardkor');
 await page.screenshot({path:`work/trudnosc/${name}-formularz.png`});
 // 2. In the game: the menu's difficulty window, tap Młody, confirm → one change as an age.
 await page.goto('http://127.0.0.1:4173/?lang=pl&pogoda=czysto&ostrosc=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
 await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
 await page.evaluate(()=>window.__game.scene.getScene('game').wyborTrudnosci(false));
 await page.waitForSelector('.tr-okno .tr-os');
 assert(await page.evaluate(()=>window.__game.scene.isPaused('game')),'world paused under the window');
 await page.screenshot({path:`work/trudnosc/${name}-okno-start.png`});
 assert.equal(await page.locator('.tr-okno .tr-os').getAttribute('aria-valuenow'),'2');
 await page.locator('.tr-okno .tr-ludzik').nth(1).click({force:true});
 await page.waitForFunction(()=>/Wybieram: Młody/.test(document.querySelector('.tr-okno .m-primary').textContent),null,{timeout:5000});
 await page.screenshot({path:`work/trudnosc/${name}-okno.png`});
 const bb=await page.locator('.tr-okno .m-primary').boundingBox();
 assert(bb&&bb.x>=0&&bb.y>=0&&bb.x+bb.width<=width+1&&bb.y+bb.height<=height+1,`confirm button on screen: ${JSON.stringify(bb)}`);
 await page.locator('.tr-okno .m-primary').click();
 await page.waitForFunction(()=>window.__session.level.nazwa==='Młody',null,{timeout:10000});
 assert.deepEqual(zmiany.map(z=>[z.p_age,z.p_pierwszy]),[[9,false]]);
 assert(!(await page.evaluate(()=>window.__game.scene.isPaused('game'))),'world resumes');
 // Escape = cancel, nothing changes.
 await page.evaluate(()=>{window.__session.trudnoscDzis=false;window.__game.scene.getScene('game').wyborTrudnosci(false);});
 await page.waitForSelector('.tr-okno .tr-os');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.tr-okno'));
 assert.equal(zmiany.length,1);
 assert.deepEqual(errors,[]);
 console.log(name,'OK');
 await context.close();
}
} finally { await browser.close(); server.httpServer.close(); }
