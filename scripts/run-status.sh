#!/usr/bin/env bash
# Verifies the app is ACTUALLY running on the device: bundle finished, no JS
# errors in logcat, and the screen is not an error/blank state. Starting the
# process is not evidence that the app loaded.
set -uo pipefail
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
LOG="/tmp/customer-mobile-metro.log"
SHOT="/tmp/customer-mobile-screen.png"

echo "=== Metro bundling ==="
grep -E 'Bundled|Waiting on|error|Error|failed|Failed' "$LOG" 2>/dev/null | tail -12 || echo "  (no bundling lines yet)"

echo
echo "=== Metro process ==="
if [ -f /tmp/customer-mobile-metro.pid ] && kill -0 "$(cat /tmp/customer-mobile-metro.pid)" 2>/dev/null; then
  echo "  RUNNING pid=$(cat /tmp/customer-mobile-metro.pid)"
else
  echo "  NOT RUNNING"
fi

echo
echo "=== foreground activity ==="
"$ADB" -s "$SERIAL" shell dumpsys activity activities 2>/dev/null \
  | grep -m3 -E 'mResumedActivity|topResumedActivity|ResumedActivity' \
  | tr -d '\r' | sed 's/^/  /' || echo "  could not read"

echo
echo "=== JS / fatal errors in logcat (last 400 lines) ==="
"$ADB" -s "$SERIAL" logcat -d -t 400 2>/dev/null \
  | grep -iE 'ReactNativeJS|FATAL|AndroidRuntime|Unable to load script|Invariant Violation|expo' \
  | grep -viE 'ExponentActivity|expo.modules.notifications' | tail -20 \
  | tr -d '\r' | sed 's/^/  /' || echo "  none"

echo
echo "=== screenshot ==="
"$ADB" -s "$SERIAL" exec-out screencap -p > "$SHOT" 2>/dev/null
if [ -s "$SHOT" ]; then
  echo "  saved: $SHOT ($(stat -c %s "$SHOT") bytes)"
else
  echo "  screenshot failed"
fi