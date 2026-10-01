# 04 — Capability gap matrix (final)

Comparison of Stitch-required experience vs BURGER HOME Storefront after Phase 7.

All API paths are under `/api/v1`.

Final statuses only:

- **IMPLEMENTED**
- **IMPLEMENTED_WITH_INTENTIONAL_DEVIATION**
- **EXTERNAL_PROVIDER_BLOCKED**
- **DEFERRED_WITH_APPROVED_REASON**
- **NOT_STOREFRONT_RELEVANT**
- **MISSING** (must be 0)

## Counts

| Class | Count |
| --- | --- |
| IMPLEMENTED | 71 |
| IMPLEMENTED_WITH_INTENTIONAL_DEVIATION | 3 |
| EXTERNAL_PROVIDER_BLOCKED | 4 |
| DEFERRED_WITH_APPROVED_REASON | 4 |
| NOT_STOREFRONT_RELEVANT | 10 |
| MISSING | 0 |

## Final inventory

| Capability | Original | Final | Route | Backend/API | Test evidence | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Catalog categories | SUPPORTED | IMPLEMENTED | `/` | `GET /storefront/catalog/categories` | storefront-foundation, unit catalog | |
| Product list | SUPPORTED | IMPLEMENTED | `/` `/search` | `GET /storefront/catalog/products` | foundation, completeness search | |
| Product detail + modifiers | SUPPORTED | IMPLEMENTED | `/products/[id]` | `GET /storefront/catalog/products/:id` | pdp-cart | |
| Allergen dictionary | SUPPORTED | IMPLEMENTED | `/legal` | `GET /storefront/catalog/allergens` | completeness legal | |
| Cart CRUD | SUPPORTED | IMPLEMENTED | `/cart` | cart lines | pdp-cart | |
| Coupon validate | SUPPORTED | IMPLEMENTED | `/cart` `/checkout` | `GET /storefront/promotions/validate` | checkout | |
| Checkout quote | SUPPORTED | IMPLEMENTED | `/checkout` | `POST /checkout/quote` | checkout | |
| iyzico pay init + status | SUPPORTED | IMPLEMENTED | `/payment/[id]` | payment initialize/status | checkout | |
| Phone OTP | SUPPORTED | IMPLEMENTED | `/auth` | OTP request/verify | auth-account | |
| Address CRUD | SUPPORTED | IMPLEMENTED | `/account/addresses` | `/me/addresses` | auth-account | |
| Order history | SUPPORTED | IMPLEMENTED | `/orders` | `GET /me/orders` | orders-tracking | |
| Order detail | SUPPORTED | IMPLEMENTED | `/orders/[id]` | `GET /orders/:id` | orders-tracking | |
| Order timeline | SUPPORTED | IMPLEMENTED | tracking | `GET /orders/:id/timeline` | orders-tracking | |
| Loyalty balance | SUPPORTED | IMPLEMENTED | `/account/club` `/checkout` | `/me/loyalty` | club | |
| Serviceability | SUPPORTED | IMPLEMENTED | `/address` `/checkout` | `GET /storefront/serviceability` | completeness address surface | |
| Branch list | SUPPORTED | IMPLEMENTED | `/branches` | `GET /storefront/branches` | completeness branches | |
| Guest cart session | SUPPORTED | IMPLEMENTED | header | `X-Session-Id` | auth merge | |
| Courier location | SUPPORTED | IMPLEMENTED | tracking | `GET /orders/:id/courier-location` | orders-tracking | |
| Stitch tracker | SUPPORTED | IMPLEMENTED | tracking | customer tracking DTO | orders-tracking | |
| Reorder | SUPPORTED | IMPLEMENTED | `/orders` | `POST /orders/:id/reorder` | reorder unit | |
| Favorites | SUPPORTED | IMPLEMENTED | `/account/favorites` | `/me/favorites` | orders-tracking | |
| BURGER HOME CLUB | SUPPORTED | IMPLEMENTED | `/account/club` | `GET /me/club` | club | |
| Welcome reward | SUPPORTED | IMPLEMENTED_WITH_INTENTIONAL_DEVIATION | `/deals` `/checkout` | `BHCLUBWELCOME` promotion | club | Not a second wallet |
| Ateş Çarkı | SUPPORTED | IMPLEMENTED | `/account/spin` | `GET/POST /me/spin` | club | |
| Table QR | SUPPORTED | IMPLEMENTED | `/table/[code]` | `/storefront/tables/:code` | club, completeness | No DINE_IN |
| Customer inbox | SUPPORTED | IMPLEMENTED | `/account/notifications` | `/me/notifications` | club | |
| Support chat | SUPPORTED | IMPLEMENTED_WITH_INTENTIONAL_DEVIATION | `/account/support` | `/me/support/conversations` | club | SYSTEM receipt, not fake agent |
| Home merchandising | ADAPT | IMPLEMENTED | `/` | `GET /storefront/home` | foundation | Ordered `heroSlides` drive a manually controlled carousel; legacy `hero` remains available. |
| Header chrome | ADAPT | IMPLEMENTED | all | home + cart | foundation | Location → `/branches` |
| Search | ADAPT | IMPLEMENTED | `/search` | home/`products?q=` | completeness search | |
| Profile GET/PATCH /me | ADAPT | IMPLEMENTED | `/account` | `/me` | auth-account | |
| Operating hours | ADAPT | IMPLEMENTED | footer `/branches` | branch hours | completeness branches | |
| Cart merge on OTP | ADAPT | IMPLEMENTED | `/auth` | `POST /storefront/cart/merge` | auth-account | |
| Server logout/refresh | ADAPT | IMPLEMENTED | account | logout/refresh | auth-account | |
| Loyalty reserve | ADAPT | IMPLEMENTED | `/checkout` | quote + reserve | checkout | |
| Legal/allergen routes | ADAPT | IMPLEMENTED | `/legal` | content + allergens | completeness legal | |
| Order confirmation | ADAPT | IMPLEMENTED | confirmation | checkout order | checkout | |
| Payment → order id | ADAPT | IMPLEMENTED | payment | unique checkout_session_id | checkout | |
| Auth primary path | ADAPT | IMPLEMENTED | `/auth` | OTP first-class | auth-account | |
| PCI card UI | ADAPT | IMPLEMENTED | checkout | hosted/3DS tiles | checkout | No PAN |
| Pickup vs delivery | EXTEND | IMPLEMENTED | checkout | fulfillmentMode | checkout | |
| Scheduled slots | EXTEND | IMPLEMENTED | checkout | `GET /checkout/slots` | checkout unit | |
| Tips | EXTEND | IMPLEMENTED | checkout | tipMinor | checkout | |
| Payment method enum | EXTEND | IMPLEMENTED | checkout | payment-methods | checkout | Masterpass blocked separately |
| Deals listing | EXTEND | IMPLEMENTED | `/deals` | `GET /storefront/promotions` | completeness deals; unit completeness | Unlisted codes hidden |
| Combo/bundle SKUs | EXTEND | IMPLEMENTED | `/` `/deals` | `storefront_combo_offers` | foundation combo | |
| Nutrition | EXTEND | IMPLEMENTED | PDP / cards | merchandising kcal/protein | pdp | |
| Storefront availability | EXTEND | IMPLEMENTED | catalog | BranchProductAvailability | catalog list branchId | |
| Email+password auth | EXTEND | IMPLEMENTED | `/auth` | password routes | auth-account | |
| Saved cards | EXTEND | EXTERNAL_PROVIDER_BLOCKED | `/account` | none | account honest copy | No PAN vault in iyzico adapter |
| Order preferences | EXTEND | IMPLEMENTED | checkout | eco/contactless/note | checkout | |
| Invoices/receipts | EXTEND | DEFERRED_WITH_APPROVED_REASON | — | none | — | Customer PDF not in domain |
| Address building code | EXTEND | IMPLEMENTED | checkout | access_code | checkout | |
| Burger builder | EXTEND | IMPLEMENTED | `/builder` | `GET /storefront/catalog/builder` | completeness builder; unit completeness | Same cart/modifiers |
| Ratings / reviews | NEW | IMPLEMENTED | `/` | published reviews | foundation | Moderated rows, not open posting |
| Google / Apple OAuth | NEW | EXTERNAL_PROVIDER_BLOCKED | `/auth` | adapters | auth-account | Live only with credentials |
| Newsletter / Ember | NEW | IMPLEMENTED | footer `/account` | newsletter subscribe | foundation | |
| Branches & hikaye | NEW | IMPLEMENTED | `/branches` | branches + content `hikaye` | completeness | |
| Gift card / wallet | NEW | DEFERRED_WITH_APPROVED_REASON | — | no models | — | Would be a new money domain |
| Owned map tiles | NEW | IMPLEMENTED_WITH_INTENTIONAL_DEVIATION | tracking | OSM embed | orders-tracking | No secret tiles |
| Password + remember-me | NEW | IMPLEMENTED | `/auth` | refresh session | auth-account | |
| Email verification badge | NEW | IMPLEMENTED | `/account` | email confirm | auth-account | |
| Legal CMS | NEW | IMPLEMENTED | `/legal` | `storefront_content_documents` | completeness legal | Small content model |
| Combo countdown | NEW | IMPLEMENTED | `/` | combo `endsAt` | foundation | |
| Live kitchen Izgarada | NEW | IMPLEMENTED | header `/orders` | kitchenLiveCount | foundation | Orders, not a fake kitchen cam |
| Social-proof aggregates | NEW | IMPLEMENTED | `/` | social_proof + delivered count | foundation | |
| Guest checkout | EXTRA | IMPLEMENTED | `/checkout` | guest session | checkout | |
| Guest session cart | EXTRA | IMPLEMENTED | header | cart | pdp-cart | |
| Lat/lng serviceability | EXTRA | IMPLEMENTED | `/address` | serviceability | completeness | |
| Coupon kinds | EXTRA | IMPLEMENTED | deals/checkout | promotion kinds | unit promotions | |
| Product variants | EXTRA | IMPLEMENTED | PDP | variants | pdp-cart | |
| Ingredient removals | EXTRA | IMPLEMENTED | PDP builder | removals | pdp + builder | |
| Min order + delivery fee | EXTRA | IMPLEMENTED | checkout | quote | checkout | |
| Multi-branch | EXTRA | IMPLEMENTED | `/branches` header | branches | completeness | Two seeded branches |
| Cancelled/rejected states | EXTRA | IMPLEMENTED | tracking | order status | orders-tracking | |
| Dedicated `/cart` | EXTRA | IMPLEMENTED | `/cart` | cart | pdp-cart | |
| `/search` | EXTRA | IMPLEMENTED | `/search` | `q` | completeness | |
| `/account/settings` | EXTRA | IMPLEMENTED | settings/security | preferences | auth-account | |
| Staff/admin/kitchen/courier POST/reports | NOT STOREFRONT | NOT_STOREFRONT_RELEVANT | — | admin/ops APIs | — | |
| Masked call ARA | NEW-ish / Phase 5 | EXTERNAL_PROVIDER_BLOCKED | tracking | none | club tracking | No masked-call provider |
| Masterpass / kapıda kart | EXTEND | EXTERNAL_PROVIDER_BLOCKED | checkout | catalog disabled | checkout | Honest unavailable |
| DINE_IN fulfillment | — | DEFERRED_WITH_APPROVED_REASON | `/table` | table context only | Phase 6 doc | QR is context, not a third mode |
| Company MERSIS/VKN | — | DEFERRED_WITH_APPROVED_REASON | `/legal#sirket` | content says unconfigured | legal | Not invented |

Staff login/MFA, admin writes, kitchen, courier assign, reports, settings/audit remain NOT_STOREFRONT_RELEVANT (10).

Cross-platform customer inventory (Web + Mobile impact/status): `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`.
