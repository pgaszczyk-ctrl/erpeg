#!/usr/bin/env python3
"""Szkielety zabytków dla grafika (G12, docs/paczka-dla-programisty/ZABYTKI.md), z surowych danych OSM (data/lublin-osm.geojsonseq.gz).

Rzut jak w grze (CityMap.fromLatLon z początkiem mapy Lublina), 2 px obrazu na punkt mapy (3,84 px na metr). Każda część: dach na
obrysie, ściany w dół o wysokość i w prawo o 0,35 wysokości (bufor głębokości: przód = podstawa ściany dalej na południe).
Wysokości: kondygnacja 8 px, zwykłe części najwyżej 16 px; wysokie (wieże, `wysokosc_m` > 15) 16 + (h − 15) × 1,6 px.
Wyniki w docs/paczka-dla-artysty/19_zabytki_szkielety/: <id>_szkielet_x4.png (magenta, wejście dla generatora obrazów),
<id>_w_scenie_x2.png (szkielet wśród sąsiednich budynków, numery części, bohaterka dla skali), <id>.json (położenie w grze).
Użycie: python3 scripts/zabytki-szkielety.py
"""
import gzip, json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ORIGIN = {'lon': 22.4537881, 'lat': 51.2965553, 'lat0': 51.21818255}  # public/map/lublin.json origin
PX_M = 1.92 * 2  # px obrazu na metr
OUT = 'docs/paczka-dla-artysty/19_zabytki_szkielety'

ZABYTKI = [
    {'id': 'brama_krakowska', 'nazwa': 'Brama Krakowska', 'czesci': [
        {'nr': 1, 'osm': 'Brama Krakowska', 'wysokosc_m': 30, 'sciana': '#c98a5a', 'dach': '#e8e4da', 'opis': 'gotycka wieża bramna z cegły, barokowy hełm (biały/miedziany), zegar'},
    ]},
    {'id': 'nowy_ratusz', 'nazwa': 'Nowy Ratusz (Urząd Miasta, pl. Łokietka 1)', 'czesci': [
        {'nr': 1, 'osm': 'Urząd Miasta Lublin', 'pietra': 4.5, 'sciana': '#e3c77a', 'dach': '#a8483a', 'opis': 'klasycystyczny gmach, żółte ściany, czerwony dach czterospadowy'},
    ]},
    {'id': 'katedra', 'nazwa': 'Archikatedra i Wieża Trynitarska', 'czesci': [
        {'nr': 1, 'osm': 'Archikatedra Świętego Jana Chrzciciela i Świętego Jana Ewangelisty', 'wysokosc_m': 20, 'sciana': '#d8d4cc', 'dach': '#5f8f6a', 'opis': 'archikatedra: jasne ściany, zielony dach, portyk z kolumnami od zachodu'},
        {'nr': 2, 'osm': 'Wieża Trynitarska', 'wysokosc_m': 40, 'sciana': '#d9c49a', 'dach': '#b89c70', 'opis': 'Wieża Trynitarska (40 m): neogotycka, beżowa, z zegarem'},
    ]},
]

def proj(lon, lat):
    o = ORIGIN
    mLat = 111132.954 - 559.822 * math.cos(2 * o['lat0'] * math.pi / 180)
    mLon = 111412.84 * math.cos(o['lat0'] * math.pi / 180)
    return ((lon - o['lon']) * mLon * PX_M, (o['lat'] - lat) * mLat * PX_M)

def wysokosc(c):
    if 'wysokosc_m' in c and c['wysokosc_m'] > 15: return round(16 + (c['wysokosc_m'] - 15) * 1.6)
    if 'wysokosc_m' in c: return min(16, round(c['wysokosc_m'] / 3 * 8))
    return min(16, round(c.get('pietra', 2) * 8))

def wczytaj():
    nazwy = {c['osm'] for z in ZABYTKI for c in z['czesci']}
    znalezione, wszystkie = {}, []
    for line in gzip.open('data/lublin-osm.geojsonseq.gz', 'rt'):
        line = line.strip('\x1e\n ')
        if '"building' not in line: continue
        f = json.loads(line); g = f['geometry']; p = f['properties']
        if g['type'] not in ('Polygon', 'MultiPolygon') or 'building' not in p: continue
        ring = g['coordinates'][0] if g['type'] == 'Polygon' else g['coordinates'][0][0]
        lon = sum(q[0] for q in ring) / len(ring); lat = sum(q[1] for q in ring) / len(ring)
        if not (22.55 < lon < 22.59 and 51.24 < lat < 51.26): continue
        r = [proj(q[0], q[1]) for q in ring]
        lv = p.get('building:levels')
        wszystkie.append((r, float(lv) if lv and lv.replace('.', '').isdigit() else 2))
        if p.get('name') in nazwy and p['name'] not in znalezione: znalezione[p['name']] = r
    return znalezione, wszystkie

