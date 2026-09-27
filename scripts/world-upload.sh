#!/usr/bin/env bash
# Copies one Protomaps world map build (~140 GB) into the R2 bucket in 1 GB
# parts (S3 multipart upload), four at a time, each part fetched with a byte
# range and retried on its own: one long stream broke after half an hour.
# Usage: world-upload.sh <build file name> ; needs ENDPOINT, BUCKET and the AWS_* keys.
set -euo pipefail
B="$1"
URL="https://build.protomaps.com/$B"
KEY="world-$B"
PART=$((1024 * 1024 * 1024))
SIZE=$(curl -sfI --http1.1 "$URL" | grep -i '^content-length' | tr -dc '0-9')
N=$(( (SIZE + PART - 1) / PART ))
echo "Size $SIZE bytes, $N parts"
API="aws s3api --endpoint-url $ENDPOINT"
UPLOAD=$($API create-multipart-upload --bucket "$BUCKET" --key "$KEY" --query UploadId --output text)
echo "Upload $UPLOAD"
WORK=$(mktemp -d)
export URL KEY PART SIZE API UPLOAD WORK BUCKET

part() {
  local n=$1 from=$(( ($1 - 1) * PART )) to f="$WORK/p$1"
  to=$(( from + PART - 1 )); [ $to -ge $SIZE ] && to=$(( SIZE - 1 ))
  for try in 1 2 3 4 5 6; do
    if curl -sfL --http1.1 --retry 3 -r "$from-$to" -o "$f" "$URL" && [ "$(stat -c %s "$f")" -eq $(( to - from + 1 )) ] \
       && etag=$($API upload-part --bucket "$BUCKET" --key "$KEY" --upload-id "$UPLOAD" --part-number "$n" --body "$f" --query ETag --output text); then
      echo "{\"PartNumber\":$n,\"ETag\":$etag}" > "$WORK/e$n.json"
      rm -f "$f"
      echo "part $n ok"
      return 0
    fi
    echo "part $n try $try failed"; sleep $(( try * 10 ))
  done
  return 1
}
export -f part

if ! seq 1 "$N" | xargs -P 4 -I{} bash -c 'part {}'; then
  $API abort-multipart-upload --bucket "$BUCKET" --key "$KEY" --upload-id "$UPLOAD" || true
  echo "Upload failed"; exit 1
fi
{ echo '{"Parts":['; for n in $(seq 1 "$N"); do cat "$WORK/e$n.json"; [ "$n" -lt "$N" ] && echo ','; done; echo ']}'; } > "$WORK/parts.json"
$API complete-multipart-upload --bucket "$BUCKET" --key "$KEY" --upload-id "$UPLOAD" --multipart-upload "file://$WORK/parts.json"
echo "Done: $KEY"
