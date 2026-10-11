#!/usr/bin/env bash
# Wrapper: read the device density and measure the card CTA from a screenshot.
#   scripts/measure-card-cta.sh [screenshot-name] [bgHex]
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
NAME="${1:-customer-mobile-card-customize}"
BG="${2:-feb300}"

DENSITY=$("$ADB" -s "$SERIAL" shell wm density 2>/dev/null | tr -d '\r' | awk '{print $3}')
echo "device wm density: ${DENSITY:-unknown}"
DPI=${DENSITY%%.*}
[ -z "$DPI" ] && DPI=420
python3 "$ROOT/scripts/measure-card-cta.py" \
  "$ROOT/.fastfood-dev/${NAME}.png" \
  "$(python3 -c "print($DPI / 160)")" \
  "$BG"