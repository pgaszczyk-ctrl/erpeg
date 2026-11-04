from render_models import GLB,OUT,font
from pathlib import Path
import numpy as np,json,struct
from PIL import Image,ImageDraw
results={}
for name in [n for n in json.loads((OUT/'manifest.json').read_text()) if n!='notes']:
 m=GLB(OUT/'modele'/f'{name}.glb');g=m.g;issues=[];mins=[];maxs=[];verts=0;badnorm=0
 for mesh in g['meshes']:
  for prim in mesh['primitives']:
   p=m.acc(prim['attributes']['POSITION']);n=m.acc(prim['attributes']['NORMAL']);c=m.acc(prim['attributes']['COLOR_0']);verts+=len(p)
   assert len(p)==len(n)==len(c)
   assert np.isfinite(p).all() and np.isfinite(n).all()
   assert np.max(np.abs(np.linalg.norm(n,axis=1)-1))<1e-5
   assert ((c>=0)&(c<=1)).all()
   tri=p.reshape(-1,3,3);area=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1);assert area.min()>1e-10
   gn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);gn=gn/np.linalg.norm(gn,axis=1)[:,None];badnorm+=int((np.sum(gn*n.reshape(-1,3,3)[:,0],axis=1)<.99).sum())
 assert badnorm==0,(name,badnorm)
 clips={}
 for a in g['animations']:
  duration=0
  for sampler in a['samplers']:
   t=m.acc(sampler['input']).ravel();out=m.acc(sampler['output']);assert len(t)==len(out);assert (np.diff(t)>0).all();assert np.isfinite(out).all();duration=max(duration,float(t[-1]))
  minY=100;maxY=-100
  for time in np.linspace(0,duration,80):
   tris,c=m.mesh(a['name'],time);assert np.isfinite(tris).all();minY=min(minY,float(tris[:,:,1].min()));maxY=max(maxY,float(tris[:,:,1].max()))
  assert minY>-.004,(name,a['name'],minY)
  loop_error=None
  if a['name'] in ['idle','walk']:
   p0,_=m.mesh(a['name'],0);p1,_=m.mesh(a['name'],duration);loop_error=float(abs(p1-p0).max());assert loop_error<1e-5
  clips[a['name']]={'duration':duration,'sampled_poses':80,'lowest_y':minY,'highest_y':maxY,'loop_max_delta':loop_error}
 results[name]={'triangles':verts//3,'normal_winding_errors':badnorm,'clips':clips,'status':'PASS'}
(OUT/'kontrola_modeli.json').write_text(json.dumps({'method':'Internal structural and geometric checks; not the Khronos validator','results':results,'not_tested':['Real browser WebGL: browser binary unavailable and download failed','Mobile GPU performance','Integration with game logic','Multi-character animation batching in game']},indent=2))
print(json.dumps({n:{'tris':v['triangles'],'status':v['status']} for n,v in results.items()}))
# Contact sheet: assess death/attack poses and reading at 54 px human height.
im=Image.new('RGB',(1320,840),'#eee7d5');d=ImageDraw.Draw(im)
for row,name in enumerate(['szkielet','wilk']):
 m=GLB(OUT/'modele'/f'{name}.glb')
 for col,(clip,t) in enumerate([('walk',.20),('attack',.47),('attack',.65),('death',1.25)]):
  r=m.render((310,310),35,30,clip,min(t,1.2 if name=='szkielet' and clip=='death' else t));im.paste(r,(col*330,row*420),r);d.text((col*330+10,row*420+315),f'{name} / {clip} / {t:.2f}s',font=font(13),fill='#302936')
  small=m.render((80,78),35,45,clip,t);small=small.resize((80,78));im.paste(small,(col*330+120,row*420+340),small)
im.save(OUT/'kontrola_pozy.png')
