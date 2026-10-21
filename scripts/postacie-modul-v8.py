#!/usr/bin/env python3
"""Modular heroes v8 („krótsze nogi”, artist pack 21 Oct 2026): source boards → the game's 3×3 part sheets.

The artist's boards (scripts/modul-zrodla/v8_plansze/<nn>_<name>_<f|m>.png, 1536×1024 RGBA, made with an image
generator) hold three columns (front / left profile / back) and three rows: the assembled figure, the whole head,
the headless body. They are not on a pixel grid, have no masks, no walk frames and no anchors, so this script:
  * cuts the 9 parts (alpha > 128, one connected piece each),
  * finds where the head and the body sit in the assembled figure (best colour match at board scale), so the
    head's mount point is exactly where the artist put it over this body's neck (top of the neck stub),
  * shrinks every part by ONE common scale SKALA (all 20 drawn at one size, so any head fits any body) with
    a vote per game pixel (most common colour bin, hard alpha) – crisp like pixel art, not a blur,
  * places bodies with the feet's bottom edge on y = 61 (as v6), heads so they fit their 64 px cell whole
    (no jaw/beard cut – the reason for this pack),
  * makes step A/B frames by lifting the left/right foot (like spriteCleanup.liftFeet),
  * makes masks from the v6.3 masks of the same character: every new pixel takes the class (skin / hair /
    clothes 1 / clothes 2 / fixed) of the nearest colour of that character's old head or body.
Writes scripts/modul-zrodla/v8/{sheets_192,mask_sheets_192}/ + manifest.json (the format postacie-modul.py reads)
and a preview board. Then run: python3 scripts/postacie-modul.py v8
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = os.path.join(ROOT, 'scripts', 'modul-zrodla')
SRC = os.path.join(Z, 'v8_plansze')
OUT = os.path.join(Z, 'v8')
SKALA = 7.0          # board px per game px (the tallest figure, the archer, then fits 64 px)
STOPY = 61           # bottom edge of the feet in a body cell
NOGA, UNIES = 5, 2   # leg rows lifted in a step and by how much
KIER = ('front', 'left', 'back')
F = 64
MASKI = {'skora': (0, 0, 255), 'wlosy': (255, 255, 0), 'u1': (255, 0, 0), 'u2': (0, 255, 0)}


def czesci(a):
    """The 9 parts of a board: {'zlozona'|'glowa'|'cialo': [front, left, back]} as (y0, x0, y1, x1)."""
    lab, n = ndimage.label(a[..., 3] > 128)
    objs = [o for o, s in zip(ndimage.find_objects(lab), ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))) if s > 1500]
    assert len(objs) == 9, len(objs)
    kol = [[], [], []]
    for o in objs:
        kol[min(2, int((o[1].start + o[1].stop) / 2 // 512))].append(o)
    wynik = {'zlozona': [], 'glowa': [], 'cialo': []}
    for k in kol:
        assert len(k) == 3
        k.sort(key=lambda o: o[0].start)
        for nazwa, o in zip(('zlozona', 'glowa', 'cialo'), k):
            wynik[nazwa].append((o[0].start, o[1].start, o[0].stop, o[1].stop))
    return wynik, lab


def wytnij(a, lab, box):
    """The part's pixels (RGBA float) with only its own connected piece opaque."""
    y0, x0, y1, x1 = box
    c = a[y0:y1, x0:x1].astype(np.float32).copy()
    ids = np.unique(lab[y0:y1, x0:x1][a[y0:y1, x0:x1, 3] > 128])
    wlasne = np.isin(lab[y0:y1, x0:x1], ids[ids > 0])
    # keep soft edge pixels next to the piece, drop other pieces
    blisko = ndimage.binary_dilation(wlasne, iterations=2) & (lab[y0:y1, x0:x1] == 0)
    c[..., 3] *= wlasne | blisko
    return c