def maska(r, x0, y0, W, H):
    im = Image.new('1', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x - x0 - 0.5, y - y0 - 0.5) for x, y in r], fill=1)
    return np.array(im)

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def bryly(lista, x0, y0, W, H, glab, out, kolory=None):
    """Rysuje bryły (pierścień, wysokość, ściana, dach) w rzucie gry z buforem głębokości."""
    for r, h, sc, da in lista:
        ins = maska(r, x0, y0, W, H)
        ys, xs = np.where(ins)
        if not len(xs): continue
        cx = (xs.min() + xs.max()) / 2; pol = max(1, (xs.max() - xs.min()) / 2)
        for t in range(h, -1, -1):
            X = np.round(xs + 0.35 * t).astype(int); Y = ys + t
            ok = (X >= 0) & (Y >= 0) & (X < W) & (Y < H)
            X, Y, yy, xx = X[ok], Y[ok], ys[ok], xs[ok]
            key = yy + h
            lepsze = key >= glab[Y, X]
            X, Y, yy, xx, key = X[lepsze], Y[lepsze], yy[lepsze], xx[lepsze], key[lepsze]
            glab[Y, X] = key
            if t == 0: col = np.array(da)
            else:
                col = np.array(sc, float)
                if t % 8 == 0: col = col * 0.8
            c = np.tile(col, (len(X), 1))
            if t > 0:  # cieniowanie: lewa strona jaśniej, prawa ciemniej (światło z lewej-góry)
                f = (xx - cx) / pol
                c[f > 0.35] *= 0.82; c[f < -0.35] = np.minimum(255, c[f < -0.35] * 1.1)
            out[Y, X] = c

def main():
    os.makedirs(OUT, exist_ok=True)
    znalezione, wszystkie = wczytaj()
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    except OSError: font = ImageFont.load_default()
    for z in ZABYTKI:
        czesci = [(znalezione[c['osm']], wysokosc(c), hexrgb(c['sciana']), hexrgb(c['dach']), c) for c in z['czesci'] if c['osm'] in znalezione]
        if not czesci: print('brak w OSM:', z['id']); continue
        xs = [x for r, *_ in czesci for x, _ in r]; ys = [y for r, *_ in czesci for _, y in r]
        hmax = max(h for _, h, *_ in czesci)
        M = 12
        x0 = math.floor(min(xs)) - M; y0 = math.floor(min(ys)) - M
        W = math.ceil(max(xs) + 0.35 * hmax) - x0 + M; H = math.ceil(max(ys) + hmax) - y0 + M
        # 1) sam szkielet na magencie
        glab = np.full((H, W), -1e9); out = np.zeros((H, W, 3)); out[:] = (255, 0, 255)
        bryly([(r, h, sc, da) for r, h, sc, da, _ in czesci], x0, y0, W, H, glab, out)
        szk = Image.fromarray(out.astype(np.uint8))
        szk.resize((W * 4, H * 4), Image.NEAREST).save(f'{OUT}/{z["id"]}_szkielet_x4.png')
        szk.save(f'{OUT}/{z["id"]}_szkielet_1x.png')
        # 2) w scenie: sąsiednie budynki szare, numery części, bohaterka dla skali
        P = 90
        sx0, sy0, SW, SH = x0 - P, y0 - P, W + 2 * P, H + 2 * P
        glab = np.full((SH, SW), -1e9); sc_out = np.zeros((SH, SW, 3)); sc_out[:] = (126, 150, 104)
        swoje = {id(r) for r, *_ in czesci}
        sasiedzi = []
        for r, lv in wszystkie:
            if any(r is c[0] for c in czesci): continue
            if max(x for x, _ in r) < sx0 or min(x for x, _ in r) > sx0 + SW or max(y for _, y in r) < sy0 or min(y for _, y in r) > sy0 + SH: continue
            sasiedzi.append((r, min(16, round(lv * 8)), (196, 192, 186), (150, 146, 140)))
        bryly(sasiedzi + [(r, h, sc, da) for r, h, sc, da, _ in czesci], sx0, sy0, SW, SH, glab, sc_out)
        sc_im = Image.fromarray(sc_out.astype(np.uint8)).resize((SW * 2, SH * 2), Image.NEAREST)
        d = ImageDraw.Draw(sc_im)
        for r, h, sc, da, c in czesci:
            mx = sum(x for x, _ in r) / len(r) - sx0; my = sum(y for _, y in r) / len(r) - sy0
            for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)): d.text((mx * 2 + dx, my * 2 + dy), str(c['nr']), fill='white', font=font, anchor='mm')
            d.text((mx * 2, my * 2), str(c['nr']), fill='#1e1a24', font=font, anchor='mm')
        try:
            hero = Image.open('public/postacie/bohater_04.png').convert('RGBA').crop((64, 0, 128, 64))
            k = 31 / 56  # bohaterka w grze ma ok. 31 px obrazu wzrostu
            hero = hero.resize((round(64 * k * 2), round(64 * k * 2)), Image.NEAREST)
            sc_im.alpha_composite(hero, (int((x0 - sx0 - 30) * 2), int((y0 - sy0 + H - 20) * 2))) if sc_im.mode == 'RGBA' else None
            sc_im = sc_im.convert('RGBA'); sc_im.alpha_composite(hero, (int((x0 - sx0 - 30) * 2), int((y0 - sy0 + H - 30) * 2)))
        except OSError: pass
        d = ImageDraw.Draw(sc_im)
        d.text((10, 10), '↑ północ', fill='white', font=font)
        sc_im.save(f'{OUT}/{z["id"]}_w_scenie_x2.png')
        json.dump({'id': z['id'], 'nazwa': z['nazwa'], 'rog_px_obrazu': [x0, y0], 'rog_punkty_mapy': [x0 / 2, y0 / 2], 'rozmiar_1x': [W, H],
                   'czesci': [{'nr': c['nr'], 'osm': c['osm'], 'wysokosc_px': h, 'opis': c['opis']} for _, h, _, _, c in czesci]},
                  open(f'{OUT}/{z["id"]}.json', 'w'), ensure_ascii=False, indent=1)
        print(z['id'], W, H, [h for _, h, *_ in czesci])

main()
