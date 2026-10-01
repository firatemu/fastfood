# Home merchandising slider — work item and customer sync plan

## Design direction

Keep the BURGER HOME dark storefront language: `#121316` canvas, `#1b1b1f` raised surfaces, mustard `#feb300`, flame `#ff5722`, Anton display headings, and Plus Jakarta Sans UI. The hero remains a broad photographic product feature with readable copy and price; retain previous/next and numbered dot controls with clear focus states. Auto-advance uses an Admin-configured 2–30 second interval (default 5 seconds); looping defaults on and can be disabled to stop at the final slide. Pause while hovered or keyboard-focused and honor reduced-motion preferences on web; keep native swipe/accessible controls.

Keep product catalog creation and editing intact. Add a separate Admin catalog menu, **Vitrin Slaytları**, for selecting products and changing their slide order. Product selection, ordering, and published image/copy remain server driven.

## 1. Capability affected

- `home-merchandising` — the existing home payload and home hero presentation.

## 2. Web surface (`apps/storefront-web/src/**`)

- `apps/storefront-web/src/components/storefront/golden-home-page.tsx` — render the configured slide collection while retaining legacy `hero` fallback.
- `apps/storefront-web/src/components/storefront/home-hero.tsx` — present the active slide, timed auto-advance, loop behavior, and accessible controls.
- `apps/storefront-web/src/lib/schemas.ts` — accept ordered `heroSlides` in the home response.

## 3. Mobile surface (`apps/customer-mobile/app/**`, `components/**`, `lib/**`)

- `apps/customer-mobile/app/(tabs)/index.tsx` — render configured slides and add-to-cart for the active product.
- `apps/customer-mobile/components/home-hero.tsx` — keep the existing product card as the native slide visual.
- `apps/customer-mobile/components/home-hero-slider.tsx` — add native swipe, timed auto-advance, loop behavior, dots, and accessible slide controls.
- `apps/customer-mobile/lib/schemas.ts` — accept ordered `heroSlides` in the home response.

## 4. Shared contracts

- `packages/contracts/src/customer-capability-registry.ts` — classify both customer renderers as requiring this UI change.
- The existing home response schema is app-local in Web and Mobile; preserve that contract pattern and update both schemas together. No `packages/api-client/**` change is required.
- Add backwards-compatible `heroSlides` and `heroSliderSettings` to `GET /storefront/home`; keep `hero` for older clients. Add Admin `GET /admin/home-slides` and `PUT /admin/home-slides` contracts for product order and slider settings.
- Persist slide ordering on the existing `ProductMerchandising` relation. The Admin route uses current `catalog.products.read/write` permissions and the existing Products menu page permission; no new permission family is needed.
- Persist `{ transitionDurationSeconds, loop }` as the `storefront.home_slides` `BusinessSetting`; use a 5-second, looping default when no setting row exists, so no additional database migration is needed.

## 5. Capability registry move

| Field        | Before                  | After                   |
|--------------|-------------------------|-------------------------|
| webImpact    | AUTOMATICALLY_SUPPORTED | CHANGE_REQUIRED         |
| webStatus    | IMPLEMENTED             | IMPLEMENTED             |
| mobileImpact | AUTOMATICALLY_SUPPORTED | CHANGE_REQUIRED         |
| mobileStatus | IMPLEMENTED             | IMPLEMENTED             |

## 6. Verification gates

- `pnpm check:customer-platform`
- `pnpm --filter @fastfood/storefront-web typecheck`
- `pnpm --filter @fastfood/customer-mobile typecheck`
- Admin and API typechecks/builds plus Prisma schema validation for the changed backend contract.
- `pnpm check:customer-platform` passed, including its 13 existing customer-platform contract tests. No new tests were added. Separate API unit/integration tests and browser E2E/visual smoke checks were not run.
- Local visual inspection of storefront and Admin routes where the development servers are available.

## 7. Why this is not a single-client change

The same `GET /storefront/home` payload supplies both the Web and native home hero, and both currently render a single `hero` item. The server will provide one ordered slide set and shared timing/loop settings; the clients will apply them through independent platform-native controls. Both are therefore `CHANGE_REQUIRED` for this presentation change.

## 8. Execution record

- API, Admin, Storefront Web, and Customer Mobile typechecks passed. Prisma schema validation, API build, Admin production build, Admin page lint, and formatting checks for the new artifacts passed.
- `pnpm check:customer-platform` passed, including 13 existing tests.
- The Storefront Web production build compiled the application and passed TypeScript, then stopped while prerendering the unrelated `/cart` route because its `useSearchParams()` call is outside a Suspense boundary.
- The canonical OpenAPI JSON now contains `GET` and `PUT /admin/home-slides`. The exporter writes its JSON artifact but exits with status 1 during Nest application initialization, so the generated artifact was checked for valid JSON and expected paths separately.
- The stale API process was restarted. `GET /api/v1/admin/home-slides` now reaches its auth guard (401 without credentials, rather than 404), and `GET /api/v1/storefront/home` returns 200 with `heroSlides`.
- The additive migration was applied to the local database at `localhost:5439`; Prisma reports the schema is up to date. Browser visual review was not performed.

## 9. Playback settings follow-up

- Admin saves a 2–30 second transition interval and loop toggle together with slide order, using the existing `BusinessSetting` store and no additional migration.
- API defaults are 5 seconds and loop enabled. The local API returned HTTP 200 with those settings and the active slide collection after restart.
- API/Admin/Web/Mobile/Contracts typechecks, API/Admin builds, and targeted API, Admin-page, and Storefront hero lint checks passed. Storefront production build still stops at the unrelated `/cart` Suspense prerender issue recorded above.
- No tests were added or run for this follow-up; the existing customer-platform checker was not rerun.
