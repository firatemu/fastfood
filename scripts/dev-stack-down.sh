#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS="$ROOT/.fastfood-dev/pids"

stop_pidfile() {
  local name="$1"
  local f="$PIDS/$name.pid"
  if [[ ! -f "$f" ]]; then
    return 0
  fi
  local pid
  pid="$(cat "$f")"
  if kill -0 "$pid" 2>/dev/null; then
    echo "[$name] stopping pid $pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$f"
}

for svc in storefront worker api; do
  stop_pidfile "$svc"
done

echo "Node apps stopped. Docker infra still running (pnpm infra:down to stop)."
