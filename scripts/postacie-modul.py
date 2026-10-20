#!/usr/bin/env python3
"""Modular heroes (artist pack „20 postaci, osie v5”): head + body parts glued at the neck.

Reads scripts/modul-zrodla/ (the artist's 64 px parts, masks and manifest) and writes
  public/postacie/modul/{glowy,glowy_maska,ciala,ciala_maska}.png  – 20 parts side by side, 64×64 each
  src/content/modulDane.ts                                         – anchors, gender, age, base colours
Head masks: blue = skin, yellow = hair (the artist left head masks empty, so they are made here:
pixels of the face's chromaticity; hair = pixels like the seed points in modul-zrodla/wlosy_ziarna.json,
connected to them). Body masks: the artist's red/green clothes + blue = skin (hands, neck).
Stray specks (≤ 3 px apart from the figure) are removed from the heads.
Run: python3 scripts/postacie-modul.py
"""
import json, math, os
from collections import Counter
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = os.path.join(ROOT, 'scripts', 'modul-zrodla')
OUT = os.path.join(ROOT, 'public', 'postacie', 'modul')
m = json.load(open(os.path.join(Z, 'manifest.json')))
WLOSY = json.load(open(os.path.join(Z, 'wlosy_ziarna.json')))

def chrom(c):
    s = sum(c[:3]) + 1
    return (c[0] / s, c[1] / s), s

def similar(c, r, tc, lo, hi):
    (a, sa), (b, sb) = chrom(c), chrom(r)
    return math.hypot(a[0] - b[0], a[1] - b[1]) < tc and lo * sb <= sa <= hi * sb and sa > (60 if sb < 200 else 110)

def region(px, seeds, refs, tc, lo, hi, ban):
    cand = lambda p: px[p][3] and p not in ban and any(similar(px[p], r, tc, lo, hi) for r in refs)
    out, st = set(), [s for s in seeds if cand(s)]
    while st:
        p = st.pop()
        if p in out:
            continue
        out.add(p)
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                q = (p[0] + a, p[1] + b)
                if 0 <= q[0] < 64 and 0 <= q[1] < 64 and q not in out and cand(q):
                    st.append(q)
    return out

def drop_specks(im):
    px = im.load(); seen = set()
    for x in range(64):
        for y in range(64):
            if px[x, y][3] == 0 or (x, y) in seen:
                continue
            comp, st = [], [(x, y)]
            seen.add((x, y))
            while st:
                p = st.pop(); comp.append(p)
                for a in (-1, 0, 1):
                    for b in (-1, 0, 1):
                        q = (p[0] + a, p[1] + b)
                        if 0 <= q[0] < 64 and 0 <= q[1] < 64 and q not in seen and px[q][3]:
                            seen.add(q); st.append(q)
            if len(comp) <= 3:
                for p in comp:
                    px[p] = (0, 0, 0, 0)

NAZWY = {'01': 'Warkocze', '02': 'Kowal', '03': 'Pilotka', '04': 'Profesor', '05': 'Kucharka', '06': 'Ogrodniczka',
         '07': 'Maszynista', '08': 'Kurierka', '09': 'Wynalazca', '10': 'Karczmarz', '11': 'Czarodziej', '12': 'Zwiadowca',
         '13': 'Dżentelmen', '14': 'Podróżnik', '15': 'Gospodyni', '16': 'Strażnik', '17': 'Rudobrody', '18': 'Łuczniczka',
         '19': 'Listonosz', '20': 'Mechanik'}
