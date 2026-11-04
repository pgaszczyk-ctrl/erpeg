from render_models import GLB,OUT,font
from PIL import Image,ImageDraw
import sys,json,numpy as np
from scipy.spatial.transform import Rotation
NAMES=['wodnik','wodny_blob','driada','herszt','warg','mosiezny_koziol'];TITLES=['Wodnik','Wodny blob','Driada','Herszt','Warg','Mosiężny Kozioł'];SPECIAL=['cast','attack','cast','slam','pounce','charge'];models=[GLB(OUT/'modele'/f'{n}.glb') for n in NAMES];meta=json.loads((OUT/'partia3_manifest.json').read_text())
im=Image.new('RGB',(1440,1340),'#eee7d5');d=ImageDraw.Draw(im);d.text((25,20),'EXP–LORE / 44-G008 / WODA, LAS I MECHANIKA',font=font(15,True),fill='#857351');d.text((25,51),'Kolejna szóstka mieszkańców świata.',font=font(30,True),fill='#302936')
for i,m in enumerate(models):
 x=15+(i%3)*475;y=110+(i//3)*600;d.rounded_rectangle((x,y,x+460,y+575),radius=13,fill='#e1dac8',outline='#c4b69b');d.text((x+16,y+16),TITLES[i],font=font(23,True),fill='#302936')
 r=m.render((430,320),32,22,'idle',0,span=2.4);im.paste(r,(x+15,y+48),r)
 for j,a in enumerate([0,90,180]):
  r=m.render((130,135),a,20,'idle',0,span=2.4);im.paste(r,(x+18+j*140,y+370),r)
 d.text((x+18,y+529),str(meta[NAMES[i]]['triangles'])+' trójkątów · '+str(len(meta[NAMES[i]]['clips']))+' klipów',font=font(13),fill='#756b5b')
d.text((25,1310),'Wspólna skala świata • PNG/GIF renderowane z GLB • przed integracją z grą',font=font(14),fill='#756b5b');im.save(OUT/'partia3_potwory.png')
qa=Image.new('RGB',(1440,1500),'#eee7d5');d=ImageDraw.Draw(qa)
for row,m in enumerate(models):
 for col,(clip,t) in enumerate([('walk',.25),(SPECIAL[row],.52),(SPECIAL[row],.82),('death',2.0)]):
  r=m.render((350,205),35,24,clip,t,span=2.7);qa.paste(r,(col*360,row*250),r);d.text((col*360+8,row*250+212),NAMES[row]+' / '+clip+' / '+str(t),font=font(11),fill='#302936')
qa.save(OUT/'partia3_kontrola_pozy.png')
if '--gifs' not in sys.argv:raise SystemExit()
def ground(draw,x,y,angle,pitch,z,span):
 v=Rotation.from_euler('y',angle,degrees=True).apply([0,0,z])-np.array([0,.6,0]);v=Rotation.from_euler('x',pitch,degrees=True).apply(v);gx=x+200+v[0]*300/span;gy=y+150-v[1]*300/span;draw.ellipse((gx-40,gy-3,gx+40,gy+3),fill='#d7ceb9')
for mode in ['ruch','ataki']:
 frames=[]
 for f in range(32):
  t=f/18;im=Image.new('RGB',(840,1130),'#eee7d5');d=ImageDraw.Draw(im);d.text((24,17),'EXP–LORE / PARTIA 3 / '+('RUCH 360°' if mode=='ruch' else 'ATAKI I MAGIA'),font=font(16,True),fill='#756b5b')
  for i,m in enumerate(models):
   x=(i%2)*420+10;y=50+(i//2)*350;clip='walk' if mode=='ruch' else SPECIAL[i];angle=f*360/32 if mode=='ruch' else 35;time=(t%meta[NAMES[i]]['clips']['walk']) if mode=='ruch' else min(t,meta[NAMES[i]]['clips'][clip]);span=2.4 if mode=='ruch' else 2.7
   z=float(m.transforms(clip,time)[0][2,3]);ground(d,x,y,angle,22,z,span);r=m.render((400,300),angle,22,clip,time,span=span);im.paste(r,(x,y),r);d.text((x+10,y+307),TITLES[i],font=font(16,True),fill='#302936')
  frames.append(im)
  if f%16==0:print('batch3',mode,f,flush=True)
 frames[0].save(OUT/('partia3_'+mode+'.gif'),save_all=True,append_images=frames[1:],duration=75,loop=0,optimize=True)
print('batch3 previews ready')
