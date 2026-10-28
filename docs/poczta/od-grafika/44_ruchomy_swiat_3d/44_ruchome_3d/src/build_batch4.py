"""Authored six resident body families, 15 looks, and a companion dog."""
import math,json,copy
import numpy as np
from chibi_style import branch
from build_models import Model,Mesh,OUT,wolf,unit
from build_batch2 import loft,hair_cap,smooth
from build_batch3 import two_link,rename,fresh,tint,scale_mesh,enlarge,reground,move_rest

# id, display name, body family, hair, coat, bottom, haircut, accessory
LOOKS=[
 ('mloda_kobieta','Młoda kobieta','adult_f','79513e','658f91','584a41','bob','apron'),
 ('chlopiec','Chłopiec','child_m','a66b40','ae8a4c','55473d','crop','belt'),
 ('pan_z_wasem','Pan z wąsem','adult_m','634a39','79505b','4b4442','crop','cap'),
 ('babcia','Babcia','elder_f','c2c1b5','88667b','594551','bun','apron'),
 ('mlody_mezczyzna','Młody mężczyzna','adult_m','3e3a40','60786b','4b4442','crop','vest'),
 ('dziewczynka_warkocze','Dziewczynka z warkoczykami','child_f','77513e','ab7167','5b4c45','braids','belt'),
 ('chlopiec_2','Chłopiec II','child_m','79503d','ad8a4c','536879','messy','belt'),
 ('kobieta','Kobieta','adult_f','75503d','64888a','795c48','pony','belt'),
 ('mezczyzna','Mężczyzna','adult_m','a27b4b','80515a','4b4d54','messy','vest'),
 ('starszy_pan','Starszy pan','elder_m','b9b9ae','718064','635344','sides','moustache'),
 ('dziewczynka','Dziewczynka','child_f','77513e','ad7466','7c684b','pigtails','belt'),
 ('urwis','Urwis','child_m','654a3c','6b8799','675640','messy','strap'),
 ('starsza_pani','Starsza pani','elder_f','c6c3b6','896b7d','65545a','bun','shawl'),
 ('starszy_pan_kapelusz','Starszy pan w kapeluszu','elder_m','b9b9ae','75634d','4b4442','sides','hat'),
 ('mieszczka','Mieszczka','adult_f','79513e','b6a184','85515b','bob','vest'),
]
NAMES=[x[0] for x in LOOKS]+['pies']
TITLES={x[0]:x[1] for x in LOOKS}|{'pies':'Pies'}
BASES={k:{'height':h,'head':head,'hip':hip,'leg':leg,'arm':arm,'width':width} for k,h,head,hip,leg,arm,width in [
 ('adult_m',1.25,.255,.240,.092,.123,.185),('adult_f',1.25,.255,.240,.092,.123,.175),
 ('child_m',1.04,.252,.202,.073,.102,.156),('child_f',1.04,.252,.202,.073,.102,.156),
 ('elder_m',1.21,.255,.226,.085,.120,.186),('elder_f',1.21,.255,.226,.085,.120,.180)]}

def umbrella_mesh(m):
 # Local origin is the hand grip; handle intersects the palm. Closed solid canopy.
 m.tube([(0,-.045,0),(0,.64,0)],[.012,.010],'76664b',6)
 N=10;top=np.array([0,.68,0]);bottom=np.array([0,.53,0])
 ring=[np.array([.43*math.cos(j*2*math.pi/N),.545,.43*math.sin(j*2*math.pi/N)]) for j in range(N)]
 for j in range(N):
  a,b=ring[j],ring[(j+1)%N];color='687b78' if j%2 else '83928b'
  m.tri(top,a,b,color,(top+a+b)/3-[0,.52,0]);m.tri(bottom,b,a,'596b69',[0,-1,0])
 m.ell((0,.69,0),(.021,.03,.021),'ab8a50',6,4)

