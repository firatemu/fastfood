#!/usr/bin/env bash
# Installs the emulator-ABI debug APK and launches it.
# The Expo Go client cannot load the native modules this app ships
# (clipboard/camera/secure-store), so those screens are only reachable from the
# standalone build. adb reverse must already be in place so the debug build can
# reach Metro on :8081 and the API on :4000.
#   scripts/install-apk.sh <app>
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
APP="${1:-customer-mobile}"
PKG="$ROOT/apps/$APP/android/app/build/outputs/apk/debug/app-debug.apk"

[ -f "$PKG" ] || { echo "FAIL: no APK at $PKG"; exit 1; }

echo "=== adb reverse ==="
"$ADB" -s "$SERIAL" reverse tcp:8081 tcp:8081
"$ADB" -s "$SERIAL" reverse tcp:4000 tcp:4000
"$ADB" -s "$SERIAL" reverse --list

echo "=== install ==="
"$ADB" -s "$SERIAL" install -r -d "$PKG" 2>&1 | tail -3

echo "=== launch ==="
"$ADB" -s "$SERIAL" shell monkey -p com.azemyazilim.fastfoodcustomer \
  -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
echo "launched; Metro pid: $(cat /tmp/customer-mobile-metro.pid 2>/dev/null || echo unknown)"