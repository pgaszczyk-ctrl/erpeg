"""Plansze do zamówienia 50-P002: szablon wielkości w klatce 96x96 (jak 50-P001) i porównanie wielkości w pikselach świata.
1 piksel świata = 0,5 jednostki mapy; bohater ma 0,25 jednostki na piksel arkusza, więc arkusz 64 px / 2 = świat."""
import sys
from PIL import Image, ImageDraw, ImageFont

OUT = 'docs/poczta/do-grafika/50_wielkosc_kat/'
SRC = sys.argv[1] if len(sys.argv) > 1 else None  # obrazek właściciela z propozycją 48 px
FONT = ImageFont.load_default()
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except OSError:
    pass

def polowa(fr):
    """Arkusz 64 px -> piksele świata: średnia z bloków 2x2, twarda alfa (jak naSiatke)."""
    w, h = fr.size
    out = Image.new('RGBA', (w // 2, h // 2))
    px = fr.load()
    for y in range(h // 2):
        for x in range(w // 2):
            b = [px[2 * x + i, 2 * y + j] for i in (0, 1) for j in (0, 1)]
            op = [p for p in b if p[3] > 110]
            if len(op) >= 2:
                out.putpixel((x, y), tuple(sum(p[k] for p in op) // len(op) for k in range(3)) + (255,))
    return out

def napis(d, xy, t, c=(30, 26, 36)):
    d.text(xy, t, fill=c, font=FONT)

# 1-2. Szablon x6: jedna klatka 96x96 z 50-P001 (stopy w wierszu 90, środek w kolumnie 48),
# obecny Strażnik w pikselach świata jako wzór i linie wysokości: dziś 27 px, górna granica 34 px (1,25x).
Z = 6
bh = Image.open('public/postacie/lista25_06.png').convert('RGBA')
kl = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
d = ImageDraw.Draw(kl)
d.line([(0, 90), (95, 90)], fill=(255, 0, 255, 255))
d.line([(0, 90 - 27), (95, 90 - 27)], fill=(0, 200, 255, 200))
d.line([(0, 90 - 34), (95, 90 - 34)], fill=(255, 140, 0, 220))
d.line([(48, 0), (48, 95)], fill=(255, 200, 0, 90))
kl.save(OUT + 'szablon_klatka_96_1do1.png')
duzy = Image.new('RGBA', (96 * Z + 300, 96 * Z + 30), (238, 230, 210, 255))
fr = polowa(bh.crop((64, 0, 128, 64)))  # stopy w wierszu 31 -> 90
fr.putalpha(fr.split()[3].point(lambda v: v * 0.45))
duzy.alpha_composite(fr.resize((32 * Z, 32 * Z), Image.NEAREST), ((48 - 16) * Z, 30 + (90 - 31) * Z))
d = ImageDraw.Draw(duzy)
for i in range(97):
    col = (200, 190, 170)
    d.line([(i * Z, 30), (i * Z, 30 + 96 * Z)], fill=col)
    d.line([(0, 30 + i * Z), (96 * Z, 30 + i * Z)], fill=col)
for y, c in [(90, (255, 0, 255)), (90 - 27, (0, 160, 220)), (90 - 34, (230, 120, 0))]:
    d.line([(0, 30 + y * Z), (96 * Z, 30 + y * Z)], fill=c, width=3)
napis(d, (4, 6), 'Klatka 96x96 (x6). Wzór = obecny Strażnik w pikselach świata.')
lx = 96 * Z + 12
for i, t in enumerate(['różowy: stopy (wiersz 90)', 'niebieski: dziś 27 px', 'pomarańczowy: najwyżej 34 px',
                       '(1,25x obecnego bohatera)', '', 'propozycja 48 px sięgałaby', 'do wiersza 42 - za wysoko']):
    napis(d, (lx, 60 + i * 26), t)
duzy.save(OUT + 'szablon_klatka_x6.png')

# 3. Porównanie wielkości w pikselach świata (x6): obecny bohater vs propozycja 48 px
Z = 6
tlo = (122, 142, 88, 255)
por = Image.new('RGBA', (110 * Z, 70 * Z), tlo)
d = ImageDraw.Draw(por)
teraz = polowa(bh.crop((64, 0, 128, 64)))
por.alpha_composite(teraz.resize((32 * Z, 32 * Z), Image.NEAREST), (8 * Z, 30 * Z))
if SRC:
    im = Image.open(SRC).convert('RGBA').crop((88, 92, 392, 446))  # duża postać A z planszy
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, _ = px[x, y]
            if abs(r - 30) < 14 and abs(g - 33) < 14 and abs(b - 42) < 16:
                px[x, y] = (0, 0, 0, 0)
    bb = im.getbbox(); im = im.crop(bb)
    s = 48 / im.size[1]
    m = im.resize((max(1, round(im.size[0] * s)), 48), Image.NEAREST)
    por.alpha_composite(m.resize((m.size[0] * Z, 48 * Z), Image.NEAREST), (52 * Z, 14 * Z))
d.line([(0, 62 * Z), (110 * Z, 62 * Z)], fill=(30, 26, 36), width=2)
napis(d, (8 * Z, 22 * Z), 'teraz w grze (~27 px)', (255, 255, 255))
napis(d, (52 * Z, 6 * Z), 'propozycja 48 px (~1,8x)', (255, 255, 255))
napis(d, (4, 64 * Z), 'Ta sama skala: 1 px obrazka = 1 px świata. Powiększenie x6.', (255, 255, 255))
por.save(OUT + 'porownanie_wielkosci_x6.png')
print('ok')
