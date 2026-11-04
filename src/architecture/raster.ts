import * as THREE from 'three';
import { PALETTE } from './catalog';
import { BUILDING_VERTEX, BUILDING_FRAGMENT, OUTLINE_VERTEX, OUTLINE_FRAGMENT } from './shaders';
import type { BuildingMesh } from './types';

export interface Raster { pixels: Uint8ClampedArray; depth: Float32Array; width: number; height: number; x: number; y: number; projection: number; backend: string }
function bounds(mesh:BuildingMesh,projection:number,density:number){
  let x=Infinity,y=Infinity,x1=-Infinity,y1=-Infinity,minDepth=Infinity,maxDepth=-Infinity;
  for(let i=0;i<mesh.positions.length;i+=3){
    const [a,b,z]=mesh.positions.subarray(i,i+3),sx=a,sy=b*projection-z,depth=b+z*.7;
    x=Math.min(x,sx);x1=Math.max(x1,sx);y=Math.min(y,sy);y1=Math.max(y1,sy);minDepth=Math.min(minDepth,depth);maxDepth=Math.max(maxDepth,depth);
  }
  x=Math.floor(x*density-2)/density;y=Math.floor(y*density-2)/density;
  return {x,y,width:Math.ceil((x1-x)*density+2),height:Math.ceil((y1-y)*density+2),minDepth,maxDepth};
}
/** One worker-owned GL context. Targets are reused; readback happens once per cached building. */
export class BuildingRasterizer {
  private renderer:THREE.WebGLRenderer;
  private geometry=new THREE.BufferGeometry();
  private material:THREE.ShaderMaterial;
  private scene=new THREE.Scene();
  private camera=new THREE.Camera();
  private color:THREE.WebGLRenderTarget;
  private ids:THREE.WebGLRenderTarget;
  private output:THREE.WebGLRenderTarget;
  private postScene=new THREE.Scene();
  private post:THREE.ShaderMaterial;
  constructor(){
    const canvas=new OffscreenCanvas(8,8);
    this.renderer=new THREE.WebGLRenderer({canvas:canvas as unknown as HTMLCanvasElement,alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.LinearSRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
    this.renderer.setClearColor(0,0);
    const target=()=>new THREE.WebGLRenderTarget(8,8,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true});
    this.color=target();this.ids=target();this.output=target();
    this.ids.depthTexture=new THREE.DepthTexture(8,8,THREE.UnsignedIntType);
    this.material=new THREE.ShaderMaterial({vertexShader:BUILDING_VERTEX,fragmentShader:BUILDING_FRAGMENT,side:THREE.DoubleSide,uniforms:{
      uBounds:{value:new THREE.Vector4()},uProjection:{value:new THREE.Vector2(1,1)},uDepthRange:{value:new THREE.Vector2()},
      uPalette:{value:PALETTE.map(c=>new THREE.Vector3(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255) as [number,number,number]))},uPass:{value:0},
    }});
    this.material.toneMapped=false;
    this.scene.add(new THREE.Mesh(this.geometry,this.material));
    this.post=new THREE.ShaderMaterial({vertexShader:OUTLINE_VERTEX,fragmentShader:OUTLINE_FRAGMENT,depthTest:false,depthWrite:false,uniforms:{
      uColor:{value:this.color.texture},uID:{value:this.ids.texture},uDepth:{value:this.ids.depthTexture},uTexel:{value:new THREE.Vector2()},
      uInk:{value:new THREE.Vector3(30/255,26/255,36/255)},uOutline:{value:true},
    }});
    this.post.toneMapped=false;
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.post));
  }
  render(mesh:BuildingMesh,density:number,projection:number,outline:boolean):Raster{
    const b=bounds(mesh,projection,density);
    // A real geometry cap is handled by the planner/LOD, never silently rescale the model.
    if(b.width>4096||b.height>4096)throw new Error(`Budynek przekracza limit targetu: ${b.width}×${b.height}`);
    this.geometry.dispose();this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));
    this.geometry.setAttribute('normal',new THREE.BufferAttribute(mesh.normals,3));
    this.geometry.setAttribute('uv',new THREE.BufferAttribute(mesh.uv,2));
    this.geometry.setAttribute('aTones',new THREE.BufferAttribute(mesh.tones,3));
    this.geometry.setAttribute('aKind',new THREE.BufferAttribute(mesh.kinds,1));
    (this.scene.children[0] as THREE.Mesh).geometry=this.geometry;
    (this.scene.children[0] as THREE.Mesh).frustumCulled=false;
    for(const t of [this.color,this.ids,this.output])t.setSize(b.width,b.height);
    this.material.uniforms.uBounds.value.set(b.x,b.y,b.width/density,b.height/density);
    this.material.uniforms.uProjection.value.set(1,projection);
    this.material.uniforms.uDepthRange.value.set(b.minDepth-1,b.maxDepth-b.minDepth+2);
    this.post.uniforms.uTexel.value.set(1/b.width,1/b.height);this.post.uniforms.uOutline.value=outline;
    this.material.uniforms.uPass.value=0;
    this.renderer.setRenderTarget(this.color);this.renderer.clear();this.renderer.render(this.scene,this.camera);
    this.material.uniforms.uPass.value=1;
    this.renderer.setRenderTarget(this.ids);this.renderer.clear();this.renderer.render(this.scene,this.camera);
    this.renderer.setRenderTarget(this.output);this.renderer.clear();this.renderer.render(this.postScene,this.camera);
    const raw=new Uint8Array(b.width*b.height*4);this.renderer.readRenderTargetPixels(this.output,0,0,b.width,b.height,raw);
    const packed=new Uint8Array(raw.length);this.renderer.readRenderTargetPixels(this.ids,0,0,b.width,b.height,packed);
    const pixels=new Uint8ClampedArray(raw.length),depth=new Float32Array(b.width*b.height).fill(-Infinity);
    for(let y=0;y<b.height;y++){
      pixels.set(raw.subarray((b.height-1-y)*b.width*4,(b.height-y)*b.width*4),y*b.width*4);
      for(let x=0;x<b.width;x++){
        const src=((b.height-1-y)*b.width+x)*4,dst=y*b.width+x;
        if(packed[src+3])depth[dst]=b.minDepth-1+(packed[src+1]*256+packed[src+2])/65535*(b.maxDepth-b.minDepth+2);
      }
    }
    return {pixels,depth,width:b.width,height:b.height,x:b.x,y:b.y,projection,backend:'WebGL2 / toon + ID/depth'};
  }
  dispose(){this.geometry.dispose();this.material.dispose();this.post.dispose();this.color.dispose();this.ids.dispose();this.output.dispose();this.renderer.dispose();}
}

