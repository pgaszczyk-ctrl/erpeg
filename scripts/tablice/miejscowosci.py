#!/usr/bin/env python3
"""Towns for the city boards (tablice z mapką miasta, scripts/tablice/tablice.mjs).

Input (download first, not kept in the repo):
  cities500.json – GeoNames places ≥ 500 people:
                   https://raw.githubusercontent.com/lmfmaier/cities-json/master/cities500.json
Usage: python3 -I scripts/tablice/miejscowosci.py cities500.json
Writes data/tablice-miejscowosci.json: [name_pl, name_en, country, lat, lon, population] for Poland and its
neighbours, places of ≥ 1500 people (abroad ≥ 50 000). City districts (GeoNames lists Mokotów, Wola… on their own) are dropped:
a place inside a bigger kept place's built-up radius is left out.
"""
import json, math, sys

KRAJE = {'PL', 'DE', 'CZ', 'SK', 'UA', 'BY', 'LT', 'RU'}
MIN = 1500
# GeoNames uses English or plain-letter names for some places; the boards speak Polish (EN keeps the original).
PO_POLSKU = {
    'Warsaw': 'Warszawa', 'Bielsko-Biala': 'Bielsko-Biała', 'Lviv': 'Lwów', 'Lutsk': 'Łuck', 'Brest': 'Brześć',
    'Hrodna': 'Grodno', 'Vilnius': 'Wilno', 'Kaunas': 'Kowno', 'Kyiv': 'Kijów', 'Minsk': 'Mińsk', 'Prague': 'Praga',
    'Kaliningrad': 'Królewiec', 'Rivne': 'Równe', 'Kovel': 'Kowel', 'Volodymyr': 'Włodzimierz', 'Ternopil': 'Tarnopol',
    'Ivano-Frankivsk': 'Stanisławów', 'Uzhhorod': 'Użhorod', 'Kosice': 'Koszyce', 'Ostrava': 'Ostrawa',
    'Dresden': 'Drezno', 'Leipzig': 'Lipsk', 'Frankfurt (Oder)': 'Frankfurt nad Odrą', 'Bratislava': 'Bratysława',
    'Zhytomyr': 'Żytomierz', 'Pinsk': 'Pińsk', 'Baranovichi': 'Baranowicze',
}
def promien(pop): return 9.5 * math.sqrt(pop)
def dist(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    return math.hypot((b[1] - a[1]) * 111320 * math.cos(lat), (b[0] - a[0]) * 111132)

src = [c for c in json.load(open(sys.argv[1])) if c['country'] in KRAJE and int(c['pop'] or 0) >= (MIN if c['country'] == 'PL' else 50_000)]
src.sort(key=lambda c: -int(c['pop']))
kept, grid = [], {}
for c in src:
    lat, lon, pop = round(float(c['lat']), 4), round(float(c['lon']), 4), int(c['pop'])
    cy, cx = int(lat), int(lon)
    inside = any(dist((lat, lon), (k[3], k[4])) < promien(k[5]) * 0.8
                 for dy in (-1, 0, 1) for dx in (-1, 0, 1) for k in grid.get((cy + dy, cx + dx), []) if k[5] >= 50_000)
    if inside: continue
    en = c['name']
    row = [PO_POLSKU.get(en, en), en, c['country'], lat, lon, pop]
    kept.append(row); grid.setdefault((cy, cx), []).append(row)
json.dump(kept, open('data/tablice-miejscowosci.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(src), '→', len(kept), 'places')
