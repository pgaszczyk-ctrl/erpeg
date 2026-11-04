"""Create an artillery-only GeoJSON sequence from an OSM PBF, retaining stable OSM IDs.
Requires osmium==4.3.2. No changes to the game's production map extract.
"""
import argparse,gzip,json,osmium
p=argparse.ArgumentParser();p.add_argument('src');p.add_argument('out');p.add_argument('--bbox',required=True);args=p.parse_args();west,south,east,north=map(float,args.bbox.split(','));factory=osmium.geom.GeoJSONFactory();count=0
out=gzip.open(args.out,'wt',compresslevel=6)
def relevant(tags):return any(k in tags for k in ('building','highway','waterway','railway','barrier','aeroway','natural','landuse','place')) or tags.get('boundary')=='administrative'
def keep(g):
 def points(c):
  if c and isinstance(c[0],(float,int)):yield c
  else:
   for a in c:yield from points(a)
 return any(west<=x<=east and south<=y<=north for x,y,*_ in points(g['coordinates']))
def write(kind,ident,tags,g):
 global count
 if not keep(g):return
 out.write(json.dumps({'type':'Feature','id':f'{kind}/{ident}','properties':dict(tags),'geometry':g},separators=(',',':'))+'\n');count+=1
class Handler(osmium.SimpleHandler):
 def node(self,n):
  if not (west<=n.location.lon<=east and south<=n.location.lat<=north):return
  if relevant(n.tags):
   try:write('node',n.id,n.tags,json.loads(factory.create_point(n)))
   except osmium.InvalidLocationError:pass
 def way(self,w):
  if not relevant(w.tags):return
  if not any(n.location.valid() and west<=n.lon<=east and south<=n.lat<=north for n in w.nodes):return
  # Polygons, including holes, come from area() below. Roads/linear barriers retain line geometry.
  if w.is_closed() and any(k in w.tags for k in ('building','natural','landuse','aeroway','boundary')) and 'highway' not in w.tags:return
  try:write('way',w.id,w.tags,json.loads(factory.create_linestring(w)))
  except (osmium.InvalidLocationError,RuntimeError):pass
 def area(self,a):
  if not relevant(a.tags):return
  if not any(n.location.valid() and west<=n.lon<=east and south<=n.lat<=north for ring in a.outer_rings() for n in ring):return
  try:write('way' if a.from_way() else 'relation',a.orig_id(),a.tags,json.loads(factory.create_multipolygon(a)))
  except (osmium.InvalidLocationError,RuntimeError):pass
Handler().apply_file(args.src,locations=True,idx='flex_mem',filters=[osmium.filter.KeyFilter('building','highway','waterway','railway','barrier','aeroway','natural','landuse','place','boundary')]);out.close();print('Extracted',count,'features into',args.out)
