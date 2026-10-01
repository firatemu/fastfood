#!/usr/bin/env bash
# Local FASTFOOD stack (infra + API + worker + storefront). Development-only — not production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.fastfood-dev"
LOGS="$STATE/logs"
PIDS="$STATE/pids"
mkdir -p "$LOGS" "$PIDS"

port_listen() {
  ss -tln 2>/dev/null | grep -q ":$1 "
}

wait_http() {
  local url="$1"
  local tries="${2:-30}"
  for _ in $(seq 1 "$tries"); do
    if curl -fsS -m 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_bg() {
  local name="$1"
  shift
  local pidfile="$PIDS/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local old
    old="$(cat "$pidfile")"
    if kill -0 "$old" 2>/dev/null; then
      echo "[$name] already running (pid $old)"
      return 0
    fi
  fi
  echo "[$name] starting…"
  (cd "$ROOT" && "$@") >>"$LOGS/$name.log" 2>&1 &
  echo $! >"$pidfile"
  echo "[$name] pid $(cat "$pidfile") → $LOGS/$name.log"
}

cd "$ROOT"

echo "==> Docker infra (restart: unless-stopped)"
pnpm infra:up
docker compose -f infrastructure/docker/docker-compose.yml ps

if ! docker exec fastfood-postgres psql -U fastfood -d fastfood -tAc \
  "SELECT 1 FROM pg_extension WHERE extname='postgis'" 2>/dev/null | grep -q 1; then
  echo "==> Ensuring PostGIS extension"
  docker exec fastfood-postgres psql -U fastfood -d fastfood -c "CREATE EXTENSION IF NOT EXISTS postgis;" || true
fi

if ! port_listen 4000; then
  if [[ ! -f "$ROOT/apps/api/dist/main.js" ]]; then
    echo "==> Building API"
    pnpm --filter @fastfood/api build
  fi
  start_bg api pnpm --filter @fastfood/api start
  wait_http "http://127.0.0.1:4000/health/live" 45 || {
    echo "API failed to become healthy — see $LOGS/api.log" >&2
    exit 1
  }
else
  echo "[api] port 4000 in use — assuming API is up"
fi

if ! port_listen 3100; then
  start_bg storefront pnpm --filter @fastfood/storefront-web dev
  wait_http "http://127.0.0.1:3100/" 60 || {
    echo "Storefront failed — see $LOGS/storefront.log" >&2
    exit 1
  }
else
  echo "[storefront] port 3100 in use — skipping"
fi

# Worker: optional; start if not already managed
if ! [[ -f "$PIDS/worker.pid" ]] || ! kill -0 "$(cat "$PIDS/worker.pid")" 2>/dev/null; then
  if [[ -f "$ROOT/apps/worker/dist/main.js" ]]; then
    start_bg worker pnpm --filter @fastfood/worker start
  else
    start_bg worker pnpm --filter @fastfood/worker start:dev
  fi
fi

cat <<EOF

FASTFOOD local stack is up (persistent until dev:stack:down).

  Storefront:  http://localhost:3100
  API:         http://localhost:4000/api/v1
  API health:  http://localhost:4000/health/live
  Postgres:    localhost:5439  (user/db: fastfood)
  Redis:       localhost:6388
  MinIO API:   http://localhost:9098

Logs: $LOGS/
Stop: pnpm dev:stack:down

EOF
