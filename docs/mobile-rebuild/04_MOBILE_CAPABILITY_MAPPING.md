# 04 — Mobile capability mapping

Functional authority: security → domain → backend APIs → completed Storefront (`docs/storefront-rebuild/04_CAPABILITY_GAP_MATRIX.md`) → Mobile Stitch UX → existing mobile.

Default: customer capabilities exist on Mobile too. Web-only only with a real platform reason.

Design status: `STITCH` = dedicated mobile screen; `EXTEND` = closest Stitch anatomy; `NEW` = native screen in Stitch language; `BLOCKED` = external provider; `DEFERRED` = already approved on web.

Implementation phases: M1–M6 as in `06_MOBILE_REBUILD_PLAN.md`.

## Route / screen matrix

| Mobile route | Nav | Stitch | Web equivalent | APIs (all under `/api/v1`) | Auth | Guest | iOS | Android | Design | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/(tabs)` `/` | Tab Menu | `mobil_ana_men_canl_vitrin` | `/` `/menu` | home, categories, products, cart add, kitchenLiveCount, reviews | optional | yes | blur header, home indicator | system bars, back = exit root | STITCH | M1 |
| `/(tabs)/search` | Tab Search | none (tab chrome only) | `/search` | products `?q=` / home | optional | yes | keyboard search | hardware back clears query then tab | NEW from home chips/grid | M1 |
| `/(tabs)/builder` | Tab Özel Yarat | none; PDP anatomy | `/builder` | `GET /storefront/catalog/builder`, cart lines | optional | yes | stack-inside-tab | back within builder | NEW from PDP | M2 implemented |
| `/(tabs)/orders` | Tab Orders | none (tracking is stack) | `/orders` | `GET /me/orders`, `POST /orders/:id/reorder` | required (list) | CTA to auth | swipe to tracking | back to tab | NEW from profile rows + tracking header | M5 implemented |
| `/(tabs)/account` | Tab Profile | `mobil_kullan_c_hesab_profil_y_netimi` | `/account` | `/me`, loyalty (points only) | mixed | guest CTA | avatar/notifications | same | STITCH | M4 implemented |
| `/products/[id]` | Stack | `mobil_burger_zelle_tirme_detay` | `/products/[id]` | product, modifiers, variants, removals, allergens; `GET/POST/DELETE /me/favorites` | optional | yes (heart → auth) | swipe back | hardware back | STITCH | M2 + M5 heart |
| `/cart` | Stack | `mobil_sepetim_sipari_zeti` | `/cart` | cart qty/remove, quote, promotions validate (no line reconfigure) | optional | yes | keyboard coupon | IME + back | STITCH | M2 implemented |
| `/checkout` | Stack | `mobil_sipari_h_zl_deme_sayfas` | `/checkout` | quote, slots, serviceability, loyalty, init pay | optional guest checkout | yes | keyboard | IME, 3DS browser | STITCH minus PAN | M3 implemented |
| `/payment/[checkoutId]` | Stack | none (Stitch inline card) | `/payment/[id]` | payment status | optional | yes | return from Safari/ASWebAuth | Chrome Custom Tabs / intent | NEW status screen | M3 implemented |
| `/payment/return` | Hidden / linking | none | iyzico redirect pages | status by checkout id | optional | yes | Universal Link later; scheme now | App Link later; scheme now | PLATFORM_SPECIFIC_FLOW | M3 implemented |
| `/auth` | Modal/stack | `mobil_kullan_c_giri_kay_t_ekran` | `/auth` | OTP, password, merge | public | yes | OTP keyboard, Apple button disabled-honest | Google button disabled-honest | STITCH | M4 implemented |
| `/auth/callback` | Linking | none | `/auth/callback` | untrusted params → POST refresh | public | n/a | MOBILE_NATIVE_CONFIG_REQUIRED | CONFIG_READY_BUT_CREDENTIALS_MISSING / MOBILE_NATIVE_CONFIG_REQUIRED | PLATFORM_SPECIFIC_FLOW | M4 implemented |
| `/auth/reset` | Linking | none | reset query | `POST …/password/reset` | public | n/a | scheme token | scheme token | NEW | M4 implemented |
| `/account/addresses` | Stack | Profile address cards | `/account/addresses` | `/me/addresses`, serviceability informational | required | no | KeyboardAvoidingView | adjustResize + back | EXTEND | M4 implemented |
| `/account/settings` | Stack | SMS/eko/contactless rows | `/account/settings` | `GET/PATCH /me/preferences` | required | no | none | none | EXTEND | M4 implemented |
| `/account/security` | Stack | personal-info row | `/account/security` | identities, password create/change, logout | required | no | SecureStore Keychain | EncryptedSharedPreferences via SecureStore | EXTEND | M4 implemented |
| `/account/favorites` | Stack | none | `/account/favorites` | `/me/favorites` | required | no | none | none | NEW from cart/home cards | M5 implemented |
| `/account/club` | Stack | Club badge + stats on Profile | `/account/club` | `GET /me/club` (tier ≠ wallet) | required | teaser | none | none | EXTEND | M5 implemented |
| `/account/spin` | Stack | Ateş Çarkı on Profile | `/account/spin` | `GET/POST /me/spin` + `idempotencyKey` | required | no | readable result, no fake prize | same | EXTEND widget + NEW screen | M5 implemented |
| `/account/notifications` | Stack | header pip | `/account/notifications` | `GET /me/notifications`, `PATCH …/read`, `POST …/read-all` | required | no | in-app inbox; APNs later | in-app inbox; FCM later | NEW from list rows | M5 implemented |
| `/account/support` | Stack | tracking “Canlı Destek” | `/account/support` | conversations + messages, `clientRequestId` | required | limited | poll 4s/20s | same | NEW from tracking CTA | M5 implemented |
| `/orders/[orderId]` | Stack (`index.tsx`; confirmation sibling) | `mobil_canl_kurye_sipari_takibi` | `/orders/[id]` | `GET /orders/:id` (courier/location already on payload) | required | no | OSM WebView | OSM WebView + back | STITCH | M5 implemented |
| `/orders/[orderId]/confirmation` | Stack | none | confirmation | order id from payment | optional | yes | none | none | NEW from tracking header | M3 implemented |
| `/address` | Stack | checkout address | `/address` | serviceability | optional | yes | Core Location | Fused location | EXTEND checkout | M3 address in `/checkout`; saved-address CRUD is `/account/addresses` (M4) |
| `/branches` | Stack | location chip / web hikaye | `/branches` | `GET /storefront/branches`, content `hikaye` | optional | yes | none | hardware back | NEW from profile rows | M6 implemented |
| `/deals` | Stack | home combos | `/deals` | `GET /storefront/promotions` (listed only) | optional | yes | none | none | NEW from home combo + coupon chip | M6 implemented |
| `/legal` | Stack | none | `/legal` | `GET /storefront/content` | optional | yes | none | none | NEW from profile rows | M6 implemented |
| `/legal/allergens` | Stack | PDP allergen line | `/legal#alerjen-sozlugu` | `GET /storefront/catalog/allergens` | optional | yes | none | none | EXTEND PDP + legal | M6 implemented |
| `/table` | Stack | none | `/table` (web RequireCustomer; mobile public) | none (manual code) | public | yes | camera optional | camera optional | NEW | M5+M6 |
| `/table/scan` | Stack | none | — | decode → existing `/table/[code]` | public | yes | permission on open | CAMERA | NEW | M6 implemented |
| `/table/[code]` | Linking | none | `/table/[code]` | `GET/POST /storefront/tables/:code[/scan]` | public (not auth) | yes | scheme / typed / QR | same | NEW | M5+M6 |
| `/newsletter` | inline | auth/profile SMS | footer `/account` | `/me/preferences` newsletterOptIn | optional | yes | none | none | EXTEND | M4 implemented |

