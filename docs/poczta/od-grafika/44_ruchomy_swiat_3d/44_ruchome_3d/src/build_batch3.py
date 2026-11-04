from pathlib import Path
import copy,math,json,numpy as np
from scipy.spatial.transform import Rotation
from build_models import Model,Mesh,OUT,unit,rgb,wolf
from build_batch2 import character,face,loft,smooth,tween,add_body_depth

NAMES=['wodnik','wodny_blob','driada','herszt','warg','mosiezny_koziol']
def rename(s,name):s.name=name;s.nodes[0]['name']='EXP_LORE_'+name

def fresh(s,name):
 i=s.find(name);s.meshes[i]=Mesh();return s.meshes[i]
def tint(m,color):
 c=rgb(color);m.c=[]
 for n in m.n:
  d=np.dot(n,unit([-.6,1,.6]));factor=1.035 if d>.55 else .94 if d>-.15 else .78;m.c.append(np.clip(c*factor,0,1))
def scale_mesh(m,f):
 f=np.array(f if hasattr(f,'__len__') else [f,f,f]);m.v=[v*f for v in m.v];m.n=[unit(n/f) for n in m.n]
def enlarge(s,f):
 for m in s.meshes.values():scale_mesh(m,f)
 for n in s.nodes:n['translation']=(np.array(n['translation'])*f).tolist()
 for clip in s.clips.values():
  for ch in clip['channels'].values():ch['translation']=[np.array(p)*f for p in ch['translation']]
  if 'ground_min' in clip:clip['ground_min']=[.003+(v-.003)*f for v in clip['ground_min']]
def retime(s,clip,d):
 c=s.clips[clip];c['times']=c['times']*(d/c['duration']);c['duration']=d

def setpose(v,n,r=None,m=None,scale=None):
 d=v.setdefault(n,{})
 if r is not None:d['rot']=r
 if m is not None:d['move']=m
 if scale is not None:d['scale']=scale

def palm_cast(s,duration,origin_kind):
 def pose(t,d):
  q=tween(t,[(0,0),(.54,1),(.76,.75),(1.10,.28),(d,0)]);w=math.sin(2*math.pi*t/d);v={}
  setpose(v,'torso',[.025,-.12*q,0]);setpose(v,'head',[-.035*q,.08*q,0]);setpose(v,'upperL',[-.15-.70*q,0,.10+.12*q]);setpose(v,'foreL',[-.20-.35*q,0,0]);setpose(v,'upperR',[-.15-.35*q,0,-.10-.15*q]);setpose(v,'foreR',[-.20-.65*q,0,0])
  if origin_kind=='water':
   setpose(v,'handR',[1.6*q,0,0])
   energy=tween(t,[(0,0),(.20,0),(.52,1),(.76,0),(d,0)]);setpose(v,'WaterOrb',scale=[energy]*3)
  else:
   setpose(v,'LeafCape',[.13*q+.025*w,0,0]);setpose(v,'Vine_focus',scale=[.65*q]*3)
  return v
 s.anim('cast',duration,pose,fps=30)

