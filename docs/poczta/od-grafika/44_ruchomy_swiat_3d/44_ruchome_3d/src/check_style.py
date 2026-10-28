from render_models import GLB,OUT
import numpy as np,json,hashlib

def metrics(m):
 mats=m.transforms('idle',0);nodes=m.g['nodes'];ids={n['name']:i for i,n in enumerate(nodes)};branch={ids['head']}
 def collect(i):
  for c in nodes[i].get('children',[]):branch.add(c);collect(c)
 collect(ids['head']);parts={}
 for i,n in enumerate(nodes):
  if 'mesh' not in n:continue
  p=np.concatenate([m.acc(pr['attributes']['POSITION']) for pr in m.g['meshes'][n['mesh']]['primitives']]);parts[i]=p@mats[i][:3,:3].T+mats[i][:3,3]
 p=np.concatenate(list(parts.values()));h=np.concatenate([p for i,p in parts.items() if i in branch]);low=p[:,1].min();height=p[:,1].max()-low;hip=mats[ids['hips']][1,3] if 'hips'in ids else max(parts[ids['thighL']][:,1]);return {'height':float(height),'head_fraction':float(np.ptp(h[:,1])/height),'hip_height_fraction':float((hip-low)/height),'foot_width_fraction':float(np.ptp(parts[ids['footL']][:,0])/height)}

names=['zombiak','bandyta','chochlik','wodnik','driada','herszt','mosiezny_koziol']+[x['id'] for x in json.loads((OUT/'mieszkancy_warianty.json').read_text())['looks']]
report={'reference':metrics(GLB(OUT.parent/'referencja/straznik_chibi_wzorzec.glb')),'models':{}}
for name in names:
 v=metrics(GLB(OUT/'modele'/f'{name}.glb'));report['models'][name]=v;assert v['head_fraction']>.47,(name,v);assert v['hip_height_fraction']<.29,(name,v);assert v['foot_width_fraction']>.12,(name,v)
old=json.loads((OUT/'preserved_G006_sha256.json').read_text())
for name in ['szkielet','wilk','upior_krypty','wodny_blob','warg']:assert hashlib.sha256((OUT/'modele'/f'{name}.glb').read_bytes()).hexdigest()==old[name],name
# The rescaled club strike must keep the boss standing on his feet.
m=GLB(OUT/'modele/herszt.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};t=m.transforms('slam',.82);i=ids['footL'];p=m.acc(m.g['meshes'][m.g['nodes'][i]['mesh']]['primitives'][0]['attributes']['POSITION']);p=p@t[i][:3,:3].T+t[i][:3,3];assert abs(p[:,1].min()-.003)<.01
assert (OUT.parent/'AGENTS.md').exists() and (OUT.parent/'referencja/STYL_CHIBI.md').exists()
p=OUT/'kontrola_modeli.json';r=json.loads(p.read_text());r['chibi_G008']=report;p.write_text(json.dumps(r,indent=2));print(json.dumps(report,indent=2))
