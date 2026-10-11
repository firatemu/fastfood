#!/usr/bin/env bash
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
python3 "$ROOT/scripts/pixel-column.py" \
  "$ROOT/.fastfood-dev/${1:-customer-mobile-card-customize}.png" \
  "${2:-300}" "${3:-240}" "${4:-880}"