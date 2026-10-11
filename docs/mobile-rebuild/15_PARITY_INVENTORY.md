# Mobile parity inventory — web ↔ mobile

Machine-readable feature inventory for the mobile rebuild. The web surfaces are
the source of truth for business behaviour; the mobile apps must match their
business rules, permissions, validation, mutations and data outcomes. Visual
layout is allowed to differ for mobile usability.

States: `DISCOVERED` · `PLANNED` · `IN_PROGRESS` · `IMPLEMENTED` · `VERIFIED` ·
`BLOCKED` · `NOT_APPLICABLE`

`VERIFIED` requires executed evidence — a gate run, a passing test, or an
observed device behaviour. A screen that merely renders is `IMPLEMENTED`, never
`VERIFIED`.

Generated for the rebuild started 2026-10-11.

---

## 1. Scope and locked constraints

| Item | Value |
| --- | --- |
| Monorepo | `W:\home\azem\projects\fastfood`, pnpm + turbo workspaces |
| Web references | `apps/storefront-web`, `apps/courier-web`, `apps/admin-web` |
| Mobile targets | `apps/customer-mobile`, `apps/courier-mobile` |
| Backend | `apps/api`, shared unchanged |
| Shared contracts | `@fastfood/contracts`, `@fastfood/api-client`, `@fastfood/domain-types` |
| Recoverable baseline | `backups/2026-10-11-mobile-rebuild-baseline` (284 files / 1,479,307 B) |

### Locked decisions that constrain the rebuild

- **ADR-008** (Accepted) — `customer-mobile` **must not** import
  `@fastfood/ui-native`, `@fastfood/ui-web` or `@fastfood/design-tokens`; its
  visual foundation is independent by design and is enforced by ESLint. The
  `ui-native` consumer is `courier-mobile`. Do not "de-duplicate" customer
  components into the shared package.
- **App identity preserved** — `customer-mobile`
  `com.azemyazilim.fastfoodcustomer`, `courier-mobile`
  `com.azemyazilim.fastfoodcourier`, schemes `fastfoodcustomer` /
  `fastfoodcourier`. Native `android/` and `ios/` projects are untouched.
- **Backend unchanged** — every mobile call reuses an existing endpoint. No
  endpoint, field or envelope was invented.

---

## 2. Courier surface — `courier-web` → `courier-mobile`

Audited file by file: `apps/courier-web/src/app/**` and
`apps/courier-mobile/app/**`.

| # | Feature | Web reference | Mobile implementation | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| C1 | Staff login | `app/login/page.tsx` | `app/login.tsx` | `IMPLEMENTED` | gate green |
| C2 | MFA verification | `app/login/page.tsx` | `app/login.tsx` | `IMPLEMENTED` | gate green |
| C3 | Auth guard + boot screen | `components/guard.tsx` | `app/_layout.tsx` hydration gate | `IMPLEMENTED` | gate green |
| C4 | Session persistence / restore | `components/session-provider.tsx` | `lib/session.ts` (SecureStore) | `IMPLEMENTED` | gate green |
| C5 | Deliveries list | `app/deliveries/page.tsx` | `app/deliveries.tsx` | `IMPLEMENTED` | gate green |
| C6 | Delivery detail | `app/deliveries/[deliveryId]/page.tsx` | `app/deliveries/[id].tsx` | `IMPLEMENTED` | gate green |
| C7 | **Guarded status transition** | `actionByStatus` map | `lib/status.ts` `NEXT_ACTIONS` | `VERIFIED` | 11 unit tests |
| C8 | Lifecycle progress steps | `.status-steps` | `Stepper` in detail screen | `IMPLEMENTED` | gate green |
| C9 | Localized status labels | `labels` map | `lib/status.ts` `STATUS_LABELS` | `VERIFIED` | 11 unit tests |
| C10 | QR claim (typed) | `app/claim/page.tsx` | `app/claim.tsx` | `IMPLEMENTED` | gate green |
| C11 | **QR claim (camera scan)** | `components/qr-scanner.tsx` | `app/claim.tsx` `CameraView` | `IMPLEMENTED` | gate green |
| C12 | Courier performance | `app/performance/page.tsx` | `app/performance.tsx` | `IMPLEMENTED` | gate green |
| C13 | Delivery history | `app/history/page.tsx` | `app/history.tsx` | `IMPLEMENTED` | gate green |
| C14 | Map navigation | `GET …/navigation` | `Linking.openURL` | `IMPLEMENTED` | gate green |
| C15 | Call recipient | `tel:` link | `Linking.openURL('tel:…')` | `IMPLEMENTED` | gate green |
| C16 | Location reporting | — (web-only limitation) | `POST …/location` | `NOT_APPLICABLE` | mobile-only capability |
| C17 | Logout + secure cleanup | session provider | `clearCourierSession()` | `IMPLEMENTED` | gate green |

