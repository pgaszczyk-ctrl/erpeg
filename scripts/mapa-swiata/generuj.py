"""World map tiles for the loading zoom, drawn like the loading poster: a fairy-tale steampunk map, not a
satellite picture (owner, 24 Nov 2026: „zoom nie na wielkie piksele, tylko na orientacyjny teren”, then „ma to
wciąż być narysowane bajkowo, steampunkowo”, „bajkowo, góry, lasy, jak to co było wcześniej, żadnych granic”).

Look: the sea is the parchment itself with a turquoise watercolour halo hugging every coast and a thick ink
coastline; land in a few flat ochre / olive / mustard washes (from Natural Earth II's land cover, softened), soft
stepped hill shading from real heights, clumps of painted conifers, rows of snowy mountains where the land is
really high and rough, ochre hill bumps, dune arcs in deserts, turquoise rivers and lakes. No borders, no names.

Sources (all public domain / open):
  NE2_HR_LC_SR_W_DR.tif  – https://naturalearth.s3.amazonaws.com/10m_raster/NE2_HR_LC_SR_W_DR.zip (330 MB)
  ne_10m_land, ne_10m_minor_islands, ne_10m_lakes, ne_10m_rivers_lake_centerlines, ne_10m_admin_0_boundary_lines_land
      .geojson – https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/<name>.geojson
  wysokosc_z5.npy        – Terrarium heights, made by scripts/mapa-swiata/wysokosci.py
Output: Web Mercator tiles 512 px, zooms 0..MAXZ, WebP, public/mapa-swiata/<z>/<x>_<y>.webp + kafle.json (tiles
with only open parchment sea are not written; the game fills them with `morze`).
Run:  python3 -I scripts/mapa-swiata/generuj.py <folder with the sources> public/mapa-swiata [maxz] [z,x0,y0,x1,y1]
"""
import json, math, os, sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None
T = 512            # tile size
M = 40             # margin drawn around each tile (ripples, blurs, rims stay seamless)
SS = 2             # supersampling of vector shapes
JAKOSC = 80        # WebP quality
POLUDNIE = -60.0   # tiles wholly south of this (Antarctica) are skipped from zoom 3 on

MORZE = np.array([232, 211, 166], np.float32)       # the sea is the parchment itself (missing tiles = this)
HALO = np.array([92, 174, 172], np.float32)           # turquoise watercolour along the coasts
TUSZ = np.array([30, 22, 16], np.float32)             # ink
# Washes in the loading poster's colours: ochre, olive, mustard greens, snowy white.
FARBY = {
    'las_gesty': (138, 140, 56), 'las': (156, 150, 60), 'ziel': (178, 164, 66), 'laka': (196, 170, 78),
    'step': (212, 166, 86), 'piasek': (222, 162, 82), 'pustynia': (218, 146, 70), 'skala': (176, 132, 90),
    'tundra': (204, 186, 132), 'snieg': (242, 238, 226), 'woda': (92, 174, 172),
}

SRC = None
LAD = []        # [(minx, miny, maxx, maxy, [rings in lon/lat], scalerank)]
GRANICE = []
RZEKI = []
JEZIORA = []
WYS = []        # elevation pyramid (m, Web Mercator), WYS[0] = 8192² from Terrarium zoom 5
WODA = np.array([96, 176, 174], np.float32)          # rivers and lakes
DRZEWO = [(52, 88, 50), (70, 108, 58), (40, 74, 46)]  # crown shadow / crown / dark



def merc_y_do_lat(yn):
    return np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * yn))))


def lon_lat(z, X, Y):
    n = 2 ** z
    return X / n * 360 - 180, float(merc_y_do_lat(np.clip(Y / n, 0, 1)))


