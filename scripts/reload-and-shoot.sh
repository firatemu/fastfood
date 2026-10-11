#!/usr/bin/env bash
# Restarts the installed customer-mobile build against the running Metro, waits
# for the bundle, scrolls to the product grid, captures and measures the CTA.
#
# `am force-stop` matters: re-sending the launch intent to an already-running
# task does not re-fetch the bundle, so the app can keep rendering a stale module
# (it did — a stale overlay reported an error that no longer existed in source).
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
PKG="com.azemyazilim.fastfoodcustomer"
NAME="${1:-customer-mobile-card-cta-compact}"
SWIPES="${2:-1}"

"$ADB" -s "$SERIAL" reverse tcp:8081 tcp:8081 >/dev/null 2>&1
"$ADB" -s "$SERIAL" reverse tcp:4000 tcp:4000 >/dev/null 2>&1

echo "force-stopping $PKG and Expo Go"
"$ADB" -s "$SERIAL" shell am force-stop "$PKG" >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell am force-stop host.exp.exponent >/dev/null 2>&1
sleep 2

"$ADB" -s "$SERIAL" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
echo "launched; waiting for bundle"
sleep 35
bash "$ROOT/scripts/capture.sh" "$NAME" "$SWIPES"
bash "$ROOT/scripts/measure-card-cta.sh" "$NAME"