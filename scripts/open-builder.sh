#!/usr/bin/env bash
# Relaunches the app in Expo Go and opens the "Özel Yarat" builder tab.
# No BACK presses: navigating out of Expo Go drops to the Android launcher, and
# the builder tab is one tap away anyway.
set -uo pipefail
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
OUT="/home/azem/projects/fastfood/.fastfood-dev/customer-mobile-builder.png"

echo "relaunching Expo Go..."
"$ADB" -s "$SERIAL" shell am start -a android.intent.action.VIEW \
  -d "exp://127.0.0.1:8081" host.exp.exponent >/dev/null 2>&1
sleep 9

# Middle of the five-item tab bar on a 1080x2400 screen.
"$ADB" -s "$SERIAL" shell input tap 540 2280 >/dev/null 2>&1
sleep 5

"$ADB" -s "$SERIAL" exec-out screencap -p > "$OUT" 2>/dev/null
echo "saved $OUT ($(stat -c %s "$OUT") bytes)"

echo
echo "=== what is on screen? ==="
"$ADB" -s "$SERIAL" shell dumpsys activity activities 2>/dev/null \
  | grep -m1 'topResumedActivity' | tr -d '\r' | sed 's/^/  /'