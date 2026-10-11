#!/usr/bin/env bash
# Deep status: is the build alive, and what is it actually doing right now?
set -uo pipefail
APP="${1:-customer-mobile}"
LOG="/tmp/${APP}-android-build.log"
PIDFILE="/tmp/${APP}-android-build.pid"

echo "=== runner alive? ==="
if [ -f "$PIDFILE" ]; then
  pid=$(cat "$PIDFILE")
  if kill -0 "$pid" 2>/dev/null; then echo "RUNNING pid=$pid"; else echo "DEAD pid=$pid"; fi
else
  echo "no pidfile"
fi

echo
echo "=== gradle / java processes ==="
pgrep -af 'GradleWrapperMain|gradle' 2>/dev/null | head -5 || echo "no gradle"
echo "--- top java by cpu ---"
ps -eo pid,etime,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -8

echo
echo "=== log size / last lines ==="
echo "lines: $(wc -l < "$LOG")"
echo "modified: $(stat -c %y "$LOG" 2>/dev/null)"
echo "now:      $(date -Is)"
tail -6 "$LOG"

echo
echo "=== APK present? ==="
APK="/home/azem/projects/fastfood/apps/${APP}/android/app/build/outputs/apk/debug/app-debug.apk"
ls -la "$APK" 2>&1 || echo "no apk yet"
echo
echo "=== intermediate outputs ==="
find "/home/azem/projects/fastfood/apps/${APP}/android/app/build/outputs" -type f 2>/dev/null | head -10 || echo "no outputs dir"