def resident(spec):
 name,title,kind,hair,coat,pants,cut,acc=spec;b=BASES[kind];child=kind.startswith('child');elder=kind.startswith('elder');female=kind.endswith('_f')
 s=Model(name);root,_=s.node('EXP_LORE_'+name);groups={k:[] for k in ['skin','hair','clothes_1','clothes_2','leather','metal']}
 def part(name,pos,parent,group=None):
  i,m=s.node(name,pos,parent)
  if group:groups[group].append(name)
  return i,m
 skin='dbb28d';w=b['width'];L=b['leg'];A=b['arm'];headrad=b['head']
 hips,m=part('hips',(0,b['hip'],0),root,'clothes_2');m.ell((0,0,0),(w*.84,.069,.133),pants,8,4)
 torso,m=part('torso',(0,.075,0),hips,'clothes_1');m.ell((0,.11,0),(w,.153,.153),coat,10,6)
 if female:
  skirt,m=part('Skirt',(0,0,0),hips,'clothes_2');loft(m,[(-.13,w*1.19,.142),(-.07,w*1.12,.138),(.045,w*.88,.112)],pants,10)
 detail,m=part('Clothes_detail',(0,0,0),torso,'clothes_2')
 if acc in ['apron','shawl']:
  if acc=='apron':m.patch([(-w*.61,.13),(w*.61,.13),(w*.77,-.12),(-w*.77,-.12)],.134,'d0c5a6',.005)
  else:m.tube([(-w,.21,.015),(0,.235,.06),(w,.21,.015)],[.052,.052,.052],'b5a795',7)
 elif acc=='vest':
  for sign in [-1,1]:m.patch([(sign*.025,.245),(sign*(w-.008),.19),(sign*(w-.012),.025),(sign*.03,.015)],.129,pants,.009)
 elif acc=='strap':m.patch([(-.11,.23),(-.08,.245),(.11,.02),(.08,.005)],.143,'8a6c47',.006)
 belt,m=part('Belt',(0,0,0),hips,'leather');m.tube([(0,.028,0),(0,.061,0)],[w*.98,w*.96],'66523f',10)
 buckle,m=part('Buckle',(0,.045,.149),hips,'metal');m.box((0,0,0),(.039,.032,.013),'a98b53')
 neck,m=part('Neck',(0,.244,0),torso,'skin');m.ell((0,0,0),(.055,.041,.055),skin,7,4)
 head,_=part('head',(0,.266,0),torso)
 h,m=part('Skin_head',(0,0,0),head,'skin');m.ell((0,.198,0),(headrad,.244,.207),skin,12,8)
 # Side ears intersect cranium; no detached facial billboards.
 for sign in [-1,1]:m.ell((sign*.245,.18,-.008),(.037,.059,.046),skin,7,4)
 m.ell((0,.147,.204),(.028,.027,.028),skin,7,4)
 face,m=part('Face',(0,0,0),head)
 for sign in [-1,1]:m.box((sign*.081,.188,.190),(.028,.062,.016),'352e36')
 m.box((0,.092,.187),(.047,.012,.009),'a6755e')
 hairnode,m=part('Hair',(0,0,0),head,'hair')
 # All hair volumes wrap around the same head; no full dark shell across face.
 if cut=='sides':
  for sign in [-1,1]:m.ell((sign*.222,.28,-.040),(.059,.115,.154),hair,8,5)
  m.ell((0,.27,-.135),(.235,.15,.096),hair,10,5)
 else:
  hair_cap(m,hair)
  if cut in ['bob','pony','braids','pigtails','bun']:
   m.ell((0,.235,-.135),(.261,.213,.12),hair,10,6)
   for sign in [-1,1]:m.ell((sign*.222,.205,-.04),(.060,.175 if cut=='bob' else .125,.14),hair,8,5)
  if cut=='messy':
   for x,y in [(-.14,.42),(-.02,.46),(.11,.43)]:m.prism([(x-.055,y-.06),(x+.066,y-.05),(x+.026,y+.055)],.10,hair)
  if cut=='pony':m.tube([(0,.24,-.16),(0,.12,-.29),(0,-.02,-.24)],[.085,.10,.045],hair,8)
  if cut=='bun':m.ell((0,.44,-.095),(.092,.088,.084),hair,9,5)
  if cut in ['braids','pigtails']:
   for sign in [-1,1]:
    if cut=='braids':m.tube([(sign*.235,.21,-.08),(sign*.273,.09,-.07),(sign*.295,-.03,-.04)],[.052,.046,.031],hair,7)
    else:m.ell((sign*.28,.255,-.10),(.090,.10,.079),hair,7,4)
 if acc in ['moustache','cap','hat'] and not female:
  for sign in [-1,1]:m.ell((sign*.038,.110,.192),(.047,.023,.021),hair,7,4)
 hat,m=part('Hat',(0,0,0),head,'clothes_2')
 if acc=='cap':
  m.ell((0,.403,-.005),(.28,.10,.219),'677563',10,5);m.box((0,.359,.188),(.35,.031,.16),'56624f')
 elif acc=='hat':
  m.ell((0,.367,-.01),(.34,.032,.263),'675343',12,4);loft(m,[(.37,.232,.189),(.48,.213,.178),(.51,.18,.154)],'675343',10)
  loft(m,[(.382,.235,.192),(.405,.233,.19)],'493c35',10)
 for side,sign in [('L',-1),('R',1)]:
  upper,m=part('upper'+side,(sign*(w+.025),.198,0),torso,'clothes_1');m.tube([(0,0,0),(0,-A*.86,0)],[.067,.058],coat,8)
  fore,m=part('fore'+side,(0,-A,0),upper,'skin');m.tube([(0,0,0),(0,-A*.84,0)],[.047,.041],skin,7)
  hand,m=part('hand'+side,(0,-A*.88,0),fore,'skin');m.ell((0,-.019,.008),(.072,.055,.052),skin,8,4)
  s.node(side+'_at_hand_grip',(0,-.018,.022),hand)
  thigh,m=part('thigh'+side,(sign*(.096 if child else .115),-.012,0),hips,'clothes_2');m.tube([(0,0,0),(0,-L,.012)],[.065,.055],pants,7)
  shin,m=part('shin'+side,(0,-L,.012),thigh,'clothes_2');m.tube([(0,0,0),(0,-L,-.012)],[.055,.047],pants,7)
  foot,m=part('foot'+side,(0,-L,-.012),shin,'leather');m.ell((0,-.025,.035),(.103,.042,.126),'51443b',8,4)
 umbrella,m=part('Umbrella',(0,0,0),s.find('R_at_hand_grip'));umbrella_mesh(m);scale_mesh(m,[1,1.30,1]);s.nodes[umbrella]['scale']=[0,0,0]
 s.node('Mouth',(0,.09,.209),head)
 branch(s,head,[1.30,1.30,1.20])
 def pose(t,d,action):
  p=t/d;wave=math.sin(2*math.pi*p);v={}
  def set(n,r=None,move=None,scale=None):
   q=v.setdefault(n,{})
   if r is not None:q['rot']=r
   if move is not None:q['move']=move
   if scale is not None:q['scale']=scale
  lean=.075 if elder else .025;set('torso',[lean+.013*wave,0,.008*wave]);set('head',[-lean*.6,.025*wave,0])
  for side,sign in [('L',1),('R',-1)]:set('upper'+side,[-.06,0,.065*sign]);set('fore'+side,[-.08,0,0])
  if action in ['walk','rain']:
   bob=.004*(1-math.cos(4*math.pi*p));set('hips',[0,.018*wave,0],[0,bob,0]);set('torso',[lean+.02,-.035*wave,.008*wave]);set('head',[-lean*.6,.025*wave,0])
   for side,phase,sign in [('L',0,1),('R',.5,-1)]:
    q=(p+phase)%1;stance=.64;stride=.060 if child else .065 if elder else .080
    if q<stance:dz=stride*(.5-q/stance);lift=0
    else:u=(q-stance)/(1-stance);dz=stride*(-.5+smooth(u));lift=(.012 if elder else .018)*math.sin(math.pi*u)
    a,bend=two_link(np.array([-2*L+lift-bob,dz]),np.array([-L,.012]),np.array([-L,-.012]))
    set('thigh'+side,[a,0,0]);set('shin'+side,[bend,0,0]);set('foot'+side,[-a-bend,0,0]);set('upper'+side,[-.06-.19*sign*wave,0,.065*sign]);set('fore'+side,[-.12-.08*max(0,sign*wave),0,0])
   if female:set('Skirt',[.025*wave,0,.008*wave])
   if action=='rain':
    set('upperR',[-.38,0,-.16]);set('foreR',[-1.0,0,0]);set('handR',[1.38-lean,0,.16]);set('Umbrella',scale=[1,1,1])
  elif action=='talk':
   gesture=.5-.5*math.cos(2*math.pi*p);set('head',[.025*math.sin(4*math.pi*p)-lean*.6,.075*wave,0]);set('upperR',[-.12-.42*gesture,0,-.10-.18*gesture]);set('foreR',[-.10-.72*gesture,.12*wave,0]);set('handR',[0,0,-.18*gesture]);set('upperL',[-.06-.12*gesture,0,.075])
  elif action=='wave':
   gate=math.sin(math.pi*p)**2;set('upperR',[-.06-.20*gate,0,-.065+1.65*gate]);set('foreR',[-.08-.10*gate,0,1.20*gate+.35*math.sin(6*math.pi*p)*gate]);set('head',[-lean*.6,0,-.07*gate])
  return v
 walkd=.78 if child else 1.08 if elder else .92
 for action,d in [('idle',2.6),('walk',walkd),('talk',2.2),('wave',2.4),('rain',walkd)]:s.anim(action,d,lambda t,d,action=action:pose(t,d,action),30)
 s.extra={'revision':'44-G008','styleReference':'referencja/straznik_chibi_wzorzec.glb','title':title,'bodyFamily':kind,'animationFamily':'resident_rigid_v1','forward':'+Z','up':'+Y','rootMotion':False,'paletteGroups':groups,'palette':{'skin':skin,'hair':hair,'clothes_1':coat,'clothes_2':pants},'paletteInstructions':'Recolor listed node vertex COLOR_0, preserving per-face brightness; shared material is intentional. Accessories may contain secondary colors.','loopClips':['idle','walk','talk','rain'],'oneShotClips':['wave'],'umbrella':{'node':'Umbrella','parent':'R_at_hand_grip','hiddenByDefault':True,'demonstrationClip':'rain'},'retargeting':'All resident rigs have the same semantic joints. Rebase translations to the target rest pivots when sharing clips. Do not copy world foot trajectories across age proportions.'}
 if child:enlarge(s,.88);reground(s)
 return s

