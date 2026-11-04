import { buildingMesh } from './mesh';
import { planArchitecture } from './planner';
import { BuildingRasterizer, softwareRaster } from './raster';
import type { BuildingPlan, PlanInput } from './types';

let rasterizer:BuildingRasterizer|undefined,unavailable=false;
const cache=new Map<string,ReturnType<typeof softwareRaster>>();let bytes=0;
const MAX_BYTES=16*1024*1024;
self.onmessage=(event:MessageEvent<{id:number;input:PlanInput}|{id:number;building:BuildingPlan;density:number;projection:number;outline:boolean;lod:number}>)=>{
  const m=event.data;
  try{
    if('input'in m){(self as unknown as Worker).postMessage({id:m.id,result:planArchitecture(m.input)});return;}
    const key=JSON.stringify([m.building.id,m.building.decision.style,m.building.rectangles,m.building.connectors,m.building.center,m.building.door,m.building.angle,m.building.levels,m.building.wallHeight,m.building.openings,m.building.roofHeight,m.building.roof,m.building.palette,m.density,m.projection,m.outline,m.lod]);
    let raster=cache.get(key);
    if(!raster){
      if(!rasterizer&&!unavailable)try{rasterizer=new BuildingRasterizer();}catch{unavailable=true;}
      const mesh=buildingMesh(m.building,m.lod);
      try{raster=rasterizer?rasterizer.render(mesh,m.density,m.projection,m.outline):softwareRaster(mesh,m.density,m.projection,m.outline);}
      catch(error){if(!rasterizer)throw error;rasterizer.dispose();rasterizer=undefined;unavailable=true;raster=softwareRaster(mesh,m.density,m.projection,m.outline);}
      cache.set(key,raster);bytes+=raster.pixels.byteLength+raster.depth.byteLength;
      while(bytes>MAX_BYTES&&cache.size>1){const first=cache.keys().next().value!;bytes-=cache.get(first)!.pixels.byteLength+cache.get(first)!.depth.byteLength;cache.delete(first);}
    }
    const pixels=raster.pixels.slice(),depth=raster.depth.slice();(self as unknown as Worker).postMessage({id:m.id,raster:{...raster,pixels,depth}},[pixels.buffer,depth.buffer]);
  }catch(error){(self as unknown as Worker).postMessage({id:m.id,error:error instanceof Error?error.message:String(error)});}
};
