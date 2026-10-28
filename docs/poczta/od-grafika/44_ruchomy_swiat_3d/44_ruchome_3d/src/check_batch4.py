from render_models import GLB,OUT
from build_batch4 import LOOKS,NAMES
import json,hashlib,numpy as np

old=json.loads((OUT/'preserved_G006_sha256.json').read_text())
for name,h in old.items():
 if name in ['chochlik','bandyta','zombiak','wodnik','driada','herszt','mosiezny_koziol']:
  assert GLB(OUT/'modele'/f'{name}.glb').g['extras'].get('chibiStylePass'),name
 else:assert hashlib.sha256((OUT/'modele'/f'{name}.glb').read_bytes()).hexdigest()==h,(name,'unrequested change')
report={'baseline':'G008 explicitly corrects seven humanoids; others unchanged','six_body_families':sorted(set(x[2] for x in LOOKS)),'looks':{}}
for spec in LOOKS:
 name=spec[0];m=GLB(OUT/'modele'/f'{name}.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};extras=m.g['extras']
 assert len(ids)==len(m.g['nodes']);assert set(extras['paletteGroups'])=={'skin','hair','clothes_1','clothes_2','leather','metal'}
 assert any(ids['Umbrella'] in n.get('children',[]) for n in [m.g['nodes'][ids['R_at_hand_grip']]])
 for clip in ['idle','walk','talk','rain']:
  a=next(a for a in m.g['animations'] if a['name']==clip);dur=max(float(m.acc(s['input'])[-1,0]) for s in a['samplers']);p0,_=m.mesh(clip,0);p1,_=m.mesh(clip,dur);assert np.max(abs(p1-p0))<1e-5,(name,clip,'open loop')
 idle=m.transforms('idle',0);rain=m.transforms('rain',.35);assert np.linalg.norm(idle[ids['Umbrella']][:3,:3])<1e-6;assert np.linalg.norm(rain[ids['Umbrella']][:3,0])>.99
 shaft=rain[ids['Umbrella']][:3,1];assert shaft[1]>.94,(name,'umbrella too tilted',shaft)
 wave=m.transforms('wave',1.2);height=float(wave[ids['handR']][1,3]-wave[ids['upperR']][1,3]);assert height>.06,(name,'wave hand not raised',height)
 report['looks'][name]={'family':extras['bodyFamily'],'loop_clips_closed':True,'umbrella_hidden_and_hand_attached':True,'wave_hand_above_shoulder':height}
m=GLB(OUT/'modele/pies.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};start=m.transforms('sit',0);end=m.transforms('sit',1.45)
assert set(a['name'] for a in m.g['animations'])=={'idle','walk','sit','wag'}
# Sitting changes rump relative to fore shoulders, not just root translation.
delta0=start[ids['backL']][1,3]-start[ids['frontL']][1,3];delta1=end[ids['backL']][1,3]-end[ids['frontL']][1,3];assert delta1<delta0-.18
assert abs(end[ids['frontL_paw']][1,3]-end[ids['backL_paw']][1,3])<.01
wag0=m.transforms('wag',.175)[ids['tail']];wag1=m.transforms('wag',.525)[ids['tail']];assert np.linalg.norm(wag0-wag1)>.5
p0,_=m.mesh('wag',0);p1,_=m.mesh('wag',1.4);assert np.max(abs(p1-p0))<1e-5
report['dog']={'sit_rump_drop_relative_to_shoulders':float(delta1-delta0),'tail_wags':True,'wag_loop_closed':True}
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['batch4']=report;p.write_text(json.dumps(data,indent=2));print(json.dumps({'body_families':6,'looks':15,'dog':'PASS','prior_models':'authorized style corrections checked'}))
