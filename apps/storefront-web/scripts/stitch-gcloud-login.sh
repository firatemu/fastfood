#!/usr/bin/env bash
# Stitch HTML downloads need Google-internal OAuth scopes (labs-tailwind, aurelius, …).
# Those scopes cannot be granted via gcloud application-default login (invalid_scope).
set -euo pipefail

cat <<'EOF'
Stitch HTML indirme için gcloud yetkilendirmesi yeterli değil.

Google, contribution.usercontent.google.com isteklerinde şu scope'ları istiyor:
  labs-tailwind, aurelius, crowdsource, nbu-paisa, assistant

Bu scope'lar gcloud "application-default login" ile istenemez (Hata 400: invalid_scope).

Önerilen (gerçek Chrome — Google girişi çalışır):
  pnpm --filter @fastfood/storefront-web stitch:pull:cdp
  (Önce Chrome'u --remote-debugging-port=9222 ile açın; ayrıntı: .stitch/README.md)

Playwright tarayıcısı Google tarafından sık engellenir:
  pnpm --filter @fastfood/storefront-web stitch:pull:browser

Alternatif (kısa ömürlü): Stitch'te bir ekranı indirirken DevTools → Network →
contribution.usercontent.google.com isteğindeki Authorization: Bearer … değerini kopyalayıp:
  export STITCH_ACCESS_TOKEN='…'
  pnpm --filter @fastfood/storefront-web stitch:pull
EOF

GCLOUD="${GCLOUD_BIN:-$HOME/google-cloud-sdk/bin/gcloud}"
if [ -x "$GCLOUD" ] || command -v "$GCLOUD" >/dev/null 2>&1; then
  echo ""
  echo "İsteğe bağlı: genel GCP/ADC (Stitch HTML için yetmez):"
  echo "  $GCLOUD auth application-default login"
fi
