#!/usr/bin/env python3
"""Geometry study on real unmerged OSM examples; does not change the game generator.
Weighted wall-axis clustering replaces tiny facade offsets with a few major roof volumes.
"""
import json,math,pathlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'docs/architecture/massing'
DATA=json.loads((OUT/'fixtures.json').read_text())['buildings']
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
INK='#483c32';PAPER='#faf5e9';LIGHT='#ece6d6';SHADOW='#847d74';WALL='#bab3a2'
font=ImageFont.truetype(FONT,17);small=ImageFont.truetype(FONT,13);title=ImageFont.truetype(FONT,27)

def inside(r,p):
 x,y=p;v=False
 for a,b in zip(r,np.roll(r,-1,axis=0)):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:v=not v
 return v
def rotation(a):return np.array([[math.cos(a),-math.sin(a)],[math.sin(a),math.cos(a)]])
def axes(values,tolerance):
 groups=[]
 for value,weight in sorted(values):
  if groups and value-groups[-1][0]<=tolerance:groups[-1][1].append((value,weight))
  else:groups.append([value,[(value,weight)]])
 return sorted(sum(v*w for v,w in g)/sum(w for _,w in g) for _,g in groups)
def levels(value):
 n=float(value or 1);return 1 if n<=3 else 2 if n<=6 else 3
def touching(a,b):
 x=min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0]);y=min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1])
 return x>=-1e-5 and y>=-1e-5 and max(x,y)>.1
def components(rects):
 unseen=set(range(len(rects)));groups=[]
 while unseen:
  group={unseen.pop()};todo=list(group)
  while todo:
   at=todo.pop();near={i for i in unseen if touching(rects[at],rects[i])};unseen-=near;group|=near;todo.extend(near)
  groups.append(group)
 return groups
def major_volumes(rects):
 if not rects:return [],[]
 primary=rects[0];minimum_width=max(3,min(primary[2],primary[3])*.5)
 main=[r for r in rects if r[2]*r[3]>=primary[2]*primary[3]*.15 and min(r[2],r[3])>=minimum_width]
 links=[]
 for _ in range(len(main)*2):
  all_rects=main+links;groups=components(all_rects)
  if len(groups)<=1:break
  best=None
  for gi,g in enumerate(groups):
   for other in groups[gi+1:]:
    for ai in g:
     for bi in other:
      a,b=all_rects[ai],all_rects[bi]
      p=np.clip([b[0]+b[2]/2,b[1]+b[3]/2],[a[0],a[1]],[a[0]+a[2],a[1]+a[3]])
      q=np.clip([a[0]+a[2]/2,a[1]+a[3]/2],[b[0],b[1]],[b[0]+b[2],b[1]+b[3]])
      cost=np.linalg.norm(p-q)
      if best is None or cost<best[0]:best=(cost,p,q)
  if best is None or best[0]>12:break
  _,p,q=best;lo=np.minimum(p,q)-.15;hi=np.maximum(p,q)+.15
  for axis in [0,1]:
   if hi[axis]-lo[axis]<3:
    middle=(hi[axis]+lo[axis])/2;lo[axis]=middle-1.5;hi[axis]=middle+1.5
  links.append([float(lo[0]),float(lo[1]),float(hi[0]-lo[0]),float(hi[1]-lo[1])])
 return main,links
