#!/usr/bin/env bash
# Pack the extension for Chrome Web Store submission.
# Output: dist/download-shuttle-link-v<VERSION>.zip
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(grep '"version"' src/manifest.json | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/')
OUT="dist/download-shuttle-link-v${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

(cd src && zip -rq "../$OUT" . -x "*.DS_Store" "*/.DS_Store")

echo "Packed → $OUT ($(du -h "$OUT" | cut -f1))"
