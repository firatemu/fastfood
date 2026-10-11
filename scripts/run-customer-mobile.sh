#!/usr/bin/env bash
# Brings up customer-mobile on the running Android emulator.
#
# Networking: rather than assuming the emulator reaches the host at 10.0.2.2,
# `adb reverse` maps the device's localhost onto the WSL host, so the app can
# use plain `localhost` for both Metro (8081) and the API (4000). That removes
# a whole class of "works on web, blank screen on device" failures.
set -uo pipefail
ROOT="/home/azem/projects/fastfood"
APP_DIR="$ROOT/apps/customer-mobile"
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
METRO_PORT=8081
API_PORT=4000
LOG="/tmp/customer-mobile-metro.log"
PIDFILE="/tmp/customer-mobile-metro.pid"
API_URL="http://localhost:${API_PORT}/api/v1"

PNPM="${PNPM:-$HOME/.volta/bin/pnpm}"
[ -x "$PNPM" ] || { echo "FAIL: no usable pnpm"; exit 1; }

echo "=== device present? ==="
if ! "$ADB" -s "$SERIAL" get-state >/dev/null 2>&1; then
  echo "FAIL: no device at $SERIAL"
  "$ADB" devices -l
  exit 1
fi
echo "  $("$ADB" -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"

echo
echo "=== adb reverse (device localhost -> WSL host) ==="
"$ADB" -s "$SERIAL" reverse tcp:${METRO_PORT} tcp:${METRO_PORT} && echo "  metro ${METRO_PORT} ok"
"$ADB" -s "$SERIAL" reverse tcp:${API_PORT} tcp:${API_PORT} && echo "  api   ${API_PORT} ok"
echo "  active reverses:"
"$ADB" -s "$SERIAL" reverse --list 2>/dev/null | sed 's/^/    /'

echo
echo "=== API reachable from inside the device? ==="
# Run the probe from the device itself: this is the check that actually matters.
if "$ADB" -s "$SERIAL" shell "curl -s -o /dev/null -w '%{http_code}' --max-time 5 ${API_URL}/storefront/home" 2>/dev/null | tr -d '\r' | grep -qE '^(200|401|403)$'; then
  echo "  device -> API responds"
else
  echo "  device has no curl; falling back to host-side check"
  curl -s -o /dev/null -w '  host -> API HTTP %{http_code}\n' --max-time 5 "${API_URL}/storefront/home"
fi

echo
echo "=== start Metro ==="
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "  Metro already running (pid $(cat "$PIDFILE"))"
else
  cd "$APP_DIR" || exit 1
  : > "$LOG"
  rm -f "$PIDFILE"
  # CI=1 keeps Expo non-interactive so it does not wait on stdin when detached.
  EXPO_PUBLIC_API_BASE_URL="$API_URL" CI=1 \
    setsid nohup "$PNPM" exec expo start --port ${METRO_PORT} --localhost > "$LOG" 2>&1 < /dev/null &
  echo $! > "$PIDFILE"
  echo "  launched metro pid $(cat "$PIDFILE")"
fi

echo "  waiting for Metro on :${METRO_PORT} ..."
ready=0
for i in $(seq 1 90); do
  if curl -s -o /dev/null --max-time 2 "http://localhost:${METRO_PORT}/status" 2>/dev/null; then
    ready=1; break
  fi
  if ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "  FAIL: metro process exited"
    tail -30 "$LOG"
    exit 1
  fi
  sleep 1
done
[ $ready -eq 1 ] || { echo "  FAIL: Metro not ready in 90s"; tail -30 "$LOG"; exit 1; }
echo "  Metro is UP (status endpoint responded after ~${i}s)"
echo "  API base baked into the bundle: ${API_URL}"

echo
echo "=== open in Expo Go ==="
# exp://127.0.0.1:8081 resolves on the device thanks to the adb reverse above.
"$ADB" -s "$SERIAL" shell am start -a android.intent.action.VIEW \
  -d "exp://127.0.0.1:${METRO_PORT}" host.exp.exponent >/dev/null 2>&1
echo "  launched Expo Go at exp://127.0.0.1:${METRO_PORT}"
echo
echo "run 'scripts/run-status.sh' to watch Metro bundling progress."