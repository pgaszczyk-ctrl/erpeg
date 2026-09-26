#!/usr/bin/env bash
# Cuts small maps around every railway station in the Lublin region out of
# the region file and fetches the railway timetables (GTFS). Called by
# scripts/fetch-osm.sh with the region .pbf. Writes data/towns.json,
# data/towns/<id>.geojsonseq.gz and data/rail.json.
# Needs: osmium-tool, node, curl, unzip, gzip.
set -euo pipefail

PBF="$1"
WORK=$(mktemp -d)

# Stations and halts of the whole region.
osmium tags-filter "$PBF" n/railway=station,halt -o "$WORK/stations.pbf"
osmium export "$WORK/stations.pbf" -f geojsonseq -o "$WORK/stations.geojsonseq"

mkdir -p "$WORK/towns"
node scripts/plan-towns.mjs "$WORK/stations.geojsonseq" "$WORK/towns" "$WORK/extracts.json"

# Keep only what the game draws (the same list as for Lublin), once for the
# whole region, so the cut-outs below are small and quick.
osmium tags-filter "$PBF" \
  wr/building \
  w/highway \
  w/railway=rail,tram,light_rail \
  n/railway=station,halt \
  w/waterway=river,stream,canal,ditch,drain \
  wr/natural=water,wood,scrub,grassland,wetland \
  wr/landuse=grass,forest,meadow,recreation_ground,cemetery,allotments,village_green,farmland,orchard,reservoir,basin \
  wr/leisure=park,garden,pitch,playground,stadium,track \
  wr/amenity=parking \
  n/addr:housenumber \
  nwr/shop=supermarket,convenience,discount \
  nwr/amenity=school,place_of_worship,townhall,hospital,police,library \
  nwr/office=government \
  --overwrite -o "$WORK/filtered.pbf"

# Cut the towns out in batches of 15 (all at once runs out of memory).
node -e '
  const fs = require("fs");
  const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  for (let i = 0; i * 15 < c.extracts.length; i++)
    fs.writeFileSync(`${process.argv[1]}.${i}`, JSON.stringify({ ...c, extracts: c.extracts.slice(i * 15, i * 15 + 15) }));
' "$WORK/extracts.json"
for cfg in "$WORK"/extracts.json.*; do
  osmium extract -c "$cfg" -s complete_ways --overwrite "$WORK/filtered.pbf"
done

rm -rf data/towns
mkdir -p data/towns
for f in "$WORK"/towns/*.pbf; do
  id=$(basename "$f" .pbf)
  osmium export "$f" -f geojsonseq --overwrite -o "$WORK/$id.geojsonseq"
  gzip -9 -c "$WORK/$id.geojsonseq" > "data/towns/$id.geojsonseq.gz"
done
du -sh data/towns

# Railway timetables (open GTFS data for Polish trains); each one is optional.
GTFS=()
for op in polregio pkpic; do
  if curl -sSfL -o "$WORK/$op.zip" "https://mkuran.pl/gtfs/$op.zip"; then
    mkdir -p "$WORK/$op" && unzip -q -o "$WORK/$op.zip" -d "$WORK/$op" && GTFS+=("$WORK/$op")
  else
    echo "timetable $op not available"
  fi
done
node scripts/rail-from-gtfs.mjs ${GTFS[@]+"${GTFS[@]}"}
