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
  nwr/amenity=school,place_of_worship,townhall,hospital,police,library,bank \
  nwr/tourism=hotel,hostel,guest_house,motel \
  nwr/office=government \
  --overwrite -o "$WORK/filtered.pbf"

# Cut the towns out one by one (many at once runs the runner out of memory).
ls -lh "$WORK/filtered.pbf"
free -m || true
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  for (const e of c.extracts) console.log(e.output.replace(/\.pbf$/, ""), e.bbox.join(","));
' "$WORK/extracts.json" > "$WORK/boxes.txt"
while read -r id box; do
  osmium extract -b "$box" -s complete_ways --overwrite -o "$WORK/towns/$id.pbf" "$WORK/filtered.pbf"
done < "$WORK/boxes.txt"
echo "cut $(ls "$WORK"/towns/*.pbf | wc -l) towns"

rm -rf data/towns
mkdir -p data/towns
for f in "$WORK"/towns/*.pbf; do
  id=$(basename "$f" .pbf)
  osmium export "$f" -f geojsonseq --overwrite -o "$WORK/$id.geojsonseq"
  gzip -9 -c "$WORK/$id.geojsonseq" > "data/towns/$id.geojsonseq.gz"
done
du -sh data/towns

# Train lines (route=train relations list their stops in order): which
# station follows which, for the coachmen.
osmium tags-filter "$PBF" r/route=train --overwrite -o "$WORK/routes.pbf"
osmium cat "$WORK/routes.pbf" -f opl --overwrite -o "$WORK/routes.opl"
node scripts/rail-from-osm.mjs "$WORK/routes.opl"
