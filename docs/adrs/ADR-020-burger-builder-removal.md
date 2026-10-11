# ADR-020: Burger builder removal from customer surfaces

Status: Accepted
Date: 2026-10-11
Decision owners: Human owner
Authorization basis: explicit human-owner instruction in the working session of
2026-10-11 — "web uygulamamızda http://localhost:3100/ özel yarat sayfası var mı?
eğer varsa tamamen kaldır" — followed by the owner's explicit scope choice of
**both clients + the capability records**, keeping the backend endpoint.

## Context

The customer-facing "build your own burger" surface existed on both clients and
was recorded as a delivered capability:

- `packages/contracts/src/customer-capability-registry.ts` — `burger-builder`,
  backend `GET /storefront/catalog/builder`, `...implementedBoth`.
- `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md` — `burger-builder`,
  web `AUTOMATICALLY_SUPPORTED / IMPLEMENTED`, mobile
  `AUTOMATICALLY_SUPPORTED / IMPLEMENTED`.
- `CUSTOMER_CAPABILITY_MATRIX.md` — `ingredient-removals`, noted
  **"PDP + builder"**.

Note on naming: the owner asked about a page called "Özel Yarat" at the site
root. The literal string `Özel Yarat` is **mobile-only** (the tab label). The web
page is titled **"Özel Burgerini Yarat"** and lives at `/builder`. The root route
`/` contains no such page and never did; the first search for it missed the web
surface because the phrase carries "Burgerini" in the middle. Both clients were
therefore removed, which is what the owner actually meant by "completely".

## Decision

Remove the burger builder from **both** customer clients and mark the capability
as retired in the records. **Keep the backend unchanged.**

### Removed — web (`apps/storefront-web`)

| File | Action |
| --- | --- |
| `src/app/(shop)/builder/page.tsx` | deleted (with its now-empty directory) |
| `src/components/storefront/builder-page.tsx` | deleted (209 lines) |
| `src/components/storefront/home-builder-banner.tsx` | deleted |
| `src/components/storefront/golden-home-page.tsx` | import + `{home.builderAvailable ? <HomeBuilderBanner /> : null}` removed |
| `src/components/storefront/home-combo.tsx` | `Komboyu Kişiselleştir` fallback target changed from `/builder` to `/menu` |
| `src/lib/storefront/discover.ts` | `BuilderProduct` type and `fetchBuilderProduct()` removed |
| `src/lib/storefront/brand-copy.ts` | `BUILDER_BANNER` copy removed |
| `src/lib/stitch-data-paths.ts` | `'ozel-burgerini-yarat': '/builder'` mapping removed |
| `src/lib/stitch-data-paths.test.ts` | the matching assertion removed |

### Removed — mobile (`apps/customer-mobile`)

| File | Action |
| --- | --- |
| `app/(tabs)/builder.tsx` | deleted (95 lines) |
| `app/(tabs)/_layout.tsx` | `<Tabs.Screen name="builder">` removed |
| `components/tab-bar.tsx` | `ITEMS` entry removed, **and with it the centre-tab branch** |
| `lib/catalog.ts` | `fetchBuilderProduct()` removed |

The mobile tab bar rendered `builder` as a visually raised centre button — a
mustard→flame gradient circle lifted by `marginTop: -20`. Once the route no
longer existed, `const center = route.name === 'builder'` could never be true.
That branch, its `LinearGradient` import and the `centerWrap` / `centerBtn`
styles were removed with it rather than left as unreachable code. **The mobile
bottom bar therefore changes from five items with a raised centre button to four
flat items.** This is a deliberate visual consequence of the removal, not an
incidental refactor.

### Records

`burger-builder` now uses the registry's existing **retired-capability**
convention — the same one `oauth-google-apple` uses for a feature removed from
customer surfaces:

```ts
{
  id: 'burger-builder',
  name: 'Burger builder',
  backend: 'GET /storefront/catalog/builder',
  ...notCustomer,   // NOT_APPLICABLE / NOT_RELEVANT on both clients
  notes: 'Removed from customer surfaces per product-owner request (Oct 2026): …',
}
```

The entry is **kept, not deleted**, so the removal stays auditable next to the
rest of the inventory. The matrix row now reads `NOT_APPLICABLE / NOT_RELEVANT`
on both clients.

`ingredient-removals` was corrected in the same pass: its backend cell read
`PDP builder removals` and its note read `PDP + builder.`, both of which became
false once the builder was gone. They now read `PDP ingredient removals` and
`PDP only; the builder surface was removed (ADR-020).`

## What was deliberately NOT removed

**The backend.** `GET /storefront/catalog/builder`, its service method and its
OpenAPI registration are untouched, and so is the `builderAvailable` flag in the
`/storefront/home` payload — which is why `builderAvailable: z.boolean()` also
stays in both clients' response schemas. That field mirrors an API contract; a
client schema that omits a field the API still sends is a schema that lies about
its own source.

This is a real, recorded inconsistency rather than an oversight: the API keeps
advertising a capability no client surfaces. It is accepted here because the owner
chose to keep the endpoint, and it makes re-enabling a client-only change.

## Consequences

- `ingredient-removals` is now delivered on the PDP only. Customers can still
  remove ingredients from a product; they can no longer remove them from a
  self-composed burger.
- Any inbound link to `/builder` becomes a 404. The only internal producers of
  that path were the home banner and the combo fallback, both handled above.
- Re-enabling requires restoring the clients only; no backend or contract work.

## Verification

Recorded in `project-reports/work-items/account-enterprise-redesign-round2.md`
(this work item), section "Burger builder removal": typecheck, lint, unit tests,
build, `check:customer-platform`, the 11-route account gate, and live checks that
`/builder` returns 404 while `/` renders without the banner.