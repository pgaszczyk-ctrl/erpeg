import { connectorHeight, exposedWalls, massing } from './massing';
import { STYLES } from './catalog';
import { centroid, closest, distance, hash, nearestRoad, overlap, random, rectangleRing, ringArea, roadCollision, rotate } from './geometry';
import { chooseRoof, decideStyle, isLandmark, regionFor } from './style';
import { buildingLevels, buildingWallHeight, cottageOpenings } from './proportions';
import type { Anchor, ArchitectureSource, BuildingPlan, PlanInput, PlanResult, Point, Rectangle, Road } from './types';

export function planArchitecture(input: PlanInput): PlanResult {
  const start = performance.now(), rejected: BuildingPlan[] = [];
  const openings = cottageOpenings(input.character);
  const unique = [...new Map(input.sources.filter(s => s.rings[0]?.length >= 3).map(s => [s.id,s])).values()].sort((a,b) => a.id.localeCompare(b.id));
  const sourceGrid=new Map<string,ArchitectureSource[]>(),roadGrid=new Map<string,Road[]>();
  for(const s of unique){const c=centroid(s.rings[0]),key=`${Math.floor(c[0]/200)},${Math.floor(c[1]/200)}`;const list=sourceGrid.get(key)??[];list.push(s);sourceGrid.set(key,list);}
  for(const r of input.roads)for(let i=0;i+1<r.points.length;i++){
    const a=r.points[i],b=r.points[i+1],seg:Road={id:r.id,width:r.width,points:[a,b]},margin=r.width/2+1;
    for(let x=Math.floor((Math.min(a[0],b[0])-margin)/64);x<=Math.floor((Math.max(a[0],b[0])+margin)/64);x++)for(let y=Math.floor((Math.min(a[1],b[1])-margin)/64);y<=Math.floor((Math.max(a[1],b[1])+margin)/64);y++){
      const key=`${x},${y}`,list=roadGrid.get(key)??[];list.push(seg);roadGrid.set(key,list);
    }
  }
  const all = unique.map(s => {
    const area = Math.abs(ringArea(s.rings[0])), center = centroid(s.rings[0]);
    const nearSources:ArchitectureSource[]=[];
    for(let x=Math.floor(center[0]/200)-1;x<=Math.floor(center[0]/200)+1;x++)for(let y=Math.floor(center[1]/200)-1;y<=Math.floor(center[1]/200)+1;y++)nearSources.push(...(sourceGrid.get(`${x},${y}`)??[]));
    const extent=Math.max(120,...s.rings[0].map(p=>distance(p,center)*input.settings.scale+20)),roadSet=new Set<Road>();
    for(let x=Math.floor((center[0]-extent)/64);x<=Math.floor((center[0]+extent)/64);x++)for(let y=Math.floor((center[1]-extent)/64);y<=Math.floor((center[1]+extent)/64);y++)for(const r of roadGrid.get(`${x},${y}`)??[])roadSet.add(r);
    const localRoads=[...roadSet];
    const decision = decideStyle(s, nearSources, localRoads, input.areas, input.countries[s.id]);
    const style = STYLES[decision.style], region = regionFor(s, input.countries[s.id]);
    const split = massing(s.rings, center), road = nearestRoad(center,localRoads);
    // Undirected road axes are equivalent modulo 90 degrees; never turn a courtyard
    // sideways merely because its nearest path points across its short side.
    const complex=split.rectangles.length>1||split.connectors.length>0;
    const roadAxis=complex?road.angle-Math.round((road.angle-split.angle)/(Math.PI/2))*(Math.PI/2):road.angle;
    const axis = road.distance < 100 ? roadAxis : split.angle;
    const step = input.settings.angleSnap * Math.PI / 180;
    const angle = step ? Math.round(axis / step) * step : axis;
    // One rectangular OSM house stays one house. Split only genuinely irregular wings/courtyards.
    const rectangles: Rectangle[] = split.rectangles.map(r=>({x:r.x*input.settings.scale,y:r.y*input.settings.scale,w:r.w*input.settings.scale,d:r.d*input.settings.scale}));
    const connectors:Rectangle[]=split.connectors.map(r=>({x:r.x*input.settings.scale,y:r.y*input.settings.scale,w:r.w*input.settings.scale,d:r.d*input.settings.scale}));
    // OSM 1–3 / 4–6 / >6 storeys become 1 / 2 / 3 human-sized game storeys.
    const levels = buildingLevels(s.tags['building:levels']);
    const roof = chooseRoof(s, decision, region);
    const pitch = style.roof_pitch * region.pitch_multiplier;
    const roofHeight = roof === 'flat' ? .35 : Math.min(openings.doorHeight*.65,Math.max(1.5,Math.min(...rectangles.map(r=>Math.min(r.w,r.d))) * pitch / 2));
    const wallHeight = buildingWallHeight(openings,levels,style.body_height_in_doors);
    const sub = region.id === 'temperate' || ['industrial','apartments','landmark'].includes(style.id) ? style.subpalette : region.subpalette;
    const pick = (a:number[][], salt:string) => a[Math.floor(random(s.id,salt)*a.length)];
    const b: BuildingPlan = {
      id:s.id, source:s, decision, center,angle,rectangles,connectors,footprints:[],roofFootprints:[],levels,wallHeight,openings:{...openings},roofHeight,roof,
      priority:(isLandmark(s)?1e12:0)+area*Math.max(Number(s.tags['building:levels'])||1,1)*1000+hash(s.id)/4294967296,
      palette:{roof:pick(sub.roof,'roof-color'),wall:pick(sub.wall,'wall-color'),trim:pick(sub.trim,'trim-color')},
      door:[...center],anchors:[],decorations:[],
    };
    if (area < (isLandmark(s)?15:Math.max(25,style.footprint_min)) || !rectangles.length) b.rejected='poniżej minimalnego obrysu';
    if(!b.rejected&&!split.connected)b.rejected='nie można bezpiecznie połączyć skrzydeł';
    const candidates: {center:Point; footprints:Point[][]; roofs:Point[][]}[]=[];
    if (!b.rejected) for (let offset=0;offset<=16;offset+=2) {
      const c:Point=[center[0]+road.normal[0]*offset,center[1]+road.normal[1]*offset];
      const footprints=[...rectangles,...connectors].map(r=>rectangleRing(r,c,angle));
      const roofs=[...rectangles,...connectors].map(r=>rectangleRing(r,c,angle,Math.max(style.overhang,region.overhang)));
      if (!roofs.some(r=>roadCollision(r,localRoads))) candidates.push({center:c,footprints,roofs});
    }
    if (!b.rejected && !candidates.length) b.rejected='kolizja z drogą po przesunięciu 0–16 m';
    return { b,candidates };
  });
  const order = [...all].sort((a,b)=>b.b.priority-a.b.priority || a.b.id.localeCompare(b.b.id));
  // Reserve every road-valid candidate of a higher-priority neighbour. Conservative, but local,
  // load-order independent, and safe when its final candidate moves away from a third building.
  const reservations = new Map<string,Point[][]>();
  const cell=64;
  const cells=(rings:Point[][]) => {
    const p=rings.flat(), xs=p.map(p=>p[0]),ys=p.map(p=>p[1]); const result:string[]=[];
    for(let x=Math.floor(Math.min(...xs)/cell);x<=Math.floor(Math.max(...xs)/cell);x++)for(let y=Math.floor(Math.min(...ys)/cell);y<=Math.floor(Math.max(...ys)/cell);y++)result.push(`${x},${y}`);
    return result;
  };
  const buildings: BuildingPlan[]=[];
  for (const {b,candidates} of order) {
    if (b.rejected) {rejected.push(b);continue;}
    const valid=candidates.find(c=> {
      const neighbours=new Set(cells(c.roofs).flatMap(k=>reservations.get(k)??[]));
      return !c.roofs.some(r=>[...neighbours].some(q=>overlap(r,q)));
    });
    // Even discarded candidates reserve their envelope: a result never depends on an omitted
    // higher-priority neighbour outside the requested chunk's output ownership.
    for(const candidate of candidates)for(const ring of candidate.roofs)for(const key of cells([ring])) {
      const group=reservations.get(key)??[];group.push(ring);reservations.set(key,group);
    }
    if(!valid){b.rejected='sąsiad o wyższym priorytecie';rejected.push(b);continue;}
    Object.assign(b,{center:valid.center,footprints:valid.footprints,roofFootprints:valid.roofs});
    let best=Infinity;
    const street=nearestRoad(b.center,input.roads).point;
    const volumes=[...b.rectangles.map(r=>({r,height:b.wallHeight})),...b.connectors.map(r=>({r,height:connectorHeight(b.wallHeight,b.openings.doorHeight)}))];
    for(const segment of exposedWalls(volumes)){
      if(segment.base>0)continue;
      const wa=rotate(segment.a,b.angle),wb=rotate(segment.b,b.angle);
      const a:Point=[wa[0]+b.center[0],wa[1]+b.center[1]],end:Point=[wb[0]+b.center[0],wb[1]+b.center[1]];
      const length=distance(a,end),margin=b.openings.doorWidth/2+.35;
      if(length<margin*2)continue;
      const q=closest(street,a,end),along=Math.max(margin,Math.min(length-margin,distance(a,q)));
      const p:Point=[a[0]+(end[0]-a[0])*along/length,a[1]+(end[1]-a[1])*along/length];
      const d=distance(p,street);
      if(d<best){b.door=p;best=d;}
    }
    if(!Number.isFinite(best)){b.rejected='brak ściany na wejście wielkości postaci';rejected.push(b);continue;}
    for(const r of b.rectangles){
      const ridge=rotate([r.x+r.w/2,r.y+r.d/2],b.angle);
      const wall=rotate([r.x+r.w/2,r.y+r.d],b.angle);
      const normal=rotate([0,1],b.angle);
      b.anchors.push({kind:'ridge',position:[ridge[0],ridge[1],b.wallHeight+b.roofHeight],normal:[0,0,1],clearance:Math.min(r.w,r.d)});
      b.anchors.push({kind:'wall',position:[wall[0],wall[1],b.wallHeight*.55],normal:[normal[0],normal[1],0],clearance:r.w});
      b.anchors.push({kind:'chimney',position:[ridge[0]+1,ridge[1],b.wallHeight+b.roofHeight+.8],normal:[0,0,1],clearance:Math.min(r.w,r.d)});
    }
    const style=STYLES[b.decision.style];
    const phase=hash(b.decision.zone)%3;
    // Spatial triples cap non-industrial density independently of loading order.
    if(input.settings.decorations && style.allowed_decorations.length && (b.decision.style==='industrial'||hash(b.id)%3===phase)){
      const kind=style.allowed_decorations[Math.floor(random(b.id,'decoration')*style.allowed_decorations.length)];
      const anchorKind=kind==='valve'?'wall':kind==='chimney'?'chimney':'ridge';
      const anchor=b.anchors.find(a=>a.kind===anchorKind&&a.clearance>=4);
      if(anchor)b.decorations.push({kind,variant:hash(`${b.id}:variant`)%3,anchor,frame:0});
    }
    buildings.push(b);
  }
  // Strict one-in-three cap per zone after explicit style exceptions. Hash ordering is stable.
  const zones=new Map<string,BuildingPlan[]>();
  for(const b of buildings)if(b.decision.style!=='industrial'){const list=zones.get(b.decision.zone)??[];list.push(b);zones.set(b.decision.zone,list);}
  for(const list of zones.values()){
    const contextual=list.filter(b=>b.decision.source!=='tag OSM');
    if(contextual.length){
      const counts=new Map<string,number>();
      for(const b of contextual){const id=b.decision.rule.match(/dominant=([\w-]+)/)?.[1]??b.decision.style;counts.set(id,(counts.get(id)??0)+1);}
      const dominant=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0] as BuildingPlan['decision']['style'];
      const needed=Math.max(0,Math.ceil(contextual.length*.7)-contextual.filter(b=>b.decision.style===dominant).length);
      const adjust=contextual.filter(b=>b.decision.style!==dominant).sort((a,b)=>hash(a.id)-hash(b.id)).slice(0,needed);
      for(const b of adjust){
        b.decision={...b.decision,style:dominant,rule:`${b.decision.rule}; street coherence >= 70%`};
        const style=STYLES[dominant],region=regionFor(b.source,input.countries[b.id]);
        b.roof=chooseRoof(b.source,b.decision,region);
        b.roofHeight=b.roof==='flat'?.35:Math.min(b.openings.doorHeight*.65,Math.max(1.5,Math.min(...b.rectangles.map(r=>Math.min(r.w,r.d)))*style.roof_pitch*region.pitch_multiplier/2));
        b.wallHeight=buildingWallHeight(b.openings,b.levels,style.body_height_in_doors);
        const palette=region.id==='temperate'?style.subpalette:region.subpalette;
        const pick=(a:number[][],salt:string)=>a[Math.floor(random(b.id,salt)*a.length)];
        b.palette={roof:pick(palette.roof,'roof-color'),wall:pick(palette.wall,'wall-color'),trim:pick(palette.trim,'trim-color')};
        for(const a of b.anchors)a.position[2]=a.kind==='wall'?b.wallHeight*.55:b.wallHeight+b.roofHeight+(a.kind==='chimney'?.8:0);
        b.decorations=b.decorations.filter(d=>style.allowed_decorations.includes(d.kind));
      }
    }
    const decorated=list.filter(b=>b.decorations.length).sort((a,b)=>hash(a.id)-hash(b.id));
    for(const b of decorated.slice(Math.floor(list.length/3)))b.decorations=[];
  }
  return {buildings:buildings.sort((a,b)=>a.id.localeCompare(b.id)),rejected,milliseconds:performance.now()-start};
}
export { blockedByPlans } from './collision';
export function entranceOutside(b:BuildingPlan):Point {
  const dx=b.door[0]-b.center[0],dy=b.door[1]-b.center[1],len=Math.hypot(dx,dy)||1;
  return [b.door[0]+dx/len*2,b.door[1]+dy/len*2];
}
export function localAnchor(b:BuildingPlan,a:Anchor):[number,number,number]{return [b.center[0]+a.position[0],b.center[1]+a.position[1],a.position[2]];}
