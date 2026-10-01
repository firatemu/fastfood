# ADR-008: Independent BURGER HOME Mobile visual system

Status: Accepted
Date: 2026-09-20
Decision owners: Human owner (explicit BURGER HOME Mobile M0 rebuild prompt)

## Context

Document 32 / 38 directed native apps to consume `@fastfood/design-tokens` and `@fastfood/ui-native`. ADR-007 already excepted the **Web** Storefront from that pipeline after the BURGER HOME Stitch rebuild.

The human owner then authorized a clean **customer mobile** rebuild whose visual source of truth is the Mobile Stitch export `stitch_burger_e_ticaret_mobil/` (screens also published as `MOBILE` device screens inside Stitch project `2120742513648709986`). That system is dark cinematic, Anton + Plus Jakarta Sans, mustard/flame, and must not use Admin chrome or Web React DOM kits.

Courier mobile continues to use `@fastfood/ui-native`.

## Decision

1. `@fastfood/customer-mobile` customer UI has an independent visual foundation derived from Mobile Stitch (see `docs/mobile-rebuild/03_MOBILE_DESIGN_FOUNDATION.md`).
2. Customer-mobile routes must not import `@fastfood/ui-native`, `@fastfood/ui-web`, or `@fastfood/design-tokens`. Enforced by ESLint in `apps/customer-mobile`.
3. Web Storefront visual components and CSS are not shared to mobile. Functional APIs, Zod contracts, and domain rules are shared conceptually; extraction to a workspace package is optional and not required in M0.
4. `@fastfood/ui-native` remains for courier / operations work. It is not the BURGER HOME production mobile visual basis.
5. ADR-007 remains valid for Storefront web and does not constrain the BURGER HOME production mobile visual language.
6. Custom card PAN/CVV from Mobile Stitch checkout HTML is rejected; payment remains provider-hosted (iyzico) with in-app return via URL scheme / future Universal Links.

## Alternatives considered

1. Restyle `@fastfood/ui-native` to mustard/flame — rejected: would keep the Admin token pipeline and `#c81424` lock inside the customer app.
2. Wrap `apps/storefront-web` in a WebView — rejected by the rebuild prompt (real iOS + Android implementation).
3. Share Storefront React DOM components via `react-native-web` in reverse — rejected: DOM CSS/Tailwind is not the native visual system.

## Consequences

- Mobile rebuild implements its own RN tokens/components starting in M1.
- A future `@fastfood/ui-mobile-burger` package may be added; until then primitives stay app-local.
- iOS and Android must ship the same visual language; platform-only code is scoped and paired.
