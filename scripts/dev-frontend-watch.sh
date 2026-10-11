#!/usr/bin/env bash
# Persistent, auto-restarting dev server with HMR for a customer/admin surface.
#
# Usage:
#   scripts/dev-frontend-watch.sh storefront
#   scripts/dev-frontend-watch.sh api
#
# Env overrides:
#   PORT  — port to free (default: storefront=3100, api=4000)
#   PKG   — workspace filter (default: derived)
#   LOG   — log file (default: /tmp/<name>.log)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:-}"
if [[ -z "$NAME" ]]; then
  echo "usage: $0 <storefront|api|admin|qr>" >&2
  exit 2
fi

case "$NAME" in
  storefront) PORT="${PORT:-3100}"; PKG="${PKG:-@fastfood/storefront-web}"; LOG="${LOG:-/tmp/storefront-web-watch.log}";;
  api)        PORT="${PORT:-4000}"; PKG="${PKG:-@fastfood/api}";          LOG="${LOG:-/tmp/api-watch.log}";;
  admin)      PORT="${PORT:-3101}"; PKG="${PKG:-@fastfood/admin-web}";     LOG="${LOG:-/tmp/admin-web-watch.log}";;
  qr)         PORT="${PORT:-3104}"; PKG="${PKG:-@fastfood/qr-menu}";       LOG="${LOG:-/tmp/qr-menu-watch.log}";;
  *) echo "unknown surface: $NAME" >&2; exit 2;;
esac

port_pid() {
  ss -ltnp 2>/dev/null | awk -v p=":$PORT" '$4 ~ p {print $0}' \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1
}

cleanup() {
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

pid="$(port_pid || true)"
if [[ -n "${pid:-}" ]]; then
  echo "[dev-frontend-watch] freeing port $PORT from pid $pid"
  kill "$pid" 2>/dev/null || true
  sleep 1
fi

cd "$ROOT"
echo "[dev-frontend-watch] starting $PKG on $PORT (HMR enabled) → $LOG"
exec pnpm --filter "$PKG" dev
