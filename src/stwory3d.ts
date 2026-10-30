// G008 GLBs in the real game. One renderer + bounded atlas per scene; the original actor owns gameplay.
import Phaser from 'phaser';
import type * as THREE from 'three';
import type { Slime } from './objects/Slime';
import type { RodzajWroga } from './content/fabula';
import { SKALA_POSTACI } from './skala';
import { TEST } from './version';
import { KOLOR_3D_GLSL } from './wyrazistosc3d';
import { manageResident, mieszkancy3d, residentsFor, dialogueActor, releaseResidentBridge, type ResidentVisual, type ResidentSprite } from './mieszkancy3d';

export const MODELE_STWOROW: Partial<Record<RodzajWroga, string>> = {
  wilk:'wilk', warg:'warg', glut:'chochlik', wielki_glut:'chochlik', bandyta:'bandyta', zombie:'zombiak',
  szkielet:'szkielet', upior:'upior_krypty', wodnik:'wodnik', blob:'wodny_blob', driada:'driada',
  herszt:'herszt', wielki_herszt:'herszt', koziol:'mosiezny_koziol',
};
function enemiesEnabled(){return TEST&&new URLSearchParams(location.search).get('stwory3d')!=='0';}
export function stwory3d(){return enemiesEnabled()||mieszkancy3d();}
const TILE=128, COLS=8, ROWS=4, LIMIT=32, FPS=15, VIEW=2.2, FEET=.82, SCALE=.27*SKALA_POSTACI;
type Model={root:THREE.Object3D; mixer:THREE.AnimationMixer; clips:Map<string,THREE.AnimationClip>;
  events:Record<string,Record<string,number>>; current?:THREE.AnimationAction};
type Slot={actor:Slime; index:number; angle:number; clip:string; time:number;
  saved:{texture:string; frame:string|number; sx:number; sy:number; ox:number; oy:number; flip:boolean}};

type ResidentSlot={visual:ResidentVisual;index:number;image:Phaser.GameObjects.Image};
export class Stwory3D {
  private key='stwory3d-atlas';
  private models=new Map<string,Model>();
  private requests=new Map<string,Promise<void>>();
  private retries=new Map<string,number>();
  private slots=new Map<Slime,Slot>();
  private retired=new Set<Slime>();
  private residents=new Map<ResidentSprite,ResidentSlot>();
  private speaking?:{actor:ResidentSprite;at:number;next:number;paused:boolean};
  private disposed=false;
  private failed=false;
  private starting=false;
  private nextFrame=0;
  private g?:{three:typeof THREE; renderer:THREE.WebGLRenderer; scene:THREE.Scene; camera:THREE.OrthographicCamera;
    target:THREE.WebGLRenderTarget; post:THREE.Scene; postCamera:THREE.OrthographicCamera;
    quad:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>};
  readonly stats={contexts:0,frames:0,visible:0,loaded:0,draws:0,atlasBytes:TILE*COLS*TILE*ROWS*4};
  constructor(private scene:Phaser.Scene) {scene.game.events.on('step',this.animateConversation);scene.game.events.on('dialog',this.onResidentDialog);}
  private onResidentDialog=(dialog:{title:string})=>this.conversation(dialogueActor(this.scene,[...this.residents.values()].map(s=>s.visual),dialog.title));
  residentRequests(now:number){return residentsFor(this.scene,now);}
  /** Only the speaker animates while dialogue pauses the simulation. */
  conversation(actor:ResidentSprite|undefined){this.speaking=actor?{actor,at:performance.now(),next:0,paused:false}:undefined;}
  private animateConversation=()=>{
    const speaking=this.speaking,g=this.g;if(!speaking||!g||this.failed||this.disposed)return;
    // ScenePlugin.pause queues the pause until the next scene step. Keep the speaker through that frame.
    if(!this.scene.scene.isPaused()){if(speaking.paused||performance.now()-speaking.at>1000)this.speaking=undefined;return;}
    if(!speaking.paused){speaking.paused=true;speaking.at=performance.now();}
    const slot=this.residents.get(speaking.actor),now=performance.now();
    if(!slot||!speaking.actor.active||!speaking.actor.visible||now<speaking.next)return;
    speaking.next=now+1000/FPS;
    const clip=slot.visual.model==='pies'?'wag':'talk';
    const visual={...slot.visual,clip,time:(now-speaking.at)/1000};
    g.renderer.setRenderTarget(g.target);g.renderer.setScissorTest(true);
    this.drawResident({...slot,visual});this.finishAtlas();
  };

