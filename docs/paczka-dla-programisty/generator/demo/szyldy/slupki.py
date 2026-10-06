from PIL import Image, ImageDraw, ImageChops, ImageFont
import math
exec(open('makieta.py').read().split("SZYLDY = [")[0])  # S, W, H, kolory, szyld()
hero = Image.open('/home/claude/wiezowce/ranger96.png').convert('RGBA').crop((32, 0, 64, 32)).resize((48, 48), Image.NEAREST)
POD = (0x8a, 0x84, 0x7a, 255); POD_C = (0x5c, 0x56, 0x52, 255)

def cien_linii(c, x, y0, dl):  # cień słupka na ziemi: na prawo-w dół, jak cienie budynków
    for t in range(dl):
        c.point((x + 1 + int(t * 0.8), y0 + int(t * 0.45)), fill=(20, 16, 30, 80))
        c.point((x + 2 + int(t * 0.8), y0 + int(t * 0.45)), fill=(20, 16, 30, 80))

def slup(d, x, yz, h):  # żeliwny słup: stopa, trzon, gałka
    d.rectangle([x - 3, yz - 3, x + 3, yz], fill=OUT); d.rectangle([x - 2, yz - 2, x + 2, yz - 1], fill=POD)
    d.rectangle([x - 2, yz - h, x + 1, yz - 3], fill=OUT); d.line([(x - 1, yz - h + 1), (x - 1, yz - 4)], fill=IRON_HI); d.line([(x, yz - h + 1), (x, yz - 4)], fill=IRON)
    for yy in range(yz - h + 6, yz - 6, 9): d.line([(x - 2, yy), (x + 1, yy)], fill=BRASS)  # mosiężne obręcze

def lampa(d, x, y, swieci):
    d.rectangle([x - 3, y - 7, x + 2, y], fill=OUT)
    d.rectangle([x - 2, y - 6, x + 1, y - 1], fill=(0xff, 0xd8, 0x80, 255) if swieci else (0x5a, 0x5e, 0x6a, 255))
    d.line([(x - 3, y - 8), (x + 2, y - 8)], fill=BRASS); d.point((x - 1, y - 9), fill=BRASS)

def scena(wariant, noc):
    im = S.copy()
    if noc: im = ImageChops.multiply(im, Image.new('RGBA', im.size, (70, 80, 140, 255)))
    cien = Image.new('RGBA', im.size, (0, 0, 0, 0)); cd = ImageDraw.Draw(cien)
    w = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(w)
    sw = Image.new('RGBA', im.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sw)
    for nazwa, x, yz in (('sklep', 118, 94), ('policja', 229, 94)):  # róg budynku, na chodniku
        s = szyld(nazwa, 24); h = 44
        cien_linii(cd, x, yz, 26)
        slup(d, x, yz, h)
        if wariant == 'tablica':  # tablica na szczycie słupa
            sx, sy = x - s.width // 2, yz - h - s.height + 6
            w.alpha_composite(s, (sx, sy)); d.rectangle([x - 2, sy + s.height - 1, x + 1, sy + s.height + 1], fill=OUT)
            lampa(d, x, sy - 1, noc); ly = sy - 4
            cd.rectangle([x + 14, yz + 7, x + 30, yz + 13], fill=(20, 16, 30, 60))
        else:  # słup z ramieniem w stronę ulicy, szyld wisi pod ramieniem
            ay = yz - h + 2
            d.line([(x, ay), (x - 16, ay)], fill=OUT, width=3); d.line([(x, ay), (x - 16, ay)], fill=IRON)
            d.line([(x - 1, ay + 6), (x - 7, ay + 1)], fill=OUT, width=2)
            d.point([(x - 17, ay - 1), (x - 18, ay), (x - 17, ay + 1)], fill=OUT)
            hx = x - 10; sx, sy = hx - s.width // 2, ay + 4
            for cx in (sx + 4, sx + s.width - 5):
                for yy in range(ay + 1, sy + 1): d.point((cx, yy), fill=BRASS if (yy - ay) % 2 else BRASS_HI)
            w.alpha_composite(s, (sx, sy))
            lampa(d, x, ay - 2, noc); ly = ay - 5
            cd.rectangle([x + 6, yz + 6, x + 22, yz + 12], fill=(20, 16, 30, 60))
        if not noc:  # błysk na górnej krawędzi tablicy
            for i, a in enumerate((255, 200, 120)): d.point((sx + 5 + i, sy + 1), fill=(255, 250, 225, a))
        else:
            for r in range(34, 0, -3):
                sd.ellipse([x - r * 1.1, ly + 18 - r * 0.6, x + r * 1.1, ly + 18 + r * 1.2], fill=(255, 170, 80, 12 + int((34 - r) * 1.3)))
    im = Image.alpha_composite(im, cien)
    if noc: im = Image.alpha_composite(im, sw)
    hb = hero if not noc else ImageChops.multiply(hero, Image.new('RGBA', hero.size, (120, 120, 170, 255)))
    im = Image.alpha_composite(im, w)
    im.alpha_composite(hb, (150, 118 - 46))  # bohaterka na chodniku przed słupkiem (bliżej widza)
    return im

K = 3
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
pan = [('Słup z tablicą na rogu, dzień', scena('tablica', False)), ('Słup z ramieniem, szyld pod ramieniem, dzień', scena('ramie', False)),
       ('Słup z tablicą, noc – świeci lampka', scena('tablica', True)), ('Słup z ramieniem, noc', scena('ramie', True))]
pw, ph = W * K, H * K
o = Image.new('RGB', (pw * 2 + 30, (ph + 50) * 2), (32, 32, 32)); dd = ImageDraw.Draw(o)
for i, (t, im) in enumerate(pan):
    x0, y0 = (i % 2) * (pw + 30), (i // 2) * (ph + 50)
    dd.text((x0 + 4, y0 + 12), t, font=f, fill=(240, 230, 200)); o.paste(im.resize((pw, ph), Image.NEAREST).convert('RGB'), (x0, y0 + 44))
o.save('szyldy_na_slupkach.png'); print('ok')