def waterman():
 s=character('bandyta',depth=False);rename(s,'wodnik');skin='91aaa0';coat='526f69'
 m=fresh(s,'head');face(m,skin)
 m.ell((0,.334,0),(.325,.025,.235),'687550',12,4)
 loft(m,[(.34,.205,.15),(.47,.17,.13),(.49,.13,.10)],'5b6949',10)
 for x,dy in [(-.205,.0),(-.17,.035)]:
  m.tube([(x,.34,-.015),(x-.025,.53+dy,-.04),(x-.018,.60+dy,-.035)],[.012,.012,.004],'b4b186',5)
 for x in [-.075,0,.075]:m.patch([(x-.037,.078),(x+.037,.075),(x+.017,-.075)],.154,'4e7762',.02)
 scale_mesh(m,1.15)
 m=fresh(s,'torso');loft(m,[(-.045,.17,.115),(.10,.15,.10),(.255,.125,.09)],coat,10,jagged=.025)
 m.patch([(-.05,.23),(.045,.23),(.06,-.02),(-.07,-.015)],.111,'668a82')
 m.tube([(0,.236,0),(0,.264,0)],[.067,.062],'929377',8)
 for side in ['L','R']:
  tint(s.meshes[s.find('upper'+side)],coat);tint(s.meshes[s.find('fore'+side)],skin);tint(s.meshes[s.find('hand'+side)],skin)
  tint(s.meshes[s.find('thigh'+side)],'495c51');tint(s.meshes[s.find('shin'+side)],'495c51');tint(s.meshes[s.find('foot'+side)],'414d48')
 m=fresh(s,'Weapon_dagger');s.nodes[s.find('Weapon_dagger')]['name']='Water_focus'
 m.tube([(0,-.10,0),(0,.34,0)],[.018,.014],'827753',7);m.ell((0,.355,0),(.043,.050,.043),'79aeb1',8,5)
 s.node('WaterOrigin',(0,.355,.012),s.find('Water_focus'))
 orb,m=s.node('WaterOrb',(0,0,.045),s.find('L_at_hand_grip'));m.ell((0,0,0),(.061,.061,.061),'90c3b8',8,5);s.nodes[orb]['scale']=[0,0,0]
 palm_cast(s,1.5,'water');retime(s,'walk',1.10)
 # A calmer idle makes the waterman distinct from a zombie silhouette and gait.
 def idle(t,d):
  w=math.sin(2*math.pi*t/d);return {'torso':{'rot':[.018*w,0,0]},'head':{'rot':[0,.04*w,0]},'upperL':{'rot':[-.08,0,.08]},'upperR':{'rot':[-.16,0,-.08]},'foreR':{'rot':[-.25,0,0]}}
 s.anim('idle',2.8,idle)
 s.extra={'revision':'44-G006','animationFamily':'humanoid_rigid_v1','forward':'+Z','up':'+Y','rootMotion':False,'identity':'Water spirit with reed hat, algae beard and staff; own model, not a blue zombie','attackEvents':{'windupEnd':.44,'impact':.60},'castEvents':{'release':.76,'origin':'WaterOrigin','summon':'wodny_blob'},'retargeting':'Rebase translated pivots when sharing clips across proportions.'}
 return s

def dryad():
 s=character('bandyta',depth=False);rename(s,'driada');skin='bdcca0'
 m=fresh(s,'head');face(m,skin)
 m.ell((0,.235,-.13),(.275,.24,.14),'527446',10,6)
 m.ell((0,.393,-.02),(.215,.125,.18),'62834d',9,5)
 for side in [-1,1]:
  m.ell((side*.225,.23,-.035),(.075,.155,.135),'587e48',8,5)
  m.patch([(side*.15,.33),(side*.265,.335),(side*.205,.22)],.155,'6d8c50',.016)
 for x in [-.07,.055]:m.patch([(x-.055,.35),(x+.057,.345),(x+.006,.24)],.184,'64854c',.012)
 m.tube([(-.19,.35,-.08),(-.22,.49,-.10),(-.18,.55,-.11)],[.016,.012,.004],'76664c',6)
 scale_mesh(m,1.15)
 m=fresh(s,'torso');m.ell((0,.12,0),(.145,.165,.095),'78674f',10,6)
 loft(m,[(-.07,.195,.125),(.07,.15,.10),(.14,.13,.09)],'5f7e4e',10,jagged=.035)
 m.patch([(-.05,.24),(.035,.24),(.065,.11),(-.045,.10)],.096,'8a7658')
 for side in ['L','R']:
  tint(s.meshes[s.find('upper'+side)],skin);tint(s.meshes[s.find('fore'+side)],skin);tint(s.meshes[s.find('hand'+side)],skin)
  tint(s.meshes[s.find('thigh'+side)],'65754d');tint(s.meshes[s.find('shin'+side)],skin);tint(s.meshes[s.find('foot'+side)],'6d684b')
 m=fresh(s,'Weapon_dagger');s.nodes[s.find('Weapon_dagger')]['name']='VineAnchor'
 cape,m=s.node('LeafCape',(0,.21,-.092),s.find('torso'));m.prism([(-.12,0),(.12,0),(.10,-.22),(0,-.30),(-.11,-.20)],.014,'557748')
 focus,m=s.node('Vine_focus',(0,0,.04),s.find('L_at_hand_grip'));m.ell((0,0,0),(.055,.048,.055),'a8b786',8,4);s.nodes[focus]['scale']=[0,0,0]
 s.node('VineOrigin',(0,-.005,.045),s.find('L_at_hand_grip'));palm_cast(s,1.6,'nature');retime(s,'walk',1.05)
 # Bare-hand attack, no borrowed knife.
 def attack(t,d):
  q=tween(t,[(0,0),(.44,1),(.65,-.5),(d,0)]);return {'torso':{'rot':[.05,-.22*q,0]},'head':{'rot':[0,.1*q,0]},'upperL':{'rot':[-.65+.20*q,0,.08]},'foreL':{'rot':[-.30,0,0]},'upperR':{'rot':[-.18,0,-.12]},'foreR':{'rot':[-.20,0,0]}}
 s.anim('attack',1.2,attack,30)
 s.extra={'revision':'44-G006','animationFamily':'humanoid_rigid_v1','forward':'+Z','up':'+Y','rootMotion':False,'attackEvents':{'windupEnd':.44,'impact':.65},'castEvents':{'release':.76,'origin':'VineOrigin'},'effects':'Vines and targets are game effects, not baked into the character model.'}
 return s

