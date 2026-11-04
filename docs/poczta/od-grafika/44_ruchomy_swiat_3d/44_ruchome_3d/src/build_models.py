from pathlib import Path
import numpy as np, math, json, struct, shutil
from scipy.spatial.transform import Rotation
OUT=Path(__file__).resolve().parents[1]; (OUT/'modele').mkdir(exist_ok=True)
P={'bone':'e5d5aa','boneLight':'f5e8c6','boneShade':'b5a17e','dark':'302936','coal':'423d45','brass':'aa8247','gold':'c5a15c','rust':'694939','cloth':'71685a','scarf':'6d7773','fur':'777b79','furDark':'4b5154','furLight':'c1bba6','nose':'292b32','ear':'927f7a','eye':'c1a25c','white':'e2d7b8'}
def rgb(c):
 c=P.get(c,c).lstrip('#'); return np.array([int(c[i:i+2],16)/255 for i in (0,2,4)])
def unit(a):return np.array(a)/max(1e-9,np.linalg.norm(a))
class Mesh:
 def __init__(self):self.v=[];self.c=[];self.n=[]
 def tri(self,a,b,c,col,normal=None):
  a,b,c=map(np.array,(a,b,c));n=unit(np.cross(b-a,c-a))
  if normal is not None and np.dot(n,normal)<0:b,c=c,b;n=-n
  if np.linalg.norm(n)<.01:return
  # Restrained permanent palette steps: no view-dependent textures.
  d=np.dot(n,unit([-.6,1,.6]));shade=1.035 if d>.55 else .94 if d>-.15 else .78
  color=np.clip(rgb(col)*shade,0,1)
  self.v.extend([a,b,c]);self.c.extend([color]*3);self.n.extend([n]*3)
 def quad(self,a,b,c,d,col,normal=None):self.tri(a,b,c,col,normal);self.tri(a,c,d,col,normal)
 def ell(self,center,r,col,N=10,M=6):
  ctr=np.array(center);r=np.array(r)
  def p(i,j):
   a=math.pi*i/M;b=2*math.pi*j/N
   return ctr+r*np.array([math.sin(a)*math.cos(b),math.cos(a),math.sin(a)*math.sin(b)])
  for i in range(M):
   for j in range(N):
    a,b,c,d=p(i,j),p(i,j+1),p(i+1,j+1),p(i+1,j)
    mid=(a+b+c+d)/4-ctr
    self.quad(a,b,c,d,col,mid)
 def tube(self,points,radii,col,N=7):
  pts=np.array(points);rings=[]
  for i,p in enumerate(pts):
   tangent=unit(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)])
   axis=unit(np.cross(tangent,[0,0,1] if abs(tangent[2])<.85 else [1,0,0]));other=np.cross(tangent,axis)
   r=radii[i] if hasattr(radii,'__len__') else radii
   rings.append([p+r*(math.cos(2*math.pi*j/N)*axis+math.sin(2*math.pi*j/N)*other) for j in range(N)])
  for i in range(len(pts)-1):
   for j in range(N):
    a,b,c,d=rings[i][j],rings[i][(j+1)%N],rings[i+1][(j+1)%N],rings[i+1][j]
    self.quad(a,b,c,d,col,(a+b+c+d)/4-(pts[i]+pts[i+1])/2)
  for ring,p,sign in [(rings[0],pts[0],-1),(rings[-1],pts[-1],1)]:
   n=unit(pts[1]-pts[0]) if sign==-1 else unit(pts[-1]-pts[-2])
   for j in range(N):self.tri(p,ring[j],ring[(j+1)%N],col,sign*n)
 def box(self,c,s,col):
  c=np.array(c);s=np.array(s)/2
  for dim in range(3):
   for sign in [-1,1]:
    ax=[a for a in range(3) if a!=dim]; pts=[]
    for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:
     q=c.copy();q[dim]+=sign*s[dim];q[ax[0]]+=a*s[ax[0]];q[ax[1]]+=b*s[ax[1]];pts.append(q)
    n=np.zeros(3);n[dim]=sign;self.quad(*pts,col,n)
 def prism(self,poly,depth,col):
  # Polygon in XY; front +Z. Convex polygons only.
  front=[np.array([x,y,depth]) for x,y in poly];back=[p*np.array([1,1,-1]) for p in front]
  for i in range(1,len(poly)-1):self.tri(front[0],front[i],front[i+1],col,[0,0,1]);self.tri(back[0],back[i+1],back[i],col,[0,0,-1])
  for j in range(len(poly)):
   k=(j+1)%len(poly); mid=(front[j]+front[k])/2
   self.quad(front[j],back[j],back[k],front[k],col,[mid[0],mid[1]-np.mean(np.array(poly)[:,1]),0])
 def patch(self,poly,z,col,thickness=.006):
  start=len(self.v);self.prism(poly,thickness,col)
  for i in range(start,len(self.v)):self.v[i][2]+=z
 def plane(self,pts,col,n):self.quad(*pts,col,n)
