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

# One pass over the region cuts out every town.
osmium extract -c "$WORK/extracts.json" -s smart --overwrite "$PBF"

rm -rf data/towns
mkdir -p data/towns
for f in "$WORK"/towns/*.pbf; do
  id=$(basename "$f" .pbf)
  osmium tags-filter "$f" \
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
    --overwrite -o "$WORK/f-$id.pbf"
  osmium export "$WORK/f-$id.pbf" -f geojsonseq --overwrite -o "$WORK/$id.geojsonseq"
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
node scripts/rail-from-gtfs.mjs "${GTFS[@]}"
