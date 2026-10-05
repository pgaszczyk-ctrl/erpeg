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

# Bottom row: clear the three v1 buttons, put the camera (v1 button 2) and a new quest-log button.
by = 44 + E
for j in range(by, by + 15):
    for i in range(0, 48):
        px[i, j] = (0, 0, 0, 0)
cam = src.crop((17, 44, 32, 59))
frame = src.crop((1, 44, 16, 59))
out.paste(cam, (9, by), cam)
out.paste(frame, (26, by), frame)
# Scroll icon inside the quest-log button (inner 9×9 at +3,+3).
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
col = {'A': A, 'E': Ee, 'F': F}
rect(26 + 3, by + 3, 9, 9, H)
for j, row in enumerate(scroll):
    for i, ch in enumerate(row):
        if ch in col:
            px[26 + 3 + i, by + 3 + j] = rgb(col[ch])

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
out.save(f'{DST}/maszynka_baza.png')

for name in ('mikstura', 'owoc'):
    _, o = shifted(name)
    o.save(f'{DST}/maszynka_{name}.png')
print('ok', out.size)
