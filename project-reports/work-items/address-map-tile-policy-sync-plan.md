# Address map tile policy fix — customer UI sync plan

## 1. Capability affected

- `address-crud` — preserve mandatory user-selected address coordinates.
- Registry state remains `CHANGE_REQUIRED` / `IMPLEMENTED` for Web and Mobile.

## 2. Web surface (`apps/storefront-web/src/**`)

- `public/address-map-picker.html` — host the MapLibre/OpenFreeMap map as a separate-origin document so its blob worker can start.
- `src/lib/storefront/address-map-html.ts` — build the isolated map document URL and pass only optional selected coordinates.
- `src/components/storefront/address-location-picker.tsx` — allow scripts plus same-origin inside the sandboxed iframe only because the map document is served from a distinct `map.*` origin; validate message origin/source.

## 3. Mobile surface (`apps/customer-mobile/**`)

- `lib/address-map-html.ts` — use the same MapLibre/OpenFreeMap map and selection contract in the native WebView, with a non-opaque base URL for blob-worker support.
- Native client remains required because it uses its own WebView renderer and map document.

## 4. Shared contracts

- No API payload, database, or shared contract change. Coordinates and mandatory confirmation are unchanged.

## 5. Capability registry

- No classification change: `address-crud` stays `CHANGE_REQUIRED` / `IMPLEMENTED` on both clients.

## 6. Verification gates

- Typecheck both customer clients.
- Lint the changed files and check formatting.
- Verify the address form route returns successfully after the running app reloads.
- Verify browser-rendered map load, map click coordinates, and attribution visibility after switching both clients from the blocked OSM raster layer; confirm worker execution stays within a distinct origin.

## 7. Verification result

- PASS: Storefront Web and Customer Mobile typechecks.
- PASS: targeted lint of changed source files and Prettier formatting checks.
- PASS: customer-platform contract check (13 checks).
- PASS: local `/account/addresses` rendered the OpenFreeMap Liberty basemap through `map.localhost:3100`; attribution is visible and the map responds to a click with a marker.
- PASS: map frame runs at a distinct origin and parent messages are accepted only from that origin and frame.
- NOT VERIFIED: Customer Mobile map rendering and coordinate transfer were not exercised in an emulator during this repair; its source was typechecked and linted.
- Existing workspace noise: repository-wide `git diff --check` reports trailing whitespace in the already-dirty generated Prisma client at `apps/api/prisma/generated/client/index.d.ts`, outside this map change.
- Root cause: changing the raster provider alone was insufficient because MapLibre's blob worker cannot start in an opaque `srcDoc` document. The web map now uses a dedicated map origin, and the mobile WebView receives a non-opaque base URL.

## 8. Why both clients move together

Storefront Web and Customer Mobile each construct map documents independently, so both must use the same available provider while preserving click-to-coordinate selection. The address selection and API persistence contracts do not change.
