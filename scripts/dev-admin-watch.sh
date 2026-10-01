#!/usr/bin/env bash
# Persistent, auto-restarting admin-web dev server with HMR.
#
# Usage:
#   pnpm dev:admin:watch       # foreground
#   nohup pnpm dev:admin:watch >/tmp/admin-web-watch.log 2>&1 &
#
# Behaviour:
#   - kills any orphaned process on port 3101,
#   - runs `pnpm --filter @fastfood/admin-web dev` (which already enables
#     Turbopack HMR),
#   - on exit (Ctrl-C / SIGTERM) cleans up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3101
LOG="${LOG:-/tmp/admin-web-watch.log}"

port_pid() {
  ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {print $0}' \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1
}

cleanup() {
  echo "[dev-admin-watch] cleanup…"
  local pid
  pid="$(port_pid || true)"
  if [[ -n "${pid:-}" ]]; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  fi
  pkill -f "next dev.*-p $PORT" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "[dev-admin-watch] freeing port $PORT"
pid="$(port_pid || true)"
if [[ -n "${pid:-}" ]]; then
  kill "$pid" 2>/dev/null || true
  sleep 1
fi

cd "$ROOT"
echo "[dev-admin-watch] starting next dev on $PORT (HMR enabled) → $LOG"
exec pnpm --filter @fastfood/admin-web dev
