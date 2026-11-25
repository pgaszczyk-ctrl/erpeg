#!/usr/bin/env python3
"""Miniatury przedmiotów leżących na ziemi (właściciel, 25.11.2026: łup ma być narysowany kodem na podstawie
ładnego obrazka grafika). Z najlepszego źródła (items_hd → items/duze → items → proby31/sklepy) liczy pikselową
miniaturkę w gęstości świata: dłuższy bok ROZMIAR px (1 px tekstury = ½ px mapy), uśrednianie z przezroczystością,
twarda alfa, najwyżej KOLOROW kolorów, obrys #1e1a24 jak budynki i postacie. Wynik: public/items/ziemia/<id>.png.
Uruchom po dodaniu przedmiotu:  python3 -I scripts/miniatury-ziemia.py [id …]
"""
import os, re, sys
from PIL import Image

ROZMIAR, KOLOROW, PROG_ALFY = 20, 12, 90
OBRYS = (0x1e, 0x1a, 0x24, 255)
KORZEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WYJSCIE = os.path.join(KORZEN, 'public/items/ziemia')


def zrodlo(i):
    for p in ('public/items_hd/%s.png', 'public/items/duze/%s.png', 'public/items/%s.png', 'public/proby31/%s.png', 'public/sklepy/%s.png'):
        f = os.path.join(KORZEN, p % i)
        if os.path.exists(f):
            return f
    return None


def miniatura(plik):
    im = Image.open(plik).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 60 else 0).getbbox()
    im = im.crop(bb)
    w, h = im.size
    s = max(w, h)
    sq = Image.new('RGBA', (s, s))
    sq.paste(im, ((s - w) // 2, (s - h) // 2))
    # uśrednianie z przemnożoną alfą (bez ciemnych obwódek z przezroczystego tła)
    m = sq.convert('RGBa').resize((ROZMIAR, ROZMIAR), Image.BOX).convert('RGBA')
    px = m.load()
    for y in range(ROZMIAR):
        for x in range(ROZMIAR):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= PROG_ALFY else (0, 0, 0, 0)
    # mało kolorów, jak w reszcie świata
    rgb = m.convert('RGB').quantize(KOLOROW, method=Image.Quantize.MEDIANCUT).convert('RGB')
    alfa = m.split()[3]
    m = Image.merge('RGBA', (*rgb.split(), alfa))
    out = Image.new('RGBA', (ROZMIAR + 2, ROZMIAR + 2))
    out.paste(m, (1, 1))
    o = out.load()
    W = ROZMIAR + 2
    pelne = [[o[x, y][3] == 255 for x in range(W)] for y in range(W)]
    for y in range(W):
        for x in range(W):
            if pelne[y][x]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < W and pelne[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OBRYS
    return out


def main():
    tekst = open(os.path.join(KORZEN, 'src/content/przedmioty.ts'), encoding='utf-8').read()
    ids = sys.argv[1:] or sorted(set(re.findall(r"\{\s*id: '([a-z0-9_]+)'", tekst)))
    os.makedirs(WYJSCIE, exist_ok=True)
    brak = []
    for i in ids:
        f = zrodlo(i)
        if not f:
            brak.append(i)
            continue
        miniatura(f).save(os.path.join(WYJSCIE, i + '.png'))
    print('miniatury:', len(ids) - len(brak), '| bez obrazka:', ' '.join(brak) or '–')


main()
