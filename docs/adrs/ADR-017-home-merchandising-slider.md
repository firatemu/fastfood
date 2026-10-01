# ADR-017: Home merchandising slider

Status: Accepted  
Date: 2026-09-26  
Decision owners: Human owner (explicit storefront slider request on 2026-09-26)

## Context

The storefront home page currently presents one hero product. The owner wants
multiple featured products that can be selected and ordered from Admin while
keeping the existing product catalog management experience intact. The
homepage payload is shared by Storefront Web and Customer Mobile, so both
customer clients must render the configured collection.

## Decision

1. Keep product creation and editing in the existing catalog screen. Add a
   separate **Vitrin Slaytları** Admin page for selecting active products,
   ordering them, previewing the first slide, and saving the complete selection.
2. Reuse `ProductMerchandising.isHero` to mark selected products and add
   `heroDisplayOrder` to persist their order. The update endpoint replaces the
   selected set atomically and rejects duplicate or inactive product IDs.
3. Add `GET /admin/home-slides` and `PUT /admin/home-slides`. Protect reads
   with `catalog.products.read` and writes with `catalog.products.write`, in
   addition to the existing Products page authorization.
4. Add the ordered `heroSlides` collection to `GET /storefront/home`, ordered
   by `heroDisplayOrder`. Keep the existing `hero` field and derive a single
   fallback slide from the old hero selection when no products are configured,
   preserving compatibility with older clients and existing catalog display.
5. Storefront Web provides manual previous/next and slide selection controls.
   Customer Mobile provides native horizontal swipe and matching controls.
   Slides do not advance automatically.

## Alternatives considered

- Replace the existing hero field with a collection: rejected because the
  current field is consumed by existing clients.
- Store the complete slider configuration in a separate JSON/settings row:
  rejected because product merchandising already owns hero selection and
  related copy/image fields.
- Add controls to product create/edit: rejected because catalogue maintenance
  and homepage ordering are separate operator tasks.

## Consequences

- A Prisma migration adds `hero_display_order` and its composite lookup index.
- Existing `isHero` rows remain valid with the default order of zero; the
  current single-product presentation remains the fallback until an Admin
  configures multiple slides.
- The public response and both customer renderers change together, as recorded
  in `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`.
- No deployment or remote migration is authorized by this decision.

## Documents/code affected

- `apps/api/prisma/schema.prisma` and the local migration
- `apps/api/src/modules/catalog/` and `apps/api/src/modules/storefront-home/`
- `apps/admin-web/src/app/catalog/home-slides/`
- `apps/storefront-web/src/components/storefront/`
- `apps/customer-mobile/components/` and the home tab
- `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`
