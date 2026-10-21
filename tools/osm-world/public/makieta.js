const $=id=>document.getElementById(id),W=1800,H=1300,canvas=$('scene');
const manifest=await fetch('assets/building-pilot-v1/manifest.json').then(r=>r.json());
const images=new Map();await Promise.all(manifest.assets.map(async a=>{const img=new Image();img.src='assets/building-pilot-v1/'+a.file;await img.decode();images.set(a.id,img);}));
const placements=[{x:1,y:1,kind:'house-large',style:'steam'},{x:4,y:1,kind:'apartment',style:'steam'},{x:8,y:1,kind:'house-large',style:'elven'},{x:11,y:1,kind:'apartment',style:'elven'},{x:1,y:7,kind:'house-large',style:'steam'},{x:3,y:7,kind:'apartment',style:'steam'},{x:8,y:7,kind:'apartment',style:'elven'},{x:10,y:7,kind:'house-large',style:'elven'}];
const project=([x,y])=>[690+(x-y)*64,150+(x+y)*32];
function paint(ctx){
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#dce0cb';ctx.fillRect(0,0,W,H);
 const poly=(p,color,stroke)=>{ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(...project(q)):ctx.moveTo(...project(q)));ctx.closePath();if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}};
 const rect=(x,y,w,h,color,stroke)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],color,stroke);
 rect(-1,-1,17,13,'#a7b98b');rect(-1,4,17,2,'#d6c49d');rect(6,-1,1.2,13,'#d6c49d');
 rect(8,10,5,1,'#91aa78');rect(0,10,5,1,'#91aa78');
 if($('grid').checked)for(let x=-1;x<16;x++)for(let y=-1;y<12;y++)rect(x,y,1,1,null,'#60785130');
 for(const p of placements){rect(p.x,p.y,2,2,'#c6c6a3');if($('plots').checked){rect(p.x,p.y,2,2,null,'#219d9c');rect(p.x+.15,p.y+.15,1.7,1.7,null,'#a15ca4');}}
 for(const p of [...placements].sort((a,b)=>a.x+a.y-b.x-b.y)){
  const style=$('style').value==='mixed'?p.style:$('style').value,id=p.kind+'-'+style,a=manifest.assets.find(a=>a.id===id),anchor=project([p.x+2,p.y+2]);
  ctx.drawImage(images.get(id),anchor[0]-a.anchor_px[0],anchor[1]-a.anchor_px[1],512,512);
 }
 ctx.fillStyle='#354b3c';ctx.font='24px system-ui';ctx.fillText('EXP-LORE / PRÓBA GRAFIKI 1:1',55,60);ctx.font='18px system-ui';ctx.fillText('Siatka 128 × 64 px • budynki 512 × 512 px • cztery oryginalne projekty',55,93);
 ctx.fillText('Turkus: działka 2×2  /  Fiolet: obrys ścian  /  bez skalowania modułów',55,1245);
}
function render(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);paint(ctx);$('status').textContent='4 projekty · 8 ustawień';}
let mode='fit';function resize(){const scale=mode==='fit'?Math.min(1,$('stage').clientWidth/W):1;canvas.style.width=W*scale+'px';canvas.style.height=H*scale+'px';}
$('fit').onclick=()=>{mode='fit';resize();};$('native').onclick=()=>{mode='native';resize();$('stage').scrollLeft=350;$('stage').scrollTop=150;};
for(const id of ['style','grid','plots'])$(id).onchange=render;
$('save').onclick=()=>{const out=document.createElement('canvas');out.width=W;out.height=H;paint(out.getContext('2d'));out.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='exp-lore-makieta-1800x1300.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});};
window.addEventListener('resize',resize);render();resize();window.__mockup={placements,manifest,images};
