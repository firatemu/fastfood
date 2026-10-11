#!/usr/bin/env bash
# Verifies a built debug APK: existence, size, and — most importantly — that the
# application identity inside it matches the identity the rebuild promised to
# preserve. A build that succeeds but produced a different package id would be a
# silent failure for distribution and signing.
set -uo pipefail
APP="${1:-courier-mobile}"
EXPECTED="${2:-com.azemyazilim.fastfoodcourier}"
ROOT="/home/azem/projects/fastfood/apps/${APP}/android"
APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
AAPT="$HOME/Android/Sdk/build-tools/36.0.0/aapt2"

echo "=== APK ==="
if [ ! -f "$APK" ]; then echo "FAIL: no APK at $APK"; exit 1; fi
ls -la "$APK"
echo "size: $(du -h "$APK" | cut -f1)"

echo
echo "=== application identity inside the APK ==="
if [ ! -x "$AAPT" ]; then echo "FAIL: aapt2 missing at $AAPT"; exit 1; fi
BADGING=$("$AAPT" dump badging "$APK" 2>/dev/null)

PKG=$(printf '%s\n' "$BADGING" | sed -n "s/^package: name='\([^']*\)'.*/\1/p")
VERCODE=$(printf '%s\n' "$BADGING" | sed -n "s/.*versionCode='\([^']*\)'.*/\1/p")
VERNAME=$(printf '%s\n' "$BADGING" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")
LAUNCHER=$(printf '%s\n' "$BADGING" | sed -n "s/^launchable-activity: name='\([^']*\)'.*/\1/p")

echo "package:       ${PKG:-<none>}"
echo "versionCode:   ${VERCODE:-<none>}"
echo "versionName:   ${VERNAME:-<none>}"
echo "launcher:      ${LAUNCHER:-<none>}"

echo
echo "=== native ABIs packaged ==="
unzip -l "$APK" 2>/dev/null | awk '/lib\// {split($4,a,"/"); print a[2]}' | sort -u

echo
echo "=== local.properties left clean? ==="
if [ -f "$ROOT/local.properties" ]; then
  CURRENT=$(grep sdk.dir "$ROOT/local.properties")
  echo "$CURRENT"
  # A Linux path here means a build run left the machine pointed at the WSL SDK;
  # that silently breaks a Windows Android Studio session on the same repo.
  case "$CURRENT" in
    *"/home/"*) echo "WARNING: sdk.dir points at a WSL path — Windows tooling will break"; ;;
    *)         echo "ok: machine-local path" ;;
  esac
else
  echo "absent (matches a project that ships without this gitignored file)"
fi
if [ -f "$ROOT/local.properties.orig" ]; then
  echo "WARNING: leftover .orig still present"
fi

echo
echo "=== verdict ==="
if [ "$PKG" = "$EXPECTED" ]; then
  echo "IDENTITY MATCHES ${EXPECTED}"
  exit 0
else
  echo "IDENTITY MISMATCH: expected ${EXPECTED}, got ${PKG:-<none>}"
  exit 1
fi