### Defects found and closed in this pass

| Defect | Severity | Fix |
| --- | --- | --- |
| All four transition buttons rendered regardless of status, letting a courier post `deliver` from `ASSIGNED` and skip pickup | **business rule** | single `nextActionFor(status)` button |
| Raw enum values (`PICKED_UP`) shown to couriers instead of Turkish labels | parity | `STATUS_LABELS` |
| `/performance` and `/history` screens missing entirely | parity | both screens added |
| Session held in a module variable only — lost on every app restart, no secure storage | **security** | `expo-secure-store` + hydration gate |
| Login auto-posted `totp: '000000'` — a silent MFA bypass | **security** | code is now required; no client-supplied default |
| Dev password `DevStaffPass1!` hardcoded in component state | **security** | removed |
| Login response schema omitted optional `accessToken`, so Zod silently stripped it | correctness | schema aligned with the web client |
| `vitest.config.ts` included only `src/**` and `app/**`, so every test under `lib/` was silently skipped | **test integrity** | `lib/**` added to `include` |
| `react-hooks/rules-of-hooks` violation in claim screen (early `Redirect` before hooks) | correctness | hooks hoisted above the guard |

---

## 3. Customer surface — `storefront-web` → `customer-mobile`

Route trees were compared file by file: 29 storefront route pages against 33
customer-mobile route files.

**Structural mapping.** Every web route has a mobile counterpart. Two are merged
by design rather than missing: web `/` (`GoldenHomePage`) and `/menu`
(`MenuPage`) become one native "Menü" tab that carries the hero slider, category
chips and the product grid. Mobile has three extra routes with no web page —
`/legal/allergens`, `/payment/return`, `/table/scan` — which are mobile-native
consequences of provider-hosted payment (ADR-008 rule 6) and QR table entry.

### Feature comparison

