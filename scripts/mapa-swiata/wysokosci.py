"""Heights for the world map generator: Terrarium tiles at zoom 5 (32×32 tiles of 256 px, public, AWS Open Data)
glued into one Web Mercator array 8192×8192 of metres, saved as wysokosc_z5.npy next to the other sources.

Download first (≈ 64 MB):
  for x in $(seq 0 31); do for y in $(seq 0 31); do echo "$x $y"; done; done | xargs -P 32 -n 2 sh -c \
    'curl -sS -o terr/5_$0_$1.png https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/$0/$1.png'
Run:  python3 -I scripts/mapa-swiata/wysokosci.py <folder with terr/>
"""
import sys
import numpy as np
from PIL import Image

d = sys.argv[1]
E = np.zeros((8192, 8192), np.int16)
for x in range(32):
    for y in range(32):
        a = np.asarray(Image.open(f'{d}/terr/5_{x}_{y}.png').convert('RGB'), np.float32)
        h = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        E[y * 256:(y + 1) * 256, x * 256:(x + 1) * 256] = np.clip(h, -12000, 9000).astype(np.int16)
np.save(f'{d}/wysokosc_z5.npy', E)
print('ok', E.min(), E.max())
