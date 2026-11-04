#!/usr/bin/env python3
"""Technical before/after with the unchanged game hero at its exact rendering scale.
This is a render comparison, not a browser/game screenshot.
"""
import io,json,pathlib,subprocess
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/architecture/artifacts'
items=json.loads((OUT/'model-proportions.json').read_text())
background='#1e1a24';paper='#ece6d6';muted='#bab3a2'
sheet=Image.new('RGB',(960,1740),background);draw=ImageDraw.Draw(sheet)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(font_path,17);small=ImageFont.truetype(font_path,13);title=ImageFont.truetype(font_path,25)
draw.text((24,15),'Duże wejścia, maksymalnie trzy kondygnacje',font=title,fill=paper)
draw.text((24,53),'Podgląd techniczny rasteryzatora — nie zrzut z gry.',font=small,fill=muted)
draw.text((120,90),'POPRZEDNIO',font=font,fill=muted);draw.text((600,90),'TERAZ',font=font,fill=paper)
hero_source=Image.open(ROOT/'public/postacie/lista25_01.png').convert('RGBA').crop((0,0,64,64))
for row,(style,label) in enumerate([('apartments','Obrys bloku'),('old-town','Obrys kamienicy'),('half-timber','Dom z muru pruskiego')]):
 meta=next(m for m in items if m['style']==style and m['degrees']==0)
 density=meta['raster']['density'];projection=meta['raster']['projection']
 old_bytes=subprocess.check_output(['git','show',f'2f793ba:docs/architecture/artifacts/models/{style}-0.png'],cwd=ROOT)
 old=Image.open(io.BytesIO(old_bytes)).convert('RGBA');new=Image.open(OUT/meta['file']).convert('RGBA')
 scale=2;row_top=135+row*510
 for col,im in enumerate([old,new]):
  left=col*480+(480-im.width*scale)//2;top=row_top+435-im.height*scale
  sheet.paste(im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST),(left,top),im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST))
  hero_px=round(64*.25*density/1.92*scale);hero=hero_source.resize((hero_px,hero_px),Image.Resampling.NEAREST)
  if col:
   dx=meta['door'][0]-meta['center'][0];dy=meta['door'][1]-meta['center'][1]
   foot_x=left+(dx-meta['raster']['x'])*density*scale+meta['openings']['doorWidth']*.95*density*scale
   foot_y=top+(dy*projection-meta['raster']['y'])*density*scale+5*scale
  else:foot_x=left+im.width*scale*.78;foot_y=top+im.height*scale+3*scale
  sheet.paste(hero,(round(foot_x-hero_px/2),round(foot_y-hero_px*56/64)),hero)
 draw.text((24,row_top+453),label,font=font,fill=paper)
 draw.text((505,row_top+453),f"{meta['levels']} kond. · otwór drzwiowy 1,12× postać",font=small,fill=paper)
sheet.save(OUT/'cottage-comparison.png')
print(OUT/'cottage-comparison.png')
