from render_models import GLB,OUT
import json,hashlib,numpy as np
old=json.loads((OUT/'preserved_G005_sha256.json').read_text())
for name,h in old.items():
 if name in ['chochlik','bandyta','zombiak','wodnik','driada','herszt','mosiezny_koziol']:
  assert GLB(OUT/'modele'/f'{name}.glb').g['extras'].get('chibiStylePass'),name
 else:assert hashlib.sha256((OUT/'modele'/f'{name}.glb').read_bytes()).hexdigest()==h,(name,'unrequested change')
report={'baseline_hashes_before_G008':old}
# New casting geometry is normally hidden and becomes visible only during casting.
for name,prop,socket,release in [('wodnik','WaterOrb','WaterOrigin',.76),('driada','Vine_focus','VineOrigin',.76)]:
 m=GLB(OUT/'modele'/f'{name}.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};idle=m.transforms('idle',0);cast=m.transforms('cast',.52);assert np.linalg.norm(idle[ids[prop]][:3,:3])<1e-6;assert np.linalg.norm(cast[ids[prop]][:3,0])>.5
 origin=m.transforms('cast',release)[ids[socket]][:3,3];assert np.isfinite(origin).all();assert origin[2]>.1,(name,'cast origin should be in front');report[name]={'cast_release':release,'origin':socket,'origin_world':origin.tolist(),'focus_hidden_outside_cast':True}
m=GLB(OUT/'modele/wodny_blob.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};assert not any('foot' in n or 'shin' in n for n in ids)
for t in np.linspace(0,.72,20):
 a=m.transforms('walk',t);b=m.transforms('wobble',t);assert max(abs(a[i]-b[i]).max() for i in a)<1e-8
p,_=m.mesh('death',1);height=float(p[:,:,1].max()-p[:,:,1].min());assert height<.08;report['blob']={'no_leg_rig':True,'walk_wobble_alias':True,'puddle_height':height}
m=GLB(OUT/'modele/herszt.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};assert 'throw' not in [a['name'] for a in m.g['animations']];mats=m.transforms('slam',.82);grip=mats[ids['R_at_hand_grip']];club=mats[ids['Club']];offset=np.linalg.inv(grip)@club;assert np.allclose(offset[:3,3],[0,0,.029],atol=1e-6)
impact=float(mats[ids['SlamOrigin']][1,3]);assert impact<.14,impact;report['herszt']={'club_attached_to_grip':True,'slam_origin_y_at_impact':impact}
m=GLB(OUT/'modele/warg.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};a=m.transforms('pounce',1.25);assert abs(a[0][2,3]-.5192)<1e-6
p,_=m.mesh('pounce',.70);assert p[:,:,1].min()>.23
for t in np.linspace(0,1.05,12):assert max(abs(m.transforms('bite',t)[i]-m.transforms('attack',t)[i]).max() for i in ids.values())<1e-8
report['warg']={'grounded_bite_and_jump_distinct':True,'pounce_forward_distance':float(a[0][2,3]),'midflight_ground_gap':float(p[:,:,1].min())}
m=GLB(OUT/'modele/mosiezny_koziol.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};zs=[float(m.transforms('charge',t)[0][2,3]) for t in np.linspace(0,1.5,80)];assert abs(zs[-1]-.72)<1e-6;assert min(np.diff(zs))>=-1e-7
up=m.transforms('stomp',.48);down=m.transforms('stomp',.70);raiseDiff=float(up[ids['footR']][1,3]-up[ids['footL']][1,3]);landDiff=float(abs(down[ids['footR']][1,3]-down[ids['footL']][1,3]));assert raiseDiff>.055,raiseDiff;assert landDiff<.02,landDiff
report['koziol']={'charge_forward_distance':zs[-1],'charge_monotonic':True,'stomp_raised_foot_difference':raiseDiff,'stomp_landed_foot_difference':landDiff}
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['batch3']=report;p.write_text(json.dumps(data,indent=2));print(json.dumps(report,indent=2))
