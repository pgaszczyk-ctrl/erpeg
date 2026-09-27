#!/usr/bin/env bash
# Prints the name of the newest Protomaps world map build (e.g. 20260926.pmtiles)
# found on build.protomaps.com, trying the last two weeks day by day.
set -euo pipefail
for i in $(seq 0 14); do
  f="$(date -u -d "-$i day" +%Y%m%d).pmtiles"
  if curl -sfI "https://build.protomaps.com/$f" >/dev/null; then echo "$f"; exit 0; fi
done
echo "No Protomaps build found" >&2
exit 1
