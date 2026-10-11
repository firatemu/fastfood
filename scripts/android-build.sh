#!/usr/bin/env bash
# Android debug build for a mobile app, run inside WSL.
#
# The repo lives on a WSL mount. `android/local.properties` currently points at
# the Windows SDK, which cannot be used from Linux (Windows build-tools are PE
# binaries). This script swaps sdk.dir to the Linux SDK for the duration of the
# build and restores the original on exit, so a Windows Android Studio workflow
# keeps working afterwards.
#
#   wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/android-build.sh courier-mobile
set -uo pipefail

APP="${1:-courier-mobile}"
ROOT="/home/azem/projects/fastfood/apps/${APP}/android"
SDK="$HOME/Android/Sdk"
PROPS="${ROOT}/local.properties"
BACKUP="$(mktemp)"

[ -d "$ROOT" ] || { echo "FAIL: no android project at $ROOT"; exit 1; }
[ -d "$SDK" ]  || { echo "FAIL: no Linux Android SDK at $SDK"; exit 1; }

restore() {
  if [ -f "$BACKUP" ]; then cp "$BACKUP" "$PROPS"; rm -f "$BACKUP"; fi
}
trap restore EXIT INT TERM

if [ -f "$PROPS" ]; then cp "$PROPS" "$BACKUP"; echo "saved original local.properties"; fi
printf 'sdk.dir=%s\n' "$SDK" > "$PROPS"
echo "using sdk.dir=$SDK"

cd "$ROOT" || exit 1
chmod +x gradlew 2>/dev/null || true

echo
echo "=== gradlew assembleDebug (${APP}) ==="
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
# The Gradle daemon keeps Windows-side locks out of the WSL filesystem.
./gradlew assembleDebug --console=plain --no-daemon
status=$?

echo
echo "=== exit code: ${status} ==="
if [ $status -eq 0 ]; then
  APK=$(find "$ROOT/app/build/outputs/apk" -name "*.apk" 2>/dev/null | head -5)
  echo "BUILD SUCCESS"
  [ -n "$APK" ] && echo "APK(s):" && echo "$APK"
else
  echo "BUILD FAILED"
fi
exit $status