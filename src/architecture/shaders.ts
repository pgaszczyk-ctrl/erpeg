/** Raw palette RGB is deliberate: no tone mapping, sRGB transform, fog or specular light. */
export const BUILDING_VERTEX = /* glsl */`
attribute vec3 aTones;
attribute float aKind;
uniform vec4 uBounds;
uniform vec2 uProjection;
uniform vec2 uDepthRange;
varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vTones;
varying float vKind;
void main(){
  vec3 p=position;
  vec2 screen=vec2(p.x,p.y*uProjection.y-p.z);
  vec2 ndc=(screen-uBounds.xy)/uBounds.zw*2.0-1.0;
  float depth=(p.y+p.z*.7-uDepthRange.x)/uDepthRange.y;
  gl_Position=vec4(ndc.x,-ndc.y,1.0-depth*1.9,1.0);
  vNormal=normal;vUV=uv;vTones=aTones;vKind=aKind;
}`;
export const BUILDING_FRAGMENT = /* glsl */`
precision highp float;
uniform vec3 uPalette[16];
uniform float uPass;
varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vTones;
varying float vKind;
void main(){
  float light=dot(normalize(vNormal),normalize(vec3(-1.0,-1.0,2.0)));
  float tone=light<0.05?0.0:(light<0.65?1.0:2.0);
  // Tile courses never get denser than five native pixels, even on foreshortened roof slopes.
  float rowPixel=max(fwidth(vUV.y),0.0001);
  float rowSpacing=max(0.4,rowPixel*5.0);
  if(vKind>0.5&&vKind<1.5&&mod(vUV.y,rowSpacing)<rowPixel)tone=max(0.0,tone-1.0);
  if(vKind>4.5&&vKind<5.5){
    float row=floor(vUV.y/0.6);
    if(mod(vUV.y,0.6)<0.07||mod(vUV.x+mod(row,2.0)*0.6,1.2)<0.07)tone=max(0.0,tone-1.0);
  }
  if(vKind>5.5&&vKind<6.5&&mod(vUV.y,0.45)<0.06)tone=max(0.0,tone-1.0);
  int index=int(tone<0.5?vTones.x:(tone<1.5?vTones.y:vTones.z));
  vec3 color=vec3(0.0);
  for(int i=0;i<16;i++){if(i==index)color=uPalette[i];}
  // Separate ID buffer; alpha is always binary. Its depth texture shares the same geometry.
  gl_FragColor=uPass>0.5?vec4(1.0/255.0,0.0,0.0,1.0):vec4(color,1.0);
}`;
export const OUTLINE_VERTEX = /* glsl */`
varying vec2 vUV;
void main(){vUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const OUTLINE_FRAGMENT = /* glsl */`
precision highp float;
uniform sampler2D uColor;
uniform sampler2D uID;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec3 uInk;
uniform bool uOutline;
varying vec2 vUV;
void main(){
  vec4 color=texture2D(uColor,vUV);
  vec4 id=texture2D(uID,vUV);
  float depth=texture2D(uDepth,vUV).r;
  bool edge=false;
  for(int i=0;i<4;i++){
    vec2 offset=i==0?vec2(1.,0.):i==1?vec2(-1.,0.):i==2?vec2(0.,1.):vec2(0.,-1.);
    vec2 uv=vUV+offset*uTexel;
    vec4 other=texture2D(uID,uv);
    if(distance(id.rgb,other.rgb)>0.001&&(other.a<0.5||texture2D(uDepth,uv).r>depth+0.00001))edge=true;
  }
  gl_FragColor=uOutline&&id.a>0.5&&edge?vec4(uInk,1.0):color;
}`;
