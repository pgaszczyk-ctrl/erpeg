"""G008 shape correction. Read project AGENTS.md and STYL_CHIBI.md first."""
import numpy as np
from scipy.spatial.transform import Rotation
from build_models import unit

def local_shape(s,i,f):
 f=np.array(f,float);m=s.meshes[i];m.v=[v*f for v in m.v];m.n=[unit(n/f) for n in m.n]
 for child in s.nodes[i].get('children',[]):
  s.nodes[child]['translation']=(np.array(s.nodes[child]['translation'])*f).tolist()
  for clip in s.clips.values():
   if child in clip['channels']:clip['channels'][child]['translation']=[np.array(t)*f for t in clip['channels'][child]['translation']]

def branch(s,i,f):
 local_shape(s,i,f)
 for child in s.nodes[i].get('children',[]):branch(s,child,f)

def ground(s):
 verts={i:np.array(m.v) for i,m in s.meshes.items() if m.v}
 for clip in s.clips.values():
  for k in range(len(clip['times'])):
   mats=[]
   for i,n in enumerate(s.nodes):
    c=clip['channels'].get(i,{});q=c['rotation'][k] if 'rotation' in c else n.get('rotation',[0,0,0,1]);z=c['scale'][k] if 'scale' in c else n.get('scale',[1,1,1]);t=c['translation'][k] if 'translation' in c else n.get('translation',[0,0,0]);a=np.eye(4);a[:3,:3]=Rotation.from_quat(q).as_matrix()@np.diag(z);a[:3,3]=t;mats.append(mats[s.parents[i]]@a if i in s.parents else a)
   lo=min((p@mats[i][:3,:3].T+mats[i][:3,3])[:,1].min() for i,p in verts.items());clip['channels'][0]['translation'][k][1]+=clip.get('ground_min',[.003]*len(clip['times']))[k]-lo
 return s

def chibify(s):
 assert not s.extra.get('chibiStylePass'),'Do not apply twice'
 assert s.name in ['chochlik','bandyta','zombiak','wodnik','driada','herszt','mosiezny_koziol']
 local_shape(s,s.find('hips'),[1.35,1,1.05]);local_shape(s,s.find('torso'),[1.28,.84,1.04]);branch(s,s.find('head'),[1.17,1.17,1.10])
 for side in ['L','R']:
  for name,f in [('upper',[1.35,.78,1.20]),('fore',[1.35,.78,1.20]),('hand',[1.55,1.35,1.40]),('thigh',[1.50,.52,1.25]),('shin',[1.45,.52,1.25]),('foot',[1.75,1.20,1.45])]:local_shape(s,s.find(name+side),f)
 hip=s.find('hips');old=np.array(s.nodes[hip]['translation']);new=old.copy();new[1]*=.64;s.nodes[hip]['translation']=new.tolist()
 for c in s.clips.values():c['channels'][hip]['translation']=[np.array(p)+new-old for p in c['channels'][hip]['translation']]
 s.extra['revision']='44-G008';s.extra['chibiStylePass']={'reference':'referencja/straznik_chibi_wzorzec.glb','headScale':[1.17,1.17,1.10],'legLengthFactor':.52,'widerStance':1.35,'largerHandsAndFeet':True,'previousProfileDepthPreserved':True,'method':'Anatomy and joint-rest offsets baked; same action clocks and root Z trajectories'}
 return ground(s)
