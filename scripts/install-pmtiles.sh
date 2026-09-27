#!/usr/bin/env bash
# Installs the pmtiles command-line tool (github.com/protomaps/go-pmtiles) into /usr/local/bin.
set -euo pipefail
url=$(curl -sfL https://api.github.com/repos/protomaps/go-pmtiles/releases/latest | grep -o '"browser_download_url": *"[^"]*Linux_x86_64.tar.gz"' | cut -d'"' -f4)
curl -sfL "$url" | sudo tar -xz -C /usr/local/bin pmtiles
pmtiles version || true