## Capability classification (Storefront → Mobile)

| Capability | Class | Notes |
| --- | --- | --- |
| Catalog, home merchandising, combos, social proof, reviews read | REPRESENTED_BY_MOBILE_STITCH | Home; ordered vitrin slides use native swipe and accessible controls. |
| PDP modifiers / variants / removals / nutrition | REPRESENTED_BY_MOBILE_STITCH | PDP |
| Cart, coupon, upsell, notes | REPRESENTED_BY_MOBILE_STITCH | Cart |
| Delivery/pickup, schedule, tips, preferences, quote | REPRESENTED_BY_MOBILE_STITCH | Checkout (no PAN) |
| OTP + password auth chrome | REPRESENTED_BY_MOBILE_STITCH | Auth |
| Profile, addresses, Club badge, spin widget, SMS consent | REPRESENTED_BY_MOBILE_STITCH / EXTEND | Profile |
| Live tracking stepper + courier card | REPRESENTED_BY_MOBILE_STITCH | Tracking |
| Search | NEW_NATIVE_SCREEN_REQUIRED | Tab exists |
| Builder | NEW_NATIVE_SCREEN_REQUIRED | Tab exists; reuse PDP |
| Order history list | NEW_NATIVE_SCREEN_REQUIRED | Tab exists |
| Favorites | NEW_NATIVE_SCREEN_REQUIRED | PDP heart + `/account/favorites` (M5) |
| BURGER HOME CLUB full | EXTEND_EXISTING_STITCH_SCREEN | Profile + `/account/club` |
| Spin full | EXTEND_EXISTING_STITCH_SCREEN | Profile widget |
| Notifications inbox | NEW_NATIVE_SCREEN_REQUIRED | Header pip |
| Support chat | NEW_NATIVE_SCREEN_REQUIRED | Tracking CTA |
| Table QR | NEW_NATIVE_SCREEN_REQUIRED | Typed code + QR camera (`expo-camera` 57.0.5) + `fastfoodcustomer://table/KOD` |
| Settings / security / password change | EXTEND_EXISTING_STITCH_SCREEN | Profile rows |
| Branches & hikaye | NEW_NATIVE_SCREEN_REQUIRED | `/branches` + content `hikaye` (M6) |
| Deals listing | NEW_NATIVE_SCREEN_REQUIRED | `/deals` listed promotions only (M6) |
| Legal / allergen guide | NEW_NATIVE_SCREEN_REQUIRED | `/legal` + `/legal/allergens` (M6) |
| Payment status / confirmation | NEW_NATIVE_SCREEN_REQUIRED | After 3DS |
| Guest checkout | PLATFORM_SPECIFIC_FLOW | Same APIs as web |
| iyzico hosted/3DS | PLATFORM_SPECIFIC_FLOW | Browser + deep link return |
| Google/Apple OAuth | EXTERNAL_PROVIDER_BLOCKED | Honest unavailable until creds |
| Saved cards / Masterpass / kapıda kart | EXTERNAL_PROVIDER_BLOCKED | Honest copy; no PAN vault |
| Masked call ARA | EXTERNAL_PROVIDER_BLOCKED | Show courier name; no fake PSTN |
| Gift card / customer PDF invoice | INTENTIONALLY_NOT_REQUIRED | Already deferred on web |
| DINE_IN as third fulfillment | INTENTIONALLY_NOT_REQUIRED | QR is context only |
| Staff/admin/kitchen/courier | INTENTIONALLY_NOT_REQUIRED | Not customer |

Cross-platform customer inventory (Web + Mobile impact/status): `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`.

## Additional native screens beyond the seven Stitch HTML files

Search, Builder, Orders list, Favorites, Club detail, Spin sheet, Notifications, Support, Table QR, Addresses (if not only embedded), Settings, Security, Branches & Hikaye, Deals, Legal, Allergen guide, Payment status, Order confirmation, password reset.

## Design extension cheat-sheet

| New screen | Closest Stitch anatomy |
| --- | --- |
| Search | Home chips + product cards + tab search icon |
| Builder | PDP groups + sticky CTA |
| Orders list | Profile list rows + tracking header |
| Favorites | Home/PDP cards |
| Club | Profile Club badge + stats |
| Spin | Profile Ateş Çarkı |
| Notifications | Profile rows + header pip |
| Support | Tracking support CTA + list rows |
| Table QR | Auth card + camera |
| Settings/Security | Profile Hesap & Tercihler |
| Branches | Tracking map frame + profile address rows |
| Deals | Home combo + cart coupon chip |
| Legal | Profile rows / typography body-md |
| Payment status | Checkout sticky + tracking stepper colors |
