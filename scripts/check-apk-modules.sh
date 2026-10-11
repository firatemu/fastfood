#!/usr/bin/env bash
# Proves whether a native module is actually compiled into the built APK.
# This separates "the module is missing from the app" from "the module is
# present in the app but absent from the Expo Go runtime we launched it on" —
# two very different problems that look identical on screen.
set -uo pipefail
APP="${1:-customer-mobile}"
APK="/home/azem/projects/fastfood/apps/${APP}/android/app/build/outputs/apk/debug/app-debug.apk"

[ -f "$APK" ] || { echo "FAIL: no APK at $APK"; exit 1; }

echo "=== native modules compiled into $(basename "$APK") ==="
unzip -l "$APK" 2>/dev/null \
  | awk '{print $4}' \
  | grep -oE 'expo/modules/[a-z0-9_]+' \
  | sort -u \
  | sed 's|expo/modules/|  |' \
  | head -40

echo
echo "=== specific checks ==="
for probe in clipboard camera secure_store; do
  hit=$(unzip -l "$APK" 2>/dev/null | grep -ic "$probe")
  if [ "$hit" -gt 0 ]; then
    echo "  $probe: PRESENT in APK ($hit entries)"
  else
    echo "  $probe: absent from APK"
  fi
done

echo
echo "=== Expo modules available in the Expo Go runtime on the device ==="
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
"$ADB" -s "$SERIAL" shell dumpsys package host.exp.exponent 2>/dev/null \
  | grep -m1 'versionName' | tr -d '\r' | sed 's/^/  Expo Go /'