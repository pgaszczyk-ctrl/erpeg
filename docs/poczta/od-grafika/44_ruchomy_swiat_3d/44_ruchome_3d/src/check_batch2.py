from render_models import GLB,OUT
import numpy as np,json,hashlib
accepted={'szkielet':'27bbd95a556e9278432b1c9e0c300e757ed88cd33da0eeabcb2a83df2bb0e74c','wilk':'02c154e43a2f997a736820781e96fac0440f7935320f6e05bcaf1c7cadf3a49a'}
for name,h in accepted.items():assert hashlib.sha256((OUT/'modele'/f'{name}.glb').read_bytes()).hexdigest()==h,(name,'approved file changed')
report={'accepted_models_unchanged':accepted}
# The held acorn vanishes on release; projectile creation belongs to the game.
m=GLB(OUT/'modele/chochlik.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};before=m.transforms('throw',.54)[ids['Acorn_prop']];after=m.transforms('throw',.64)[ids['Acorn_prop']]
assert np.linalg.norm(before[:3,0])>.99
assert np.linalg.norm(after[:3,:3])<1e-6
origin=m.transforms('throw',.58)[ids['ThrowOrigin']][:3,3];assert np.isfinite(origin).all()
report['chochlik']={'release_seconds':.58,'held_prop_visible_before_release':True,'held_prop_hidden_after_release':True,'release_origin_world':origin.tolist(),'projectile_not_baked':True}
# Verify the export keeps the dagger parented to the same moving hand.
m=GLB(OUT/'modele/bandyta.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};gap=0;positions=[]
for t in np.linspace(0,1.2,70):
 mats=m.transforms('attack',t);grip=mats[ids['R_at_hand_grip']];weapon=mats[ids['Weapon_dagger']];gap=max(gap,float(abs(grip-weapon).max()));positions.append(grip[:3,3])
assert gap<1e-7
travel=float(np.linalg.norm(np.ptp(positions,axis=0)));assert travel>.15
report['bandyta']={'sampled_attack_poses':70,'dagger_grip_matrix_error':gap,'hand_motion_extent':travel}
# The two feet intentionally have different recovery heights.
m=GLB(OUT/'modele/zombiak.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};l=[];r=[]
for t in np.linspace(0,1.2,100):
 mats=m.transforms('walk',t);root=mats[0][1,3];l.append(float(mats[ids['footL']][1,3]-root));r.append(float(mats[ids['footR']][1,3]-root))
left=max(l)-min(l);right=max(r)-min(r);assert left>right*1.8
report['zombiak']={'left_foot_recovery_range':left,'dragging_right_foot_recovery_range':right}
# The ghost stays above the plane while alive and collapses to a cloth-like heap.
m=GLB(OUT/'modele/upior_krypty.glb');ids={n['name']:i for i,n in enumerate(m.g['nodes'])};minHover=10
for clip,duration in [('idle',2.8),('walk',1.4)]:
 for t in np.linspace(0,duration,48):
  p,_=m.mesh(clip,t);minHover=min(minHover,float(p[:,:,1].min()))
assert minHover>.06
p,_=m.mesh('death',1.7);height=float(p[:,:,1].max()-p[:,:,1].min());assert height<.35
idle=m.transforms('idle',0)[ids['handL']][1,3];raised=m.transforms('scream',.60)[ids['handL']][1,3];assert raised-idle>.1
report['upior_krypty']={'minimum_hover_gap':minHover,'death_heap_height':height,'scream_hand_raise':float(raised-idle)}
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['batch2']=report;p.write_text(json.dumps(data,indent=2));print(json.dumps(report,indent=2))