def probkuj(z, X0, Y0, W, H):
    """The guide picture resampled into a Mercator window (global px at zoom z), smooth (bilinear / box average)."""
    SH, SW = SRC.shape[:2]
    n = 2 ** z * T
    px = (np.arange(W) + 0.5 + X0) / n
    py = np.clip((np.arange(H) + 0.5 + Y0) / n, 0, 1)
    sx = px * SW - 0.5
    sy = (90 - merc_y_do_lat(py)) / 180 * SH - 0.5
    krokx = SW / n
    kroky = np.abs(np.gradient(sy))
    if krokx > 1.2 or kroky.max() > 1.2:   # shrinking: average the source over the output pixel
        out = np.empty((H, W, 3), np.float32)
        x0 = np.floor(sx - krokx / 2).astype(int); x1 = np.maximum(x0 + 1, np.floor(sx + krokx / 2).astype(int))
        y0 = np.clip(np.floor(sy - kroky / 2).astype(int), 0, SH - 1)
        y1 = np.clip(np.maximum(y0 + 1, np.floor(sy + kroky / 2).astype(int)), 1, SH)
        cache = {}
        for j in range(H):
            k = (y0[j], y1[j])
            if k not in cache:
                pas = SRC[k[0]:k[1]].astype(np.float32).mean(0)
                cache = {k: np.concatenate([np.zeros((1, 3), np.float32), np.cumsum(np.concatenate([pas, pas, pas]), 0)])}
            cs = cache[k]
            a = x0 % SW + SW; b = a + (x1 - x0)
            out[j] = (cs[b] - cs[a]) / (b - a)[:, None]
        return out
    ix = np.floor(sx).astype(int); fx = (sx - ix)[None, :, None]
    iy = np.floor(sy).astype(int); fy = (sy - iy)[:, None, None]
    r0, r1 = np.clip(iy, 0, SH - 1), np.clip(iy + 1, 0, SH - 1)
    c0, c1 = ix % SW, (ix + 1) % SW
    g = lambda r, c: SRC[r][:, c].astype(np.float32)
    return (g(r0, c0) * (1 - fx) + g(r0, c1) * fx) * (1 - fy) + (g(r1, c0) * (1 - fx) + g(r1, c1) * fx) * fy


def wczytaj_geo(plik, typy, maks_rank=99):
    with open(plik) as f:
        d = json.load(f)
    wynik = []
    for ft in d['features']:
        g = ft['geometry']
        if not g or g['type'] not in typy:
            continue
        rank = float((ft.get('properties') or {}).get('scalerank') or 0)
        if rank > maks_rank:
            continue
        czesci = g['coordinates'] if g['type'].startswith('Multi') else [g['coordinates']]
        for cz in czesci:
            rings = cz if g['type'].endswith('Polygon') else [cz]
            pts = [np.asarray(r, np.float64) for r in rings]
            allp = np.concatenate(pts)
            wynik.append((allp[:, 0].min(), allp[:, 1].min(), allp[:, 0].max(), allp[:, 1].max(), pts, rank))
    return wynik


def glob_px(z, r):
    """lon/lat → global px at zoom z."""
    n = 2 ** z * T
    X = (r[:, 0] + 180) / 360 * n
    lat = np.clip(r[:, 1], -85.05, 85.05)
    Y = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n
    return X, Y


def okno_geo(z, X0, Y0, W, H):
    lon0, lat1 = lon_lat(z, X0 / T, Y0 / T)
    lon1, lat0 = lon_lat(z, (X0 + W) / T, (Y0 + H) / T)
    return lon0, lat0, lon1, lat1


def maska_ladu(z, X0, Y0, W, H):
    """Land mask at SS× (0/255), or None when there is no land in the window."""
    lon0, lat0, lon1, lat1 = okno_geo(z, X0, Y0, W, H)
    m = 0.05 * (lon1 - lon0)
    im = Image.new('L', (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    jest = False
    for (a, b, c, e, rings, _r) in LAD:
        if c < lon0 - m or a > lon1 + m or e < lat0 - m or b > lat1 + m:
            continue
        for i, r in enumerate(rings):
            X, Y = glob_px(z, r)
            p = list(zip(((X - X0) * SS).tolist(), ((Y - Y0) * SS).tolist()))
            if len(p) > 2:
                d.polygon(p, fill=255 if i == 0 else 0)
                jest = True
    if not jest or not im.getbbox():
        return None
    return im


def granice(z, X0, Y0, W, H):
    """Dashed border lines at SS×, the dash pattern measured along each line, so it continues across tiles."""
    im = Image.new('L', (W * SS, H * SS), 0)
    if z < 3:
        return im
    d = ImageDraw.Draw(im)
    lon0, lat0, lon1, lat1 = okno_geo(z, X0, Y0, W, H)
    m = 0.05 * (lon1 - lon0)
    kreska, przerwa = 7.0 + z * 0.6, 4.0 + z * 0.3
    szer = max(1, round((0.7 + 0.22 * z) * SS))
    for (a, b, c, e, rings, _r) in GRANICE:
        if c < lon0 - m or a > lon1 + m or e < lat0 - m or b > lat1 + m:
            continue
        for r in rings:
            X, Y = glob_px(z, r)
            s = 0.0
            for i in range(len(X) - 1):
                x0, y0, x1, y1 = X[i], Y[i], X[i + 1], Y[i + 1]
                L = math.hypot(x1 - x0, y1 - y0)
                if L == 0:
                    continue
                t = 0.0
                while t < L:
                    faza = (s + t) % (kreska + przerwa)
                    if faza < kreska:
                        u = min(L, t + (kreska - faza))
                        ax, ay = x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L
                        bx, by = x0 + (x1 - x0) * u / L, y0 + (y1 - y0) * u / L
                        d.line([((ax - X0) * SS, (ay - Y0) * SS), ((bx - X0) * SS, (by - Y0) * SS)], fill=255, width=szer)
                        t = u
                    else:
                        t += (kreska + przerwa) - faza
                s += L
    return im


def rozmyj(a, r):
    if r <= 0:
        return a
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8) if a.dtype != np.uint8 else a)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32)