def blob():
 s=Model('wodny_blob');root,_=s.node('EXP_LORE_wodny_blob');body,m=s.node('body',(0,.23,0),root)
 loft(m,[(-.20,.17,.15),(-.14,.25,.22),(0,.26,.24),(.15,.20,.185),(.27,.06,.055),(.31,.012,.012)],'6fa9a6',12)
 for x in [-.074,.074]:m.box((x,.018,.239),(.028,.063,.014),'324e59')
 m.patch([(-.13,.14),(-.065,.18),(-.04,.125),(-.10,.09)],.18,'b1d5c8',.004)
 s.node('SplashOrigin',(0,.01,.25),body)
 def pose(t,d,name):
  p=t/d;w=math.sin(2*math.pi*p);v={}
  if name=='idle':setpose(v,'body',scale=[1+.035*w,1-.055*w,1+.025*w])
  elif name in ['walk','wobble']:
   setpose(v,'body',[.035*w,0,.035*w],scale=[1+.08*math.cos(2*math.pi*p),1-.12*math.cos(2*math.pi*p),1+.055*math.cos(2*math.pi*p)]);v['__air_height__']=.05*math.sin(math.pi*p)**2
  elif name=='attack':
   q=tween(t,[(0,0),(.42,1),(.60,-.65),(.82,-.20),(d,0)]);u=max(0,min(1,(t-.44)/.34));v['__air_height__']=.09*math.sin(math.pi*u)**2
   setpose(v,'body',[.1*q,0,0],[0,0,.11*math.sin(math.pi*u)],scale=[1+.15*q,1-.26*q,1+.08*q])
  elif name=='hit':
   q=math.sin(math.pi*p)**2;setpose(v,'body',scale=[1+.2*q,1-.38*q,1+.12*q])
  elif name=='death':
   q=smooth(min(1,p/.80));setpose(v,'body',scale=[1+.55*q,1-.91*q,1+.32*q])
  return v
 for name,d in [('idle',2.2),('walk',.72),('wobble',.72),('attack',1.1),('hit',.30),('death',1.0)]:s.anim(name,d,lambda t,d,name=name:pose(t,d,name))
 s.extra={'revision':'44-G006','animationFamily':'amorphous_rigid_v1','forward':'+Z','up':'+Y','rootMotion':False,'attackEvents':{'windupEnd':.42,'impact':.60},'walkAlias':'walk and wobble share the same elastic locomotion; no legs','material':'Opaque stylized water, no costly transparency sorting','death':'Squashes into a small puddle; game handles despawn'}
 return s

def move_rest(s,i,pos):
 pos=np.array(pos,float);delta=pos-np.array(s.nodes[i]['translation']);s.nodes[i]['translation']=pos.tolist()
 for clip in s.clips.values():
  if i in clip['channels']:clip['channels'][i]['translation']=[np.array(p)+delta for p in clip['channels'][i]['translation']]
