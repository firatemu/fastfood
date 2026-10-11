#!/usr/bin/env bash
# Determines whether an Android build can actually run on this host.
# The repo lives on a WSL mount exposed to Windows over the Plan 9 provider,
# which makes the two toolchains mutually exclusive. This proves it rather than
# assuming it.
set -uo pipefail
cd /home/azem/projects/fastfood/apps/courier-mobile || exit 1

echo "=== 1. WSL side: node module resolution (needed by Metro bundling) ==="
node -e "try{console.log('OK   react-native ->', require.resolve('react-native/package.json'))}catch(e){console.log('FAIL react-native:', e.code)}" 2>&1 | tail -1
node -e "try{console.log('OK   @fastfood/contracts ->', require.resolve('@fastfood/contracts/package.json'))}catch(e){console.log('FAIL contracts:', e.code)}" 2>&1 | tail -1

echo
echo "=== 2. WSL side: is a LINUX Android SDK present? ==="
found=0
for d in ~/Android/Sdk /opt/android-sdk /usr/lib/android-sdk /usr/local/android-sdk; do
  if [ -d "$d" ]; then echo "FOUND: $d"; found=1; fi
done
[ "$found" -eq 0 ] && echo "none found"

echo
echo "=== 3. Windows SDK binaries usable from Linux? ==="
WIN_SDK=/mnt/c/Users/AZEM/AppData/Local/Android/Sdk
if [ -d "$WIN_SDK/build-tools/36.0.0" ]; then
  if [ -f "$WIN_SDK/build-tools/36.0.0/aapt2" ]; then
    echo -n "aapt2 (POSIX): "; file "$WIN_SDK/build-tools/36.0.0/aapt2" | cut -c1-100
  else
    echo "aapt2 (POSIX): absent"
  fi
  if [ -f "$WIN_SDK/build-tools/36.0.0/aapt2.exe" ]; then
    echo -n "aapt2.exe:     "; file "$WIN_SDK/build-tools/36.0.0/aapt2.exe" | cut -c1-100
  else
    echo "aapt2.exe:     absent"
  fi
else
  echo "windows build-tools not found at $WIN_SDK"
fi

echo
echo "=== 4. Verdict inputs ==="
echo "Gradle wrapper: $(grep distributionUrl /home/azem/projects/fastfood/apps/courier-mobile/android/gradle/wrapper/gradle-wrapper.properties | sed 's/.*gradle-\(.*\)-bin.*/\1/')"
echo "sdk.dir: $(grep sdk.dir /home/azem/projects/fastfood/apps/courier-mobile/android/local.properties)"
echo "JDK (wsl): $(java -version 2>&1 | head -1)"