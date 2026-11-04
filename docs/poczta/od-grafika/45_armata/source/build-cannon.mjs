import * as T from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
globalThis.FileReader=class {readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});} readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const mat=(name,c,metalness=0)=>new T.MeshStandardMaterial({name,color:c,roughness:0.9,metalness,flatShading:true});
const M={ink:mat('Ink_1e1a24',0x1e1a24),navy:mat('Navy_1c2836',0x1c2836),steel:mat('Steel_3e5468',0x3e5468),brass:mat('Brass_c2a45c',0xc2a45c,.12),light:mat('BrassLight_d8bc72',0xd8bc72,.1),wood:mat('Wood_704a30',0x704a30),woodLight:mat('WoodLight_a08058',0xa08058),rope:mat('Rope_e0d4b6',0xe0d4b6),red:mat('Red_8f322a',0x8f322a)};
M.glow=mat('SignalLamp',0xb2453a);M.glow.emissive.setHex(0x8f322a);M.glow.emissiveIntensity=.5;
M.flash=mat('MuzzleFlash',0xfff6c8);M.flash.emissive.setHex(0xf0c850);M.flash.emissiveIntensity=1;
M.smoke=mat('Smoke',0xece6d6);
const root=new T.Group();root.name='MunicipalCannon_C';
root.userData={assetVersion:'1.0.0',authoring:'EXP-LORE / concept C',upAxis:'+Y',headingAxis:'+Z',guardHeight:1.25,muzzleHeight:5.0,units:'same as reference guard GLB',shotEventSeconds:.12,netSeparateFromTurret:true};
function group(name,parent=root,p=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...p);parent.add(g);return g;}
function mesh(geo,material,parent,p=[0,0,0],name=''){const m=new T.Mesh(geo,material);m.position.set(...p);m.name=name;parent.add(m);return m;}
function box(w,h,d,m,g,p,r=0){const a=mesh(new T.BoxGeometry(w,h,d),m,g,p);a.rotation.y=r;return a;}
function cyl(rt,rb,h,m,g,p,rad=24){return mesh(new T.CylinderGeometry(rt,rb,h,rad,1),m,g,p);}
function sphere(r,m,g,p){return mesh(new T.IcosahedronGeometry(r,1),m,g,p);}
function bar(a,b,r,m,g,segments=6){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);const o=mesh(new T.CylinderGeometry(r,r,v.length(),segments,1),m,g,A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function ring(radius,tube,m,g,p,segments=32){const o=mesh(new T.TorusGeometry(radius,tube,5,segments),m,g,p);o.rotation.x=Math.PI/2;return o;}
const base=group('StationaryBase');
cyl(1.48,1.67,.22,M.ink,base,[0,.11,0]);
cyl(1.42,1.55,.44,M.navy,base,[0,.4,0]);
cyl(1.54,1.54,.12,M.brass,base,[0,.65,0]);
cyl(1.43,1.48,.14,M.steel,base,[0,.77,0]);
ring(1.47,.045,M.ink,base,[0,.7,0]);
for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a),z=Math.cos(a);box(.4,.13,.68,M.ink,base,[x*1.43,.12,z*1.43],a);box(.29,.18,.54,M.brass,base,[x*1.44,.23,z*1.44],a);bar([x*1.14,.6,z*1.14],[x*1.6,.26,z*1.6],.13,M.light,base);sphere(.09,M.brass,base,[x*1.38,.46,z*1.38]);}
// A broad cog ring survives the overhead camera and low game resolution.
for(let i=0;i<32;i++){const a=i*Math.PI/16;box(.15,.16,.22,M.light,base,[Math.sin(a)*1.52,.86,Math.cos(a)*1.52],a);}
const turret=group('TurretYaw',root,[0,.91,0]);turret.userData={axis:'+Y',restHeading:'+Z',rangeDegrees:360,procedural:true};
cyl(1.25,1.32,.18,M.brass,turret,[0,.07,0]);cyl(1.15,1.2,.18,M.navy,turret,[0,.22,0]);
for(const x of [-.96,.96]){box(.26,1.42,.66,M.ink,turret,[x,.9,-.13]);box(.19,1.33,.56,M.brass,turret,[x,.9,-.13]);const pin=cyl(.32,.32,.29,M.light,turret,[x*1.06,1.22,-.16],16);pin.rotation.z=Math.PI/2;const cap=cyl(.19,.19,.31,M.steel,turret,[x*1.07,1.22,-.16],12);cap.rotation.z=Math.PI/2;}
const elevation=group('BarrelElevation',turret,[0,1.13,-.16]);elevation.rotation.x=T.MathUtils.degToRad(25);elevation.userData={axis:'+X',restTiltFromVerticalDegrees:25};
const recoil=group('BarrelRecoil',elevation,[0,-.14,0]);
const profile=[[0,0],[.58,0],[.73,.22],[.77,.55],[.81,1.1],[.87,2.66],[.98,2.86],[.98,3.0],[.71,3.0],[.68,2.86],[.61,.58],[0,.58]].map(p=>new T.Vector2(...p));
mesh(new T.LatheGeometry(profile,24),M.navy,recoil);
// Real hollow muzzle; dark inner sleeve cannot be confused with a solid cap.
mesh(new T.LatheGeometry([[.71,3.0],[.68,2.86],[.61,.6]].map(p=>new T.Vector2(...p)),24),M.ink,recoil);
mesh(new T.LatheGeometry([[.99,2.81],[1.0,2.83],[1.0,3.025],[.705,3.025],[.705,2.84]].map(p=>new T.Vector2(...p)),24),M.light,recoil);
for(const [y,r,w] of [[.28,.75,.15],[1.03,.82,.16],[2.0,.87,.14],[2.88,.99,.22]]){const pts=[[r-w*.05,y-w/2],[r+.025,y-w/2],[r+.025,y+w/2],[r-w*.05,y+w/2]].map(p=>new T.Vector2(...p));mesh(new T.LatheGeometry(pts,24),M.brass,recoil);ring(r+.013,.025,M.light,recoil,[0,y+w/2,0],24);}
ring(.842,.025,M.ink,recoil,[0,1.13,0],24);ring(.885,.025,M.ink,recoil,[0,2.1,0],24);
for(let i=0;i<8;i++){const a=i*Math.PI/4;const riv=sphere(.055,M.brass,recoil,[Math.sin(a)*.85,3.045,Math.cos(a)*.85]);riv.scale.y=.35;}
const muzzle=group('MuzzleSocket',recoil,[0,3.03,0]);muzzle.userData={forwardLocal:'+Y',event:'launch at shot t=0.12 seconds'};
const passenger=group('PassengerSocket',recoil,[0,1.85,0]);passenger.userData={purpose:'temporary character attachment inside barrel; keep original hero scale'};
// Lamp moves with turret; no rotation is baked into the recoil clip.
bar([-1.12,.45,-.25],[-1.38,.68,-.25],.08,M.brass,turret);
cyl(.24,.28,.1,M.light,turret,[-1.38,.73,-.25],12);cyl(.19,.19,.48,M.glow,turret,[-1.38,1.03,-.25],12);cyl(.27,.24,.12,M.brass,turret,[-1.38,1.31,-.25],12);
for(let i=0;i<4;i++){const a=i*Math.PI/2;bar([-1.38+.205*Math.sin(a),.8,-.25+.205*Math.cos(a)],[-1.38+.205*Math.sin(a),1.26,-.25+.205*Math.cos(a)],.035,M.ink,turret);}
sphere(.09,M.light,turret,[-1.38,1.42,-.25]);
// Fixed stairs: return turret to zero before boarding, then aim with passenger inside.
const stairs=group('BoardingStairs',root,[0,.91,0]);
for(let i=0;i<5;i++){const z=2.03-i*.26,y=.17+i*.2;box(.82,.14,.3,M.ink,stairs,[0,y-.91,z]);box(.76,.09,.29,M.woodLight,stairs,[0,y-.86,z]);}
for(const x of [-.44,.44])bar([x,-.77,2.2],[x,.18,.91],.065,M.wood,stairs);
box(.82,.12,.52,M.wood,stairs,[0,.19,.64]);
const entry=group('EntrySocket',stairs,[0,-.91,2.3]);entry.userData={purpose:'ground approach point; board at turret yaw zero before aiming'};
const loading=group('LoadingSocket',stairs,[0,.29,.64]);
// Fixed articulated catcher: separate from yaw, outside the barrel sweep.
const arm=group('CatcherArm',root);
bar([1.25,.47,0],[2.35,1.02,0],.18,M.ink,arm);bar([1.28,.51,0],[2.35,1.06,0],.135,M.brass,arm);
bar([2.35,1.06,0],[3.45,2.44,0],.15,M.brass,arm);
for(const p of [[1.28,.51,0],[2.35,1.06,0],[3.45,2.44,0]]){const j=cyl(.27,.27,.28,M.ink,arm,p,16);j.rotation.x=Math.PI/2;const j2=cyl(.2,.2,.32,M.light,arm,p,12);j2.rotation.x=Math.PI/2;}
bar([1.45,.2,-.48],[3.6,.2,-.48],.085,M.steel,arm);box(.48,.16,.68,M.navy,arm,[3.6,.14,-.48]);
const basket=group('NetBounce',root,[3.65,3.12,0]);
const nx=1.05,nz=1.1;
function netPoint(u,v){return [u*nx,-.67*(1-u*u)*(1-v*v),v*nz];}
// Broad cream cords; actual holes, no alpha texture or dense mesh fill.
for(let j=0;j<=8;j++){const v=-1+j/4;for(let i=0;i<12;i++)bar(netPoint(-1+i/6,v),netPoint(-1+(i+1)/6,v),.024,M.rope,basket,5);}
for(let i=0;i<=8;i++){const u=-1+i/4;for(let j=0;j<12;j++)bar(netPoint(u,-1+j/6),netPoint(u,-1+(j+1)/6),.024,M.rope,basket,5);}
for(const v of [-1,1])bar([-nx,0,v*nz],[nx,0,v*nz],.065,M.brass,basket);
for(const u of [-1,1])bar([u*nx,0,-nz],[u*nx,0,nz],.065,M.brass,basket);
for(const x of [-nx,nx])for(const z of [-nz,nz]){sphere(.11,M.light,basket,[x,.12,z]);bar([0,-.68,0],[x,0,z],.045,M.brass,basket);}
group('LandingSocket',basket,[0,-.57,0]).userData={purpose:'character feet rest here while net bounces'};
group('ExitSocket',root,[4.65,0,1.3]);
// Joint forks support the catcher without crossing the landing area from above.
for(const z of [-nz,nz])bar([3.45,2.44,0],[3.65,3.12,z],.09,M.brass,arm);
// Small finite animation effects use mesh transforms (portable glTF, no shader extension).
const flash=group('MuzzleFlash',muzzle);flash.scale.setScalar(.001);
mesh(new T.ConeGeometry(.64,.85,8),M.flash,flash,[0,.36,0]);
const smoke=group('SmokePuff',muzzle,[0,.35,0]);smoke.scale.setScalar(.001);
for(const [x,y,z,r] of [[0,.3,0,.43],[.26,.55,.05,.35],[-.25,.61,-.08,.34],[.04,.95,.08,.28]])sphere(r,M.smoke,smoke,[x,y,z]);
function scalarTrack(name,times,values){return new T.VectorKeyframeTrack(name+'.scale',times,values.flatMap(x=>[x,x,x]));}
const shotTimes=[0,.1,.12,.18,.32,.62,.9];
const clips=[new T.AnimationClip('idle',1,[new T.VectorKeyframeTrack('BarrelRecoil.position',[0,1],[0,-.14,0,0,-.14,0])]),new T.AnimationClip('fire',.9,[new T.VectorKeyframeTrack('BarrelRecoil.position',shotTimes,[0,-.14,0,0,-.14,0,0,-.52,0,0,-.48,0,0,-.32,0,0,-.17,0,0,-.14,0]),scalarTrack('MuzzleFlash',[0,.115,.12,.19,.23,.9],[.001,.001,1,.5,.001,.001]),scalarTrack('SmokePuff',[0,.12,.13,.3,.64,.9],[.001,.001,.3,1,1.4,.001]),new T.VectorKeyframeTrack('SmokePuff.position',[0,.12,.4,.9],[0,.35,0,0,.35,0,0,.85,0,0,1.5,0])]),new T.AnimationClip('catch',1.2,[new T.VectorKeyframeTrack('NetBounce.position',[0,.16,.35,.56,.77,1.2],[3.65,3.12,0,3.65,2.82,0,3.65,3.23,0,3.65,3.03,0,3.65,3.16,0,3.65,3.12,0])])];
const turnQs=[];for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2])turnQs.push(...new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),a).toArray());
clips.push(new T.AnimationClip('turn_demo_360',4,[new T.QuaternionKeyframeTrack('TurretYaw.quaternion',[0,1,2,3,4],turnQs)]));
// Merge static meshes per parent/material. Animation nodes and sockets remain named.
function optimize(g){for(const c of [...g.children])if(c.isGroup)optimize(c);const buckets=new Map();for(const c of [...g.children])if(c.isMesh){c.updateMatrix();const geo=c.geometry.clone().applyMatrix4(c.matrix);if(geo.index)geo.setIndex(geo.index);const key=c.material.uuid;if(!buckets.has(key))buckets.set(key,{material:c.material,geos:[]});buckets.get(key).geos.push(geo);g.remove(c);}for(const {material,geos} of buckets.values()){const merged=mergeGeometries(geos.map(geo=>geo.index?geo.toNonIndexed():geo),false);mesh(merged,material,g,[0,0,0],g.name+'_'+material.name);}}
optimize(root);root.updateMatrixWorld(true);
const exp=new GLTFExporter();const glb=await exp.parseAsync(root,{binary:true,animations:clips,onlyVisible:false,trs:true});
await fs.writeFile(path.join(out,'armata_C.glb'),Buffer.from(glb));
let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
const bounds=new T.Box3().setFromObject(root);const metrics={version:'1.0.0',bytes:glb.byteLength,triangles,meshes,guardHeight:1.25,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},clips:clips.map(c=>({name:c.name,duration:c.duration})),camera:{elevationFromHorizontalDegrees:60,projection:'orthographic'},shotEventSeconds:.12};
await fs.writeFile(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