| # | Feature | Web reference | Mobile | State |
| --- | --- | --- | --- | --- |
| U1 | Auth / register / reset / callback | `app/(shop)/auth`, `auth/callback` | `auth.tsx`, `auth/reset.tsx`, `auth/callback.tsx` | `IMPLEMENTED` |
| U1b | Session storage split | — | `lib/native-kv.ts`: session/refresh material in `expo-secure-store`, AsyncStorage reserved for the non-secret guest id | `VERIFIED` |
| U2 | Branches + city grouping | `branches-page.tsx` | `branches.tsx` | `IMPLEMENTED` |
| U3 | Home: hero, categories, products, combo, craft | `golden-home-page.tsx` | `(tabs)/index.tsx` | `IMPLEMENTED` |
| U4 | Menu browsing (merged into U3) | `menu-page.tsx` | `(tabs)/index.tsx` | `IMPLEMENTED` |
| U5 | Product detail + modifiers + removals | `product-detail-page.tsx`, `removal-selector.tsx` | `products/[id].tsx`, `RemovalChips` | `IMPLEMENTED` |
| U6 | Builder | `builder-page.tsx`, `removal-selector.tsx` | `(tabs)/builder.tsx` | `IMPLEMENTED` |
| U7 | Search | `search-page.tsx` | `(tabs)/search.tsx` | `IMPLEMENTED` |
| U8 | Cart + coupon | `shop-cart-page.tsx`, `coupon-form.tsx` | `cart.tsx`, `lib/coupon-store.ts` | `IMPLEMENTED` |
| U9 | Checkout: tip, coupon, fulfillment, schedule, payment method | `checkout-page.tsx`, `tip-selector.tsx`, `coupon-form.tsx`, `fulfillment-selector.tsx`, `delivery-schedule-selector.tsx`, `payment-method-selector.tsx` | `checkout.tsx` (all six confirmed present) | `IMPLEMENTED` |
| U10 | Order preferences (eco, contactless) | `order-preferences.tsx` | `checkout.tsx` lines 510-528 | `IMPLEMENTED` |
| U11 | Payment status + return | `payment-status-page.tsx` | `payment/[checkoutId].tsx`, `payment/return.tsx` | `IMPLEMENTED` |
| U12 | Orders list + tracking | `orders-list-page.tsx`, `order-tracking-page.tsx` | `(tabs)/orders.tsx`, `orders/[orderId]/index.tsx` | `IMPLEMENTED` |
| U13 | Order confirmation | `order-confirmation-page.tsx` | `orders/[orderId]/confirmation.tsx` | `IMPLEMENTED` |
| U14 | Account shell + settings | `account-page.tsx`, `account-settings-page.tsx` | `(tabs)/account.tsx`, `account/settings.tsx` | `IMPLEMENTED` |
| U15 | Addresses | `account-addresses-page.tsx` | `account/addresses.tsx` | `IMPLEMENTED` |
| U16 | Club + spin | `club-page.tsx`, `spin-page.tsx` | `account/club.tsx`, `account/spin.tsx` | `IMPLEMENTED` |
| U17 | Favorites | `favorites-page.tsx`, `favorite-button.tsx` | `account/favorites.tsx` | `IMPLEMENTED` |
| U18 | Security | `account-security-page.tsx` | `account/security.tsx` | `IMPLEMENTED` |
| U19 | Notifications | `notifications-page.tsx` | `account/notifications.tsx` | `IMPLEMENTED` |
| U20 | Support | `support-page.tsx` | `account/support.tsx` | `IMPLEMENTED` |
| U21 | Table QR | `table-page.tsx` | `table/index.tsx`, `table/[code].tsx`, `table/scan.tsx` | `IMPLEMENTED` |
| U22 | Legal | `legal-page.tsx` | `legal/index.tsx`, `legal/allergens.tsx` | `IMPLEMENTED` |
| U23 | Deals | `deals-page.tsx` | `deals.tsx` | `IMPLEMENTED` |
| U24 | **Home social proof (reviews)** | `home-reviews.tsx` | `components/home-reviews.tsx` | `VERIFIED` |
| U25 | **Product upsell** | `upsell-section.tsx` | `components/upsell-strip.tsx` | `IMPLEMENTED` |
| U26 | **Category rail under filter** | `menu-page.tsx` (separate categories fetch) | `lib/category-rail.ts` | `VERIFIED` |

### Defects found and closed in this pass

| Defect | Severity | Fix |
| --- | --- | --- |
| Home reviews never rendered. `homeResponseSchema` already parsed `reviews` + `socialProof`, and the API already returned them — the data was fetched and thrown away | parity | `HomeReviews` + `lib/social-proof.ts` (+10 tests) |
| Product recommendations never rendered. `productDetailSchema` parsed `recommendations` but nothing displayed it | parity | `UpsellStrip` wired into the product scroll |
| **Category rail collapsed to one chip when a category was selected.** The API derives `visibleCategoryIds` from the already-`categoryId`-filtered products, so a filtered response carries only the selected category. Web is immune because `MenuPage` sources categories from `fetchStorefrontCategories()`; mobile read them from the home payload | **functional** | `lib/category-rail.ts` keeps the unfiltered rail (+13 tests) |
| `branches.tsx` used a non-null assertion (`grouped.get(c)!`), failing `--max-warnings=0` | lint | hoisted the lookup |

### Field-level payload parity

Compared against the web client **and** the API's own DTOs, so the contract —
not just the other client — is the reference.

