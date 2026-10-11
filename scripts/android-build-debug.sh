#!/usr/bin/env bash
# Diagnoses why the detached build did not survive.
set -uo pipefail
APP="${1:-courier-mobile}"
LOG="/tmp/${APP}-android-build.log"
PIDFILE="/tmp/${APP}-android-build.pid"

echo "=== log file ==="
ls -la "$LOG" 2>&1 || echo "log missing"
echo "--- content (first 40) ---"
head -40 "$LOG" 2>&1 || true

echo
echo "=== pid file ==="
if [ -f "$PIDFILE" ]; then
  pid=$(cat "$PIDFILE")
  echo "pid=$pid"
  if kill -0 "$pid" 2>/dev/null; then echo "pid alive"; else echo "pid DEAD"; fi
else
  echo "no pidfile"
fi

echo
echo "=== any gradle running? ==="
pgrep -af -i gradle 2>/dev/null | head -10 || echo "no gradle processes"
echo "--- java procs ---"
pgrep -af java 2>/dev/null | head -10 || echo "no java processes"

echo
echo "=== local.properties now ==="
grep sdk.dir "/home/azem/projects/fastfood/apps/${APP}/android/local.properties" 2>&1
echo "--- .orig backup present? ---"
ls -la "/home/azem/projects/fastfood/apps/${APP}/android/local.properties.orig" 2>&1 || echo "no .orig"

echo
echo "=== exit marker? ==="
ls -la "${LOG}.exit" 2>&1 || echo "no exit marker"