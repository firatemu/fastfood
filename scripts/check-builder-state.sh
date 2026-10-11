#!/usr/bin/env bash
# Asks the running API whether a builder product exists, rather than inferring it
# from a screen. `builderAvailable` is part of the storefront home payload.
set -uo pipefail
API="http://localhost:4000/api/v1"

echo "=== storefront home -> builderAvailable ==="
curl -s --max-time 8 "${API}/storefront/home" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const h=j.data||{};
    console.log('  builderAvailable:', h.builderAvailable);
    console.log('  branch:', h.branch ? h.branch.name : null);
    console.log('  categories:', (h.categories||[]).length);
    console.log('  products:', (h.products||[]).length);
    console.log('  reviews:', (h.reviews||[]).length);
    console.log('  socialProof:', JSON.stringify(h.socialProof));
  }catch(e){ console.log('  parse error:', e.message); }
});
"

echo
echo "=== builder endpoint ==="
curl -s --max-time 8 -w '\n  HTTP %{http_code}\n' "${API}/storefront/catalog/builder" | tail -4