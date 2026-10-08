"""Wozy konne wyrównane do świata gry (właściciel 5.10.2026), tą samą metodą co
docs/paczka-dla-artysty/8_wyrownanie/wyrownaj.py: zmniejszenie filtrem pudełkowym, kolory
z palety świata, twarda przezroczystość, obrys 1 px #1e1a24 dookoła sylwetki.
Arkusz ma 2 klatki obok siebie; całe klatki (z marginesem) zmniejszamy tak samo, więc wóz w grze zostaje tej samej wielkości.
Docelowo 1 px pliku = 1 px świata (0,5 px mapy): wóz ma w grze 50 px mapy wysokości, więc 100 px.
Użycie: python3 scripts/wyrownaj-wozy.py (oryginały becba21 → osobny folder konie_test26, tylko test)."""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--zrodla', default='scripts/konie-zrodla/test26')
parser.add_argument('--wynik', default='public/swiat/konie_test26')
args = parser.parse_args()
source, target = Path(args.zrodla), Path(args.wynik)
if source.resolve() == target.resolve():
    parser.error('Źródła i wynik muszą być w różnych folderach; nie filtruj powtórnie wyniku.')
target.mkdir(parents=True, exist_ok=True)
pal = np.asarray(Image.open('docs/paczka-dla-artysty/8_wyrownanie/paleta_swiata.png').convert('RGB')).reshape(-1, 3)
pal = np.unique(pal, axis=0).astype(float)
WYS = 100
def wyrownaj(a, w, h):
    a = a.resize((w, h), Image.BOX)
    arr = np.asarray(a).astype(float); al = arr[..., 3] > 128
    q = pal[((arr[:, :, None, :3] - pal[None, None]) ** 2).sum(-1).argmin(-1)]
    out = np.zeros((h + 2, w + 2, 4), np.uint8); out[1:-1, 1:-1, :3] = q; out[1:-1, 1:-1, 3] = al * 255
    A = out[..., 3] > 0
    ring = (~A) & (np.roll(A, 1, 0) | np.roll(A, -1, 0) | np.roll(A, 1, 1) | np.roll(A, -1, 1))
    out[ring] = [0x1e, 0x1a, 0x24, 255]
    return Image.fromarray(out)
for f in sorted(source.glob('woz_konny_*.png')):
    im = Image.open(f).convert('RGBA'); fw = im.width // 2
    kl = [im.crop((i * fw, 0, (i + 1) * fw, im.height)) for i in range(2)]
    h = WYS; w = round(kl[0].width * h / kl[0].height)
    wy = [wyrownaj(k, w, h) for k in kl]
    out = Image.new('RGBA', (wy[0].width * 2, wy[0].height))
    for i, k in enumerate(wy): out.paste(k, (i * k.width, 0))
    out.save(target / f.name)
    print(target / f.name, out.size)
