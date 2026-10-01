# Customer address map selection — work item and sync plan

## Scope and source findings

- `Address.latitude` and `Address.longitude` already persist to PostgreSQL as `Decimal(9, 6)`; no schema migration is required.
- The customer address API already validates coordinate ranges, but the Storefront form silently supplied a fixed Kadıköy point. The native helper also initialized coordinates from the generic delivery default and exposed no map picker.
- Checkout copies delivery coordinates into the order address snapshot; order presentation and Courier navigation consume that snapshot. Existing downstream routing needs no change.
- Reuse the existing OSM map direction using an interactive Leaflet map embedded in the Web and Mobile clients. A location only becomes confirmed after the user taps a point; show OSM attribution and request only visible tiles.

## 1. Capability affected

- `address-crud` — authenticated customer address book and map-selected coordinates.
- The separate `latlng-serviceability` capability remains automatically supported: its API and client call stay unchanged.

## 2. Web surface (`apps/storefront-web/src/**`)

- `apps/storefront-web/src/components/storefront/account-addresses-page.tsx` — remove implicit coordinates, require a selected point, and disable submission until selection.
- `apps/storefront-web/src/components/storefront/address-location-picker.tsx` — interactive OSM map, marker, selection state, and visible attribution.
- `apps/storefront-web/src/lib/storefront/address-map-html.ts` — Leaflet map document used by the sandboxed map frame.
- `apps/storefront-web/src/lib/storefront/addresses.ts` — include the map-confirmed coordinate request field.

## 3. Mobile surface (`apps/customer-mobile/app/**`, `components/**`, `lib/**`)

- `apps/customer-mobile/app/account/addresses.tsx` — require map confirmation before creating an address.
- `apps/customer-mobile/components/address-location-picker.tsx` — native WebView map selector with marker and OSM attribution.
- `apps/customer-mobile/lib/address-map-html.ts` — Leaflet map document for native WebView.
- `apps/customer-mobile/lib/address-map.ts` — keep new-address coordinates empty until selection and validate confirmation.
- `apps/customer-mobile/lib/addresses.ts` — include the map-confirmed coordinate request field.

## 4. Shared contracts and backend

- `apps/api/src/modules/customer/customer.controller.ts` — require `locationConfirmed: true` with valid coordinates on create; validate coordinate pairs and confirmation on updates.
- `apps/api/src/modules/customer/customer.service.ts` — persist selected coordinates on create/update; strip the UI confirmation flag before persistence.
- `apps/api/prisma/schema.prisma` — no change; existing `Address.latitude` / `longitude` columns are non-null.
- Existing checkout, order snapshot, and Courier navigation contracts already propagate the stored latitude/longitude; no downstream API change.
- No new `@fastfood/contracts` or `@fastfood/api-client` DTO is needed; the write payloads are app-local today.

## 5. Capability registry move

| Field        | Before                  | After           |
|--------------|-------------------------|-----------------|
| webImpact    | AUTOMATICALLY_SUPPORTED | CHANGE_REQUIRED |
| webStatus    | IMPLEMENTED             | IMPLEMENTED     |
| mobileImpact | AUTOMATICALLY_SUPPORTED | CHANGE_REQUIRED |
| mobileStatus | IMPLEMENTED             | IMPLEMENTED     |

The `address-crud` registry row and mirror matrix note are updated before the UI implementation diff.

## 6. Verification gates

- PASS: API, Storefront Web, and Customer Mobile TypeScript typechecks.
- PASS: API lint and targeted Storefront Web lint; changed Customer Mobile files lint without rule warnings (ESLint emits parser notices while scanning React Native Flow files).
- PASS: Prettier check and `git diff --check` for changed files.
- PASS: capability-contract build/typecheck and its existing contract tests (13 tests passed; these ran as part of `pnpm check:customer-platform`). That composite command first stopped at a Storefront type error; after correcting the create/update payload types, each app typecheck passed directly.
- PASS: local Storefront `/account/addresses` and API `/health/live` both returned HTTP 200.
- NOT RUN: authenticated API create/update persistence against the local database; no customer session was available in this verification pass. The Prisma schema already has non-null `Decimal(9, 6)` coordinate columns, and the API create/update service writes both submitted coordinates.

## 7. Why both clients change

Both customer clients create and edit the same address resource through `/me/addresses`. The web and native forms currently have independent coordinate behavior, so both need a native map-selection control and a shared server requirement. Checkout and Courier already consume the saved coordinates and are automatically supported.
