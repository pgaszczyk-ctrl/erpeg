# Shrinks the artist's cellar entrance (49-G004, 1536x1024 smooth originals) to the game's size:
# one common crop for both states (the threshold anchor stays the same), 4 texture px per map px,
# visible closed width = SZEROKOSC_MAPY map px. Output: public/swiat/lochy/piwniczka_drewniana/<state>_gra.png
from PIL import Image
import json, sys, os
D = 'public/swiat/lochy/piwniczka_drewniana'
SZEROKOSC_MAPY = 20  # visible width of the closed entrance in map px (~2 hero widths)
TEX_NA_PX = 4
ims = {s: Image.open(f'{D}/{s}.png').convert('RGBA') for s in ('zamkniete', 'otwarte')}
def bbox(im): return im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
bz = bbox(ims['zamkniete'])
x0 = min(bbox(i)[0] for i in ims.values()); y0 = min(bbox(i)[1] for i in ims.values())
x1 = max(bbox(i)[2] for i in ims.values()); y1 = max(bbox(i)[3] for i in ims.values())
f = SZEROKOSC_MAPY * TEX_NA_PX / (bz[2] - bz[0])
W, H = round((x1 - x0) * f), round((y1 - y0) * f)
for s, im in ims.items():
    out = im.crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS)
    a = out.getchannel('A').point(lambda v: 0 if v < 12 else v)
    out.putalpha(a)
    out.save(f'{D}/{s}_gra.png', optimize=True)
ax, ay = (768 - x0) * f / W, (750 - y0) * f / H
print(json.dumps({'w': W, 'h': H, 'origin': [round(ax, 4), round(ay, 4)], 'skala': 1 / TEX_NA_PX}))
