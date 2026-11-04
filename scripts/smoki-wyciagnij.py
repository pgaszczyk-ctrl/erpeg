import json, os, shutil, sys
from PIL import Image, ImageDraw, ImageFont
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = R + '/docs/paczka-dla-artysty/40_smoki_ujednolicenie'
os.makedirs(OUT + '/obecne_arkusze', exist_ok=True)
os.makedirs(OUT + '/obecne_klatki', exist_ok=True)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
G = ['gorski', 'ognisty', 'kwasowy', 'lesny', 'trujacy']
NAZWA = {'gorski': 'Smok górski', 'ognisty': 'Smok ognisty', 'kwasowy': 'Smok kwasowy', 'lesny': 'Smok leśny', 'trujacy': 'Smok trujący'}
BG = (226, 214, 186)
def frames(g):
    j = json.load(open(f'{R}/public/swiat/smoki/smok_{g}.json'))
    im = Image.open(f'{R}/public/swiat/smoki/smok_{g}.png').convert('RGBA')
    w, h = j['komorka']; k = j['klatki']
    names = list(k.keys()) if isinstance(k, dict) else k
    cols = im.width // w
    out = {}
    for i, n in enumerate(names):
        out[n] = im.crop(((i % cols) * w, (i // cols) * h, (i % cols + 1) * w, (i // cols + 1) * h))
    return out, (w, h)
def bg(w, h):
    im = Image.new('RGBA', (w, h), BG + (255,)); d = ImageDraw.Draw(im)
    for y in range(0, h, 16):
        for x in range(0, w, 16):
            if (x // 16 + y // 16) % 2: d.rectangle([x, y, x + 15, y + 15], fill=(214, 201, 170, 255))
    return im
allf = {}
for g in G:
    fr, (w, h) = frames(g); allf[g] = fr
    shutil.copy(f'{R}/public/swiat/smoki/smok_{g}.png', f'{OUT}/obecne_arkusze/smok_{g}.png')
    shutil.copy(f'{R}/public/swiat/smoki/smok_{g}.json', f'{OUT}/obecne_arkusze/smok_{g}.json')
    os.makedirs(f'{OUT}/obecne_klatki/{g}', exist_ok=True)
    for n, f in fr.items(): f.save(f'{OUT}/obecne_klatki/{g}/{n}.png')
    # contact sheet with labels
    cols = 6; rows = (len(fr) + cols - 1) // cols
    cs = bg(cols * w, rows * (h + 18) + 30); d = ImageDraw.Draw(cs)
    d.text((8, 6), f'{NAZWA[g]} – obecne klatki ({len(fr)}), komórka {w}×{h}', fill=(30, 26, 36), font=FB)
    for i, (n, f) in enumerate(fr.items()):
        x, y = (i % cols) * w, 30 + (i // cols) * (h + 18)
        cs.alpha_composite(f, (x, y)); d.text((x + 4, y + h + 1), n, fill=(30, 26, 36), font=F)
    cs.save(f'{OUT}/plansza_{g}.png')
for n in os.listdir(f'{R}/public/swiat/smoki'):
    if n.startswith('efekt_'):
        os.makedirs(f'{OUT}/obecne_efekty', exist_ok=True); shutil.copy(f'{R}/public/swiat/smoki/{n}', f'{OUT}/obecne_efekty/{n}')
# code-drawn placeholder dragon (art.ts drawDragon), frame f0, x4
pl = Image.new('RGBA', (40, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(pl)
O = '#1e1a24'
def px(x, y, w, h, c): d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)
body, light, belly = '#3f9a4a', '#6fd06a', '#e8d27a'
for a in [(16,1,16,12,O),(17,2,14,10,'#2f7a3a'),(20,2,1,10,O),(25,2,1,10,O),(29,17,10,4,O),(30,18,8,2,body),(36,15,3,3,O),(13,13,18,11,O),(14,14,16,9,body),(15,19,13,4,belly),(15,14,8,2,light),(8,9,8,8,O),(9,10,6,6,body),(1,6,11,8,O),(2,7,9,6,body),(2,11,4,2,belly),(5,8,2,2,'#fff3a0'),(6,8,1,1,O),(8,4,2,3,O),(2,12,1,1,O),(15,23,4,4,O),(25,23,4,4,O),(16,23,2,3,body),(26,23,2,3,body)]: px(*a)
pl.resize((160, 120), Image.NEAREST).save(f'{OUT}/obecny_zastepczy_z_kodu_x4.png')
# comparison: standing side frames side by side at game scale (all dragons 0.5), plus hero, x2
hero = Image.open(f'{R}/public/postacie/lista25_01.png').convert('RGBA').crop((64, 64, 128, 128))  # side standing
hero = hero.crop(hero.getbbox()); hs = 27
hero = hero.resize((round(hero.width * hs / hero.height), hs), Image.NEAREST)
W1 = 220; H1 = 200
cmp = bg(len(G) * W1 + 60, H1 + 60); d = ImageDraw.Draw(cmp)
for i, g in enumerate(G):
    f = allf[g].get('stoi_bok_1')
    x = i * W1
    # gorski cell 216x194 with feet differently placed: align bottoms of bboxes on one line
    bb = f.getbbox(); fy = 170
    cmp.alpha_composite(f, (x + (W1 - f.width) // 2, fy - bb[3] + 20))
    d.text((x + 8, H1 + 24), NAZWA[g], fill=(30, 26, 36), font=FB)
d.line([(0, 190), (cmp.width, 190)], fill=(140, 120, 90, 255))
cmp.alpha_composite(hero, (len(G) * W1 + 20, 190 - hs + 1))
d.text((len(G) * W1 + 6, 196), 'bohater', fill=(30, 26, 36), font=F)
cmp.resize((cmp.width * 2, cmp.height * 2), Image.NEAREST).save(f'{OUT}/porownanie_stoi_bok_x2.png')
# front views where they exist
cmp2 = bg(len(G) * W1, H1 + 40); d = ImageDraw.Draw(cmp2)
for i, g in enumerate(G):
    f = allf[g].get('stoi_przod_1')
    if f is None:
        d.text((i * W1 + 20, 90), 'brak przodu\n(gra pokazuje bok)', fill=(150, 30, 30), font=F)
    else:
        bb = f.getbbox(); cmp2.alpha_composite(f, (i * W1 + (W1 - f.width) // 2, 190 - bb[3]))
    d.text((i * W1 + 8, H1 + 12), NAZWA[g], fill=(30, 26, 36), font=FB)
cmp2.resize((cmp2.width * 2, cmp2.height * 2), Image.NEAREST).save(f'{OUT}/porownanie_stoi_przod_x2.png')
# palette count per species
for g in G:
    cols = set()
    for f in allf[g].values():
        for c in f.get_flattened_data():
            if c[3] > 0: cols.add(c[:3])
    bbs = [f.getbbox() for f in allf[g].values() if f.getbbox()]
    print(g, 'kolorow', len(cols), 'klatek', len(allf[g]), 'unikalnych', len({f.tobytes() for f in allf[g].values()}), 'bbox stoi_bok_1', allf[g]['stoi_bok_1'].getbbox())
