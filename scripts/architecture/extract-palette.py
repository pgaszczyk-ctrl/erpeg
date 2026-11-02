#!/usr/bin/env python3
"""Reproducible weighted k-means, followed by source-colour medoids (never invented RGB).
Existing game assets are read only. --texture may add exported source textures.
"""
import argparse, collections, hashlib, json, math, pathlib, subprocess, tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
def rgb(s): return tuple(int(s[i:i+2], 16) for i in (1, 3, 5))
def dist(a,b): return sum((x-y)**2 for x,y in zip(a,b))
def extract(textures=()):
    with tempfile.TemporaryDirectory(prefix='explore-palette-') as tmp:
        bundle = str(pathlib.Path(tmp)/'sample.mjs')
        subprocess.run(['node','node_modules/rolldown/bin/cli.mjs','scripts/architecture/sample-palette.ts','--file',bundle,'--format','esm','--platform','node'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
        groups = json.loads(subprocess.check_output(['node',bundle],cwd=ROOT))
    for path in textures:
        im=Image.open(path).convert('RGBA')
        groups[str(path)]=dict(collections.Counter('#%02x%02x%02x'%p[:3] for p in im.getdata() if p[3]==255))
    weights=collections.defaultdict(float)
    for counts in groups.values():
        total=sum(counts.values()) or 1
        for c,n in counts.items(): weights[c]+=n/total/len(groups)
    colors=sorted(weights); points=[rgb(c) for c in colors]; ww=[weights[c] for c in colors]
    # Deterministic farthest-point seeding, with a weighted distance to include small warm materials.
    centers=[tuple(map(float,rgb('#1e1a24')))]
    for _ in range(15):
        ix=max(range(len(points)),key=lambda i:min(dist(points[i],c) for c in centers)*math.sqrt(ww[i]))
        centers.append(tuple(map(float,points[ix])))
    for _ in range(64):
        bins=[[] for _ in centers]
        for i,p in enumerate(points): bins[min(range(len(centers)),key=lambda j:dist(p,centers[j]))].append(i)
        nxt=[tuple(sum(points[i][k]*ww[i] for i in ids)/sum(ww[i] for i in ids) for k in range(3)) if ids else centers[j] for j,ids in enumerate(bins)]
        if max(dist(a,b) for a,b in zip(nxt,centers))<.001: break
        centers=nxt
    chosen=['#1e1a24']
    for c in centers[1:]:
        chosen.append(min((s for s in colors if s not in chosen),key=lambda s:dist(rgb(s),c)))
    chosen=chosen[:1]+sorted(chosen[1:],key=lambda s:sum(a*b for a,b in zip(rgb(s),(.2126,.7152,.0722))))
    manifest={'version':1,'algorithm':'weighted-kmeans-source-medoid','seed':0,'outline':0,'colors':chosen,'source_groups':list(groups),'source_hash':hashlib.sha256(json.dumps(groups,sort_keys=True).encode()).hexdigest(),'provenance':{c:{g:n[c] for g,n in groups.items() if c in n} for c in chosen}}
    out=ROOT/'src/architecture/palette.json'; out.write_text(json.dumps(manifest,indent=2)+'\n')
    im=Image.new('RGB',(16,1));im.putdata([rgb(c) for c in chosen]);im.save(ROOT/'public/architecture/palette.png')
    print(json.dumps({'palette':str(out),'colors':chosen}))
    return manifest
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--texture',action='append',default=[]);a=p.parse_args();extract(a.texture)
