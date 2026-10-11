#!/usr/bin/env bash
set -uo pipefail
cd /home/azem/projects/fastfood

echo "=== stage everything ==="
git add -A
echo
echo "=== staged summary ==="
git diff --cached --shortstat
git diff --cached --name-status | awk '{print $1}' | sort | uniq -c | sort -rn
echo
echo "=== SAFETY: any env / secret file staged? ==="
STAGED_SECRETS=$(git diff --cached --name-only | grep -Ei '(^|/)\.env$|\.jks$|\.p12$|\.pfx$|\.pem$|id_rsa|id_ed25519|secrets/' || true)
if [ -n "$STAGED_SECRETS" ]; then
  echo "!! STAGED SENSITIVE PATHS:"
  echo "$STAGED_SECRETS"
  exit 1
fi
echo "none"
echo
echo "=== SAFETY: .env.example files are expected and fine ==="
git diff --cached --name-only | grep -E '\.env\.example' || echo "(none this round)"
echo
echo "=== biggest staged additions ==="
git diff --cached --name-only --diff-filter=A | while read -r f; do
  [ -f "$f" ] && printf '%s\t%s\n' "$(stat -c %s "$f")" "$f"
done | sort -rn | head -8
echo
echo "=== sanity: backups/ excluded? ==="
git diff --cached --name-only | grep -c '^backups/' | xargs echo "staged files under backups/:"