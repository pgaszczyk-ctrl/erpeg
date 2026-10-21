import {inside} from './core.mjs';
export function cleanIslands(roadCells,modules,box,protectedRings=[],maxArea=3){
 const roads=new Set(roadCells.map(c=>c.xy.join(','))),occupied=new Set(modules.flatMap(m=>m.cells.map(p=>p.join(',')))),visited=new Set(),paving=[],retained=[];
 for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
  const key=[x,y].join(',');if(visited.has(key)||roads.has(key))continue;
  const component=[[x,y]];visited.add(key);let boundary=false,hasBuilding=false,protectedLand=false;
  for(let i=0;i<component.length;i++){const p=component[i],k=p.join(',');if(occupied.has(k))hasBuilding=true;if(component.length<=maxArea&&protectedRings.some(r=>inside(p.map(v=>v+.5),r)))protectedLand=true;
   if(p[0]===box[0]||p[1]===box[1]||p[0]===box[2]-1||p[1]===box[3]-1)boundary=true;
   for(const q of [[p[0]+1,p[1]],[p[0]-1,p[1]],[p[0],p[1]+1],[p[0],p[1]-1]]){const id=q.join(',');if(q[0]<box[0]||q[1]<box[1]||q[0]>=box[2]||q[1]>=box[3]||roads.has(id)||visited.has(id))continue;visited.add(id);component.push(q);}
  }
  if(component.length<=maxArea&&!boundary){if(!hasBuilding&&!protectedLand)paving.push(...component);else retained.push({cells:component,reason:hasBuilding?'podwórko budynku':'teren chroniony w źródle'});}
 }
 return {paving,retained,maxAreaCells:maxArea,reason:'Małe puste resztki wewnątrz nawierzchni; nie dodają dróg do grafu OSM'};
}
