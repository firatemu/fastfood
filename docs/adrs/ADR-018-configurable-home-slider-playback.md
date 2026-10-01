# ADR-018: Configurable home slider playback

Status: Accepted  
Date: 2026-09-26  
Decision owners: Human owner (explicit slider timing and looping request on 2026-09-26)

## Context

The home slider already supports selecting and ordering featured products, but
slide changes are manual. The owner requires a configurable transition
interval and an optional loop mode for the storefront home slider.

## Decision

1. Add `heroSliderSettings` to `GET /storefront/home` with
   `transitionDurationSeconds` and `loop`. Keep these settings common to
   Storefront Web and Customer Mobile.
2. Store the settings in the existing `BusinessSetting` JSON value under
   `storefront.home_slides`, avoiding a new table or schema migration. Admin
   saves create or update this setting and record the acting staff user.
3. Default to 5 seconds with looping enabled when the setting has not yet been
   saved. Admin can choose a whole-second interval from 2 through 30 seconds
   and can turn looping off.
4. When looping is off, automatic and manual forward navigation stop at the
   last slide; previous navigation stops at the first. Storefront Web pauses
   while hovered or keyboard-focused, and a reduced-motion preference disables
   automatic advancement.
5. Save slider settings with the selected product order through the existing
   permission-protected Admin home-slides endpoint.

## Alternatives considered

- Add columns or a new slider settings table: rejected because the existing
  typed `BusinessSetting` JSON store already provides mutable persisted
  application settings.
- Store timing independently in Web and Mobile: rejected because both clients
  consume the same server-driven home payload and should behave consistently.

## Consequences

- The Admin home-slides response and request now include playback settings.
- `GET /storefront/home` remains backward-compatible; old clients can ignore
  the optional settings object.
- No database migration is required.
- No deployment or remote data operation is authorized by this decision.

## Documents/code affected

- `apps/api/src/modules/catalog/catalog.service.ts`
- `apps/api/src/modules/storefront-home/storefront-home.service.ts`
- `apps/admin-web/src/app/catalog/home-slides/`
- `apps/storefront-web/src/components/storefront/home-hero.tsx`
- `apps/customer-mobile/components/home-hero-slider.tsx`
- `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`
