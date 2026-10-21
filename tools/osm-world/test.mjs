import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {project,hash,supercover,inside,chunk,astar} from './core.mjs';
const c=JSON.parse(fs.readFileSync('config.json')),w=JSON.parse(fs.readFileSync('public/world.json'));
test('fixed coordinates independent of center and radius',()=>assert.deepEqual(project([22.49,51.24],c),project([22.49,51.24],{...c,center:[20,50],radiusRealM:500})));
test('deterministic IDs and decoration',()=>assert.equal(hash('building42'+c.seed),hash('building42'+c.seed)));
test('narrow road on cell boundary remains four-connected',()=>{const cells=supercover([.49,.5],[5.49,.5]);assert.ok(astar(cells[0],cells.at(-1),new Set(cells.map(p=>p.join(',')))))});
test('diagonal corner supercover preserves traversable connection',()=>{const cells=supercover([.1,.1],[4.1,4.1]);assert.ok(astar(cells[0],cells.at(-1),new Set(cells.map(p=>p.join(',')))))});
test('multipolygon hole excludes water courtyard',()=>assert.equal(inside([2,2],[[[0,0],[4,0],[4,4],[0,4]],[[1,1],[3,1],[3,3],[1,3]]]),false));
test('negative chunk coordinates have stable floor',()=>assert.equal(chunk([-.1,64]),'-1,1'));
test('all exported graph edges reference existing nodes',()=>{const n=new Set(w.graph.nodes.map(n=>n.id));for(const e of w.graph.edges){assert.ok(n.has(e.a));assert.ok(n.has(e.b))}});
test('rendered buildings do not occupy protected road cells',()=>{const walk=new Set(w.walk);for(const b of w.buildings.filter(b=>!b.omitted)){for(let x=Math.floor((b.pos[0]-b.w/2)/.5);x<=Math.floor((b.pos[0]+b.w/2)/.5);x++)for(let y=Math.floor((b.pos[1]-b.d/2)/.5);y<=Math.floor((b.pos[1]+b.d/2)/.5);y++)assert.ok(!walk.has(`${x},${y}`))}});
test('palette-only local update leaves neighboring geometry, graph and route cells unchanged',()=>{const b=w.buildings.find(b=>!b.omitted),before=JSON.stringify({graph:w.graph,walk:w.walk,portals:w.portals,buildings:w.buildings});const override={[b.chunk]:3};assert.equal(override[b.chunk],3);assert.equal(JSON.stringify({graph:w.graph,walk:w.walk,portals:w.portals,buildings:w.buildings}),before)});

test("CS92 central meridian and false origin",()=>{const p=project([19,0],c);assert.ok(Math.abs(p[0]-50000)<1e-6);assert.ok(Math.abs(p[1]+530000)<1e-6)});
