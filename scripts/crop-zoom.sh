#!/usr/bin/env bash
# Crops a region of a screenshot and scales it up, so layout can be inspected
# directly instead of inferred from pixel statistics.
#   scripts/crop-zoom.sh <name> <x0> <y0> <x1> <y1> [scale]
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
python3 - "$ROOT/.fastfood-dev/${1:-customer-mobile-card-cta-compact}.png" \
  "${2:-240}" "${3:-1540}" "${4:-540}" "${5:-1660}" "${6:-4}" <<'PY'
import sys
from PIL import Image

src, x0, y0, x1, y1, scale = sys.argv[1], *map(int, sys.argv[2:7])
img = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
out = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
dest = f"{src.rsplit('.', 1)[0]}-crop.png"
out.save(dest)
print(f"saved {dest} ({out.width}x{out.height}) from {img.width}x{img.height} @x{scale}")
PY