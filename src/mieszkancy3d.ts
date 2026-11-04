// Isolated presentation adapter: the existing game/NPC/quest modules remain unchanged.
import type Phaser from 'phaser';
import { personOf } from './sprites';
import { tr } from './i18n';
import { PIES } from './content/postacie';
import type { Folk } from './scenes/Townsfolk';
import type { Npc } from './scenes/Npcs';
export type ResidentSprite=Phaser.GameObjects.Sprite|Phaser.GameObjects.Image;
export const MIESZKANCY_MODELE={
  k_dorosly:['mloda_kobieta','kobieta','mieszczka'],m_dorosly:['mlody_mezczyzna','pan_z_wasem','mezczyzna'],
  k_dziecko:['dziewczynka_warkocze','dziewczynka'],m_dziecko:['chlopiec','chlopiec_2','urwis'],
  k_starszy:['babcia','starsza_pani'],m_starszy:['starszy_pan','starszy_pan_kapelusz'],
};
export function mieszkancy3d(){return new URLSearchParams(location.search).get('mieszkancy3d')!=='0';}
const managed=new WeakSet<ResidentSprite>();
export function manageResident(sprite:ResidentSprite,on:boolean){if(on)managed.add(sprite);else managed.delete(sprite);}
function residentModel(tex:string,id:string){
  const who=personOf(tex);if(!who?.plec)return undefined;
  const list=MIESZKANCY_MODELE[`${who.plec}_${who.wiek??'dorosly'}`];
  let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);
  return list[(h>>>0)%list.length];
}
export interface ResidentVisual {actor:ResidentSprite;model:string;umbrella?:Phaser.GameObjects.Graphics;name?:string;angle:number;clip:string;time:number;}
type Motion={x:number;y:number;stopped:number;angle:number;};
const motion=new WeakMap<ResidentSprite,Motion>();
function visual(actor:ResidentSprite,model:string,now:number,name:string,umbrella?:Phaser.GameObjects.Graphics):ResidentVisual{
  let s=motion.get(actor);if(!s){s={x:actor.x,y:actor.y,stopped:now,angle:0};motion.set(actor,s);}
  const dx=actor.x-s.x,dy=actor.y-s.y,moving=Math.hypot(dx,dy)>.0001;
  if(moving){s.angle=Math.atan2(dx,dy);s.stopped=now;}
  const resting=Math.max(0,(now-s.stopped)/1000);
  const clip=model==='pies'?moving?'walk':resting>.7?'sit':'idle':umbrella?'rain':moving?'walk':'idle';
  const time=clip==='sit'?Math.min(1.6,resting-.7):umbrella&&!moving?0:now/1000;
  s.x=actor.x;s.y=actor.y;
  if(managed.has(actor))umbrella?.setVisible(false);
  return {actor,model,umbrella,name,angle:s.angle,clip,time};
}
// Read-only bridge to the existing scene-owned collections; never move an actor or change a quest.
type World=Phaser.Scene&{loch?:unknown;folk?:{active:Set<Folk>};npcs?:{list:Npc[]};
  fixed?:{list:{id:string;sprite:ResidentSprite;gone?:boolean}[]};
  player?:{x:number;y:number};rozmowca?:{x:number;y:number}};
type PickingOwner={at:(...args:number[])=>{sprite?:ResidentSprite}|null|undefined};
type PickHook={owner:PickingOwner;original:PickingOwner['at'];wrapped:PickingOwner['at']};
const pickHooks=new WeakMap<Phaser.Scene,PickHook[]>();
const lastPick=new WeakMap<Phaser.Scene,{actor:ResidentSprite;at:number}>();
function trackPicks(scene:Phaser.Scene,owner:unknown){
  const target=owner as PickingOwner|undefined;if(!target?.at)return;
  const hooks=pickHooks.get(scene)??[];if(hooks.some(h=>h.owner===target))return;
  const original=target.at,wrapped:PickingOwner['at']=function(...args){
    const chosen=original.apply(target,args);if(chosen?.sprite)lastPick.set(scene,{actor:chosen.sprite,at:performance.now()});return chosen;
  };
  target.at=wrapped;hooks.push({owner:target,original,wrapped});pickHooks.set(scene,hooks);
}
export function releaseResidentBridge(scene:Phaser.Scene){
  for(const h of pickHooks.get(scene)??[])if(h.owner.at===h.wrapped)h.owner.at=h.original;
  pickHooks.delete(scene);lastPick.delete(scene);
}
export function residentsFor(scene:Phaser.Scene,now:number){
  const world=scene as World,out:ResidentVisual[]=[];
  if(!mieszkancy3d()||world.loch)return out;
  for(const owner of [world.folk,world.npcs,world.fixed])trackPicks(scene,owner);
  for(const f of world.folk?.active??[]){
    const model=residentModel(f.tex,f.id);
    if(model&&f.role!=='gazeciarz'&&!f.away&&!f.gone&&f.sprite)out.push(visual(f.sprite,model,now,f.name,f.umbrella));
  }
  for(const n of world.npcs?.list??[]){
    if(!n.sprite)continue;
    const old=/^(Babcia|Dziadek)/.test(n.name),tex=n.female?old?'hd-babcia':'hd-kobieta':old?'hd-dziadek':'hd-wasacz';
    const model=residentModel(tex,n.id);if(model)out.push(visual(n.sprite,model,now,n.name));
  }
  for(const w of world.fixed?.list??[])if(w.id==='pies'&&w.sprite.active)out.push(visual(w.sprite,'pies',now,tr(PIES.imie)));
  return out;
}
/** The existing dialog names its speaker. Prefer its recorded position when names repeat. */
export function dialogueActor(scene:Phaser.Scene,people:Iterable<ResidentVisual>,title:string){
  const world=scene as World,anchor=world.rozmowca??world.player;if(!anchor)return undefined;
  const candidates=[...people],picked=lastPick.get(scene);
  if(picked&&performance.now()-picked.at<1000&&candidates.some(v=>v.actor===picked.actor&&v.name&&title.includes(v.name)))return picked.actor;
  return candidates.filter(v=>v.actor.active&&v.actor.visible&&v.name&&title.includes(v.name))
    .sort((a,b)=>Math.hypot(a.actor.x-anchor.x,a.actor.y-anchor.y)-Math.hypot(b.actor.x-anchor.x,b.actor.y-anchor.y))[0]?.actor;
}
