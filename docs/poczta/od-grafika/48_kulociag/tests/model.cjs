const assert=require('node:assert/strict');require('../src/kulociag.js');const {Lane}=globalThis.Kulociag;
const log=[];const lane=new Lane(0,1028,e=>log.push(e.type));
assert(lane.depart('player'));lane.update(10);assert.equal(lane.phase,'hold');assert.equal(lane.pose().y,603);lane.update(100);assert.equal(lane.phase,'hold');
lane.setReady();lane.update(0);assert.equal(lane.phase,'release');lane.update(.025);const y1=lane.pose().y;lane.update(.025);const y2=lane.pose().y;
assert(Math.abs((603-y1)-(y1-y2))<.001,'Shot starts at full constant velocity');assert(603-y1>90);lane.update(.7);assert.equal(lane.phase,'empty');
assert(lane.arrive('traveler'));lane.update(1.6);assert.equal(lane.phase,'brake');assert.equal(lane.pose().y,530);lane.update(.8);assert.equal(lane.phase,'settle');assert.equal(lane.pose().y,590);lane.update(.9);assert.equal(lane.phase,'exit');lane.update(.7);assert.equal(lane.phase,'idle');assert.equal(lane.passenger,null);
const a=new Lane(0,0),b=new Lane(1,0);a.depart('p',{ready:true});b.depart('p',{ready:true});a.update(2.12);for(let i=0;i<212;i++)b.update(.01);assert.equal(a.phase,b.phase);assert(Math.abs(a.pose().y-b.pose().y)<.001);
const c=new Lane(2,0);assert(c.depart('p'));assert(!c.depart('other'));assert(c.cancel());assert.equal(c.phase,'idle');assert.throws(()=>c.update(-1));assert.throws(()=>c.update(Infinity));
console.log('PASS: loading gate, impulse velocity, arrival/brake, exit, frame-rate independence, cancellation, busy lane, invalid dt.');
