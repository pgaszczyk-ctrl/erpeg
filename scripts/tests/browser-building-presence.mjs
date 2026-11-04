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
 for (const [name,width,height,dpr,mobile] of [['desktop',1440,900,1,false],['phone',390,844,2,true]]) {
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:mobile,hasTouch:mobile,locale:'pl-PL',reducedMotion:'reduce'});
  let start,latestSave;const errors=[],requests=[];
  await ctx.route('**/*.supabase.co/**',async route=>{
   const fn=new URL(route.request().url()).pathname.split('/').pop();
   const body=route.request().postDataJSON();
   let json=[];
   if(fn==='login') json={token:'offline-hud-test',player:{name:'Próba mapy',idik:'OFFLINE',start_place:'Plac Zamkowy',start_x:start.x,start_y:start.y,map_scale:1.92,exp:25,dead:false,age:7,immortal:false,save:{coins:1000,look:{postac:0},story:{st:'koniec',walked:0},mikstury:2,bag:[{goods:'owoce',counts:{jablko:50}},{item:'rower'},{item:'paczek'}]}}};
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
  start=await page.evaluate(()=>window.__game.registry.get('city').fromLatLon(51.24858,22.51753));
  const inputs=page.locator('#menu input');await inputs.nth(0).fill('Arceus');await inputs.nth(1).fill('OFFLINE');
  await page.getByRole('button',{name:'Wczytaj',exact:true}).click();
  await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&document.getElementById('loading-map')?.hidden,null,{timeout:90000});

  // Check the first revealed view, before moving or changing the zoom.
  const initial=await page.evaluate(()=>{
   const sc=window.__game.scene.getScene('game'),b=sc.city.buildings.find(b=>b.addresses.includes('Nałęczowska 16')&&b.name==='eLeader'),w=b&&sc.mapView.wysokie.wszystkie.get(b.id);
   return {mapId:sc.city.id,immortal:window.__session.immortal,drawn:!!w?.im,visible:w?.im?.visible,pending:w?.czeka,error:w?.error?.message,cutout:!!w?.wyciete};
  });
  assert(initial.drawn&&initial.visible&&!initial.pending&&!initial.error);assert.equal(initial.immortal,false);
  await page.screenshot({path:`${artifacts}/naleczowska-${name}-first-view.png`});
  await page.evaluate(()=>window.__game.scene.getScene('game').cameras.main.setZoom(2));
  const checks=[];
  for(const [side,lat,lon] of [['south',51.24858,22.51753],['east',51.24877,22.51781],['north',51.24907,22.51753],['west',51.24877,22.51725],['south-return',51.24858,22.51753]]){
   await page.evaluate(({lat,lon})=>{const sc=window.__game.scene.getScene('game'),p=sc.city.fromLatLon(lat,lon);sc.player.setPosition(p.x,p.y);}, {lat,lon});
   await page.waitForFunction(()=>{const sc=window.__game.scene.getScene('game');return sc.mapView.firstViewReady(sc.cameras.main);},null,{timeout:60000});
   await page.waitForTimeout(250);
   const check=await page.evaluate(()=>{
    const sc=window.__game.scene.getScene('game');
    const b=sc.city.buildings.find(b=>b.addresses.includes('Nałęczowska 16')&&b.name==='eLeader');
    const w=b&&sc.mapView.wysokie.wszystkie.get(b.id);
    return {address:b?.addresses,name:b?.name,id:b?.id,levels:b?.levels,drawn:!!w?.im,visible:w?.im?.visible,pending:w?.czeka,error:w?.error?.message,refs:w?.refs.size,opaque:w?.orig?.filter(x=>(x>>>24)>0).length,cutout:!!w?.wyciete};
   });
   assert.equal(check.name,'eLeader');assert.equal(check.levels,6);assert(check.drawn&&check.visible&&!check.pending&&!check.error);assert(check.refs>0&&check.opaque>1000);
   checks.push({side,...check});
   if(side==='south'||side==='north')await page.screenshot({path:`${artifacts}/naleczowska-${name}-${side}.png`});
  }
  // Real walking, rather than only repositioning the camera around the building.
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');
  assert.deepEqual(errors,[]);results.push({name,initial,checks,errors});
  console.log(JSON.stringify({name,initial,checks,errors}));await ctx.close();
 }
 await writeFile(`${artifacts}/naleczowska-verification.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}
