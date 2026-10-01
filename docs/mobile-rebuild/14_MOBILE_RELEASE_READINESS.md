# 14 — Mobile release readiness

Date: 2026-09-20. Local/dev technical readiness only.  
**Not PRODUCTION_READY. Not HUMAN_ACCEPTED. Not IOS_RUNTIME_VERIFIED.**

| Area | Class | Note |
| --- | --- | --- |
| Navigation | READY | Tabs + stacks; tracking Back → Orders |
| Design system | READY | ADR-008 app-local Stitch tokens |
| Catalog/PDP | READY | Home, search, PDP, allergen link |
| Builder | READY | Same modifier anatomy |
| Cart | READY | Server cart |
| Checkout | READY | Quote authority |
| Payment | READY_WITH_KNOWN_LIMITATION | Hosted/3DS sandbox; no PAN |
| Auth | READY_WITH_KNOWN_LIMITATION | OTP + password; OAuth blocked |
| Account | READY | Profile, addresses, settings, security |
| Orders | READY | History + reorder |
| Tracking | READY | Delivery/pickup; poll lifecycle |
| Favorites | READY | PDP heart |
| CLUB | READY | Server points/tier |
| Spin | READY | Server prize + idempotency |
| Notifications | READY | In-app inbox |
| Push | EXTERNAL_PROVIDER_BLOCKED | No device-token API; no FCM/APNs |
| Support | READY_WITH_KNOWN_LIMITATION | SYSTEM receipt, not live agent |
| Table QR | READY | Manual + camera + scheme; not auth |
| Camera | READY | `expo-camera` 57.0.5; permission on scan only |
| Branches | READY | API + hikaye CMS |
| Deals | READY | Listed promotions |
| Legal | READY | CMS; unconfigured registry not invented |
| Allergens | READY | Catalog dictionary |
| Maps | READY_WITH_KNOWN_LIMITATION | OSM embed; fallback on WebView error |
| Android runtime | HUMAN_QA_REQUIRED | M6 debug install/launch + G/D/F verified on `emulator-5554`; remaining journeys in `12_HUMAN_QA_CHECKLIST.md` |
| iOS config/runtime | READY_WITH_KNOWN_LIMITATION | Config validated; runtime needs macOS/Xcode |
| Test suite | READY | customer-mobile unit 93 |

`MISSING = 0` for customer-mobile vs completed Storefront (staff/kitchen/courier not mobile).  
`DEAD/BROKEN = 0` after M6 action audit (payment methods row is honest non-action).
