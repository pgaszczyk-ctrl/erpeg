from PIL import Image, ImageDraw, ImageFont
K = 4
E = [  # (plik, opis, szer, wys, klatki, grupa)
 ('ozdoba_manometr','manometr',8,10,1,'A'),('ozdoba_zawor','zawór z kółkiem',9,9,1,'A'),('ozdoba_lampa_scienna','lampa ścienna',7,10,2,'A'),
 ('ozdoba_zegar','zegar',10,10,1,'A'),('ozdoba_zebatka','zębatka',11,11,1,'A'),('ozdoba_bulaj','okno-bulaj',8,8,1,'A'),
 ('ozdoba_rura_pozioma','rura (kawałek)',8,4,1,'A'),('ozdoba_rura_kolanko','kolanko rury',6,6,1,'A'),('ozdoba_rura_spod_ziemi','rura spod ziemi',8,14,1,'A'),
 ('ozdoba_zbiornik_scienny','zbiornik przy ścianie',8,16,1,'A'),('ozdoba_poczta_rura','poczta pneum. – rura',4,8,1,'A'),('ozdoba_poczta_skrzynka','poczta – skrzynka',8,7,1,'A'),
 ('ozdoba_kratka_parowa','kratka w chodniku',10,6,1,'A'),
 ('ozdoba_kociol','kocioł',17,11,1,'B'),('ozdoba_komin_zelazny','komin żelazny',6,17,1,'B'),('ozdoba_wentylator','wentylator',11,11,3,'B'),
 ('ozdoba_swietlik','świetlik zębaty',12,12,1,'B'),('ozdoba_luneta','luneta',19,15,1,'B'),('ozdoba_kopula','kopuła obserwatorium',16,11,1,'B'),
 ('ozdoba_zbiornik_wody','zbiornik wody',10,16,1,'B'),('ozdoba_antena_tesli','antena Tesli',11,24,2,'B'),('ozdoba_anemometr','anemometr',15,19,3,'B'),
 ('szyld_slup_tablica','słup pod tablicę',8,46,2,'C'),('szyld_slup_ramie','słup z ramieniem',24,48,2,'C'),('szyld_tablica_*','tablica (12 rodzajów)',24,22,1,'C'),
]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15); fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
CW, CH, KOL = 250, 290, 6
GR = {'A': 'A – na ścianie / przy ścianie (widok na wprost ściany)', 'B': 'B – na dachu (widok z góry z ukosa, jak drzewa)', 'C': 'C – szyldy: słup na rogu budynku + wymienna tablica'}
wiersze = []
for g in 'ABC':
    el = [e for e in E if e[5] == g]; wiersze.append(('t', GR[g]))
    for i in range(0, len(el), KOL): wiersze.append(('e', el[i:i+KOL]))
H = sum(50 if t == 't' else CH for t, _ in wiersze) + 40
o = Image.new('RGB', (KOL * CW + 300, H), (255, 0, 255)); d = ImageDraw.Draw(o)
d.rectangle([0, 0, o.width, 36], fill=(32, 32, 32)); d.text((10, 6), 'Szablon ozdób: 1 piksel gry = kwadrat 4×4 px; ramka = docelowy rozmiar; tło magenta #FF00FF', font=fb, fill=(240, 230, 200))
y = 40
for t, v in wiersze:
    if t == 't': d.rectangle([0, y, KOL * CW, y + 46], fill=(32, 32, 32)); d.text((10, y + 10), v, font=fb, fill=(240, 230, 200)); y += 50; continue
    for i, (p, opis, w, h, kl, g) in enumerate(v):
        x0 = i * CW; d.rectangle([x0 + 2, y + 2, x0 + CW - 2, y + CH - 2], outline=(120, 0, 120), width=2)
        bw, bh = w * K, h * K
        if bh > CH - 60: k2 = (CH - 60) / bh; bw, bh = int(bw * k2), int(bh * k2)
        bx, by = x0 + (CW - bw) // 2, y + 10 + (CH - 60 - bh)
        for gx in range(bx, bx + bw + 1, K * (1 if bh == h * K else 1)): d.line([(gx, by), (gx, by + bh)], fill=(230, 120, 230))
        for gy in range(by, by + bh + 1, K): d.line([(bx, gy), (bx + bw, gy)], fill=(230, 120, 230))
        d.rectangle([bx, by, bx + bw, by + bh], outline=(30, 26, 36), width=2)
        d.text((x0 + 8, y + CH - 48), f'{opis}', font=f, fill=(20, 16, 30)); d.text((x0 + 8, y + CH - 28), f'{w}×{h} px gry' + (f', {kl} klatki' if kl > 1 else '') + ('' if bh == h * K else ' (pomniejsz.)'), font=f, fill=(20, 16, 30))
    y += CH
hero = Image.open('/home/claude/wiezowce/ranger96.png').convert('RGBA').crop((32, 0, 64, 32)).resize((48 * K, 48 * K), Image.NEAREST)
hx = KOL * CW + 50; o.paste(hero, (hx, 120), hero)
d.text((hx - 20, 120 + 48 * K + 8), 'bohaterka w tej skali\n(48 px gry wysokości)', font=f, fill=(20, 16, 30))
d.rectangle([hx - 10, 480, hx + 210, 480 + 8 * K], fill=(220, 210, 180), outline=(30, 26, 36), width=2)
d.text((hx - 20, 480 + 8 * K + 6), 'ściana parteru = 8 px gry\n(+4 px na każde piętro)', font=f, fill=(20, 16, 30))
o.save('szablon_ozdob_x4.png'); print(o.size)
