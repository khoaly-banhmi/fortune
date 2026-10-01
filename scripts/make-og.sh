#!/usr/bin/env bash
# Renders scripts/og.html (frame 8: the opened cookie with a blank slip) to assets/og-image.png at 1200x630.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --allow-file-access-from-files \
  --screenshot="$PWD/assets/og-image.png" "file://$PWD/scripts/og.html"
echo "wrote assets/og-image.png"