def scale_branch(s,i,f):
 f=np.array(f);scale_mesh(s.meshes[i],f)
 for child in s.nodes[i].get('children',[]):
  s.nodes[child]['translation']=(np.array(s.nodes[child]['translation'])*f).tolist()
  for clip in s.clips.values():
   if child in clip['channels']:clip['channels'][child]['translation']=[np.array(p)*f for p in clip['channels'][child]['translation']]
  scale_branch(s,child,f)

def chief():
 s=character('chochlik',depth=False);rename(s,'herszt');s.clips.pop('throw',None)
 skin='879553';m=fresh(s,'head');face(m,skin,goblin=True)
 for side in [-1,1]:m.prism([(side*.21,.23),(side*.37,.29),(side*.31,.14),(side*.22,.12)],.045,skin)
 loft(m,[(.255,.255,.185),(.30,.268,.20),(.445,.18,.16),(.51,.025,.035)],'737264',10)
 loft(m,[(.248,.266,.197),(.274,.27,.20)],'5d5545',10)
 m.patch([(-.024,.27),(.024,.27),(.028,.44),(0,.50),(-.028,.44)],.198,'9a947b',.012)
 scale_mesh(m,1.10)
 m=fresh(s,'torso');m.ell((0,.112,0),(.165,.17,.115),'6d5942',10,6)
 m.patch([(-.13,.22),(.13,.22),(.12,.055),(0,.025),(-.12,.055)],.112,'665f4c',.015)
 for x in [-.085,.085]:m.ell((x,.17,.135),(.013,.013,.012),'b2985b',6,4)
 for side in ['L','R']:
  upper=s.meshes[s.find('upper'+side)];upper.ell((0,-.025,0),(.075,.060,.071),'777260',8,4)
  tint(s.meshes[s.find('fore'+side)],skin);tint(s.meshes[s.find('hand'+side)],skin)
 prop=s.find('Acorn_prop');s.nodes[prop]['name']='Club';m=s.meshes[prop]=Mesh()
 m.tube([(0,0,0),(0,0,.28)],[.028,.035],'786045',7);m.ell((0,.005,.31),(.068,.080,.095),'69513b',9,5)
 m.tube([(0,0,.265),(0,0,.285)],[.071,.071],'a68b51',9)
 socket=s.find('ThrowOrigin');s.nodes[socket]['name']='SlamOrigin';move_rest(s,socket,[0,0,.405])
 enlarge(s,1.16);retime(s,'walk',1.10)
 def attack(t,d):
  q=tween(t,[(0,0),(.60,1),(.82,-.55),(d,0)]);return {'torso':{'rot':[.04,-.4*q,0]},'head':{'rot':[.04,.16*q,0]},'upperR':{'rot':[-.55,-.72*q,-.18-.30*(1-q)]},'foreR':{'rot':[-.46-.25*max(0,q),0,0]},'upperL':{'rot':[-.45,0,.20]},'foreL':{'rot':[-.35,0,0]}}
 s.anim('attack',1.4,attack,30)
 def slam(t,d):
  wind=tween(t,[(0,0),(.58,1),(.82,0),(d,0)]);strike=tween(t,[(0,0),(.58,0),(.82,1),(1.05,.70),(d,0)])
  return {'torso':{'rot':[-.08*wind+.18*strike,0,0]},'head':{'rot':[.06*strike,0,0]},'upperR':{'rot':[-.15-1.45*wind-.40*strike,0,-.06]},'foreR':{'rot':[-.15-1.25*wind-.25*strike,0,0]},'handR':{'rot':[1.5*wind+1.17*strike,0,0]},'upperL':{'rot':[-.40,0,.35]},'foreL':{'rot':[-.4,0,0]}}
 s.anim('slam',1.65,slam,96)
 s.extra={'revision':'44-G006','animationFamily':'humanoid_rigid_v1','forward':'+Z','up':'+Y','rootMotion':False,'attackEvents':{'windupEnd':.60,'impact':.82},'slamEvents':{'windupEnd':.58,'impact':.82,'origin':'SlamOrigin'},'weapon':'Club is attached to R_at_hand_grip','variants':{'giant':'Game may scale this rig; collision and timing need separate balancing'}}
 return s

