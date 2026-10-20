export const ROWS={front:0,left:1,back:2};
export const CYCLE=[0,1,2,1];
export const DURATIONS=[180,110,180,110];
export const MASK_ROLES={primary:[255,0,0],secondary:[0,255,0],skin:[0,0,255],hair:[255,255,0]};

export function frameAt(timeMs){
 let t=((timeMs%580)+580)%580;
 for(let i=0;i<DURATIONS.length;i++){if(t<DURATIONS[i])return CYCLE[i];t-=DURATIONS[i];}
 return 1;
}

export function placement(head,body,direction,column=1){
 const sourceDirection=direction==='right'?'left':direction;
 const h=head.directions[sourceDirection],b=body.directions[sourceDirection];
 if(!h||!b)throw new Error('Missing direction');
 const hf=h.frames[column],bf=b.frames[column];
 const exactX=bf.neck.x-hf.head_mount.x,exactY=bf.neck.y-hf.head_mount.y;
 return {dx:Math.round(exactX),dy:Math.round(exactY),mirror:direction==='right',row:ROWS[sourceDirection],column,headMount:hf.head_mount,neck:bf.neck,roundingError:{x:Math.round(exactX)-exactX,y:Math.round(exactY)-exactY}};
}

export function drawModularFrame(ctx,headImage,bodyImage,head,body,direction,column=1,origin={x:16,y:16}){
 const p=placement(head,body,direction,column);ctx.save();ctx.imageSmoothingEnabled=false;
 if(p.mirror){ctx.translate(origin.x+64,origin.y);ctx.scale(-1,1);}else ctx.translate(origin.x,origin.y);
 ctx.drawImage(bodyImage,0,0);ctx.drawImage(headImage,p.dx,p.dy);ctx.restore();return p;
}

export function measureRoleReferences(base,mask){
 const out={};
 for(const [role,rgb] of Object.entries(MASK_ROLES)){
  const values=[];
  for(let i=0;i<mask.length;i+=4)if(mask[i+3]&&mask[i]===rgb[0]&&mask[i+1]===rgb[1]&&mask[i+2]===rgb[2])values.push(Math.max(base[i],base[i+1],base[i+2]));
  values.sort((a,b)=>a-b);out[role]=values.length?Math.max(13,values[Math.floor((values.length-1)*.9)]):255;
 }
 return out;
}

/** Normalize material shading before applying a color: black hair can become
 * blonde, and an originally dark face can use a light skin preset.
 * Unmasked pixels and original alpha are preserved byte-for-byte.
 */
export function recolorRGBA(base,mask,palette,references=measureRoleReferences(base,mask)){
 const out=new Uint8ClampedArray(base);
 for(const [role,rgb] of Object.entries(MASK_ROLES)){
  const target=palette[role];if(!target)continue;
  for(let i=0;i<mask.length;i+=4){
   if(!base[i+3]||!mask[i+3]||mask[i]!==rgb[0]||mask[i+1]!==rgb[1]||mask[i+2]!==rgb[2])continue;
   const shade=Math.min(1.08,Math.max(.35,Math.max(base[i],base[i+1],base[i+2])/references[role]));
   for(let c=0;c<3;c++)out[i+c]=Math.min(255,Math.round(target[c]*shade));
  }
 }
 return out;
}
