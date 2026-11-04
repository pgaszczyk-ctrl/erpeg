// PREVIEW_URL can target a deployed /test/; CHROMIUM_PATH selects a locally installed browser.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const reports=[];
 try {
  for(const phone of [false,true]){
   const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1280,height:900},isMobile:phone,hasTouch:phone,deviceScaleFactor:1});
   const page=await context.newPage(); const errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&r.url().includes('/modele'))failed.push(r.url()+':'+r.status())});
   await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:4173/')+'modele-swiata.html');
   await page.waitForFunction(()=>window.preview44,{timeout:60000});
   const result=await page.evaluate(()=>{
    const p=window.preview44; let clips=0;
    const options=[...document.getElementById('model').options].map(o=>o.value);
    const group=new Set(['new','residents','batch3','batch2','base','all']);
    const single=options.filter(n=>!group.has(n));
    for(const selection of single){
     p.setState({selection,action:'walk',paused:true,time:.34});
     if(document.getElementById('glError').textContent)throw Error('GL '+selection);
    }
    for(const model of p.models){
     for(const clip of model.g.animations||[]){
      const duration=model.duration(clip.name);const matrices=model.pose(clip.name,duration*.53);
      if(!matrices.every(m=>m.every(Number.isFinite)))throw Error('Non-finite pose '+clip.name);
      clips++;
     }
    }
    p.setState({selection:'wilk',action:'lunge',time:.6,paused:true});
    const canvas=document.getElementById('scene');const gl=canvas.getContext('webgl');
    const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    if(colors.size<5)throw Error('Empty render: '+colors.size);
    return {models:p.models.length,clips,colors:colors.size,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(result.models,29);assert(result.clips>=152);assert.equal(result.overflow,false);
   await page.screenshot({path:`work/models-${phone?'phone':'desktop'}.png`,fullPage:true});
   await page.selectOption('#model','zombiak');await page.selectOption('#action','attack');
   await page.getByRole('button',{name:'Odtwórz od początku'}).click();
   await page.getByRole('button',{name:'Bok',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.preview44.getState().angle),90);
   await page.selectOption('#model','pies');await page.selectOption('#action','sit');
   await page.evaluate(()=>window.preview44.setState({time:2,paused:true}));
   assert.equal(await page.locator('#glError').textContent(),'');
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   reports.push({phone,...result,errors,failed});await context.close();
  }
  fs.writeFileSync('work/models-browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