strips = {k: Image.new('RGBA', (64 * 20, 64), (0, 0, 0, 0)) for k in ('glowy', 'glowy_maska', 'ciala', 'ciala_maska')}
glowy, ciala = [], []
for i, h in enumerate(m['heads']):
    k = h['id'][:2]
    im = Image.open(os.path.join(Z, h['image_64'])).convert('RGBA')
    drop_specks(im)
    px = im.load()
    ax, ey = int(h['axis_x']), int(h['eyes']['midpoint']['y'])
    box = Counter(px[x, y][:3] for x in range(ax - 8, ax + 9) for y in range(ey - 3, ey + 5)
                  if px[x, y][3] and sum(px[x, y][:3]) > 200 and px[x, y][0] > px[x, y][1] > px[x, y][2])
    ref = [c for c, _ in box.most_common(3)]
    skin = {(x, y) for x in range(64) for y in range(64) if px[x, y][3] and any(similar(px[x, y], r, 0.03, 0.55, 1.25) for r in ref)}
    wl = WLOSY.get(k, {})
    seeds = [tuple(s) for s in wl.get('s', [])]
    ban = skin | {(x, y) for x in range(64) for y in range(wl.get('ymin', 0))}
    hair = region(px, seeds, [px[s] for s in seeds], wl.get('t', 0.04), wl.get('lo', 0.4), wl.get('hi', 2.2), ban) if seeds else set()
    if len(hair) < 12:
        hair = set()  # a few pixels under a hat: not worth recolouring
    mk = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); mp = mk.load()
    for p in skin: mp[p] = (0, 0, 255, 255)
    for p in hair: mp[p] = (255, 255, 0, 255)
    strips['glowy'].paste(im, (i * 64, 0)); strips['glowy_maska'].paste(mk, (i * 64, 0))
    sk = sorted(skin, key=lambda p: sum(px[p][:3])); hr = sorted(hair, key=lambda p: sum(px[p][:3]))
    glowy.append({'id': k, 'nazwa': NAZWY[k], 'plec': h['plec'], 'wiek': h['wiek'], 'mx': h['mount']['x'], 'my': h['mount']['y'],
                  'skora': list(px[sk[len(sk) * 3 // 4]][:3]), 'wlosy': list(px[hr[len(hr) * 3 // 4]][:3]) if hr else None})
TONY = [tuple(g['skora']) for g in glowy]
plec = {g['id']: g['plec'] for g in glowy}
for i, b in enumerate(m['bodies']):
    k = b['id'][:2]
    im = Image.open(os.path.join(Z, b['image_64'])).convert('RGBA'); px = im.load()
    cm = Image.open(os.path.join(Z, b['mask_64'])).convert('RGBA'); cp = cm.load()
    skin = {(x, y) for x in range(64) for y in range(64)
            if px[x, y][3] and cp[x, y][3] == 0 and any(similar(px[x, y], t, 0.025, 0.6, 1.15) for t in TONY)}
    mk = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); mp = mk.load()
    for x in range(64):
        for y in range(64):
            c = cp[x, y]
            if c[3] and c[0] == 255: mp[x, y] = (255, 0, 0, 255)
            elif c[3] and c[1] == 255: mp[x, y] = (0, 255, 0, 255)
    for p in skin: mp[p] = (0, 0, 255, 255)
    strips['ciala'].paste(im, (i * 64, 0)); strips['ciala_maska'].paste(mk, (i * 64, 0))
    sk = sorted(skin, key=lambda p: sum(px[p][:3]))
    ciala.append({'id': k, 'nazwa': NAZWY[k], 'plec': plec[k], 'nx': b['neck']['x'], 'ny': b['neck']['y'], 'stopa': b['foot_bottom_y'],
                  'skora': list(px[sk[len(sk) * 3 // 4]][:3]) if sk else None})
os.makedirs(OUT, exist_ok=True)
for k, im in strips.items():
    im.save(os.path.join(OUT, k + '.png'), optimize=True)
ts = ['// Generated by scripts/postacie-modul.py – do not edit by hand.',
      "/** A head: neck contact point (mx, my) in its 64×64 picture, base skin/hair colour (null = hair not recoloured). */",
      "export interface GlowaModul { id: string; nazwa: string; plec: 'k' | 'm'; wiek: 'dorosly' | 'starszy'; mx: number; my: number; skora: number[]; wlosy: number[] | null }",
      "/** A body: neck point (nx, ny), lowest foot row, the gender of the character it was drawn for, base skin colour of the hands. */",
      "export interface CialoModul { id: string; nazwa: string; plec: 'k' | 'm'; nx: number; ny: number; stopa: number; skora: number[] | null }",
      'export const GLOWY_MODUL: GlowaModul[] = ' + json.dumps(glowy, ensure_ascii=False) + ';',
      'export const CIALA_MODUL: CialoModul[] = ' + json.dumps(ciala, ensure_ascii=False) + ';', '']
open(os.path.join(ROOT, 'src', 'content', 'modulDane.ts'), 'w').write('\n'.join(ts))
print('glowy', len(glowy), 'ciala', len(ciala), 'bez maski wlosow:', [g['id'] for g in glowy if not g['wlosy']])
