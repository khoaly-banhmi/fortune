#!/usr/bin/env bash
# Regenerates assets/favicon.svg plus PNG fallbacks (Safari/iOS don't all use SVG icons).
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
python3 scripts/make-icons.py
render() { # <svg> <out.png> <size>
  local tmp; tmp="$(mktemp -d)"
  cat > "$tmp/i.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:512px;height:512px}</style><img src="file://$PWD/$1">
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=512,512 \
    --default-background-color=00000000 --allow-file-access-from-files --screenshot="$tmp/big.png" "file://$tmp/i.html" >/dev/null 2>&1
  sips -z "$3" "$3" "$tmp/big.png" --out "$2" >/dev/null
  rm -rf "$tmp"
}
render scripts/icon-square.svg assets/apple-touch-icon.png 180
render assets/favicon.svg assets/favicon-32.png 32
echo "icons written to assets/"
