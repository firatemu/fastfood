#!/usr/bin/env bash
# Polls a detached Android build. Safe to call repeatedly; read-only.
#
#   wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/android-build-status.sh courier-mobile
set -uo pipefail

APP="${1:-courier-mobile}"
LOG="/tmp/${APP}-android-build.log"
PIDFILE="/tmp/${APP}-android-build.pid"

if [ ! -f "$LOG" ]; then
  echo "NO LOG at $LOG — build was never started for ${APP}"
  exit 1
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "STATE: RUNNING (pid $(cat "$PIDFILE"))"
else
  echo "STATE: not running"
fi

echo "log lines: $(wc -l < "$LOG")"
echo "--- last 25 lines ---"
tail -25 "$LOG"

echo
echo "--- failure scan ---"
if grep -qE '^e: |BUILD FAILED|What went wrong|CMake Error|Execution failed' "$LOG"; then
  echo "FAILURE MARKERS FOUND:"
  grep -nE '^e: |BUILD FAILED|What went wrong|CMake Error|Execution failed' "$LOG" | head -15
else
  echo "no failure markers yet"
fi

echo
echo "--- completed markers ---"
grep -nE 'BUILD SUCCESS|BUILD FAILED|exit code|local.properties restored' "$LOG" | tail -5 || true

if [ -f "${LOG}.exit" ]; then
  echo
  echo "FINAL EXIT CODE: $(cat "${LOG}.exit")"
fi