from pathlib import Path
from PIL import Image,ImageDraw
from render_models import GLB,OUT,font
import json,sys,math,numpy as np
from scipy.spatial.transform import Rotation
NAMES=['chochlik','bandyta','zombiak','upior_krypty'];TITLES=['Chochlik','Bandyta','Zombiak','Upiór krypty'];models=[GLB(OUT/'modele'/f'{n}.glb') for n in NAMES]
meta=json.loads((OUT/'partia2_manifest.json').read_text())
# Four panels share the same world scale. No individual height normalization.
im=Image.new('RGB',(1440,910),'#eee7d5');d=ImageDraw.Draw(im)
d.text((30,23),'EXP–LORE / 44-G008 / LOCHY I ULICE',font=font(15,True),fill='#857351');d.text((30,55),'Pełniejsze bryły — także z profilu.',font=font(30,True),fill='#302936')
for i,m in enumerate(models):
 x=20+i*355;d.rounded_rectangle((x,115,x+340,850),radius=13,fill='#e1dac8',outline='#c4b69b');d.text((x+17,135),TITLES[i],font=font(23,True),fill='#302936')
 r=m.render((320,355),32,20,'idle',0,span=2.05);im.paste(r,(x+10,175),r)
 for j,a in enumerate([0,90,180]):
  r=m.render((100,140),a,20,'idle',0,span=2.05);im.paste(r,(x+15+j*105,542),r)
 d.text((x+15,700),'PRZÓD          BOK              TYŁ',font=font(10,True),fill='#857351')
 d.text((x+15,743),str(meta[NAMES[i]]['triangles'])+' trójkątów · '+str(len(meta[NAMES[i]]['clips']))+' klipów',font=font(13),fill='#756b5b')
 desc=['Rzut żołędziem / szybki krok','Sztylet na punkcie chwytu','Asymetria / powłóczenie nogą','Lewitacja / szata / krzyk'][i];d.text((x+15,780),desc,font=font(12),fill='#756b5b')
d.text((30,875),'Rzeczywiste modele GLB • wspólna skala • podgląd przed integracją z grą',font=font(14),fill='#756b5b');im.save(OUT/'partia2_potwory.png')
# Pose sheet for visual QA, including rear surfaces and collapsed silhouettes.
qa=Image.new('RGB',(1440,1060),'#eee7d5');qd=ImageDraw.Draw(qa)
for row,m in enumerate(models):
 special='throw' if row==0 else 'scream' if row==3 else 'attack'
 for col,(clip,time) in enumerate([('walk',.22),('attack',.60),(special,.65),('death',1.70)]):
  r=m.render((350,235),35,24,clip,time,span=2.15);qa.paste(r,(col*360,row*265),r);qd.text((col*360+10,row*265+236),NAMES[row]+' / '+clip,font=font(12),fill='#302936')
qa.save(OUT/'partia2_kontrola_pozy.png')
if '--gifs' not in sys.argv:raise SystemExit()
# 2x2 preview on mobile: every model gets a readable panel.
frames=[]
for f in range(32):
 im=Image.new('RGB',(840,780),'#eee7d5');d=ImageDraw.Draw(im);d.text((24,16),'EXP–LORE / NOWA PARTIA / RUCH 360°',font=font(16,True),fill='#756b5b')
 for i,m in enumerate(models):
  x=(i%2)*420;y=48+(i//2)*360;period=meta[NAMES[i]]['clips']['walk'];r=m.render((400,300),f*360/32,22,'walk',(f/12)%period,span=2.05);im.paste(r,(x+10,y),r);d.text((x+22,y+310),TITLES[i],font=font(16,True),fill='#302936')
 frames.append(im)
 if f%16==0:print('batch2 walk frames',f,flush=True)
frames[0].save(OUT/'partia2_ruch.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,optimize=True)
frames=[]
for f in range(30):
 t=min(f/18,1.6);im=Image.new('RGB',(840,780),'#eee7d5');d=ImageDraw.Draw(im);d.text((24,16),'EXP–LORE / ATAKI I AKCJE SPECJALNE',font=font(16,True),fill='#756b5b')
 for i,m in enumerate(models):
  x=(i%2)*420;y=48+(i//2)*360;clip='throw' if i==0 else 'scream' if i==3 else 'attack'
  r=m.render((400,300),32,22,clip,t,span=2.05);im.paste(r,(x+10,y),r)
  d.text((x+22,y+310),['Chochlik · rzut','Bandyta · cięcie','Zombiak · chwyt','Upiór · krzyk'][i],font=font(15,True),fill='#302936')
 frames.append(im)
frames[0].save(OUT/'partia2_ataki.gif',save_all=True,append_images=frames[1:],duration=70,loop=0,optimize=True)
print('batch2 previews ready')
