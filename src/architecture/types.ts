/** Architecture-only data. Distances are metres in the map's existing local frame. */
import type { CharacterReference, Openings } from './proportions';
export type Point = [number, number];
export type Tags = Record<string, string>;
export type StyleId = 'old-town' | 'half-timber' | 'wooden' | 'apartments' | 'industrial' | 'modern' | 'landmark';
export type RegionId = 'temperate' | 'north' | 'mediterranean' | 'arid' | 'east-asia';
export type RoofType = 'gable' | 'hip' | 'flat' | 'sawtooth' | 'barrel' | 'curved' | 'steep';
export type DecorationKind = 'boiler' | 'tesla' | 'chimney' | 'water-tower' | 'tank' | 'valve' | 'turret';
export interface ArchitectureSource {
  id: string;
  osmId?: string;
  idSource: 'osm' | 'feature' | 'geometry';
  rings: Point[][];
  tags: Tags;
  lon: number;
  lat: number;
  /** Existing gameplay IDs remain separate from source IDs. */
  legacyId?: number;
}
export interface Road { id: string; points: Point[]; width: number }
export interface ContextArea { rings: Point[][]; kind: string }
export interface Style {
  id: StyleId;
  name: string;
  levels_range: [number, number];
  wall_height_per_level: number;
  body_height_in_doors: number;
  footprint_min: number;
  footprint_max: number;
  roof_types: { type: RoofType; weight: number }[];
  roof_pitch: number;
  overhang: number;
  window_pattern: { spacing: number; width: number; height: number; shape: 'rect' | 'arch' | 'large' };
  door_rule: 'nearest-road';
  facade_detail: ('timber' | 'cornice' | 'brick' | 'balconies' | 'boards' | 'plinth')[];
  allowed_decorations: DecorationKind[];
  subpalette: { roof: number[][]; wall: number[][]; trim: number[][] };
  lod_simplification: { distance: number; windows: boolean; decorations: boolean };
  neighbours: StyleId[];
}
export interface Region {
  id: RegionId;
  countries: string[];
  /** Optional climate rectangles, [west, south, east, north]. */
  bounds: number[][];
  default_style: StyleId;
  roofs: { type: RoofType; weight: number }[];
  pitch_multiplier: number;
  overhang: number;
  subpalette: { roof: number[][]; wall: number[][]; trim: number[][] };
  sparse_windows: boolean;
}
export interface Settings { scale: number; angleSnap: number; outline: boolean; decorations: boolean }
export const DEFAULT_SETTINGS: Settings = { scale: 2, angleSnap: 22.5, outline: true, decorations: true };
export interface Rectangle { x: number; y: number; w: number; d: number }
export interface StyleDecision { style: StyleId; source: 'tag OSM' | 'kontekst' | 'region' | 'fallback'; rule: string; region: RegionId; density: number; zone: string }
export interface Anchor { kind: 'ridge' | 'chimney' | 'wall'; position: [number, number, number]; normal: [number, number, number]; clearance: number }
export interface Decoration { kind: DecorationKind; variant: number; anchor: Anchor; frame: number }
export interface BuildingPlan {
  id: string;
  source: ArchitectureSource;
  decision: StyleDecision;
  priority: number;
  center: Point;
  angle: number;
  rectangles: Rectangle[];
  connectors: Rectangle[];
  footprints: Point[][];
  roofFootprints: Point[][];
  levels: number;
  wallHeight: number;
  openings: Openings;
  roofHeight: number;
  roof: RoofType;
  palette: { roof: number[]; wall: number[]; trim: number[] };
  door: Point;
  anchors: Anchor[];
  decorations: Decoration[];
  rejected?: string;
}
/** Non-indexed triangles: xyz + local uv + material triple + normal + surface kind. */
export interface BuildingMesh { positions: Float32Array; normals: Float32Array; uv: Float32Array; tones: Float32Array; kinds: Float32Array; indices: Uint32Array }
export interface PlanInput {
  sources: ArchitectureSource[];
  roads: Road[];
  areas: ContextArea[];
  settings: Settings;
  /** Country ISO codes from boundary data, keyed by source ID. */
  countries: Record<string, string>;
  /** Actual visible character dimensions, in the same units as the footprints. */
  character?: CharacterReference;
}
export interface PlanResult { buildings: BuildingPlan[]; rejected: BuildingPlan[]; milliseconds: number }
