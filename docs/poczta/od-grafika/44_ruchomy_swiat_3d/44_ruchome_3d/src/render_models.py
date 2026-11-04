import numpy as np, json,struct,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageFont
from scipy.spatial.transform import Rotation,Slerp
OUT=Path(__file__).resolve().parents[1]
class GLB:
 def __init__(self,path):
  b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];self.g=json.loads(b[20:20+n]);self.binary=b[28+n:];self.a={}
 def acc(self,idx):
  if idx in self.a:return self.a[idx]
  ac=self.g['accessors'][idx];v=self.g['bufferViews'][ac['bufferView']];dt={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}[ac['componentType']];d={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[ac['type']];a=np.frombuffer(self.binary,dtype=dt,count=ac['count']*d,offset=v.get('byteOffset',0)+ac.get('byteOffset',0)).reshape(-1,d)
  if ac.get('normalized'):a=a/255
  self.a[idx]=a;return a
 def transforms(self,clip='idle',time=0):
  ns=self.g['nodes'];T=[np.array(n.get('translation',[0,0,0]),float) for n in ns];Q=[np.array(n.get('rotation',[0,0,0,1]),float) for n in ns];S=[np.array(n.get('scale',[1,1,1]),float) for n in ns]
  anim=next((a for a in self.g.get('animations',[]) if a['name']==clip),None)
  if anim:
   for ch in anim['channels']:
    sampler=anim['samplers'][ch['sampler']];times=self.acc(sampler['input']).ravel();vals=self.acc(sampler['output']);t=min(time,times[-1]);i=np.clip(np.searchsorted(times,t,side='right')-1,0,len(times)-2);f=np.clip((t-times[i])/(times[i+1]-times[i]),0,1);node=ch['target']['node'];path=ch['target']['path'];a,b=vals[i],vals[i+1]
    if path=='rotation':
     if np.dot(a,b)<0:b=-b
     v=a*(1-f)+b*f;v=v/np.linalg.norm(v);Q[node]=v
    elif path=='translation':T[node]=a*(1-f)+b*f
    elif path=='scale':S[node]=a*(1-f)+b*f
  mats={}
  def run(i,parent):
   n=ns[i];local=np.eye(4);local[:3,:3]=Rotation.from_quat(Q[i]).as_matrix()@np.diag(S[i]);local[:3,3]=T[i]
   if 'matrix'in n:local=np.array(n['matrix']).reshape(4,4).T
   mats[i]=parent@local
   for c in n.get('children',[]):run(c,mats[i])
  for i in self.g['scenes'][self.g.get('scene',0)]['nodes']:run(i,np.eye(4))
  return mats
 def mesh(self,clip='idle',time=0):
  mats=self.transforms(clip,time);P=[];C=[]
  for i,n in enumerate(self.g['nodes']):
   if 'mesh' not in n:continue
   for prim in self.g['meshes'][n['mesh']]['primitives']:
    at=prim['attributes'];p=self.acc(at['POSITION']);c=self.acc(at['COLOR_0'])[:,:3] if 'COLOR_0'in at else np.ones_like(p);p=p@mats[i][:3,:3].T+mats[i][:3,3]
    if 'indices'in prim:idx=self.acc(prim['indices']).ravel();p=p[idx];c=c[idx]
    P.append(p.reshape(-1,3,3));C.append(c.reshape(-1,3,3).mean(axis=1))
  return np.concatenate(P),np.concatenate(C)
 def render(self,size=(320,360),angle=30,pitch=18,clip='idle',time=0,span=1.80):
  tris,col=self.mesh(clip,time);yaw=Rotation.from_euler('y',angle,degrees=True).as_matrix();tris=tris@yaw.T;tris-=np.array([0,.60,0]);pr=Rotation.from_euler('x',pitch,degrees=True).as_matrix();tris=tris@pr.T
  W,H=size;scale=H/span;xy=tris[:,:,:2]*[scale,-scale]+[W/2,H/2];z=tris[:,:,2]
  zbuf=np.full((H,W),-np.inf);rgba=np.zeros((H,W,4),dtype='u1')
  for p,depth,color in zip(xy,z,col):
   x0=max(0,int(np.floor(p[:,0].min())));x1=min(W-1,int(np.ceil(p[:,0].max())));y0=max(0,int(np.floor(p[:,1].min())));y1=min(H-1,int(np.ceil(p[:,1].max())))
   if x1<x0 or y1<y0:continue
   xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
   a,b,c=p;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-7:continue
   u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w=1-u-v;d=u*depth[0]+v*depth[1]+w*depth[2];buf=zbuf[y0:y1+1,x0:x1+1];mask=(u>=0)&(v>=0)&(w>=0)&(d>buf);buf[mask]=d[mask];target=rgba[y0:y1+1,x0:x1+1];target[mask,:3]=np.clip(color*255,0,255).astype('u1');target[mask,3]=255
  im=Image.fromarray(rgba);mask=im.getchannel('A');outline=mask.filter(ImageFilter.MaxFilter(3));bg=Image.new('RGBA',size,(0,0,0,0));bg.paste((30,26,36,255),(0,0,W,H),outline);bg.alpha_composite(im);return bg

def font(n,bold=False):return ImageFont.truetype(str(Path(__file__).parent/'fonts'/('DejaVuSans'+('-Bold' if bold else '')+'.ttf')),n)
def make_sheet():
 guard=GLB(OUT.parent/'referencja/straznik_chibi_wzorzec.glb');sk=GLB(OUT/'modele/szkielet.glb');wolf=GLB(OUT/'modele/wilk.glb')
 models=[('Strażnik / wzorzec',guard),('Szkielet',sk),('Wilk',wolf)];im=Image.new('RGB',(1400,850),'#eee7d5');d=ImageDraw.Draw(im)
 d.text((46,30),'EXP–LORE / RUCHOMY ŚWIAT',font=font(14,True),fill='#857351');d.text((46,60),'Ta sama gra. Różne sylwetki.',font=font(32,True),fill='#302936')
 for j,(label,m) in enumerate(models):
  x=35+j*450;d.rounded_rectangle((x,130,x+430,765),radius=16,fill='#e1dac8',outline='#c4b69b');d.text((x+20,150),label,font=font(23,True),fill='#302936')
  r=m.render((390,355),35,18);im.paste(r,(x+20,185),r)
  d.text((x+20,540),'PRZÓD             BOK                 TYŁ',font=font(11,True),fill='#867654')
  for k,a in enumerate([0,90,180]):
   r=m.render((125,145),a,20);im.paste(r,(x+20+k*130,560),r)
  d.text((x+20,725),'Wspólna skala • rzeczywisty model GLB',font=font(12),fill='#786d59')
 d.text((46,800),'Porównanie 44-G008 • aktualny wzorzec chibi • bez wdrożenia do gry',font=font(16),fill='#786d59');im.save(OUT/'plansza_modele.png')
if __name__=='__main__':make_sheet()
