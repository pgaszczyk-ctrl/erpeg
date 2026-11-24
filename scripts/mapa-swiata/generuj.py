"""World map tiles for the loading zoom (owner, 24 Nov 2026: „zoom nie na wielkie piksele, tylko na orientacyjny
teren, w którym jesteśmy; jeśli sam wygenerujesz mapę – super”).

Source: Natural Earth II (public domain) – NE2_HR_LC_SR_W_DR.tif, 21600×10800 px, plate carrée, painted land cover +
shaded relief + rivers/lakes; plus Natural Earth 10m vectors for a crisp coastline and country borders.
Output: Web Mercator tiles 512 px, zooms 0..MAXZ, WebP, in public/mapa-swiata/<z>/<x>_<y>.webp, plus kafle.json
(which tiles exist – tiles with only open sea are not written; the game fills them with the sea colour).

Download (≈ 330 MB + 19 MB):
  curl -O https://naturalearth.s3.amazonaws.com/10m_raster/NE2_HR_LC_SR_W_DR.zip && unzip NE2_HR_LC_SR_W_DR.zip
  for f in ne_10m_land ne_10m_minor_islands ne_10m_admin_0_boundary_lines_land; do
    curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/$f.geojson; done
Run:  python3 -I scripts/mapa-swiata/generuj.py <folder with the files> public/mapa-swiata [maxz]
"""
import json, math, os, sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
T = 512            # tile size
SS = 2             # supersampling of vector lines
JAKOSC = 74        # WebP quality
POLUDNIE = -60.0   # tiles wholly south of this (Antarctica) are skipped from zoom 3 on
# Toning towards the game's parchment (a share of this colour is mixed in) and the sea colour of missing tiles.
PERGAMIN = np.array([233, 220, 184], np.float32)
TONOWANIE = 0.14
MORZE = np.array([150, 182, 190], np.float32)
BRZEG = (58, 44, 30)        # coastline ink
GRANICA = (120, 52, 36)     # country borders

SRC = None
LAD = []        # [(minx, miny, maxx, maxy, [rings in lon/lat])]
GRANICE = []


def merc_y_do_lat(yn):
    return np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * yn))))


def lon_lat(z, X, Y):
    n = 2 ** z
    return X / n * 360 - 180, float(merc_y_do_lat(Y / n))


