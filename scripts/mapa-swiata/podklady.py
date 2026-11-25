"""Templates for the artist's world map plates (order 51-P001): Web Mercator land outlines from Natural Earth 10m
with a lat/lon grid every 10° (5° on continents), plus an outline-only transparent layer and a JSON with each
frame's exact corners. Run: python3 -I scripts/mapa-swiata/podklady.py <folder with ne_10m_*.geojson> <out folder>
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
KADRY = {  # name: (lon0, lat0, lon1, lat1)
    'swiat': (-180, -85.0511, 180, 85.0511),
    'europa': (-25, 33, 46, 72),
    'azja': (25, -11, 150, 77),
    'afryka': (-20, -37, 55, 38),
    'ameryka_polnocna': (-170, 6, -50, 76),
    'ameryka_poludniowa': (-84, -57, -32, 14),
    'australia_oceania': (110, -48, 180, -5),
}
DLUGI = 4096

def mx(lon): return (lon + 180) / 360
def my(lat):
    lat = max(-85.0511, min(85.0511, lat))
    return (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2

def wczytaj(p):
    d = json.load(open(p)); w = []
    for f in d['features']:
        g = f['geometry']
        if not g: continue
        cz = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        w += cz
    return w

lad = wczytaj(f'{src}/ne_10m_land.geojson') + wczytaj(f'{src}/ne_10m_minor_islands.geojson')
jez = [p for p in wczytaj(f'{src}/ne_10m_lakes.geojson')]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 26)
except Exception: font = ImageFont.load_default()
opis = {}
for nazwa, (lon0, lat0, lon1, lat1) in KADRY.items():
    x0, x1, y0, y1 = mx(lon0), mx(lon1), my(lat1), my(lat0)
    sk = DLUGI / max(x1 - x0, y1 - y0)
    W, H = round((x1 - x0) * sk), round((y1 - y0) * sk)
    P = lambda lon, lat: ((mx(lon) - x0) * sk, (my(lat) - y0) * sk)
    pod = Image.new('RGB', (W, H), (250, 250, 247)); d = ImageDraw.Draw(pod)
    obr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); do = ImageDraw.Draw(obr)
    for kolor, polys in (((214, 210, 196), lad), ((250, 250, 247), jez)):
        for poly in polys:
            for i, ring in enumerate(poly):
                pts = [P(a, b) for a, b in ring]
                if len(pts) < 3: continue
                xs = [p[0] for p in pts]
                if max(xs) < -50 or min(xs) > W + 50: continue
                d.polygon(pts, fill=kolor if i == 0 else (250, 250, 247))
                do.line(pts + [pts[0]], fill=(20, 20, 20, 255), width=3)
                d.line(pts + [pts[0]], fill=(20, 20, 20), width=3)
    krok = 10 if nazwa == 'swiat' else 5
    for lon in range(-180, 181, krok):
        if lon0 <= lon <= lon1:
            a = P(lon, lat0); b = P(lon, lat1)
            d.line([a, b], fill=(120, 170, 220), width=1 if lon % 10 else 2)
            if lon % 10 == 0: d.text((a[0] + 4, 6), f'{lon}°', fill=(40, 90, 160), font=font)
    for lat in range(-80, 81, krok):
        if lat0 <= lat <= lat1:
            a = P(lon0, lat); b = P(lon1, lat)
            d.line([a, b], fill=(120, 170, 220), width=1 if lat % 10 else 2)
            if lat % 10 == 0: d.text((6, a[1] + 4), f'{lat}°', fill=(40, 90, 160), font=font)
    pod.save(f'{out}/podklad_{nazwa}.png', optimize=True)
    obr.save(f'{out}/kontur_{nazwa}.png', optimize=True)
    opis[nazwa] = {'plik_rozmiar_px': [W, H], 'lewy_gorny_lon_lat': [lon0, lat1], 'prawy_dolny_lon_lat': [lon1, lat0], 'rzut': 'Web Mercator (EPSG:3857)'}
    print(nazwa, W, H)
json.dump(opis, open(f'{out}/kadry.json', 'w'), indent=2, ensure_ascii=False)
