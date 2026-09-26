// Turns railway timetables (GTFS, e.g. POLREGIO and PKP Intercity) into the
// small data/rail.json the coachmen use: which station comes next along a line.
// Stations are matched to the game's stations (data/towns.json) by position.
// Usage: node scripts/rail-from-gtfs.mjs <gtfs-dir> [<gtfs-dir> ...]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const dirs = process.argv.slice(2).filter((d) => existsSync(`${d}/stop_times.txt`));
const plan = JSON.parse(readFileSync('data/towns.json', 'utf8'));

// Our stations: "<map>|<station name>".
const ours = [
  ...plan.lublin.map((s) => ({ key: `lublin|${s.name}`, ...s })),
  ...plan.towns.flatMap((t) => t.stations.map((s) => ({ key: `${t.id}|${s.name}`, ...s }))),
];
const M_LAT = 111132;
const mLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const nearest = (lon, lat) => {
  let best = null;
  let bd = 500; // metres
  for (const s of ours) {
    const d = Math.hypot((s.lon - lon) * mLon(lat), (s.lat - lat) * M_LAT);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
};

/** A small CSV reader (quoted fields, commas inside quotes). */
function csv(file) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (l) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) {
        if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]);
  return { head, rows: lines.slice(1).map(split), col: (n) => head.indexOf(n) };
}

const mins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const edges = new Map(); // "a>b" -> { from, to, min: [], dep: Set }
for (const dir of dirs) {
  const stops = csv(`${dir}/stops.txt`);
  const match = new Map();
  for (const r of stops.rows) {
    const s = nearest(Number(r[stops.col('stop_lon')]), Number(r[stops.col('stop_lat')]));
    if (s) match.set(r[stops.col('stop_id')], s.key);
  }
  const st = csv(`${dir}/stop_times.txt`);
  const [cTrip, cSeq, cStop, cArr, cDep] = ['trip_id', 'stop_sequence', 'stop_id', 'arrival_time', 'departure_time'].map((n) => st.col(n));
  const trips = new Map();
  for (const r of st.rows) {
    const key = match.get(r[cStop]);
    if (!key) continue;
    if (!trips.has(r[cTrip])) trips.set(r[cTrip], []);
    trips.get(r[cTrip]).push({ seq: Number(r[cSeq]), key, arr: mins(r[cArr] || r[cDep]), dep: mins(r[cDep] || r[cArr]) });
  }
  for (const list of trips.values()) {
    list.sort((a, b) => a.seq - b.seq);
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (a.key === b.key) continue;
      const k = `${a.key}>${b.key}`;
      if (!edges.has(k)) edges.set(k, { from: a.key, to: b.key, min: [], dep: new Set() });
      const e = edges.get(k);
      e.min.push(Math.max(1, b.arr - a.dep));
      e.dep.add(hhmm(a.dep));
    }
  }
  console.log(`rail: ${dir}: ${match.size} stops matched, ${trips.size} trips`);
}

// Only which station follows which: the coachman always waits, no hours.
const out = [...edges.values()].map((e) => ({ from: e.from, to: e.to }));
writeFileSync('data/rail.json', JSON.stringify({ source: dirs.length ? 'gtfs' : 'none', edges: out }));
console.log(`rail: ${out.length} connections between game stations`);
