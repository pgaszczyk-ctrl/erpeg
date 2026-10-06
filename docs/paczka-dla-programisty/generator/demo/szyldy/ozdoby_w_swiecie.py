from PIL import Image, ImageDraw, ImageFont, ImageChops
W_ = 'wyr/'
def kl(n, i=0, tw=None):
    im = Image.open(W_ + n + '.png').convert('RGBA'); tw = tw or im.width
    return im.crop((i * tw, 0, (i + 1) * tw, im.height))
hero = Image.open('/home/claude/karczma/ranger96.png').convert('RGBA').crop((32, 0, 64, 32)).resize((48, 48), Image.NEAREST)
def obroc(spr, kat):  # obrót „pikselowy”: ×4 najbliższy sąsiad → obrót → ×1/4 najbliższy sąsiad (bez rozmycia)
    if not kat: return spr
    big = spr.resize((spr.width * 4, spr.height * 4), Image.NEAREST).rotate(kat, Image.NEAREST, expand=True)
    return big.resize((big.width // 4, big.height // 4), Image.NEAREST)
def stoj(im, spr, x, y):
    im.alpha_composite(spr, (int(x - spr.width / 2), int(y - spr.height + 1)))
def osadz(im, spr, x, y, kat=0, cien=(4, 3), stopa=True):
    spr = obroc(spr, kat)
    if stopa:  # zacienienie dachu tuż pod podstawą (miękka plama, mnożenie) – przedmiot „siedzi” na połaci
        m = Image.new('RGBA', im.size, (255, 255, 255, 255)); d = ImageDraw.Draw(m); w = spr.width * 0.6
        for r, v in ((1.0, 205), (0.75, 175), (0.5, 150)): d.ellipse([x - w * r, y - 3 * r, x + w * r + 2, y + 2 * r + 1], fill=(v, v - 6, v - 10, 255))
        im.paste(ImageChops.multiply(im, m), (0, 0))
    # cień rzucony na dach (światło z lewej-góry → w prawo-dół)
    a = spr.getchannel('A').point(lambda v: 110 if v else 0)
    c = Image.new('RGBA', spr.size, (24, 18, 30, 255)); c.putalpha(a)
    stoj(im, c, x + cien[0], y + cien[1])
    stoj(im, spr, x, y)
def scena(wersja, noc=False):
    im = Image.open(f'/home/claude/karczma/surowe_{1 if noc else 0}.png').convert('RGBA'); k = 1 if noc else 0
    if wersja == 'przed':
        stoj(im, kl('ozdoba_kociol'), 190, 78); stoj(im, kl('ozdoba_wentylator', 0, 16), 70, 74); stoj(im, kl('ozdoba_wentylator', 0, 16), 120, 70)
        for mx in (52, 168): stoj(im, kl('ozdoba_manometr'), mx, 124)
        px, py = 344, 152; s = kl('szyld_slup_ramie', k, 26).transpose(Image.FLIP_LEFT_RIGHT); stoj(im, s, px + 7, py); stoj(im, kl('szyld_tablica_sklep_28'), px + 1, py - 7)
        t = kl('szyld_slup_tablica', k, 12); stoj(im, t, 414, 156); stoj(im, kl('szyld_tablica_sklep_28'), 414, 156 - 46 + 30)
        lampy = [(px + 2, py - 44), (414, 114)]
    else:
        # dach: przechył zgodny ze spadkiem połaci (południowa połać opada do widza) + cień + osadzenie; kocioł wzdłuż kalenicy
        osadz(im, kl('ozdoba_kociol'), 190, 80, kat=-4); osadz(im, kl('ozdoba_wentylator', 0, 16), 70, 76, kat=6); osadz(im, kl('ozdoba_wentylator', 1, 16), 122, 72, kat=-5)
        for mx in (52, 168): osadz(im, kl('ozdoba_manometr'), mx, 124, cien=(1, 1), stopa=False)
        # kamienica: drzwi przy x≈306 (na ziemi) – słup tuż po prawej od drzwi, ramię w stronę ulicy, tablica obok wejścia (nie zasłania drzwi)
        px, py = 316, 142
        s = kl('szyld_slup_ramie_54', k, 29); osadz(im, s, px + 8, py, cien=(5, 3), stopa=False)
        stoj(im, kl('szyld_tablica_sklep_22'), px + 13, py - 54 + 33)
        # domek: drzwi przy x≈378 – słup z tablicą tuż po lewej od drzwi, na ziemi przed ścianą
        tx, ty = 358, 148
        osadz(im, kl('szyld_slup_tablica_54', k, 14), tx, ty, cien=(5, 3), stopa=False); stoj(im, kl('szyld_tablica_sklep_22'), tx, ty - 54 + 30)
        lampy = [(px + 1, py - 50), (tx, ty - 50)]
    if noc:
        sw = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sw)
        for (lx, ly) in lampy:
            for r in range(30, 0, -3): d.ellipse([lx - r * 1.2, ly + 30 - r * 0.6, lx + r * 1.2, ly + 30 + r * 0.9], fill=(255, 170, 80, 14 + int((30 - r) * 1.8)))
        im = Image.alpha_composite(im, sw)
    stoj(im, hero if not noc else ImageChops.multiply(hero, Image.new('RGBA', hero.size, (130, 130, 175, 255))), 232, 186)
    return im
K = 3
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
pan = [('Przed: ozdoby „naklejone”, szyldy duże i z dala od drzwi', scena('przed')), ('Po: cień, osadzenie i lekki przechył na dachu; słup wyższy, tablica mniejsza, przy drzwiach', scena('po')), ('Po, noc', scena('po', True))]
w, h = pan[0][1].size
o = Image.new('RGB', (w * K, (h * K + 50) * len(pan)), (32, 32, 32)); d = ImageDraw.Draw(o)
for i, (t, im) in enumerate(pan):
    y = i * (h * K + 50); d.text((8, y + 12), t, font=f, fill=(240, 230, 200)); o.paste(im.resize((w * K, h * K), Image.NEAREST).convert('RGB'), (0, y + 50))
o.save('probka15_poprawki.png'); print(o.size)
# zbliżenia ×5 na dach i szyldy
z = Image.new('RGB', (2 * 220 * 5 + 20, (110 * 5 + 40) * 2), (32, 32, 32)); dz = ImageDraw.Draw(z)
for r, (t, war) in enumerate((('przed', 'przed'), ('po', 'po'))):
    im = scena(war)
    for c, box in enumerate(((20, 30, 240, 140), (210, 30, 430, 140))):
        z.paste(im.crop(box).resize((220 * 5, 110 * 5), Image.NEAREST).convert('RGB'), (c * (220 * 5 + 20), r * (110 * 5 + 40) + 40))
    dz.text((8, r * (110 * 5 + 40) + 8), t, font=f, fill=(240, 230, 200))
z.save('probka15_zblizenia.png')
