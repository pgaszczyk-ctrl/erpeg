#!/usr/bin/env python3
"""Sprawdzarka paczki klocków świata (zamówienie 10).
Użycie:  python3 sprawdz_paczke.py <folder_z_plikami_PNG> [manifest.json]
Wymaga: Python 3 + Pillow (pip install pillow). Wynik: RAPORT.txt w folderze z plikami.
Sprawdza: obecność i wymiary plików, przezroczystość, liczbę kolorów, szwy kafli, kontrast kafli,
puste/pełne komórki arkuszy, czy rzeczy stoją na dolnej krawędzi komórki i nie dotykają boków,
oraz kolory daleko od palety startowej (tylko ostrzeżenie)."""
import json, os, sys
from PIL import Image
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
folder = sys.argv[1] if len(sys.argv) > 1 else '.'
man = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'manifest.json')))
pal_path = os.path.join(HERE, '..', '6_zamowienie_09', '04_paleta', 'paleta_startowa.hex')
PAL = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in open(pal_path).read().split()]) if os.path.exists(pal_path) else None

BEZ_KOTWICY = ('korona', 'owoce', '_gora')
out, bledy, ostrz, ok_n = [], 0, 0, 0

def lum(a): return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

for e in man:
    p = os.path.join(folder, e['plik'])
    msg_b, msg_o = [], []
    if not os.path.exists(p):
        out.append(f"[BRAK]  {e['plik']}"); bledy += 1; continue
    im = Image.open(p).convert('RGBA'); A = np.array(im).astype(int)
    if im.size != (e['w'], e['h']):
        msg_b.append(f"wymiary {im.size[0]}×{im.size[1]}, powinno być {e['w']}×{e['h']}")
    al = A[..., 3]; vals = set(np.unique(al).tolist())
    if e['alfa'] == 'brak' and vals != {255}:
        msg_b.append('ma przezroczyste piksele, a powinien być pełny (bez przezroczystości)')
    if e['alfa'] == '0/255' and not vals <= {0, 255}:
        msg_b.append(f"ma {sum(1 for v in vals if v not in (0, 255))} poziomów półprzezroczystości – dozwolone tylko 0 i 255")
    if e['alfa'] == 'stopnie' and len(vals) > 4:
        msg_b.append(f'za dużo poziomów przezroczystości ({len(vals)}), dozwolone najwyżej 4 (np. 0/30/60/100%)')
    opq = A[al > 0][:, :3]
    ncol = len({tuple(c) for c in opq.tolist()})
    if ncol > e['maxKolorow']:
        msg_b.append(f"{ncol} kolorów, limit {e['maxKolorow']}")
    if PAL is not None and len(opq):
        cols = np.array(sorted({tuple(c) for c in opq.tolist()}))
        d = np.sqrt(((cols[:, None, :] - PAL[None]) ** 2).sum(-1)).min(1)
        far = int((d > 40).sum())
        if far > max(2, len(cols) // 4):
            msg_o.append(f'{far} z {len(cols)} kolorów daleko od palety startowej (sprawdź, czy pasują do reszty)')
    if e['typ'] == 'kafel' and im.size == (e['w'], e['h']):
        rgb = A[..., :3].astype(float)
        inner_x = np.abs(np.diff(rgb, axis=1)).sum(-1).mean(); inner_y = np.abs(np.diff(rgb, axis=0)).sum(-1).mean()
        seam_x = np.abs(rgb[:, 0] - rgb[:, -1]).sum(-1).mean(); seam_y = np.abs(rgb[0] - rgb[-1]).sum(-1).mean()
        if seam_x > 2.2 * inner_x + 4: msg_b.append(f'szew lewo-prawo (różnica {seam_x:.0f} przy typowej {inner_x:.0f})')
        if seam_y > 2.2 * inner_y + 4: msg_b.append(f'szew góra-dół (różnica {seam_y:.0f} przy typowej {inner_y:.0f})')
        if np.array_equal(rgb[:, 0], rgb[:, -1]) or np.array_equal(rgb[0], rgb[-1]):
            msg_o.append('pierwsza i ostatnia kolumna/wiersz identyczne – przy powtarzaniu wyjdzie podwójny pasek')
        sd = lum(rgb).std()
        if sd > 26: msg_o.append(f'za duży kontrast jak na podłoże (odchylenie jasności {sd:.0f}, celuj w 8–22)')
    if e['typ'] == 'arkusz' and im.size == (e['w'], e['h']):
        cw, ch = e['komorka']
        for r, row in enumerate(e['nazwy']):
            for c in range(e['kolumny']):
                n = row[c] if c < len(row) else ''
                cell = al[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] > 0
                if not n:
                    if cell.any(): msg_o.append(f'komórka [{r},{c}] powinna być pusta')
                    continue
                if not cell.any():
                    msg_b.append(f'pusta komórka „{n}”'); continue
                if e['plik'].startswith('rurociag'):
                    continue
                ys, xs = np.where(cell)
                if xs.min() == 0 or xs.max() == cw - 1 or ys.min() == 0:
                    msg_o.append(f'„{n}” dotyka boku/góry komórki (zostaw 1 px marginesu)')
                if e.get('kotwica') == 'dol_srodek' and not any(k in n for k in BEZ_KOTWICY):
                    if ys.max() != ch - 1:
                        msg_b.append(f'„{n}” nie stoi na dolnej krawędzi komórki (najniższy piksel y={ys.max()}, powinno {ch - 1})')
                    else:
                        bx = xs[ys == ys.max()]; mid = (bx.min() + bx.max()) / 2
                        if abs(mid - (cw - 1) / 2) > 2.5:
                            msg_o.append(f'„{n}” podstawa nie na środku (x≈{mid:.0f}, środek {cw // 2})')
    if msg_b:
        bledy += 1; out.append(f"[BŁĄD]  {e['plik']}: " + '; '.join(msg_b + msg_o))
    elif msg_o:
        ostrz += 1; out.append(f"[UWAGA] {e['plik']}: " + '; '.join(msg_o))
    else:
        ok_n += 1; out.append(f"[OK]    {e['plik']}")
extra = sorted(set(f for f in os.listdir(folder) if f.endswith('.png')) - {e['plik'] for e in man})
for f in extra: out.append(f'[INNY]  {f} – nie ma go na liście (sprawdź nazwę)')
head = f'Sprawdzono {len(man)} plików: OK {ok_n}, uwagi {ostrz}, błędy/braki {bledy}, dodatkowe {len(extra)}'
rep = head + '\n' + '\n'.join(out)
open(os.path.join(folder, 'RAPORT.txt'), 'w').write(rep + '\n')
print(rep)
