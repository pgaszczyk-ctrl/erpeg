#!/usr/bin/env python3
"""Same footprint, camera, materials and hero scale; only the source floor count changes."""
import json,pathlib
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[2];out=ROOT/'docs/architecture/artifacts'
items=json.loads((out/'height-proportions.json').read_text())
sheet=Image.new('RGB',(1320,510),'#1e1a24');draw=ImageDraw.Draw(sheet)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';title=ImageFont.truetype(font,24);text=ImageFont.truetype(font,16);small=ImageFont.truetype(font,12)
draw.text((22,12),'Kondygnacje OSM: 1–3 → 1, 4–6 → 2, powyżej 6 → 3',font=title,fill='#ece6d6')
draw.text((22,46),'Podgląd techniczny. Stały rozmiar postaci, drzwi i okien; wysokość jest uproszczona do trzech poziomów.',font=small,fill='#bab3a2')
hero_source=Image.open(ROOT/'public/postacie/lista25_01.png').convert('RGBA').crop((0,0,64,64))
for column,m in enumerate(items):
 im=Image.open(out/m['file']).convert('RGBA');scale=2;density=m['raster']['density'];projection=m['raster']['projection']
 dx=m['door'][0]-m['center'][0];dy=m['door'][1]-m['center'][1]
 left=column*220+(220-im.width*scale)//2;top=440-round((dy*projection-m['raster']['y'])*density*scale)
 im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST);sheet.paste(im,(left,top),im)
 hero_px=round(64*.25*density/1.92*scale);hero=hero_source.resize((hero_px,hero_px),Image.Resampling.NEAREST)
 foot_x=left+(dx-m['raster']['x'])*density*scale+m['openings']['doorWidth']*.95*density*scale
 sheet.paste(hero,(round(foot_x-hero_px/2),round(450-hero_px*56/64)),hero)
 label=f"OSM {m['sourceLevels']} → gra {m['levels']}"
 draw.text((column*220+44,477),label,font=text,fill='#ece6d6')
sheet.save(out/'height-comparison.png');print(out/'height-comparison.png')