def dog():
 s=wolf();rename(s,'pies');s.clips={n:c for n,c in s.clips.items() if n in ['idle','walk']}
 # Preserve the approved four-beat anatomy, build a separate friendly face/coating.
 for name in ['body','frontL','frontR','backL','backR','frontL_shin','frontR_shin','backL_shin','backR_shin','backL_hock','backR_hock','tail']:
  tint(s.meshes[s.find(name)],'444850')
 m=s.meshes[s.find('body')];m.ell((0,.015,.198),(.16,.175,.135),'d2cfc0',8,5)
 for name in ['frontL_paw','frontR_paw','backL_paw','backR_paw']:tint(s.meshes[s.find(name)],'d2cfc0')
 m=fresh(s,'head');m.ell((0,.046,.02),(.258,.215,.230),'4c515a',10,6)
 # Wide white blaze, white muzzle, small warm eyebrows like the supplied dog.
 m.ell((0,.065,.209),(.060,.146,.034),'d7d5c6',8,5);m.box((0,-.056,.259),(.251,.145,.229),'d7d5c6');m.ell((0,-.033,.385),(.077,.047,.042),'30343a',8,4)
 for sign in [-1,1]:
  m.box((sign*.117,.067,.215),(.031,.046,.016),'2e2d35');m.ell((sign*.122,.111,.193),(.045,.023,.032),'aa8558',7,4)
 m=fresh(s,'jaw');m.box((0,-.022,.135),(.225,.055,.226),'c6c4b9')
 for name,sign in [('earL',-1),('earR',1)]:
  m=fresh(s,name);m.tube([(0,.03,0),(sign*.081,-.055,.015),(sign*.068,-.14,.025)],[.069,.064,.026],'393e47',6)
 m=fresh(s,'tail');m.tube([(0,0,0),(0,.01,-.18),(0,.12,-.26),(0,.23,-.20)],[.064,.074,.055,.013],'4c515a',7);m.ell((0,.20,-.22),(.04,.063,.042),'d7d5c6',7,4)
 # Tail-tip socket follows the new curled shape.
 move_rest(s,s.find('tail_tip'),[0,.23,-.20])
 # A dark collar is part of the body; brass tag is a small grounded style accent.
 m=s.meshes[s.find('body')];m.tube([(0,.075,.19),(0,.075,.23)],[.162,.162],'73575a',10);m.ell((0,-.06,.244),(.025,.032,.011),'aa8c54',7,4)
 def pose(t,d,action):
  p=t/d;w=math.sin(2*math.pi*p);v={}
  if action=='sit':
   q=smooth(min(1,p/.73));v={'body':{'rot':[-.63*q,0,0],'move':[0,-.17*q,0]},'neck':{'rot':[.34*q,0,0]},'head':{'rot':[.29*q,0,0]},'tail':{'rot':[.25*q,0,0]}}
   # Keep forepaws below shoulders; fold hind stifles forward and hocks back.
   for side in ['L','R']:
    v['front'+side]={'rot':[.48*q,0,0]};v['front'+side+'_shin']={'rot':[.15*q,0,0]};v['front'+side+'_paw']={'rot':[0,0,0]}
    v['back'+side]={'rot':[-.80*q,0,0]};v['back'+side+'_shin']={'rot':[1.78*q,0,0]};v['back'+side+'_hock']={'rot':[-.35*q,0,0]};v['back'+side+'_paw']={'rot':[0,0,0]}
  else:v={'tail':{'rot':[0,.65*math.sin(4*math.pi*p),.07*w]},'head':{'rot':[.025*w,.05*w,0]},'earL':{'rot':[0,0,.07*w]},'earR':{'rot':[0,0,-.07*w]}}
  return v
 s.anim('sit',1.45,lambda t,d:pose(t,d,'sit'),36);s.anim('wag',1.4,lambda t,d:pose(t,d,'wag'),30)
 enlarge(s,.86);reground(s)
 s.extra={'revision':'44-G007','title':'Biało-czarny pies','animationFamily':'quadruped_canid_v2','forward':'+Z','up':'+Y','rootMotion':False,'loopClips':['idle','walk','wag'],'oneShotClips':['sit'],'sit':'Transition from standing to held sitting pose; keep last frame. Reverse to stand up.','identity':'Friendly black-white companion from supplied NPC sheet, warm eyebrows, floppy ears and white curled tail tip.','gait':'Inherited accepted anatomical four-beat wolf gait, uniformly scaled to .86; independent dog geometry.'}
 return s

if __name__=='__main__':
 models=[resident(x) for x in LOOKS]+[dog()];meta={s.name:s.export() for s in models}
 manifest=json.loads((OUT/'manifest.json').read_text());manifest.update(meta);manifest['notes']['stage']='44-G008: corrected chibi residents and humanoids; not deployed';manifest['notes']['batch4']='Six resident body families / fifteen looks, umbrella demonstration and companion dog';manifest['notes']['accepted_models']=['szkielet','wilk','upior_krypty','wodny_blob','warg','pies'];manifest['notes']['awaiting_art_review']=NAMES[:-1]+['zombiak','bandyta','chochlik','wodnik','driada','herszt','mosiezny_koziol'];(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 (OUT/'partia4_manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));(OUT/'mieszkancy_warianty.json').write_text(json.dumps({'revision':'44-G008','bases':BASES,'looks':[{'id':x[0],'title':x[1],'bodyFamily':x[2],'hair':x[3],'clothes_1':x[4],'clothes_2':x[5],'haircut':x[6],'accessory':x[7],'file':'modele/'+x[0]+'.glb'} for x in LOOKS]},ensure_ascii=False,indent=2));print(json.dumps(meta,ensure_ascii=False))
