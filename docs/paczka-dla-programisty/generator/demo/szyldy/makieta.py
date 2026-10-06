from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import math
S = Image.open('scena.png').convert('RGBA')
W, H = S.size
OUT = (0x1e, 0x1a, 0x24, 255)
IRON, IRON_HI = (0x3a, 0x34, 0x40, 255), (0x6e, 0x66, 0x74, 255)
BRASS, BRASS_HI = (0xb0, 0x7a, 0x2c, 255), (0xf0, 0xc8, 0x6a, 255)

def szyld(nazwa, w=26):
    im = Image.open(f'../../../../../../public/swiat/szyld_{nazwa}.png').convert('RGBA')
    bb = im.getbbox(); im = im.crop(bb)
    h = round(im.height * w / im.width)
    m = im.resize((w, h), Image.BOX)
    a = m.getchannel('A').point(lambda v: 255 if v > 110 else 0); m.putalpha(a)
    return m

SZYLDY = [  # (nazwa, x mocowania przy ścianie, y ramienia, długość ramienia)
    ('sklep', 62, 76, 22),
    ('policja', 170, 78, 22),
]

def obroc(im, kat, piv):
    # obrót wokół punktu zawieszenia (piv), bez wygładzania – piksele zostają ostre
    return im.rotate(kat, resample=Image.NEAREST, center=piv, expand=False)

def wsporniki(d, x, y, L, noc=False):
    # ramię: od ściany w prawo, z ukośną zastrzałą i zawijasem na końcu
    d.line([(x, y), (x + L, y)], fill=OUT, width=3)
    d.line([(x, y), (x + L, y)], fill=IRON, width=1)
    d.line([(x + 1, y - 1), (x + L - 1, y - 1)], fill=IRON_HI)
    d.line([(x, y + 7), (x + 8, y + 1)], fill=OUT, width=2)
    d.point([(x + 4, y + 4), (x + 6, y + 2)], fill=IRON)
    d.rectangle([x - 1, y - 2, x + 1, y + 9], fill=OUT); d.line([(x, y - 1), (x, y + 8)], fill=IRON_HI)
    d.point([(x + L + 1, y - 1), (x + L + 2, y), (x + L + 1, y + 1)], fill=OUT)  # zawijas

def latarnia(d, x, y, swieci):
    d.rectangle([x - 2, y + 1, x + 2, y + 6], fill=OUT)
    d.rectangle([x - 1, y + 2, x + 1, y + 5], fill=(0xff, 0xd8, 0x80, 255) if swieci else (0x5a, 0x5e, 0x6a, 255))
    d.line([(x - 2, y), (x + 2, y)], fill=BRASS)
    d.point([(x, y + 7)], fill=BRASS)

