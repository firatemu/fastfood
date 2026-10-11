#!/usr/bin/env bash
# Resolves the absolute pnpm path so detached launches (setsid does not inherit
# the login-shell PATH) can start the API.
set -uo pipefail
echo "PATH=$PATH"
echo "which pnpm:    $(command -v pnpm || echo none)"
echo "which corepack: $(command -v corepack || echo none)"
echo "which node:     $(command -v node || echo none)"
echo "--- candidate absolute paths ---"
for p in "$HOME/.volta/bin/pnpm" "$HOME/.local/share/pnpm/pnpm" /usr/local/bin/pnpm /usr/bin/pnpm; do
  [ -x "$p" ] && echo "EXECUTABLE: $p"
done
echo "--- login-shell resolution ---"
bash -lc 'command -v pnpm || echo none'