def warg():
 s=wolf();rename(s,'warg')
 for name in ['body','frontL','frontR','backL','backR']:tint(s.meshes[s.find(name)],'545459')
 for name in ['frontL_shin','frontR_shin','backL_shin','backR_shin','backL_hock','backR_hock','frontL_paw','frontR_paw','backL_paw','backR_paw','tail']:tint(s.meshes[s.find(name)],'46494d')
 for name in ['head','jaw']:
  m=s.meshes[s.find(name)];m.c=[np.clip(c*np.array([.77,.73,.77]),0,1) for c in m.c]
 scale_branch(s,s.find('head'),[1.14,1.08,1.04])
 m=s.meshes[s.find('head')]
 for side in [-1,1]:
  m.tube([(side*.126,-.120,.405),(side*.126,-.195,.414)],[.018,.001],'d6d0b4',6)
  m.prism([(side*.22,.015),(side*.34,-.055),(side*.25,-.075)],.075,'4d4e52')
 enlarge(s,1.18);retime(s,'walk',1.05)
 def bite(t,d):
  q=tween(t,[(0,0),(.32,1),(.56,-.55),(.78,-.10),(d,0)]);jaw=tween(t,[(0,0),(.32,.25),(.46,.65),(.56,.03),(.74,.12),(d,0)])
  return {'body':{'rot':[.045*q,0,0]},'head':{'rot':[.10*q,0,0]},'jaw':{'rot':[jaw,0,0]},'earL':{'rot':[.15*max(0,q),0,0]},'earR':{'rot':[.15*max(0,q),0,0]}}
 s.anim('attack',1.05,bite,36);s.clips['bite']=copy.deepcopy(s.clips['attack']);s.clips['pounce']=copy.deepcopy(s.clips['lunge'])
 s.extra={'revision':'44-G006','animationFamily':'quadruped_canid_v2','forward':'+Z','up':'+Y','identity':'Broader skull and chest, heavier dark coat, large fangs; derived from accepted wolf anatomy','rootMotion':{'attack':False,'bite':False,'pounce':'.5192 units forward; extract root motion once','lunge':'alias of pounce'},'attackEvents':{'windupEnd':.32,'impact':.56},'pounceEvents':{'takeoff':.50,'impact':.70,'landing':.90,'forwardDistance':.5192},'walkPeriod':1.05}
 return s

def two_link(target,upper,lower):
 A=np.linalg.norm(upper);B=np.linalg.norm(lower);raw=np.linalg.norm(target);d=min(A+B-1e-5,max(abs(A-B)+1e-5,raw));u=target/max(raw,1e-9);along=(A*A-B*B+d*d)/(2*d);h=math.sqrt(max(0,A*A-along*along));k=u*along-np.array([-u[1],u[0]])*h
 ang=lambda v:math.atan2(v[1],v[0]);a=ang(k)-ang(upper);b=ang(target-k)-ang(lower)-a;return (a+math.pi)%(2*math.pi)-math.pi,(b+math.pi)%(2*math.pi)-math.pi

