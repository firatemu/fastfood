# Customer address hierarchy — cross-platform implementation plan

## 1. Capability affected

- `address-crud` — remains `CHANGE_REQUIRED` / `IMPLEMENTED` on Web and Mobile.
- Both platforms add the same required province → district → neighborhood hierarchy and address fields.

## 2. Web surface

- `apps/storefront-web/src/components/storefront/account-addresses-page.tsx` — structured customer address form, dependent selectors, validation, and saved-address display.
- `apps/storefront-web/src/lib/storefront/addresses.ts` and API response schemas — geographic option lookups and expanded address write body.

## 3. Mobile surface

- `apps/customer-mobile/app/account/addresses.tsx` and `apps/customer-mobile/lib/address-map.ts` — same fields, state transitions, and required selections.
- `apps/customer-mobile/lib/addresses.ts` and `apps/customer-mobile/lib/schemas.ts` — matching geographic option lookups and address payload.

## 4. API, database, and shared contracts

- API serves active provinces, districts by province, and neighborhoods by district from persisted reference tables.
- Seed only Adana, Osmaniye, Gaziantep, Mersin, and İstanbul reference rows from the checked-in source snapshot.
- Persist province/district/neighborhood identifiers and labels with address records; add separate floor and apartment-number columns while keeping legacy address columns readable.
- Enforce the five-province allowlist and selected hierarchy in API validation, not only in UI controls.
- Use a canonical Prisma migration and idempotent local seed; no remote database operation.
- Update API/OpenAPI and shared client schemas as required by document 40.

## 5. Capability registry

- `address-crud` remains `CHANGE_REQUIRED` / `IMPLEMENTED` for Web and Mobile. No scope downgrade.

## 6. Data source

- Imported snapshot: [onurusluca/turkey-geo-api](https://github.com/onurusluca/turkey-geo-api), pinned commit `5a16cef20f2335e3fe643c9618f931866bb8134c`; upstream documents alignment with NVİ address-query (March 2026), TÜİK (October 2025), and HGM reference material. Snapshot provenance is recorded beside the imported rows in `apps/api/prisma/seed-data/address-geography.json`.
- Official reference points: [PTT postcode query](https://www.ptt.gov.tr/posta-kodu), [HGM Turkish Settlement Database](https://www.harita.gov.tr/urun/turkiye-yerlesim-yerleri-veri-tabani-yyvt/4), and [TÜİK UAVT background](https://nip.tuik.gov.tr/Home/Uavt). HGM's data is offered commercially; the checked-in snapshot is the pinned MIT upstream source, not an HGM download. An unofficial PTT mirror without a license was not used.

## 7. Design plan

- Preserve BURGER HOME's existing dark canvas, warm mustard focus, Jakarta Sans typography, and address-page spacing.
- Group address identity and administrative hierarchy before the map; keep building/access details together below the map so customers can select the delivery point in context.
- Use dependent selectors with clear disabled/loading states; list the selected district's neighborhoods directly without a neighborhood search field. Preserve province/district search where the platform already provides it; changing a parent clears all child values.
- Review against the brief: this extends the established storefront form instead of introducing unrelated decorative cards or a new visual language.

## 8. Implementation and verification

- Seed snapshot pinned to upstream commit `5a16cef20f2335e3fe643c9618f931866bb8134c`, built 2026-04-14. It contains 5 provinces, 83 districts, and 3,979 neighborhoods. Each province includes a map center.
- Canonical migrations `20260927120000_customer_address_geography` and `20260927130000_allow_duplicate_neighborhood_names` applied to local PostgreSQL `fastfood` on `localhost:5439`; no remote database was targeted. The second migration preserves same-name but distinct settlement records.
- Idempotent seed completed against that local database. Database counts verified: 5 provinces, 83 districts, and 3,979 neighborhoods. API serves the persisted hierarchy; the browser showed the five allowed provinces, Adana's 15 districts, and Aladağ's 31 neighborhoods. Selecting Adana re-centered the map to its stored center.
- Address entry in Web and Mobile collects address name, province, district, neighborhood, avenue, street, building/name, floor, apartment, and directions. Map location remains required. The API resolves human-readable administrative labels from selected IDs and enforces the province allowlist and district/neighborhood relationships.
- Passed: Prisma schema validation; API build/typecheck/lint; Web and Mobile typechecks; workspace customer-platform check (13/13); focused API customer tests (9/9); focused Mobile address mapping tests (5/5); lint on changed client files; generated and synchronized `docs/openapi/openapi.json`; local API and Web HTTP smoke (200). No customer address was submitted during browser verification.
- Human review remains for the Mobile screen in an Android/iOS emulator. The repository remains at its documented final human-validation gate; this implementation does not mark human acceptance. Mobile lint emits parser notices while inspecting installed React Native dependency sources, but the changed-file lint command exits successfully.

## 9. Follow-up sync plan — remove recipient inputs

- **Capability affected:** `address-crud`; Web and Mobile remain `CHANGE_REQUIRED` / `IMPLEMENTED`.
- **Web surface:** `apps/storefront-web/src/components/storefront/account-addresses-page.tsx` removes recipient name/phone inputs and their card display; new addresses use the signed-in customer's profile name and phone.
- **Mobile surface:** `apps/customer-mobile/app/account/addresses.tsx` removes the same inputs and card display; new addresses use the same profile fields.
- **Shared contracts:** no change. The API and persisted recipient fields remain populated for courier delivery compatibility.
- **Capability registry:** no status or impact change; both rows remain implemented.
- **Verification gates:** storefront and customer-mobile typechecks, targeted lint for both changed screens, and `pnpm check:customer-platform`.
