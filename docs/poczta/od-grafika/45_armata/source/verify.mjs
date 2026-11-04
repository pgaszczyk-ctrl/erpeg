import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CannonController} from './cannon-controller.mjs';
const bytes=await fs.readFile(new URL('../armata_C.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let launches=0;const c=new CannonController(gltf,{onLaunch:({position,direction})=>{launches++;assert.ok(position.y>3);assert.ok(Math.abs(direction.length()-1)<1e-6);}});
assert.deepEqual(gltf.animations.map(x=>x.name),['idle','fire','catch','turn_demo_360']);
for(let deg=-180;deg<=180;deg+=45){const a=deg*Math.PI/180;assert.equal(c.aimTo(Math.sin(a),Math.cos(a)),true);c.update(.65);assert.ok(Math.abs(Math.atan2(Math.sin(c.yaw.rotation.y-a),Math.cos(c.yaw.rotation.y-a)))<1e-6);}
c.aimTo(Math.sin(179*Math.PI/180),Math.cos(179*Math.PI/180),0);c.aimTo(Math.sin(-179*Math.PI/180),Math.cos(-179*Math.PI/180));assert.ok(Math.abs(c.aim.delta-2*Math.PI/180)<1e-6);assert.equal(c.fire(),false);c.update(.65);
const angle=c.yaw.rotation.y;assert.equal(c.fire(),true);assert.equal(c.fire(),false);c.update(.119);assert.equal(launches,0);c.update(.0011);assert.equal(launches,1);c.update(1);assert.equal(launches,1);assert.ok(Math.abs(c.yaw.rotation.y-angle)<1e-6);assert.equal(c.shotTime,-1);
assert.ok(Math.abs(c.socket('BarrelRecoil').position.y+.14)<1e-6);
c.fire();c.update(2);assert.equal(launches,2);
c.catch();c.update(.16);assert.ok(Math.abs(c.socket('NetBounce').position.y-2.82)<1e-6);c.update(2);assert.ok(Math.abs(c.socket('NetBounce').position.y-3.12)<1e-6);
assert.equal(c.aimTo(NaN,1),false);assert.equal(c.aimTo(0,0),false);assert.equal(c.aimTo(1,0),true);c.update(.65);
for(const name of ['MuzzleSocket','PassengerSocket','EntrySocket','LoadingSocket','LandingSocket','ExitSocket'])assert.ok(c.socket(name));
c.dispose();assert.equal(c.fire(),false);console.log('PASS: GLB parse, 8 headings, wrap shortest path, fire event once at 0.12s, delayed frame, recoil rest, net rest, sockets, dispose.');
