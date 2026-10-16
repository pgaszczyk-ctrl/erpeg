// Real Phaser game, real local map; every remote RPC is replaced. No player data is read or written.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('.cache',{recursive:true});
const production=process.env.COMBAT_PRODUCTION==='1';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const results=[];
try {
  for(const mobile of production?[false]:[false,true]){
    const size=mobile?'phone':'desktop';
    const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'pl-PL'});
    let save={coins:100,mikstury:2,hp:10,story:{st:'koniec',walked:99},equip:{bron:'kijek',dystans:'tarcza_drewniana'},stats:{m:0,kills:{},earned:0,spent:0,fruit:0,missions:0,codes:0}},exp=0;
    const errors=[];
    await ctx.route('**/*.supabase.co/**',route=>{
      const path=new URL(route.request().url()).pathname;
      let body=null;
      if(path.endsWith('/login'))body={token:'combat-fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:3000,start_y:3000,map_scale:1.92,save,exp,dead:false,age:12}};
      if(/game_content|school_quizzes|game_ports|kurier_wiesci/.test(path))body=[];
      if(path.endsWith('/game_settings'))body={};
      if(path.endsWith('/save_game')){const data=route.request().postDataJSON();save=data.p_save;exp=data.p_exp;body=true;}
      if(/heartbeat|logout|report_bug/.test(path))body=true;
      if(path.endsWith('/server_now'))body=new Date().toISOString();
      if(path.endsWith('/weather'))body={cell:'test',at:new Date().toISOString(),h:[]};
      if(path.endsWith('/settings'))body={external:{google:false}};
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    const game=()=>page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.inspect());
    const ready=()=>page.waitForFunction(()=>{const g=window.__game?.scene.getScene('game');return g?.turnCombat?.active&&!g.turnCombat.inspect().locked&&g.scene.isActive();},null,{timeout:30000});
    async function dismiss(last=true){
      await page.evaluate(last=>{const ui=window.__game.scene.getScene('ui');if(ui.dialogBox){const fn=ui.dialogChoose;const bs=ui.dialogButtons.filter(b=>b.index>=0);ui.closeDialog();fn?.(last?bs.length-1:0);}},last);
    }
    await page.goto(`http://127.0.0.1:${production?4174:4173}/?lang=pl&pogoda=czysto&ostrosc=1#postac=Jam&kod=ANGELIKA`);
    await page.waitForFunction(()=>window.__game?.scene.isActive('game')&&window.__game.scene.getScene('game').firstViewReady?.()&&!document.querySelector('#loading-map:not([hidden])'),null,{timeout:150000});
    if(production){
      assert.equal(await page.evaluate(()=>!!window.__game.scene.getScene('game').turnCombat),false);
      assert.equal(await page.locator('#turn-combat').count(),0);
      await page.screenshot({path:'.cache/combat-production.png'});
      assert.deepEqual(errors,[]);results.push({production:true,pass:true});await ctx.close();continue;
    }
    await dismiss();
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');g.turnCombat.nextScan=1e12;g.turnCombat.prompting=false;});

    // Neutral dragon is an explicit talk encounter, never an attack based on species.
    await page.evaluate(()=>window.__game.scene.getScene('game').testEncounter('neutral'));
    await dismiss(false);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active),false);
    assert.match(await page.evaluate(()=>window.__game.scene.getScene('ui').dialogBox?.list?.filter(x=>x.type==='Text').map(x=>x.text).join(' ')),/spokojnie/);
    await dismiss();
    // Avoid does not reopen or start damage; conscious selecting can approach again.
    await page.evaluate(()=>window.__game.scene.getScene('game').testEncounter('single'));
    const hp=await page.evaluate(()=>window.__game.scene.getScene('game').player.hp);
    await dismiss();await page.waitForTimeout(650);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').player.hp),hp);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active),false);
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');const e=g.enemies.find(e=>e.missionId?.startsWith('test-spotkanie')&&!e.peaceful);g.turnCombat.offer(e);});
    await dismiss(false);await ready();
    let before=await game();assert.equal(before.max,3);
    // Idle time does not advance rounds, attacks, projectiles or free healing.
    await page.waitForTimeout(1000);assert.deepEqual(await game(),before);
    // Invalid movement and a cancelled preview do not cost moves or reveal fog.
    const invalid=await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat;const n=b.inspect().moves;b.choose('move');b.pick({x:g.player.x+1000,y:g.player.y});b.confirm();return {n,after:b.inspect().moves,path:b.path};});
    assert.equal(invalid.after,invalid.n);assert.equal(invalid.path,null);
    // Find a genuine reachable movement near this real-map spawn.
    const moved=await page.evaluate(()=>{
      const g=window.__game.scene.getScene('game'),b=g.turnCombat;
      for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:g.player.x+Math.cos(a)*6,y:g.player.y+Math.sin(a)*6};b.pick(p);if(b.path){const old={x:g.player.x,y:g.player.y,moves:b.inspect().moves};b.confirm();return old;}}
      return null;
    });assert(moved,'Reachable movement exists');await ready();
    assert.equal((await game()).moves,moved.moves-1);
    assert.equal((await game()).phase,'hero','No enemy response after one action');
    // Keyboard/quick mixed clicks cannot double a paid action.
    const target=await page.evaluate(()=>{
      const g=window.__game.scene.getScene('game'),b=g.turnCombat,e=b.wave[0];
      // Place only the fixture opponent in melee range, on a valid map point.
      for(let r=8;r<=20;r+=3)for(let a=0;a<Math.PI*2;a+=Math.PI/6){const p={x:g.player.x+Math.cos(a)*r,y:g.player.y+Math.sin(a)*r};if(g.turnFree(p.x,p.y)){e.setPosition(p.x,p.y);b.choose('attack');b.target=e;if(!b.reason())return {x:e.x,y:e.y,hp:e.hp};}}
      return null;
    });assert(target,'An attack has a valid visible target');
    const one=await game();
    await page.evaluate(()=>{const b=window.__game.scene.getScene('game').turnCombat;b.confirm();b.confirm();b.confirm();});await ready();
    assert.equal((await game()).moves,one.moves-1);
    await page.getByRole('button',{name:/Specjalne/}).click();
    assert.equal(await page.getByRole('button',{name:'Zatwierdź',exact:true}).isEnabled(),false,'2-move attack unavailable at one move');
    // Reload keeps moves, round, participant health and RNG, including after a paid move.
    const saved=await game();await page.reload();
    await page.waitForFunction(()=>window.__game?.scene.getScene('game')?.turnCombat?.active&&!document.querySelector('#loading-map:not([hidden])'),null,{timeout:150000});await ready();
    const restored=await game();for(const k of ['moves','max','round','phase','rng'])assert.deepEqual(restored[k],saved[k],`reload: ${k}`);
    assert.deepEqual(restored.wave,saved.wave);
    await page.screenshot({path:`.cache/combat-${size}-turn.png`});
    // A forced +1 is one move only, applied exactly once at the next own turn.
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat;b.nextScan=1e12;b.forceLuck('dodatkowy');b.endTurn();});
    await page.waitForFunction(round=>{const b=window.__game.scene.getScene('game').turnCombat.inspect();return b.round>round&&b.phase==='hero'&&!b.locked;},restored.round,{timeout:30000});
    const bonus=await game();assert.equal(bonus.max,4);assert.equal(bonus.moves,4);
    await page.screenshot({path:`.cache/combat-${size}-luck.png`});
    // A completed single encounter awards normal EXP once and restores ordinary controls.
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat,e=b.wave[0];e.hp=.1;b.mode='attack';b.target=e;b.forceLuck('krytyk');b.moves=3;for(let r=6;r<20;r+=2){const p={x:g.player.x+r,y:g.player.y};if(g.turnFree(p.x,p.y)){e.setPosition(p.x,p.y);if(!b.reason())break;}}b.confirm();});
    await page.waitForFunction(()=>!window.__game.scene.getScene('game').turnCombat.active,null,{timeout:30000});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('turn-combat')),false);
    assert(exp>=5,'Original EXP callback executed');
    await page.screenshot({path:`.cache/combat-${size}-finished.png`});
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth>innerWidth,oldInputs:window.__game.scene.getScene('game').turnCombat.active}));assert.equal(layout.scroll,false);
    assert.deepEqual(errors,[],JSON.stringify(errors));results.push({size,pass:true,exp});await ctx.close();
  }
  await writeFile('.cache/combat-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
