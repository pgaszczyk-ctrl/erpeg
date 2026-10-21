export function calibratedScale(config){
 const {walkSpeedGameMps:v,referenceDistanceRealM:d,targetTravelSeconds:t}=config;
 if(!(v>0&&d>0&&t>0))throw Error('Invalid scale calibration');
 const realToGame=v*t/d;
 return {...config,realToGame,denominator:1/realToGame,referenceGameM:d*realToGame,modelTravelSeconds:d*realToGame/v};
}
export function rescaleWorld(world,scale){
 const ratio=scale.realToGame/(world.config?.realToGame||.1);
 const point=p=>p.map(v=>v*ratio);
 const coords=p=>typeof p[0]==='number'?point(p):p.map(coords);
 return {config:{...world.config,realToGame:scale.realToGame,layoutVersion:scale.version},scale,center:point(world.center),
 roads:world.roads.map(r=>({...r,points:r.points.map(point)})),
 buildings:world.buildings.map(b=>({...b,pos:point(b.pos),rings:coords(b.rings),w:b.w*ratio,d:b.d*ratio,area:b.area*ratio*ratio})),
 terrain:world.terrain.map(t=>({...t,geometry:{...t.geometry,coordinates:coords(t.geometry.coordinates)}}))};
}
