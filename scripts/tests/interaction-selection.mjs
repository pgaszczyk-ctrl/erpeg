import { build } from 'vite';
import assert from 'node:assert/strict';
await build({configFile:false,logLevel:'warn',build:{outDir:'.cache/interaction-tests',lib:{entry:'src/interaction.ts',formats:['es'],fileName:()=> 'interaction.mjs'}}});
const { InteractionSelection, interactionSpot }=await import('../../.cache/interaction-tests/interaction.mjs');
const target=(id,x,y)=>({id,x,y,kind:'talk',label:id,run(){}});
const a=target('a',-15,0), b=target('b',15,0), selection=new InteractionSelection();
assert.equal(selection.update([a,b],-1,0,36).id,'a');
for(let i=0;i<100;i++)assert.equal(selection.update([a,b],Math.sin(i)*2,0,36).id,'a','jitter must not switch');
assert.equal(selection.update([a,b],14,0,36).id,'b','a deliberate approach switches');
selection.pick(a);assert.equal(selection.update([a,b],14,0,36).id,'a','explicit pick overrides nearest');
assert.equal(selection.update([a,b],24,0,36).id,'b','out-of-range explicit target releases');
assert.equal(selection.update([],24,0,36),null,'removed target clears');
for(const k of [1,.8,.5]) {
 const doors=[{x:0,y:0},{x:0,y:30}],people=[];
 for(let i=0;i<8;i++) {
  const p=interactionSpot(doors[0],people,doors,(x,y)=>x>-90&&x<90&&y>-120&&y<120,k);
  assert(p,'a free spot exists');
  assert(people.every(q=>Math.hypot((p.x-q.x)/30,(p.y-q.y)*k/40)>=1),'screen body spacing');
  assert(doors.every(q=>Math.hypot((p.x-q.x)/28,(p.y-q.y)*k/34)>=1),'door clearance');people.push(p);
 }
}
assert.equal(interactionSpot({x:0,y:0},[],[],()=>false,1),null,'blocked ground is never used');
assert.equal(interactionSpot({x:0,y:0},[],[],()=>true,1,()=>false),null,'disconnected ground is never used');
console.log('PASS stable selection, explicit selection, reach, removal, camera-aware spacing, blocked ground');
