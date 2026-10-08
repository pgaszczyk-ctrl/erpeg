"""Prepare pack 25 for the existing 64px frame loader; keep colours and use nearest-neighbour.

Run from the repo root: python3 scripts/postacie25.py (Pillow).
Original cells and riding poses remain in postacie25-zrodla; no invented riding animations.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts/postacie25-zrodla'
ROWS = ('dol', 'prawo', 'gora')
COLS = ('krok_1', 'stoi', 'krok_2')

def solid(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    return im

for number in range(1, 26):
    frames = [solid(Image.open(SOURCE / 'postacie' / f'postac_{number:02}' / f'{row}_{col}.png'))
              for row in ROWS for col in COLS]
    boxes = [im.getbbox() for im in frames]
    scale = min(54 / max(b[3]-b[1] for b in boxes), 60 / max(b[2]-b[0] for b in boxes))
    sheet = Image.new('RGBA', (192, 192))
    for n, (im, box) in enumerate(zip(frames, boxes)):
        frame = im.crop(box)
        frame = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.NEAREST)
        sheet.alpha_composite(frame, ((n%3)*64 + (64-frame.width)//2, (n//3)*64 + 63-frame.height))
    sheet.save(ROOT / 'public/postacie' / f'lista25_{number:02}.png')

    for vehicle, pose in [('rower', 'welocyped'), ('hulajnoga', 'hulajnoga')]:
        ride = Image.new('RGBA', (96, 96))
        # Pack 01 has a scooter baked into both riding cells; use it only for the scooter.
        embedded = number <= 10 and vehicle == 'hulajnoga'
        file = f'{pose}_prawo.png' if number > 10 or embedded else 'prawo_stoi.png'
        person = solid(Image.open(SOURCE / 'postacie' / f'postac_{number:02}' / file))
        person = person.crop(person.getbbox())
        person = person.resize((round(person.width*scale), round(person.height*scale)), Image.Resampling.NEAREST)
        # The pictures face left despite the source filenames; the prepared riding picture faces right.
        person = person.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if embedded:
            ride.alpha_composite(person, ((96-person.width)//2, 88-person.height))
        else:
            ride.alpha_composite(person, (40-person.width//2, 12))
            asset = 'welocyped_parowy_zrodlo.png' if vehicle == 'rower' else 'hulajnoga_parowa_64.png'
            v = solid(Image.open(SOURCE / 'pojazdy' / asset))
            v = v.crop(v.getbbox())
            if vehicle == 'hulajnoga':
                v = v.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            k = min(58/v.width, 46/v.height)
            v = v.resize((round(v.width*k), round(v.height*k)), Image.Resampling.NEAREST)
            ride.alpha_composite(v, (20, 88-v.height))
        ride.save(ROOT / 'public/postacie' / f'lista25_{number:02}_{vehicle}.png')

# Existing world decoration canvas: wheels on the bottom, same size and anchor as the old bicycle.
bike = solid(Image.open(SOURCE / 'pojazdy/welocyped_parowy_zrodlo.png'))
bike = bike.crop(bike.getbbox())
scale = min(30/bike.width, 23/bike.height)
bike = bike.resize((round(bike.width*scale), round(bike.height*scale)), Image.Resampling.NEAREST)
canvas = Image.new('RGBA', (36, 27))
canvas.alpha_composite(bike, ((36-bike.width)//2, 25-bike.height))
canvas.save(ROOT / 'public/swiat/welocyped_test25.png')
