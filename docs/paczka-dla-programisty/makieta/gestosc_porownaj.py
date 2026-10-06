# Dysonans gęstości pikseli: świat z generatora vs postacie od grafika. Skala wyjścia: 1 px mapy = 4 px ekranu (1 px obrazu generatora = 0,5 px mapy = 2 px ekranu).
from PIL import Image, ImageDraw, ImageFont
import numpy as np
swiat = Image.open('/home/claude/karczma/surowe_0.png').convert('RGBA').crop((40, 30, 430, 230))  # px obrazu generatora
klatka = Image.open('/home/claude/erpeg/public/postacie/bohater_07.png').convert('RGBA').crop((64, 64, 128, 128))  # bok, stoi
E = 2  # px ekranu na px obrazu generatora
def postac_gladka(im, x, y):  # jak w grze dziś: skala 0.36 (px mapy) → ×4 ekran, filtr LINEAR
    s = klatka.resize((round(64 * 0.36 * 4), round(64 * 0.36 * 4)), Image.BILINEAR)
    im.alpha_composite(s, (x - s.width // 2, y - round(62 * 0.36 * 4)))
def postac_siatka(im, x, y, wys_px):  # przepróbkowana do siatki świata (wys_px = wysokość postaci w px obrazu), twarde krawędzie, potem ×E
    k = wys_px / 58
    s = klatka.resize((round(64 * k), round(64 * k)), Image.BOX)
    a = np.asarray(s).copy(); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); s = Image.fromarray(a)
    s = s.resize((s.width * E, s.height * E), Image.NEAREST)
    im.alpha_composite(s, (x - s.width // 2, y - round(62 * k) * E))
def panel(tryb):
    if tryb == 'dzis':  # świat malowany ok. 3,3× grubiej niż w specyfikacji (1 px ≈ 1,67 px mapy) i powiększany
        g = swiat.resize((round(swiat.width / 3.33), round(swiat.height / 3.33)), Image.BOX)
        im = g.resize((swiat.width * E, swiat.height * E), Image.NEAREST)
    else:
        im = swiat.resize((swiat.width * E, swiat.height * E), Image.NEAREST)
    x, y = 300, 330
    if tryb in ('dzis', 'A'): postac_gladka(im, x, y)
    elif tryb == 'B': postac_siatka(im, x, y, 46)
    else: postac_siatka(im, x, y, 58)
    return im
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
P = [('Dziś: świat ok. 3× grubszy niż w makietach, postać gładka', 'dzis'), ('A: świat w gęstości z makiet (1 px = 0,5 px mapy)', 'A'),
     ('B: A + postać na tej samej siatce, ta sama wielkość', 'B'), ('C: A + postać 1:1 z arkusza (o 25% większa)', 'C')]
ims = [panel(t) for _, t in P]; w, h = ims[0].size
o = Image.new('RGB', (w * 2 + 20, (h + 44) * 2), (32, 32, 32)); d = ImageDraw.Draw(o)
for i, ((t, _), im) in enumerate(zip(P, ims)):
    x0, y0 = (i % 2) * (w + 20), (i // 2) * (h + 44)
    d.text((x0 + 6, y0 + 10), t, font=f, fill=(240, 230, 200)); o.paste(im.convert('RGB'), (x0, y0 + 44))
o.save('gestosc_pikseli.png'); print(o.size)
