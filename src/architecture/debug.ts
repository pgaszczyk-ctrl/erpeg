import { DEFAULT_SETTINGS, type Settings } from './types';
export interface DebugSettings extends Settings { enabled:boolean; overlay:boolean }
export function debugSettings():DebugSettings{
  const q=new URLSearchParams(location.search),scale=Number(q.get('BUILDING_SCALE')??q.get('buildingScale')??2);
  const angle=q.get('ANGLE_SNAP')??'22.5';
  return {...DEFAULT_SETTINGS,enabled:q.get('arch')==='1',scale:Number.isFinite(scale)?Math.max(1,Math.min(3,scale)):2,
    angleSnap:angle==='off'||angle==='0'?0:22.5,outline:q.get('OUTLINE')!=='0',overlay:q.get('styles')==='1',decorations:q.get('decorations')!=='0'};
}