/** Same triangle/depth/ramp rules on devices without worker WebGL. Explicitly reported, not a flat placeholder. */
export function softwareRaster(mesh:BuildingMesh,density:number,projection:number,outline:boolean):Raster{
  const b=bounds(mesh,projection,density),n=b.width*b.height,pixels=new Uint8ClampedArray(n*4),depth=new Float32Array(n).fill(-Infinity);
  if(n>16_777_216)throw new Error('Budynek przekracza limit programowego targetu');
  const palette=PALETTE.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
  const l=Math.sqrt(6);
  for(let i=0;i<mesh.positions.length;i+=9){
    const vertices=[];
    for(let j=0;j<3;j++){
      const at=i+j*3,[x,y,z]=mesh.positions.subarray(at,at+3);
      vertices.push({x:(x-b.x)*density,y:(y*projection-z-b.y)*density,z:y+z*.7,u:mesh.uv[(at/3)*2],v:mesh.uv[(at/3)*2+1]});
    }
    const [a,c,d]=vertices,den=(c.y-d.y)*(a.x-d.x)+(d.x-c.x)*(a.y-d.y);if(Math.abs(den)<1e-9)continue;
    const x0=Math.max(0,Math.floor(Math.min(a.x,c.x,d.x))),x1=Math.min(b.width-1,Math.ceil(Math.max(a.x,c.x,d.x)));
    const y0=Math.max(0,Math.floor(Math.min(a.y,c.y,d.y))),y1=Math.min(b.height-1,Math.ceil(Math.max(a.y,c.y,d.y)));
    const light=(-mesh.normals[i]-mesh.normals[i+1]+2*mesh.normals[i+2])/l;
    const base=light<.05?0:light<.65?1:2;
    const dvx=((a.v-d.v)*(c.y-d.y)+(c.v-d.v)*(d.y-a.y))/den;
    const dvy=((a.v-d.v)*(d.x-c.x)+(c.v-d.v)*(a.x-d.x))/den;
    const rowPixel=Math.max(Math.abs(dvx)+Math.abs(dvy),.0001),rowSpacing=Math.max(.4,rowPixel*5);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const aa=((c.y-d.y)*(x+.5-d.x)+(d.x-c.x)*(y+.5-d.y))/den;
      const cc=((d.y-a.y)*(x+.5-d.x)+(a.x-d.x)*(y+.5-d.y))/den,dd=1-aa-cc;
      if(aa<0||cc<0||dd<0)continue;
      const z=aa*a.z+cc*c.z+dd*d.z,k=y*b.width+x;if(z<depth[k])continue;depth[k]=z;
      let tone=base;
      const v=aa*a.v+cc*c.v+dd*d.v;
      if(mesh.kinds[i/3]===1&&((v%rowSpacing)+rowSpacing)%rowSpacing<rowPixel)tone=Math.max(0,tone-1);
      const kind=mesh.kinds[i/3],u=aa*a.u+cc*c.u+dd*d.u,mod=(n:number,d:number)=>((n%d)+d)%d;
      if(kind===5&&(mod(v,.6)<.07||mod(u+mod(Math.floor(v/.6),2)*.6,1.2)<.07))tone=Math.max(0,tone-1);
      if(kind===6&&mod(v,.45)<.06)tone=Math.max(0,tone-1);
      const index=mesh.tones[i+tone],color=palette[index]??palette[0];pixels.set([...color,255],k*4);
    }
  }
  if(outline){const copy=pixels.slice();for(let y=1;y<b.height-1;y++)for(let x=1;x<b.width-1;x++){
    const k=y*b.width+x;if(copy[k*4+3]&&[k-1,k+1,k-b.width,k+b.width].some(q=>!copy[q*4+3]&&depth[q]<depth[k]))pixels.set([...palette[0],255],k*4);
  }}
  return {pixels,depth,width:b.width,height:b.height,x:b.x,y:b.y,projection,backend:'software / toon + ID/depth'};
}