def brass_goat():
 s=character('bandyta',depth=False);rename(s,'mosiezny_koziol');m=fresh(s,'head')
 m.ell((0,.22,0),(.225,.225,.195),'af8c4c',11,6)
 m.ell((0,.13,.19),(.122,.112,.195),'ba9654',9,5)
 m.box((0,.105,.367),(.165,.080,.038),'75613e')
 for side in [-1,1]:
  m.box((side*.099,.248,.179),(.046,.071,.017),'514d3d');m.box((side*.099,.257,.191),(.020,.034,.009),'d3b66a')
  m.prism([(side*.19,.30),(side*.34,.33),(side*.27,.20),(side*.20,.19)],.045,'a58346')
  pts=[(side*.18,.37,-.015),(side*.29,.45,-.04),(side*.39,.43,-.07),(side*.43,.32,-.04),(side*.39,.24,.035),(side*.31,.26,.105),(side*.29,.33,.12)]
  m.tube(pts,[.061,.061,.053,.047,.036,.025,.005],'8e724a',7)
 m.patch([(-.060,.08),(.060,.08),(0,-.045)],.15,'997641',.015)
 scale_mesh(m,1.15)
 m=fresh(s,'torso');m.ell((0,.12,0),(.182,.185,.123),'a88245',11,6)
 m.ell((0,.13,.122),(.096,.098,.019),'5a5546',10,5);m.ell((0,.13,.145),(.064,.067,.018),'bf934a',9,5)
 for x in [-.129,.129]:m.ell((x,.21,.095),(.015,.015,.014),'d0af65',6,4)
 for side in ['L','R']:
  m=fresh(s,'upper'+side);m.tube([(0,0,0),(0,-.16,0)],[.062,.051],'a88245',8);m.tube([(-.055,0,0),(.055,0,0)],[.066,.066],'665d49',10)
  m=fresh(s,'fore'+side);m.tube([(0,0,0),(0,-.14,0)],[.046,.044],'b08c4c',8);m.tube([(.037,-.015,.018),(.037,-.12,.018)],[.012,.012],'5e5d52',6)
  m=fresh(s,'hand'+side);m.ell((0,-.026,.009),(.046,.046,.039),'a58348',8,4)
  for x in [-.027,.027]:m.box((x,-.05,.027),(.018,.042,.026),'7b6b46')
  tint(s.meshes[s.find('thigh'+side)],'9c7d44');tint(s.meshes[s.find('shin'+side)],'6d6653')
  m=fresh(s,'foot'+side)
  for x in [-.027,.027]:m.box((x,-.025,.036),(.048,.050,.105),'5f5847')
 m=fresh(s,'Weapon_dagger');s.nodes[s.find('Weapon_dagger')]['name']='RightToolSocket'
 s.node('HornOrigin',(0,.36,.15),s.find('head'));enlarge(s,1.15);retime(s,'walk',1.15)
 # Rigid mechanical arms: smaller arm swings than the living humanoid base.
 for name in ['upperL','upperR','foreL','foreR']:
  ch=s.clips['walk']['channels'][s.find(name)]['rotation'];e=Rotation.from_quat(ch).as_euler('xyz');e[:,0]*=.50;s.clips['walk']['channels'][s.find(name)]['rotation']=list(Rotation.from_euler('xyz',e).as_quat())
 def horns(t,d):
  q=tween(t,[(0,0),(.55,1),(.78,-.40),(1.10,-.10),(d,0)])
  return {'torso':{'rot':[-.06*q,0,0]},'head':{'rot':[-.18*max(0,q)+1.10*max(0,-q),0,0]},'upperL':{'rot':[-.35,0,.16]},'upperR':{'rot':[-.35,0,-.16]},'foreL':{'rot':[-.35,0,0]},'foreR':{'rot':[-.35,0,0]}}
 s.anim('attack',1.40,horns,36);s.clips['horns']=copy.deepcopy(s.clips['attack'])
 def charge(t,d):
  u=max(0,min(1,(t-.45)/.65));run=math.sin(2*math.pi*u*2.0) if 0<u<1 else 0;prep=tween(t,[(0,0),(.40,1),(1.05,1),(d,0)]);v={}
  setpose(v,'EXP_LORE_mosiezny_koziol',m=[0,0,.72*smooth(u)]);setpose(v,'torso',[.12*prep,0,0]);setpose(v,'head',[.42*prep,0,0])
  for side,sgn in [('L',1),('R',-1)]:setpose(v,'thigh'+side,[.48*run*sgn,0,0]);setpose(v,'shin'+side,[.65*max(0,-run*sgn),0,0]);setpose(v,'upper'+side,[-.12-.08*run*sgn,0,.12*sgn]);setpose(v,'fore'+side,[-.30,0,0])
  return v
 s.anim('charge',1.50,charge,40)
 def stomp(t,d):
  lift=tween(t,[(0,0),(.48,1),(.70,0),(.92,0),(d,0)]);v={};hipY=s.nodes[s.find('hips')]['translation'][1]
  for side in ['L','R']:
   thigh=np.array(s.nodes[s.find('thigh'+side)]['translation']);upper=np.array(s.nodes[s.find('shin'+side)]['translation'])[[1,2]];lower=np.array(s.nodes[s.find('foot'+side)]['translation'])[[1,2]];floor=hipY+thigh[1]+upper[0]+lower[0];target=np.array([floor-hipY-thigh[1]+(.15*lift if side=='R' else 0),.025*lift if side=='R' else 0]);a,b=two_link(target,upper,lower)
   setpose(v,'thigh'+side,[a,0,0]);setpose(v,'shin'+side,[b,0,0]);setpose(v,'foot'+side,[-a-b,0,0])
  setpose(v,'upperL',[-.2,0,.28*lift]);setpose(v,'upperR',[-.2,0,-.28*lift]);setpose(v,'foreL',[-.25,0,0]);setpose(v,'foreR',[-.25,0,0]);setpose(v,'head',[.14*lift,0,0])
  return v
 s.anim('stomp',1.35,stomp,36)
 s.extra={'revision':'44-G006','animationFamily':'mechanical_humanoid_v1','forward':'+Z','up':'+Y','identity':'Upright mechanical goat, following the original brass-goat reference; curved horns and cloven hooves','rootMotion':{'attack':False,'horns':False,'stomp':False,'charge':'.72 units forward; extract once and resolve collisions'},'attackEvents':{'windupEnd':.55,'impact':.78},'chargeEvents':{'windupEnd':.45,'impact':.94,'stop':1.10,'forwardDistance':.72},'stompEvents':{'windupEnd':.48,'impact':.70},'hornSocket':'HornOrigin'}
 return s

