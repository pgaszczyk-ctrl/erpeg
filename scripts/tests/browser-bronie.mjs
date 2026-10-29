import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {preview} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('work/bronie',{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4175,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']});
try {
for(const [name,width,height] of [['desktop',1280,800],['phone',390,844]]) {
 const context=await browser.newContext({viewport:{width,height}});
 const values={},loot={},writes=[],errors=[];
 await context.addInitScript(()=>sessionStorage.setItem('erpeg-admin','fixture'));
 await context.route('**/*.supabase.co/**',r=>{
  const fn=new URL(r.request().url()).pathname.split('/').pop(),b=r.request().postDataJSON();let json={};
  if(fn==='admin_overview')json={players:[],missions:[],codes:[],deaths:0};
  if(fn==='admin_settings')json={values,gold:{alive:0,coins:0,chest:0,diamonds:0}};
  if(fn==='admin_set_setting'){writes.push(b);if(b.p_v===null)delete values[b.p_k];else values[b.p_k]=b.p_v;json={ok:true};}
  if(fn==='admin_stwory')json={stwory:loot};
  if(fn==='admin_stwory_zapisz'){writes.push(b);loot[b.p_rodzaj]={exp:b.p_exp,lup:b.p_lup};json={ok:true};}
  return r.fulfill({json});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4175/admin.html');
 await page.getByRole('button',{name:'⚔ Repozytorium broni',exact:true}).click();
 const card=page.locator('[data-weapon="zelazny"]');await card.waitFor();
 assert.equal(await card.getByRole('spinbutton',{name:'Minimum obrażeń',exact:true}).inputValue(),'6');
 await card.getByRole('spinbutton',{name:'Minimum obrażeń',exact:true}).fill('15');
 await card.getByRole('button',{name:'Zapisz zakres',exact:true}).click();
 await card.getByText(/minimum nie większe/).waitFor();assert.equal(writes.length,0);
 await card.getByRole('spinbutton',{name:'Minimum obrażeń',exact:true}).fill('7');
 await card.getByRole('spinbutton',{name:'Maksimum obrażeń',exact:true}).fill('10');
 await card.getByRole('button',{name:'Zapisz zakres',exact:true}).click();await card.getByText('Zapisane: 7–10.',{exact:true}).waitFor();
 await card.getByRole('spinbutton',{name:'Wytrzymałość broni',exact:true}).fill('700');
 await card.getByRole('button',{name:'Zapisz wytrzymałość',exact:true}).click();await card.getByText('Wytrzymałość zapisana: 700.',{exact:true}).waitFor();
 await page.getByRole('searchbox').fill('miecz treningowy');await page.screenshot({path:`work/bronie/${name}-katalog.png`});
 assert.equal(await page.locator('[data-weapon]:visible').count(),5);
 await page.getByRole('button',{name:'🐺 Stworki',exact:true}).click();
 const wolf=page.locator('.card').filter({has:page.getByRole('heading',{name:/^Wilk/})});
 await wolf.getByRole('button',{name:'＋ Dodaj przedmiot',exact:true}).click();
 await wolf.getByRole('combobox',{name:'Przedmiot łupu'}).selectOption('stalowy_jakosc4');
 await wolf.getByRole('button',{name:'Zapisz',exact:true}).click();await wolf.getByText('Zapisane.',{exact:true}).waitFor();
 assert.equal(loot.wilk.lup[0].co,'stalowy_jakosc4');
 await page.getByRole('button',{name:'⚔ Repozytorium broni',exact:true}).click();
 assert.equal(await card.getByRole('spinbutton',{name:'Minimum obrażeń',exact:true}).inputValue(),'7');
 await card.getByRole('button',{name:'Przywróć domyślne',exact:true}).click();await card.getByText('Przywrócono domyślne.',{exact:true}).waitFor();
 assert.equal(await card.getByRole('spinbutton',{name:'Minimum obrażeń',exact:true}).inputValue(),'6');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log(`PASS ${name}: catalog/filter/validation/persistence/reset/durability/creature loot/no overflow`);
 await context.close();
}
}finally{await browser.close();await server.httpServer.close();}
