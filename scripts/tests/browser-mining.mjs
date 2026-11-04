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
  const result=await page.evaluate(async()=>{
   const s=window.__game.scene.getScene('game'),g=window.__gear;
   window.__game.scene.getScene('ui').closeDialog();s.scene.resume();s.witam=false;s.lingerUntil=0;s.talkReadyAt=0;
   s.inCombat=()=>false;s.streets.update=()=>{};s.folk.update=()=>{};
   let presentation;
   const shop=s.shopDialog;s.shopDialog=(p,d,entries)=>{presentation={d,entries};};
   for(const name of ['Decathlon','Sklep narzędziowy']){
    s.openGearShop({id:name,name,kind:'gear',door:{x:s.player.x,y:s.player.y}});
    if(!presentation.entries.some(e=>e.id==='buy:kilof'))throw Error('missing pickaxe in '+name);
   }
   s.shopDialog=shop;
   const methods=['areaKindsAt','isFree','roadAt','ready'];
   const originals=methods.map(k=>s.city[k]);const places=s.city.places;
   s.city.areaKindsAt=()=>['forest'];s.city.isFree=()=>true;s.city.roadAt=()=>null;s.city.ready=()=>true;s.city.places=[];
   s.zloza.next=0;s.zloza.update(s.player.x,s.player.y,s.time.now,()=>true);
   methods.forEach((k,i)=>s.city[k]=originals[i]);s.city.places=places;
   const z=s.zloza.lista[0];if(!z)throw Error('no generated deposits');
   window.__miningId=z.id;
   s.player.setPosition(z.x,z.y+6);s.cameras.main.centerOn(z.x,z.y);s.cameras.main.preRender();
   let saves=[];const save=s.save;s.save=()=>saves.push(structuredClone(s.zloza.stan(z)));
   const hit=()=>{s.mineReady=0;s.mine(z);};
   g.bag=[];g.equip.bron='kijek';hit();
   if(s.zloza.stan(z).a!==0)throw Error('mined without pickaxe');
   g.bag.push({item:'kilof'});
   for(let i=0;i<4;i++)hit();
   if(s.zloza.stan(z).a!==4||s.zloza.stan(z).n!==0)throw Error('early reward');
   hit();
   if(s.zloza.stan(z).n!==1||s.zloza.stan(z).a!==0)throw Error('fifth hit');
   const goods=()=>g.bag.filter(v=>'goods' in v);
   for(let i=0;i<45;i++)hit();
   if(s.zloza.stan(z).n!==10)throw Error('daily limit missing');
   const before=JSON.stringify(goods());hit();
   if(before!==JSON.stringify(goods()))throw Error('eleventh nugget');
   s.zloza.stan(z).d='2000-01-01';hit();
   if(s.zloza.stan(z).n!==0||s.zloza.stan(z).a!==1)throw Error('new day failed');
   g.wear.kilof=200;hit();
   if(s.zloza.stan(z).a!==1)throw Error('broken pickaxe works');
   g.wear.kilof=0;s.zloza.stan(z).a=4;
   const stock=structuredClone(g.bag);g.bag=Array.from({length:100},()=>({item:'zelazny'}));hit();
   if(s.zloza.stan(z).a!==4||s.zloza.stan(z).n!==0)throw Error('full bag consumes nugget');
   g.bag=stock;
   if(!saves.some(v=>v.n===10))throw Error('limit not saved');
   s.save=save;s.mineReady=0;
   s.interactionSelection.clear();s.updateInteractionTarget();
   return {saves:saves.length,goods:goods()};
  });
  await page.waitForTimeout(600);
  const native=await page.evaluate(()=>{
   const s=window.__game.scene.getScene('game'),z=s.zloza.lista.find(z=>z.id===window.__miningId);
   s.mineReady=0;s.talkReadyAt=0;s.lingerUntil=0;s.witam=false;
   const t=s.interactionCandidates().find(t=>t.id===`ore:${z.id}`);
   if(!t)throw Error('deposit missing from native actions');
   s.interactionSelection.pick(t);s.updateInteractionTarget();return s.zloza.stan(z).n;
  });
  if(phone)await page.locator('.hs-akcja').click({force:true});else await page.keyboard.press('e');
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>{const s=window.__game.scene.getScene('game');return s.zloza.stan(s.zloza.lista.find(z=>z.id===window.__miningId)).n;}),native+1,'native E/Action gives fifth hit reward');
  await page.screenshot({path:`work/interactions/mining-${phone?'phone':'desktop'}.png`});
  assert.deepEqual(errors,[]);
  console.log('PASS',phone?'phone':'desktop',result);
  await context.close();
 }
} finally { await browser.close(); }