def inherit_profile_depth(s):
 # Apply G005 depth geometry exactly once after constructing the new humanoids.
 old=[np.array(n['translation'],float) for n in s.nodes]
 add_body_depth(s)
 for i,n in enumerate(s.nodes):
  delta=np.array(n['translation'])-old[i]
  if np.max(np.abs(delta))>0:
   for clip in s.clips.values():
    if i in clip['channels']:clip['channels'][i]['translation']=[np.array(p)+delta for p in clip['channels'][i]['translation']]
 s.extra['profileDepth']='Same baked body-depth policy as preserved G005 humanoids; no hierarchy scaling'
 return s

def reground(s):
 # Derived models replace geometry after base clips were baked. Preserve each
 # clip's intended hover/jump margin while recomputing ground contact.
 verts={i:np.array(m.v) for i,m in s.meshes.items() if m.v}
 for clip in s.clips.values():
  for j in range(len(clip['times'])):
   worlds=[]
   for i,n in enumerate(s.nodes):
    ch=clip['channels'].get(i,{})
    T=ch['translation'][j] if 'translation' in ch else n.get('translation',[0,0,0]);Q=ch['rotation'][j] if 'rotation' in ch else n.get('rotation',[0,0,0,1]);S=ch['scale'][j] if 'scale' in ch else n.get('scale',[1,1,1]);local=np.eye(4);local[:3,:3]=Rotation.from_quat(Q).as_matrix()@np.diag(S);local[:3,3]=T;worlds.append(worlds[s.parents[i]]@local if i in s.parents else local)
   lowest=min((v@worlds[i][:3,:3].T+worlds[i][:3,3])[:,1].min() for i,v in verts.items());target=clip.get('ground_min',[.003]*len(clip['times']))[j];clip['channels'][0]['translation'][j][1]+=target-lowest
 return s

if __name__=='__main__':
 from chibi_style import chibify
 models=[waterman(),blob(),dryad(),chief(),warg(),brass_goat()]
 models=[chibify(inherit_profile_depth(m)) if m.name in ['wodnik','driada','herszt','mosiezny_koziol'] else reground(m) for m in models]
 meta={m.name:m.export() for m in models}
 old=json.loads((OUT/'manifest.json').read_text());old.update(meta);old['notes']['accepted_models']=['szkielet','wilk','chochlik','bandyta','zombiak','upior_krypty'];old['notes']['awaiting_art_review']=NAMES;old['notes']['batch3']='44-G006: six new models, preserving G005 depth corrections';old['notes']['preserved_revision']='44-G005 profile depth';(OUT/'manifest.json').write_text(json.dumps(old,ensure_ascii=False,indent=2));(OUT/'partia3_manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));print(json.dumps(meta,ensure_ascii=False,indent=2))
