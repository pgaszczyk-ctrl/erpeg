#!/usr/bin/env python3
"""Smoki ognisty i kwasowy (paczka „smoki_swinka_dekoracje”, 7.10.2026): klatki 220×200 już w skali gry, wspólny punkt
odniesienia [110,170] (stopy). Skleja je w arkusze public/swiat/smoki/smok_<gatunek>.png (+ .json) i efekty ognia/kwasu
w paski efekt_<nazwa>.png. Magenta #FF00FF → przezroczystość; bez zmniejszania i wygładzania.
Uruchom: python3 scripts/smoki-nowe.py (potem przepisz listę klatek do RYSUNKI_SMOKOW w src/content/smoki.ts)."""
import json, os, re
from PIL import Image

ZR = os.path.join(os.path.dirname(__file__), 'smoki-zrodla', 'paczka_ssd')
CEL = os.path.join(os.path.dirname(__file__), '..', 'public', 'swiat', 'smoki')
KOL = 8

def rgba(p):
    im = Image.open(p).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if r == 255 and g == 0 and b == 255: px[x, y] = (0, 0, 0, 0)
    return im

for g in ('ognisty', 'kwasowy'):
    d = os.path.join(ZR, f'smok_{g}')
    pliki = sorted(f for f in os.listdir(d) if re.match(rf'smok_{g}_.+_\d+\.png$', f))
    nazwy = [f[len(f'smok_{g}_'):-4] for f in pliki]
    w, h = 220, 200
    wier = (len(pliki) + KOL - 1) // KOL
    ark = Image.new('RGBA', (w * KOL, h * wier), (0, 0, 0, 0))
    for i, f in enumerate(pliki):
        ark.paste(rgba(os.path.join(d, f)), ((i % KOL) * w, (i // KOL) * h))
    ark.save(os.path.join(CEL, f'smok_{g}.png'), optimize=True)
    json.dump({'komorka': [w, h], 'stopy': [110, 170], 'klatki': nazwy}, open(os.path.join(CEL, f'smok_{g}.json'), 'w'))
    print(g, len(nazwy), json.dumps(nazwy))

E = os.path.join(ZR, 'efekty')
paski = {f'ogien_{k}': 3 for k in ('prawo', 'prawo_dol', 'dol', 'prawo_gora', 'gora')}
paski.update({'przypalona_plama': 3, 'pocisk_kwasu': 2, 'rozbryzg_kwasu': 3, 'kaluza_kwasu': 3})
meta = json.load(open(os.path.join(E, 'metadata.json')))
for n, ile in paski.items():
    kl = [rgba(os.path.join(E, f'efekt_{n}_{i}.png')) for i in range(1, ile + 1)]
    w, h = kl[0].size
    pas = Image.new('RGBA', (w * ile, h), (0, 0, 0, 0))
    for i, k in enumerate(kl): pas.paste(k, (i * w, 0))
    pas.save(os.path.join(CEL, f'efekt_{n}.png'), optimize=True)
    print(n, w, h, meta[f'efekt_{n}_1.png']['anchor'])
