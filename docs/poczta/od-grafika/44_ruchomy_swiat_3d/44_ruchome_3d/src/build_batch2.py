from pathlib import Path
import math,json,numpy as np
from scipy.spatial.transform import Rotation
from build_models import Model,Mesh,OUT,unit

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def tween(t,keys):
 for (a,x),(b,y) in zip(keys,keys[1:]):
  if a<=t<=b:return x+(y-x)*smooth((t-a)/(b-a))
 return keys[0][1] if t<keys[0][0] else keys[-1][1]
def loft(m,rings,color,N=10,jagged=0):
 pts=[]
 for i,(y,rx,rz) in enumerate(rings):
  pts.append([np.array([rx*math.cos(j*2*math.pi/N),y+(j%2)*jagged if i==0 else y,rz*math.sin(j*2*math.pi/N)]) for j in range(N)])
 for i in range(len(rings)-1):
  for j in range(N):
   a,b,c,d=pts[i][j],pts[i][(j+1)%N],pts[i+1][(j+1)%N],pts[i+1][j]
   mid=(a+b+c+d)/4;m.quad(a,b,c,d,color,[mid[0],0,mid[2]])
 for index,sign in [(0,-1),(-1,1)]:
  center=np.mean(pts[index],axis=0)
  for j in range(N):m.tri(center,pts[index][j],pts[index][(j+1)%N],color,[0,sign,0])
def rotate_mesh(m,angles):
 R=Rotation.from_euler('xyz',angles).as_matrix();m.v=[R@p for p in m.v];m.n=[R@n for n in m.n]
def add_body_depth(s):
 # Bake volume into each rigid mesh, before animation sampling. No nonuniform
 # scale on the animated hierarchy: rotations, weapons and props stay rigid.
 for i,node in enumerate(s.nodes):
  name=node['name']
  factor=1.25 if name=='head' else 1.55 if name=='torso' else 1.35 if name=='hips' else 1.45 if name.startswith('shroud') else 1.20 if name.startswith(('upper','fore','hand','thigh','shin')) else 1.15 if name.startswith('foot') else 1.0
  f=np.array([1.,1.,factor]);mesh=s.meshes[i]
  mesh.v=[p*f for p in mesh.v];mesh.n=[unit(n/f) for n in mesh.n]
  # Face/voice emitters and hand grips follow the newly deepened surface.
  # Joint locations and IK lengths stay identical to the accepted animation.
  for child in node.get('children',[]):
   child_name=s.nodes[child]['name']
   if child_name in ['Mouth','VoiceOrigin'] or '_at_hand_grip' in child_name:
    s.nodes[child]['translation'][2]*=factor
def blade(m):
 m.box((0,0,.012),(.028,.028,.075),'654937');m.box((0,0,.058),(.09,.026,.02),'a88b54')
 b=Mesh();b.prism([(-.025,.065),(.025,.065),(.022,.19),(0,.25),(-.022,.19)],.008,'a9b4ad');rotate_mesh(b,[math.pi/2,0,0]);m.v.extend(b.v);m.c.extend(b.c);m.n.extend(b.n)
def face(m,skin,zombie=False,goblin=False):
 m.ell((0,.19,0),(.255,.235,.19),skin,12,7)
 for side in [-1,1]:
  if not goblin:m.ell((side*.245,.185,-.005),(.035,.050,.035),skin,7,4)
  x=side*.086
  m.box((x,.191,.183),(.030,.071 if not zombie or side==-1 else .048,.016),'302936')
 m.ell((0,.136,.194),(.025,.024,.027),skin,6,4)
 if zombie:
  m.patch([(-.049,.083),(.043,.083),(.027,.059),(-.038,.059)],.174,'4a4649')
  m.box((.019,.073,.183),(.019,.024,.008),'d8d4bb')
 elif goblin:
  m.patch([(-.050,.091),(.041,.080),(.031,.064),(-.041,.071)],.178,'4e4a36')
  m.patch([(-.027,.089),(-.014,.089),(-.017,.066)],.187,'ded2ad')
 else:m.box((0,.083,.178),(.061,.012,.012),'9b6d56')
