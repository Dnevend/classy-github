#!/usr/bin/env bash
# Render the four cards to 2048x2048 PNG with headless Chrome.
# Usage: bash assets/nft/tools/export.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$ROOT/assets/nft/src"
OUT="$ROOT/assets/nft/export"
TMP="${TMPDIR:-/tmp}/classygit-nft-render"
mkdir -p "$OUT" "$TMP"

CHROME="${CHROME:-google-chrome}"

for theme in mac nes win98 tui; do
  cat > "$TMP/$theme.html" <<HTML
<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#F2F2F2;}
  img{display:block;width:2048px;height:2048px;}
</style></head>
<body><img src="file://$SRC/$theme.svg" width="2048" height="2048" alt=""></body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=2048,2048 \
    --default-background-color=00000000 \
    --screenshot="$OUT/$theme.png" "file://$TMP/$theme.html" >/dev/null 2>&1
  echo "$OUT/$theme.png"
done

python3 - "$OUT" <<'PY'
import os, sys, struct
out = sys.argv[1]
for name in ("mac", "nes", "win98", "tui"):
    p = os.path.join(out, name + ".png")
    with open(p, "rb") as fh:
        head = fh.read(33)
    w, h = struct.unpack(">II", head[16:24])
    print(f"{name}.png  {w}x{h}  {os.path.getsize(p)/1024:.0f} KB")
PY
