#!/usr/bin/env python3
"""Wkleja uproszczone klatki smoka górskiego od grafika (zamówienie 20, już w rozmiarze gry: 220×200 na magencie)
w arkusz public/swiat/smoki/smok_gorski.png w miejsce klatek o tych samych nazwach, z tym samym zaczepieniem co reszta
(środek masy sylwetki w punkcie `srodek` komórki). Uruchamiać po scripts/smok-gorski.py (który odtwarza stary arkusz).
Użycie: python3 scripts/smok-podmien.py
"""
import glob, json, os
import numpy as np
from PIL import Image

ZR = 'scripts/smoki-zrodla/proste'
ARK = 'public/swiat/smoki/smok_gorski.png'
meta = json.load(open('public/swiat/smoki/smok_gorski.json'))
CW, CH = meta['komorka']; bx, by = meta['srodek']
ark = Image.open(ARK).convert('RGBA')
kol = ark.width // CW
for f in sorted(glob.glob(f'{ZR}/smok_gorski_*.png')):
    nazwa = os.path.basename(f)[len('smok_gorski_'):-4]
    if nazwa not in meta['klatki']: continue
    a = np.asarray(Image.open(f).convert('RGBA')).copy()
    mag = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
    a[mag] = 0
    ys, xs = np.where(a[..., 3] > 0)
    kx, ky = xs.mean(), ys.mean()
    i = meta['klatki'][nazwa]
    cx, cy = (i % kol) * CW, (i // kol) * CH
    ark.paste((0, 0, 0, 0), (cx, cy, cx + CW, cy + CH))
    kom = Image.new('RGBA', (CW, CH))
    kom.alpha_composite(Image.fromarray(a), (int(round(bx - kx)), int(round(by - ky))))
    ark.paste(kom, (cx, cy))
    print('podmieniono', nazwa, 'długość', xs.max() - xs.min() + 1)
ark.save(ARK, optimize=True)
