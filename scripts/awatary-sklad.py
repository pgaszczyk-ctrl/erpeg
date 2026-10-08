#!/usr/bin/env python3
"""Bohaterowie z klocków (zamówienie 22, próba grafika 7.10.2026): składa głowę i tułów w gotowy arkusz 192×192
(3×3 klatki jak pozostali bohaterowie) i przebarwia go według masek (niebieski = skóra, żółty = włosy, czerwony = ubranie,
zielony = drugi kolor). Przebarwienie zachowuje jasność: każdy z 3 tonów materiału grafika przechodzi na ton tego samego
stopnia w wybranej palecie. Każda klatka głowy jest dopasowana punktem broda do punktu szyja tułowia z metadata.json (paczka 22_awatary_v2).
Wynik: public/postacie/sklad_<g>_<t>_<k>.png (+ lista dla content/wyglad.ts na wyjściu).
Uruchom: python3 scripts/awatary-sklad.py"""
import json, os
import numpy as np
from PIL import Image

ZR = os.path.join(os.path.dirname(__file__), 'awatary-zrodla')
CEL = os.path.join(os.path.dirname(__file__), '..', 'public', 'postacie')
META = json.load(open(os.path.join(ZR, 'metadata.json')))
CZESCI = META['parts']
pal = json.load(open(os.path.join(ZR, 'paleta_materialow.json')))
hx = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])
BAZA = {'skin': pal['skin'], 'hair': pal['hair'], 'main': pal['main_clothing'], 'second': pal['secondary_clothing']}
# zestawy kolorów: oryginał grafika + jego przykładowe warianty
ZESTAWY = [BAZA] + [{k: v for k, v in d.items()} for d in pal['demo_variants']]
MASKA = {(0, 0, 255): 'skin', (255, 255, 0): 'hair', (255, 0, 0): 'main', (0, 255, 0): 'second'}

def wczytaj(n):
    a = np.asarray(Image.open(os.path.join(ZR, n + '.png')).convert('RGBA')).copy()
    m = np.asarray(Image.open(os.path.join(ZR, n + '_maska.png')).convert('RGBA'))
    return a, m

def przebarw(a, m, zestaw):
    out = a.copy()
    for rgb, mat in MASKA.items():
        sel = (m[..., 3] > 0) & (m[..., 0] == rgb[0]) & (m[..., 1] == rgb[1]) & (m[..., 2] == rgb[2]) & (a[..., 3] > 0)
        if not sel.any(): continue
        baza = np.array([hx(h) for h in BAZA[mat]])
        cel = np.array([hx(h) for h in zestaw[mat]])
        px = a[sel][:, :3].astype(int)
        # odcień bazowy najbliższy → ten sam stopień w nowej palecie (+ różnica jasności, gdyby grafik użył tonu spoza 3)
        idx = ((px[:, None, :] - baza[None]) ** 2).sum(-1).argmin(1)
        delta = px.mean(1) - baza[idx].mean(1)
        nowe = np.clip(cel[idx] + delta[:, None], 0, 255)
        out[sel, :3] = nowe.astype(np.uint8)
    return out

def sklad(g, t, k):
    ga, gm = wczytaj(f'glowy/glowa_{g}'); ta, tm = wczytaj(f'tulowie/tulow_{t}')
    zg, zt = przebarw(ga, gm, ZESTAWY[k]), przebarw(ta, tm, ZESTAWY[k])
    ark = Image.new('RGBA', (192, 192))
    for r in range(3):
        for c in range(3):
            box = (c * 64, r * 64, c * 64 + 64, r * 64 + 64)
            kl = Image.new('RGBA', (64, 64))
            kl.alpha_composite(Image.fromarray(zt).crop(box))
            n = r * 3 + c
            szyja = CZESCI[f'tulow_{t}']['frames'][n]['szyja']
            broda = CZESCI[f'glowa_{g}']['frames'][n]['broda']
            przesuniecie = (szyja[0] - broda[0], szyja[1] - broda[1])
            kl.alpha_composite(Image.fromarray(zg).crop(box), przesuniecie)
            ark.paste(kl, box[:2])
    return ark

# Zachowujemy osiem dotychczasowych połączeń i ich nazwy plików, aby zapisy postaci nadal wskazywały ten sam wariant.
LISTA = [('01', '01', 0), ('01', '04', 1), ('02', '01', 2), ('02', '04', 3), ('01', '01', 4), ('02', '04', 0), ('01', '04', 2), ('02', '01', 1)]
for g, t, k in LISTA:
    sklad(g, t, k).save(os.path.join(CEL, f'sklad_{g}_{t}_{k}.png'), optimize=True)
    print(f'sklad_{g}_{t}_{k}')