  private async start() {
    this.starting=true;
    try {
      const three=await import('three'); if(this.disposed)return;
      const canvas=document.createElement('canvas');
      const renderer=new three.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});
      renderer.setPixelRatio(1);renderer.setSize(TILE*COLS,TILE*ROWS,false);renderer.setClearColor(0,0);renderer.autoClear=false;
      const scene=new three.Scene(), a=22*Math.PI/180,y=(FEET-.5)*VIEW/Math.cos(a);
      const camera=new three.OrthographicCamera(-VIEW/2,VIEW/2,VIEW/2,-VIEW/2,.1,30);
      camera.position.set(0,y+Math.sin(a)*8,Math.cos(a)*8);camera.lookAt(0,y,0);camera.updateMatrixWorld();
      const target=new three.WebGLRenderTarget(TILE*COLS,TILE*ROWS,{minFilter:three.NearestFilter,magFilter:three.NearestFilter});
      const post=new three.Scene(),postCamera=new three.OrthographicCamera(-1,1,1,-1,0,1);
      const quad=new three.Mesh(new three.PlaneGeometry(2,2),new three.ShaderMaterial({
        uniforms:{picture:{value:target.texture},texel:{value:new three.Vector2(1/(TILE*COLS),1/(TILE*ROWS))}},
        vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader:`uniform sampler2D picture;uniform vec2 texel;varying vec2 uv0;
          ${KOLOR_3D_GLSL}
          void main(){vec4 c=texture2D(picture,uv0);float edge=0.;
          // Three atlas pixels = about one screen pixel at the usual map zoom.
          // Two rings close thin limbs without a costly full 7x7 dilation or extra actor copies.
          vec2 tileMin=floor(uv0/(texel*128.))*texel*128.+texel*.5;
          vec2 tileMax=tileMin+texel*127.;
          for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
            vec2 offset=vec2(float(x),float(y))*texel;
            edge=max(edge,texture2D(picture,clamp(uv0+offset*1.5,tileMin,tileMax)).a);
            edge=max(edge,texture2D(picture,clamp(uv0+offset*3.,tileMin,tileMax)).a);
          }
          gl_FragColor=vec4(mix(vec3(.118,.102,.141),wyrazistyKolor(c.rgb),c.a),max(c.a,edge));
          // G008 stores display RGB in COLOR_0, as used by its accepted standalone preview.
          // Grade those display bytes once; a second sRGB transfer would wash out every figure.
          }`,depthTest:false,depthWrite:false,
      }));post.add(quad);
      this.g={three,renderer,scene,camera,target,post,postCamera,quad};
      const texture=this.scene.textures.addImage(this.key,canvas as unknown as HTMLImageElement)!;
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      for(let i=0;i<LIMIT;i++)texture.add(String(i),0,i%COLS*TILE,Math.floor(i/COLS)*TILE,TILE,TILE);
      canvas.addEventListener('webglcontextlost',this.contextLost);this.stats.contexts=1;
    } catch(e){this.failed=true;console.warn('Stwory 3D: renderer unavailable; keeping sprites',e);}
  }
  private contextLost=(e:Event)=>{e.preventDefault();this.failed=true;
    for(const slot of this.slots.values())this.restore(slot);this.slots.clear();
    for(const slot of this.residents.values())this.restoreResident(slot);this.residents.clear();};

  private load(id:string) {
    if(this.requests.has(id)||performance.now()<(this.retries.get(id)??0))return;
    const request=(async()=>{
      try {
        const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}modele/swiat44/${id}.glb${id==='pies'?'?v=G010':''}`);
        if(this.disposed){this.disposeModel(gltf.scene);return;}
        const g=this.g!,root=gltf.scene,size=new g.three.Box3().setFromObject(root).getSize(new g.three.Vector3());
        const height=id==='wilk'||id==='warg'?.8:id==='pies'?.70:id==='wodny_blob'?.65:/^(chlopiec|chlopiec_2|urwis|dziewczynka|dziewczynka_warkocze)$/.test(id)?.96:/^(babcia|starsza_pani|starszy_pan|starszy_pan_kapelusz)$/.test(id)?1.12:1.25;
        root.scale.setScalar(height/Math.max(.1,size.y));
        const clips=new Map<string,THREE.AnimationClip>();
        for(const original of gltf.animations){
          const clip=original.clone();
          // StworAI/moveActor already resolves all world travel and collisions. Keep Y (jump), strip root X/Z.
          for(const track of clip.tracks){const [node,prop]=track.name.split('.');
            if(prop!=='position'||!root.children.some(child=>child.name===node))continue;
            for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];}}
          clips.set(clip.name,clip);
        }
        const events=(gltf.parser as typeof gltf.parser & {json:{extras?:Model['events']}}).json.extras??{};
        this.models.set(id,{root,clips,mixer:new g.three.AnimationMixer(root),events});this.stats.loaded=this.models.size;
      } catch(e){this.retries.set(id,performance.now()+3000);console.warn(`Stwory 3D: ${id} load failed; keeping sprite and retrying`,e);}
      finally{this.requests.delete(id);}
    })();this.requests.set(id,request);
  }
  private attackAnchor(model: Model, clipName: string, duration: number) {
    const events = model.events;
    const jump = ['lunge', 'pounce'].includes(clipName);
    const event = clipName === 'throw' ? events.throwEvents?.release : clipName === 'stomp' ? events.stompEvents?.impact
      : clipName === 'charge' ? events.chargeEvents?.windupEnd : jump ? (events.pounceEvents?.takeoff ?? events.attackEvents?.takeoff) : events.attackEvents?.impact;
    return Math.min(duration - .01, event ?? duration * .5);
  }
  /** Use the exact same piecewise clip clock as rendering, including wolf takeoff → jaw impact. */
  attackMarkerMs(actor: Slime, marker: 'impact'): number | undefined {
    const attack = actor.modelAttack, id = MODELE_STWOROW[actor.kindId], model = id && this.models.get(id);
    if (!attack || !model) return;
    const clip = model.clips.get(attack.clip) ?? model.clips.get('attack');
    if (!clip) return;
    const event = (['lunge', 'pounce'].includes(attack.clip) ? model.events.pounceEvents?.[marker] : undefined) ?? model.events.attackEvents?.[marker];
    if (event === undefined) return;
    const anchor = this.attackAnchor(model, attack.clip, clip.duration);
    const at = event <= anchor ? attack.start + event / Math.max(.01, anchor) * (attack.contact - attack.start)
      : attack.contact + (event - anchor) / Math.max(.01, clip.duration - anchor) * (attack.end - attack.contact);
    return at;
  }
  private pose(actor:Slime,model:Model,now:number){
    if(actor.isDead)return {clip:'death',time:Math.max(0,now-actor.modelDeathAt)/1000};
    const hit=model.clips.get('hit');
    if(hit&&now-actor.modelHitAt<hit.duration*1000)return {clip:'hit',time:Math.max(0,now-actor.modelHitAt)/1000};
    const attack=actor.modelAttack;
    if(attack&&now<attack.end){
      const clip=model.clips.get(attack.clip)??model.clips.get('attack')!;
      const contact=this.attackAnchor(model,attack.clip,clip.duration);
      const time=now<attack.contact?contact*(now-attack.start)/Math.max(1,attack.contact-attack.start)
        :contact+(clip.duration-contact)*(now-attack.contact)/Math.max(1,attack.end-attack.contact);
      return {clip:clip.name,time:Math.max(0,time)};
    }
    const clip=actor.vel.lengthSq()>1&&!actor.isDazed(now)?'walk':'idle',duration=model.clips.get(clip)!.duration;
    return {clip,time:(now/1000*(clip==='walk'?Math.min(2.5,Math.max(.5,actor.vel.length()/22)):1))%duration};
  }
  private sample(model:Model,clipName:string,time:number,angle:number){
    const clip=model.clips.get(clipName)!,action=model.mixer.clipAction(clip);
    if(action!==model.current){model.mixer.stopAllAction();action.reset().setLoop(this.g!.three.LoopOnce,1);
      action.clampWhenFinished=true;action.play();model.current=action;}
    action.time=Math.min(Math.max(0,time),Math.max(0,clip.duration-.0001));
    model.mixer.update(0);model.root.rotation.y=angle;model.root.updateMatrixWorld(true);
  }
  private angle(actor:Slime,previous:number,now:number){
    if(actor.modelAttack&&now<actor.modelAttack.end)return Math.atan2(Math.cos(actor.modelAttack.aim),Math.sin(actor.modelAttack.aim));
    return actor.vel.lengthSq()>1?Math.atan2(actor.vel.x,actor.vel.y):previous;
  }
  /** Pose the actual GLB emitter at the combat event's time, then project into map pixels. */
  socket(actor:Slime,name:string,now:number){
    const id=MODELE_STWOROW[actor.kindId],model=id&&this.models.get(id),g=this.g;
    if(!model||!g||!actor.model3d)return undefined;
    const pose=this.pose(actor,model,now);this.sample(model,pose.clip,pose.time,this.angle(actor,this.slots.get(actor)?.angle??0,now));
    const socket=model.root.getObjectByName(name);if(!socket)return undefined;
    const p=socket.getWorldPosition(new g.three.Vector3()).project(g.camera),sc=SCALE*actor.kind.scale;
    return {x:actor.x+p.x*TILE/2*sc,y:actor.y+8*SKALA_POSTACI+((.5-p.y/2)-FEET)*TILE*sc};
  }
  update(enemies:Slime[],now:number,people?:ResidentVisual[]){
    people??=this.residentRequests(now);if(!enemiesEnabled())enemies=[];
    if(this.disposed||this.failed)return;
    // Killed actors immediately leave GameScene.enemies; finish their death clip until Slime destroys them.
    for(const [actor]of this.slots)if(actor.active&&actor.isDead)this.retired.add(actor);
    const view=this.scene.cameras.main.worldView;
    const candidates=[...new Set([...enemies,...this.retired])].filter(actor=>actor.active&&actor.visible&&!actor.inAir&&!actor.ownLook
      &&!!MODELE_STWOROW[actor.kindId]&&actor.x>view.x-60&&actor.x<view.right+60&&actor.y>view.y-60&&actor.y<view.bottom+60)
      .sort((a,b)=>Math.hypot(a.x-view.centerX,a.y-view.centerY)-Math.hypot(b.x-view.centerX,b.y-view.centerY)).slice(0,LIMIT);
    for(const actor of this.retired)if(!actor.active)this.retired.delete(actor);
    for(const [actor,slot]of this.slots)if(!candidates.includes(actor)){this.restore(slot);this.slots.delete(actor);}
    const citizens=people.filter(v=>v.actor.active&&v.actor.visible&&v.actor.x>view.x-60&&v.actor.x<view.right+60&&v.actor.y>view.y-60&&v.actor.y<view.bottom+60)
      .sort((a,b)=>Math.hypot(a.actor.x-view.centerX,a.actor.y-view.centerY)-Math.hypot(b.actor.x-view.centerX,b.actor.y-view.centerY)).slice(0,LIMIT-candidates.length);
    for(const [actor,slot]of this.residents){
      if(!citizens.some(v=>v.actor===actor)){this.restoreResident(slot);this.residents.delete(actor);}
      else slot.image.setPosition(actor.x,actor.y).setDepth(actor.depth).setAlpha(actor.alpha).setVisible(actor.visible);
    }
    this.stats.visible=this.slots.size+this.residents.size;if(!candidates.length&&!citizens.length)return;
    if(!this.g){if(!this.starting)void this.start();return;}
    for(const actor of candidates){const id=MODELE_STWOROW[actor.kindId]!;if(!this.models.has(id))this.load(id);}
    for(const visual of citizens)if(!this.models.has(visual.model))this.load(visual.model);
    if(now<this.nextFrame)return;this.nextFrame=now+1000/FPS;
    const g=this.g,used=new Set([...this.slots.values(),...this.residents.values()].map(s=>s.index));let draws=0;
    g.renderer.setRenderTarget(g.target);g.renderer.setScissorTest(true);
    for(const actor of candidates){
      const model=this.models.get(MODELE_STWOROW[actor.kindId]!);if(!model)continue;
      let slot=this.slots.get(actor);
      if(!slot){let index=0;while(used.has(index))index++;used.add(index);
        slot={actor,index,angle:0,clip:'',time:0,saved:{texture:actor.texture.key,frame:actor.frame.name,sx:actor.scaleX,sy:actor.scaleY,
          ox:actor.originX,oy:actor.originY,flip:actor.flipX}};
        this.slots.set(actor,slot);actor.anims.stop();actor.model3d=true;actor.modelDeathMs=(model.clips.get('death')?.duration??1.25)*1000;
        const sc=SCALE*actor.kind.scale;
        actor.setTexture(this.key,String(index)).setScale(sc).setOrigin(.5,FEET-8*SKALA_POSTACI/(TILE*sc)).setFlipX(false);
      }
      const pose=this.pose(actor,model,now);slot.angle=this.angle(actor,slot.angle,now);slot.clip=pose.clip;slot.time=pose.time;
      if(actor.kind.tint&&actor.tintTopLeft===actor.kind.tint)actor.clearTint();
      this.sample(model,pose.clip,pose.time,slot.angle);g.scene.add(model.root);
      const x=slot.index%COLS*TILE,y=(ROWS-1-Math.floor(slot.index/COLS))*TILE;
      g.renderer.setViewport(x,y,TILE,TILE);g.renderer.setScissor(x,y,TILE,TILE);g.renderer.clear();
      g.renderer.render(g.scene,g.camera);draws+=g.renderer.info.render.calls;g.scene.remove(model.root);
    }
    for(const visual of citizens){
      const actor=visual.actor;if(!this.models.has(visual.model))continue;
      let slot=this.residents.get(actor);
      if(!slot){let index=0;while(used.has(index))index++;used.add(index);
        // Crop only the native picture; its animation, position, alpha and hit testing remain native.
        // The overlay follows those values even between animation frames.
        if(actor.isCropped)continue;
        const image=this.scene.add.image(actor.x,actor.y,this.key,String(index)).setScale(SCALE)
          .setOrigin(.5,FEET-8*SKALA_POSTACI/(TILE*SCALE)).setDepth(actor.depth).setAlpha(actor.alpha);
        slot={visual,index,image};this.residents.set(actor,slot);actor.setCrop(0,0,0,0);manageResident(actor,true);
      }
      slot.visual=visual;visual.umbrella?.setVisible(false);this.drawResident(slot);draws+=g.renderer.info.render.calls;
    }
    this.finishAtlas();
    this.stats.frames++;this.stats.visible=this.slots.size+this.residents.size;this.stats.draws=draws+1;
  }
  private drawResident(slot:ResidentSlot){
    const g=this.g!,v=slot.visual,model=this.models.get(v.model);if(!model)return;
    const clip=model.clips.get(v.clip)??model.clips.get('idle')!;
    this.sample(model,clip.name,v.clip==='sit'?Math.min(v.time,clip.duration):v.time%clip.duration,v.angle);
    g.scene.add(model.root);const x=slot.index%COLS*TILE,y=(ROWS-1-Math.floor(slot.index/COLS))*TILE;
    g.renderer.setViewport(x,y,TILE,TILE);g.renderer.setScissor(x,y,TILE,TILE);g.renderer.clear();g.renderer.render(g.scene,g.camera);g.scene.remove(model.root);
  }
  private finishAtlas(){const g=this.g!;
    g.renderer.setRenderTarget(null);g.renderer.setScissorTest(false);g.renderer.setViewport(0,0,TILE*COLS,TILE*ROWS);
    g.renderer.clear();g.renderer.render(g.post,g.postCamera);this.scene.textures.get(this.key).source[0].update();
  }
  private restoreResident(slot:ResidentSlot){const a=slot.visual.actor;manageResident(a,false);slot.image.destroy();
    if(!a.active)return;a.setCrop();slot.visual.umbrella?.setVisible(a.visible);
  }
  private restore(slot:Slot){const a=slot.actor;a.model3d=false;if(!a.active)return;const s=slot.saved;
    a.setTexture(s.texture,s.frame).setScale(s.sx,s.sy).setOrigin(s.ox,s.oy).setFlipX(s.flip);if(a.kind.tint)a.setTint(a.kind.tint);a.updateLook();}
  private disposeModel(root:THREE.Object3D){root.traverse(node=>{const m=node as THREE.Mesh;if(!m.isMesh)return;
    m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();});}
  destroy(){
    this.disposed=true;releaseResidentBridge(this.scene);this.scene.game.events.off('step',this.animateConversation);this.scene.game.events.off('dialog',this.onResidentDialog);this.speaking=undefined;for(const slot of this.slots.values())this.restore(slot);this.slots.clear();
    for(const slot of this.residents.values())this.restoreResident(slot);this.residents.clear();this.retired.clear();
    for(const m of this.models.values()){m.mixer.stopAllAction();m.mixer.uncacheRoot(m.root);this.disposeModel(m.root);}this.models.clear();
    if(this.g){const g=this.g;g.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);
      g.quad.geometry.dispose();g.quad.material.dispose();g.target.dispose();g.renderer.dispose();g.renderer.forceContextLoss();this.g=undefined;}
    if(this.scene.textures.exists(this.key))this.scene.textures.remove(this.key);this.stats.contexts=0;
  }
}