| Payload | Endpoints compared | Result |
| --- | --- | --- |
| Cart | `cart/merge`, `cart`, `cart/quote`, `cart/lines` POST, `cart/lines/{id}` PATCH + DELETE | identical verb/path/method set |
| Checkout quote | `checkout/quote` — 17 request fields checked against `CheckoutService.quote`'s `CheckoutQuoteInput` | **full parity**: `fulfillmentMode`, `tipMinor`, `ecoPackaging`, `contactless`, `buildingAccessCode`, `deliveryNote`, `guestName`, `guestPhone`, `addressLabel`, `scheduledFor`, `latitude`, `longitude`, `pickupBranchId`, `couponCode`, `checkoutSessionId`, `loyaltyRequestedMinor`, `loyaltyAvailablePoints` |
| Payment init | `checkout/payment/initialize` | parity; mobile additionally sends the `Idempotency-Key` **header**, web only puts it in the body |
| Order status vocabulary | `@fastfood/contracts` `CUSTOMER_ORDER_PHASES`, `mapOrderStatusToPhaseIndex`, `mapOrderStatusToStitchStepperIndex` | mobile re-exports the canonical contract — no duplicated mapping, no drift possible |
| Slots / payment methods / loyalty | `checkout/slots`, `checkout/payment-methods`, `checkout/loyalty/balance` | parity |
| Address book | `me/addresses` GET/POST/PATCH/DELETE + `me/address-geography/provinces`, `…/districts`, `…/neighborhoods` | parity |
| Engagement | `me/club`, `me/spin`, `me/favorites`, `me/favorites/{id}`, `me/preferences` GET/PATCH, `me/loyalty` | parity |
| Notifications | `me/notifications`, `me/notifications/{id}/read`, `me/notifications/read-all` | parity |
| Support | `me/support/conversations` GET/POST, `…/{id}` GET, `…/{conversationId}/messages` POST | parity |
| Table QR | `storefront/tables/{code}` GET, `storefront/tables/{code}/scan` POST (`@Post(':code/scan')`, `dining-table.controller.ts:39`) | parity — both clients POST the scan, and both attach the guest session header the scan records |

Session-header behaviour compared: web sends `X-Session-Id` unconditionally via
`sessionHeaders()`; mobile sets `x-session-id` only while unauthenticated and
**deletes** it once a customer session exists. Header names are
case-insensitive, so the wire format matches, and mobile's behaviour is the
stricter of the two — no risk of a stale guest id being attributed to an
authenticated scan.

Mobile additionally calls `GET /me` and `PATCH /me` (profile fetch/update), which
the web client does not. That is mobile holding *more* surface than the web
reference, which is not a parity gap — but it is recorded because it means the
mobile profile write path has no web counterpart to compare against.

Notable correct behaviours confirmed:

- `contactless` is forced to `false` for `PICKUP` on **both** clients, and the
  API enforces it again server-side (`checkout.service.ts:182`). Mobile does not
  leak the toggle into pickup orders.
- Coordinates are only sent for `DELIVERY`; `PICKUP` sends `pickupBranchId`.

### Checked and found NOT to be a gap

`orders/{id}/courier-location` exists as a client function on **both** sides
(`storefront-web/src/lib/storefront/orders.ts:38` defines `fetchCourierLocation`,
`customer-mobile/lib/schemas.ts:699` defines the response schema) — and **neither
client calls it**. Neither surface exposes live courier location, so this is
unused scaffolding on both, not a parity gap. Recorded so a future pass does not
"fix" it in one client only and create drift.

### Not yet compared feature-by-feature

U1–U26 above were confirmed by locating each feature's data and control on both
sides. The **cart, checkout, payment, order-status, address, engagement,
notification and support** payloads have additionally been compared endpoint by
endpoint and field by field against the API DTOs (section above) — all at
parity.

Method note: a first pass normalised every endpoint to compare them in bulk and
produced two false gaps (`me/notifications/{id}/read`, `me/support/conversations/{id}`),
because template-literal paths collapse onto their static prefix. Every
"missing" endpoint was re-checked by reading its call site before being reported.

---

## 4. Verification gate

Run inside WSL — `W:` is a WSL mount over the Plan 9 provider, where `pnpm`
panics and `node_modules` symlinks are broken:

```
wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/mobile-gate.sh courier-mobile
wsl.exe -e bash -l /home/azem/projects/fastfood/scripts/mobile-gate.sh customer-mobile
```

| App | Typecheck | Lint | Tests | Gate |
| --- | --- | --- | --- | --- |
| `courier-mobile` | PASS (exit 0) | PASS (0 violations) | 11 passed / 11 | **ALL GREEN** |
| `customer-mobile` | PASS (exit 0) | PASS (0 violations) | 129 passed / 129 | **ALL GREEN** |

