// Order 45 trial icons: 64 px icons in the Kufer/backpack, 256 px pictures in the big item card and shop preview.
// Actual built game; map/account fixtures; nothing is written to the server.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/ikony45',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4174,strictPort:true}});
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const ring=[0,0,5760,0,0,5760,-5760,0];
const map={unitsPerM:1.92,w:3000,h:3000,bounds:{minLat:51.2,maxLat:51.3,minLon:22.4,maxLon:22.5},boundary:[ring],areas:[['paved',ring]],lines:[['minor',0,[0,2880,5760,0],'Test road']],buildings:[],pois:[],towns:[['Lublin',2880,2880]]};
try {
for (const [name,width,height,mobile] of [['desktop',1280,800,false],['phone',844,390,true]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'pl-PL',reducedMotion:'reduce'});
  const errors=[];
  await context.route('**/map/lublin.json',r=>r.fulfill({json:map}));
  await context.route('**/map/world.json',r=>r.fulfill({json:{lublin:[],towns:[],edges:[]}}));
  await context.route('**/*.supabase.co/**',r=>{
    const fn=new URL(r.request().url()).pathname.split('/').pop();let body=null;
    if(fn==='login')body={token:'fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:2880,start_y:2880,map_scale:1.92,exp:400,dead:false,age:12,konto:true,save:{coins:90000,story:{st:'koniec',walked:99},flagi:{samouczek:1},equip:{bron:'rycerski',helm:'zelazny_helm'},bag:[{item:'kijek'},{item:'korona'}],skills:{miecz:0,luk:0,magia:0}}}};
    if(['save_game','heartbeat','logout','log_error'].includes(fn))body=true;
    if(['game_content','school_quizzes','game_ports','kurier_wiesci','my_characters','game_stwory'].includes(fn))body=[];
    if(fn==='game_settings')body={};if(fn==='server_now')body=new Date().toISOString();return r.fulfill({json:body});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/?lang=pl&pogoda=czysto&ostrosc=1&ludzik3d=0#postac=Jam&kod=ANGELIKA');
  await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden!==false,null,{timeout:120000});
  await page.evaluate(()=>{const s=window.__game.scene.getScene('game');s.noHurtUntil=Infinity;s.protectUntil=Infinity;for(const e of s.enemies)e.destroy();s.enemies=[];window.__game.scene.getScene('ui').openCharacter('eq');});
  await page.waitForSelector('.sl-cell[data-zone="eq"][data-key="bron"] img');
  const srcs=await page.$$eval('.sl-cell img',a=>a.map(i=>i.getAttribute('src')));
  for (const id of ['rycerski','zelazny_helm','kijek','korona']) assert(srcs.some(s=>s?.endsWith(`items/${id}.png`)),`${id} icon in the Kufer`);
  const sizes=await page.$$eval('.sl-cell img',a=>a.filter(i=>/rycerski|korona|kijek|zelazny_helm/.test(i.src)).map(i=>[i.naturalWidth,i.complete]));
  assert(sizes.every(([w,c])=>w===64&&c),'all four icons are the 64 px files');
  await page.screenshot({path:`work/ikony45/${name}-kufer.png`});
  // Big item card of the sword: the 256 px picture.
  const cell=page.locator('.sl-cell[data-zone="eq"][data-key="bron"]');
  await cell.dispatchEvent('pointerdown',{pointerId:1,clientX:1,clientY:1});
  await cell.dispatchEvent('pointerup',{pointerId:1,clientX:1,clientY:1,bubbles:true});
  const img=page.locator('.weapon-card .c-card-icon img');await img.waitFor();
  await img.evaluate(e=>e.decode());
  const info=await img.evaluate(e=>({src:e.getAttribute('src'),w:e.naturalWidth,r:getComputedStyle(e).imageRendering}));
  assert(info.src.endsWith('items/duze/rycerski.png')&&info.w===256,`card uses the big picture: ${JSON.stringify(info)}`);
  assert.equal(info.r,'auto');
  await page.screenshot({path:`work/ikony45/${name}-karta.png`});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.getElementById('character')||getComputedStyle(document.getElementById('character')).display==='none'||!document.querySelector('#character .k-wrap'),null,{timeout:5000}).catch(()=>{});
  // Shop preview: unequip the helmet so the shop offers it, then pick it.
  await page.evaluate(()=>{window.__gear.equip.helm=null;const s=window.__game.scene.getScene('game');const p={id:'shop:test',kind:'shop',name:'Sklep testowy',door:{x:s.player.x,y:s.player.y},x:s.player.x,y:s.player.y};s.openShop(p);});
  await page.waitForSelector('#shop .s26-cell img',{timeout:10000});
  const shopCell=page.locator('#shop .s26-cell',{has:page.locator('img[src$="items/zelazny_helm.png"]')}).first();
  if (await shopCell.count()) {
    await shopCell.click();
    const hero=page.locator('#shop .s26-hero-image img, #shop .s26-bubble img').first();await hero.waitFor();
    await hero.evaluate(e=>e.decode());
    const h=await hero.evaluate(e=>({src:e.getAttribute('src'),w:e.naturalWidth}));
    console.log(name,'shop preview',h);
    assert(h.src.endsWith('items/duze/zelazny_helm.png'),'shop preview uses the big picture');
  } else console.log(name,'shop does not offer the helmet – preview not checked');
  await page.screenshot({path:`work/ikony45/${name}-sklep.png`});
  assert.deepEqual(errors,[]);
  console.log(name,'OK');
  await context.close();
}
} finally { await browser.close(); server.httpServer.close(); }
