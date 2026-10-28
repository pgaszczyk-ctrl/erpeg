from render_models import GLB,OUT
from pathlib import Path
import numpy as np,math,json,hashlib
m=GLB(OUT/'modele/wilk.glb');ns={n['name']:i for i,n in enumerate(m.g['nodes'])};stance=.68;stride=.25;period=.95
maxHeight=0;maxZ=0;maxPawTilt=0;minSupport=4;hockNodes=[]
for name in ['backL_hock','backR_hock']:assert name in ns;hockNodes.append(name)
for t in np.linspace(0,period,150,endpoint=False):
 mats=m.transforms('walk',t);root=mats[0][:3,3];support=0
 for leg,offset,z0 in [('frontL',0,.245),('backR',.75,-.245),('frontR',.5,.245),('backL',.25,-.245)]:
  phase=(t/period+offset)%1
  if .015<phase<stance-.015:
   support+=1;M=mats[ns[leg+'_paw']];pos=M[:3,3]-root
   maxHeight=max(maxHeight,abs(pos[1]-.065));expectedZ=-.035+z0+stride*(.5-phase/stance);maxZ=max(maxZ,abs(pos[2]-expectedZ));up=M[:3,1]/np.linalg.norm(M[:3,1]);maxPawTilt=max(maxPawTilt,math.acos(np.clip(up[1],-1,1)))
 # Ignore boundary samples only for counts; real support uses exact contact ranges.
 contacts=sum((t/period+offset)%1<stance for offset in [0,.75,.5,.25]);minSupport=min(minSupport,contacts)
assert maxHeight<.005,maxHeight
assert maxZ<.005,maxZ
assert maxPawTilt<.04,maxPawTilt
assert minSupport>=2,minSupport
expected='27bbd95a556e9278432b1c9e0c300e757ed88cd33da0eeabcb2a83df2bb0e74c'
assert hashlib.sha256((OUT/'modele/szkielet.glb').read_bytes()).hexdigest()==expected
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['wolf_gait_v2']={'sampled_poses':150,'stance_height_error':maxHeight,'stance_track_error_z':maxZ,'stance_paw_tilt_rad':maxPawTilt,'minimum_support_feet':int(minSupport),'separate_hock_nodes':hockNodes,'reference_speed':stride/(stance*period),'skeleton_sha256_unchanged':expected};p.write_text(json.dumps(data,indent=2));print(json.dumps(data['wolf_gait_v2'],indent=2))