Expo config resolves for both apps and the application identity matches the
expected identifiers (`scripts/expo-config-check.sh`):

| App | `android.package` | `ios.bundleIdentifier` | Identity |
| --- | --- | --- | --- |
| `courier-mobile` | `com.azemyazilim.fastfoodcourier` | same | MATCHES |
| `customer-mobile` | `com.azemyazilim.fastfoodcustomer` | same | MATCHES |

### Android build — executed, both apps

Built inside WSL against the Linux Android SDK
(`scripts/android-build-detached.sh`). The repo lives on a WSL mount, so the
Windows SDK cannot be used from Linux and Windows-side Node cannot resolve any
module over the Plan 9 provider — the build has to run on the Linux side.

| App | Result | Time | APK | Package inside the APK | Verdict |
| --- | --- | --- | --- | --- | --- |
| `courier-mobile` | `BUILD SUCCESSFUL`, exit 0 | 1m 15s | 88 MB | `com.azemyazilim.fastfoodcourier` | IDENTITY MATCHES |
| `customer-mobile` | `BUILD SUCCESSFUL`, exit 0 | 8m 13s | 90 MB | `com.azemyazilim.fastfoodcustomer` | IDENTITY MATCHES |

Both APKs were measured with `aapt2 dump badging` rather than assumed: package
id, launcher activity, version and packaged ABI (`arm64-v8a`) were read back out
of the built artifact. A build that succeeded while silently changing the
package id would break signing and distribution while still reporting success.

Single ABI (`arm64-v8a`) was built deliberately — a validation gate does not
need all four, and the CMake work across every ABI is roughly 4× the wall clock.

Lint deliberately counts only project rule violations (`file:line` findings);
ESLint's parse failures on React Native's own Flow sources are environment noise
present before these changes.

---

## 5. Not yet verified

| Item | State | Blocker |
| --- | --- | --- |
| iOS build | `BLOCKED` | requires macOS + Xcode; this host is Windows + WSL2 |
| Release / signed build | `BLOCKED` | needs production signing material; out of scope (deployment prohibited) |
| Camera QR scan on a physical device | `IMPLEMENTED` | needs a device permission grant |
| SecureStore round-trip on device | `IMPLEMENTED` | needs a device run |
| Android app launch / smoke test | `VERIFIED` | — |

### Emulator-ABI APK — standalone build runs

A second `customer-mobile` build for `x86_64` finished `BUILD SUCCESSFUL` (exit 0,
1m 13s); `aapt2` read the package back out of the artifact as
`com.azemyazilim.fastfoodcustomer`, launcher `MainActivity`, ABI `x86_64`. It was
installed on `emulator-5554` (`scripts/install-apk.sh`) and launched.

This settles the earlier Expo Go limitation: `app/deals.tsx` aborts under Expo Go
57.0.9 with `Cannot find native module 'ExpoClipboard'`, and renders normally on
the standalone build. The APK really does contain the module; Expo Go simply
cannot load it. The Deals route is reachable via its own scheme
(`am start -a android.intent.action.VIEW -d fastfoodcustomer://deals`).

---

## 6. Product card CTA — customize instead of quick add

**Requested:** drop the circular "+" add-to-cart from the mobile product card and
replace it with a compact yellow "Özelleştir" button, right-aligned next to the
price, that opens the same product customization page the image tap opened.

| Client | Classification | Change |
| --- | --- | --- |
| `apps/customer-mobile` | `CHANGE_REQUIRED` | `components/product-card.tsx` rebuilt; `lib/customize-label.ts` added; callers `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx` no longer pass `busy`/`onAdd` |
| `apps/storefront-web` | `AUTOMATICALLY_SUPPORTED` | already had the CTA — `components/storefront/product-card.tsx:100-105` links to `/products/{id}`; nothing to change |

Capability registry rows `product-list` and `cart-crud` stay `IMPLEMENTED` on both
clients, so no registry edit was required: cart entry remains available on both,
and on mobile it now happens through the product route where modifiers are chosen.

