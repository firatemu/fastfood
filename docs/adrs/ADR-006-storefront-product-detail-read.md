# ADR-006: Storefront product detail read surface

## Status

Accepted

## Context

Document 06 requires product detail with gallery, modifiers, allergens, and pricing. The storefront listed products via `GET /storefront/catalog/products` but had no per-product detail DTO for media and modifier groups.

## Decision

Add `GET /api/v1/storefront/catalog/products/:productIdOrSlug` returning:

- Core product fields (same as list)
- `media[]` (url, altText, displayOrder)
- `modifierGroups[]` with nested `modifiers[]` (id, name, priceDeltaMinor as string)
- `allergenIds[]` (codes resolved client-side via allergens list)

Slug or UUID accepted for `productIdOrSlug`.

## Consequences

- Storefront PDP can bind real configuration without admin APIs.
- Admin write surface unchanged.
- Future: variants and removal options can extend the same DTO.
