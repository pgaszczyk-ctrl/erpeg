"""Cuts the five difficulty silhouettes out of the owner's mock-up (scripts/trudnosc-zrodlo/makieta.webp, 22 Nov 2026)
into white-on-transparent masks public/ui/trudnosc/poza_<n>.png (colour comes from CSS)."""
from PIL import Image, ImageFilter
import numpy as np
im = np.asarray(Image.open('scripts/trudnosc-zrodlo/makieta.webp').convert('RGB')).astype(int)
y0, y1 = 215, 517  # 517 is the ground line
pas = im[y0:y1, 140:1520]
r, g, b = pas[..., 0], pas[..., 1], pas[..., 2]
# gold figure vs dark brown back (also the glowing back around the last one)
a = np.clip((r - 120) * 3.2, 0, 255) * ((r - b) > 70)
a = np.where(r + g > 300, 255, a).astype(np.uint8)
kol = (a[:-6] > 128).sum(0)
xs = np.where(kol > 0)[0]
grupy, s = [], xs[0]
for p, q in zip(xs, xs[1:]):
    if q - p > 12:
        grupy.append((s, p)); s = q
grupy.append((s, xs[-1]))
grupy = [gr for gr in grupy if gr[1] - gr[0] > 40]
print(len(grupy), grupy)
assert len(grupy) == 5
H = 160
for i, (l, rr) in enumerate(grupy):
    m = a[:, l - 4:rr + 5]
    ys = np.where((m > 128).sum(1) > 0)[0]
    top = ys[0] - 4
    m = m[top:]
    w = m.shape[1]
    out = Image.new('LA', (w, m.shape[0]), (255, 0))
    out.putalpha(Image.fromarray(m))
    sc = H / (y1 - y0 - 0)  # same scale for all: whole strip height → H
    out = out.resize((max(1, round(w * sc)), max(1, round(m.shape[0] * sc))), Image.LANCZOS)
    can = Image.new('LA', (out.width, H), (255, 0))
    can.paste(out, (0, H - out.height))
    can.save(f'public/ui/trudnosc/poza_{i}.png', optimize=True)
    print(i, can.size)
