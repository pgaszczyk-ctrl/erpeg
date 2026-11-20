"""Plansze do zamówienia 50-P001: szablon klatki 32x32 i porównanie wielkości w pikselach świata.
1 piksel świata = 0,5 jednostki mapy; bohater ma 0,25 jednostki na piksel arkusza, więc arkusz 64 px / 2 = świat."""
import sys
from PIL import Image, ImageDraw, ImageFont

OUT = 'docs/poczta/do-grafika/50_postac_32/'
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

# 1. Szablon 1:1: arkusz 96x96 = 3x3 klatki 32x32 (wiersze: przód / bok w lewo / tył; kolumny: krok A / stoi / krok B)
sz = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
d = ImageDraw.Draw(sz)
for r in range(3):
    for c in range(3):
        x0, y0 = c * 32, r * 32
        d.line([(x0, y0 + 31), (x0 + 31, y0 + 31)], fill=(255, 0, 255, 255))      # stopy
        d.line([(x0, y0 + 4), (x0 + 31, y0 + 4)], fill=(0, 200, 255, 160))         # czubek głowy
        d.line([(x0 + 16, y0), (x0 + 16, y0 + 31)], fill=(255, 200, 0, 90))        # środek
sz.save(OUT + 'szablon_96x96_1do1.png')

# 2. Szablon x8 z siatką i obecnym bohaterem jako półprzezroczystym wzorem
Z = 8
bh = Image.open('public/postacie/lista25_06.png').convert('RGBA')
duzy = Image.new('RGBA', (96 * Z + 260, 96 * Z + 40), (238, 230, 210, 255))
d = ImageDraw.Draw(duzy)
for r in range(3):
    for c in range(3):
        fr = polowa(bh.crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64)))
        a = fr.split()[3].point(lambda v: v * 0.35)
        fr.putalpha(a)
        duzy.alpha_composite(fr.resize((32 * Z, 32 * Z), Image.NEAREST), (c * 32 * Z, 20 + r * 32 * Z))
for i in range(97):
    col = (30, 26, 36) if i % 32 == 0 else (200, 190, 170)
    d.line([(i * Z, 20), (i * Z, 20 + 96 * Z)], fill=col)
    d.line([(0, 20 + i * Z), (96 * Z, 20 + i * Z)], fill=col)
for r in range(3):
    for c in range(3):
        x0, y0 = c * 32 * Z, 20 + r * 32 * Z
        d.rectangle([x0, y0 + 31 * Z, x0 + 32 * Z, y0 + 32 * Z], outline=(255, 0, 255), width=2)
        d.line([(x0, y0 + 4 * Z), (x0 + 32 * Z, y0 + 4 * Z)], fill=(0, 160, 220), width=2)
napis(d, (4, 2), 'Szablon 3x3 klatek 32x32 (x8). Półprzezroczysty wzór = obecny bohater w pikselach świata.')
lx = 96 * Z + 12
for i, t in enumerate(['wiersz 1: przód', 'wiersz 2: bok (patrzy w lewo)', 'wiersz 3: tył', '',
                       'kolumny: krok A / stoi / krok B', '', 'różowy = rząd stóp (31)',
                       'niebieski = czubek głowy (~4)', 'wysokość postaci 26-28 px']):
    napis(d, (lx, 40 + i * 24), t)
duzy.save(OUT + 'szablon_x8.png')

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
