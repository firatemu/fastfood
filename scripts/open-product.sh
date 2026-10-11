#!/usr/bin/env bash
# Opens a product detail through the app's own deep-link scheme so the upsell
# section (product.recommendations) can be verified on-device.
set -uo pipefail
ADB="$HOME/Android/Sdk/platform-tools/adb"
SERIAL="emulator-5554"
API="http://localhost:4000/api/v1"

PID=$(curl -s --max-time 8 "${API}/storefront/home" \
      | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
        try{const j=JSON.parse(d);const p=(j.data&&j.data.products)||[];console.log(p.length?p[0].id:'')}catch(e){console.log('')}
      })")

if [ -z "$PID" ]; then
  echo "FAIL: could not read a product id from the storefront home payload"
  exit 1
fi
echo "product id: $PID"

echo "opening fastfoodcustomer://products/${PID}"
"$ADB" -s "$SERIAL" shell am start -a android.intent.action.VIEW \
  -d "fastfoodcustomer://products/${PID}" >/dev/null 2>&1
sleep 6

OUT="/home/azem/projects/fastfood/.fastfood-dev/customer-mobile-product.png"
"$ADB" -s "$SERIAL" exec-out screencap -p > "$OUT" 2>/dev/null
echo "saved $OUT ($(stat -c %s "$OUT") bytes)"