def rysuj(baza, kat=0.0, tryb='dzien', zawiasy=True, poswiata=False):
    im = baza.copy()
    if tryb == 'noc':
        noc = Image.new('RGBA', im.size, (70, 80, 140, 255))
        im = ImageChops.multiply(im, noc)
    warstwa = Image.new('RGBA', im.size, (0, 0, 0, 0))
    swiatlo = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for n, (nazwa, x, y, L) in enumerate(SZYLDY):
        s = szyld(nazwa)
        if not zawiasy:  # dziś: szyld na ścianie z poświatą
            px, py = x - s.width // 2 - 4, y - 6
            if poswiata:
                g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
                cx, cy = px + s.width // 2, py + s.height // 2
                for r in range(24, 0, -2):
                    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 200, 90, int(14 + (24 - r) * 3)))
                im = Image.alpha_composite(im, g)
            warstwa.alpha_composite(s, (px, py)); continue
        d = ImageDraw.Draw(warstwa)
        hx = x + L - 3  # punkt zawieszenia na ramieniu
        lancuch = 4
        # szyld + łańcuszki na osobnej warstwie, obrót wokół zawiasu
        k = Image.new('RGBA', im.size, (0, 0, 0, 0)); kd = ImageDraw.Draw(k)
        sx, sy = hx - s.width // 2, y + lancuch + 1
        for cx in (sx + 4, sx + s.width - 5):
            for yy in range(y + 1, sy + 1):
                kd.point((cx, yy), fill=BRASS if (yy - y) % 2 else BRASS_HI)
        k.alpha_composite(s, (sx, sy))
        if tryb == 'dzien':  # błysk: 2–3 jasne piksele na górnej krawędzi, przesuwają się z kołysaniem
            gx = sx + 4 + int((kat + 6) / 12 * (s.width - 10))
            for i, a in enumerate((255, 200, 120)):
                if 0 <= gx + i < W: kd.point((gx + i, sy + 1), fill=(255, 250, 225, a))
        k = obroc(k, kat, (hx, y))
        # cień szyldu na ścianie/chodniku: przesunięty w prawo-dół, półprzezroczysty
        cien = Image.new('RGBA', im.size, (0, 0, 0, 0))
        a = k.getchannel('A').point(lambda v: 70 if v else 0)
        cien.paste((20, 16, 30, 255), (0, 0), a)
        cien = ImageChops.offset(cien, 3, 5)
        im = Image.alpha_composite(im, cien)
        wsporniki(d, x, y, L)
        if tryb == 'noc':
            latarnia(d, x + 7, y - 9, True)
            sd = ImageDraw.Draw(swiatlo)
            lx, ly = x + 7, y - 5
            for r in range(30, 0, -3):  # ciepła plama na ścianie i chodniku – źródłem jest lampka, nie szyld
                sd.ellipse([lx - r * 1.1, ly + 10 - r * 0.7, lx + r * 1.1, ly + 10 + r * 0.9], fill=(255, 170, 80, 12 + int((30 - r) * 1.4)))
        else:
            latarnia(d, x + 7, y - 9, False)
        warstwa.alpha_composite(k)
    if tryb == 'noc':
        im = Image.alpha_composite(im, swiatlo)
        # szyld oświetlony od góry: rozjaśnij górną połowę szyldu
        jasny = warstwa.copy(); r, g, b, a = jasny.split()
        jasny = Image.merge('RGBA', (r.point(lambda v: min(255, v * 1.0)), g, b, a))
        ciem = ImageChops.multiply(warstwa, Image.new('RGBA', im.size, (150, 140, 170, 255)))
        maska = Image.new('L', im.size, 0); md = ImageDraw.Draw(maska)
        for (nazwa, x, y, L) in SZYLDY: md.rectangle([x - 10, y - 15, x + L + 20, y + 14], fill=255)
        maska = maska.filter(ImageFilter.GaussianBlur(4))
        warstwa = Image.composite(warstwa, ciem, maska)
    return Image.alpha_composite(im, warstwa)

K = 3
def duze(im): return im.resize((im.width * K, im.height * K), Image.NEAREST)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
panele = [('Dziś: szyld na ścianie + złota poświata', rysuj(S, zawiasy=False, poswiata=True)),
          ('Propozycja, dzień: wspornik, łańcuszki, cień, błysk', rysuj(S, 0)),
          ('Dziś nocą (poświata świeci sama z siebie)', rysuj(S, zawiasy=False, poswiata=True, tryb='noc')),
          ('Propozycja, noc: świeci lampka, nie szyld', rysuj(S, 0, 'noc'))]
pw, ph = W * K, H * K
o = Image.new('RGB', (pw * 2 + 30, (ph + 50) * 2 + 10), (32, 32, 32)); d = ImageDraw.Draw(o)
for i, (t, im) in enumerate(panele):
    x0, y0 = (i % 2) * (pw + 30), (i // 2) * (ph + 50)
    d.text((x0 + 4, y0 + 12), t, font=f, fill=(240, 230, 200)); o.paste(duze(im).convert('RGB'), (x0, y0 + 44))
o.save('szyldy_porownanie.png')
# GIF: kołysanie (wiatr) – łagodna sinusoida ±5°, dzień i noc obok siebie
klatki = []
for i in range(24):
    kat = 5 * math.sin(i / 24 * 2 * math.pi)
    a = duze(rysuj(S, kat)).convert('RGB'); b = duze(rysuj(S, kat, 'noc')).convert('RGB')
    c = Image.new('RGB', (pw * 2 + 20, ph), (32, 32, 32)); c.paste(a, (0, 0)); c.paste(b, (pw + 20, 0)); klatki.append(c.quantize(256))
klatki[0].save('szyldy_kolysanie.gif', save_all=True, append_images=klatki[1:], duration=90, loop=0)
print('ok')
