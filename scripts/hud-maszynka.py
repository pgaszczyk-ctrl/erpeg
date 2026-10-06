#!/usr/bin/env python3
"""HUD "maszynka" v2 (owner, 5 Oct 2026): taller tubes, an avatar frame over the heal button
(linked to the tubes by a brass pipe), and two buttons at the bottom: camera + quest log.
Built from the mock-up's v1 pictures kept in scripts/hud-v1/ (70×60); writes public/hud/maszynka_*.png ((70+L)×(60+E)).
v3 (owner, 6 Oct 2026: "niechlujnie"): avatar, heal button and quest log in one column with equal gaps G, the camera
left of the quest log, both on a brass rail into the tubes' foot."""
from PIL import Image
import os

E = 30                      # extra rows on top
H0 = 60 + E                 # picture height
SRC = 'scripts/hud-v1'
DST = 'public/hud'
A, B, C, D, Ee, F, H, I = '#1a110b', '#e2b25a', '#b8893b', '#1f2a2c', '#f1e3c2', '#6b4a1f', '#2e2017', '#3d2e22'
rgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)

L = 16                      # extra columns on the left (6 Oct 2026: room for the camera left of the column)
W = 70 + L
G = 8                       # the same gap everywhere: avatar / heal / bottom buttons, and camera / quest log
AY = 2                      # avatar frame top (26 high)
HY = AY + 26 + G            # heal button top (26 high)
BY = HY + 26 + G            # bottom buttons top (20 high), bottom edge = the tubes' bottom
assert BY + 20 == H0, BY
CX = L + 11                 # the column's left edge (avatar and heal are 26 wide, centre CX + 12.5)
N = 20
QX = CX + 3                 # quest log button under the column (20 wide, same centre)
KX = QX - G - N             # camera left of it

v1 = {n: Image.open(f'{SRC}/maszynka_{n}.png').convert('RGBA') for n in ('baza', 'mikstura', 'owoc')}

def left_part(name):
    """The v1 heal button with its pipe and gauge (rows 0..43, x 0..48), moved to the column."""
    return v1[name].crop((0, 0, 49, 44))

src = v1['baza']
out = Image.new('RGBA', (W, H0))
px = out.load()
def rect(x, y, w, h, col):
    for j in range(y, y + h):
        for i in range(x, x + w):
            px[i, j] = rgb(col)

# Tubes (x 49..68 in v1): cap stays on top, the glass row 7 is repeated E times.
TX = 49 + L
out.paste(src.crop((49, 0, 70, 7)), (TX, 0))
for y in range(7, 7 + E):
    out.paste(src.crop((49, 7, 70, 8)), (TX, y))
out.paste(src.crop((49, 7, 70, 60)), (TX, 7 + E))

def hpipe(x0, x1, y):
    """A horizontal brass pipe 5 px thick (outline, light, brass, dark, outline)."""
    for i in range(x0, x1):
        for k, col in enumerate((A, B, C, F, A)):
            px[i, y + k] = rgb(col)
def vpipe(x, y0, y1):
    for j in range(y0, y1):
        for k, col in enumerate((A, B, C, F, A)):
            px[x + k, j] = rgb(col)
def flange_h(x, y):  # a collar on a horizontal pipe
    rect(x, y - 1, 3, 7, A)
    rect(x + 1, y, 1, 5, B)
def flange_v(x, y):  # a collar on a vertical pipe
    rect(x - 1, y, 7, 3, A)
    rect(x, y + 1, 5, 1, B)

# The column's spine: short pipes avatar → heal → quest log (drawn first, the parts cover their ends).
vx = CX + 13 - 2
vpipe(vx, AY + 25, HY + 1)
vpipe(vx, HY + 25, BY + 1)
flange_v(vx, AY + 26 + G // 2 - 1)
flange_v(vx, HY + 26 + G // 2 - 1)
# The bottom rail: one pipe from the camera through the quest log into the tubes' foot.
ry = BY + N // 2 - 2
hpipe(KX + 2, TX + 1, ry)
flange_h(KX + N + G // 2 - 1, ry)
flange_h(TX - 4, ry)

# The heal button with its pipe and gauge (v1), moved down to its place in the column.
HOFF = (L, HY - 9)
lp = left_part('baza')
out.alpha_composite(lp, HOFF)

# Avatar frame (26×26): outline, light brass top/left, brass, dark bottom, dark inside.
ax, ay, aw = CX, AY, 26
rect(ax + 1, ay, aw - 2, aw, A)
rect(ax, ay + 1, aw, aw - 2, A)
rect(ax + 1, ay + 1, aw - 2, aw - 2, C)
rect(ax + 1, ay + 1, aw - 2, 1, B)
rect(ax + 1, ay + 1, 1, aw - 2, B)
rect(ax + 1, ay + aw - 2, aw - 2, 1, F)
rect(ax + 3, ay + 3, aw - 6, aw - 6, A)
rect(ax + 4, ay + 4, aw - 8, aw - 8, H)
for (i, j) in [(ax + 2, ay + 2), (ax + aw - 3, ay + 2), (ax + 2, ay + aw - 3), (ax + aw - 3, ay + aw - 3)]:
    px[i, j] = rgb(Ee)
# Brass pipe from the avatar to the tubes, with a flange…
py0 = ay + 10
hpipe(ax + aw, TX + 1, py0)
flange_h(TX - 7, py0)
# …and on behind the red tube (life) into the gold one (experience): seen in the gap between them.
for i in (TX + 9, TX + 10):
    for k, col in enumerate((A, B, C, F, A)):
        px[i, py0 + k] = rgb(col)

# Bottom buttons: 20×20, a 2 px brass frame and the artist's 16×16 icon filling the inside.
ICONS = 'scripts/hud-ikony'
def button(x0, y0, name):
    icon = Image.open(f'{ICONS}/{name}_16.png').convert('RGBA')
    for j in range(N):
        for i in range(N):
            edge = min(i, j, N - 1 - i, N - 1 - j)
            if edge == 0:
                if (i in (0, N - 1)) and (j in (0, N - 1)):
                    continue  # rounded corners
                px[x0 + i, y0 + j] = rgb(A)
            elif edge == 1:
                px[x0 + i, y0 + j] = rgb(B if (i == 1 or j == 1) and i < N - 2 and j < N - 2 else C)
            else:
                c = icon.getpixel((i - 2, j - 2))
                px[x0 + i, y0 + j] = c if c[3] else rgb(I)
button(KX, BY, 'aparat')
button(QX, BY, 'dziennik')
out.save(f'{DST}/maszynka_baza.png')

o = Image.new('RGBA', (W, H0))
o.alpha_composite(left_part('mikstura'), HOFF)
o.save(f'{DST}/maszynka_mikstura.png')
# The fruit heal: the artist's apple (16×16) in the middle of the round heal button.
o = Image.new('RGBA', (W, H0))
apple = Image.open(f'{ICONS}/owoc_jablko_16.png').convert('RGBA')
o.alpha_composite(apple, (CX + 13 - 8, HY + 13 - 8))
o.save(f'{DST}/maszynka_owoc.png')
print('ok', out.size, 'L', L, 'HY', HY, 'BY', BY, 'KX', KX, 'QX', QX)
