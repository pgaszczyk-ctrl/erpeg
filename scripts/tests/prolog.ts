import assert from 'node:assert/strict';
import { freshProlog, mayStart, advance, claimOnce, recordKill, PROLOG_ID } from '../../src/prolog/state';
import { equipStoryItem, collectStoryItems } from '../../src/prolog/rewards';
import type { Gear } from '../../src/inventory';
import { localRoutes, planAnchors, PROLOG_MARSZ_M, PROLOG_PROMIEN_M } from '../../src/prolog/planner';
import { CityMap, PX_PER_M } from '../../src/map/CityMap';
import { planLochu, podloga } from '../../src/loch/plan';
import { mapaLochu, idLochu, czytajIdLochu } from '../../src/loch/mapa';
const p = freshProlog();
assert(mayStart(undefined, undefined));
for (const state of ['new','active','goal','done']) assert(!mayStart(undefined,state), `global ${state} prevents restart in any city`);
assert(!mayStart(p,undefined));
p.originMapId='city-a';p.originName='City A';
assert(advance(p,'intro','letter_deliver'));
assert(!advance(p,'intro','letter_deliver'));
let rewards=0;
assert(claimOnce(p,'bow_received',()=>{rewards++;}));
const reloaded=JSON.parse(JSON.stringify(p));
assert(!claimOnce(reloaded,'bow_received',()=>{rewards++;}));
assert.equal(rewards,1);
assert(!mayStart(reloaded,undefined),'travel to another city does not enroll the same character');
assert.equal(reloaded.originMapId,'city-a');
for(let i=0;i<2;i++){assert(recordKill(p,'rescue',i,2));assert(!recordKill(p,'rescue',i,2));}
assert(!recordKill(p,'rescue',5,2));
p.dungeon={id:'instance',seed:123,killed:[],chest:false};
assert(recordKill(p,'dungeon',0,3));
assert.equal(JSON.parse(JSON.stringify(p)).dungeon.killed.length,1);
p.stage='library_visit';assert(advance(p,'library_visit','completed'));
assert(!mayStart(JSON.parse(JSON.stringify(p)),'done'));
assert(!advance(p,'completed','intro'));
assert(!mayStart({...p,status:'skipped'},undefined));
// Actual collision flood-fill: target across a solid wall is unreachable. A gap is traversed by a detour.
const wall={isFree:(x:number,y:number)=>Math.abs(x-60)>4 || y>105};
const routes=localRoutes(wall as never,{x:0,y:0},220,10);
assert(routes.route({x:100,y:0})!.distance>250);
const closed=localRoutes({isFree:(x:number)=>Math.abs(x-60)>4} as never,{x:0,y:0},220,10);
assert.equal(closed.route({x:100,y:0}),null);
const ring=[0,0,3000,0,0,3000,-3000,0];
const make=(id:string,lon:number)=>new CityMap({unitsPerM:PX_PER_M,w:3000/PX_PER_M,h:3000/PX_PER_M,bounds:{minLat:50,maxLat:50.1,minLon:lon,maxLon:lon+.1},boundary:[ring],areas:[['paved',ring]],lines:[],buildings:[],pois:[]},id);
for(const city of [make('city-a',20),make('city-b',29)]){
 const home={x:1500,y:1500};const result=planAnchors(city,home,[],city.id);
 assert(result.anchors.outpost.fallback&&result.anchors.library.fallback&&result.anchors.dungeonEntrance.fallback);
 const local=localRoutes(city,home,PROLOG_PROMIEN_M*PX_PER_M,10*PX_PER_M,26000);
 for(const a of Object.values(result.anchors)){const at=city.fromLatLon(a.lat,a.lon);assert(local.route(at),`reachable ${a.id}`);}
 assert(result.walkM<8000,'bounded tutorial travel');
 // Owner 30 Oct 2026: ~20 s of walking between the characters, not a few steps.
 const pts=(['outpost','ambush','dungeonEntrance','library'] as const).map(k=>city.fromLatLon(result.anchors[k].lat,result.anchors[k].lon));
 for(const q of pts)assert(local.route(q)!.distance>=PROLOG_MARSZ_M*PX_PER_M*0.99,'far from the senior guard');
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)assert(Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y)>150*PX_PER_M,'spread apart');
 const out=city.fromLatLon(result.anchors.outpost.lat,result.anchors.outpost.lon),amb=city.fromLatLon(result.anchors.ambush.lat,result.anchors.ambush.lon);
 const dot=((out.x-home.x)*(amb.x-home.x)+(out.y-home.y)*(amb.y-home.y))/(Math.hypot(out.x-home.x,out.y-home.y)*Math.hypot(amb.x-home.x,amb.y-home.y));
 assert(dot<-.5,'rescue on the opposite side where reachable');
}
// Enrollment at a police door must send the letter somewhere else, not straight back to that door.
const atPost=make('at-post',20),home={x:1500,y:1500};
atPost.places.push({kind:'police',id:'current',name:'Current post',building:null,door:home});
atPost.places.push({kind:'police',id:'other',name:'Other post',building:null,door:{x:home.x+450*PX_PER_M,y:home.y}});
assert.equal(planAnchors(atPost,home,[],atPost.id).anchors.outpost.id,'other');
atPost.places.pop();
const fallback=planAnchors(atPost,home,[],atPost.id).anchors.outpost;
assert(fallback.fallback && fallback.id!=='current','a distinct patrol point when no second post is nearby');
for(let seed=1;seed<=100;seed++){
 const plan=planLochu('podziemia',seed,true);assert(plan.tutorial);assert.equal(plan.komnaty.length,4);
 const seen=new Set([plan.start.y*plan.w+plan.start.x]),q=[[plan.start.x,plan.start.y]];
 for(let i=0;i<q.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=q[i][0]+dx,y=q[i][1]+dy,k=y*plan.w+x;if(podloga(plan,x,y)&&!seen.has(k)){seen.add(k);q.push([x,y]);}}
 assert(seen.has(plan.skrzynia.y*plan.w+plan.skrzynia.x),'treasure reachable');
}
// Full-bag swaps preserve both previous items; reload + partial collection cannot duplicate or lose them.
const rewardState=freshProlog();
const full={equip:{bron:'old_sword',helm:'old_hat'},bag:Array.from({length:20},()=>({item:'old_sword'}))} as Gear;
equipStoryItem(rewardState,full,'wand','bron',20);equipStoryItem(rewardState,full,'hat','helm',20);
assert.deepEqual(rewardState.pendingRewards,['old_sword','old_hat']);
assert.equal(full.bag.length,20);assert.equal(full.equip.bron,'wand');
const rState=JSON.parse(JSON.stringify(rewardState)),rGear=JSON.parse(JSON.stringify(full));
collectStoryItems(rState,rGear,20);assert.equal(rState.pendingRewards.length,2);
rGear.bag.pop();collectStoryItems(rState,rGear,20);assert.deepEqual(rState.pendingRewards,['old_hat']);
rGear.bag.pop();collectStoryItems(rState,rGear,20);assert.deepEqual(rState.pendingRewards,[]);
assert.equal(rGear.equip.bron,'wand');
const id=idLochu({rodzaj:'podziemia',seed:43,lat:51.2,lon:22.5,tutorial:true});
assert(czytajIdLochu(id)?.tutorial);assert(mapaLochu(id).loch?.tutorial);
assert(!czytajIdLochu('loch:podziemia:43:51.2:22.5')?.tutorial);
assert.equal(PROLOG_ID,'prolog.recruit.v1');
console.log('Prolog: global eligibility/rewards/reload, bounded routes, 2 cities, 100 connected tutorial dungeons OK');
