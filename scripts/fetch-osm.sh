#!/usr/bin/env bash
# Downloads OpenStreetMap data for Lublin and saves the features the game
# needs to data/lublin-osm.geojsonseq.gz. Runs in GitHub Actions (see
# .github/workflows/fetch-map.yml); scripts/build-map.mjs then turns it into
# the game map. Needs: curl, osmium-tool, gzip.
set -euo pipefail

WORK=$(mktemp -d)
# The city plus 8 km around Motycz-Józefin, Jastków and Garbów (scripts/lublin-area.json).
BBOX=22.21,51.12,22.72,51.43

curl -sSfL -o "$WORK/lubelskie.pbf" https://download.geofabrik.de/europe/poland/lubelskie-latest.osm.pbf
ls -lh "$WORK/lubelskie.pbf"

osmium extract -b "$BBOX" -s smart "$WORK/lubelskie.pbf" -o "$WORK/lublin.pbf"

osmium tags-filter "$WORK/lublin.pbf" \
  r/boundary=administrative \
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
  nwr/shop=supermarket,convenience,discount,doityourself,hardware,sports,outdoor \
  nwr/amenity=school,place_of_worship,townhall,hospital,police,library,bank,university,college,fuel \
  nwr/tourism=hotel,hostel,guest_house,motel,camp_site,caravan_site \
  nwr/office=government \
  -o "$WORK/filtered.pbf"

osmium export "$WORK/filtered.pbf" -f geojsonseq -o "$WORK/lublin.geojsonseq"
ls -lh "$WORK/lublin.geojsonseq"

mkdir -p data
gzip -9 -c "$WORK/lublin.geojsonseq" > data/lublin-osm.geojsonseq.gz
ls -lh data/lublin-osm.geojsonseq.gz

# Towns by the railway stations of the region, and the train timetables.
scripts/fetch-towns.sh "$WORK/lubelskie.pbf"
