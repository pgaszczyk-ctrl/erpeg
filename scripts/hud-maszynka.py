#!/usr/bin/env python3
"""HUD "maszynka" v2 (owner, 5 Oct 2026): taller tubes, an avatar frame over the heal button
(linked to the tubes by a brass pipe), and two buttons at the bottom: camera + quest log.
Built from the mock-up's v1 pictures kept in scripts/hud-v1/ (70×60); writes public/hud/maszynka_*.png (70×(60+E))."""
from PIL import Image
import os

E = 30                      # extra rows on top
SRC = 'scripts/hud-v1'
DST = 'public/hud'
A, B, C, D, Ee, F, H, I = '#1a110b', '#e2b25a', '#b8893b', '#1f2a2c', '#f1e3c2', '#6b4a1f', '#2e2017', '#3d2e22'
rgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)

def shifted(name):
    src = Image.open(f'{SRC}/maszynka_{name}.png').convert('RGBA')
    out = Image.new('RGBA', (70, 60 + E))
    out.paste(src, (0, E))
    return src, out

src, out = shifted('baza')
# Tubes (x 49..68): cap stays on top, the glass row 7 is repeated E times.
cap = src.crop((49, 0, 70, 7))
glass = src.crop((49, 7, 70, 8))
out.paste(Image.new('RGBA', (21, E)), (49, E))
out.paste(cap, (49, 0))
for y in range(7, 7 + E):
    out.paste(glass, (49, y))
out.paste(src.crop((49, 7, 70, 60)), (49, 7 + E))

px = out.load()
def rect(x, y, w, h, col):
    for j in range(y, y + h):
        for i in range(x, x + w):
            px[i, j] = rgb(col)

# Bottom row: clear the three v1 buttons; two bigger buttons (owner: +50 %) – 24×24 frames with
# the 9×9 icons drawn at 2× (camera from v1 button 2, a quest-log scroll).
for j in range(44 + E, 60 + E):
    for i in range(0, 49):
        px[i, j] = (0, 0, 0, 0)
cam_icon = [[src.getpixel((20 + i, 47 + j)) for i in range(9)] for j in range(9)]
scroll = [
    '.AAAAAAA.',
    'AFEEEEEFA',
    '.AEEEEEA.',
    '.AEAAAEA.',
    '.AEEEEEA.',
    '.AEAAEEA.',
    '.AEEEEEA.',
    'AFEEEEEFA',
    '.AAAAAAA.',
]
col = {'A': A, 'E': Ee, 'F': F, '.': H}
scroll_icon = [[rgb(col[ch]) for ch in row] for row in scroll]
N = 24
def button(x0, y0, icon):
    rows = ['.' + 'A' * (N - 2) + '.', 'A' + 'B' * (N - 2) + 'A', 'AC' + 'I' * (N - 4) + 'CA']
    rows += ['ACH' + '#' * (N - 6) + 'HCA'] * (N - 6)
    rows += ['AC' + 'H' * (N - 4) + 'CA', 'A' + 'F' * (N - 2) + 'A', '.' + 'A' * (N - 2) + '.']
    pal = {'A': A, 'B': B, 'C': C, 'I': I, 'H': H, 'F': F}
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in pal:
                px[x0 + i, y0 + j] = rgb(pal[ch])
    for j in range(N - 6):
        for i in range(N - 6):
            c = icon[j // 2][i // 2]
            px[x0 + 3 + i, y0 + 3 + j] = c if c[3] else rgb(H)
by = 66
button(0, by, cam_icon)
button(25, by, scroll_icon)

# Avatar frame (26×26 at x 11, y 2): outline, light brass top/left, brass, dark bottom, dark inside.
ax, ay, aw = 11, 2, 26
rect(ax + 1, ay, aw - 2, aw, A)
rect(ax, ay + 1, aw, aw - 2, A)
rect(ax + 1, ay + 1, aw - 2, aw - 2, C)
rect(ax + 1, ay + 1, aw - 2, 1, B)
rect(ax + 1, ay + 1, 1, aw - 2, B)
rect(ax + 1, ay + aw - 2, aw - 2, 1, F)
rect(ax + 3, ay + 3, aw - 6, aw - 6, A)
rect(ax + 4, ay + 4, aw - 8, aw - 8, H)
# Rivets in the corners.
for (i, j) in [(ax + 2, ay + 2), (ax + aw - 3, ay + 2), (ax + 2, ay + aw - 3), (ax + aw - 3, ay + aw - 3)]:
    px[i, j] = rgb(Ee)
# Brass pipe from the avatar to the tubes (like the heal button's pipe), with a flange.
py0 = ay + 10
for i in range(ax + aw, 50):
    px[i, py0] = rgb(A)
    px[i, py0 + 1] = rgb(B)
    px[i, py0 + 2] = rgb(C)
    px[i, py0 + 3] = rgb(F)
    px[i, py0 + 4] = rgb(A)
rect(42, py0 - 1, 3, 7, A)
rect(43, py0, 1, 5, B)
# …and on behind the red tube (life) into the gold one (experience): seen in the gap between them.
for i in (58, 59):
    px[i, py0] = rgb(A)
    px[i, py0 + 1] = rgb(B)
    px[i, py0 + 2] = rgb(C)
    px[i, py0 + 3] = rgb(F)
    px[i, py0 + 4] = rgb(A)
out.save(f'{DST}/maszynka_baza.png')

for name in ('mikstura', 'owoc'):
    _, o = shifted(name)
    o.save(f'{DST}/maszynka_{name}.png')
print('ok', out.size)
