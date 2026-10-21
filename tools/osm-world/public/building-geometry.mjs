export const cellId=p=>p.join(',');
export function moduleBoxes(m){return m.parts?.map(p=>p.box)||[[m.pos[0]-m.w/2,m.pos[1]-m.d/2,m.pos[0]+m.w/2,m.pos[1]+m.d/2]];}
export function maskCells(template,origin){return template.mask.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'?[[origin[0]+x,origin[1]+y]]:[]));}
export function createModule(template,origin,{id,sourceIds=[],kind='dom',palette=0,style='mechanical',joinedSides=[]}={}){
 const cells=maskCells(template,origin),set=new Set(cells.map(cellId)),width=template.mask[0].length,depth=template.mask.length;
 const parts=cells.map(([x,y])=>{
  const west=!set.has(cellId([x-1,y]))&&!(x===origin[0]&&joinedSides.includes('west'));
  const east=!set.has(cellId([x+1,y]))&&!(x===origin[0]+width-1&&joinedSides.includes('east'));
  const north=!set.has(cellId([x,y-1]))&&!(y===origin[1]&&joinedSides.includes('north'));
  const south=!set.has(cellId([x,y+1]))&&!(y===origin[1]+depth-1&&joinedSides.includes('south'));
  return {cell:[x,y],box:[x+(west?.15:0),y+(north?.15:0),x+1-(east?.15:0),y+1-(south?.15:0)],walls:{west,east,north,south}};
 });
 const blocks=[...new Set(cells.map(p=>p.map(v=>Math.floor(v/3)).join(',')))].sort();
 return {id:id||`module:${origin.join(',')}:${template.id}`,shapeId:template.id,cells,parts,pos:[origin[0]+width/2,origin[1]+depth/2],w:width-.3,d:depth-.3,height:template.height,sourceIds,kind,palette,style,block:blocks[0],blocks,joinIds:[],joinedSides,reason:`Maska ${template.id}; wspólna rezerwacja ${blocks.length} bloczków`};
}
export function createRow(template,origin,count,{id='row',sourceIds=[],palette=0,style='mechanical',segmentTemplates=null}={}){
 const horizontal=template.sockets.some(s=>s.side==='east'),stride=template.mask[0].length,pieces=[];
 let offset=0;
 for(let i=0;i<count;i++){
  const current=segmentTemplates?.[i]||template;
  if(i>0){const previous=segmentTemplates?.[i-1]||template;const a=previous.sockets?.find(s=>s.side===(horizontal?'east':'south')),b=current.sockets?.find(s=>s.side===(horizontal?'west':'north'));if(!a||!b||a.profile!==b.profile||a.eaves!==b.eaves||JSON.stringify(a.span)!==JSON.stringify(b.span))throw Error('Incompatible party-wall sockets');}
  const joinedSides=[];if(i>0)joinedSides.push(horizontal?'west':'north');if(i<count-1)joinedSides.push(horizontal?'east':'south');
  const p=createModule(current,[origin[0]+(horizontal?offset:0),origin[1]+(horizontal?0:offset)],{id:`${id}:segment:${i}`,sourceIds,kind:'szereg',palette:(palette+i*3)%10,style,joinedSides});
  p.rowId=id;p.rowRole=i===0?'start':i===count-1?'end':'middle';p.variant=i%3;pieces.push(p);offset+=horizontal?current.mask[0].length:current.mask.length;
 }
 const joins=[];for(let i=1;i<count;i++){
  const prior=pieces[i-1],at=horizontal?Math.max(...prior.cells.map(p=>p[0]))+1:Math.max(...prior.cells.map(p=>p[1]))+1;
  const edge=horizontal?[[at,origin[1]+.15],[at,origin[1]+template.mask.length-.15]]:[[origin[0]+.15,at],[origin[0]+template.mask[0].length-.15,at]];
  const join={id:`${id}:join:${i-1}`,a:pieces[i-1].id,b:pieces[i].id,edge,profile:'flat-parapet-v1',eaves:template.height,style};
  joins.push(join);pieces[i-1].joinIds.push(join.id);pieces[i].joinIds.push(join.id);
 }
 return {id,modules:pieces,joins};
}
export function validateKit(kit){
 const ids=new Set();for(const t of kit.templates){
  if(ids.has(t.id))throw Error('Duplicate building template');ids.add(t.id);
  if(!t.mask?.length||!t.mask[0].length||t.mask.some(r=>r.length!==t.mask[0].length||/[^#.]/.test(r)))throw Error('Invalid building mask');
  const cells=maskCells(t,[0,0]),set=new Set(cells.map(cellId));if(!cells.length)throw Error('Empty building mask');
  const seen=new Set([cellId(cells[0])]),queue=[cells[0]];for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[queue[i][0]+dx,queue[i][1]+dy],k=cellId(p);if(set.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}
  if(seen.size!==cells.length)throw Error('Disconnected building mask');
  for(const s of t.sockets||[]){const horizontal=['north','south'].includes(s.side),length=horizontal?t.mask[0].length:t.mask.length;
   if(!['north','south','east','west'].includes(s.side)||!s.profile||s.eaves!==t.height||s.span[0]<0||s.span[1]>length||s.span[0]>=s.span[1])throw Error('Invalid party-wall socket');
   for(let i=Math.floor(s.span[0]);i<Math.ceil(s.span[1]);i++){const p=horizontal?[i,s.side==='north'?0:t.mask.length-1]:[s.side==='west'?0:t.mask[0].length-1,i];if(!set.has(cellId(p)))throw Error('Socket has no supporting wall');}
  }
 }
 for(const a of kit.assets||[]){if(!ids.has(a.shape_id)||!/^assets\/[a-zA-Z0-9_./-]+$/.test(a.asset_file)||a.asset_file.includes('..')||!a.canvas_px?.every(n=>n>0)||!a.anchor_px?.every(n=>Number.isFinite(n))||!a.style)throw Error('Invalid building artwork registration');}
 return true;
}