def dopasuj(czesc, cel, zgadnij, zasieg=30):
    """Offset (dy, dx) of a part inside the assembled figure: most of its opaque pixels match in colour."""
    m = czesc[..., 3] > 200
    ys, xs = np.nonzero(m)
    krok = max(1, len(ys) // 6000)
    ys, xs = ys[::krok], xs[::krok]
    kol = czesc[ys, xs, :3]
    best = (-1, 0, 0)
    for dy in range(zgadnij[0] - zasieg, zgadnij[0] + zasieg + 1, 2):
        for dx in range(zgadnij[1] - zasieg, zgadnij[1] + zasieg + 1, 2):
            yy, xx = ys + dy, xs + dx
            ok = (yy >= 0) & (xx >= 0) & (yy < cel.shape[0]) & (xx < cel.shape[1])
            c = cel[yy[ok], xx[ok]]
            traf = ((c[:, 3] > 128) & (np.abs(c[:, :3] - kol[ok]).sum(1) < 60)).sum()
            if traf > best[0]:
                best = (traf, dy, dx)
    _, by, bx = best
    for dy in range(by - 2, by + 3):
        for dx in range(bx - 2, bx + 3):
            yy, xx = ys + dy, xs + dx
            ok = (yy >= 0) & (xx >= 0) & (yy < cel.shape[0]) & (xx < cel.shape[1])
            c = cel[yy[ok], xx[ok]]
            traf = ((c[:, 3] > 128) & (np.abs(c[:, :3] - kol[ok]).sum(1) < 60)).sum()
            if traf > best[0]:
                best = (traf, dy, dx)
    return best[1], best[2], best[0] / len(ys)


def zmniejsz(c, ox, oy, w, h):
    """Vote-downscale: game pixel (i, j) covers board px [ox + i·S, ox + (i+1)·S). Returns uint8 RGBA (h, w)."""
    out = np.zeros((h, w, 4), np.uint8)
    H, W = c.shape[:2]
    for j in range(h):
        y0, y1 = int(round(oy + j * SKALA)), int(round(oy + (j + 1) * SKALA))
        if y1 <= 0 or y0 >= H:
            continue
        for i in range(w):
            x0, x1 = int(round(ox + i * SKALA)), int(round(ox + (i + 1) * SKALA))
            if x1 <= 0 or x0 >= W:
                continue
            blok = c[max(0, y0):y1, max(0, x0):x1]
            if not blok.size:
                continue
            a = blok[..., 3] > 128
            if a.sum() * 2 < (y1 - y0) * (x1 - x0):
                continue
            px = blok[a][:, :3]
            kosz = (px // 24).astype(int)
            klucz = kosz[:, 0] * 10000 + kosz[:, 1] * 100 + kosz[:, 2]
            wart, ile = np.unique(klucz, return_counts=True)
            naj = wart[ile.argmax()]
            out[j, i, :3] = px[klucz == naj].mean(0).round()
            out[j, i, 3] = 255
    return out


def unies(cialo):
    """Steps A and B from the standing body: the left / right foot's rows lifted UNIES px."""
    a = cialo[..., 3] > 0
    rows = np.nonzero(a.any(1))[0]
    stopa = rows.max()
    xs = np.nonzero(a[stopa - NOGA:stopa + 1].any(0))[0]
    mid = (xs.min() + xs.max() + 1) / 2
    kroki = []
    for lewa in (True, False):
        k = cialo.copy()
        for y in range(stopa - NOGA, stopa + 1):
            for x in range(F):
                if (x < mid) == lewa:
                    sy = y + UNIES
                    k[y, x] = cialo[sy, x] if sy <= stopa else 0
        kroki.append(k)
    return kroki


def klasy_starych(base, czesc):
    """Every old v6.3 pixel colour of this character's part with its mask class: (colours N×3, class index N)."""
    sh = np.array(Image.open(os.path.join(Z, 'sheets_192', f'{base}_{czesc}_3x3.png')).convert('RGBA')).astype(int)
    mk = np.array(Image.open(os.path.join(Z, 'mask_sheets_192', f'{base}_{czesc}_mask_3x3.png')).convert('RGBA'))
    m = sh[..., 3] > 0
    kol = sh[m][:, :3]
    mm = mk[m]
    kl = np.zeros(len(kol), int)  # 0 = fixed (outline, eyes, metal…)
    for i, (n, rgb) in enumerate(MASKI.items(), 1):
        kl[(mm[:, 3] > 0) & (mm[:, 0] == rgb[0]) & (mm[:, 1] == rgb[1]) & (mm[:, 2] == rgb[2])] = i
    return kol, kl


SKORY = {}


def ze_skora(base, czesc):
    """This character's old colours plus every character's old skin (an artist may change a character's skin
    tone – the courier is light-skinned now), so a face always finds the skin class."""
    if czesc not in SKORY:
        wszystkie = [klasy_starych(n[:-len(f'_{czesc}_3x3.png')], czesc)
                     for n in sorted(os.listdir(os.path.join(Z, 'sheets_192'))) if n.endswith(f'_{czesc}_3x3.png')]
        SKORY[czesc] = np.concatenate([k[l == 1] for k, l in wszystkie])
    kol, kl = klasy_starych(base, czesc)
    return np.concatenate([kol, SKORY[czesc]]), np.concatenate([kl, np.ones(len(SKORY[czesc]), int)]), len(kol)


def maska(obraz, stare):
    kol, kl, wlasnych = stare
    out = np.zeros_like(obraz)
    m = obraz[..., 3] > 0
    px = obraz[m][:, :3].astype(int)
    k = np.zeros(len(px), int)
    for i0 in range(0, len(px), 500):
        dw = ((px[i0:i0 + 500, None, :] - kol[None, :wlasnych, :]) ** 2).sum(2)
        ds = ((px[i0:i0 + 500, None, :] - kol[None, wlasnych:, :]) ** 2).sum(2)
        for j in range(len(dw)):
            # vote of every old pixel of a similar colour (the artist's masks left some hair shades out);
            # other characters' skin only when this character has nothing near that colour
            d, klasy = (dw[j], kl[:wlasnych]) if dw[j].min() <= 30 ** 2 or ds[j].min() >= dw[j].min() else (ds[j], kl[wlasnych:])
            dmin = d.min()
            glosy = np.bincount(klasy[d <= max(dmin * 2.5, 22 ** 2)], minlength=5)
            k[i0 + j] = glosy.argmax() if dmin <= 60 ** 2 else 0
    kl_obraz = np.full(obraz.shape[:2], -1, int)
    kl_obraz[m] = k
    # smooth: a non-dark pixel takes its neighbours' majority class (speckles where shades of hair or cloth
    # landed nearer to another material's old colour); the dark outline keeps its own (fixed) class
    jasny = m & (obraz[..., :3].max(2) >= 70)
    for _ in range(3):
        nowy = kl_obraz.copy()
        for y, x in zip(*np.nonzero(jasny)):
            jas = jasny[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel()
            sas = kl_obraz[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel()[jas]
            ile = np.bincount(sas, minlength=5)
            if ile.max() >= 5 and ile.argmax() != kl_obraz[y, x]:
                nowy[y, x] = ile.argmax()
        kl_obraz = nowy
    k = kl_obraz[m]
    lista = [(0, 0, 0)] + list(MASKI.values())
    kolory = np.array([[*lista[i], 255 if i else 0] for i in range(5)], np.uint8)
    out[m] = kolory[k]
    return out


def main():
    stary = json.load(open(os.path.join(Z, 'manifest.json')))
    os.makedirs(os.path.join(OUT, 'sheets_192'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'mask_sheets_192'), exist_ok=True)
    postacie = []
    podglad = Image.new('RGBA', (20 * 64 * 3, 64 * 3), (88, 140, 92, 255))
    for ci, c in enumerate(stary['characters']):
        base = c['filename_base']
        a = np.array(Image.open(os.path.join(SRC, base + '.png')).convert('RGBA'))
        boxy, lab = czesci(a)
        arkusz = {k: np.zeros((F * 3, F * 3, 4), np.uint8) for k in ('head', 'body')}
        kier = {}
        for r, dn in enumerate(KIER):
            z = boxy['zlozona'][r]
            cel = a[z[0]:z[2], z[1]:z[3]].astype(np.float32)
            g, b = wytnij(a, lab, boxy['glowa'][r]), wytnij(a, lab, boxy['cialo'][r])
            # guesses: head at the top, centred; body at the bottom, centred
            zg = (0, (cel.shape[1] - g.shape[1]) // 2)
            zb = (cel.shape[0] - b.shape[0], (cel.shape[1] - b.shape[1]) // 2)
            gy, gx, gq = dopasuj(g, cel, zg)
            by, bx, bq = dopasuj(b, cel, zb)
            # neck: one game px under the body's top
            ma = b[..., 3] > 128
            top = np.nonzero(ma.any(1))[0].min()
            xs = np.nonzero(ma[top:top + int(SKALA * 1.5)].any(0))[0]
            cx = np.nonzero(ma.any(0))[0]
            # front/back: the body's middle (a braid tip on the shoulder must not pull it); profile: the neck stub
            nxs = (cx.min() + cx.max() + 1) / 2 if dn != 'left' else (xs.min() + xs.max() + 1) / 2
            neck = (nxs, top + SKALA)
            mount = (neck[0] + bx - gx, neck[1] + by - gy)
            # body: feet on STOPY, centred on x 32
            bw, bh = int(np.ceil(b.shape[1] / SKALA)), int(np.ceil(b.shape[0] / SKALA))
            bo = zmniejsz(b, 0, 0, bw, bh)
            rows = np.nonzero(bo[..., 3].any(1))[0]
            cols = np.nonzero(bo[..., 3].any(0))[0]
            offy = STOPY - 1 - rows.max()
            offx = int(round(32 - (cols.min() + cols.max() + 1) / 2))
            cialo = np.zeros((F, F, 4), np.uint8)
            cialo[max(0, offy):offy + bh, max(0, offx):offx + bw] = bo[max(0, -offy):F - offy, max(0, -offx):F - offx]
            nx, ny = neck[0] / SKALA + offx, neck[1] / SKALA + offy
            # head: mount near x 32, whole head inside the cell
            gw, gh = int(np.ceil(g.shape[1] / SKALA)), int(np.ceil(g.shape[0] / SKALA))
            go = zmniejsz(g, 0, 0, gw, gh)
            rows = np.nonzero(go[..., 3].any(1))[0]
            cols = np.nonzero(go[..., 3].any(0))[0]
            hx = int(round(32 - mount[0] / SKALA))
            hx = min(max(hx, -cols.min()), F - 1 - cols.max())
            hy = int(round(40 - mount[1] / SKALA))
            hy = min(max(hy, -rows.min()), F - 1 - rows.max())
            assert rows.max() - rows.min() < F and cols.max() - cols.min() < F, (base, dn)
            glowa = np.zeros((F, F, 4), np.uint8)
            glowa[max(0, hy):hy + gh, max(0, hx):hx + gw] = go[max(0, -hy):F - hy, max(0, -hx):F - hx]
            mx, my = mount[0] / SKALA + hx, mount[1] / SKALA + hy
            kier[dn] = {'head_mount': {'x': round(mx, 2), 'y': round(my, 2)}, 'neck': {'x': round(nx, 2), 'y': round(ny, 2)}}
            ka, kb = unies(cialo)
            for col, ramka in enumerate((ka, cialo, kb)):
                arkusz['body'][r * F:(r + 1) * F, col * F:(col + 1) * F] = ramka
                arkusz['head'][r * F:(r + 1) * F, col * F:(col + 1) * F] = glowa
            # preview: assembled standing + steps, as the game composes it (2 px lower)
            dx, dy = round(nx - mx), round(ny - my)
            for col, ramka in enumerate((ka, cialo, kb)):
                kom = Image.new('RGBA', (F, F))
                kom.alpha_composite(Image.fromarray(ramka), (0, 2))
                kom.alpha_composite(Image.fromarray(glowa), (dx, 2 + dy))
                podglad.alpha_composite(kom, ((ci * 3 + col) * F, r * F))
            if min(gq, bq) < 0.6:
                print('  słabe dopasowanie', base, dn, round(gq, 2), round(bq, 2))
        for czesc in ('head', 'body'):
            obraz = arkusz[czesc]
            Image.fromarray(obraz).save(os.path.join(OUT, 'sheets_192', f'{base}_{czesc}_3x3.png'), optimize=True)
            Image.fromarray(maska(obraz, ze_skora(base, czesc))).save(
                os.path.join(OUT, 'mask_sheets_192', f'{base}_{czesc}_mask_3x3.png'), optimize=True)
        nowa = dict(c)
        nowa['directions'] = {dn: dict(c['directions'][dn], **kier[dn]) for dn in KIER}
        postacie.append(nowa)
        print(base, {dn: (kier[dn]['head_mount'], kier[dn]['neck']) for dn in KIER})
    m = dict(stary, version=8, revision='8', correction='krótsze nogi (21.10.2026)', characters=postacie)
    json.dump(m, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    podglad.resize((podglad.width * 2, podglad.height * 2), Image.NEAREST).save(os.path.join(OUT, 'podglad.png'))


if __name__ == '__main__':
    main()
