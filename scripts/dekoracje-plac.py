#!/usr/bin/env python3
"""Dekoracje placów od grafika (paczka „smoki_swinka_dekoracje”, 7.10.2026: 64×80, podstawa [32,72]) zmniejszone do skali
postaci (zasada właściciela: rzeczy „na wzrost człowieka” mierzone bohaterką, ~27 px generatora). Zmniejszanie głosowaniem
(najczęstszy kolor w kwadracie, bez mieszania), ciemny obrys grafika zostaje na brzegu sylwetki; nic nie dorysowujemy.
Wynik: public/swiat/ozdoby/plac_<nazwa>.png (podstawa = środek dolnej krawędzi)."""
import json, os
import numpy as np
from PIL import Image

ZR = os.path.join(os.path.dirname(__file__), 'dekoracje-zrodla')
CEL = os.path.join(os.path.dirname(__file__), '..', 'public', 'swiat', 'ozdoby')
# Skala względem rysunku grafika (1 px rysunku = 1 px generatora): zegar wyższy od człowieka, ławka i donica do pasa.
SKALA = {'zegar_uliczny': 0.75, 'pompa_parowa': 0.55, 'teleskop': 0.5, 'lawka_trybiki': 0.5, 'donica_miedziana': 0.45, 'gablota_ogloszen': 0.55}

meta = json.load(open(os.path.join(ZR, 'metadata.json')))
for n, k in SKALA.items():
    a = np.asarray(Image.open(os.path.join(ZR, meta[n]['file'])).convert('RGBA')).astype(int)
    x, y, w, h = meta[n]['bbox']
    ax, ay = meta[n]['anchor']
    a = a[y:ay, x:x + w]  # od czubka do podstawy
    H, W = a.shape[:2]
    tw, th = max(1, round(W * k)), max(1, round(H * k))
    out = np.zeros((th, tw, 4), np.uint8)
    pel = a[..., 3] > 127
    jas = a[..., :3].sum(-1)
    ciemny = np.median(jas[pel]) * 0.35
    for j in range(th):
        for i in range(tw):
            y0, y1 = int(j * H / th), max(int(j * H / th) + 1, int((j + 1) * H / th))
            x0, x1 = int(i * W / tw), max(int(i * W / tw) + 1, int((i + 1) * W / tw))
            m = pel[y0:y1, x0:x1]
            if m.mean() < 0.4: continue
            px = a[y0:y1, x0:x1][m][:, :3]
            brzeg = m.mean() < 0.95 or i in (0, tw - 1) or j in (0, th - 1)
            ciem = px[px.sum(-1) < ciemny]
            if brzeg and len(ciem): c = ciem[0]
            else:
                jasne = px[px.sum(-1) >= ciemny] if len(px[px.sum(-1) >= ciemny]) else px
                v, cnt = np.unique(jasne, axis=0, return_counts=True)
                c = v[cnt.argmax()]
            out[j, i, :3] = c; out[j, i, 3] = 255
    Image.fromarray(out).save(os.path.join(CEL, f'plac_{n}.png'))
    print(n, tw, th)
