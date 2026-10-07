#!/usr/bin/env python3
"""Smok górski i efekty uderzenia od grafika (zamówienie 15b, paczka „koziol_i_smok_gorski” 7.10.2026) → arkusze do gry.

Źródła: scripts/smoki-zrodla/smok_gorski/*.png (klatki 512×512 na magencie) i scripts/smoki-zrodla/efekty/*.png.
- tło magenta i różowe obwódki → przezroczyste; zostaje tylko główna bryła (oderwane okruchy, np. skrzydło obok, precz),
- JEDNA skala dla wszystkich klatek smoka: długość z boku (stoi_bok_1) = DLUGOSC_W × wzrost bohaterki
  (zamówienie: 8–9 wzrostów, w grze 6 – patrz DLUGOSC_W; piksele jak u postaci: 2 px obrazu na punkt mapy),
- zmniejszanie „głosowaniem” (w kwadracie wygrywa najczęstszy kolor), kolory z palety świata, obrys 1 px #1e1a24,
- klatki w jednej siatce: podstawa (dół sylwetki) i środek masy w tym samym miejscu komórki.
Efekty: każda seria w jednej skali i na wspólnym prostokącie (fala rośnie między klatkami – nie przycinać osobno).
Wynik: public/swiat/smoki/smok_gorski.png + .json (nazwa klatki → numer, rozmiar komórki, punkt podstawy), efekty efekt_*.png.
Użycie: python3 scripts/smok-gorski.py
"""
import glob, json, os
import numpy as np
from PIL import Image

ZR = 'scripts/smoki-zrodla'
OUT = 'public/swiat/smoki'
WZROST = 56 * 0.36 * (2 / 3) * 2  # bohaterka w px obrazu (2 na punkt mapy)
DLUGOSC_W = 6  # zamówienie: 8–9; na telefonie zasłaniał bohaterkę i pół ekranu (7.10.2026) – jedna liczba do zmiany
PALETA = np.unique(np.asarray(Image.open('docs/paczka-dla-artysty/8_wyrownanie/paleta_swiata.png').convert('RGB')).reshape(-1, 3), axis=0).astype(int)
OBRYS = (0x1e, 0x1a, 0x24)


