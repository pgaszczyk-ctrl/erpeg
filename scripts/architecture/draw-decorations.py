#!/usr/bin/env python3
"""Offline pixel masters. This script produces shipped sprites, never runtime geometry.
Hard integer pixels, binary alpha, a 1 px ink edge, indexed game colours; no existing asset is edited.
"""
import json,pathlib
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[2]
PAL=json.loads((ROOT/'src/architecture/palette.json').read_text())['colors']
COL=[tuple(int(c[i:i+2],16) for i in (1,3,5))+(255,) for c in PAL]
KINDS=['boiler','tesla','chimney','water-tower','tank','valve','turret']
W,H,FRAMES=48,64,6
atlas=Image.new('RGBA',(W*FRAMES,H*len(KINDS)*3))
metadata={'version':1,'frame_width':W,'frame_height':H,'frames_per_variant':6,'variants':3,'anchor':[24,54],'palette':'palette.png','alpha':'binary','outline':0,'animation_ms':160,'entries':[]}
for row,(kind,variant) in enumerate((kind,v) for kind in KINDS for v in range(3)):
 for frame in range(FRAMES):
  im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
  brass=(3,6,11);iron=(0,2,5);copper=(1,3,6);metal=[brass,copper,iron][variant]
  def rect(box,color,outline=None):d.rectangle(box,fill=COL[color],outline=COL[0] if outline else None,width=1)
  def ellipse(box,color,outline=True):d.ellipse(box,fill=COL[color],outline=COL[0] if outline else None,width=1)
  def line(points,color=0,width=1):d.line(points,fill=COL[color],width=width)
  def pipe(x,y,height):
   rect((x,y,x+5,y+height),metal[0],True);rect((x+1,y+1,x+2,y+height-1),metal[2]);rect((x,y+height-3,x+6,y+height-1),metal[1],True)
  def steam(x,y,dark=False):
   for i in range(3):
    age=(frame+i*2)%6;px=x+[-1,1,0,2,-1,1][age]+i%2;py=y-age*2-i*3
    ellipse((px,py,px+4+(age//3),py+3+(age//3)),[5,8,13][min(2,age//2)] if dark else [10,13,15][min(2,age//2)],False)
  def rivets(x0,y0,x1):
   for x in range(x0,x1,4):rect((x,y0,x,y0),metal[2])
  if kind=='boiler':
   pipe(30,23,24);rect((30,22,37,25),metal[1],True);steam(32,20)
   ellipse((13,30,32,52),metal[0]);rect((14,37,31,47),metal[1]);rect((16,34,19,47),metal[2]);ellipse((13,29,32,37),metal[1]);line([(16,31),(27,31)],metal[2]);
   line([(14,36),(31,36)]);line([(14,47),(31,47)]);rivets(16,38,30);ellipse((21,39,27,45),13);line([(24,42),(25,40)]);rect((16,51,19,54),0);rect((27,51,30,54),0)
   if variant==1:rect((8,40,14,44),metal[1],True);ellipse((6,38,11,46),6)
  elif kind=='tesla':
   ellipse((14,48,34,55),metal[0]);ellipse((14,46,34,52),metal[1]);pipe(22,26,23)
   for y in range(30,45,4):ellipse((17,y,31,y+3),metal[1]);line([(19,y),(27,y)],metal[2])
   ellipse((14,22,34,29),metal[0]);ellipse((14,20,34,26),metal[1]);line([(18,21),(29,21)],metal[2]);rect((23,15,25,21),2,True)
   sparks=[[(24,14),(20,10),(24,7),(20,4)],[(25,14),(30,10),(27,6),(33,3)],[(23,14),(17,11),(18,7),(13,5)],[(24,14),(25,9),(22,6),(26,2)]]
   line(sparks[frame%4],11,2);line(sparks[frame%4],15,1)
  elif kind=='chimney':
   height=27+variant*3;rect((17,54-height,30,54),metal[0],True);rect((18,55-height,28,52),metal[1]);rect((18,55-height,21,52),metal[2]);
   for y in range(57-height,53,5):line([(18,y),(29,y)],metal[0]);rect((24 if y%2 else 20,y-3,24 if y%2 else 20,y),metal[0])
   rect((15,52-height,32,56-height),metal[1],True);line([(17,53-height),(29,53-height)],metal[2]);steam(22,48-height,True)
  elif kind=='water-tower':
   for x in [14,30]:rect((x,37,x+3,54),metal[0],True);line([(x+1,38),(x+1,51)],metal[2])
   line([(15,40),(31,51)],metal[0],2);line([(31,40),(15,51)],metal[0],2)
   ellipse((10,18,36,27),metal[0]);rect((10,23,36,36),metal[1],True);ellipse((10,32,36,41),metal[0]);rect((12,24,17,34),metal[2]);ellipse((10,18,36,27),metal[1]);line([(15,20),(29,20)],metal[2]);line([(11,29),(35,29)],metal[0]);rivets(14,31,35)
   d.polygon([(8,19),(23,12-variant),(38,19)],fill=COL[metal[0]],outline=COL[0]);line([(10,18),(23,14),(34,18)],metal[2]);pipe(34,30,22)
  elif kind=='tank':
   rect((12,49,17,54),metal[0],True);rect((31,49,36,54),metal[0],True);ellipse((8,30,39,51),metal[0]);rect((16,30,31,50),metal[1]);ellipse((8,30,23,51),metal[1]);ellipse((9,32,20,48),metal[2]);ellipse((11,34,20,47),metal[1]);line([(25,31),(25,49)],metal[0],2);line([(18,31),(18,49)],metal[0]);rect((23,24,28,31),metal[1],True);rect((21,23,30,26),metal[2],True)
   if variant==2:ellipse((31,37,36,42),13);line([(33,40),(34,38)])
  elif kind=='valve':
   rect((8,43,39,49),metal[0],True);rect((9,44,38,46),metal[1]);line([(9,44),(38,44)],metal[2]);rect((20,37,27,50),metal[1],True);rect((22,29,25,39),metal[0],True)
   ellipse((15,23,32,34),metal[0]);ellipse((17,25,30,32),metal[2]);ellipse((19,27,28,30),0,False);line([(23,24),(23,33)],metal[1]);line([(17,28),(30,28)],metal[1]);ellipse((21,27,25,30),metal[1]);rect((10,42,12,50),metal[1],True);rect((35,42,37,50),metal[1],True)
  else:
   ellipse((11,46,37,55),metal[0]);ellipse((12,44,36,51),metal[1]);rect((18,37,31,48),metal[0],True);ellipse((14,30,35,43),metal[1]);rect((13,32,26,37),metal[2]);rect((27,31,41,38),metal[0],True);rect((28,32,40,34),metal[1]);ellipse((37,30,43,39),0);ellipse((38,32,42,37),5);ellipse((18,32,24,38),metal[0]);rect((20,33,22,35),metal[2]);rect((20,26,28,30),metal[1],True)
  atlas.paste(im,(frame*W,row*H))
 metadata['entries'].append({'kind':kind,'variant':variant,'row':row,'frames':4 if kind=='tesla' else 6 if kind in ['boiler','chimney'] else 1,'anchor_type':'wall' if kind=='valve' else 'chimney' if kind=='chimney' else 'ridge','anchor':[24,54],'maximum_overhang_fraction':.3})
out=ROOT/'public/architecture';out.mkdir(exist_ok=True);atlas.save(out/'decorations.png',optimize=True);(out/'decorations.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(f'21 sprite variants, 126 atlas frames, {len(set(atlas.getdata()))-1} opaque colours')
