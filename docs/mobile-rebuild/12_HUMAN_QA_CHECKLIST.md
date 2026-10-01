# 12 — Human QA checklist

App: `apps/customer-mobile` (BURGER HOME). Local/dev only.  
Companion data: `13_HUMAN_QA_TEST_DATA.md`.  
Do not mark HUMAN_ACCEPTED from this list. iOS runtime requires macOS/Xcode.

Pass/Fail is for the human tester.

| Test ID | Start screen | Preconditions | Steps | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | Home | Guest session | Open Menu tab | Catalog, combo, reviews from API; location chip tappable | | |
| G-02 | Home | Guest | Location chip → Şubeler | Real branches + hikaye if published | | |
| G-03 | Home | Guest | Search → query → PDP | Product + modifiers; no fake stock | | |
| G-04 | PDP | Guest | Heart | Redirects to auth with safe next | | |
| G-05 | PDP | Guest | Alerjen rehberi | `/legal/allergens` dictionary | | |
| G-06 | Builder | Guest | Configure → sepete | Cart line from builder product | | |
| G-07 | Cart | Guest with lines | Qty / remove / coupon | Server cart; quote not invented | | |
| G-08 | Checkout | Guest, serviceable address | Quote → ödeme başlat | iyzico hosted; no PAN/CVV | | |
| G-09 | Account | Guest | Hub rows | Login CTA; Şubeler/Fırsatlar/Yasal/Masa reachable | | |
| A-01 | Auth | Guest | OTP `+905559003003` | Fake-provider code from test data (not shown in UI) | | |
| A-02 | Auth | Guest | Email/password login | Lands on Account with real name/points | | |
| A-03 | Account | Auth | Addresses / Settings / Security | CRUD and preferences persist | | |
| A-04 | Account | Auth | Logout | Private cache gone; Back cannot revive private screens | | |
| O-01 | Orders | Auth with orders | Open list | Real statuses/totals | | |
| O-02 | Tracking | From Orders | Header Back and Android Back | Always `Siparişler` tab, not Home | | |
| O-03 | Tracking | Delivery live | Courier + map | Real name; Ara yok; OSM or honest fallback | | |
| O-04 | Tracking | Pickup | — | Gel al; no courier/map | | |
| O-05 | Tracking | Delivered | Tekrar sipariş | Cart restored or honest unavailable | | |
| E-01 | PDP | Auth | Heart on/off | Favorites list matches | | |
| E-02 | CLUB | Auth | Open | Points ≠ tier; welcome from API | | |
| E-03 | Spin | Auth, eligible | Çevir | Server prize; second tap already-used | | |
| E-04 | Inbox | Auth | Open one; read-all | Whitelist href only | | |
| E-05 | Support | Auth | Send message | SEN + SİSTEM receipt; no fake agent | | |
| T-01 | Masa kodu | Any | Type valid seed code | Masa 12; not logged in; no DINE_IN | | |
| T-02 | Masa kodu | Any | Invalid code | Recovery to re-enter | | |
| T-03 | Masa tara | Device camera | Grant permission, scan QR | Routes to `/table/{code}` | | Emulator may lack camera |
| C-01 | Şubeler | Any | Open from header | Hours, accepting, pickup/delivery | | |
| C-02 | Fırsatlar | Any | Open | Listed promotions only; checkout CTA | | |
| C-03 | Yasal | Any | Open | CMS docs; no invented VKN/MERSIS | | |
| C-04 | Alerjenler | Any | Open | Dictionary + disclaimer if published | | |
| L-01 | Tracking | Live order | Home then resume | Still tracking; no duplicate poll crash | | |
| L-02 | Support | Open thread | Background/foreground | Thread remains; poll slows in bg | | |
| D-01 | Cold start | Saved session | Kill + relaunch | Restore or guest; no cached private if revoked | | |
| D-02 | — | Scheme | `fastfoodcustomer://orders/{uuid}` | Tracking then Back → Orders | | |
| D-03 | — | Scheme | `fastfoodcustomer://table/{code}` | Public table context | | |
