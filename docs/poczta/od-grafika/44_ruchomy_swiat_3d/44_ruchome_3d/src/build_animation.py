from render_models import GLB,font,OUT
from PIL import Image,ImageDraw
import math,numpy as np
from scipy.spatial.transform import Rotation
models=[GLB(OUT/'modele/szkielet.glb'),GLB(OUT/'modele/wilk.glb')]
frames=[]
for i in range(36):
 im=Image.new('RGB',(760,460),'#eee7d5');d=ImageDraw.Draw(im)
 d.text((28,20),'EXP–LORE / SZKIELET + WILK / CHÓD 360°',font=font(16,True),fill='#5d584b')
 for j,m in enumerate(models):
  clip='walk';duration=.85 if j==0 else .95;t=(i/12)%duration
  r=m.render((350,325),angle=i*10,pitch=24,clip=clip,time=t)
  im.paste(r,(25+j*380,60),r)
  d.text((30+j*380,405),['Szkielet · 2634 trójkąty','Wilk · 696 trójkątów'][j],font=font(14),fill='#756b5b')
 frames.append(im)
 if i%12==0:print('walk frames',i,flush=True)
frames[0].save(OUT/'szkielet_wilk_360.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,optimize=True)
frames=[]
for i in range(18):
 im=Image.new('RGB',(760,460),'#eee7d5');d=ImageDraw.Draw(im);t=i/12
 d.text((28,20),'EXP–LORE / ZAPOWIEDŹ → ATAK → POWRÓT',font=font(16,True),fill='#5d584b')
 for j,m in enumerate(models):
  duration=1.3 if j==0 else 1.25;phase=min(t,duration);r=m.render((350,325),angle=40,pitch=24,clip='attack',time=phase)
  im.paste(r,(25+j*380,60),r)
  end=.5 if j==0 else .46;impact=.65 if j==0 else .70;stage='ZAPOWIEDŹ' if phase<end else 'CIOS' if phase<impact+.12 else 'POWRÓT'
  d.text((30+j*380,405),['Szkielet','Wilk'][j]+' · '+stage,font=font(14,True),fill='#756b5b')
 frames.append(im)
frames[0].save(OUT/'szkielet_wilk_atak.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,optimize=True)
print('GIF ready')

# Focused follow-up: show the anatomical gait from the side and map camera.
w=GLB(OUT/'modele/wilk.glb');frames=[]
for i in range(36):
 im=Image.new('RGB',(760,440),'#eee7d5');d=ImageDraw.Draw(im)
 d.text((24,18),'WILK / PROSTSZA BRYŁA + POPRAWIONY KROK',font=font(15,True),fill='#5d584b')
 for j,(angle,pitch) in enumerate([(90,12),(35,30)]):
  r=w.render((350,310),angle=angle,pitch=pitch,clip='walk',time=(i/12)%.95)
  im.paste(r,(20+j*380,60),r)
  d.text((24+j*380,390),['Bok · staw skokowy z tyłu','Widok mapy · niski krok'][j],font=font(13),fill='#756b5b')
 frames.append(im)
frames[0].save(OUT/'wilk_poprawiony_krok.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,optimize=True)

# New airborne attack: both cameras show the same forward leap above ground.
w=GLB(OUT/'modele/wilk.glb');frames=[]
for i in range(36):
 t=min(i/24,1.25)
 im=Image.new('RGB',(900,470),'#eee7d5');d=ImageDraw.Draw(im)
 d.text((24,18),'WILK / WIĘKSZA GŁOWA · KRÓTKA SZYJA · SKOK',font=font(16,True),fill='#5d584b')
 for j,(angle,pitch) in enumerate([(90,12),(35,30)]):
  # A small static ground marker helps distinguish jumping from a pose change.
  x=20+j*450
  u=max(0,min(1,(t-.50)/.40));advance=.44*u*u*(3-2*u)
  ground=Rotation.from_euler('y',angle,degrees=True).apply([0,0,advance-.035])-np.array([0,.6,0])
  ground=Rotation.from_euler('x',pitch,degrees=True).apply(ground)
  gx=x+210+ground[0]*340/2.5;gy=55+170-ground[1]*340/2.5
  d.ellipse((gx-70,gy-4,gx+70,gy+4),fill='#d9d0bb')
  r=w.render((420,340),angle=angle,pitch=pitch,clip='lunge',time=t,span=2.5)
  im.paste(r,(x,55),r)
  stage='PRZYSIAD' if t<.46 else 'WYBICIE' if t<.56 else 'LOT + UGRYZIENIE' if t<.90 else 'LĄDOWANIE'
  d.text((x+20,408),stage,font=font(14,True),fill='#756b5b')
 frames.append(im)
frames[0].save(OUT/'wilk_skok_atak.gif',save_all=True,append_images=frames[1:],duration=60,loop=0,optimize=True)
