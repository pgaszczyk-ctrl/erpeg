import gzip, json, math, sys
LAT, LON, R = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])  # środek, promień w m
PX = 3.84; kx = math.cos(math.radians(LAT)) * 111320 * PX; ky = 110540 * PX
W = H = int(2 * R * PX)
def pr(c): return [round((c[0] - LON) * kx + W / 2, 1), round((LAT - c[1]) * ky + H / 2, 1)]
def rings(geo):
    t = geo['type']; co = geo['coordinates']
    if t == 'Polygon': return [co[0]]
    if t == 'MultiPolygon': return [p[0] for p in co]
    return []
dl = R / 111000 * 1.3; dlo = dl / math.cos(math.radians(LAT))
bud, areas, lines = [], [], []
LAND = {'grass': 'trawa', 'meadow': 'trawa', 'park': 'trawa', 'recreation_ground': 'trawa', 'village_green': 'trawa', 'garden': 'trawa', 'playground': 'trawa',
        'parking': 'parking', 'pedestrian': 'plac', 'residential': 'trawa', 'forest': 'trawa', 'wood': 'trawa', 'scrub': 'trawa'}
W_DROGI = {'primary': 30, 'secondary': 26, 'tertiary': 22, 'residential': 18, 'service': 12, 'unclassified': 16, 'living_street': 14, 'footway': 7, 'path': 6, 'pedestrian': 10, 'cycleway': 7, 'steps': 6}
with gzip.open('/home/claude/erpeg/data/lublin-osm.geojsonseq.gz', 'rt') as f:
    for line in f:
        g = json.loads(line.lstrip('\x1e')); geo = g.get('geometry') or {}; p = g.get('properties', {})
        co = geo.get('coordinates')
        if not co: continue
        flat = co
        while isinstance(flat[0], list): flat = flat[0]
        if abs(flat[1] - LAT) > dl * 2 or abs(flat[0] - LON) > dlo * 2: continue
        if 'building' in p:
            for r in rings(geo):
                bud.append({'r': [pr(c) for c in r], 'lv': p.get('building:levels'), 'h': None, 'b': p['building'], 'n': p.get('name')})
        elif geo['type'] in ('Polygon', 'MultiPolygon'):
            k = LAND.get(p.get('landuse') or p.get('leisure') or p.get('amenity') or p.get('natural') or p.get('highway') or '')
            if k:
                for r in rings(geo): areas.append({'k': k, 'r': [pr(c) for c in r], 'pri': 0 if p.get('landuse') == 'residential' else 1})
        elif geo['type'] == 'LineString' and p.get('highway') in W_DROGI:
            lines.append({'k': p['highway'], 'w': W_DROGI[p['highway']], 'p': [pr(c) for c in co]})
areas.sort(key=lambda a: a['pri'])
json.dump({'W': W, 'H': H, 'bud': bud, 'areas': areas, 'lines': lines}, open('scena.json', 'w'))
print(W, H, len(bud), len(areas), len(lines), sorted(set(str(b['lv']) for b in bud)))