def wczytaj(f):
    a = np.asarray(Image.open(f).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tlo = ((r > 170) & (g < 110) & (b > 170)) | (((r - g) > 70) & ((b - g) > 70))
    return a, ~tlo


def glowna_bryla(m, prog=0.02):
    """Spójne obszary (4-sąsiedztwo) na siatce co 4 px; zostają te, które mają ≥ prog największego."""
    k = 4
    h, w = m.shape
    s = m[: h // k * k, : w // k * k].reshape(h // k, k, w // k, k).any(axis=(1, 3))
    lab = np.zeros(s.shape, int)
    rozm = [0]
    n = 0
    for y0 in range(s.shape[0]):
        for x0 in range(s.shape[1]):
            if not s[y0, x0] or lab[y0, x0]: continue
            n += 1
            stos = [(y0, x0)]; lab[y0, x0] = n; c = 0
            while stos:
                y, x = stos.pop(); c += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < s.shape[0] and 0 <= xx < s.shape[1] and s[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; stos.append((yy, xx))
            rozm.append(c)
    if n == 0: return m
    duzy = max(rozm)
    zostaw = np.array([False] + [c >= duzy * prog for c in rozm[1:]])
    keep = zostaw[lab]
    keep = np.repeat(np.repeat(keep, k, 0), k, 1)
    out = np.zeros_like(m)
    out[: keep.shape[0], : keep.shape[1]] = keep
    return m & out


def zmniejsz(a, m, s):
    """Głosowanie w kwadratach s×s (s niecałkowite), kolory z palety; zwraca RGBA."""
    ys, xs = np.where(m)
    t, b, l, r = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    W = max(1, round((r - l) / s)); H = max(1, round((b - t) / s))
    out = np.zeros((H + 2, W + 2, 4), np.uint8)
    for j in range(H):
        y0 = int(t + j * s); y1 = max(y0 + 1, int(t + (j + 1) * s))
        for i in range(W):
            x0 = int(l + i * s); x1 = max(x0 + 1, int(l + (i + 1) * s))
            pm = m[y0:y1, x0:x1]
            if pm.mean() < 0.45: continue
            px = a[y0:y1, x0:x1][pm]
            q = PALETA[((px[:, None, :] - PALETA[None]) ** 2).sum(-1).argmin(-1)]
            v, c = np.unique(q, axis=0, return_counts=True)
            out[j + 1, i + 1, :3] = v[c.argmax()]
            out[j + 1, i + 1, 3] = 255
    # obrys dookoła sylwetki
    al = out[..., 3] > 0
    brzeg = np.zeros_like(al)
    brzeg[1:] |= al[:-1]; brzeg[:-1] |= al[1:]; brzeg[:, 1:] |= al[:, :-1]; brzeg[:, :-1] |= al[:, 1:]
    brzeg &= ~al
    out[brzeg, :3] = OBRYS; out[brzeg, 3] = 255
    return out


def smok():
    pliki = sorted(glob.glob(f'{ZR}/smok_gorski/*.png'))
    zrodla = {}
    for f in pliki:
        a, m = wczytaj(f)
        m = glowna_bryla(m, 0.2)
        zrodla[os.path.basename(f)[len('smok_gorski_'):-4]] = (a, m)
    a, m = zrodla['stoi_bok_1']
    xs = np.where(m.any(0))[0]
    s = (xs.max() - xs.min()) / (DLUGOSC_W * WZROST)
    klatki = {n: zmniejsz(a, m, s) for n, (a, m) in zrodla.items()}
    # punkt zaczepienia: środek masy sylwetki (dół sylwetki skakał między kierunkami – od tyłu ogon sięga niżej niż łapy)
    def kotwica(o):
        ys, xs = np.where(o[..., 3] > 0)
        return xs.mean(), ys.mean()
    lewo = max(kotwica(o)[0] for o in klatki.values()); prawo = max(o.shape[1] - kotwica(o)[0] for o in klatki.values())
    gora = max(kotwica(o)[1] for o in klatki.values()); dol = max(o.shape[0] - kotwica(o)[1] for o in klatki.values())
    CW, CH = int(np.ceil(lewo + prawo)) + 2, int(np.ceil(gora + dol)) + 2
    bx, by = int(np.ceil(lewo)) + 1, int(np.ceil(gora)) + 1
    # ile od środka masy do łap (stoi z boku i z przodu): gra stawia środek tyle nad punktem smoka
    lapy = np.mean([klatki[n].shape[0] - 1 - kotwica(klatki[n])[1] for n in ('stoi_bok_1', 'stoi_przod_1')])
    nazwy = sorted(klatki)
    kol = 8
    arkusz = Image.new('RGBA', (CW * kol, CH * ((len(nazwy) + kol - 1) // kol)))
    for i, n in enumerate(nazwy):
        o = klatki[n]; kx, ky = kotwica(o)
        arkusz.alpha_composite(Image.fromarray(o), ((i % kol) * CW + int(round(bx - kx)), (i // kol) * CH + int(round(by - ky))))
    os.makedirs(OUT, exist_ok=True)
    arkusz.save(f'{OUT}/smok_gorski.png', optimize=True)
    json.dump({'komorka': [CW, CH], 'srodek': [bx, by], 'doLap': round(float(lapy), 1), 'klatki': {n: i for i, n in enumerate(nazwy)}}, open(f'{OUT}/smok_gorski.json', 'w'), indent=1)
    print('smok_gorski: skala 1:%.2f, komórka %d×%d, %d klatek' % (s, CW, CH, len(nazwy)))


def efekty():
    serie = {'fala': (2.5 * 2 * WZROST, 4), 'pyl': (2.4 * WZROST, 3), 'pekniecia': (3 * WZROST, 2), 'odlamek': (0.35 * WZROST, 6)}
    for nazwa, (szer, n) in serie.items():
        fr = [wczytaj(f'{ZR}/efekty/efekt_{nazwa}_{i}.png') for i in range(1, n + 1)]
        # klatki różnią się o piksel: dopełnione do wspólnego płótna
        H0 = max(a.shape[0] for a, _ in fr); W0 = max(a.shape[1] for a, _ in fr)
        fr = [(np.pad(a, ((0, H0 - a.shape[0]), (0, W0 - a.shape[1]), (0, 0))), np.pad(m, ((0, H0 - m.shape[0]), (0, W0 - m.shape[1])))) for a, m in fr]
        if nazwa == 'odlamek':  # osobne kamyki: każdy w swojej skali
            outs = []
            for a, m in fr:
                m = glowna_bryla(m, 0.3)
                xs = np.where(m.any(0))[0]
                outs.append(zmniejsz(a, m, (xs.max() - xs.min()) / szer))
        else:
            # wspólny prostokąt i jedna skala (z największej klatki)
            mx = max(np.ptp(np.where(m.any(0))[0]) for _, m in fr)
            s = mx / szer
            al = np.zeros_like(fr[0][1])
            for _, m in fr: al |= m
            outs = []
            for a, m in fr:
                m2 = m.copy(); m2[al & ~m] = False
                # ta sama ramka dla wszystkich: dokładamy narożniki wspólnego prostokąta jako „przezroczyste”
                o = zmniejsz_ramka(a, m, al, s)
                outs.append(o)
        W = max(o.shape[1] for o in outs); H = max(o.shape[0] for o in outs)
        ark = Image.new('RGBA', (W * n, H))
        for i, o in enumerate(outs):
            ark.alpha_composite(Image.fromarray(o), (i * W + (W - o.shape[1]) // 2, (H - o.shape[0]) // 2))
        ark.save(f'{OUT}/efekt_{nazwa}.png', optimize=True)
        print(f'efekt_{nazwa}: {n} × {W}×{H}')


def zmniejsz_ramka(a, m, wspolna, s):
    """Jak zmniejsz, ale w prostokącie wspólnym dla całej serii (środek efektu zostaje w miejscu)."""
    ys, xs = np.where(wspolna)
    t, b, l, r = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    mm = np.zeros_like(m); mm[t:b, l:r] = m[t:b, l:r]
    # wymuszamy ramkę: dwa piksele w rogach wspólnego prostokąta (usuwane po zmniejszeniu)
    mm2 = mm.copy(); mm2[t, l] = mm2[b - 1, r - 1] = True
    o = zmniejsz(a, mm2, s)
    o[1, 1] = 0; o[-2, -2] = 0
    return o


if __name__ == '__main__':
    import sys
    if 'efekty' not in sys.argv[1:]: smok()
    if 'smok' not in sys.argv[1:]: efekty()
