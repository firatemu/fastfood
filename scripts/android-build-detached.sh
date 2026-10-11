#!/usr/bin/env bash
# Detached Android debug build for a mobile app, run inside WSL.
#
# Why detached: a single Bash call is capped at 60 minutes by the harness, and a
# cold React Native "new architecture" build (CMake across ABIs) exceeds that.
# The build therefore runs under setsid+nohup and writes to a log the caller can
# poll with android-build-status.sh.
#
# The inner build is written to its own file rather than passed through
# `bash -c "..."`: nested quoting with `$(...)`, `$?` and mixed quote styles
# produced an empty log and an immediate exit on the first attempt.
#
# Usage:
#   android-build-detached.sh <app> [abi]     # start (no-op if already running)
#   android-build-status.sh   <app>           # poll
set -uo pipefail

APP="${1:-courier-mobile}"
# One ABI is enough to validate the build; all four roughly quadruple CMake time.
ABI="${2:-arm64-v8a}"
ROOT="/home/azem/projects/fastfood/apps/${APP}/android"
SDK="$HOME/Android/Sdk"
PROPS="${ROOT}/local.properties"
LOG="/tmp/${APP}-android-build.log"
PIDFILE="/tmp/${APP}-android-build.pid"
RUNNER="/tmp/${APP}-android-runner.sh"

[ -d "$ROOT" ] || { echo "FAIL: no android project at $ROOT"; exit 1; }
[ -d "$SDK" ]  || { echo "FAIL: no Linux Android SDK at $SDK"; exit 1; }

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "ALREADY RUNNING (pid $(cat "$PIDFILE"))"
  exit 0
fi

# Recover local.properties if a previous attempt died before restoring it.
if [ -f "${PROPS}.orig" ]; then
  echo "note: found leftover .orig from an interrupted run; using it as baseline"
  cp "${PROPS}.orig" "${PROPS}"
  rm -f "${PROPS}.orig"
fi

if [ -f "$PROPS" ]; then
  cp "$PROPS" "${PROPS}.orig"
  # 0 = we must restore the original on exit
  CREATED=0
else
  # The project ships without this file (it is gitignored machine config).
  # Creating one would leave a Linux `sdk.dir` behind that breaks a Windows
  # Android Studio session, so the runner deletes it instead of restoring it.
  CREATED=1
fi
printf 'sdk.dir=%s\n' "$SDK" > "$PROPS"

# Quoted heredoc: nothing expands now; the runner substitutes at run time.
cat > "$RUNNER" <<'RUNNER_EOF'
#!/usr/bin/env bash
set -uo pipefail
APP="__APP__"
ABI="__ABI__"
ROOT="__ROOT__"
PROPS="__PROPS__"
LOG="__LOG__"
SDK="__SDK__"
CREATED="__CREATED__"

echo "=== gradlew assembleDebug ${APP} abi=${ABI} ==="
echo "started:  $(date -Is)"
echo "host:    $(uname -sr)"
echo "sdk:     ${SDK}"
echo "java:    $(java -version 2>&1 | head -1)"
echo

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"

cd "$ROOT" || { echo "FAIL: cannot cd $ROOT"; exit 1; }
chmod +x gradlew 2>/dev/null

./gradlew assembleDebug --console=plain --no-daemon -PreactNativeArchitectures="${ABI}"
code=$?

echo
echo "=== exit code: ${code} ==="
echo "finished: $(date -Is)"
if [ $code -eq 0 ]; then
  echo "BUILD SUCCESS"
  find "$ROOT/app/build/outputs/apk" -name '*.apk' 2>/dev/null
else
  echo "BUILD FAILED"
fi

# Always leave local.properties the way we found it: restore the previous value
# if it existed, otherwise remove the file this run created.
if [ "$CREATED" = "1" ]; then
  rm -f "$PROPS"
  echo "local.properties removed (did not exist before the build)"
elif [ -f "${PROPS}.orig" ]; then
  cp "${PROPS}.orig" "$PROPS"
  rm -f "${PROPS}.orig"
  echo "local.properties restored"
fi
echo "$code" > "${LOG}.exit"
exit $code
RUNNER_EOF

sed -i "s|__APP__|$APP|g; s|__ABI__|$ABI|g; s|__ROOT__|$ROOT|g; s|__PROPS__|$PROPS|g; s|__LOG__|$LOG|g; s|__SDK__|$SDK|g; s|__CREATED__|$CREATED|g" "$RUNNER"
chmod +x "$RUNNER"

: > "$LOG"
rm -f "${LOG}.exit"

setsid nohup "$RUNNER" > "$LOG" 2>&1 < /dev/null &
echo $! > "$PIDFILE"
sleep 3

if kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "launched pid $(cat "$PIDFILE") — RUNNING"
else
  echo "launched pid $(cat "$PIDFILE") — but it already exited; first lines of log:"
  head -20 "$LOG"
  exit 1
fi
echo "log:  $LOG"
echo "poll: wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/android-build-status.sh ${APP}"