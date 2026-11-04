import * as THREE from 'three';
/** GLTFLoader result -> deterministic aim + portable embedded clips. +X east, +Z map south. */
export class CannonController {
  constructor(gltf,{onLaunch=()=>{}}={}) {
    this.root=gltf.scene;this.yaw=this.root.getObjectByName('TurretYaw');
    if(!this.yaw)throw new Error('Missing TurretYaw');
    this.mixer=new THREE.AnimationMixer(this.root);this.clips=new Map(gltf.animations.map(c=>[c.name,c]));
    this.onLaunch=onLaunch;this.aim=null;this.shotTime=-1;this.disposed=false;
  }
  /** dx/dy are target minus station in game MAP coordinates, NOT geographic degrees. */
  aimTo(dx,dy,duration=.65){
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<1e-8)return false;
    if(this.shotTime>=0)return false;
    const start=this.yaw.rotation.y,target=Math.atan2(dx,dy);
    this.aim={start,delta:Math.atan2(Math.sin(target-start),Math.cos(target-start)),t:0,duration:Math.max(0,duration)};
    if(duration<=0){this.yaw.rotation.y=start+this.aim.delta;this.aim=null;}
    return true;
  }
  home(duration=.65){return this.aimTo(0,1,duration);}
  playOnce(name){const clip=this.clips.get(name);if(!clip)throw new Error('Missing clip: '+name);const a=this.mixer.clipAction(clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();return a;}
  fire(){if(this.disposed||this.aim||this.shotTime>=0)return false;this.playOnce('fire');this.shotTime=0;return true;}
  catch(){if(this.disposed)return false;this.playOnce('catch');return true;}
  socket(name){const o=this.root.getObjectByName(name);if(!o)throw new Error('Missing socket: '+name);return o;}
  update(dt){
    if(this.disposed||!Number.isFinite(dt)||dt<0)return;
    if(this.aim){const a=this.aim;a.t+=dt;const t=a.duration===0?1:Math.min(1,a.t/a.duration),s=t*t*(3-2*t);this.yaw.rotation.y=a.start+a.delta*s;if(t===1)this.aim=null;}
    const before=this.shotTime;this.mixer.update(dt);
    if(before>=0){this.shotTime+=dt;if(before<.12&&this.shotTime>=.12){this.root.updateMatrixWorld(true);const socket=this.socket('MuzzleSocket'),position=new THREE.Vector3(),direction=new THREE.Vector3(0,1,0);socket.getWorldPosition(position);direction.transformDirection(socket.matrixWorld);this.onLaunch({position,direction});}if(this.shotTime>=.9)this.shotTime=-1;}
  }
  dispose(){this.disposed=true;this.aim=null;this.shotTime=-1;this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);}
}
