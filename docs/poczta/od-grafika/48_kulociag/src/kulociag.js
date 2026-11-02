/* EXP-LORE 48-G001. Canvas 2D, no dependencies. Units: source pixels / seconds. */
(function(root){
'use strict';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
const D={board:.4,compress:1.35,hold:.3,release:.2,recoil:.5,arrive:1.6,brake:.8,settle:.9,exit:.7};
class Lane {
 constructor(id,x,emit=()=>{}){this.id=id;this.x=x;this.emit=emit;this.phase='idle';this.elapsed=0;this.passenger=null;this.ready=false;}
 change(phase){this.phase=phase;this.elapsed=0;this.emit({lane:this.id,type:phase,passenger:this.passenger});}
 depart(passenger,{ready=false}={}){if(!['idle','empty'].includes(this.phase))return false;this.passenger=passenger;this.ready=ready;this.change('board');return true;}
 arrive(passenger){if(!['idle','empty'].includes(this.phase))return false;this.passenger=passenger;this.change('arrive');return true;}
 setReady(value=true){this.ready=value;}
 cancel(){if(!['board','compress','hold'].includes(this.phase))return false;this.change('idle');this.passenger=null;return true;}
 update(dt){if(!Number.isFinite(dt)||dt<0)throw Error('dt must be finite and nonnegative');
 // Carry overshoot across phases, so animation does not depend on frame rate.
 let left=dt;for(let n=0;n<20;n++){
  if(['idle','empty'].includes(this.phase))return;
  if(this.phase==='hold'&&!this.ready){this.elapsed=Math.min(D.hold,this.elapsed+left);return;}
  const duration=D[this.phase],take=Math.min(left,Math.max(0,duration-this.elapsed));this.elapsed+=take;left-=take;
  if(this.elapsed<duration-1e-9)return;
  const next={board:'compress',compress:'hold',hold:'release',release:'recoil',recoil:'empty',arrive:'brake',brake:'settle',settle:'exit',exit:'idle'}[this.phase];
  this.change(next);if(next==='idle')this.passenger=null;if(left<=0)return;
 }
 }
 pose(){let p=this.phase,u=clamp(this.elapsed/(D[p]||1)),compression=0,y=530,visible=!['empty','recoil'].includes(p),passenger=this.passenger,release=0,exit=0;
 if(p==='board'){}else if(p==='compress'){compression=smooth(u);y=530+73*compression;}
 else if(p==='hold'){compression=1;y=603;}
 else if(p==='release'){compression=Math.max(0,1-u/.22);y=603-760*u;release=u;}
 else if(p==='recoil'){compression=Math.max(0,.1*Math.sin(u*22)*Math.exp(-u*5));}
 else if(p==='arrive'){y=-55+585*(1-(1-u)*(1-u));}
 else if(p==='brake'){compression=60/73*Math.sin(u*Math.PI/2);y=530+73*compression;}
 else if(p==='settle'){compression=60/73*(1-smooth(u));y=530+73*compression;}
 else if(p==='exit'){exit=u;passenger=null;}
 return {phase:p,u,compression,y,visible,passenger,release,exit};
 }
}
class Station {
 constructor({assetRoot='assets/',onEvent=()=>{},drawPassenger=()=>{}}={}){this.assetRoot=assetRoot.replace(/\/?$/,'/');this.drawPassenger=drawPassenger;this.images={};this.time=0;this.lanes=[1028,1251,1474].map((x,i)=>new Lane(i,x,onEvent));}
 async load(){let names=['station/hala','station/foreground_bands','rig/trough','rig/gauge_face','rig/gauge_needle','rig/side_steps','ball/back','ball/front','ball/shadow','ball/hatch_open','fx/trail'];for(let i=0;i<5;i++)names.push('rig/spring_'+i,'rig/pistons_'+i);for(let i=0;i<4;i++)names.push('ball/reflection_'+i);for(let i=0;i<8;i++)names.push('fx/steam_'+i);
 await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{this.images[name]=img;resolve();};img.onerror=()=>reject(Error('Missing asset: '+name));img.src=this.assetRoot+name+'.png';})));return this;}
 update(dt){this.time+=dt;for(const lane of this.lanes)lane.update(dt);}
 draw(ctx,{width=1672,height=941}={}){if(!this.images['station/hala'])throw Error('Call await station.load() before draw()');ctx.save();ctx.scale(width/1672,height/941);ctx.imageSmoothingEnabled=false;const im=(name,x,y)=>ctx.drawImage(this.images[name],Math.round(x),Math.round(y));im('station/hala',0,0);
 const effects=[];
 for(const lane of this.lanes){const x=lane.x,p=lane.pose(),f=p.phase==='release'?4:Math.round(clamp(p.compression)*3);
  im('rig/trough',x-64,520);im('rig/spring_'+f,x-64,520);im('rig/pistons_'+f,x-64,520);im('rig/side_steps',x-95,534);
  im('rig/gauge_face',x+60,635);ctx.save();ctx.translate(x+80,655);ctx.rotate(-1.8+p.compression*2.9);im('rig/gauge_needle',-20,-20);ctx.restore();
  if(p.visible){ctx.save();ctx.globalAlpha=p.y<140?clamp((p.y-20)/120):1;im('ball/shadow',x-40,p.y-40);im('ball/back',x-40,p.y-40);
   if(p.passenger!==null){ctx.save();ctx.beginPath();ctx.arc(x,p.y,29,0,7);ctx.clip();ctx.translate(x,p.y+18);this.drawPassenger(ctx,p.passenger,{lane:lane.id,inside:true,time:this.time});ctx.restore();}
   im('ball/front',x-40,p.y-40);im('ball/reflection_'+Math.floor(this.time*5)%4,x-40,p.y-40);if(p.phase==='board'||p.phase==='exit')im('ball/hatch_open',x-72,p.y-40);ctx.restore();}
  if(p.phase==='exit'){ctx.save();ctx.translate(x-83*p.exit,552+16*p.exit);this.drawPassenger(ctx,lane.passenger,{lane:lane.id,inside:false,time:this.time});ctx.restore();}
  if(p.phase==='release'){ctx.save();ctx.globalAlpha=.7;im('fx/trail',x-40,p.y+35);ctx.restore();effects.push([x,Math.floor(p.u*5)]);}
  if(p.phase==='recoil')effects.push([x,Math.min(7,2+Math.floor(p.u*6))]);
  if(p.phase==='brake')effects.push([x,Math.floor(p.u*7)]);
  if(['compress','hold'].includes(p.phase)&&Math.floor(this.time*5)%4===0)effects.push([x,2]);
 }
 im('station/foreground_bands',0,0);for(const [x,f]of effects)im('fx/steam_'+f,x-224,570);ctx.restore();
 }
}
root.Kulociag={Lane,Station,timings:D};
})(typeof globalThis!=='undefined'?globalThis:window);
