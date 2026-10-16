// Real Phaser game, real local map; every remote RPC is replaced. No player data is read or written.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('.cache',{recursive:true});
const production=process.env.COMBAT_PRODUCTION==='1';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader'],chromiumSandbox:false});
const results=[];let currentPage=null,currentErrors=[];
try {
  for(const mobile of production?[false]:[false,true]){
    const size=mobile?'phone':'desktop';
    const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'pl-PL'});
    let save={coins:100,mikstury:2,hp:10,story:{st:'koniec',walked:99},equip:{bron:'kijek',dystans:'tarcza_drewniana'},stats:{m:0,kills:{},earned:0,spent:0,fruit:0,missions:0,codes:0}},exp=0;
    const errors=[];
    await ctx.route('**/*.supabase.co/**',route=>{
      const path=new URL(route.request().url()).pathname;
      let body=null;
      if(path.endsWith('/login'))body={token:'combat-fixture',player:{name:'Jam',idik:'ANGELIKA',start_place:'Lublin',start_x:3000,start_y:3000,map_scale:1.92,save,exp,dead:false,age:9}};
      if(/game_content|school_quizzes|game_ports|kurier_wiesci/.test(path))body=[];
      if(path.endsWith('/game_settings'))body={};
      if(path.endsWith('/save_game')){const data=route.request().postDataJSON();save=data.p_save;exp=data.p_exp;body=true;}
      if(/heartbeat|logout|report_bug/.test(path))body=true;
      if(path.endsWith('/server_now'))body=new Date().toISOString();
      if(path.endsWith('/weather'))body={cell:'test',at:new Date().toISOString(),h:[]};
      if(path.endsWith('/settings'))body={external:{google:false}};
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    const page=await ctx.newPage();currentPage=page;currentErrors=errors;page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.addInitScript(()=>{window.__combatNear=e=>{const g=window.__game.scene.getScene('game');for(let r=6;r<=10;r+=2)for(let a=0;a<Math.PI*2;a+=Math.PI/12){const p={x:g.player.x+Math.cos(a)*r,y:g.player.y+Math.sin(a)*r};if(g.turnFree(p.x,p.y)){e.setPosition(p.x,p.y);if(g.turnCombat.line(e))return;}}throw new Error('No reachable adjacent fixture point');};});
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
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');g.turnCombat.nextScan=1e12;g.turnCombat.prompting=false;g.turnCombat.rng=123;window.__session.level.celnosc=15;});

    // Neutral dragon is an explicit talk encounter, never an attack based on species.
    await page.evaluate(()=>window.__game.scene.getScene('game').testEncounter('neutral'));
    await dismiss(false);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active),false);
    assert.match(await page.evaluate(()=>window.__game.scene.getScene('ui').dialogBox?.list?.filter(x=>x.type==='Text').map(x=>x.text).join(' ')),/spokojnie/);
    await dismiss();
    // Avoid does not reopen or start damage; conscious selecting can approach again.
    await page.evaluate(()=>window.__game.scene.getScene('game').testEncounter('single'));
    // Story/menu dialogs take priority and cannot leave an orphaned encounter input lock.
    await page.evaluate(()=>window.__game.scene.getScene('game').dialog({title:'Pierwszeństwo rozmowy',text:'Próba.',buttons:['OK'],onChoose:()=>{}}));
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.prompting),false);
    await dismiss(false);
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');g.turnCombat.offer(g.enemies.find(e=>e.missionId?.startsWith('test-spotkanie')&&!e.peaceful));});
    const hp=await page.evaluate(()=>window.__game.scene.getScene('game').player.hp);
    await dismiss();await page.waitForTimeout(650);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').player.hp),hp);
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active),false);
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');const e=g.enemies.find(e=>e.missionId?.startsWith('test-spotkanie')&&!e.peaceful);g.turnCombat.offer(e);});
    await dismiss(false);await ready();
    let before=await game();assert.equal(before.max,3);
    if(mobile)await page.getByRole('button',{name:/Ruch.*1 ruch/}).tap();
    else await page.keyboard.press('2');
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.mode),'move','Touch/keyboard changes mode without spending a move');
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
    const saved=await game();await page.evaluate(()=>{location.hash='postac=Jam&kod=ANGELIKA';});await page.reload();
    await page.waitForFunction(()=>window.__game?.scene.getScene('game')?.turnCombat?.active&&!document.querySelector('#loading-map:not([hidden])'),null,{timeout:150000});await ready();
    const restored=await game();for(const k of ['moves','max','round','phase','rng'])assert.deepEqual(restored[k],saved[k],`reload: ${k}`);
    assert.deepEqual(restored.wave,saved.wave);
    await page.screenshot({path:`.cache/combat-${size}-turn.png`});
    // A forced +1 is one move only, applied exactly once at the next own turn.
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat;b.nextScan=1e12;b.forceLuck('dodatkowy');b.endTurn();});
    await page.waitForFunction(round=>{const b=window.__game.scene.getScene('game').turnCombat.inspect();return b.round>round&&b.phase==='hero'&&!b.locked;},restored.round,{timeout:30000});
    const bonus=await game();assert.equal(bonus.max,4);assert.equal(bonus.moves,4);
    await page.screenshot({path:`.cache/combat-${size}-luck.png`});
    // Dodge and block are resolved on incoming attacks, not when browsing targets.
    for(const [effect,label] of [['unik','Unik'],['blok','Blok']]){
      const health=await page.evaluate(()=>window.__game.scene.getScene('game').player.hp);
      const r=(await game()).round;
      await page.evaluate(effect=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat,e=b.wave[0];window.__combatNear(e);b.forceLuck(effect);b.endTurn();},effect);
      await page.waitForFunction(r=>{const b=window.__game.scene.getScene('game').turnCombat.inspect();return b.round>r&&b.phase==='hero'&&!b.locked;},r,{timeout:30000});
      assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').player.hp),health,`${effect} prevents the hit`);
      assert.match(await page.locator('.tc-luck').innerText(),new RegExp(label));
    }
    // A completed single encounter awards normal EXP once and restores ordinary controls.
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat,e=b.wave[0];e.hp=.1;b.mode='attack';b.target=e;b.forceLuck('krytyk');b.moves=3;for(let r=6;r<20;r+=2){const p={x:g.player.x+r,y:g.player.y};if(g.turnFree(p.x,p.y)){e.setPosition(p.x,p.y);if(!b.reason())break;}}b.confirm();});
    await page.waitForFunction(()=>!window.__game.scene.getScene('game').turnCombat.active,null,{timeout:30000});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('turn-combat')),false);
    assert(exp>=5,'Original EXP callback executed');
    await page.screenshot({path:`.cache/combat-${size}-finished.png`});
    // Existing ranged training still works; its real-time shot cannot hurt an unaccepted encounter.
    const drill=await page.evaluate(()=>{
      const g=window.__game.scene.getScene('game'),gear=window.__gear;
      const e=g.spawnEnemy(g.player.x+3,g.player.y,'test-training','glut');e.temp=true;
      const hp=e.hp,before=gear.skills.luk,original=g.training.hitAt,any=g.training.anyAt;
      g.training.hitAt=(_x,_y,_r,skill)=>skill==='luk'?{}:null;g.training.anyAt=()=>null;
      g.fireShot({id:'luk',rodzaj:'luk',moc:4,amunicja:'strzaly'},{x:1,y:0},false,g.time.now);g.updateShots(.001);
      g.training.hitAt=original;g.training.anyAt=any;
      const result={before,after:gear.skills.luk,hp,afterHp:e.hp};e.destroy();g.enemies=g.enemies.filter(q=>q!==e);return result;
    });
    assert.equal(drill.after,drill.before+1);assert.equal(drill.afterHp,drill.hp);
    // Level progression and the boss's queued phase, on a compact group.
    await page.evaluate(()=>{window.__session.exp=1000;const g=window.__game.scene.getScene('game');g.turnCombat.rng=123;g.testEncounter('group');});
    await dismiss(false);await ready();assert.equal((await game()).max,4,'Level 5 gets four base moves');
    const gangId=await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.gang.id);
    for(let i=0,n=(await game()).wave.length;i<n;i++){
      await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat,e=b.wave.find(e=>e.active&&!e.isDead);e.hp=.1;window.__combatNear(e);b.choose('attack');b.target=e;b.forceLuck('krytyk');b.confirm();});
      await ready();
    }
    await page.waitForFunction(()=>{const b=window.__game.scene.getScene('game').turnCombat;return b.wave.some(e=>e.kindId==='herszt')&&!b.inspect().locked;},null,{timeout:30000});
    assert.equal((await game()).phase,'hero','Boss phase gives the hero the first decision');
    assert.equal(await page.evaluate(id=>window.__game.scene.getScene('game').turnCombat.gang.id===id,gangId),true);
    await page.screenshot({path:`.cache/combat-${size}-boss.png`});
    // Finish the fixture phase via normal paid attacks. Escort actions also remain in the queue.
    for(let attempt=0;attempt<12&&await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active);attempt++){
      // The final hit can finish its animation/save between loop entry and this wait.
      await page.waitForFunction(()=>{const b=window.__game.scene.getScene('game').turnCombat;return !b.active||(!b.inspect().locked&&b.inspect().phase==='hero');},null,{timeout:30000});
      if(!(await game()).active)break;
      await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),b=g.turnCombat;if(b.moves<1){b.endTurn();return;}const e=b.wave.find(e=>e.active&&!e.isDead);if(!e)return;e.hp=.1;window.__combatNear(e);b.choose('attack');b.target=e;b.forceLuck('krytyk');b.confirm();});
      await page.waitForTimeout(600);
    }
    await page.waitForFunction(()=>!window.__game.scene.getScene('game').turnCombat.active,null,{timeout:30000});
    assert.equal(await page.evaluate(()=>window.__session.stats.gangs),1,'Gang reward exactly once');
    // Static nuclei stay put; moving nuclei retain close followers and respect the same obstacles.
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');g.turnCombat.nextScan=1e12;g.testEncounter('static');g.testEncounter('mobile');});
    const formations=await page.evaluate(()=>{const g=window.__game.scene.getScene('game'),gs=g.streets.gangs.filter(g=>g.kind.nazwa==='Grupka testowa'&&!g.clearedAt),start=gs.map(g=>({x:g.formation.x,y:g.formation.y}));for(let frame=0;frame<500;frame++)g.streets.formations(g.time.now+frame*50,.05,(x,y)=>g.turnFree(x,y));return gs.map((a,i)=>({mobile:a.formation.mobile,d:Math.hypot(a.formation.x-start[i].x,a.formation.y-start[i].y),farthest:Math.max(...[...a.members.values()].map(e=>Math.hypot(e.x-a.formation.x,e.y-a.formation.y)))}));});
    assert.equal(formations.find(g=>!g.mobile).d,0);
    assert(formations.find(g=>g.mobile).d>0,'Mobile nucleus moves');
    assert(formations.every(g=>g.farthest<32),'Followers stay near the nucleus');
    await page.screenshot({path:`.cache/combat-${size}-formations.png`});
    // Defeat releases tactical input and hands control to the existing resurrection dialog.
    await page.evaluate(()=>window.__game.scene.getScene('game').testEncounter('single'));
    await dismiss(false);await ready();
    await page.evaluate(()=>{const g=window.__game.scene.getScene('game');g.player.hp=.1;g.turnCombat.h.hurt(g.turnCombat.wave[0],1);});
    assert.equal(await page.evaluate(()=>window.__game.scene.getScene('game').turnCombat.active),false);
    assert.equal(await page.evaluate(()=>document.body.classList.contains('turn-combat')),false);
    assert.match(await page.evaluate(()=>window.__game.scene.getScene('ui').dialogBox?.list.filter(x=>x.type==='Text').map(x=>x.text).join(' ')),/Porażka/);
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth>innerWidth,oldInputs:window.__game.scene.getScene('game').turnCombat.active}));assert.equal(layout.scroll,false);
    assert.deepEqual(errors,[],JSON.stringify(errors));results.push({size,pass:true,exp});await ctx.close();
  }
  await writeFile('.cache/combat-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}catch(error){
  if(currentPage&&!currentPage.isClosed()){
    const diagnostic=await currentPage.evaluate(()=>{const g=window.__game?.scene.getScene('game');return {menu:!!document.getElementById('menu'),loading:!!document.querySelector('#loading-map:not([hidden])'),active:g?.scene.isActive(),paused:g?.scene.isPaused(),player:g?.player?{x:g.player.x,y:g.player.y,hp:g.player.hp}:null,combat:g?.turnCombat?.inspect(),checkpoint:!!window.__session?.testCombat};}).catch(e=>({error:e.message}));
    console.log('combat failure',JSON.stringify({error:error.message,errors:currentErrors,diagnostic}));
    await currentPage.screenshot({path:'.cache/combat-failure.png'}).catch(()=>{});
    await writeFile('.cache/combat-failure.json',JSON.stringify({error:error.message,errors:currentErrors,diagnostic},null,2));
  }
  throw error;
}finally{await browser.close();}
