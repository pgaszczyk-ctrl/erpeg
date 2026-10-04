# Port of the mockup's roof/wall algorithm, generalised to any polygon (nearest edge = roof facet).
import math, numpy as np
from PIL import Image
INK=(0x1e,0x1a,0x24)
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
MAT={
 'dachowka_czerwona':dict(roof=['#5a2420','#7f3428','#a24834','#c86a44'],ridge='#d98a58',wall=['#6e5c4c','#93806a','#b5a286','#cdbd9c'],brick=False,slate=False),
 'dachowka_brazowa':dict(roof=['#4a2c1e','#64402a','#82583a','#a2764e'],ridge='#bf9466',wall=['#6e5c4c','#93806a','#b5a286','#cdbd9c'],brick=False,slate=False),
 'lupek_mosiadz':dict(roof=['#26283a','#363a4e','#4c5468','#6a7590'],ridge='#c8963e',wall=['#4e2723','#6e362c','#8a4836','#a5644a'],brick=True,slate=True),
}
def hsh(x,y,s=0):
    h=(x*374761393+y*668265263+s*982451653)&0xffffffff
    h=((h^(h>>13))*1274126177)&0xffffffff; h^=h>>16; return h/4294967296
def render(poly,H,mat,pad=4):
    """poly: list of (x,y) clockwise-ish in map px (art px). Returns RGBA image. Roof = footprint lifted by H, walls below."""
    m=MAT[mat]; roof=[hx(c) for c in m['roof']]; wall=[hx(c) for c in m['wall']]; ridge=hx(m['ridge'])
    xs=[p[0] for p in poly]; ys=[p[1] for p in poly]
    x0=int(min(xs))-pad; x1=int(max(xs))+pad; y0=int(min(ys))-H-pad; y1=int(max(ys))+pad
    W=x1-x0+1; Hh=y1-y0+1
    n=len(poly)
    # orientation
    area=sum(poly[i][0]*poly[(i+1)%n][1]-poly[(i+1)%n][0]*poly[i][1] for i in range(n))
    sgn=1 if area>0 else -1
    def inside(px,py):
        c=False
        for i in range(n):
            ax,ay=poly[i]; bx,by=poly[(i+1)%n]
            if (ay>py)!=(by>py) and px < (bx-ax)*(py-ay)/(by-ay)+ax: c=not c
        return c
    def nearest(px,py):
        best=[]
        for i in range(n):
            ax,ay=poly[i]; bx,by=poly[(i+1)%n]; dx,dy=bx-ax,by-ay
            t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
            d=math.hypot(ax+t*dx-px,ay+t*dy-py); best.append((d,i))
        best.sort(); return best
    maxd=0; cache={}
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if inside(x+.5,y+.5+H):
                b=nearest(x+.5,y+.5+H); cache[(x,y)]=b; maxd=max(maxd,b[0][0])
    def kind(x,y):
        if (x,y) in cache: return 1
        # wall: some k in 0..H with footprint at (x,y+k)... visible below roof
        for k in range(0,H+1):
            if inside(x+.5,y+.5+k- 0) and k<=H:
                pass
        return 0
    south={}
    for x in range(x0-1,x1+2):
        for y in range(y1,y0-1,-1):
            if inside(x+.5,y+.5): south[x]=y; break
    def K(x,y):
        if (x,y) in cache: return 1
        s=south.get(x)
        if s is not None and s-H<=y<=s and H>0: return 2
        return 0
    img=Image.new('RGBA',(W,Hh),(0,0,0,0)); P=img.load()
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            k=K(x,y)
            if not k: continue
            if k==1:
                b=cache[(x,y)]; d,ei=b[0]
                ax,ay=poly[ei]; bx,by=poly[(ei+1)%n]; L=math.hypot(bx-ax,by-ay)
                nx,ny=(by-ay)/L*sgn*-1,-(bx-ax)/L*sgn*-1  # outward normal
                # ensure outward: midpoint+normal outside
                mx,my=(ax+bx)/2,(ay+by)/2
                if inside(mx+nx*0.8,my+ny*0.8): nx,ny=-nx,-ny
                lum=-(nx*0.6+ny*0.8)
                tone=3 if lum>0.45 else 2 if lum>-0.1 else 1 if lum>-0.6 else 0
                along=((x+.5-ax)*(bx-ax)+(y+.5+H-ay)*(by-ay))/L
                if m['slate']:
                    if int(d)%2==1 or int(along+(int(d/2)%2)*2+400)%4==0: tone=max(0,tone-1)
                elif int(d)%3==2: tone=max(0,tone-1)
                c=roof[tone]
                if len(b)>1 and abs(b[1][0]-b[0][0])<0.75 and d>1: c=roof[min(3,tone+1)]
                if d>maxd-1.05: c=ridge
                if K(x-1,y)==0 or K(x+1,y)==0 or K(x,y-1)==0 or K(x,y+1)==2: c=INK
            else:
                s=south[x]; hh=s-y; sl=south.get(x+1,s)-south.get(x-1,s)
                tone=2 if sl>0 else 1 if sl<0 else 2
                if m['brick']:
                    if hh%3==0 or ((x+(hh//3)%2*2)%4==0 and hsh(x,hh,7)<0.5): tone=max(0,tone-1)
                elif hsh(x,y,3)<0.12: tone=min(3,tone+1)
                c=wall[tone]
                floors=2 if H>=14 else 1; win=False
                for f in range(floors):
                    lo=3+f*7; mm=(x-x0+3)%7
                    if lo<=hh<=lo+3 and 2<=mm<=4 and K(x-2,y) and K(x+2,y) and K(x-2,y)!=1 and K(x+2,y)!=1:
                        lit=hsh((x-x0+3)//7,f,5)<0.3
                        c=hx('#f2d888') if lit and (hh==lo+3 or mm==2) else hx('#d9a84a') if lit else hx('#56709a') if (hh==lo+3 and mm==2) else hx('#2a3450'); win=True
                    if hh==lo-1 and 2<=mm<=4 and K(x-2,y) and K(x+2,y): c=wall[3]
                if not win and K(x,y-1)==1: c=wall[0]
                if hh==0: c=wall[0]
                if K(x-1,y)==0 or K(x+1,y)==0 or K(x,y+1)==0: c=INK
            P[x-x0,y-y0]=c+(255,)
    return img
def rect(cx,cy,w,h,a):
    a=math.radians(a); co,si=math.cos(a),math.sin(a)
    pts=[(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]
    return [(cx+u*co-v*si,cy+u*si+v*co) for u,v in pts]
def rot(poly,a,cx,cy):
    a=math.radians(a); co,si=math.cos(a),math.sin(a)
    return [(cx+(x-cx)*co-(y-cy)*si,cy+(x-cx)*si+(y-cy)*co) for x,y in poly]
