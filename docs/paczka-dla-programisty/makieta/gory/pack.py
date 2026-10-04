import json, numpy as np, base64, io
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, distance_transform_edt
X0,Y0,X1,Y1=500,500,2700,2400
cls=np.asarray(Image.open('klasy.png')).copy()
v=json.load(open('wektory.json')); t=json.load(open('trasy.json'))
PH,PW=cls.shape
# cliffs (10) and streams (11) into class raster
im=Image.fromarray(cls); d=ImageDraw.Draw(im)
for ln in v['lines'].get('stream',[]): d.line([tuple(p) for p in ln],fill=11,width=1)
for ln in v['lines'].get('cliff',[]): d.line([tuple(p) for p in ln],fill=10,width=2)
cls=np.asarray(im).copy()
# paths raster
pm=Image.new('L',(PW,PH),0); d=ImageDraw.Draw(pm)
for k in ['path','steps','road']:
  for ln in v['lines'].get(k,[]): d.line([tuple(p) for p in ln],fill=255,width=1)
d.line([tuple(p) for p in t['naKasprowy']],fill=255,width=1)
d.line([tuple(p) for p in t['naBeskid']],fill=255,width=1)
pm=np.asarray(pm)>0
pd=np.minimum(distance_transform_edt(~pm),15).round().astype(np.uint8)
water=cls==8
wd=np.minimum(distance_transform_edt(water),40).round().astype(np.uint8)
rgb=np.stack([cls,pd,wd],-1)[Y0:Y1,X0:X1]
Image.fromarray(rgb).save('dane.png',optimize=True)
# heights: 8 m grid, smoothed; crop matching (grid step = 4 px)
hs=gaussian_filter(np.load('hs.npy'),1.0)
gx0,gy0=X0//4,Y0//4; gx1,gy1=X1//4+2,Y1//4+2
hc=hs[gy0:gy1,gx0:gx1]
q=np.clip(np.round((hc-1000)*20),0,65535).astype(np.uint32)
him=np.stack([(q>>8)&255,q&255,np.zeros_like(q)],-1).astype(np.uint8)
Image.fromarray(him).save('wys.png',optimize=True)
# vectors cropped
def cr(ln): return [[round(x-X0,1),round(y-Y0,1)] for x,y in ln]
out={'W':X1-X0,'H':Y1-Y0,'m':2,
 'cable':[cr(l) for l in v['lines'].get('cable',[])],
 'trasa':cr(t['naKasprowy']),'beskid':cr(t['naBeskid']),
 'pois':[dict(p,x=p['x']-X0,y=p['y']-Y0) for p in v['pois'] if X0<=p['x']<X1 and Y0<=p['y']<Y1 and p['k'] in ('peak','alpine_hut') and p['n']]}
# dedupe pois by name
seen=set(); P=[]
for p in out['pois']:
  n=p['n'].split(' / ')[-1]
  if n in seen: continue
  seen.add(n); p['n']=n; P.append(p)
out['pois']=P
json.dump(out,open('wektory_makieta.json','w'),separators=(',',':'),ensure_ascii=False)
import os
for f in ['dane.png','wys.png','wektory_makieta.json']: print(f,os.path.getsize(f))
print(len(P),[p['n'] for p in P])
print('h grid',hc.shape, hc.min(),hc.max())
