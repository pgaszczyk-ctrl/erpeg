import math, json, gzip, numpy as np
from PIL import Image, ImageDraw
from pmtiles.reader import Reader, MmapSource
import mapbox_vector_tile as mvt
S='/home/claude/erpeg/data/world-sample/'
LAT0,LAT1,LON0,LON1=49.214,49.262,19.950,20.030
latc=(LAT0+LAT1)/2; MX=111320*math.cos(math.radians(latc)); MY=110574
W=(LON1-LON0)*MX; H=(LAT1-LAT0)*MY
R=2.0 # m per px
PW,PH=int(W/R),int(H/R)
def merc(lat,lon,z):
    n=2**z; return (lon+180)/360*n,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
rd=Reader(MmapSource(open(S+'zakopane.pmtiles','rb')))
z=15; x0,y0=merc(LAT1,LON0,z); x1,y1=merc(LAT0,LON1,z)
polys={}; lines={}; pois=[]
for tx in range(int(x0),int(x1)+1):
  for ty in range(int(y0),int(y1)+1):
    data=rd.get(z,tx,ty)
    if not data: continue
    try: data=gzip.decompress(data)
    except: pass
    t=mvt.decode(data)
    for layer,L in t.items():
      ext=L.get('extent',4096)
      def P(c):
        px=tx+c[0]/ext; py=ty+1-c[1]/ext
        lon=px/2**z*360-180; lat=math.degrees(math.atan(math.sinh(math.pi*(1-2*py/2**z))))
        return ((lon-LON0)*MX/R, (LAT1-lat)*MY/R)
      for f in L['features']:
        p=f['properties']; g=f['geometry']; k=p.get('kind'); kd=p.get('kind_detail')
        typ=g['type']; C=g['coordinates']
        if typ=='Point':
          if layer=='pois' and k in('peak','saddle','alpine_hut','shelter','viewpoint','chalet','information') :
            x,y=P(C); 
            if 0<=x<PW and 0<=y<PH: pois.append({'k':k,'n':p.get('name') or p.get('name:pl') or '', 'e':p.get('elevation'),'x':round(x),'y':round(y)})
          continue
        key=None
        if layer=='landuse' and k in('forest','wood','scrub','grassland','meadow','bare_rock','scree','wetland'): key=k
        if layer=='water' and typ.endswith('Polygon'): key='water'
        if layer=='buildings' and typ.endswith('Polygon'): key='building'
        if key and typ.endswith('Polygon'):
          parts=[C] if typ=='Polygon' else C
          for poly in parts: polys.setdefault(key,[]).append([[P(c) for c in ring] for ring in poly])
          continue
        if typ.endswith('LineString'):
          lk=None
          if layer=='roads' and k=='path': lk='steps' if kd=='steps' else 'path'
          if layer=='roads' and k=='aerialway': lk='cable'
          if layer=='roads' and k=='minor_road': lk='road'
          if layer=='water' and k in('stream','river','drain'): lk='stream'
          if layer=='earth' and k=='cliff': lk='cliff'
          if lk:
            parts=[C] if typ=='LineString' else C
            for ln in parts: lines.setdefault(lk,[]).append([P(c) for c in ln])
print({k:len(v) for k,v in polys.items()},{k:len(v) for k,v in lines.items()},len(pois))
# class raster
CL={'none':0,'forest':1,'wood':1,'meadow':2,'grassland':3,'scrub':4,'wetland':5,'scree':6,'bare_rock':7,'water':8,'building':9}
cls=Image.new('L',(PW,PH),0)
for key in ['forest','wood','meadow','grassland','wetland','scrub','scree','bare_rock','water','building']:
  for rings in polys.get(key,[]):
    xs=[x for r in rings for x,_ in r]; ys=[y for r in rings for _,y in r]
    bx0,by0=max(0,int(min(xs))-1),max(0,int(min(ys))-1); bx1,by1=min(PW,int(max(xs))+2),min(PH,int(max(ys))+2)
    if bx1<=bx0 or by1<=by0: continue
    m=Image.new('L',(bx1-bx0,by1-by0),0); d=ImageDraw.Draw(m)
    d.polygon([(x-bx0,y-by0) for x,y in rings[0]],fill=255)
    for hole in rings[1:]: d.polygon([(x-bx0,y-by0) for x,y in hole],fill=0)
    cls.paste(CL[key],(bx0,by0,bx1,by1),m)
cls.save('klasy.png',optimize=True)
a=np.asarray(cls); print('class hist',np.bincount(a.ravel(),minlength=10))
# simplify lines (round to 0.5 px)
def simp(ln):
  out=[]
  for x,y in ln:
    q=(round(x*2)/2,round(y*2)/2)
    if not out or out[-1]!=q: out.append(q)
  return out
L2={k:[simp(l) for l in v if len(l)>1] for k,v in lines.items()}
json.dump({'PW':PW,'PH':PH,'R':R,'lines':L2,'pois':pois},open('wektory.json','w'))
for p in pois:
  if p['k']!='saddle': print(p)
json.dump(polys.get('building',[]),open('budynki.json','w'))
