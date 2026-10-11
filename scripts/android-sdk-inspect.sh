#!/usr/bin/env bash
# Inspects the WSL Linux Android SDK and decides whether an offline Gradle
# assemble is worth attempting.
set -uo pipefail
SDK="$HOME/Android/Sdk"
echo "HOME=$HOME"
echo "SDK=$SDK"
if [ ! -d "$SDK" ]; then echo "SDK MISSING"; exit 1; fi
echo
echo "=== platforms ==="; ls "$SDK/platforms" 2>/dev/null || echo none
echo "=== build-tools ==="; ls "$SDK/build-tools" 2>/dev/null || echo none
echo "=== platform-tools ==="; ls "$SDK/platform-tools" 2>/dev/null | head -5 || echo none
echo "=== cmdline-tools ==="; ls "$SDK/cmdline-tools" 2>/dev/null || echo none
echo "=== licenses ==="; ls "$SDK/licenses" 2>/dev/null || echo none
echo
echo "=== aapt2 POSIX binary? ==="
for bt in "$SDK"/build-tools/*/; do
  if [ -x "${bt}aapt2" ]; then
    echo -n "  ${bt}aapt2 -> "; file "${bt}aapt2" | cut -c1-110
  fi
done
echo
echo "=== gradle dist cached? ==="
ls "$HOME/.gradle/wrapper/dists" 2>/dev/null || echo "no gradle dists"