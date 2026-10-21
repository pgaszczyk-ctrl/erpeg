import gzip,json,math,pathlib,sys
base=pathlib.Path(__file__).resolve().parent
c=json.loads((base/"config.json").read_text())
lon,lat=c["center"]
r=c["radiusRealM"]+c["contextRealM"]+100; xmin,xmax=lon-r/(111195*math.cos(math.radians(52))),lon+r/(111195*math.cos(math.radians(52)));ymin,ymax=lat-r/111195,lat+r/111195
out=gzip.open(base/'data/local-input.geojsonseq.gz','wt')
def flat(x):
 if isinstance(x[0],(int,float)):yield x
 else:
  for a in x:yield from flat(a)
for l in gzip.open(sys.argv[1] if len(sys.argv)>1 else base/'../../data/lublin-osm.geojsonseq.gz','rt'):
 f=json.loads(l.strip('\x1e\n'));g=f['geometry'];pts=list(flat(g['coordinates']))
 if not any(xmin<=p[0]<=xmax and ymin<=p[1]<=ymax for p in pts):continue
 if g['type']=='LineString':
  # retain consecutive runs plus one outside point at either end
  runs=[];run=[]
  for i,p in enumerate(pts):
   near=any(0<=j<len(pts) and xmin<=pts[j][0]<=xmax and ymin<=pts[j][1]<=ymax for j in (i-1,i,i+1))
   if near:run.append(p)
   elif run:
    if len(run)>1:runs.append(run)
    run=[]
  if len(run)>1:runs.append(run)
  for run in runs:
   a={**f,'geometry':{'type':'LineString','coordinates':run}};out.write(json.dumps(a)+'\n')
 else:out.write(json.dumps(f)+'\n')
out.close()
