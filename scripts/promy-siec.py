#!/usr/bin/env python3
"""
Sieć promów (właściciel, 13.10.2026): w każdym kraju z promami port flagowy; z każdego portu morskiego
można popłynąć do flagowego swojego kraju, a z flagowego do flagowych portów krajów obok – po morzu.

Wejście: public/porty.json (porty z OSM) + Natural Earth 1:50m (granice państw, ląd; pobierane do data/ne/).
Wyjście: public/promy-siec.json
  { v, kraje: {ISO: [nazwa_pl, nazwa_en]},
    porty: {"lat,lon": [ISO|null, morski 0/1]},        # klucz = współrzędne portu z porty.json (4 miejsca)
    flagowe: {ISO: [nazwa, lat, lon]},
    polaczenia: [[ISO_a, ISO_b, km po morzu]] }

Jak:
- kraj portu: punkt w granicach państwa (albo najbliższe granice do 25 km – porty na molo wychodzą w morze),
- „morski” = w promieniu ~30 km jest otwarte morze (porty na jeziorach i rzekach pływają tylko swoimi liniami),
- flagowy = port morski kraju z największą liczbą prawdziwych linii (FLAGOWE_RECZNIE wygrywa),
- drogi po morzu: ląd narysowany na siatce RES° (cieśniny i kanały wycięte ręcznie: CIESNINY), jedno wspólne
  szukanie najkrótszych dróg od wszystkich flagowych naraz; kraje, których „morza” się stykają, są sąsiadami;
  każdy kraj dostaje 3 najbliższych sąsiadów + to, co potrzebne, żeby cała sieć była połączona.
Uruchom: python3 scripts/promy-siec.py   (ok. 1–2 min)
"""
import json, math, os, heapq, urllib.request
import numpy as np

RES = 0.2  # stopnie na kratkę
SASIADOW = 3
NE = 'data/ne'
ZRODLA = {
    'kraje': 'ne_50m_admin_0_countries',
    'lad': 'ne_50m_land',
    'miasta': 'ne_50m_populated_places_simple',
}
# Flagowy leży przy największym mieście kraju, które ma port morski bliżej niż tyle km.
MIASTO_PORT_KM = 60
# Flagowe wybrane ręcznie (kraj → nazwa portu w porty.json, najbliższy port o tej nazwie).
FLAGOWE_RECZNIE = {'PL': 'Gdynia', 'DE': 'Kilonia', 'DK': 'Kopenhaga', 'SE': 'Sztokholm', 'FI': 'Helsinki',
                   'EE': 'Tallinn', 'GR': 'Pireus', 'IT': 'Genua', 'ES': 'Barcelona', 'GB': 'Dover', 'NL': 'Rotterdam', 'NO': 'Oslo', 'CA': 'Vancouver'}
# Liniowce oceaniczne między wielkimi portami (kraje; droga liczona po morzu), żeby dalekie rejsy nie szły
# od kraju do kraju wzdłuż całego wybrzeża (właściciel: „liniowce przez kilka wielkich portów”).
LINIOWCE = [
    ('NL', 'US'), ('GB', 'US'), ('ES', 'BR'), ('PT', 'BR'), ('NL', 'ZA'), ('NL', 'EG'), ('EG', 'IN'), ('EG', 'TZ'),
    ('IN', 'SG'), ('SG', 'CN'), ('SG', 'AU'), ('CN', 'JP'), ('US', 'PA'), ('PA', 'CL'), ('JP', 'CA'), ('CN', 'CA'),
    ('AU', 'NZ'), ('ZA', 'BR'), ('ZA', 'TZ'), ('ZA', 'AU'), ('US', 'MX'), ('TR', 'EG'), ('IT', 'EG'), ('ES', 'US'),
    ('SG', 'TZ'), ('AR', 'BR'), ('US', 'BR'), ('NL', 'GR'),
]
# Wąskie przejścia, których siatka nie widzi: [lat1, lon1, lat2, lon2].
CIESNINY = [
    [55.4, 12.75, 56.2, 12.55],   # Sund
    [55.0, 10.95, 55.8, 11.0],    # Wielki Bełt
    [41.0, 29.0, 41.25, 29.12],   # Bosfor
    [40.0, 26.2, 40.45, 26.75],   # Dardanele
    [29.9, 32.55, 31.3, 32.3],    # Kanał Sueski
    [8.9, -79.55, 9.35, -79.9],   # Kanał Panamski
    [53.9, 9.15, 54.36, 10.15],   # Kanał Kiloński
    [38.18, 15.6, 38.3, 15.65],   # Cieśnina Mesyńska
    [35.95, -5.75, 36.05, -5.3],  # Gibraltar
    [45.1, 36.45, 45.45, 36.6],   # Cieśnina Kerczeńska
    [1.2, 103.6, 1.3, 104.1],     # Singapur
]


