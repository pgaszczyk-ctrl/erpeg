"""Wyrównanie rysunku od grafika (także z kilkoma klatkami w rzędzie) do świata gry.
Użycie: python3 wyrownaj_klatki.py wejscie.png wyjscie.png SZER WYS [KLATKI]
- tło (kolor z rogów, np. magenta) → przezroczyste,
- klatki: rozdziela po pustych kolumnach (albo równo na KLATKI części), wszystkie w JEDNEJ skali i ze wspólną linią podstawy,
- najpierw każdy piksel źródła → najbliższy kolor palety świata, potem zmniejszenie „głosowaniem” (w każdym kwadracie wygrywa
  najczęstszy kolor), więc nie powstają rozmyte mieszanki; obrys 1 px #1e1a24 dookoła sylwetki,
- wynik: pasek klatek SZER×WYS obok siebie (podstawa przy dolnej krawędzi, środek w poziomie)."""
import sys, numpy as np
from PIL import Image
src, dst, TW, TH = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
NK = int(sys.argv[5]) if len(sys.argv) > 5 else 0
pal = np.unique(np.asarray(Image.open(__file__.rsplit('/', 1)[0] + '/paleta_swiata.png').convert('RGB')).reshape(-1, 3), axis=0).astype(int)
a = np.asarray(Image.open(src).convert('RGBA')).astype(int)
rog = np.median(np.array([a[0, 0, :3], a[0, -1, :3], a[-1, 0, :3], a[-1, -1, :3]]), axis=0)
tlo = (np.abs(a[..., :3] - rog).sum(-1) < 90) | (a[..., 3] < 128)
# magentowe obwódki (mieszanka z tłem) też precz
mag = ((a[..., 0] - a[..., 1]) > 25) & ((a[..., 2] - a[..., 1]) > 25)
pelne = ~(tlo | mag)
kol = pelne.any(0)
# klatki
if NK:
    xs = np.where(kol)[0]; x0, x1 = xs[0], xs[-1] + 1; szer = (x1 - x0) / NK
    przedzialy = [(int(x0 + i * szer), int(x0 + (i + 1) * szer)) for i in range(NK)]
else:
    przedzialy = []; i = 0; W = len(kol)
    while i < W:
        if kol[i]:
            j = i
            while j < W and (kol[j] or (j + 12 < W and kol[j:j + 12].any())): j += 1
            przedzialy.append((i, j)); i = j
        else: i += 1
klatki = []
for (l, r) in przedzialy:
    m = pelne[:, l:r]; ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]
    klatki.append((l + xs[0], ys[0], l + xs[-1] + 1, ys[-1] + 1))
wmax = max(k[2] - k[0] for k in klatki); hmax = max(k[3] - k[1] for k in klatki)
s = max(wmax / (TW - 2), hmax / (TH - 2))  # wspólna skala, miejsce na obrys
# kwantyzacja źródła do palety (pomijając tło)
rgb = a[..., :3]
def kwant(blok):
    q = pal[((blok[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1)]
    return q
out = np.zeros((TH, TW * len(klatki), 4), np.uint8)
for n, (l, t, r, b) in enumerate(klatki):
    w = max(1, round((r - l) / s)); h = max(1, round((b - t) / s))
    ox = n * TW + (TW - w) // 2; oy = TH - 1 - h
    for j in range(h):
        for i in range(w):
            y0, y1 = int(t + j * s), max(int(t + j * s) + 1, int(t + (j + 1) * s)); x0, x1 = int(l + i * s), max(int(l + i * s) + 1, int(l + (i + 1) * s))
            pm = pelne[y0:y1, x0:x1]
            if pm.mean() < 0.45: continue
            px = rgb[y0:y1, x0:x1][pm]
            if len(px) > 400: px = px[np.random.default_rng(0).choice(len(px), 400, replace=False)]
            q = kwant(px[None])[0]
            vals, cnt = np.unique(q, axis=0, return_counts=True)
            # pierwszeństwo szczegółów, inaczej cienkie linie znikają albo wszystko tonie w obrysie:
            # 1) jasne/złote akcenty (ramiona wagi, wskazówki, szybki) – gdy zajmują ≥ 25 % kwadratu,
            # 2) ciemny obrys – tylko na brzegu sylwetki albo gdy zajmuje ≥ 60 % kwadratu.
            jasne = (q.max(-1) > 170) & ((q[:, 0] - q[:, 2]) > 50)
            ciemne = q.sum(-1) < 150
            brzeg = pm.mean() < 0.9 or j == 0 or i == 0 or j == h - 1 or i == w - 1
            if jasne.mean() >= 0.25 and not (brzeg and ciemne.mean() >= 0.3): v2, c2 = np.unique(q[jasne], axis=0, return_counts=True); out[oy + j, ox + i, :3] = v2[c2.argmax()]
            elif ciemne.mean() >= (0.3 if brzeg else 0.6): v2, c2 = np.unique(q[ciemne], axis=0, return_counts=True); out[oy + j, ox + i, :3] = v2[c2.argmax()]
            else: out[oy + j, ox + i, :3] = vals[cnt.argmax()]
            out[oy + j, ox + i, 3] = 255
A = out[..., 3] > 0
# obrys: tylko tam, gdzie brzeg sylwetki nie jest już ciemny (grafik zwykle rysuje własny obrys – nie dublujemy go)
C = A & (out[..., :3].astype(int).sum(-1) < 150)
ring = np.zeros_like(A)
for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
    ring |= (~A) & np.roll(A, sh, ax) & ~np.roll(C, sh, ax)
out[ring] = [0x1e, 0x1a, 0x24, 255]
Image.fromarray(out).save(dst)
print('zapisano', dst, len(klatki), 'klatek', TW, 'x', TH, 'skala 1:%.1f' % s)