`customizeLabel()` mirrors the web decision — a drink (`volumeMl !== null`) is
labelled `BOYUT`, a `Yan Lezzet` side is `PORSİYON SEÇ`, everything else is
`ÖZELLEŞTİR`. The card image, name and description remain tappable, so nothing
that worked before stopped working.

The CTA lives in the footer row beside the price: `flexDirection: row`,
`space-between`, price `flexShrink: 1`, chip `flexShrink: 0`. It is
`colors.mustard` on `colors.onMustard`, `radius.sm`, 11px label, **30dp tall** —
a full 44dp button would not fit beside the price in a 47%-wide column. The touch
target stays at 44dp through `hitSlop`, applied to this link only, so the chip
looks compact without becoming hard to hit and neighbouring links cannot steal
its taps.

### Trap found while verifying: `Link asChild` silently drops function styles

The first implementation used `<Link asChild><Pressable style={({ pressed }) => …}>`.
The button rendered as unstyled text — no background, no 44dp height, no margin.

Cause, read from the installed sources rather than guessed:

- `expo-router` `build/link/BaseExpoRouterLink.js:87` renders the child through
  Radix's `Slot`.
- `@radix-ui/react-slot@1.2.3` `dist/index.mjs:78` merges props with
  `overrideProps[propName] = { ...slotPropValue, ...childPropValue }` for `style`.
- Spreading a **function** yields `{}`, so any `Pressable` whose `style` is a
  state callback renders with no style at all. Object styles are unaffected, which
  is why the four pre-existing `Link asChild` usages
  (`app-header.tsx`, `home-hero.tsx`, `product-configure.tsx`) are fine.

Fix: `CardLink` uses `useRouter().push()` on a plain `Pressable`, so the style
function survives. The reason is recorded in a comment next to it.

### Evidence

| Check | Result |
| --- | --- |
| `scripts/mobile-gate.sh customer-mobile` | typecheck PASS, lint PASS (0 violations), 134 tests / 32 files PASS — ALL GREEN |
| `scripts/measure-card-cta.sh` on the emulator screenshot | left chip 90.3 × 29.7dp, right chip 89.9 × 30.1dp; label centred in both (`leftGap` 28px = `rightGap` 28px); chip right edge 8.4dp / 8.8dp from the card edge (the 8dp footer gutter + 1dp border); 47px of price mustard to the left of each chip on the same row — **PASS** |
| Tapping the chip (`scripts/tap-shoot.sh 383 1603`) | opens "BURGER DETAY" — product detail with BOY / VARYANT modifier groups and the sticky "SEPETE EKLE" bar |
| Search tab, query `burger` | 21 results, cards render the same chip; removing `onAdd` from `search.tsx` broke nothing |

Geometry note: `uiautomator dump` is unavailable on this emulator — Maestro holds
the device accessibility service and the dump is SIGKILLed — so the chip was
measured from its flat `colors.surfaceHigh`/`colors.mustard` fill in the
screenshot instead. Isolating it from the price (same colour, same row) took
five attempts; `scripts/measure-card-cta.py` records why each earlier rule was
wrong, the last being that the centred label splits the chip's fill on every row
it crosses, so no "long run per row" rule can hold. The working definition is a
rectangle of solid colour: rows that start at the chip's left edge and span most
of its width, bridged across the ~36 rows the label interrupts.

Layout note: the two chips of a card row are **not** on the same baseline — a
product name that wraps to two lines pushes its own footer ~43px lower while the
sibling card's stays up, because each card lays its content out from the top of
its own box.

### Side change (reported, not silent)

`app/deals.tsx` renders the same "Özelleştir" label with
`textTransform: 'uppercase'`, which React Native applies locale-unaware: it
uppercases Turkish `i` to `I`, so the button read "ÖZELLEŞTIR". The label is now
written as "ÖZELLEŞTİR", matching the product card. The same trap applies to any
future Turkish label — write it pre-uppercased, never with `textTransform`.

Not yet seen on screen: the Deals screen loads on the standalone build, but the
seed has no active campaign or combo rows ("TÜM FIRSATLAR (0)"), so the combo
card that carries this label does not render. The change is typecheck/lint clean
only; the product-card label next to it is verified in the screenshots above.