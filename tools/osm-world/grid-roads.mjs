export function gridRoads(corridors,step=.25){
 const cells=new Map();
 for(const s of corridors.surfaces){if(!s.id.startsWith('ribbon:'))continue;const p=s.polygon,a=[(p[0][0]+p[3][0])/2,(p[0][1]+p[3][1])/2],b=[(p[1][0]+p[2][0])/2,(p[1][1]+p[2][1])/2],lanes=s.kind==='path'?1:2,major=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?0:1;
 const lo=Math.floor(Math.min(a[major],b[major])/step),hi=Math.floor(Math.max(a[major],b[major])/step);
 for(let i=lo;i<=hi;i++){const t=Math.max(0,Math.min(1,((i+.5)*step-a[major])/(b[major]-a[major]||1))),other=a[1-major]+(b[1-major]-a[1-major])*t,base=Math.floor(other/step-(lanes-1)/2);
 for(let n=0;n<lanes;n++){const [x,y]=major===0?[i,base+n]:[base+n,i],key=x+','+y;let c=cells.get(key);if(!c){c={id:'grid:'+key,kind:s.kind,color:s.kind==='path'?'#c5b48e':'#ddca9e',sources:[],lanes,polygon:[[x*step,y*step],[(x+1)*step,y*step],[(x+1)*step,(y+1)*step],[x*step,(y+1)*step]]};cells.set(key,c);}if(!c.sources.includes(s.sourceId))c.sources.push(s.sourceId);if(lanes>c.lanes){c.lanes=lanes;c.kind=s.kind;c.color='#ddca9e';}}
 }}
 return {version:'grid-road-lanes-v1',gridStepGameM:step,widthRule:'path=1 lane, street=2 lanes; junctions may be wider',surfaces:[...cells.values()],profiles:corridors.profiles,aliases:corridors.aliases};
}
