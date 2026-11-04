#!/usr/bin/env python3
"""Smoki z paczki 40-G002 (pełny zestaw v2) → arkusze gry.

Grafik podaje dla każdej klatki własny punkt zaczepienia (renderAnchor) i skalę (renderScale), a gra ma jeden
wspólny origin na arkusz. Skrypt przesuwa więc każdą klatkę do nowej, większej komórki tak, żeby jej zaczep
(stopy) leżał zawsze w tym samym punkcie, a klatki o innej skali niż reszta gatunku przeskalowuje
(nearest-neighbour) do skali gatunku; ta wspólna skala gatunku idzie do gry jako `skala`.

Źródła: scripts/smoki-zrodla/40_v2/<gatunek>/<klatka>.png + metadata.json (kopie z paczki, nie zmieniać).
Wynik: public/swiat/smoki/smok_<gatunek>.png + .json, a na wyjściu liczby do RYSUNKI_SMOKOW (content/smoki.ts).
"""
import json, os, collections
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = os.path.join(R, 'scripts/smoki-zrodla/40_v2')
OUT = os.path.join(R, 'public/swiat/smoki')
GAT = ['ognisty', 'gorski', 'kwasowy', 'lesny', 'trujacy', 'cien']
KOLUMNY = 8
# Środek ciała (origin w grze) tyle px nad stopami – jak w dotychczasowych arkuszach (stopy 170, środek 130).
SRODEK_NAD_STOPAMI = 40

meta = json.load(open(os.path.join(Z, 'metadata.json')))
klatki = {}  # g -> [(nazwa, obraz, (ax, ay), mouth)]
skale = {}
for g in GAT:
    fr = meta['species'][g]['frames']
    s0 = collections.Counter(round(f['renderScale'], 3) for f in fr).most_common(1)[0][0]
    skale[g] = s0
    lista = []
    for f in sorted(fr, key=lambda f: f['atlasIndex']):
        im = Image.open(os.path.join(Z, f['file'])).convert('RGBA')
        ax, ay = f['renderAnchor']
        mx, my = f['mouth']
        r = f['renderScale'] / s0
        if abs(r - 1) > 0.01:
            w, h = round(im.width * r), round(im.height * r)
            im = im.resize((w, h), Image.NEAREST)
            ax, ay, mx, my = ax * r, ay * r, mx * r, my * r
        bb = im.getbbox()
        im = im.crop(bb)
        lista.append((f['name'], im, (ax - bb[0], ay - bb[1]), (mx - bb[0], my - bb[1])))
    klatki[g] = lista

# Jedna komórka dla wszystkich gatunków: zaczep w (cx, cy), wszystko mieści się z marginesem 1 px.
L = Rr = T = D = 0
for lista in klatki.values():
    for _, im, (ax, ay), _m in lista:
        L, Rr = max(L, ax), max(Rr, im.width - ax)
        T, D = max(T, ay), max(D, im.height - ay)
pol = int(max(L, Rr)) + 2
W = 2 * pol
H = int(T) + int(D) + 4
cx, cy = pol, int(T) + 2
print(f'komórka {W}x{H}, stopy [{cx},{cy}]')

for g, lista in klatki.items():
    n = len(lista)
    rows = (n + KOLUMNY - 1) // KOLUMNY
    sheet = Image.new('RGBA', (KOLUMNY * W, rows * H), (0, 0, 0, 0))
    pyski = {}
    for i, (nazwa, im, (ax, ay), (mx, my)) in enumerate(lista):
        ox, oy = round(cx - ax), round(cy - ay)
        sheet.alpha_composite(im, ((i % KOLUMNY) * W + ox, (i // KOLUMNY) * H + oy))
        pyski[nazwa] = [round(mx + ox), round(my + oy)]
    sheet.save(os.path.join(OUT, f'smok_{g}.png'), optimize=True)
    nazwy = [l[0] for l in lista]
    json.dump({'komorka': [W, H], 'stopy': [cx, cy], 'srodek': [cx, cy - SRODEK_NAD_STOPAMI], 'skala': skale[g],
               'klatki': nazwy, 'zrodlo': '40-G002 v2'}, open(os.path.join(OUT, f'smok_{g}.json'), 'w'), ensure_ascii=False)
    # Pysk na kierunek: z klatki wyrzutu ataku specjalnego, inaczej z ugryzienia.
    pysk = {}
    for k in ('bok', 'przod', 'tyl'):
        for a in ('ziej', 'pluj', 'dmuch', 'szpony', 'ugryzienie'):
            if f'{a}_{k}_2' in pyski:
                pysk[k] = pyski[f'{a}_{k}_2']
                break
    print(f"  {g}: klatek {n}, skala {skale[g]}, pysk {json.dumps(pysk)}")
    print(f"    klatki: {json.dumps(nazwy)}")