def pobierz(nazwa):
    os.makedirs(NE, exist_ok=True)
    p = f'{NE}/{nazwa}.geojson'
    if not os.path.exists(p):
        url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{nazwa}.geojson'
        print('pobieram', url)
        urllib.request.urlretrieve(url, p)
    return json.load(open(p, encoding='utf-8'))


def wielokaty(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon':
        return geom['coordinates']
    return []


W, H = int(360 / RES), int(180 / RES)


def rysuj(siatka, poly):
    """Wypełnia wielokąt (zewnętrzny + dziury, parzysto-nieparzyście) na siatce [H, W] (wiersz 0 = 90°N)."""
    pierscienie = [np.array(r, dtype=float) for r in poly]
    lat_min = min(r[:, 1].min() for r in pierscienie)
    lat_max = max(r[:, 1].max() for r in pierscienie)
    r0 = max(0, int((90 - lat_max) / RES))
    r1 = min(H - 1, int((90 - lat_min) / RES))
    krawedzie = []
    for r in pierscienie:
        a, b = r[:-1], r[1:]
        krawedzie.append(np.hstack([a, b]))
    k = np.vstack(krawedzie)
    for row in range(r0, r1 + 1):
        lat = 90 - (row + 0.5) * RES
        y1, y2 = k[:, 1], k[:, 3]
        m = (y1 > lat) != (y2 > lat)
        if not m.any():
            continue
        e = k[m]
        x = e[:, 0] + (lat - e[:, 1]) * (e[:, 2] - e[:, 0]) / (e[:, 3] - e[:, 1])
        x.sort()
        for i in range(0, len(x) - 1, 2):
            c0 = int(math.ceil((x[i] + 180) / RES - 0.5))
            c1 = int(math.floor((x[i + 1] + 180) / RES - 0.5))
            if c1 >= c0:
                siatka[row, max(0, c0):min(W, c1 + 1)] = True


def w_wielokacie(lon, lat, poly):
    wew = False
    for r in poly:
        a = np.array(r, dtype=float)
        x1, y1, x2, y2 = a[:-1, 0], a[:-1, 1], a[1:, 0], a[1:, 1]
        m = (y1 > lat) != (y2 > lat)
        if m.any():
            x = x1[m] + (lat - y1[m]) * (x2[m] - x1[m]) / (y2[m] - y1[m])
            wew ^= bool((x > lon).sum() % 2)
    return wew


def km(lat1, lon1, lat2, lon2):
    r = math.radians
    a = math.sin(r(lat2 - lat1) / 2) ** 2 + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(min(1, a)))