def _pudelko(a, r, os_):
    """Box blur of radius r along one axis (edges repeated)."""
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[os_] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=os_, dtype=np.float64)
    n = a.shape[os_]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=os_)
    lo = np.take(c, np.arange(0, n), axis=os_)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def rozmyj_f(a, r):
    """Near-Gaussian blur of a float field: three box passes per axis."""
    a = a.astype(np.float32)
    if r <= 0.3:
        return a
    k = max(1, int(round(r * 0.8)))
    for _ in range(3):
        a = _pudelko(_pudelko(a, k, 0), k, 1)
    return a


def _hash(a, b, c=0):
    h = (a * 374761393 + b * 668265263 + c * 2147483647) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)) / 4294967296.0


def szum(lon, lat, skala):
    """Smooth value noise in lon/lat (same everywhere at every zoom), 0..1, on 2D arrays."""
    u, v = lon / skala, lat / skala
    i, j = np.floor(u).astype(np.int64), np.floor(v).astype(np.int64)
    fu, fv = u - i, v - j
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    def h(a, b):
        x = (a * 374761393 + b * 668265263) & 0xffffffff
        x = ((x ^ (x >> 13)) * 1274126177) & 0xffffffff
        return ((x ^ (x >> 16)) & 0xffff) / 65535.0
    return (h(i, j) * (1 - fu) + h(i + 1, j) * fu) * (1 - fv) + (h(i, j + 1) * (1 - fu) + h(i + 1, j + 1) * fu) * fv


def wysokosc(z, X0, Y0, W, H):
    """Elevation (m) in a window of global px at zoom z, bilinear from the pyramid level nearest in size."""
    n = 2 ** z * T
    poz = 0
    while poz + 1 < len(WYS) and WYS[poz + 1].shape[0] >= n:
        poz += 1
    E = WYS[poz]
    S = E.shape[0]
    gx = (np.arange(W) + 0.5 + X0) / n * S - 0.5
    gy = np.clip((np.arange(H) + 0.5 + Y0) / n * S - 0.5, 0, S - 1.001)
    ix = np.floor(gx).astype(int); fx = (gx - ix)[None, :]
    iy = np.floor(gy).astype(int); fy = (gy - iy)[:, None]
    c0, c1 = ix % S, (ix + 1) % S
    r0, r1 = iy, np.minimum(iy + 1, S - 1)
    g = lambda r, c: E[r][:, c]
    return (g(r0, c0) * (1 - fx) + g(r0, c1) * fx) * (1 - fy) + (g(r1, c0) * (1 - fx) + g(r1, c1) * fx) * fy