def hair_cap(m,color):
 # A low cap at the back; the face remains a single fixed-color surface.
 loft(m,[(.20,.25,.17),(.32,.273,.205),(.42,.21,.16),(.47,.10,.07)],color,10)
 # A few large locks, rather than many independent hairs.
 for poly,z in [([(-.245,.33),(-.105,.34),(-.153,.19)],.166),([(-.08,.36),(.09,.36),(.045,.246)],.190),([(.08,.35),(.23,.33),(.194,.22)],.163)]:m.patch(poly,z,color,.009)

def character(kind,depth=True):
 gob=kind=='chochlik';zombie=kind=='zombiak';s=Model(kind);root,_=s.node('EXP_LORE_'+kind)
 hipY=.29 if gob else .37;hip,m=s.node('hips',(0,hipY,0),root)
 skin='98a75f' if gob else '9ba8a5' if zombie else 'd7a477'
 shirt='774b3c' if gob else '775157' if zombie else '623d42';pants='493e39' if gob else '55504e' if zombie else '3f3b40'
 m.ell((0,.005,0),(.134,.075,.096),pants,9,4)
 m.box((0,.058,.005),(.28,.044,.21),'5a4232');m.box((0,.058,.116),(.05,.043,.018),'ad8c50')
 torso,m=s.node('torso',(0,.065 if gob else .08,0),hip)
 m.ell((0,.117,0),(.143,.168,.095),shirt,10,6)
 if gob:
  m.patch([(-.137,.13),(-.045,.21),(-.027,.07),(-.12,.025)],.083,'5c4434')
  m.patch([(.137,.13),(.045,.21),(.027,.07),(.12,.025)],.083,'5c4434')
 elif zombie:
  # Three large torn panels; no wounds or gore.
  for x,y in [(-.105,.035),(-.027,.020),(.065,.028)]:m.patch([(x-.035,y+.04),(x+.035,y+.04),(x+.015,y-.027)],.081,shirt)
  m.patch([(-.035,.22),(.055,.20),(.04,.11),(-.028,.13)],.098,skin)
 else:
  for side in [-1,1]:m.patch([(side*.025,.248),(side*.13,.18),(side*.12,.035),(side*.035,.025)],.092,'4c3c36')
  m.tube([(0,.244,0),(0,.266,0)],[.063,.058],'77514d',9)
 head,m=s.node('head',(0,.220 if gob else .260,0),torso);face(m,skin,zombie,gob)
 if gob:
  for side in [-1,1]:
   poly=[(side*.21,.245),(side*.405,.315),(side*.34,.145),(side*.22,.115)]
   m.prism(poly,.048,skin);m.patch([(side*.245,.224),(side*.36,.275),(side*.314,.166)],.051,'7f8750',.004)
  m.ell((0,.356,-.035),(.153,.113,.14),'57493c',9,5)
  for x,h in [(-.105,.465),(-.018,.495),(.075,.457)]:m.prism([(x-.044,.36),(x+.05,.36),(x+.018,h)],.065,'57493c')
 elif zombie:
  # Sparse hair on the sides, leaving the top of the pale head visible.
  m.ell((-.209,.272,-.055),(.061,.124,.122),'4b484e',7,5)
  m.ell((.185,.285,-.08),(.073,.109,.115),'4b484e',7,5)
  m.prism([(-.081,.392),(.032,.402),(-.018,.465)],.07,'4b484e')
 else:
  hair_cap(m,'3c343e')
  m.ell((0,.20,-.125),(.258,.23,.118),'3c343e',10,6)
  for poly in [[(-.22,.375),(-.10,.42),(-.19,.495)],[(-.07,.43),(.055,.42),(.014,.52)],[(.11,.39),(.24,.36),(.19,.48)]]:m.prism(poly,.075,'3c343e')
 armLength=.13 if gob else .16;foreLength=.115 if gob else .14
 for side,sgn in [('L',-1),('R',1)]:
  upper,m=s.node('upper'+side,(sgn*.160,.195,0),torso)
  sleeve=skin if gob or (zombie and side=='R') else shirt
  m.ell((0,-armLength*.43,0),(.050,armLength*.62,.052),sleeve,8,5)
  fore,m=s.node('fore'+side,(0,-armLength,0),upper)
  m.tube([(0,0,0),(0,-foreLength,0)],[.034,.030],skin,7)
  if gob:m.tube([(0,-foreLength+.02,0),(0,-foreLength+.006,0)],[.035,.034],'69513b',7)
  hand,m=s.node('hand'+side,(0,-foreLength,0),fore);m.ell((0,-.026,.009),(.040,.044,.036),skin,8,4)
  s.node(side+'_at_hand_grip',(0,-.024,.027),hand)
 upperLen=.115 if gob else .155;lowerLen=.115 if gob else .155
 for side,sgn in [('L',-1),('R',1)]:
  leg,m=s.node('thigh'+side,(sgn*.085,-.01,0),hip)
  m.tube([(0,0,0),(0,-upperLen,.022)],[.048,.039],pants,7)
  shin,m=s.node('shin'+side,(0,-upperLen,.022),leg)
  m.tube([(0,0,0),(0,-lowerLen,-.022)],[.037,.030],pants,7)
  foot,m=s.node('foot'+side,(0,-lowerLen,-.022),shin)
  boot=skin if zombie and side=='R' else '463d37'
  m.ell((0,-.025,.028),(.053,.025,.074),boot,8,4)
 if kind=='bandyta':
  weapon,m=s.node('Weapon_dagger',(0,0,0),s.find('R_at_hand_grip'));blade(m)
 if gob:
  prop,m=s.node('Acorn_prop',(0,0,.025),s.find('R_at_hand_grip'))
  m.ell((0,0,0),(.030,.041,.030),'967146',8,4);m.ell((0,.025,0),(.034,.017,.034),'66503b',8,4)
  s.node('ThrowOrigin',(0,0,.045),s.find('R_at_hand_grip'))
 else:s.node('Mouth',(0,.08,.205),head)
 # Scale each head as one unit; features stay attached in all viewing directions.
 def enlarge_head(i,f):
  s.meshes[i].v=[p*f for p in s.meshes[i].v]
  for child in s.nodes[i].get('children',[]):
   s.nodes[child]['translation']=(np.array(s.nodes[child]['translation'])*f).tolist();enlarge_head(child,f)
 enlarge_head(head,1.10 if gob else 1.15)
 if depth:add_body_depth(s)
 def ik(target,l1,l2):
  upper=np.array([-l1,.022]);lower=np.array([-l2,-.022]);A=np.linalg.norm(upper);B=np.linalg.norm(lower);d=np.linalg.norm(target);d=min(A+B-1e-5,max(abs(A-B)+1e-5,d));u=target/max(np.linalg.norm(target),1e-8);along=(A*A-B*B+d*d)/(2*d);h=math.sqrt(max(0,A*A-along*along));k=u*along-np.array([-u[1],u[0]])*h
  angle=lambda v:math.atan2(v[1],v[0]);a=angle(k)-angle(upper);b=angle(target-k)-angle(lower)-a
  return (a+math.pi)%(2*math.pi)-math.pi,(b+math.pi)%(2*math.pi)-math.pi
 def pose(t,d,action):
  p=t/d;w=math.sin(2*math.pi*p);v={}
  def set(n,r=None,m=None,scale=None):
   q=v.setdefault(n,{})
   if r is not None:q['rot']=r
   if m is not None:q['move']=m
   if scale is not None:q['scale']=scale
  set('upperL',[-.10,0,.07]);set('upperR',[-.19,0,-.07]);set('foreL',[-.10,0,0]);set('foreR',[-.15,0,0])
  headTilt=.105 if zombie else 0
  set('head',[.015,0,headTilt])
  if action=='idle':
   set('torso',[.025*w,0,.012*w]);set('head',[.018*w,.035*w,headTilt])
   if zombie:set('upperL',[-.50+.03*w,0,.10]);set('upperR',[-.25,0,-.05]);set('foreL',[-.38,0,0])
   if gob:set('upperR',[-.28+.07*w,0,-.08]);set('foreR',[-.34,0,0])
  elif action=='walk':
   bob=.004*(1-math.cos(4*math.pi*p));set('hips',[0,.025*w,0],[0,bob,0]);set('torso',[.06 if zombie else .035,-.05*w,.015*w]);set('head',[-.02,.03*w,headTilt+.025*w if zombie else -.015*w])
   for side,phase,sign in [('L',0,1),('R',.5,-1)]:
    q=(p+phase)%1;stance=.66 if zombie else .62;stride=.10 if zombie else .12
    if q<stance:dz=stride*(.5-q/stance);lift=0
    else:
     u=(q-stance)/(1-stance);dz=stride*(-.5+smooth(u));lift=(.008 if zombie and side=='R' else .026)*math.sin(math.pi*u)
    # World foot height in rest pose; IK keeps the stance phase low and level.
    floor=hipY-.01-upperLen-lowerLen
    a,b=ik(np.array([floor+lift-(hipY-.01+bob),dz]),upperLen,lowerLen)
    set('thigh'+side,[a,0,0]);set('shin'+side,[b,0,0]);set('foot'+side,[-a-b,0,0])
    if zombie:set('upper'+side,[-.48+.07*sign*w,0,.10*sign]);set('fore'+side,[-.24-.08*sign*w,0,0])
    else:set('upper'+side,[-.10-.20*sign*w,0,.06*sign]);set('fore'+side,[-.12-.10*max(0,sign*w),0,0])
  elif action=='attack':
   wind=.56 if zombie else .44;contact=.78 if zombie else .60
   load=tween(t,[(0,0),(wind,1),(contact,-.55),(d-.15,-.10),(d,0)])
   set('torso',[.08+.04*abs(load),-.33*load,0]);set('head',[-.02,.17*load,headTilt]);set('upperL',[-.45,0,.12]);set('foreL',[-.38,0,0])
   if zombie:
    for side,sgn in [('L',1),('R',-1)]:set('upper'+side,[-.35-.65*(1-load*.4),0,.12*sgn]);set('fore'+side,[-.40,0,0])
   else:
    set('upperR',[-.50,-.70*load,-.15-.40*(1-load)/1.55]);set('foreR',[-.42-.35*max(0,load),.16*load,0])
    if gob:set('upperL',[-.35-.25*(1-load),0,.12])
  elif action=='throw':
   load=tween(t,[(0,0),(.43,1),(.58,-.65),(.90,-.12),(d,0)])
   set('torso',[.04,-.35*load,0]);set('head',[0,.12*load,0]);set('upperR',[-.85-.4*max(0,load),-.4*load,-.18]);set('foreR',[-.70-.65*max(0,load),0,0]);set('upperL',[-.38,0,.30])
   set('Acorn_prop',scale=[1,1,1] if t<.58 else [0,0,0])
  elif action=='hit':
   q=math.sin(math.pi*p)**2;set('torso',[-.22*q,0,.11*q]);set('head',[-.18*q,0,headTilt+.05*q]);set('upperR',[-.3*q,0,-.2*q])
  elif action=='death':
   q=smooth(min(1,p/.8));set('hips',[.25*q,0,1.42*q],[0,-.08*q,0]);set('torso',[.35*q,0,-.12*q]);set('head',[.17*q,0,headTilt+.16*q]);set('upperR',[-.5*q,0,-.45*q]);set('foreR',[-.65*q,0,0]);set('upperL',[-.2*q,0,.25*q]);set('foreL',[-.7*q,0,0]);set('thighR',[-.35*q,0,0]);set('shinR',[.65*q,0,0]);set('thighL',[-.15*q,0,0]);set('shinL',[.45*q,0,0])
  return v
 durations={'idle':2.4,'walk':1.2 if zombie else .80 if gob else .9,'attack':1.5 if zombie else 1.15 if gob else 1.2,'hit':.30,'death':1.25}
 if gob:durations['throw']=1.2
 for name,d in durations.items():s.anim(name,d,lambda t,d,name=name:pose(t,d,name),fps=30 if name in ['attack','throw'] else 24)
 s.extra={'revision':'44-G004','style':'simple chibi pixel-comic fantasy steampunk','animationFamily':'humanoid_rigid_v1','retargeting':'Rotation tracks share joint semantics; rebase translated pivots to target rest pose for different proportions.','forward':'+Z','up':'+Y','rootMotion':False,'attackEvents':{'windupEnd':.56 if zombie else .44,'impact':.78 if zombie else .60},'weapons':'Dagger is a replaceable child mesh of the hand grip' if kind=='bandyta' else 'No detached floating weapon','palette':{'skin':skin,'shirt':shirt,'pants':pants}}
 if gob:s.extra['throwEvents']={'release':.58,'origin':'ThrowOrigin','prop':'Acorn_prop','projectile':'Game creates an acorn at release; no projectile is baked into this character GLB.'}
 s.extra['revision']='44-G005'
 s.extra['volumeRevision']={'headDepth':1.25,'torsoDepth':1.55,'hipDepth':1.35,'limbDepth':1.20,'method':'Baked into geometry; unchanged rig rotations and clip timing'}
 return s

