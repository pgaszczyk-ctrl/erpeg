import data from './countries.json';
import { contains } from './geometry';
import type { Point } from './types';
const regions=data.countries.map(c=>{
  const rings=c.polygons as Point[][][],points=rings.flat(2),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {...c,rings,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};
});
/** Bundled Natural Earth boundaries; no remote lookup, API key or city-name conditionals. */
export function countryAt(lon:number,lat:number):string{
  const p:Point=[lon,lat];
  return regions.find(c=>lon>=c.box[0]&&lon<=c.box[2]&&lat>=c.box[1]&&lat<=c.box[3]&&c.rings.some(r=>contains(r[0],p)&&!r.slice(1).some(h=>contains(h,p))))?.iso??'';
}
