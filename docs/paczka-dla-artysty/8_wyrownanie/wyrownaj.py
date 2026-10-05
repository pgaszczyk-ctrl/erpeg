"""Wyrównanie grafiki do świata gry (pojazdy, zabytki, szyldy).
Użycie: python3 wyrownaj.py wejscie.png wyjscie.png DLUGOSC_PX
0) tło w jednym kolorze (np. magenta #FF00FF) zamienia na przezroczyste, 1) przycina do zawartości, 2) zmniejsza do DLUGOSC_PX szerokości (filtr pudełkowy),
3) każdy piksel zamienia na najbliższy kolor z palety świata (paleta_swiata.png),
4) przezroczystość twarda (0 albo 255), 5) obrys 1 px #1e1a24 dookoła sylwetki."""
import sys, numpy as np
from PIL import Image
src, dst, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
pal = np.asarray(Image.open(__file__.rsplit('/', 1)[0] + '/paleta_swiata.png').convert('RGB')).reshape(-1, 3)
pal = np.unique(pal, axis=0).astype(float)
a = Image.open(src).convert('RGBA')
# tło: przezroczyste, a jeśli go nie ma – kolor z rogów (np. magenta #FF00FF od generatora obrazów) zamieniamy na przezroczystość
arr0 = np.asarray(a).astype(int)
if arr0[..., 3].min() == 255:
    rog = np.median(np.array([arr0[0, 0, :3], arr0[0, -1, :3], arr0[-1, 0, :3], arr0[-1, -1, :3]]), axis=0)
    tlo = np.abs(arr0[..., :3] - rog).sum(-1) < 60
    arr0[..., 3] = np.where(tlo, 0, 255)
    a = Image.fromarray(arr0.astype(np.uint8))
a = a.crop(a.getbbox())
h = round(a.height * w / a.width); a = a.resize((w, h), Image.BOX)
arr = np.asarray(a).astype(float); al = arr[..., 3] > 128
q = pal[((arr[:, :, None, :3] - pal[None, None]) ** 2).sum(-1).argmin(-1)]
out = np.zeros((h + 2, w + 2, 4), np.uint8); out[1:-1, 1:-1, :3] = q; out[1:-1, 1:-1, 3] = al * 255
A = out[..., 3] > 0
ring = (~A) & (np.roll(A, 1, 0) | np.roll(A, -1, 0) | np.roll(A, 1, 1) | np.roll(A, -1, 1))
out[ring] = [0x1e, 0x1a, 0x24, 255]
Image.fromarray(out).save(dst)
print('zapisano', dst, out.shape[1], 'x', out.shape[0])
