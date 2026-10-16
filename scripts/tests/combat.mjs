import assert from 'node:assert/strict';
import { route, clearSegment, pathLength, incoming, roll } from '../../src/combat/rules.ts';
import { ruchyPoziomu, kosztRuchow, SPOTKANIA as C } from '../../src/content/spotkania.ts';

assert.equal(ruchyPoziomu(1),3);
assert.equal(ruchyPoziomu(5),4);
assert.equal(ruchyPoziomu(20),5);
assert.deepEqual([1,2,5,12,22].map(n=>kosztRuchow(n)),['1 ruch','2 ruchy','5 ruchów','12 ruchów','22 ruchy']);
const wall=(x,y)=>!(x>=8&&x<=12&&y>=-8&&y<=8);
assert.equal(clearSegment({x:0,y:0},{x:20,y:0},wall),false);
assert.equal(route({x:0,y:0},{x:20,y:0},22,wall),null,'A detour costs its actual length');
const path=route({x:0,y:0},{x:20,y:0},40,wall);
assert(path && pathLength(path)>20 && pathLength(path)<=40,'Find a real detour');
for(let i=1;i<path.length;i++)assert(clearSegment(path[i-1],path[i],wall),'No segment cuts the wall');
assert.equal(route({x:0,y:0},{x:100,y:0},20,()=>true),null,'Out of range');
assert.equal(route({x:0,y:0},{x:10,y:0},20,()=>false),null,'Blocked destination');
const water=(x,y)=>Math.abs(x-10)>2 || y>15;
assert.equal(route({x:0,y:0},{x:20,y:0},25,water),null,'Water has no free straight crossing');
let calls=0;
assert.equal(incoming(()=>{calls++;return 0;},.08,1),'unik');
assert.equal(calls,1,'Dodge excludes block on the same hit');
assert.equal(incoming(()=>.5,0,1),'blok');
const a={rng:123},b={rng:123};
for(let i=0;i<20;i++)assert.equal(roll(a),roll(b),'Persisted random state reproduces rolls');
const checkpoint=structuredClone(a),next=roll(a);
assert.equal(roll(checkpoint),next,'A resumed turn continues the sequence');
// The full starting group cannot kill a healthy age-appropriate hero in one ordinary reply.
for(const health of [4,6,10]) for(const difficulty of [0.3,0.5,0.7,1]) {
  assert(C.aktywnych*C.obrazeniaWroga*difficulty<health);
}
console.log('OK: moves, route budget, walls/water, mutually exclusive luck, resumed randomness, first-reply damage');
