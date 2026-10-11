#!/usr/bin/env bash
# Taps a point on the emulator and captures the result, so a navigation claim is
# backed by what the screen actually shows.
#   scripts/tap-shoot.sh <x> <y> <name> [settle-seconds]
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
X="${1:-283}"
Y="${2:-1394}"
NAME="${3:-tap-result}"
SETTLE="${4:-4}"

"$ADB" -s "$SERIAL" shell input tap "$X" "$Y"
sleep "$SETTLE"
bash "$ROOT/scripts/capture.sh" "$NAME" 0