def prepare(b,origin):
 k=np.array([111320*math.cos(math.radians(origin[1])),-111320])
 rings=[(np.array(r[:-1] if r[0]==r[-1] else r)-origin)*k for r in b['rings']]
 center=np.mean(rings[0],axis=0);edges=np.roll(rings[0],-1,axis=0)-rings[0]
 lengths=np.linalg.norm(edges,axis=1);angles=np.arctan2(edges[:,1],edges[:,0]);a=math.atan2(np.sum(np.sin(4*angles)*lengths),np.sum(np.cos(4*angles)*lengths))/4
 local=[(r-center)@rotation(a) for r in rings]
 xs=[];ys=[]
 for ring in local:
  for p,q in zip(ring,np.roll(ring,-1,axis=0)):
   d=q-p;length=np.linalg.norm(d)
   if length<.6:continue
   if abs(d[0])<abs(d[1])*.3:xs.append(((p[0]+q[0])/2,length))
   if abs(d[1])<abs(d[0])*.3:ys.append(((p[1]+q[1])/2,length))
 # Long walls carry more weight than loggias, entrance canopies and survey points.
 xx=axes(xs,4);yy=axes(ys,4)
 if len(xx)<2:xx=[float(np.min(local[0][:,0])),float(np.max(local[0][:,0]))]
 if len(yy)<2:yy=[float(np.min(local[0][:,1])),float(np.max(local[0][:,1]))]
 mask=np.zeros((len(yy)-1,len(xx)-1),dtype=np.uint8)
 for y in range(mask.shape[0]):
  for x in range(mask.shape[1]):
   votes=0
   for fy in [.2,.5,.8]:
    for fx in [.2,.5,.8]:
     p=[xx[x]+(xx[x+1]-xx[x])*fx,yy[y]+(yy[y+1]-yy[y])*fy]
     votes+=int(inside(local[0],p) and not any(inside(h,p) for h in local[1:]))
   mask[y,x]=votes>=5
 # Never fill the centre of an existing courtyard, even after snapping the wall axes.
 for y in range(mask.shape[0]):
  for x in range(mask.shape[1]):
   if any(inside(h,[(xx[x]+xx[x+1])/2,(yy[y]+yy[y+1])/2]) for h in local[1:]):mask[y,x]=0
 rects=[]
 while np.any(mask):
  best=None
  for y0 in range(mask.shape[0]):
   for y1 in range(y0+1,mask.shape[0]+1):
    valid=np.all(mask[y0:y1],axis=0);start=None
    for x in range(len(valid)+1):
     if x<len(valid) and valid[x]:
      if start is None:start=x
     elif start is not None:
      area=(xx[x]-xx[start])*(yy[y1]-yy[y0])
      if best is None or area>best[0]:best=(area,start,x,y0,y1)
      start=None
  if best is None:break
  area,x0,x1,y0,y1=best;mask[y0:y1,x0:x1]=0
  if area<20 or min(xx[x1]-xx[x0],yy[y1]-yy[y0])<3:continue
  rects.append([xx[x0],yy[y0],xx[x1]-xx[x0],yy[y1]-yy[y0]])
 rects,links=major_volumes(rects)
 def world(items):return [np.array([[x,y],[x+w,y],[x+w,y+d],[x,y+d]])@rotation(a).T+center for x,y,w,d in items]
 hole_centres=[np.mean(h,axis=0) for h in local[1:]]
 protected=all(not any(x<=p[0]<=x+w and y<=p[1]<=y+h for x,y,w,h in rects+links) for p in hole_centres)
 return {'name':b['name'],'raw':rings,'rects':rects,'links':links,'world':world(rects),'worldLinks':world(links),'center':center,'angle':a,'levels':levels(b['tags'].get('building:levels')),'sourceLevels':b['tags'].get('building:levels','brak'),'points':sum(len(r) for r in rings),'holes':len(rings)-1,'connected':len(components(rects+links))==1,'courtyardProtected':protected}

def panel_transform(points,box):
 pts=np.concatenate(points);lo=pts.min(axis=0);hi=pts.max(axis=0);width,height=hi-lo
 x,y,w,h=box;s=min((w-36)/max(width,1),(h-36)/max(height,1));off=np.array([x+(w-width*s)/2,y+(h-height*s)/2])-lo*s
 return lambda p:tuple(np.array(p)*s+off)
def plan(d,items,box,proposed=False):
 points=[r for b in items for r in b['raw']];tr=panel_transform(points,box)
 for b in items:
  for i,r in enumerate(b['raw']):d.polygon([tr(p) for p in r],fill=PAPER if i else '#e1d6c4',outline=INK,width=2)
  if proposed:
   for r in b['worldLinks']:d.polygon([tr(p) for p in r],fill='#c6c2ba',outline=INK,width=2)
   for j,r in enumerate(b['world']):
    d.polygon([tr(p) for p in r],fill=['#dfbd83','#bad0ba','#c4cddd','#e6c4ad'][j%4],outline=INK,width=2)
    c=np.mean(r,axis=0);p=tr(c);d.text((p[0]-5,p[1]-9),str(j+1),fill=INK,font=small)

