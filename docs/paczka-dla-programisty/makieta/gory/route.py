import json, math, heapq, numpy as np
d=json.load(open('wektory.json'))
# graph on path/steps/road lines, nodes snapped to 1.5 px grid
nodes={}; adj={}
def nid(x,y):
  k=(round(x/1.5),round(y/1.5))
  if k not in nodes: nodes[k]=(x,y); adj[k]=[]
  return k
for kind in ['path','steps','road']:
  for ln in d['lines'].get(kind,[]):
    prev=None
    for x,y in ln:
      k=nid(x,y)
      if prev and prev!=k:
        a,b=nodes[prev],nodes[k]; w=math.hypot(a[0]-b[0],a[1]-b[1])
        adj[prev].append((k,w)); adj[k].append((prev,w))
      prev=k
# connect near-coincident nodes (tile seams) within 3 px
keys=list(nodes); arr=np.array([nodes[k] for k in keys])
from scipy.spatial import cKDTree
T=cKDTree(arr)
for i,j in T.query_pairs(3.0):
  a,b=keys[i],keys[j]; w=float(np.hypot(*(arr[i]-arr[j]))); adj[a].append((b,w)); adj[b].append((a,w))
# join dangling ends to any other node within 15 px (hut yards, tile seams)
extra=[]
for i,k in enumerate(keys):
  if len(adj[k])<=1:
    for j in T.query_ball_point(arr[i],15.0):
      b=keys[j]
      if b==k or any(v==b for v,_ in adj[k]): continue
      w=float(np.hypot(*(arr[i]-arr[j])))
      if w>2: adj[k].append((b,w)); adj[b].append((k,w)); extra.append([list(nodes[k]),list(nodes[b])])
print('connectors',len(extra))
def nearest(x,y): return keys[T.query([x,y])[1]]
def dij(s,t):
  dist={s:0}; prev={}; pq=[(0,s)]
  while pq:
    dd,u=heapq.heappop(pq)
    if u==t: break
    if dd>dist[u]: continue
    for v,w in adj[u]:
      nd=dd+w
      if nd<dist.get(v,1e18): dist[v]=nd; prev[v]=u; heapq.heappush(pq,(nd,v))
  if t not in dist: return None
  out=[t]
  while out[-1]!=s: out.append(prev[out[-1]])
  return [nodes[k] for k in out[::-1]], dist[t]
s=nearest(2077,1028); t=nearest(1150,1660)
print('start',nodes[s],'end',nodes[t])
r=dij(s,t); print('len px',r[1] if r else None, len(r[0]) if r else 0)
r2=dij(t,nearest(1378,1867)); print('beskid',r2[1] if r2 else None)
json.dump({'naKasprowy':[[round(x,1),round(y,1)] for x,y in r[0]], 'laczniki':extra,'naBeskid':[[round(x,1),round(y,1)] for x,y in r2[0]] if r2 else []},open('trasy.json','w'))
