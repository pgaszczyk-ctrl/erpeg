#!/usr/bin/env bash
# One-off look at the OpenStreetMap data for Zakopane and the Tatras: saves a
# small extract (data/tatry-osm.geojsonseq.gz) and a summary (data/tatry-probe.txt).
set -euo pipefail
WORK=$(mktemp -d)
BBOX=19.80,49.15,20.15,49.33
curl -sSfL -o "$WORK/m.pbf" https://download.geofabrik.de/europe/poland/malopolskie-latest.osm.pbf
osmium extract -b "$BBOX" -s smart "$WORK/m.pbf" -o "$WORK/t.pbf"
osmium tags-filter "$WORK/t.pbf" \
  r/route=hiking,foot w/highway=path,footway,track,steps \
  n/natural=peak,saddle,cave_entrance,spring nwr/natural=scree,bare_rock,shrub,wood,water,glacier,cliff,ridge,arete \
  nwr/tourism=alpine_hut,wilderness_hut,viewpoint,information nwr/amenity=shelter \
  w/aerialway nwr/aerialway=station w/landuse=forest,meadow \
  -o "$WORK/f.pbf"
osmium export "$WORK/f.pbf" -f geojsonseq -o "$WORK/f.geojsonseq" --add-unique-id=type_id
gzip -9c "$WORK/f.geojsonseq" > data/tatry-osm.geojsonseq.gz
OUT=data/tatry-probe.txt
{
  echo "BBOX $BBOX"; ls -lh data/tatry-osm.geojsonseq.gz
  count() { echo "$1: $(osmium tags-filter "$WORK/t.pbf" "$2" -o - -f opl 2>/dev/null | wc -l)"; }
  count "hiking routes" r/route=hiking
  count "paths" w/highway=path
  count "paths with trail_visibility" w/trail_visibility
  count "paths with sac_scale" w/sac_scale
  count "peaks" n/natural=peak
  count "nodes with ele" n/ele
  count "saddles" n/natural=saddle
  count "alpine huts" nwr/tourism=alpine_hut
  count "aerialways" w/aerialway
  count "scree" nwr/natural=scree
  count "bare_rock" nwr/natural=bare_rock
  count "shrub (kosodrzewina)" nwr/natural=shrub
  echo; echo "== hiking route colours =="
  osmium tags-filter "$WORK/t.pbf" r/route=hiking -o - -f opl | grep -o 'osmc:symbol=[^,]*\|colour=[^,]*' | sort | uniq -c | sort -rn | head -30
  echo; echo "== peaks =="
  osmium tags-filter "$WORK/t.pbf" n/natural=peak -o - -f opl | grep -o 'name=[^,]*,.*' | grep -o 'ele=[^,]*\|name=[^,]*' | paste - - | head -80
  echo; echo "== huts =="
  osmium tags-filter "$WORK/t.pbf" nwr/tourism=alpine_hut -o - -f opl | grep -o 'name=[^,]*' | head -40
  echo; echo "== aerialways =="
  osmium tags-filter "$WORK/t.pbf" w/aerialway -o - -f opl | grep -o 'aerialway=[^,]*\|name=[^,]*' | paste -s -d' ' | head -c 3000
} > "$OUT" 2>&1
cat "$OUT"
