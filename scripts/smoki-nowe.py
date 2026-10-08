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
            # magenta i jej mieszanki na krawędzi (próbki leśnego/trującego miały różową obwódkę)
            if a == 0 or (r > 150 and b > 150 and g < 110 and abs(r - b) < 90): px[x, y] = (0, 0, 0, 0)
    return im

for g in ('ognisty', 'kwasowy'):
    d = os.path.join(ZR, f'smok_{g}')
    pliki = sorted(f for f in os.listdir(d) if re.match(rf'smok_{g}_.+_\d+\.png$', f))
    nazwy = [f[len(f'smok_{g}_'):-4] for f in pliki]
    w, h = 220, 200
    wier = (len(pliki) + KOL - 1) // KOL
    ark = Image.new('RGBA', (w * KOL, h * wier), (0, 0, 0, 0))
    zamiana = {}
    for i, f in enumerate(pliki):
        n = nazwy[i]
        ark.paste(zamiana[n] if n in zamiana else rgba(os.path.join(d, f)), ((i % KOL) * w, (i // KOL) * h))
    ark.save(os.path.join(CEL, f'smok_{g}.png'), optimize=True)
    json.dump({'komorka': [w, h], 'stopy': [110, 170], 'klatki': nazwy}, open(os.path.join(CEL, f'smok_{g}.json'), 'w'))
    print(g, len(nazwy), json.dumps(nazwy))

# Leśny i trujący (paczka „23_smoki_proba_v2”, 8.10.2026): na razie tylko 2 klatki stania z boku – cały arkusz z nich
# (chód = postój z podskokiem o 1 px, ugryzienie 2 = wypad 2 px, śmierć = postój); gra pokazuje zawsze bok (RYSUNKI_SMOKOW.tylkoBok).
for g in ('lesny', 'trujacy'):
    d = os.path.join(ZR, 'v3', f'smok_{g}_probki')
    if not os.path.isdir(d): continue
    s1, s2 = rgba(os.path.join(d, f'smok_{g}_stoi_bok_1.png')), rgba(os.path.join(d, f'smok_{g}_stoi_bok_2.png'))
    w, h = 220, 200
    def kl(im, dx=0, dy=0):
        c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); c.paste(im, (dx, dy)); return c
    klatki = {'stoi_bok_1': kl(s1), 'stoi_bok_2': kl(s2), 'idzie_bok_1': kl(s1), 'idzie_bok_2': kl(s2, 0, -1), 'idzie_bok_3': kl(s1),
              'idzie_bok_4': kl(s2, 0, -1), 'ugryzienie_bok_1': kl(s1, 1), 'ugryzienie_bok_2': kl(s2, -2), 'ugryzienie_bok_3': kl(s1),
              'smierc_bok_1': kl(s1), 'smierc_bok_2': kl(s1, 0, 1), 'smierc_bok_3': kl(s1, 0, 2)}
    nazwy = sorted(klatki)
    wier = (len(nazwy) + KOL - 1) // KOL
    ark = Image.new('RGBA', (w * KOL, h * wier), (0, 0, 0, 0))
    for i, n in enumerate(nazwy): ark.paste(klatki[n], ((i % KOL) * w, (i // KOL) * h))
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
