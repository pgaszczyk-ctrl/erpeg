#!/usr/bin/env bash
set -euo pipefail

# Konwersja dostarczonej animacji; źródła grafika pozostają nienaruszone.
# Wymaga ffmpeg z libwebp i libx264. Gra używa gotowych plików w public/;
# ta konwersja nie jest częścią zwykłego builda ani wczytywania mapy OSM.
loading_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$loading_root"
loading_tmp="$(mktemp -d)"
trap 'rm -rf -- "$loading_tmp"' EXIT
loading_source='scripts/ladowanie-zrodla/36/Exp_lore_loading_ziemia_steampunk.gif'
mkdir -p public/loading36
ffmpeg -y -hide_banner -loglevel error -i "$loading_source" -frames:v 1 "$loading_tmp/frame.png"
ffmpeg -y -hide_banner -loglevel error -i "$loading_tmp/frame.png" -vf scale=360:202 -frames:v 1 -c:v libwebp -quality 35 public/loading36/map-preview.webp
ffmpeg -y -hide_banner -loglevel error -i "$loading_tmp/frame.png" -frames:v 1 -c:v libwebp -quality 78 public/loading36/map-poster.webp
ffmpeg -y -hide_banner -loglevel error -i "$loading_source" -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart public/loading36/map-animation.mp4
wc -c public/loading36/*
