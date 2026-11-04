from render_models import GLB,OUT
import json,numpy as np
m=GLB(OUT/'modele/wilk.glb');g=m.g;names={n['name']:i for i,n in enumerate(g['nodes'])};result={}
for clip in ['attack','lunge']:
 ts=np.linspace(0,1.25,121);heights=[];zs=[];pawHeights=[]
 for t in ts:
  mats=m.transforms(clip,t);tris,_=m.mesh(clip,t);heights.append(float(tris[:,:,1].min()));zs.append(float(mats[0][2,3]));pawHeights.append([float(mats[names[x+'_paw']][1,3]) for x in ['frontL','frontR','backL','backR']])
 assert min(heights)>-.004
 assert max(heights)>.21
 airborne=[i for i,t in enumerate(ts) if .61<t<.79]
 assert min(heights[i] for i in airborne)>.16
 assert min(min(pawHeights[i]) for i in airborne)>.20
 assert max(heights[-8:])<.015
 if clip=='attack':assert abs(zs[-1])<1e-7
 else:
  assert abs(zs[-1]-.44)<1e-6
  assert min(np.diff(zs))>=-1e-7
 result[clip]={'sampled_poses':len(ts),'maximum_lowest_vertex_y':max(heights),'all_four_paws_airborne':True,'minimum_paw_height_midflight':min(min(pawHeights[i]) for i in airborne),'forward_distance':zs[-1],'settled_minimum_y':heights[-1]}
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['wolf_jump_v3']=result;p.write_text(json.dumps(data,indent=2));print(json.dumps(result,indent=2))