def wraith():
 s=Model('upior_krypty');root,_=s.node('EXP_LORE_upior_krypty');hip,_=s.node('hips',(0,.45,0),root);torso,m=s.node('torso',(0,.05,0),hip)
 loft(m,[(-.45,.235,.15),(-.26,.18,.12),(.02,.15,.105),(.27,.21,.12)],'657d7a',12,jagged=.055)
 # Long front stole and an understated brass fastening.
 m.patch([(-.055,.235),(.055,.235),(.07,-.18),(0,-.25),(-.07,-.18)],.125,'425e60')
 m.patch([(-.037,.23),(0,.264),(.037,.23),(0,.195)],.142,'ad955d',.008)
 for side,sgn in [('L',-1),('R',1)]:
  cloth,m=s.node('shroud'+side,(sgn*.14,-.27,0),torso)
  m.prism([(-.055,.05),(.055,.05),(.04,-.11),(0,-.21),(-.065,-.12)],.032,'536e70')
 head,m=s.node('head',(0,.33,0),torso)
 m.ell((0,.255,-.125),(.295,.30,.135),'354e53',12,7)
 m.tube([(-.25,.015,.035),(-.30,.21,.045),(-.245,.42,.045),(0,.535,.035),(.245,.42,.045),(.30,.21,.045),(.25,.015,.035)],.055,'425e60',7)
 m.ell((0,.19,.055),(.200,.225,.143),'c8d1bb',11,7)
 for side in [-1,1]:
  m.box((side*.073,.203,.190),(.054,.068,.016),'2f3e42');m.box((side*.073,.213,.201),(.023,.034,.008),'b6d8c2')
 m.patch([(-.017,.12),(.017,.12),(0,.154)],.196,'4d5b55')
 m.box((0,.076,.182),(.094,.021,.012),'566860')
 for x in [-.034,0,.034]:m.box((x,.078,.192),(.021,.023,.008),'d6dbc3')
 s.node('VoiceOrigin',(0,.085,.212),head)
 for side,sgn in [('L',-1),('R',1)]:
  upper,m=s.node('upper'+side,(sgn*.205,.24,0),torso)
  m.tube([(0,0,0),(0,-.175,0)],[.072,.063],'536e70',8)
  fore,m=s.node('fore'+side,(0,-.175,0),upper)
  m.tube([(0,0,0),(0,-.18,0)],[.063,.076],'657d7a',8)
  hand,m=s.node('hand'+side,(0,-.19,0),fore);m.ell((0,-.031,.014),(.041,.053,.030),'c8d1bb',8,4)
  for x in [-.024,0,.024]:m.tube([(x,-.05,.025),(x,-.09,.043)],[.008,.004],'c8d1bb',5)
  s.node(side+'_at_hand_grip',(0,-.05,.035),hand)
 add_body_depth(s)
 def pose(t,d,name):
  p=t/d;w=math.sin(2*math.pi*p);v={'__air_height__':.095+.018*w}
  def set(n,r=None,m=None,scale=None):
   q=v.setdefault(n,{})
   if r is not None:q['rot']=r
   if m is not None:q['move']=m
   if scale is not None:q['scale']=scale
  set('upperL',[-.16,0,.18]);set('upperR',[-.20,0,-.18]);set('foreL',[-.18,0,0]);set('foreR',[-.22,0,0]);set('head',[.025*w,.045*w,0]);set('shroudL',[.06*w,0,.045*w]);set('shroudR',[-.06*w,0,-.045*w])
  if name=='idle':set('torso',[.018*w,0,.018*w])
  elif name=='walk':
   set('torso',[.045, .035*w,.018*w]);set('head',[-.035,-.03*w,0]);set('shroudL',[.13*w,0,.06]);set('shroudR',[-.13*w,0,-.06]);set('upperL',[-.20+.06*w,0,.20]);set('upperR',[-.20-.06*w,0,-.20])
  elif name=='attack':
   q=tween(t,[(0,0),(.52,1),(.72,-.55),(1.10,-.10),(d,0)])
   set('torso',[.09,-.30*q,0]);set('upperR',[-.45-.25*(1-q),-.65*q,-.38]);set('foreR',[-.75,0,0]);set('upperL',[-.35,0,.28]);set('head',[.04,.15*q,0])
  elif name=='scream':
   q=tween(t,[(0,0),(.60,1),(.80,.75),(1.05,.65),(d,0)])
   set('upperL',[-.55*q,0,.18+.72*q]);set('upperR',[-.55*q,0,-.18-.72*q]);set('foreL',[-.85*q,0,0]);set('foreR',[-.85*q,0,0]);set('head',[-.23*q,0,0]);set('torso',[-.10*q,0,0]);v['__air_height__']=.095+.06*q
  elif name=='hit':
   q=math.sin(math.pi*p)**2;set('torso',[-.18*q,0,.08*q]);set('head',[-.15*q,0,0])
  elif name=='death':
   q=smooth(min(1,p/.85));v['__air_height__']=.095*(1-q);set('torso',[.12*q,0,.14*q],scale=[1+.1*q,1-.84*q,1+.06*q]);set('head',[.40*q,0,.2*q]);set('upperL',[.3*q,0,.3*q]);set('upperR',[.2*q,0,-.3*q]);set('foreL',[-.6*q,0,0]);set('foreR',[-.6*q,0,0])
  return v
 for name,d in [('idle',2.8),('walk',1.4),('attack',1.35),('scream',1.6),('hit',.35),('death',1.7)]:s.anim(name,d,lambda t,d,name=name:pose(t,d,name),fps=30 if name in ['attack','scream'] else 24)
 s.extra={'revision':'44-G004','animationFamily':'spectral_rigid_v1','style':'opaque chibi spectral boss, no gore','forward':'+Z','up':'+Y','rootMotion':False,'attackEvents':{'windupEnd':.52,'impact':.72},'screamEvents':{'windupEnd':.60,'impact':.80,'origin':'VoiceOrigin'},'levitation':'Persistent vertical presentation offset, not a floating gameplay collider','death':'Robe collapses; opacity/dissolve belongs to game effects'}
 s.extra['revision']='44-G005'
 s.extra['volumeRevision']={'headDepth':1.25,'torsoDepth':1.55,'shroudDepth':1.45,'method':'Baked into geometry; unchanged rig rotations and clip timing'}
 return s

if __name__=='__main__':
 models=[character('chochlik'),character('bandyta'),character('zombiak'),wraith()]
 from chibi_style import chibify
 models=[chibify(m) if m.name!='upior_krypty' else m for m in models]
 meta={m.name:m.export() for m in models}
 original=json.loads((OUT/'manifest.json').read_text());original.update(meta);original['notes']['batch2']='44-G005: increased profile volume in all four batch2 characters; approved skeleton and wolf unchanged';original['notes']['accepted_models']=['szkielet','wilk'];original['notes']['awaiting_art_review']=['chochlik','bandyta','zombiak','upior_krypty'];(OUT/'manifest.json').write_text(json.dumps(original,ensure_ascii=False,indent=2))
 (OUT/'partia2_manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 print(json.dumps(meta,ensure_ascii=False,indent=2))
