from pathlib import Path
from render_models import GLB,OUT
import json,numpy as np
samples=json.load(open(Path(__file__).parent/'js_poses.json'));maxerr=0;count=0
for name,ch in samples.items():
 m=GLB(OUT/'modele'/f'{name}.glb')
 for key,matrices in ch.items():
  clip,t=key.split(':');actual=m.transforms(clip,float(t))
  for i,js in enumerate(matrices):
   # key time rounded 5 decimals; interpolation can differ by <= 0.00002.
   error=float(np.max(np.abs(actual[i]-np.array(js).reshape(4,4).T)));maxerr=max(maxerr,error);count+=1
assert maxerr<.00015,maxerr
print('JS/Python pose parity',count,'matrices; maximum delta',maxerr)
p=OUT/'kontrola_modeli.json';data=json.loads(p.read_text());data['javascript']={'parser_and_sampling':'PASS','pose_parity_matrices':count,'maximum_matrix_delta':maxerr,'event_wiring_mock_GL':'PASS','real_browser_or_GPU_test':False};p.write_text(json.dumps(data,indent=2))