class Model:
 def __init__(self,name):self.name=name;self.nodes=[];self.meshes={};self.parents={};self.clips={};self.extra={}
 def node(self,name,pos=(0,0,0),parent=None):
  idx=len(self.nodes);self.nodes.append({'name':name,'translation':list(pos)})
  if parent is not None:self.nodes[parent].setdefault('children',[]).append(idx);self.parents[idx]=parent
  m=Mesh();self.meshes[idx]=m;return idx,m
 def find(self,name):return next(i for i,n in enumerate(self.nodes) if n['name']==name)
 def anim(self,name,duration,pose,fps=24):
  times=np.linspace(0,duration,round(duration*fps)+1);data={i:{'translation':[],'rotation':[],'scale':[]} for i in range(len(self.nodes))}
  ground_targets=[]
  for t in times:
   values=pose(float(t),duration)
   transforms=[]
   for i,n in enumerate(self.nodes):
    pos=np.array(n['translation'],float)+np.array(values.get(n['name'],{}).get('move',[0,0,0]))
    q=Rotation.from_euler('xyz',values.get(n['name'],{}).get('rot',[0,0,0])).as_quat()
    local_scale=np.array(values.get(n['name'],{}).get('scale',n.get('scale',[1,1,1])),float)
    data[i]['translation'].append(pos);data[i]['rotation'].append(q);data[i]['scale'].append(local_scale)
    local=np.eye(4);local[:3,:3]=Rotation.from_quat(q).as_matrix()@np.diag(local_scale);local[:3,3]=pos
    transforms.append(transforms[self.parents[i]]@local if i in self.parents else local)
   # Keep the lowest geometric point on/above ground, including the collapse.
   ys=[(np.array(m.v)@transforms[i][:3,:3].T+transforms[i][:3,3])[:,1].min() for i,m in self.meshes.items() if m.v]
   ground_targets.append(.003+values.get("__air_height__",0))
   shift=.003-min(ys)+values.get("__air_height__",0)
   data[0]['translation'][-1][1]+=shift
  self.clips[name]={'duration':duration,'times':times,'channels':data,'ground_min':ground_targets}
 def export(self):
  g={'asset':{'version':'2.0','generator':'EXP-LORE 44-G001 / procedural authored meshes'},'extensionsUsed':['KHR_materials_unlit'],'scene':0,'scenes':[{'nodes':[0]}],'nodes':self.nodes,'meshes':[],'materials':[{'name':'Stonowana paleta / fixed vertex colors','extensions':{'KHR_materials_unlit':{}},'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1}}],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[],'animations':[],'extras':self.extra}
  binary=bytearray()
  def acc(data,typ,component=5126):
   a=np.array(data,dtype='<f4' if component==5126 else 'u1');
   while len(binary)%4:binary.extend(b'\0')
   view=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':a.nbytes});binary.extend(a.tobytes());item={'bufferView':view,'componentType':component,'count':len(a),'type':typ}
   if component==5121:item['normalized']=True
   else:item['min']=np.min(a,axis=0).reshape(-1).tolist();item['max']=np.max(a,axis=0).reshape(-1).tolist()
   idx=len(g['accessors']);g['accessors'].append(item);return idx
  triangles=0
  for i,m in self.meshes.items():
   if not m.v:continue
   p=acc(m.v,'VEC3');c=acc(np.round(np.array(m.c)*255),'VEC3',5121);n=acc(m.n,'VEC3');idx=len(g['meshes']);g['nodes'][i]['mesh']=idx
   g['meshes'].append({'name':self.nodes[i]['name'],'primitives':[{'attributes':{'POSITION':p,'COLOR_0':c,'NORMAL':n},'material':0}]});triangles+=len(m.v)//3
  for name,clip in self.clips.items():
   a={'name':name,'samplers':[],'channels':[]};times=acc(clip['times'],'SCALAR')
   for i,ch in clip['channels'].items():
    for path,vals in ch.items():
     default=self.nodes[i]['translation'] if path=='translation' else [0,0,0,1] if path=='rotation' else self.nodes[i].get('scale',[1,1,1])
     if np.max(np.abs(np.array(vals)-default))<1e-7:continue
     target=acc(vals,'VEC4' if path=='rotation' else 'VEC3');idx=len(a['samplers']);a['samplers'].append({'input':times,'output':target,'interpolation':'LINEAR'});a['channels'].append({'sampler':idx,'target':{'node':i,'path':path}})
   g['animations'].append(a)
  g['buffers'][0]['byteLength']=len(binary)
  jb=json.dumps(g,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);binary+=b'\0'*((-len(binary))%4)
  raw=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(binary),b'BIN\0')+binary
  (OUT/'modele'/f'{self.name}.glb').write_bytes(raw)
  return {'file':f'modele/{self.name}.glb','triangles':triangles,'nodes':len(self.nodes),'clips':{n:round(c['duration'],3) for n,c in self.clips.items()},'bytes':len(raw),'grips':[n['name'] for n in self.nodes if 'grip' in n['name']]}

def skeleton():
 s=Model('szkielet'); root,_=s.node('EXP_LORE_szkielet');hip,h=s.node('hips',(0,.455,0),root)
 h.ell((-.092,0,0),(.071,.07,.067),'bone',8,4);h.ell((.092,0,0),(.071,.07,.067),'bone',8,4);h.tube([(-.12,.015,.025),(0,-.026,.065),(.12,.015,.025)],.023,'bone',6)
 # Pelvis crossbar and faded belt, understated recovered equipment.
 h.tube([(-.14,.04,0),(0,.055,.065),(.14,.04,0)],.025,'cloth',8);h.box((0,.046,.078),(.065,.048,.022),'brass');h.box((0,.046,.092),(.025,.024,.006),'dark')
 torso,m=s.node('torso',(0,.075,0),hip)
 m.tube([(0,-.06,-.02),(0,.08,-.034),(0,.245,-.035)],[.028,.032,.025],'boneShade',7)
 for y in [0,.054,.108,.162,.216]:m.ell((0,y,-.036),(.039,.021,.036),'bone',6,4)
 # Separate curved ribs leave visible holes through the chest.
 for y,w in [(.045,.105),(.108,.139),(.174,.152)]:
  for side in [-1,1]:
   m.tube([(0,y+.025,-.035),(side*w*.72,y+.02,-.065),(side*w,y-.005,.005),(side*w*.8,y-.03,.069),(side*.027,y-.037,.087)],[.015,.016,.017,.015,.012],'bone',6)
 m.tube([(0,.18,.09),(0,.038,.082)],[.02,.016],'boneLight',6)
 for side in [-1,1]:
  m.tube([(0,.225,.02),(side*.105,.228,0),(side*.185,.205,0)],.023,'boneLight',6)
  m.patch([(side*.025,.22),(side*.14,.195),(side*.105,.13)],-.065,'boneShade')
 # Small moss grey neck-wrap, no modern clothing.
 m.tube([(0,.248,0),(0,.275,0)],[.072,.063],'scarf',10)
 m.prism([(-.05,.255),(-.015,.245),(-.065,.12),(-.095,.148),(-.107,.135)],.09,'scarf')
 head,m=s.node('head',(0,.285,0),torso)
 # Round chibi cranium, tapered cheekbones and squarish brow.
 m.ell((0,.19,0),(.245,.244,.185),'boneLight',14,8)
 m.ell((0,.047,.054),(.174,.099,.121),'bone',10,5)
 for side in [-1,1]:
  m.ell((side*.179,.075,.087),(.054,.055,.069),'bone',7,4)
  # sockets are fixed on the front of the same 3D surface, never billboarded.
  pts=[(side*.104-.057,.095),(side*.104+.046,.095),(side*.104+.057,.182),(side*.104+.025,.213),(side*.104-.047,.197),(side*.104-.063,.152)]
  m.patch(pts,.170,'dark')
 # Nose aperture and distinct teeth, a single connected jaw node.
 m.patch([(-.024,.078),(.024,.078),(0,.125)],.182,'dark')
 m.box((0,.016,.159),(.20,.023,.031),'dark')
 for x in [-.072,-.036,0,.036,.072]:m.box((x,.024,.18),(.026,.043,.022),'boneLight')
 m.tube([(-.141,-.01,.10),(-.11,-.04,.14),(0,-.052,.153),(.11,-.04,.14),(.141,-.01,.10)],.027,'bone',7)
 # Tiny fixed crack in the cranium.
 m.plane([[-.044,.35,.143],[-.033,.346,.146],[-.015,.31,.164],[-.023,.305,.164]],'boneShade',[0,0,1])
 for side,sgn in [('L',-1),('R',1)]:
  upper,m=s.node('upper'+side,(sgn*.184,.21,0),torso);m.ell((0,0,0),(.035,.037,.037),'bone',7,4);m.tube([(0,-.024,0),(sgn*.012,-.164,0)],[.021,.019],'bone',7);m.ell((sgn*.012,-.177,0),(.033,.029,.029),'bone',7,4)
  fore,m=s.node('fore'+side,(sgn*.012,-.18,0),upper)
  for x in [-.016,.016]:m.tube([(x,0,0),(x*.65,-.149,.007)],[.012,.013],'bone',6)
  if side=='L':
   m.tube([(0,-.085,0),(0,-.135,0)],[.039,.037],'rust',8);m.tube([(0,-.087,0),(0,-.097,0)],[.041,.04],'brass',8)
  hand,m=s.node('hand'+side,(0,-.162,.007),fore);m.ell((0,-.022,.005),(.033,.042,.022),'bone',7,4)
  for x in [-.024,-.008,.008,.024]:m.tube([(x,-.04,.01),(x,-.068,.016)],.007,'bone',5)
  s.node(side+'_at_hand_grip',(0,-.05,.025),hand)
  thigh,m=s.node('thigh'+side,(sgn*.098,-.035,0),hip);m.tube([(0,0,0),(sgn*.008,-.185,.008)],[.029,.024],'bone',8);m.ell((sgn*.008,-.19,.017),(.034,.032,.03),'bone',7,4)
  shin,m=s.node('shin'+side,(sgn*.008,-.202,.008),thigh)
  for x in [-.016,.016]:m.tube([(x,0,0),(x*.6,-.158,0)],[.014,.012],'bone',6)
  foot,m=s.node('foot'+side,(0,-.17,.026),shin);m.ell((0,-.017,.026),(.043,.026,.065),'bone',8,4)
  for x in [-.029,-.009,.011,.03]:m.tube([(x,-.015,.04),(x,-.022,.093)],.008,'boneLight',5)
 # Short limbs and a broad cranium follow the guard's chibi proportions.
 factors={'hips':np.array([1.10,1,1.10]),'torso':np.array([1.12,.88,1.05]),'head':np.array([1.30,1.16,1.12])}
 for i,n in enumerate(s.nodes):
  name=n['name'];f=factors.get(name,np.array([1.,.80,1.]))
  if name.startswith(('hand','foot')):f=np.array([1.18,.9,1.10])
  if name.startswith(('upper','fore','thigh','shin')):f=np.array([1.15,.80,1.10])
  if 'grip'in name or i==0:f=np.ones(3)
  if s.meshes[i].v:
   s.meshes[i].v=[v*f for v in s.meshes[i].v]
   s.meshes[i].n=[unit(n/f) for n in s.meshes[i].n]
  for child in n.get('children',[]):s.nodes[child]['translation']=(np.array(s.nodes[child]['translation'])*f).tolist()
 s.nodes[hip]['translation'][1]=.37
 def pose(t,d,name):
  p=t/d;v={}
  def set(n,rot=None,move=None):v[n]={};v[n].update({'rot':rot} if rot is not None else {});v[n].update({'move':move} if move is not None else {})
  w=math.sin(2*math.pi*p)
  if name=='idle':set('torso',[.022*w,0,.015*w]);set('head',[.015*w,.045*w,0]);set('upperL',[.06,0,.06]);set('upperR',[-.04,0,-.06])
  elif name=='walk':
   set('hips',[0,.03*w,0],[0,.013*(1-math.cos(4*math.pi*p)),0]);set('torso',[.04,-.07*w,0]);set('head',[-.03,.045*w,0])
   for side,phase in [('L',1),('R',-1)]:
    z=phase*w;set('thigh'+side,[.42*z,0,0]);set('shin'+side,[max(0,-z)*.62,0,0]);set('upper'+side,[-.25*z,0,.07 if side=='L' else -.07]);set('fore'+side,[-.12-.08*max(0,z),0,0])
  elif name in ['attack','hit']:
   if name=='hit':
    f=math.sin(math.pi*p)**2;set('torso',[-.28*f,0,.10*f]);set('head',[-.20*f,0,0]);set('upperL',[-.2*f,0,-.10*f]);set('upperR',[-.25*f,0,.1*f])
   else:
    # 0.00–0.50 anticipation; contact at 0.65 s, then recover.
    keys=[(0,0,0),(.5,-1.45,-.45),(.65,.85,.35),(.9,.50,.13),(1.3,0,0)]
    a=tw=0
    for i in range(len(keys)-1):
     if keys[i][0]<=t<=keys[i+1][0]:
      u=(t-keys[i][0])/(keys[i+1][0]-keys[i][0]);u=u*u*(3-2*u);a=keys[i][1]*(1-u)+keys[i+1][1]*u;tw=keys[i][2]*(1-u)+keys[i+1][2]*u;break
    set('torso',[.08+abs(a)*.08,tw,0]);set('head',[0,-tw*.5,0]);set('upperR',[a,0,-abs(a)*.32]);set('foreR',[-.25-abs(a)*.44,0,0]);set('upperL',[-.3,0,.15]);set('foreL',[-.3,0,0]);set('thighL',[-.14,0,0]);set('shinL',[.15,0,0])
  elif name=='death':
   q=min(1,p/.75);q=q*q*(3-2*q);set('hips',[.20*q,0,1.45*q],[0,-.1*q,0]);set('torso',[.35*q,0,-.15*q]);set('head',[.12*q,0,.2*q]);set('upperR',[-.45*q,0,-.5*q]);set('foreR',[-.7*q,0,0]);set('upperL',[-.1*q,0,.25*q]);set('foreL',[-.9*q,0,0]);set('thighR',[-.5*q,0,0]);set('shinR',[.8*q,0,0]);set('thighL',[-.25*q,0,0]);set('shinL',[.5*q,0,0])
  return v
 for n,d in [('idle',2.4),('walk',.85),('attack',1.3),('hit',.28),('death',1.2)]:s.anim(n,d,lambda t,d,n=n:pose(t,d,n))
 s.extra={'style':'pixel-comic fantasy steampunk','forward':'+Z','up':'+Y','units':'human 1.25','attackEvents':{'windupStart':0,'windupEnd':.5,'impact':.65,'recoveryEnd':1.3},'animationFamily':'humanoid_rigid_v1','notes':'Head has fixed geometry sockets. No weapon mesh; grips are empty child nodes.'}
 return s

def wolf():
 s=Model('wilk');root,_=s.node('EXP_LORE_wilk');body,m=s.node('body',(0,.44,-.035),root)
 # Compact reference-inspired silhouette. Only one torso and one broad head.
 # Reference: pgaszczyk-ctrl/exp-lore, src/combat3d/models.ts, wolf(), blob f82f6af.
 m.ell((0,.04,-.025),(.205,.21,.35),'777b70',8,5)
 # The neck is a pivot inside the shoulders, not a separate thick cylinder.
 neck,_=s.node('neck',(0,.07,.20),body)
 head,m=s.node('head',(0,.07,.12),neck)
 m.ell((0,.037,.02),(.222,.191,.192),'8f9585',10,6)
 for side in [-1,1]:
  eyepts=[[side*.065,.028,.232],[side*.174,.072,.191],[side*.183,.002,.196],[side*.081,-.018,.240]]
  m.plane(eyepts,'283733',[side*.45,0,.8])
  m.plane([[side*.096,.022,.233],[side*.149,.046,.213],[side*.155,.012,.216],[side*.099,-.004,.239]],'c6ab6b',[side*.45,0,.8])
  ear,em=s.node('ear'+('L' if side==-1 else 'R'),(side*.142,.145,-.005),head)
  earpoints=np.array([[-.069,0,.045],[.069,0,.045],[0,0,-.055],[0,.145,0]])
  for indices in [(0,1,2),(0,3,1),(1,3,2),(2,3,0)]:
   pts=earpoints[list(indices)];em.tri(*pts,'667368',pts.mean(axis=0)-earpoints.mean(axis=0))
 # Short box-like muzzle and nose, as in the simple Exp-Lore reference.
 m.box((0,-.04,.238),(.225,.125,.245),'b7baa2')
 m.box((0,-.014,.370),(.145,.077,.065),'283733')
 jaw,m=s.node('jaw',(0,-.105,.11),head)
 m.box((0,.000,.119),(.202,.022,.218),'283733')
 m.box((0,-.028,.119),(.202,.037,.218),'b7baa2')
 # Increase head + ears + muzzle as a coherent subtree, keeping attachments fixed.
 def enlarge(i,factor):
  s.meshes[i].v=[v*factor for v in s.meshes[i].v]
  for child in s.nodes[i].get('children',[]):
   s.nodes[child]['translation']=(np.array(s.nodes[child]['translation'])*factor).tolist();enlarge(child,factor)
 enlarge(head,1.20)
 for fore,z0 in [(True,.245),(False,-.245)]:
  for side,sgn in [('L',-1),('R',1)]:
   prefix=('front' if fore else 'back')+side
   leg,m=s.node(prefix,(sgn*.14,-.04,z0),body)
   if fore:
    upper=[0,-.16,-.075];lower=[0,-.175,.075]
    m.tube([(0,0,0),(0,-.06,-.014),upper],[.063,.059,.038],'5a655b',6)
    shin,m=s.node(prefix+'_shin',upper,leg)
    m.tube([(0,0,0),lower],[.038,.032],'5a655b',6)
    paw,m=s.node(prefix+'_paw',lower,shin)
   else:
    upper=[0,-.10,.12];lower=[0,-.135,-.19];metatarsal=[0,-.10,.07]
    m.tube([(0,0,0),(0,-.045,.04),upper],[.085,.080,.046],'5a655b',6)
    shin,m=s.node(prefix+'_shin',upper,leg)
    m.tube([(0,0,0),lower],[.046,.034],'5a655b',6)
    hock,m=s.node(prefix+'_hock',lower,shin)
    m.tube([(0,0,0),metatarsal],[.034,.029],'5a655b',6)
    paw,m=s.node(prefix+'_paw',metatarsal,hock)
   m.ell((0,-.025,.045),(.067,.040,.087),'5a655b',6,4)
 tail,m=s.node('tail',(0,.045,-.32),body)
 m.tube([(0,0,0),(0,-.09,-.20),(0,-.17,-.37)],[.065,.063,.008],'69756b',6)
 s.node('tail_tip',(0,-.17,-.34),tail)
 s.node('Mouth',(0,-.020,.49),head)
 def rotate_yz(v,a):
  y,z=v;c=math.cos(a);q=math.sin(a);return np.array([c*y-q*z,q*y+c*z])
 def bone_angle(rest,desired):
  a=math.atan2(desired[1],desired[0])-math.atan2(rest[1],rest[0])
  return (a+math.pi)%(2*math.pi)-math.pi
 def ik(target,upper,lower,knee_direction):
  length=np.linalg.norm(target);l1=np.linalg.norm(upper);l2=np.linalg.norm(lower)
  length=np.clip(length,abs(l1-l2)+1e-5,l1+l2-1e-5);u=target/max(1e-9,np.linalg.norm(target));along=(l1*l1-l2*l2+length*length)/(2*length)
  height=math.sqrt(max(0,l1*l1-along*along));perp=np.array([-u[1],u[0]])
  knee=u*along+perp*height*knee_direction
  a=bone_angle(upper,knee);b=bone_angle(lower,target-knee)-a
  return a,(b+math.pi)%(2*math.pi)-math.pi
 def pose(t,d,name):
  p=t/d;v={}
  def set(n,r=None,m=None):v[n]={};v[n].update({'rot':r} if r is not None else {});v[n].update({'move':m} if m is not None else {})
  wave=math.sin(p*2*math.pi)
  if name=='idle':set('neck',[.016*wave,0,0]);set('head',[.02*wave,.025*wave,0]);set('tail',[0,.10*wave,0]);set('earL',[0,0,.04*wave]);set('earR',[.04*wave,0,0])
  elif name=='walk':
   # Four-beat lateral-sequence walk. Each foot stays on the ground for 68%
   # of its cycle; airborne motion is a low recovery arc, never a high march.
   pitch=.010*math.sin(p*4*math.pi);bob=.004*(1-math.cos(p*4*math.pi))
   set('body',[pitch,0,0],[0,bob,0]);set('neck',[-pitch*.6,0,0]);set('head',[-pitch*.4,0,0]);set('tail',[0,.055*wave,0])
   stance=.68;stride=.25
   for prefix,offset in [('frontL',0),('backR',.75),('frontR',.5),('backL',.25)]:
    phase=(p+offset)%1;fore=prefix.startswith('front');z0=.245 if fore else -.245
    if phase<stance:
     dz=stride*(.5-phase/stance);lift=0;toe=0
    else:
     u=(phase-stance)/(1-stance);smooth=u*u*(3-2*u)
     dz=stride*(-.5+smooth);lift=.060*math.sin(math.pi*u)**1.35;toe=.10*math.sin(math.pi*u)
    # Transform a level-ground target back into the pitched torso coordinates.
    world=np.array([.065+lift-(.44+bob),z0+dz])
    local=rotate_yz(world,-pitch)-np.array([-.04,z0])
    if fore:
     upper=np.array([-.16,-.075]);lower=np.array([-.175,.075]);a,b=ik(local,upper,lower,1)
     set(prefix,[a,0,0]);set(prefix+'_shin',[b,0,0]);set(prefix+'_paw',[-pitch-a-b+toe,0,0])
    else:
     upper=np.array([-.10,.12]);lower=np.array([-.135,-.19]);meta=np.array([-.10,.07])
     # A distinct, elevated rear hock swings behind the paw during propulsion.
     lean=.12*math.cos(2*math.pi*phase)
     meta_local=rotate_yz(meta,lean-pitch);target_hock=local-meta_local
     a,b=ik(target_hock,upper,lower,-1);c=bone_angle(meta,meta_local)-a-b
     set(prefix,[a,0,0]);set(prefix+'_shin',[b,0,0]);set(prefix+'_hock',[c,0,0]);set(prefix+'_paw',[-pitch-a-b-c+toe,0,0])
  elif name in ['attack','lunge']:
   def tween(keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
     if a<=t<=b:
      q=(t-a)/(b-a);q=q*q*(3-2*q);return x*(1-q)+y*q
    return keys[-1][1]
   # Anticipation -> hind-leg push -> airborne bite -> front-paw landing -> settle.
   crouch=tween([(0,0),(.34,1),(.46,.65),(.51,0),(.90,0),(1.00,.65),(1.25,0)])
   pitch=tween([(0,0),(.42,-.06),(.53,-.17),(.70,-.02),(.89,.15),(1.03,.04),(1.25,0)])
   flight=max(0,min(1,(t-.50)/.40));air=.23*4*flight*(1-flight) if .50<t<.90 else 0
   tuck=math.sin(math.pi*flight) if .50<t<.90 else 0
   advance=.44*(flight*flight*(3-2*flight)) if name=='lunge' else 0
   v['__air_height__']=air
   set('EXP_LORE_wilk',m=[0,0,advance])
   bob=-.050*crouch
   set('body',[pitch,0,0],[0,bob,0]);set('neck',[-pitch*.25,0,0]);set('head',[-pitch*.3,0,0])
   jaw=tween([(0,0),(.43,.18),(.59,.57),(.70,.04),(.87,.10),(1.25,0)])
   set('jaw',[jaw,0,0]);set('earL',[.17*crouch,0,0]);set('earR',[.17*crouch,0,0]);set('tail',[.14*tuck,0,0])
   for prefix in ['frontL','frontR','backL','backR']:
    fore=prefix.startswith('front');z0=.245 if fore else -.245
    # Front paws reach toward the bite, rear paws tuck under the hips.
    dz=.085*tuck if fore else -.045*tuck
    lift=.025*tuck if fore else .040*tuck
    world=np.array([.065+lift-(.44+bob),z0+dz]);local=rotate_yz(world,-pitch)-np.array([-.04,z0])
    if fore:
     upper=np.array([-.16,-.075]);lower=np.array([-.175,.075]);a,b=ik(local,upper,lower,1)
     set(prefix,[a,0,0]);set(prefix+'_shin',[b,0,0]);set(prefix+'_paw',[-pitch-a-b-.08*tuck,0,0])
    else:
     upper=np.array([-.10,.12]);lower=np.array([-.135,-.19]);meta=np.array([-.10,.07])
     meta_local=rotate_yz(meta,-pitch+.20*tuck);a,b=ik(local-meta_local,upper,lower,-1);c=bone_angle(meta,meta_local)-a-b
     set(prefix,[a,0,0]);set(prefix+'_shin',[b,0,0]);set(prefix+'_hock',[c,0,0]);set(prefix+'_paw',[-pitch-a-b-c,0,0])
  elif name=='hit':
   q=math.sin(math.pi*p)**2;set('head',[-.22*q,.15*q,0]);set('body',[0,0,.1*q]);set('tail',[.15*q,0,0])
  elif name=='death':
   q=min(1,p/.8);q=q*q*(3-2*q);set('body',[.06*q,0,1.52*q],[0,-.20*q,0]);set('neck',[.2*q,0,0]);set('head',[.12*q,0,.15*q]);set('tail',[.1*q,0,.25*q]);set('jaw',[.15*q,0,0])
   for n in ['frontL','frontR']:set(n,[-.4*q,0,0]);set(n+'_shin',[.6*q,0,0])
   for n in ['backL','backR']:set(n,[.25*q,0,0]);set(n+'_shin',[-.5*q,0,0])
  return v
 for n,d in [('idle',2.4),('walk',.95),('attack',1.25),('lunge',1.25),('hit',.26),('death',1.25)]:s.anim(n,d,lambda t,d,n=n:pose(t,d,n),fps=48 if n in ['attack','lunge'] else 24)
 s.extra={'revision':'44-G003 / reference-inspired compact head and real airborne attack','reference':{'repository':'pgaszczyk-ctrl/exp-lore','path':'src/combat3d/models.ts','blob':'f82f6af16cbc6aeb940f6ee1c4f09999604d6625','interpretation':'Simple coat/body, short shoulder attachment, box muzzle, triangular ears; new rig retains accepted v2 gait'},'walkGait':{'stanceFraction':.68,'stride':.25,'nominalSpeed':.25/(.68*.95),'foreElbow':'backward','hindStifle':'forward','hindHock':'separate elevated joint','footfallSequence':['backL','frontL','backR','frontR']},'style':'pixel-comic / natural fantasy wolf, no mechanical appendages','forward':'+Z','up':'+Y','animationFamily':'quadruped_canid_v2','attackEvents':{'windupStart':0,'windupEnd':.46,'takeoff':.50,'impact':.70,'landing':.90,'recoveryEnd':1.25},'rootMotion':{'attack':'Vertical jump, forward travel supplied by game','lunge':'Vertical jump plus 0.44 units along +Z, extract root motion for collisions'},'Mouth':'effect socket, not damage logic','lunge':'Real forward jumping bite; no return translation. Consume root motion exactly once.'}
 return s
if __name__=='__main__':
 models=[skeleton(),wolf()];metadata={m.name:m.export() for m in models};metadata['notes']={'stage': '44-G003: accepted skeleton/gait, larger head, no visible neck, jumping attack; not deployed', 'rigs': {'szkielet': 'humanoid_rigid_v1', 'wilk': 'quadruped_canid_v2', 'reference_guard': 'legacy_flat_baked'}, 'outline': 'renderer, not GLB geometry', 'materials': 'KHR_materials_unlit; vertex palette; no stock light response', 'rootMotion': {'walk':False,'attack':'vertical jump','lunge':'vertical + 0.44 forward'}, 'wolf_lunge': 'distinct forward leap; impact 0.70 s, landing 0.90 s'};(OUT/'manifest.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False));print(json.dumps(metadata,indent=2))
