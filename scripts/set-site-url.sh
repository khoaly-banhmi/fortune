#!/usr/bin/env bash
# Usage: scripts/set-site-url.sh https://khoaly.xyz/fortune/
# Link previews need an absolute URL. Replaces the __SITE_URL__ placeholder in index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
url="${1:?Usage: $0 https://your.site/path/}"
case "$url" in */) ;; *) url="$url/" ;; esac
sed -i.bak "s|__SITE_URL__|$url|g" index.html && rm index.html.bak
echo "og/canonical URLs now point at $url"
