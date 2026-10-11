#!/usr/bin/env bash
# Preflight for running customer-mobile: API reachability, Expo/Metro, emulator.
set -uo pipefail
cd /home/azem/projects/fastfood || exit 1

echo "=== listening ports (dev stack) ==="
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ':(3000|3001|4000|8081|8082|5432|6379)\b' || echo "  none of the dev ports are listening"

echo
echo "=== API health (localhost:4000) ==="
if command -v curl >/dev/null 2>&1; then
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:4000/api/v1/health 2>/dev/null || echo "no-response")
  echo "  /api/v1/health -> ${code}"
  code2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:4000/api/v1/storefront/home 2>/dev/null || echo "no-response")
  echo "  /api/v1/storefront/home -> ${code2}"
else
  echo "  curl not available"
fi

echo
echo "=== Android emulator available in WSL? ==="
SDK="$HOME/Android/Sdk"
if [ -d "$SDK/emulator" ]; then
  echo "  emulator package: present"
  ls "$SDK/emulator/emulator" >/dev/null 2>&1 && echo "  emulator binary: present"
else
  echo "  emulator package: ABSENT in the WSL SDK"
fi
echo "  system-images:"
ls "$SDK/system-images" 2>/dev/null || echo "    none"
echo "  avds:"
("$SDK/emulator/emulator" -list-avds 2>/dev/null) || echo "    cannot list (no emulator)"

echo
echo "=== adb devices ==="
"$SDK/platform-tools/adb" devices -l 2>/dev/null || echo "  adb unavailable"

echo
echo "=== expo / metro already running? ==="
pgrep -af "expo|metro" 2>/dev/null | head -5 || echo "  no expo/metro processes"

echo
echo "=== env ==="
echo "  EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL:-<unset>}"
echo "  node=$(node -v 2>/dev/null)"
echo "  java=$(java -version 2>&1 | head -1)"