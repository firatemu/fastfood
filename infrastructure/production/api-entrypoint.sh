#!/bin/sh
# Materialises the RS256 keypair from base64 env values (Coolify secrets) so
# the API keeps reading JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH files.
set -eu

if [ -n "${JWT_PRIVATE_KEY_B64:-}" ] && [ -n "${JWT_PUBLIC_KEY_B64:-}" ]; then
  key_dir="$(mktemp -d)"
  printf '%s' "$JWT_PRIVATE_KEY_B64" | base64 -d > "$key_dir/jwt-private.pem"
  printf '%s' "$JWT_PUBLIC_KEY_B64" | base64 -d > "$key_dir/jwt-public.pem"
  chmod 600 "$key_dir/jwt-private.pem"
  export JWT_PRIVATE_KEY_PATH="$key_dir/jwt-private.pem"
  export JWT_PUBLIC_KEY_PATH="$key_dir/jwt-public.pem"
fi

exec "$@"
