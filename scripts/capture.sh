#!/usr/bin/env bash
# Scrolls the running app and captures a screenshot, so a section added during
# the rebuild can be confirmed on-device rather than assumed from its code.
#
#   scripts/capture.sh <out-name> [swipes]
set -uo pipefail
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
NAME="${1:-shot}"
SWIPES="${2:-1}"
OUT_DIR="/home/azem/projects/fastfood/.fastfood-dev"
mkdir -p "$OUT_DIR"

for i in $(seq 1 "$SWIPES"); do
  "$ADB" -s "$SERIAL" shell input swipe 540 1800 540 700 350 >/dev/null 2>&1
  sleep 1.2
done
sleep 1

TARGET="${OUT_DIR}/${NAME}.png"
"$ADB" -s "$SERIAL" exec-out screencap -p > "$TARGET" 2>/dev/null
if [ -s "$TARGET" ]; then
  echo "saved $TARGET ($(stat -c %s "$TARGET") bytes) after ${SWIPES} swipe(s)"
else
  echo "FAIL: empty screenshot"
  exit 1
fi