def main():
    porty_json = json.load(open('public/porty.json', encoding='utf-8'))
    porty = porty_json['porty']
    stopien = {}
    for a, b, _, _ in porty_json['linie']:
        stopien[a] = stopien.get(a, 0) + 1
        stopien[b] = stopien.get(b, 0) + 1

    kraje = pobierz(ZRODLA['kraje'])['features']
    lad_geo = pobierz(ZRODLA['lad'])['features']

    print('ląd na siatce…')
    lad = np.zeros((H, W), dtype=bool)
    for f in lad_geo:
        for poly in wielokaty(f['geometry']):
            rysuj(lad, poly)
    def kratka(lat, lon):
        return min(H - 1, max(0, int((90 - lat) / RES))), int((lon + 180) / RES) % W
    for la1, lo1, la2, lo2 in CIESNINY:
        n = int(max(abs(la2 - la1), abs(lo2 - lo1)) / (RES / 3)) + 2
        for i in range(n + 1):
            t = i / n
            r, c = kratka(la1 + (la2 - la1) * t, lo1 + (lo2 - lo1) * t)
            lad[max(0, r - 1):r + 2, max(0, c - 1):c + 2] = False
    # Tylko otwarte morze: woda połączona z oceanem (jeziora i odcięte zatoki na siatce się nie liczą).
    woda = ~lad
    morze = np.zeros((H, W), dtype=bool)
    start = kratka(0.0, -30.0)  # środek Atlantyku
    stos = [start]
    morze[start] = True
    while stos:
        r, c = stos.pop()
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            rr, cc = r + dr, (c + dc) % W
            if 0 <= rr < H and woda[rr, cc] and not morze[rr, cc]:
                morze[rr, cc] = True
                stos.append((rr, cc))
    print('morze:', round(morze.mean() * 100), '% siatki, woda poza oceanem:', int((woda & ~morze).sum()), 'kratek')

    # Kraje: nazwy i granice.
    nazwy = {}
    granice = []
    for f in kraje:
        p = f['properties']
        iso = p.get('ISO_A2_EH') if p.get('ISO_A2_EH') not in (None, '-99') else p.get('ISO_A2')
        if not iso or iso == '-99':
            continue
        nazwy[iso] = [p.get('NAME_PL') or p['NAME'], p.get('NAME_EN') or p['NAME']]
        for poly in wielokaty(f['geometry']):
            a = np.array(poly[0], dtype=float)
            granice.append((iso, a[:, 0].min(), a[:, 0].max(), a[:, 1].min(), a[:, 1].max(), poly))

    def kraj(lat, lon):
        for iso, x0, x1, y0, y1, poly in granice:
            if x0 <= lon <= x1 and y0 <= lat <= y1 and w_wielokacie(lon, lat, poly):
                return iso
        # Najbliższa granica do 25 km (molo, falochron, wysepka spoza mapy 1:50m).
        best, bd = None, 25.0
        for iso, x0, x1, y0, y1, poly in granice:
            if not (x0 - 0.4 <= lon <= x1 + 0.4 and y0 - 0.3 <= lat <= y1 + 0.3):
                continue
            a = np.array(poly[0], dtype=float)
            d = np.hypot((a[:, 0] - lon) * 111.32 * math.cos(math.radians(lat)), (a[:, 1] - lat) * 111.32).min()
            if d < bd:
                best, bd = iso, d
        return best

    def morski(lat, lon):
        r, c = kratka(lat, lon)
        z = 3  # ~65 km na 0.2°: zalewy i ujścia rzek (Szczecin) się liczą, dalekie jeziora (Bodeńskie, Wielkie) nie
        return bool(morze[max(0, r - z):r + z + 1, [(c + d) % W for d in range(-z, z + 1)]].any())

    print('kraje portów…')
    wynik_porty = {}
    info = []
    for i, (pid, nazwa, lat, lon, _t) in enumerate(porty):
        iso, m = kraj(lat, lon), morski(lat, lon)
        wynik_porty[f'{lat:.4f},{lon:.4f}'] = [iso, 1 if m else 0]
        info.append((i, nazwa, lat, lon, iso, m))

    # Flagowe: przy największym mieście kraju z portem morskim w pobliżu (ręczne wygrywają).
    miasta = {}
    for f in pobierz(ZRODLA['miasta'])['features']:
        p = f['properties']
        lon, lat = f['geometry']['coordinates'][:2]
        miasta.setdefault(p.get('iso_a2'), []).append((p.get('pop_max') or 0, lat, lon, p.get('name')))
    flagowe = {}
    for iso in sorted({x[4] for x in info if x[4] and x[5]}):
        kand = [x for x in info if x[4] == iso and x[5]]
        r = FLAGOWE_RECZNIE.get(iso)
        # Ręczny wybór może być w głębi fiordu/zatoki, której siatka nie widzi jako morza – wtedy też się liczy.
        wyb = [x for x in info if x[4] == iso and x[1] == r] if r else []
        if wyb:
            wynik_porty[f'{wyb[0][2]:.4f},{wyb[0][3]:.4f}'][1] = 1
        f = wyb[0] if wyb else None
        if not f:
            for pop, la, lo, _n in sorted(miasta.get(iso, []), reverse=True):
                blisko = [x for x in kand if km(la, lo, x[2], x[3]) < MIASTO_PORT_KM]
                if blisko:
                    f = max(blisko, key=lambda x: (stopien.get(x[0], 0), -km(la, lo, x[2], x[3])))
                    break
        if not f:
            f = max(kand, key=lambda x: (stopien.get(x[0], 0), -abs(x[2])))
        flagowe[iso] = [f[1], f[2], f[3]]
    print('flagowych:', len(flagowe))

    # Wspólne szukanie dróg po morzu od wszystkich flagowych.
    print('drogi po morzu…')
    INF = 1e18
    dist = np.full((H, W), INF)
    etyk = np.full((H, W), -1, dtype=np.int32)
    lista = sorted(flagowe)
    kolejka = []
    start_kratka = {}
    for k, iso in enumerate(lista):
        _, lat, lon = flagowe[iso]
        r, c = kratka(lat, lon)
        # Najbliższa kratka morza.
        best = None
        for z in range(0, 25):
            for dr in range(-z, z + 1):
                for dc in range(-z, z + 1):
                    rr, cc = r + dr, (c + dc) % W
                    if 0 <= rr < H and morze[rr, cc]:
                        best = (rr, cc)
                        break
                if best: break
            if best: break
        if not best:
            continue
        dist[best] = 0
        etyk[best] = k
        start_kratka[iso] = best
        heapq.heappush(kolejka, (0.0, best[0], best[1]))
    krok_lat = 111.32 * RES
    sasiedzi = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    while kolejka:
        d, r, c = heapq.heappop(kolejka)
        if d > dist[r, c]:
            continue
        cosl = math.cos(math.radians(90 - (r + 0.5) * RES))
        for dr, dc in sasiedzi:
            rr, cc = r + dr, (c + dc) % W
            if not (0 <= rr < H) or not morze[rr, cc]:
                continue
            nd = d + math.hypot(dr * krok_lat, dc * krok_lat * cosl)
            if nd < dist[rr, cc]:
                dist[rr, cc] = nd
                etyk[rr, cc] = etyk[r, c]
                heapq.heappush(kolejka, (nd, rr, cc))

    # Styki obszarów = sąsiedzi; odległość = najkrótsza droga przez styk.
    para = {}
    for dr, dc in [(0, 1), (1, 0), (1, 1), (1, -1)]:
        a = etyk[0:H - dr, :]
        b = np.roll(etyk[dr:H, :], -dc, axis=1)
        da = dist[0:H - dr, :]
        db = np.roll(dist[dr:H, :], -dc, axis=1)
        m = (a >= 0) & (b >= 0) & (a != b)
        if not m.any():
            continue
        s = da[m] + db[m]
        for x, y, v in zip(a[m], b[m], s):
            key = (min(x, y), max(x, y))
            if v < para.get(key, INF):
                para[key] = v
    print('styków:', len(para))

    # 3 najbliższych na kraj + drzewo łączące wszystko.
    wybrane = set()
    for k in range(len(lista)):
        moje = sorted([(v, key) for key, v in para.items() if k in key])[:SASIADOW]
        wybrane.update(key for _, key in moje)
    rodzic = list(range(len(lista)))
    def find(x):
        while rodzic[x] != x:
            rodzic[x] = rodzic[rodzic[x]]
            x = rodzic[x]
        return x
    for v, key in sorted((v, key) for key, v in para.items()):
        a, b = find(key[0]), find(key[1])
        if a != b:
            rodzic[a] = b
            wybrane.add(key)
    # Liniowce: droga po morzu od jednego portu do drugiego (osobne szukanie, kończy się po dotarciu).
    def po_morzu(a, b):
        sa, sb = start_kratka.get(a), start_kratka.get(b)
        if not sa or not sb:
            return None
        d = {sa: 0.0}
        q = [(0.0, sa[0], sa[1])]
        while q:
            dd, r, c = heapq.heappop(q)
            if (r, c) == sb:
                return dd
            if dd > d.get((r, c), INF):
                continue
            cosl = math.cos(math.radians(90 - (r + 0.5) * RES))
            for dr, dc in sasiedzi:
                rr, cc = r + dr, (c + dc) % W
                if not (0 <= rr < H) or not morze[rr, cc]:
                    continue
                nd = dd + math.hypot(dr * krok_lat, dc * krok_lat * cosl)
                if nd < d.get((rr, cc), INF):
                    d[(rr, cc)] = nd
                    heapq.heappush(q, (nd, rr, cc))
        return None
    liniowce = []
    for a, b in LINIOWCE:
        if a in flagowe and b in flagowe:
            v = po_morzu(a, b)
            if v:
                liniowce.append([a, b, int(round(v))])
                print('liniowiec', a, b, int(v))
    polaczenia = []
    for key in sorted(wybrane):
        v = para[key]
        a, b = lista[key[0]], lista[key[1]]
        # Na morzu ~ najkrótsza droga po siatce, nie mniej niż w linii prostej.
        prosto = km(flagowe[a][1], flagowe[a][2], flagowe[b][1], flagowe[b][2])
        polaczenia.append([a, b, int(round(max(v, prosto)))])
    for a, b, v in liniowce:
        if not any({a, b} == {x, y} for x, y, _ in polaczenia):
            polaczenia.append([a, b, v])
    print('połączeń:', len(polaczenia))

    # Kraje bez portu flagowego (bez morza albo bez promów): najbliższy flagowy od stolicy – kapitan wskaże tam drogę.
    stolice = {}
    for f in pobierz(ZRODLA['miasta'])['features']:
        p = f['properties']
        if p.get('adm0cap') and p.get('iso_a2') and p['iso_a2'] not in stolice:
            lon, lat = f['geometry']['coordinates'][:2]
            stolice[p['iso_a2']] = (lat, lon)
    bez_portu = {}
    for iso, (la, lo) in stolice.items():
        if iso in flagowe or iso not in nazwy:
            continue
        best = min(flagowe, key=lambda k: km(la, lo, flagowe[k][1], flagowe[k][2]))
        bez_portu[iso] = [best, int(km(la, lo, flagowe[best][1], flagowe[best][2]))]
    out = {'v': '2026-10-13', 'kraje': nazwy, 'porty': wynik_porty,
           'flagowe': flagowe, 'polaczenia': polaczenia, 'bezPortu': bez_portu, 'liniowce': [[a, b] for a, b, _ in liniowce]}
    json.dump(out, open('public/promy-siec.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    # Lista dla właściciela do przejrzenia (docs/promy-flagowe.md).
    po_nazwie = sorted(flagowe, key=lambda k: nazwy.get(k, [k])[0])
    md = ['# Porty flagowe i połączenia morskie', '', 'Wygenerowane przez `scripts/promy-siec.py` (właściciel, 13.10.2026). '
          'Każdy port morski pływa do portu flagowego swojego kraju; flagowy – do flagowych krajów obok po morzu '
          '(🚢 = liniowiec oceaniczny). Kraje bez promów: kapitan prowadzi do flagowego najbliżej ich stolicy. '
          'Zmiany: `FLAGOWE_RECZNIE`, `LINIOWCE` w skrypcie.', '',
          '| Kraj | Port flagowy | Dokąd pływa (km po morzu) |', '|---|---|---|']
    lin = {frozenset((a, b)) for a, b, _ in liniowce}
    for iso in po_nazwie:
        s2 = sorted(((b if a == iso else a), k) for a, b, k in polaczenia if iso in (a, b))
        dok = ', '.join(f"{'🚢 ' if frozenset((iso, x)) in lin else ''}{flagowe[x][0]} ({nazwy.get(x, [x])[0]}) {k}" for x, k in sorted(s2, key=lambda t: t[1]))
        md.append(f"| {nazwy.get(iso, [iso])[0]} | {flagowe[iso][0]} | {dok} |")
    md += ['', '## Kraje bez promów → port, do którego prowadzi kapitan', '']
    md += [f"- {nazwy.get(k, [k])[0]} → {flagowe[v[0]][0]} ({nazwy.get(v[0], [v[0]])[0]}), {v[1]} km od stolicy" for k, v in sorted(bez_portu.items(), key=lambda t: nazwy.get(t[0], [t[0]])[0])]
    open('docs/promy-flagowe.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    for iso in ['PL', 'DK', 'KE', 'DE', 'SE', 'GB', 'US', 'JP', 'CN', 'RU', 'CA', 'BR', 'AU', 'IN', 'ZA', 'EG', 'TR', 'IT', 'FR', 'ES', 'NO']:
        if iso in flagowe:
            s = [f"{b if a == iso else a} {k}" for a, b, k in polaczenia if iso in (a, b)]
            print(iso, flagowe[iso][0], '→', ', '.join(s))
    morskich = sum(1 for v in wynik_porty.values() if v[1])
    bez = sum(1 for v in wynik_porty.values() if not v[0])
    print(f'portów {len(wynik_porty)}, morskich {morskich}, bez kraju {bez}')


main()