def woda_wektory(z, X0, Y0, W, H):
    """Lakes (filled) and rivers (lines) at SS×: returns (lakes L-image, rivers L-image, river-banks L-image)."""
    lon0, lat0, lon1, lat1 = okno_geo(z, X0, Y0, W, H)
    m = 0.05 * (lon1 - lon0)
    jez = Image.new('L', (W * SS, H * SS), 0)
    rz = Image.new('L', (W * SS, H * SS), 0)
    dj, dr = ImageDraw.Draw(jez), ImageDraw.Draw(rz)
    for (a, b, c, e, rings, rank) in JEZIORA:
        if rank > z + 3 or c < lon0 - m or a > lon1 + m or e < lat0 - m or b > lat1 + m:
            continue
        for i, r in enumerate(rings):
            X, Y = glob_px(z, r)
            p = list(zip(((X - X0) * SS).tolist(), ((Y - Y0) * SS).tolist()))
            if len(p) > 2:
                dj.polygon(p, fill=255 if i == 0 else 0)
    for (a, b, c, e, rings, rank) in RZEKI:
        if rank > z + 2 or c < lon0 - m or a > lon1 + m or e < lat0 - m or b > lat1 + m:
            continue
        szer = max(1, round((0.5 + 0.32 * z) * (1.25 - rank / 12) * SS))
        for r in rings:
            X, Y = glob_px(z, r)
            dr.line(list(zip(((X - X0) * SS).tolist(), ((Y - Y0) * SS).tolist())), fill=255, width=szer, joint='curve')
    return jez, rz


