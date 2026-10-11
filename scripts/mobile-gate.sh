#!/usr/bin/env bash
# Gate for the courier-mobile rebuild. Run inside WSL:
#   wsl.exe -e bash -l /mnt/w/home/azem/projects/fastfood/scripts/mobile-gate.sh courier-mobile
set -uo pipefail

APP="${1:-courier-mobile}"
cd "/home/azem/projects/fastfood/apps/${APP}" || exit 1

fail=0

echo "=== TYPECHECK: ${APP} ==="
pnpm exec tsc --noEmit > /tmp/${APP}-tsc.txt 2>&1
tsc_exit=$?
if [ $tsc_exit -eq 0 ]; then
  echo "PASS (exit 0)"
else
  echo "FAIL (exit ${tsc_exit})"
  grep -E 'error TS' /tmp/${APP}-tsc.txt | head -30
  fail=1
fi

echo "=== LINT: ${APP} ==="
pnpm exec eslint . --max-warnings=0 > /tmp/${APP}-lint.txt 2>&1
lint_exit=$?
# react-native's own Flow-typed sources cannot be parsed by the project ESLint
# parser; those parse errors are environment noise, not project violations.
violations=$(grep -E '^\s+[0-9]+:[0-9]+' /tmp/${APP}-lint.txt | wc -l)
if [ $lint_exit -eq 0 ] && [ "$violations" -eq 0 ]; then
  echo "PASS (exit 0, 0 rule violations)"
else
  echo "FAIL (exit ${lint_exit}, ${violations} rule violations)"
  grep -E '^\s+[0-9]+:[0-9]+' /tmp/${APP}-lint.txt | head -30
  fail=1
fi

echo "=== TESTS: ${APP} ==="
pnpm exec vitest run > /tmp/${APP}-test.txt 2>&1
test_exit=$?
grep -E 'Test Files|Tests  ' /tmp/${APP}-test.txt | head -5
if [ $test_exit -ne 0 ]; then
  echo "FAIL (exit ${test_exit})"
  tail -25 /tmp/${APP}-test.txt
  fail=1
else
  echo "PASS (exit 0)"
fi

echo "=== GATE RESULT: ${APP} ==="
if [ $fail -eq 0 ]; then echo "ALL GREEN"; else echo "FAILURES PRESENT"; fi
exit $fail