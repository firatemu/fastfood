#!/usr/bin/env bash
# Prints the mustard spans per row in a y-range, so the chip box can be read off
# directly instead of inferred from band heuristics.
#   scripts/mustard-rows.sh <name> <y0> <y1> [hex] [minSpan]
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
python3 - "$ROOT/.fastfood-dev/${1:-customer-mobile-card-cta-compact}.png" \
  "${2:-1540}" "${3:-1660}" "${4:-feb300}" "${5:-50}" <<'PY'
import re
import sys
from PIL import Image

path, y0, y1, hexv, minspan = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
target = tuple(int(hexv[i:i+2], 16) for i in (0, 2, 4))
img = Image.open(path).convert("RGB")
px = img.load()
for y in range(y0, min(y1, img.size[1])):
    spans = []
    start = None
    for x in range(img.size[0]):
        hit = all(abs(px[x, y][i] - target[i]) <= 8 for i in range(3))
        if hit and start is None:
            start = x
        elif not hit and start is not None:
            if x - start >= minspan:
                spans.append((start, x - 1, x - start))
            start = None
    if start is not None and img.size[0] - start >= minspan:
        spans.append((start, img.size[0] - 1, img.size[0] - start))
    print(f"y={y}: {spans}")
PY