#!/usr/bin/env python3
"""Arena Cechu art from the artist's handoff 38-G001 (docs/poczta/od-grafika/arena/v1/).
- arena_plyta / arena_tyl / herb copied as delivered into public/swiat/arena/ (never refiltered),
- the judge and the Mechanical Gladiator: two standing poses (front, side looking left) each cut from the
  trial sheets and shrunk (box average, hard alpha) into a 3×3 sheet of 64 px frames like the people
  (rows down / side / up – up repeats the front until a back pose arrives; every column the same pose)."""
from PIL import Image
import os, shutil

SRC = 'docs/poczta/od-grafika/arena/v1'
OUT = 'public/swiat/arena'
os.makedirs(OUT, exist_ok=True)
for a, b in [('arena_plyta.png', 'arena_plyta.png'), ('arena_tyl.png', 'arena_tyl.png'), ('herb_lublin_512.png', 'herb_lublin.png')]:
    shutil.copyfile(f'{SRC}/{a}', f'{OUT}/{b}')
# 38-G002: spectators (2 frames of 640×600 side by side), the front arc, the floor grate, the grey banner + its mask.
for a in ['arena_widzowie_2kl.png', 'arena_przod.png', 'arena_kratka.png', 'arena_choragiew.png', 'arena_choragiew_maska.png']:
    shutil.copyfile(f'docs/poczta/od-grafika/arena/v2/{a}', f'{OUT}/{a}')

def postac(src, out, wys):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    pozy = []
    for half in (im.crop((0, 0, w // 2, h)), im.crop((w // 2, 0, w, h))):
        a = half.getchannel('A').point(lambda v: 255 if v > 100 else 0)
        half.putalpha(a)
        bb = a.getbbox()
        f = half.crop(bb)
        k = wys / f.height
        f = f.resize((max(1, round(f.width * k)), wys), Image.BOX)
        f.putalpha(f.getchannel('A').point(lambda v: 255 if v > 110 else 0))
        pozy.append(f)
    sheet = Image.new('RGBA', (192, 192))
    for r, p in enumerate([pozy[0], pozy[1], pozy[0]]):
        for c in range(3):
            sheet.alpha_composite(p, (c * 64 + 32 - p.width // 2, r * 64 + 63 - p.height))
    sheet.save(out)

postac(f'{SRC}/zrodla/sedzia_proba.png', 'public/postacie/sedzia_proba.png', 53)
postac(f'{SRC}/zrodla/gladiator_proba.png', 'public/postacie/gladiator_proba.png', 50)
print('ok')
