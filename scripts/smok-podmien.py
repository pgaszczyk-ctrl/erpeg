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
# Właściciel 7.10.2026: „smok zmienia sprita w trakcie walki, wyrównaj do jednego” – dopóki grafik nie przerysuje reszty,
# KAŻDĄ klatkę (oprócz lot_gora: z niej robimy tylko czarny cień lotu) składamy z dwóch uproszczonych: bok i przód.
# Tył = bok (gra pokazuje smoka idącego w górę ekranu z profilu, RYSUNKI_SMOKOW.tylJakBok); chód = podskok o 1 px,
# ugryzienie 2 = wypad 2 px do przodu.
zrodla = {}
for f in sorted(glob.glob(f'{ZR}/smok_gorski_*.png')):
    a = np.asarray(Image.open(f).convert('RGBA')).copy()
    mag = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
    a[mag] = 0
    zrodla[os.path.basename(f)[len('smok_gorski_'):-4]] = a
def wklej(nazwa, a, dx=0, dy=0):
    ys, xs = np.where(a[..., 3] > 0)
    kx, ky = xs.mean(), ys.mean()
    i = meta['klatki'][nazwa]
    cx, cy = (i % kol) * CW, (i // kol) * CH
    ark.paste((0, 0, 0, 0), (cx, cy, cx + CW, cy + CH))
    kom = Image.new('RGBA', (CW, CH))
    kom.alpha_composite(Image.fromarray(a), (int(round(bx - kx)) + dx, int(round(by - ky)) + dy))
    ark.paste(kom, (cx, cy))
for nazwa in meta['klatki']:
    if nazwa.startswith('lot_gora'): continue
    kier = 'przod' if '_przod_' in nazwa else 'bok'
    src = zrodla.get(f'stoi_{kier}_1')
    if src is None: continue
    nr = int(nazwa.rsplit('_', 1)[1])
    dx = dy = 0
    if nazwa.startswith('idzie') and nr % 2 == 0: dy = -1
    if nazwa.startswith('ugryzienie') and nr == 2:
        if kier == 'bok': dx = -2
        else: dy = 2
    wklej(nazwa, src, dx, dy)
    print('podmieniono', nazwa, '←', f'stoi_{kier}_1', dx, dy)
ark.save(ARK, optimize=True)
