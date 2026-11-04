import { closest, contains, distance } from './geometry';
import type { BuildingPlan, Point } from './types';
/** Lightweight main-thread adapter; the planner and country boundaries stay in the worker. */
export function blockedByPlans(plans:BuildingPlan[],p:Point,radius=1):boolean {
  return plans.some(b=>b.footprints.some(r=>contains(r,p)||r.some((a,i)=>distance(p,closest(p,a,r[(i+1)%r.length]))<radius)));
}
