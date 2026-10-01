# ADR-007: Independent BURGER HOME Storefront visual system

Status: Accepted
Date: 2026-09-19
Decision owners: Human owner (explicit Storefront rebuild prompt)

## Context

The human owner authorized a clean customer Storefront rebuild whose visual source of truth is the Stitch project **Burger E-Ticaret Platformu Tasarımı** (BURGER HOME). That system is dark cinematic, Anton + Plus Jakarta Sans, flame `#ff5722` / mustard `#feb300`, and must not use the Admin operations chrome.

Document 32 still locks shared primitives for Admin/Ops. This ADR scopes an **exception for the customer Storefront application only**.

## Decision

1. `@fastfood/storefront-web` customer UI has an independent visual foundation derived from Stitch (see `docs/storefront-rebuild/03_STOREFRONT_DESIGN_FOUNDATION.md`).
2. Storefront customer routes must not import `@fastfood/ui-web` or `@fastfood/design-tokens`. Enforced by ESLint in `apps/storefront-web`.
3. Admin and operations chrome, `packages/ui-web`, and `packages/design-tokens` remain as-is.
4. Custom card PAN/CVV from Stitch HTML is rejected; payment remains provider-hosted (iyzico).

## Alternatives considered

1. Keep Hybrid C and restyle tokens to Stitch — rejected: would couple Admin token pipeline and `#c81424` lock to a different brand system.
2. Pixel-reinterpret Stitch into the existing Smash/ui-web chrome — rejected by the rebuild prompt.

## Consequences

- Storefront rebuild implements its own tokens/components.
- A future package name for Storefront tokens may be added; until then they stay app-local.
- Document 38 Storefront primary `#c81424` no longer applies to the customer Storefront visual product. Admin/Ops colors are unchanged.
