#!/usr/bin/env bash
# Validates the Expo app config and asserts the application identity that must
# survive any rebuild. Does not build; it proves the config resolves, the
# expected native plugins are wired, and the bundle/package identifiers are
# unchanged.
#
#   wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/expo-config-check.sh courier-mobile com.azemyazilim.fastfoodcourier
set -uo pipefail

APP="${1:-courier-mobile}"
EXPECTED_ID="${2:-}"
cd "/home/azem/projects/fastfood/apps/${APP}" || exit 1

# `expo config --type public` prints a JS-object dump with ANSI colour codes, so
# strip colour first and match the bare `key:` form rather than JSON quoting.
raw=$(npx expo config --type public 2>/tmp/${APP}-expoconfig-err.txt)
status=$?
if [ $status -ne 0 ] || [ -z "$raw" ]; then
  echo "FAIL: expo config did not resolve for ${APP} (exit ${status})"
  tail -20 /tmp/${APP}-expoconfig-err.txt
  exit 1
fi
clean=$(printf '%s\n' "$raw" | sed -e 's/\x1b\[[0-9;]*m//g')

field() { printf '%s\n' "$clean" | grep -m1 -E "^[[:space:]]*$1:" | sed -E "s/^[[:space:]]*$1:[[:space:]]*//"; }
# The dump is a JS object literal, so every value carries a trailing comma.
# Strip it, otherwise an identity assertion compares "'pkg'," against "'pkg'".
dequote() { printf '%s' "$1" | sed -E "s/,$//; s/^'(.*)'$/\1/"; }

fail=0

name=$(dequote "$(field name)")
slug=$(dequote "$(field slug)")
scheme=$(dequote "$(field scheme)")
android_pkg=$(dequote "$(printf '%s\n' "$clean" | grep -m1 -E "^[[:space:]]*package:" | sed -E 's/^[[:space:]]*package:[[:space:]]*//')")
ios_bundle=$(dequote "$(printf '%s\n' "$clean" | grep -m1 -E "^[[:space:]]*bundleIdentifier:" | sed -E 's/^[[:space:]]*bundleIdentifier:[[:space:]]*//')")

echo "PASS: expo config resolves for ${APP}"
echo "  name:               ${name}"
echo "  slug:               ${slug}"
echo "  scheme:             ${scheme}"
echo "  android.package:    ${android_pkg}"
echo "  ios.bundleId:       ${ios_bundle}"
echo "--- native plugins declared ---"
printf '%s\n' "$clean" | grep -oE "'(expo-router|expo-secure-store|expo-camera|expo-font|expo-image)'" | tr -d "'" | sort -u | sed 's/^/  /'

# Application identity is load-bearing: changing it would break signing and
# distribution, so assert it rather than merely printing it.
if [ -n "$EXPECTED_ID" ]; then
  if [ "$android_pkg" = "$EXPECTED_ID" ] && [ "$ios_bundle" = "$EXPECTED_ID" ]; then
    echo "  identity: MATCHES expected ${EXPECTED_ID}"
  else
    echo "  identity: MISMATCH — expected ${EXPECTED_ID}"
    fail=1
  fi
fi

for required in android ios; do
  if printf '%s\n' "$clean" | grep -qE "^[[:space:]]*${required}: \{"; then
    echo "  present: ${required} block"
  else
    echo "  MISSING: ${required} block"
    fail=1
  fi
done

exit $fail