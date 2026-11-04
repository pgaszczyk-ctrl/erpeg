from render_models import GLB,OUT,font
from PIL import Image,ImageDraw
from pathlib import Path
import sys

guard=GLB(OUT.parent/'referencja/straznik_chibi_wzorzec.glb');checkpoint=Path(sys.argv[1]) if len(sys.argv)>1 and not sys.argv[1].startswith('--') else OUT.parent/'referencja/przed_G008'
after=[GLB(OUT/'modele'/f'{n}.glb') for n in ['zombiak','mlody_mezczyzna']]
im=Image.new('RGB',(1440,1160),'#eee7d5');d=ImageDraw.Draw(im);d.text((24,18),'EXP–LORE / 44-G008 / POWRÓT DO CHIBI',font=font(17,True),fill='#857351')
for row,n in enumerate(['zombiak','mlody_mezczyzna']):
 before=GLB(checkpoint/(n+'.glb')) if checkpoint else GLB(OUT/'modele/szkielet.glb');label='Zombie' if row==0 else 'Mieszkaniec'
 for col,(m,title) in enumerate([(guard,'Wzorzec: Strażnik chibi'),(before,label+' — przed' if checkpoint else 'Szkielet: zaakceptowany'),(after[row],label+' — po poprawce')]):
  x=12+col*476;y=65+row*537;d.rounded_rectangle((x,y,x+463,y+513),radius=12,fill='#e1dac8',outline='#c4b69b');d.text((x+15,y+16),title,font=font(18,True),fill='#302936');r=m.render((440,315),32,18,'idle',0,span=1.85);im.paste(r,(x+11,y+48),r)
  for j,a in enumerate([0,90,180]):
   r=m.render((138,127),a,18,'idle',0,span=1.85);im.paste(r,(x+13+j*145,y+373),r)
im.save(OUT/'G008_porownanie_chibi.png')
if '--gifs' not in sys.argv:raise SystemExit()
frames=[];reference=guard.render((480,325),32,18,'idle',0,span=1.85);skeleton=GLB(OUT/'modele/szkielet.glb')
for f in range(24):
 im=Image.new('RGB',(1000,820),'#eee7d5');d=ImageDraw.Draw(im);d.text((20,18),'EXP–LORE / POPRAWKA CHIBI / RZECZYWISTE GLB',font=font(15,True),fill='#756b5b')
 for i,(m,title) in enumerate([(guard,'Strażnik chibi — wzorzec proporcji'),(after[0],'Zombie — poprawiona sylwetka i chód'),(after[1],'Mieszkaniec — zwarta postawa'),(skeleton,'Szkielet — bez zmian')]):
  x=(i%2)*500;y=52+(i//2)*380
  if i==0:r=reference
  else:
   a=next(a for a in m.g['animations'] if a['name']=='walk');dur=max(float(m.acc(s['input'])[-1,0]) for s in a['samplers']);r=m.render((480,325),f*360/24,18,'walk',f/24*dur*2,span=1.85)
  im.paste(r,(x+10,y),r);d.text((x+15,y+333),title,font=font(14,True),fill='#302936')
 frames.append(im)
 if f%8==0:print('style comparison',f,flush=True)
frames[0].save(OUT/'G008_chibi_ruch.gif',save_all=True,append_images=frames[1:],duration=110,loop=0,optimize=True)
