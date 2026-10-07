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
    # Smok ognisty, nowy rzut z góry (próbki grafika 7.10.2026, ognisty_rzut_v2/, stopy w [110,165] → +5 px w dół):
    # właściciel: „podmień czerwonego smoka na nowego”. Są tylko 2 klatki z boku, więc cały bok (stoi, idzie, ziej,
    # ugryzienie) składamy z nich: chód = postój z podskokiem o 1 px, otwarta paszcza = ziej_2. Przód/tył/śmierć – stare.
    v2 = os.path.join(ZR, 'ognisty_rzut_v2')
    if g == 'ognisty' and os.path.isdir(v2):
        stoi = rgba(os.path.join(v2, 'smok_ognisty_stoi_bok_1.png'))
        ziej = rgba(os.path.join(v2, 'smok_ognisty_ziej_bok_2.png'))
        def kl(im, dy):
            c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); c.paste(im, (0, 5 + dy)); return c
        zamiana = {'stoi_bok_1': kl(stoi, 0), 'stoi_bok_2': kl(stoi, 0), 'idzie_bok_1': kl(stoi, 0), 'idzie_bok_2': kl(stoi, -1),
                   'idzie_bok_3': kl(stoi, 0), 'idzie_bok_4': kl(stoi, -1), 'ziej_bok_1': kl(stoi, 0), 'ziej_bok_2': kl(ziej, 0),
                   'ziej_bok_3': kl(stoi, 0), 'ugryzienie_bok_1': kl(stoi, 0), 'ugryzienie_bok_2': kl(ziej, 0), 'ugryzienie_bok_3': kl(stoi, 0)}
    else:
        zamiana = {}
    for i, f in enumerate(pliki):
        n = nazwy[i]
        ark.paste(zamiana[n] if n in zamiana else rgba(os.path.join(d, f)), ((i % KOL) * w, (i // KOL) * h))
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
