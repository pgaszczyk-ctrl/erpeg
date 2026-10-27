#!/usr/bin/env python3
"""Plansze do zamówienia 44 (grafik): obecne potworki, smoki i postacie stałe/mieszkańcy, każdy podpisany.

    python3 scripts/zamowienie44-plansze.py

Zapisuje docs/poczta/do-grafika/44_lochy_i_3d/obecne_{potworki,smoki,npc,mieszkancy}.png.
Z arkusza 3×3 (64 px) bierze stojącą klatkę z przodu (wiersz 0, kolumna 1) i stojącą z boku.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

R = Path(__file__).resolve().parent.parent
P = R / 'public/postacie'
OUT = R / 'docs/poczta/do-grafika/44_lochy_i_3d'
TLO = (232, 224, 205, 255)
INK = (30, 26, 36, 255)

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except OSError:
    FONT = ImageFont.load_default()


def klatka(plik, wiersz, kol):
    im = Image.open(P / f'{plik}.png').convert('RGBA')
    return im.crop((kol * 64, wiersz * 64, kol * 64 + 64, wiersz * 64 + 64))


def plansza(nazwa, wpisy, skala=3, kolumn=4):
    """wpisy: (podpis, [obrazki])"""
    kom_w = max(sum(o.width for o in ob) * skala + 8 * (len(ob) - 1) for _, ob in wpisy) + 24
    kom_h = max(max(o.height for o in ob) * skala for _, ob in wpisy) + 56
    wierszy = (len(wpisy) + kolumn - 1) // kolumn
    im = Image.new('RGBA', (kom_w * kolumn, kom_h * wierszy), TLO)
    d = ImageDraw.Draw(im)
    for i, (podpis, ob) in enumerate(wpisy):
        x0, y0 = (i % kolumn) * kom_w, (i // kolumn) * kom_h
        d.rectangle((x0 + 2, y0 + 2, x0 + kom_w - 3, y0 + kom_h - 3), outline=(180, 168, 140, 255))
        x = x0 + 12
        for o in ob:
            o2 = o.resize((o.width * skala, o.height * skala), Image.NEAREST)
            im.alpha_composite(o2, (x, y0 + 8 + (kom_h - 56 - o2.height)))
            x += o2.width + 8
        d.text((x0 + 12, y0 + kom_h - 40), podpis, fill=INK, font=FONT)
    im.save(OUT / f'{nazwa}.png')
    print(nazwa, im.size)


def ludzik(podpis, plik):
    return (podpis, [klatka(plik, 0, 1), klatka(plik, 1, 1), klatka(plik, 2, 1)])


def smok(podpis, g, klatki=('stoi_bok_1', 'stoi_przod_1')):
    d = json.loads((R / f'public/swiat/smoki/smok_{g}.json').read_text())
    im = Image.open(R / f'public/swiat/smoki/smok_{g}.png').convert('RGBA')
    w, h = d['komorka']
    kol = im.width // w
    ob = []
    for k in klatki:
        if k in d['klatki']:
            i = d['klatki'].index(k)
            ob.append(im.crop(((i % kol) * w, (i // kol) * h, (i % kol) * w + w, (i // kol) * h + h)))
    return (podpis, ob)


OUT.mkdir(parents=True, exist_ok=True)

plansza('obecne_potworki', [
    ludzik('Chochlik (+ Wielki chochlik)', 'chochlik'),
    ludzik('Bandyta (też wilk/warg – zastępczo!)', 'bandyta'),
    ludzik('Driada', 'driada'),
    ludzik('Zombiak (też wodnik – na niebiesko)', 'zombie'),
    ludzik('Szkielet (też Upiór krypty)', 'szkielet'),
    ludzik('Herszt / Wielki herszt', 'herszt'),
    ludzik('Mosiężny Kozioł (boss)', 'koziol'),
    ludzik('Mechaniczny Gladiator (Arena)', 'gladiator_proba'),
], kolumn=4)

plansza('obecne_smoki', [
    smok('Smok leśny', 'lesny'),
    smok('Smok kwasowy', 'kwasowy'),
    smok('Smok trujący', 'trujacy'),
    smok('Smok ognisty', 'ognisty'),
    smok('Smok górski', 'gorski'),
    smok('Cień smoka (fabuła)', 'cien'),
], skala=1, kolumn=3)

plansza('obecne_npc', [
    ludzik('Mag Albrecht', 'mag'),
    ludzik('Siostra Margo', 'siostra_margo'),
    ludzik('Dziadek Marek', 'dziadek_marek'),
    ludzik('Babcia Iwonka', 'babcia_iwonka'),
    ludzik('Babcia Grażynka', 'babcia_grazynka'),
    ludzik('Luigi', 'luigi'),
    ludzik('Martin', 'martin'),
    ludzik('Woźnica / konduktor / kapitan', 'woznica'),
    ludzik('Gazeciarz', 'gazeciarz_proba'),
    ludzik('Sędzia Areny', 'sedzia_proba'),
    ludzik('Biało-czarny pies', 'pies'),
], kolumn=4)

MIESZKANCY = ['Młoda kobieta', 'Chłopiec', 'Pan z wąsem', 'Babcia', 'Młody mężczyzna', 'Dziewczynka z warkoczykami',
              'Chłopiec 2', 'Kobieta', 'Mężczyzna', 'Starszy pan', 'Dziewczynka', 'Urwis', 'Starsza pani',
              'Starszy pan w kapeluszu', 'Mieszczka']
plansza('obecne_mieszkancy', [ludzik(f'{i + 1:02d} {n}', f'mieszkaniec_{i + 1:02d}') for i, n in enumerate(MIESZKANCY)], kolumn=5)
