from render_models import GLB,OUT,font
from build_batch4 import LOOKS,NAMES,TITLES
from PIL import Image,ImageDraw
import sys,json

models={n:GLB(OUT/'modele'/f'{n}.glb') for n in NAMES}
im=Image.new('RGB',(1440,1620),'#eee7d5');d=ImageDraw.Draw(im)
d.text((28,22),'EXP–LORE / 44-G008 / MIESZKAŃCY I PIES',font=font(16,True),fill='#857351');d.text((28,55),'Sześć baz. Piętnaście charakterów.',font=font(30,True),fill='#302936')
for i,n in enumerate(NAMES):
 x=15+(i%4)*357;y=110+(i//4)*370;d.rounded_rectangle((x,y,x+340,y+350),radius=12,fill='#e1dac8',outline='#c4b69b')
 r=models[n].render((330,288),32,18,'idle',0,span=1.85);im.paste(r,(x+5,y+8),r);d.text((x+12,y+307),TITLES[n],font=font(13,True),fill='#302936')
d.text((28,1592),'Wspólna skala świata · renderowane z GLB · przed integracją z grą',font=font(13),fill='#756b5b');im.save(OUT/'partia4_mieszkancy.png')
representatives=['chlopiec','dziewczynka_warkocze','mlody_mezczyzna','mloda_kobieta','starszy_pan','babcia','pies']
im=Image.new('RGB',(1400,1900),'#eee7d5');d=ImageDraw.Draw(im)
for row,n in enumerate(representatives):
 d.text((15,row*270+8),TITLES[n],font=font(15,True),fill='#302936')
 for col,a in enumerate([0,45,90,180]):
  r=models[n].render((340,230),a,18,'idle',0,span=1.85);im.paste(r,(col*350,row*270+30),r)
im.save(OUT/'partia4_profile.png')
if '--gifs' not in sys.argv:raise SystemExit()
rep=['mloda_kobieta','mlody_mezczyzna','chlopiec','dziewczynka_warkocze','starszy_pan','babcia','pies']
for mode in ['ruch','gesty']:
 if '--ruch-only' in sys.argv and mode!='ruch':continue
 frames=[]
 for f in range(36):
  im=Image.new('RGB',(840,1360),'#eee7d5');d=ImageDraw.Draw(im);d.text((20,15),'EXP–LORE / MIESZKAŃCY / '+('RUCH 360°' if mode=='ruch' else 'ROZMOWA, GESTY I DESZCZ'),font=font(15,True),fill='#756b5b')
  names=rep+(['pies'] if mode=='ruch' else ['mieszczka'])
  for i,n in enumerate(names):
   x=10+(i%2)*420;y=55+(i//2)*320;m=models[n]
   if mode=='ruch':clip='walk' if i<7 else 'wag';time=f/36*1.6;angle=f*360/36
   else:clip=['talk','wave','talk','wave','talk','wave','sit','rain'][i];time=f/35*(2.4 if clip=='wave' else 1.45 if clip=='sit' else 2.2 if clip=='talk' else .92*2);angle=32 if n!='pies' else 60
   duration=max(float(m.acc(s['input'])[-1,0]) for s in next(a for a in m.g['animations'] if a['name']==clip)['samplers'])
   if mode=='ruch':time=f/36*2*duration
   time=time%duration if clip in ['walk','wag','talk','rain'] else min(time,duration)
   r=m.render((400,275),angle,18,clip,time,span=2.5 if clip=='rain' else 1.9);im.paste(r,(x,y),r);d.text((x+12,y+282),TITLES[n]+' · '+{'walk':'chód','wag':'merdanie','talk':'rozmowa','wave':'powitanie','sit':'siad','rain':'parasol'}[clip],font=font(14,True),fill='#302936')
  frames.append(im)
  if f%12==0:print('batch4',mode,f,flush=True)
 frames[0].save(OUT/('partia4_'+mode+'.gif'),save_all=True,append_images=frames[1:],duration=90,loop=0,optimize=True)
print('Batch4 previews ready')
