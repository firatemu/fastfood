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
  (cd "$ROOT" && setsid nohup "$@" >>"$LOGS/$name.log" 2>&1 < /dev/null & echo $! >"$pidfile")
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
  python3 "$ROOT/scripts/upload-menu-images.py" || true
else
  echo "[api] port 4000 in use — assuming API is up"
  python3 "$ROOT/scripts/upload-menu-images.py" || true
fi

if ! port_listen 3110; then
  start_bg storefront pnpm --filter @fastfood/storefront-web dev
  wait_http "http://127.0.0.1:3110/" 60 || {
    echo "Storefront failed — see $LOGS/storefront.log" >&2
    exit 1
  }
else
  echo "[storefront] port 3110 in use — skipping"
fi

if ! port_listen 3101; then
  start_bg admin pnpm --filter @fastfood/admin-web dev
  wait_http "http://127.0.0.1:3101/" 60 || {
    echo "Admin failed — see $LOGS/admin.log" >&2
    exit 1
  }
else
  echo "[admin] port 3101 in use — skipping"
fi

if ! port_listen 3102; then
  start_bg courier pnpm --filter @fastfood/courier-web dev
  wait_http "http://127.0.0.1:3102/" 60 || {
    echo "Courier failed — see $LOGS/courier.log" >&2
    exit 1
  }
else
  echo "[courier] port 3102 in use — skipping"
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

  Storefront:  http://fastfood.localhost:3110       (or http://localhost:3110)
  Admin:       http://admin.fastfood.localhost:3101 (or http://localhost:3101)
  Courier:     http://kurye.fastfood.localhost:3102 (or http://localhost:3102)
  API:         http://localhost:4000/api/v1
  API health:  http://localhost:4000/health/live
  Postgres:    localhost:5439  (user/db: fastfood)
  Redis:       localhost:6388
  MinIO API:   http://localhost:9098

Logs: $LOGS/
Stop: pnpm dev:stack:down

EOF