def mass_faces(b):
 faces=[];height=b['levels']*10.4
 def v(x,y,z):
  p=np.array([x,y])@rotation(b['angle']).T+b['center'];return np.array([p[0],p[1],z])
 def face(vertices,color):faces.append((sum(p[0]+p[1]+p[2]*.25 for p in vertices)/len(vertices),vertices,color))
 for auxiliary,(x,y,w,h) in [(False,r) for r in b['rects']]+[(True,r) for r in b['links']]:
  height=b['levels']*10.4*(.8 if auxiliary else 1)
  r=[v(x,y,0),v(x+w,y,0),v(x+w,y+h,0),v(x,y+h,0)];top=[p+np.array([0,0,height]) for p in r]
  for i in range(4):face([r[i],r[(i+1)%4],top[(i+1)%4],top[i]],[WALL,SHADOW,WALL,LIGHT][i])
  if auxiliary:face(top,'#bab3a2');continue
  rise=min(6,min(w,h)*.3)
  if w>=h:
   a=v(x,y+h/2,height+rise);c=v(x+w,y+h/2,height+rise)
   face([top[0],top[1],c,a],'#c8963e');face([a,c,top[2],top[3]],'#9a6420')
   face([top[0],a,top[3]],LIGHT);face([top[1],top[2],c],WALL)
  else:
   a=v(x+w/2,y,height+rise);c=v(x+w/2,y+h,height+rise)
   face([top[0],a,c,top[3]],'#c8963e');face([a,top[1],top[2],c],'#9a6420')
   face([top[0],top[1],a],LIGHT);face([top[3],c,top[2]],WALL)
 return faces
def volume(d,items,box):
 faces=[f for b in items for f in mass_faces(b)]
 def project(p):return np.array([(p[0]-p[1])*.75,(p[0]+p[1])*.375-p[2]])
 tr=panel_transform([np.array([project(p) for p in f[1]]) for f in faces],box)
 for _,points,color in sorted(faces,key=lambda f:f[0]):d.polygon([tr(project(p)) for p in points],fill=color,outline=INK,width=2)

cases=[('kul','KUL — kampus przy Alejach Racławickich',[b for b in DATA if b['name'] in ['Gmach Główny KUL','Collegium Jana Pawła II','Collegium Norwidianum']]),('dziewanny','Osiedle — bloki przy Dziewanny',[b for b in DATA if b['name'] in ['Dziewanny 9','Dziewanny 10','Dziewanny 14']]),('szczytowa','Trudny obrys — Szczytowa 11',[b for b in DATA if b['name']=='Szczytowa 11'])]
summary=[]
for case,title_text,buildings in cases:
 origin=np.mean([b['center'] for b in buildings],axis=0);items=[prepare(b,origin) for b in buildings]
 assert all(b['connected'] for b in items),f'{case}: disconnected volume'
 assert all(b['courtyardProtected'] for b in items),f'{case}: filled courtyard'
 im=Image.new('RGB',(1800,780),PAPER);d=ImageDraw.Draw(im)
 d.text((30,20),title_text,font=title,fill=INK)
 d.text((30,60),'Studium brył z rzeczywistych obrysów OSM. Robocza propozycja geometrii — bez docelowych tekstur.',font=small,fill=INK)
 for x,label in [(25,'1. Rzeczywisty obrys'),(625,'2. Proponowane duże skrzydła'),(1225,'3. Robocze bryły i proste dachy')]:d.text((x,110),label,font=font,fill=INK)
 plan(d,items,(20,150,560,470));plan(d,items,(620,150,560,470),True);volume(d,items,(1220,150,560,470))
 for row,b in enumerate(items):
  text=f"{b['name']}: {b['points']} pkt; główne skrzydła: {len(b['rects'])}, płaskie łączniki: {len(b['links'])}; OSM {b['sourceLevels']} → gra {b['levels']} kond."
  d.text((30,640+row*27),text,font=font,fill=INK)
 d.text((30,748),'© OpenStreetMap contributors, ODbL 1.0 · Kolory w rzucie rozróżniają skrzydła, nie definiują finalnego stylu.',font=small,fill=INK)
 im.save(OUT/f'{case}.png')
 summary.append({'case':case,'buildings':[{'name':b['name'],'sourcePoints':b['points'],'masses':len(b['rects']),'flatConnectors':len(b['links']),'connected':b['connected'],'sourceLevels':b['sourceLevels'],'gameLevels':b['levels'],'courtyards':b['holes'],'courtyardProtected':b['courtyardProtected'],'rectangles':b['rects'],'connectors':b['links'],'angle':b['angle']} for b in items]})
(OUT/'study.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