def znaczki(z, X0, Y0, W, H, klasy, las, gory, snieg, lad):
    """Little drawn symbols on a jittered grid in global px: tree clusters in forests, mountains with shaded sides
    and snow caps, hills, dune arcs in deserts. Returned as an RGBA overlay (W×H)."""
    im = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    if z < 3:
        return im
    d = ImageDraw.Draw(im)
    rozm = {3: 0.8, 4: 0.9, 5: 1.0, 6: 1.25, 7: 1.5}.get(z, 1.5)
    C = 19 * rozm
    lista = []
    for gy in range(int((Y0) // C) - 1, int((Y0 + H) // C) + 2):
        for gx in range(int((X0) // C) - 1, int((X0 + W) // C) + 2):
            r1, r2, r3 = _hash(gx, gy, z * 7 + 1), _hash(gx, gy, z * 7 + 2), _hash(gx, gy, z * 7 + 3)
            px = gx * C + r1 * C * 0.8 - X0
            py = gy * C + r2 * C * 0.8 - Y0
            i, j = int(py), int(px)
            if not (0 <= i < H and 0 <= j < W) or lad[i, j] < 0.99:
                continue
            k = klasy[i, j]
            if k == 'woda':
                continue
            g = gory[i, j]
            if g > 0.5 and r3 < 0.45 + 0.55 * g:
                lista.append((py, 'gora', px, py, rozm * (0.85 + 0.45 * r3) * (1.2 if g > 0.85 else 1), bool(snieg[i, j]) or g > 0.75))
            elif g > 0.3 and r3 < 0.45:
                lista.append((py, 'pagorek', px, py, rozm * (0.8 + 0.3 * r3), False))
            elif las[i, j] and r3 < 0.62:
                lista.append((py, 'drzewa', px, py, rozm, r3))
            elif k in ('piasek', 'pustynia') and r3 < 0.18:
                lista.append((py, 'wydma', px, py, rozm, False))
            elif k in ('laka', 'ziel') and r3 < 0.06:
                lista.append((py, 'drzewa', px, py, rozm * 0.8, 0.95))
    lista.sort(key=lambda t: t[0])
    S = SS
    ink = (52, 36, 24, 235)
    for _, rodzaj, x, y, s, extra in lista:
        X, Y = x * S, y * S
        if rodzaj == 'drzewa':
            # a clump of painted conifers like on the poster: two-tier triangles, lit from the left
            ile = 2 + int(extra * 5) if extra < 0.9 else 1
            for t in sorted(range(ile), key=lambda t: _hash(int(y * 5), t, 17)):
                ox = (_hash(int(x * 7), t, 11) - 0.5) * 11 * S * s
                oy = (_hash(int(y * 7), t, 13) - 0.5) * 6 * S * s
                h = (8.5 + _hash(int(x), int(y), t) * 3.5) * S * s
                w = h * 0.62
                cx, cy = X + ox, Y + oy
                d.line([(cx, cy), (cx, cy + h * 0.16)], fill=(86, 58, 34, 255), width=max(1, int(S * 1.0)))
                for (b0, b1, ww) in ((0.0, 0.66, 1.0), (0.34, 1.0, 0.72)):
                    yb, yt = cy - h * b0, cy - h * b1
                    L, R, Tp = (cx - w / 2 * ww, yb), (cx + w / 2 * ww, yb), (cx, yt)
                    d.polygon([L, Tp, R], fill=(34, 84, 58, 255), outline=(18, 36, 24, 255))
                    d.polygon([L, Tp, (cx, yb)], fill=(62, 120, 78, 255))
                    d.line([L, Tp, R], fill=(18, 36, 24, 255), width=max(1, int(S * 0.8)))
        elif rodzaj == 'gora':
            w, h = 11 * S * s, 12.5 * S * s
            top = (X + w * 0.06, Y - h)
            L, R, B = (X - w, Y), (X + w, Y), (X + w * 0.12, Y)
            d.polygon([L, top, B], fill=(206, 168, 118, 255))
            d.polygon([B, top, R], fill=(132, 96, 70, 255))
            cap = 0.45 if extra else 0.22
            pl = (top[0] + (L[0] - top[0]) * cap, top[1] + (L[1] - top[1]) * cap)
            pr = (top[0] + (R[0] - top[0]) * cap, top[1] + (R[1] - top[1]) * cap)
            pm = (top[0] + (B[0] - top[0]) * cap * 0.75, top[1] + (B[1] - top[1]) * cap * 1.15)
            d.polygon([pl, top, pm], fill=(252, 250, 242, 255) if extra else (226, 196, 150, 255))
            d.polygon([pm, top, pr], fill=(196, 206, 220, 255) if extra else (160, 120, 86, 255))
            d.line([L, top, R], fill=(30, 22, 16, 240), width=max(1, int(S * 1.2)), joint='curve')
            d.line([top, (B[0] - w * 0.05, B[1] - h * 0.3)], fill=(70, 50, 36, 200), width=max(1, int(S * 0.8)))
        elif rodzaj == 'pagorek':
            w, h = 7 * S * s, 4 * S * s
            d.chord([X - w, Y - h, X + w, Y + h], 180, 360, fill=(150, 150, 96, 150))
            d.arc([X - w, Y - h, X + w, Y + h], 190, 350, fill=ink, width=max(1, int(S * 0.9)))
        elif rodzaj == 'wydma':
            w, h = 6 * S * s, 3 * S * s
            d.arc([X - w, Y - h, X + w, Y + h], 200, 340, fill=(150, 108, 60, 220), width=max(1, int(S * 0.9)))
            d.arc([X - w * 0.5, Y, X + w * 1.3, Y + h * 1.6], 200, 330, fill=(150, 108, 60, 180), width=max(1, int(S * 0.8)))
    return im


def malowanie(src, z):
    """Wash index per pixel from the guide colours (greenness, warmth, lightness)."""
    R, G, B = src[..., 0], src[..., 1], src[..., 2]
    L = 0.3 * R + 0.59 * G + 0.11 * B
    g = G - (R + B) / 2
    w = R - B
    k = np.full(R.shape, 'step', dtype=object)
    k[g > 8] = 'laka'
    k[g > 17] = 'ziel'
    k[g > 27] = 'las'
    k[g > 37] = 'las_gesty'
    k[(g <= 8) & (w > 20) & (L > 212)] = 'piasek'
    k[(g <= 8) & (w > 34) & (L > 205) & (L < 232)] = 'pustynia'
    k[(L < 170) & (g < 14)] = 'skala'
    k[(g > 3) & (g <= 12) & (w < 10) & (L > 200)] = 'tundra'
    k[(L > 222) & (w < 6)] = 'snieg'
    k[(B > R + 22) & (B > G + 2)] = 'woda'
    return k


def kafel(arg):
    z, x, y, cel = arg
    lon0, lat1 = lon_lat(z, x, y)
    if z >= 3 and lat1 < POLUDNIE:
        return None
    X0, Y0, W, H = x * T - M, y * T - M, T + 2 * M, T + 2 * M
    lad_ss = maska_ladu(z, X0, Y0, W, H)
    if lad_ss is None:
        return None
    sk = 2 ** max(0, z - 4)            # how much the guide is enlarged here
    lad = np.asarray(lad_ss.resize((W, H), Image.BOX), np.float32) / 255
    n = 2 ** z * T
    lon = ((np.arange(W) + 0.5 + X0) / n * 360 - 180)[None, :].repeat(H, 0)
    lat = merc_y_do_lat(np.clip((np.arange(H) + 0.5 + Y0) / n, 0, 1))[:, None].repeat(W, 1)

    # 1. Washes: the guide softened and sorted into a few paint colours, laid flat, darker rims between them.
    src = probkuj(z, X0, Y0, W, H)
    miekki = rozmyj(src, 1.2 + 0.5 * min(sk, 6))
    klasy = malowanie(miekki, z)
    klasy[klasy == 'woda'] = 'laka'                 # water comes from the vectors, drawn crisp
    R, G, B = miekki[..., 0], miekki[..., 1], miekki[..., 2]
    zielen = G - (R + B) / 2
    plamy = szum(lon, lat, 1.6) * 0.65 + szum(lon, lat, 0.45) * 0.35   # forests in patches, not a carpet
    zielone = np.isin(klasy, ['laka', 'ziel', 'las', 'las_gesty'])
    las = zielone & (plamy + (zielen - 25) / 90 > 0.6)     # forests in clumps with open land between
    klasy[zielone] = 'laka'
    klasy[zielone & (zielen + (plamy - 0.5) * 30 > 15)] = 'ziel'
    klasy[las] = 'las'
    nazwy = list(FARBY)
    idx = np.zeros(klasy.shape, np.int32)
    farba = np.zeros(src.shape, np.float32)
    for i, nm in enumerate(nazwy):
        m = klasy == nm
        idx[m] = i
        farba[m] = FARBY[nm]
    farba = rozmyj(farba, 0.9 + 0.3 * min(sk, 6))
    farba = farba * 0.9 + miekki * 0.1
    rand = (idx != np.roll(idx, 1, 0)) | (idx != np.roll(idx, 1, 1))
    rand = rozmyj_f(rand.astype(np.float32), 1.0)[..., None]
    farba *= 1 - 0.14 * np.clip(rand * 2, 0, 1)
    # 2. Relief from real heights: soft stepped hill shading (warm lights, cool shadows); the local spread of
    #    heights says where mountains and hills stand, the snowline where their caps are white.
    E = wysokosc(z, X0, Y0, W, H)
    mpp = 40075016.0 * np.cos(np.radians(lat)) / n            # metres per pixel (per row)
    dx = (np.roll(E, -1, 1) - np.roll(E, 1, 1)) / (2 * mpp)
    dy = (np.roll(E, -1, 0) - np.roll(E, 1, 0)) / (2 * mpp)
    przes = 9.0 * 2 ** ((7 - z) * 0.55)
    jasn = np.clip((dx + dy) * przes * 40, -30, 30) * np.clip(lad * 1.5 - 0.3, 0, 1)
    jasn = rozmyj_f(np.round(jasn / 10) * 10, 1.4 + 0.3 * min(sk, 6))[..., None] * 0.55
    farba = np.where(jasn > 0, farba + jasn * np.array([0.95, 0.85, 0.55]), farba + jasn * np.array([0.7, 0.78, 1.0]))
    r = int(np.clip(16000 / float(mpp.mean()), 2, 40))
    sr = rozmyj_f(E, r)
    rozrzut = np.sqrt(np.maximum(rozmyj_f(E * E, r) - sr * sr, 0))
    gory = np.clip((rozrzut - 120) / 260, 0, 1) * (E > 250)
    gory = np.maximum(gory, np.clip((rozrzut - 45) / 160, 0, 0.5) * (E > 120))   # hills: up to 0.5
    snieg = (klasy == 'snieg') | (E + rozrzut > np.maximum(700, 5200 - 62 * np.abs(lat)))

    # 3. Rivers and lakes from the vectors: blue with a thin ink edge.
    jez_ss, rz_ss = woda_wektory(z, X0, Y0, W, H)
    woda_ss = np.maximum(np.asarray(jez_ss, np.float32), np.asarray(rz_ss, np.float32))
    brzeg_w = np.asarray(Image.fromarray(woda_ss.astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), np.float32)
    zm = lambda a: np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((W, H), Image.BOX), np.float32) / 255
    woda, obw = zm(woda_ss), zm(brzeg_w)
    a = (np.clip(obw - woda, 0, 1) * 0.55)[..., None]
    farba = farba * (1 - a) + TUSZ * a
    farba = farba * (1 - woda[..., None]) + WODA * woda[..., None]

    # 4. Little drawn symbols: trees, mountains, hills, dunes.
    zn = znaczki(z, X0, Y0, W, H, klasy, las, gory, snieg, lad * (1 - woda))
    zn = np.asarray(zn.resize((W, H), Image.BOX), np.float32)
    a = zn[..., 3:4] / 255
    farba = farba * (1 - a) + zn[..., :3] * a

    # 5. Sea and coast like the poster: parchment sea, a turquoise watercolour halo hugging the coast (stronger
    #    right at the shore, a soft uneven fade outwards), a thick ink coastline.
    bin_ss = np.asarray(lad_ss, np.uint8) > 127
    dist = np.zeros(bin_ss.shape, np.float32)
    cur = Image.fromarray(bin_ss.astype(np.uint8) * 255)
    pokryte = bin_ss.copy()
    zasieg = (18 if z >= 3 else 10) * SS
    for k in range(1, zasieg + 3):
        cur = cur.filter(ImageFilter.MaxFilter(3))
        aa = np.asarray(cur) > 127
        dist[aa & ~pokryte] = k
        pokryte |= aa
    dist[~pokryte] = zasieg + 3
    dist = np.asarray(Image.fromarray(rozmyj_f(dist, 2.0) / SS).resize((W, H), Image.BOX), np.float32)
    nier = szum(lon, lat, 0.9) * 0.6 + szum(lon, lat, 0.25) * 0.4          # uneven watercolour edge
    zas = zasieg / SS * (0.65 + 0.7 * nier)
    halo = np.clip(1 - dist / zas, 0, 1) ** 1.25 * (1 - lad) * 0.88
    img = farba * lad[..., None] + MORZE * (1 - lad[..., None])
    img = img * (1 - halo[..., None]) + HALO * halo[..., None]
    br = np.asarray(lad_ss.filter(ImageFilter.MaxFilter(3)), np.float32) - np.asarray(lad_ss.filter(ImageFilter.MinFilter(3)), np.float32)
    for _ in range(0 if z < 3 else 1 if z < 5 else 2):
        br = np.asarray(Image.fromarray(np.clip(br, 0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), np.float32)
    brzeg = zm(br)
    a = np.clip(brzeg * 1.3, 0, 1)[..., None] * 0.95
    img = img * (1 - a) + TUSZ * a

    out = np.clip(img + 0.5, 0, 255).astype(np.uint8)[M:M + T, M:M + T]
    os.makedirs(f'{cel}/{z}', exist_ok=True)
    Image.fromarray(out).save(f'{cel}/{z}/{x}_{y}.webp', quality=JAKOSC, method=6)
    return (z, x, y)


def init(zrodlo):
    global SRC, LAD, GRANICE, RZEKI, JEZIORA, WYS
    SRC = np.asarray(Image.open(f'{zrodlo}/NE2_HR_LC_SR_W_DR.tif').convert('RGB'))
    LAD = wczytaj_geo(f'{zrodlo}/ne_10m_land.geojson', {'Polygon', 'MultiPolygon'}) + \
        wczytaj_geo(f'{zrodlo}/ne_10m_minor_islands.geojson', {'Polygon', 'MultiPolygon'})
    GRANICE = wczytaj_geo(f'{zrodlo}/ne_10m_admin_0_boundary_lines_land.geojson', {'LineString', 'MultiLineString'})
    RZEKI = wczytaj_geo(f'{zrodlo}/ne_10m_rivers_lake_centerlines.geojson', {'LineString', 'MultiLineString'})
    JEZIORA = wczytaj_geo(f'{zrodlo}/ne_10m_lakes.geojson', {'Polygon', 'MultiPolygon'})
    e = np.load(f'{zrodlo}/wysokosc_z5.npy').astype(np.float32)
    WYS = [e]
    while WYS[-1].shape[0] > 512:
        a = WYS[-1]
        WYS.append(a.reshape(a.shape[0] // 2, 2, a.shape[1] // 2, 2).mean((1, 3)))


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
                    if z < tz:
                        continue
                    s = 2 ** (z - tz)
                    if not (a * s <= x < (c + 1) * s and b * s <= y < (d + 1) * s):
                        continue
                zad.append((z, x, y, cel))
    print(len(zad), 'tiles to try', flush=True)
    with Pool(os.cpu_count(), initializer=init, initargs=(zrodlo,)) as p:
        gotowe = [k for k in p.imap_unordered(kafel, zad, chunksize=4) if k]
    spis = {}
    for z, x, y in gotowe:
        spis.setdefault(str(z), []).append(f'{x}_{y}')
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