def wagi_cr(t):
    """Catmull-Rom weights for fractional offsets t (array) – 4 taps at -1, 0, 1, 2."""
    t2, t3 = t * t, t * t * t
    return np.stack([(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2], -1)


def probkuj(z, x, y):
    """The NE2 picture resampled into one Mercator tile (separable: x depends only on lon, y only on lat)."""
    H, W = SRC.shape[:2]
    n = 2 ** z * T
    px = (np.arange(T) + 0.5 + x * T) / n          # 0..1 across the world
    py = (np.arange(T) + 0.5 + y * T) / n
    sx = px * W - 0.5
    sy = (90 - merc_y_do_lat(py)) / 180 * H - 0.5
    # Shrinking (low zooms): average the source over the output pixel first, so it never sparkles.
    krokx = W / n
    kroky = np.abs(np.gradient(sy)) if T > 1 else np.array([1.0])
    if krokx > 1.5 or kroky.max() > 1.5:
        return probkuj_srednia(sx, sy, krokx, kroky)
    ix = np.floor(sx).astype(int); fx = sx - ix
    iy = np.floor(sy).astype(int); fy = sy - iy
    wx, wy = wagi_cr(fx), wagi_cr(fy)
    cols = (ix[:, None] + np.arange(-1, 3)[None, :]) % W
    rows = np.clip(iy[:, None] + np.arange(-1, 3)[None, :], 0, H - 1)
    r0, r1 = rows.min(), rows.max()
    c = np.unique(cols)
    blok = SRC[r0:r1 + 1][:, c].astype(np.float32)          # only what this tile needs
    ci = np.searchsorted(c, cols)
    # rows first
    a = np.einsum('ok,okwc->owc', wy, blok[rows - r0])        # (T, len(c), 3)
    out = np.einsum('xk,yxkc->yxc', wx, a[:, ci])            # (T, T, 3)
    return np.clip(out, 0, 255)


def probkuj_srednia(sx, sy, krokx, kroky):
    H, W = SRC.shape[:2]
    out = np.empty((T, T, 3), np.float32)
    x0 = np.floor(sx - krokx / 2).astype(int); x1 = np.maximum(x0 + 1, np.floor(sx + krokx / 2).astype(int))
    y0 = np.clip(np.floor(sy - kroky / 2).astype(int), 0, H - 1)
    y1 = np.clip(np.maximum(y0 + 1, np.floor(sy + kroky / 2).astype(int)), 1, H)
    # Column sums via a cumulative sum over each needed row band.
    for j in range(T):
        pas = SRC[y0[j]:y1[j]].astype(np.float32).mean(0)       # (W, 3)
        cs = np.concatenate([np.zeros((1, 3), np.float32), np.cumsum(np.concatenate([pas, pas[:max(1, int(krokx) + 2)]]), 0)])
        a, b = x0 % W, x0 % W + (x1 - x0)
        out[j] = (cs[b] - cs[a]) / (b - a)[:, None]
    return out


def wczytaj_geo(plik, typy):
    with open(plik) as f:
        d = json.load(f)
    wynik = []
    for ft in d['features']:
        g = ft['geometry']
        if not g or g['type'] not in typy:
            continue
        czesci = g['coordinates'] if g['type'].startswith('Multi') else [g['coordinates']]
        for cz in czesci:
            rings = cz if g['type'].endswith('Polygon') else [cz]
            pts = [np.asarray(r, np.float64) for r in rings]
            allp = np.concatenate(pts)
            wynik.append((allp[:, 0].min(), allp[:, 1].min(), allp[:, 0].max(), allp[:, 1].max(), pts))
    return wynik


def do_px(z, x, y, r):
    n = 2 ** z
    X = ((r[:, 0] + 180) / 360 * n - x) * T * SS
    lat = np.clip(r[:, 1], -85.05, 85.05)
    Y = ((1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n - y) * T * SS
    return list(zip(X.tolist(), Y.tolist()))


def maski(z, x, y):
    """Land mask (with an antialiased coastline ring) and border lines for one tile, both at tile size."""
    lon0, lat1 = lon_lat(z, x, y); lon1, lat0 = lon_lat(z, x + 1, y + 1)
    m = 0.02 * (lon1 - lon0)
    lad = Image.new('L', (T * SS, T * SS), 0)
    dl = ImageDraw.Draw(lad)
    brzeg = Image.new('L', (T * SS, T * SS), 0)
    db = ImageDraw.Draw(brzeg)
    gr = Image.new('L', (T * SS, T * SS), 0)
    dg = ImageDraw.Draw(gr)
    szer_b = max(1, round((0.6 + 0.25 * max(0, z - 2)) * SS))
    szer_g = max(1, round((0.5 + 0.3 * max(0, z - 2)) * SS))
    jest = False
    for (a, b, c, d, rings) in LAD:
        if c < lon0 - m or a > lon1 + m or d < lat0 - m or b > lat1 + m:
            continue
        jest = True
        for i, r in enumerate(rings):
            p = do_px(z, x, y, r)
            if len(p) > 2:
                dl.polygon(p, fill=255 if i == 0 else 0)
                db.line(p + [p[0]], fill=255, width=szer_b)
    if z >= 3:
        for (a, b, c, d, rings) in GRANICE:
            if c < lon0 - m or a > lon1 + m or d < lat0 - m or b > lat1 + m:
                continue
            for r in rings:
                dg.line(do_px(z, x, y, r), fill=255, width=szer_g, joint='curve')
    zm = lambda im: np.asarray(im.resize((T, T), Image.BOX), np.float32) / 255
    return jest, zm(lad), zm(brzeg), zm(gr)


def kafel(arg):
    z, x, y, cel = arg
    lon0, lat1 = lon_lat(z, x, y)
    if z >= 3 and lat1 < POLUDNIE:
        return None
    jest, lad, brzeg, gr = maski(z, x, y)
    if not jest:
        return None
    im = probkuj(z, x, y)
    im = im * (1 - TONOWANIE) + PERGAMIN * TONOWANIE
    # Open sea is one flat colour everywhere (NE2 shades it by depth; tiles without land are not written and
    # the game fills them with MORZE, so this keeps the seams invisible).
    im = im * lad[..., None] + MORZE * (1 - lad[..., None])
    a = brzeg[..., None] * (0.55 if z >= 3 else 0.35)
    im = im * (1 - a) + np.array(BRZEG, np.float32) * a
    a = gr[..., None] * (0.55 if z >= 5 else 0.42) * lad[..., None]
    im = im * (1 - a) + np.array(GRANICA, np.float32) * a
    os.makedirs(f'{cel}/{z}', exist_ok=True)
    Image.fromarray(np.clip(im + 0.5, 0, 255).astype(np.uint8)).save(f'{cel}/{z}/{x}_{y}.webp', quality=JAKOSC, method=6)
    return (z, x, y)


def init(zrodlo):
    global SRC, LAD, GRANICE
    SRC = np.asarray(Image.open(f'{zrodlo}/NE2_HR_LC_SR_W_DR.tif').convert('RGB'))
    LAD = wczytaj_geo(f'{zrodlo}/ne_10m_land.geojson', {'Polygon', 'MultiPolygon'}) + \
        wczytaj_geo(f'{zrodlo}/ne_10m_minor_islands.geojson', {'Polygon', 'MultiPolygon'})
    GRANICE = wczytaj_geo(f'{zrodlo}/ne_10m_admin_0_boundary_lines_land.geojson', {'LineString', 'MultiLineString'})


def main():
    zrodlo, cel = sys.argv[1], sys.argv[2]
    maxz = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    tylko = sys.argv[4] if len(sys.argv) > 4 else None   # "z,x0,y0,x1,y1" – a test window
    zad = []
    for z in range(maxz + 1):
        n = 2 ** z
        for x in range(n):
            for y in range(n):
                if tylko:
                    tz, a, b, c, d = map(int, tylko.split(','))
                    s = 2 ** (z - tz) if z >= tz else None
                    if s is None or not (a * s <= x < (c + 1) * s and b * s <= y < (d + 1) * s):
                        continue
                zad.append((z, x, y, cel))
    print(len(zad), 'tiles to try', flush=True)
    with Pool(os.cpu_count(), initializer=init, initargs=(zrodlo,)) as p:
        gotowe = [k for k in p.imap_unordered(kafel, zad, chunksize=8) if k]
    spis = {}
    for z, x, y in gotowe:
        spis.setdefault(str(z), []).append(f'{x}_{y}')
    for v in spis.values():
        v.sort()
    stary = {}
    if tylko and os.path.exists(f'{cel}/kafle.json'):
        stary = json.load(open(f'{cel}/kafle.json')).get('kafle', {})
    for k, v in spis.items():
        stary[k] = sorted(set(stary.get(k, [])) | set(v))
    sea = MORZE.round().astype(int).tolist()
    json.dump({'rozmiar': T, 'maxz': maxz, 'morze': '#%02x%02x%02x' % tuple(sea), 'kafle': stary}, open(f'{cel}/kafle.json', 'w'), separators=(',', ':'))
    print('written', len(gotowe))


if __name__ == '__main__':
    main()
