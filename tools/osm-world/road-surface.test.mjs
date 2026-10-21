import {moduleBoxes} from './public/building-geometry.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRoadSurface,findRoadPath,polygonIntersectsBox} from './public/road-surface.mjs';
import {inside} from './core.mjs';
const c=(x,y,id='a')=>({xy:[x,y],sourceIds:[id]});
const cells=[c(0,0),c(1,0),c(1,1)];
test('staircase gains a triangular surface and a real diagonal route',()=>{const s=buildRoadSurface(cells,[],[-1,-1,3,3]);assert.ok(s.connectors.length);const walk=new Set(cells.map(c=>c.xy.join(','))),p=findRoadPath([0,0],[1,1],walk,s.diagonalLinks);assert.deepEqual(p,[[0,0],[1,1]]);assert.ok(s.tiles.some(t=>t.polygon.length>4));});
test('do not join distinct source roads across an empty corner',()=>{const s=buildRoadSurface([c(0,0,'a'),c(1,0,'a'),c(1,1,'b')],[],[-1,-1,3,3]);assert.equal(s.diagonalLinks.length,0);});
test('building or water in the inside corner vetoes the connector',()=>{const house={pos:[.5,1.5],w:.9,d:.9};const s=buildRoadSurface(cells,[house],[-1,-1,3,3]);assert.equal(s.connectors.length,0);assert.equal(s.diagonalLinks.length,0);assert.equal(buildRoadSurface(cells,[],[-1,-1,3,3],()=>true).connectors.length,0);});
const sample=JSON.parse(fs.readFileSync('public/blocks.json'));
test('all real connectors are separate from building footprints',()=>{assert.ok(sample.roadSurface.connectors.length>100);for(const c of sample.roadSurface.connectors)for(const m of sample.modules)for(const box of moduleBoxes(m))assert.ok(!polygonIntersectsBox(c.polygon,box));});
function onSurface(p,polys){return polys.some(poly=>inside(p,[poly])||poly.some((a,i)=>{const b=poly[(i+1)%poly.length],cross=(p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]);return Math.abs(cross)<1e-7&&p[0]>=Math.min(a[0],b[0])-1e-7&&p[0]<=Math.max(a[0],b[0])+1e-7&&p[1]>=Math.min(a[1],b[1])-1e-7&&p[1]<=Math.max(a[1],b[1])+1e-7;}));}
test('diagonal movement stays on the visible road through block boundaries',()=>{const s=sample.roadSurface;for(const link of s.diagonalLinks){const [a,b]=link.cells;const polys=[...s.tiles.filter(t=>Math.abs(t.xy[0]-a[0])<=1&&Math.abs(t.xy[1]-a[1])<=1),...s.connectors.filter(c=>Math.abs(c.xy[0]-a[0])<=1&&Math.abs(c.xy[1]-a[1])<=1)].map(x=>x.polygon);for(let i=0;i<=10;i++){const t=i/10,p=[a[0]+.5+(b[0]-a[0])*t,a[1]+.5+(b[1]-a[1])*t];assert.ok(onSurface(p,polys),link.id+' leaves surface');}}});
