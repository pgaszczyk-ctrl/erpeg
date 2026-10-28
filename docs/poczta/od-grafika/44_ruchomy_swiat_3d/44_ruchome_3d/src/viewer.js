/* EXP-LORE 44-G001. Minimal glTF viewer for the bundled rigid animated assets.
   This is a preview renderer, not the game's NPC or combat system. No network requests. */
'use strict';
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul=(a,b)=>{let c=Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c;};
const tr=(x=0,y=0,z=0)=>{let m=I();m[12]=x;m[13]=y;m[14]=z;return m;};
const ry=a=>{let m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const rx=a=>{let m=I(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
function trs(t,q,s){let [x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;return [(1-2*(yy+zz))*s[0],2*(xy+wz)*s[0],2*(xz-wy)*s[0],0,2*(xy-wz)*s[1],(1-2*(xx+zz))*s[1],2*(yz+wx)*s[1],0,2*(xz+wy)*s[2],2*(yz-wx)*s[2],(1-2*(xx+yy))*s[2],0,...t,1];}
function ortho(span,aspect){return [2/(span*aspect),0,0,0,0,2/span,0,0,0,0,-.1,0,0,0,0,1];}
function lerp(a,b,f,quat=false){let d=1;if(quat&&a.reduce((s,x,i)=>s+x*b[i],0)<0)d=-1;let v=a.map((x,i)=>x*(1-f)+b[i]*f*d);if(quat){let l=Math.hypot(...v);v=v.map(x=>x/l);}return v;}
function parseGLB(b64){let b=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),dv=new DataView(b.buffer);if(dv.getUint32(0,true)!==0x46546c67)throw Error('Niepoprawny GLB');let n=dv.getUint32(12,true),g=JSON.parse(new TextDecoder().decode(b.slice(20,20+n))),binOffset=28+n,cache=new Map();
 function acc(i){if(cache.has(i))return cache.get(i);let a=g.accessors[i],v=g.bufferViews[a.bufferView],dim={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],C={5126:Float32Array,5121:Uint8Array,5123:Uint16Array,5125:Uint32Array}[a.componentType],raw=new C(b.buffer,binOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*dim),out=raw;if(a.normalized)out=Float32Array.from(raw,x=>x/(a.componentType===5121?255:65535));let r={data:out,dim,count:a.count};cache.set(i,r);return r;}
 function pose(action,t){let T=g.nodes.map(n=>(n.translation||[0,0,0]).slice()),Q=g.nodes.map(n=>(n.rotation||[0,0,0,1]).slice()),S=g.nodes.map(n=>(n.scale||[1,1,1]).slice());let a=g.animations?.find(a=>a.name===action);
  if(a)for(let ch of a.channels){let s=a.samplers[ch.sampler],tt=acc(s.input).data,v=acc(s.output),time=Math.max(tt[0],Math.min(t,tt[tt.length-1])),i=0;while(i<tt.length-2&&tt[i+1]<time)i++;let f=(time-tt[i])/(tt[i+1]-tt[i]),av=Array.from(v.data.slice(i*v.dim,(i+1)*v.dim)),bv=Array.from(v.data.slice((i+1)*v.dim,(i+2)*v.dim)),n=ch.target.node,path=ch.target.path,val=lerp(av,bv,f,path==='rotation');if(path==='translation')T[n]=val;else if(path==='rotation')Q[n]=val;else if(path==='scale')S[n]=val;}
  let matrices=[];function run(i,p){let n=g.nodes[i],m=n.matrix||trs(T[i],Q[i],S[i]);matrices[i]=mul(p,m);for(let c of n.children||[])run(c,matrices[i]);}for(let i of g.scenes[g.scene||0].nodes)run(i,I());return matrices;
 }
 function duration(action){let a=g.animations?.find(a=>a.name===action);return a?Math.max(...a.samplers.map(s=>{let t=acc(s.input).data;return t[t.length-1];})):2.4;}
 return {g,acc,pose,duration};
}
globalThis.EXP44={parseGLB,mul,trs,ry,rx,tr,I};
if(typeof document!=='undefined'){
 const canvas=document.getElementById('scene'),err=document.getElementById('error'),names=Object.keys(ASSETS),models=names.map(n=>parseGLB(ASSETS[n]));
 let gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl){err.textContent='Ten podgląd wymaga WebGL. Obejrzyj dołączoną planszę i animacje GIF.';throw Error('WebGL unavailable');}
 const shader=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 function program(vs,fs){let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const meshProgram=program('attribute vec3 position;attribute vec3 color;uniform mat4 mvp;varying vec3 C;void main(){C=color;gl_Position=mvp*vec4(position,1.);}','precision mediump float;varying vec3 C;void main(){gl_FragColor=vec4(C,1.);}');
 const post=program('attribute vec2 p;varying vec2 uv;void main(){gl_Position=vec4(p,0.,1.);uv=p*.5+.5;}','precision mediump float;uniform sampler2D tex;uniform vec2 px;varying vec2 uv;void main(){vec4 c=texture2D(tex,uv);float a=c.a;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){a=max(a,texture2D(tex,uv+vec2(float(x),float(y))*px).a);}}vec3 paper=vec3(.878,.855,.796);vec3 ink=vec3(.118,.102,.141);gl_FragColor=vec4(mix(mix(paper,ink,a),c.rgb,c.a),1.);}');
 const meshLoc={p:gl.getAttribLocation(meshProgram,'position'),c:gl.getAttribLocation(meshProgram,'color'),m:gl.getUniformLocation(meshProgram,'mvp')},postLoc={p:gl.getAttribLocation(post,'p'),tex:gl.getUniformLocation(post,'tex'),px:gl.getUniformLocation(post,'px')};
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 let fb=gl.createFramebuffer(),tex=gl.createTexture(),depth=gl.createRenderbuffer(),W=0,H=0;
 const resources=models.map(model=>model.g.meshes.map(mesh=>mesh.primitives.map(prim=>{
  let pos=model.acc(prim.attributes.POSITION),color=model.acc(prim.attributes.COLOR_0),p=pos.data,c=color.data;
  if(prim.indices!==undefined){let idx=model.acc(prim.indices).data;let pp=[],cc=[];for(let i of idx){pp.push(...pos.data.slice(i*3,i*3+3));cc.push(...color.data.slice(i*color.dim,i*color.dim+color.dim));}p=new Float32Array(pp);c=new Float32Array(cc);}
  let buf=gl.createBuffer(),a=new Float32Array(p.length/3*6);for(let i=0;i<p.length/3;i++){a.set(p.slice(i*3,i*3+3),i*6);a.set(c.slice(i*color.dim,i*color.dim+3),i*6+3);}gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);return {buf,count:p.length/3};
 })));
 function resize(w,h){if(w===W&&h===H)return;W=w;H=h;canvas.width=w;canvas.height=h;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Nie można utworzyć bufora obrazu');}
 let action='walk',selection=(typeof matchMedia==='function'&&matchMedia('(max-width:640px)').matches?'mloda_kobieta':'new'),angle=32,pitch=18,auto=false,paused=false,clock=0,last=0,frame=0;
 const actionEl=document.getElementById('action'),modelEl=document.getElementById('model'),angleEl=document.getElementById('angle'),pixelEl=document.getElementById('pixels'),timeEl=document.getElementById('time');
 modelEl.value=selection;
 function selectedModels(){
  const groups={new:['mloda_kobieta','mlody_mezczyzna','chlopiec','dziewczynka_warkocze','starszy_pan','babcia','pies'],residents:["mloda_kobieta", "chlopiec", "pan_z_wasem", "babcia", "mlody_mezczyzna", "dziewczynka_warkocze", "chlopiec_2", "kobieta", "mezczyzna", "starszy_pan", "dziewczynka", "urwis", "starsza_pani", "starszy_pan_kapelusz", "mieszczka"],batch3:['wodnik','wodny_blob','driada','herszt','warg','mosiezny_koziol'],batch2:['chochlik','bandyta','zombiak','upior_krypty'],base:['straznik','szkielet','zombiak','mlody_mezczyzna']};
  return selection==='all'?names.map((_,i)=>i):groups[selection]?groups[selection].map(n=>names.indexOf(n)):[names.indexOf(selection)];
 }
 function label(){
  document.getElementById('degrees').textContent=Math.round(angle)+'°';angleEl.value=angle;
  const title={...{"mloda_kobieta": "Młoda kobieta", "chlopiec": "Chłopiec", "pan_z_wasem": "Pan z wąsem", "babcia": "Babcia", "mlody_mezczyzna": "Młody mężczyzna", "dziewczynka_warkocze": "Dziewczynka z warkoczykami", "chlopiec_2": "Chłopiec II", "kobieta": "Kobieta", "mezczyzna": "Mężczyzna", "starszy_pan": "Starszy pan", "dziewczynka": "Dziewczynka", "urwis": "Urwis", "starsza_pani": "Starsza pani", "starszy_pan_kapelusz": "Starszy pan w kapeluszu", "mieszczka": "Mieszczka", "pies": "Pies"},straznik:'Strażnik chibi / wzorzec',szkielet:'Szkielet',wilk:'Wilk',chochlik:'Chochlik',bandyta:'Bandyta',zombiak:'Zombiak',upior_krypty:'Upiór krypty',wodnik:'Wodnik',wodny_blob:'Wodny blob',driada:'Driada',herszt:'Herszt',warg:'Warg',mosiezny_koziol:'Mosiężny Kozioł'};
  const lines=selectedModels().map(i=>{const n=names[i],m=models[i],tri=m.g.meshes.reduce((sum,x)=>sum+x.primitives.reduce((s,p)=>s+m.g.accessors[p.attributes.POSITION].count/3,0),0);return title[n]+(n==='straznik'?'':' · '+tri);});
  document.getElementById('labels').innerHTML=lines.map(s=>'<span>'+s+'</span>').join('');
 }
 function render(){
  const selected=selectedModels(),moving=['lunge','pounce','charge'].includes(action),large=selected.some(i=>['wodnik','mosiezny_koziol'].includes(names[i])),span=action==='rain'?2.6:moving||action==='death'?3.0:large?2.4:selected.some(i=>names[i]==='upior_krypty')?2.15:1.8,nativeHero=+pixelEl.value,cols=selected.length>4?3:selected.length===4?2:selected.length,rows=Math.ceil(selected.length/cols),height=Math.min(Math.round(nativeHero*span/1.25),Math.floor(3072/rows)),cellWidth=Math.round(height*(selected.length===1?1.24:1.02));
  resize(cellWidth*cols,height*rows);
  const viewport=document.getElementById('viewport');viewport.style.maxWidth=selected.length===1?'640px':'none';const labels=document.getElementById('labels');labels.style.gridTemplateColumns='repeat('+cols+',1fr)';labels.style.gridTemplateRows='repeat('+rows+',1fr)';
  gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,W,H);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(meshProgram);gl.enableVertexAttribArray(meshLoc.p);gl.enableVertexAttribArray(meshLoc.c);
  let maxDuration=0;
  selected.forEach((idx,k)=>{let model=models[idx],d=model.duration(action),time=['death','hit','attack','lunge','throw','scream','cast','slam','bite','pounce','horns','charge','stomp','sit','wave'].includes(action)?Math.min(clock,d):clock%d;maxDuration=Math.max(maxDuration,d);let mats=model.pose(action,time),VP=mul(ortho(span,cellWidth/height),mul(rx(pitch*Math.PI/180),tr(0,-.6,0))),actor=ry(angle*Math.PI/180);gl.viewport((k%cols)*cellWidth,(rows-1-Math.floor(k/cols))*height,cellWidth,height);
   for(let i=0;i<model.g.nodes.length;i++){let node=model.g.nodes[i];if(node.mesh===undefined)continue;let M=mul(VP,mul(actor,mats[i]));for(let r of resources[idx][node.mesh]){gl.bindBuffer(gl.ARRAY_BUFFER,r.buf);gl.vertexAttribPointer(meshLoc.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(meshLoc.c,3,gl.FLOAT,false,24,12);gl.uniformMatrix4fv(meshLoc.m,false,M);gl.drawArrays(gl.TRIANGLES,0,r.count);}}
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.disable(gl.DEPTH_TEST);gl.useProgram(post);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.disableVertexAttribArray(meshLoc.p);gl.disableVertexAttribArray(meshLoc.c);gl.enableVertexAttribArray(postLoc.p);gl.vertexAttribPointer(postLoc.p,2,gl.FLOAT,false,8,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(postLoc.tex,0);gl.uniform2f(postLoc.px,1/W,1/H);gl.drawArrays(gl.TRIANGLES,0,6);
  const shown=['idle','walk','wobble','talk','rain','wag'].includes(action)?clock%maxDuration:Math.min(clock,maxDuration);timeEl.max=maxDuration;timeEl.value=shown;document.getElementById('elapsed').textContent=shown.toFixed(2)+' s';document.getElementById('glError').textContent=gl.getError()===0?'':'Błąd WebGL';
 }
 actionEl.onchange=()=>{action=actionEl.value;clock=0;render();};modelEl.onchange=()=>{selection=modelEl.value;clock=0;label();render();};angleEl.oninput=()=>{angle=+angleEl.value;auto=false;document.getElementById('auto').classList.remove('on');label();render();};pixelEl.onchange=render;
 document.getElementById('view').onchange=e=>{pitch=+e.target.value;render();};
 document.getElementById('auto').onclick=e=>{auto=!auto;e.currentTarget.classList.toggle('on',auto);};document.getElementById('pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'Wznów':'Pauza';};
 document.getElementById('replay').onclick=()=>{clock=0;render();};timeEl.oninput=()=>{clock=+timeEl.value;paused=true;document.getElementById('pause').textContent='Wznów';render();};
 for(let b of document.querySelectorAll('[data-angle]'))b.onclick=()=>{angle=+b.dataset.angle;auto=false;label();render();};
 let pointer=null;canvas.onpointerdown=e=>{pointer=e.clientX;canvas.setPointerCapture(e.pointerId);auto=false;};canvas.onpointermove=e=>{if(pointer===null)return;angle=((angle+(e.clientX-pointer)*.6+540)%360)-180;pointer=e.clientX;label();render();};canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;
 document.addEventListener('visibilitychange',()=>last=0);
 function tick(now){let delta=last?Math.min((now-last)/1000,.06):0;last=now;if(!document.hidden){if(!paused)clock+=delta;if(auto){angle=((angle+delta*20+540)%360)-180;label();}if(!paused||auto||frame===0)render();frame++;}requestAnimationFrame(tick);}
 window.preview44={models,render,setState(s){if(s.action!==undefined){action=s.action;actionEl.value=action;}if(s.angle!==undefined)angle=s.angle;if(s.pitch!==undefined)pitch=s.pitch;if(s.selection!==undefined){selection=s.selection;modelEl.value=selection;}if(s.time!==undefined)clock=s.time;if(s.paused!==undefined)paused=s.paused;label();render();},getState(){return {action,selection,angle,pitch,clock,paused,width:W,height:H};}};
 label();render();requestAnimationFrame(tick);
}
