# Nowy wycinek makiety: strome zbocze ze szlakiem (duże spadki w polu widzenia), te same formaty co region.json / r_dane.png / r_wys.png
import json, math, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
RX0, RY0, RW, RH = 2250, 1990, 350, 350
K = 7.68
v = json.load(open('wektory.json'))
dane = np.asarray(Image.open('dane.png'))  # wycinek od (500, 500)
Image.fromarray(dane[RY0 - 500:RY0 - 500 + RH, RX0 - 500:RX0 - 500 + RW]).save('r2_dane.png')
hs = gaussian_filter(np.load('hs.npy'), 1.0)
gx0, gy0 = RX0 // 4, RY0 // 4
hc = hs[gy0:gy0 + RH // 4 + 2, gx0:gx0 + RW // 4 + 2]
q = np.clip(np.round((hc - 1000) * 20), 0, 65535).astype(np.uint32)
Image.fromarray(np.stack([(q >> 8) & 255, q & 255, np.zeros_like(q)], -1).astype(np.uint8)).save('r2_wys.png')
print('h', hc.min(), hc.max())
inside = lambda x, y: RX0 - 20 <= x < RX0 + RW + 20 and RY0 - 20 <= y < RY0 + RH + 20
def clip(ln):
    out, cur = [], []
    for x, y in ln:
        if inside(x, y): cur.append([round((x - RX0) * K, 1), round((y - RY0) * K, 1)])
        elif cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return [c for c in out if len(c) > 1]
paths = [c for k in ('path', 'steps', 'road') for ln in v['lines'].get(k, []) for c in clip(ln)]
# trasa: najdłuższy kawałek ścieżki w wycinku, od wyższego końca w dół
hAt = lambda x, y: float(hs[min(hs.shape[0]-1, int(y / K / 4 + gy0)), min(hs.shape[1]-1, int(x / K / 4 + gx0))])
L = lambda c: sum(math.hypot(c[i][0] - c[i-1][0], c[i][1] - c[i-1][1]) for i in range(1, len(c)))
# sklej kawałki stykające się końcami (do 25 px), żeby trasa była dłuższa
segs = sorted(paths, key=L, reverse=True)
tr = segs[0][:]
used = {0}
for _ in range(20):
    best = None
    for i, c in enumerate(segs):
        if i in used: continue
        for cc in (c, c[::-1]):
            if math.hypot(cc[0][0] - tr[-1][0], cc[0][1] - tr[-1][1]) < 25: best = (i, cc)
            elif math.hypot(cc[-1][0] - tr[0][0], cc[-1][1] - tr[0][1]) < 25: best = (i, cc, 'pre')
    if not best: break
    used.add(best[0]); tr = tr + best[1] if len(best) == 2 else best[1] + tr
if hAt(*tr[0]) < hAt(*tr[-1]): tr = tr[::-1]
trasa = tr[::-1]  # makieta startuje na KOŃCU trasy (na górze), „zejdź” idzie do początku
bud = []
for rings in json.load(open('budynki.json')):
    r = rings[0]
    if all(inside(x, y) for x, y in r): bud.append([[round((x - RX0) * K, 1), round((y - RY0) * K, 1)] for x, y in r])
pois = []
for p in v['pois']:
    if p['k'] in ('peak', 'alpine_hut') and p['n'] and RX0 <= p['x'] < RX0 + RW and RY0 <= p['y'] < RY0 + RH:
        n = p['n'].split(' / ')[-1]
        if n not in [q['n'] for q in pois]: pois.append({'k': p['k'], 'n': n, 'e': p['e'], 'x': round((p['x'] - RX0) * K, 1), 'y': round((p['y'] - RY0) * K, 1)})
cable = [c for ln in v['lines'].get('cable', []) for c in clip(ln)]
json.dump({'RX0': RX0, 'RY0': RY0, 'RW': RW, 'RH': RH, 'K': K, 'paths': paths, 'cable': cable, 'bud': bud, 'trasa': trasa, 'pois': pois}, open('region2.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print('trasa', len(trasa), round(L(trasa)), 'h od', round(hAt(*trasa[-1])), 'do', round(hAt(*trasa[0])), 'pois', [p['n'] for p in pois], 'paths', len(paths))
