#!/usr/bin/env bash
# Starts the FASTFOOD API detached and waits until it actually answers.
# "Started" is only true once /health/live returns 200 — the process existing
# is not evidence that Nest finished booting.
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
API_DIR="$ROOT/apps/api"
LOG="/tmp/ff-api.log"
PIDFILE="/tmp/ff-api.pid"
PORT=4000

# `corepack` resolves to the *Windows* install (/mnt/c/Program Files/nodejs/...)
# which is not executable from a detached setsid context. Use the native Linux
# pnpm that volta provides instead.
PNPM="${PNPM:-$HOME/.volta/bin/pnpm}"
if [ ! -x "$PNPM" ]; then
  PNPM="$(command -v pnpm || true)"
fi
[ -x "$PNPM" ] || { echo "FAIL: no usable pnpm (looked for volta and PATH)"; exit 1; }
echo "using pnpm: $PNPM"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "API already running (pid $(cat "$PIDFILE"))"
else
  cd "$API_DIR" || exit 1
  : > "$LOG"
  rm -f "$PIDFILE"
  setsid nohup "$PNPM" start:dev > "$LOG" 2>&1 < /dev/null &
  echo $! > "$PIDFILE"
  echo "launched api pid $(cat "$PIDFILE")"
fi

echo "waiting for http://localhost:${PORT}/health/live ..."
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://localhost:${PORT}/health/live" 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "API is UP after ~${i}s (health/live -> 200)"
    echo "--- storefront/home probe ---"
    curl -s -o /dev/null -w 'storefront/home -> HTTP %{http_code}\n' --max-time 5 \
      "http://localhost:${PORT}/api/v1/storefront/home"
    exit 0
  fi
  if ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "FAIL: api process died during startup"
    echo "--- last 40 log lines ---"
    tail -40 "$LOG"
    exit 1
  fi
  sleep 1
done

echo "FAIL: api did not become healthy within 60s"
echo "--- last 40 log lines ---"
tail -40 "$LOG"
exit 1