# ADR-009: Independent BURGER HOME Admin / Operations visual system (Stitch)

Status: Accepted
Date: 2026-09-21
Decision owners: Human owner (explicit A0 Admin rebuild prompt)

## Context

Canonical Phases 0–10 are technically complete. Operations Design System remains a light, blue (`#2563eb`) `@fastfood/ui-web` system. The human owner authorized an Admin visual rebuild whose source of truth is the Stitch package `stitch_burger_admin/` (golden screens + `kitchen_fleet_command/DESIGN.md`): dark industrial control-plane, Anton / Inter / JetBrains Mono, amber `#FEB300`, flame `#FF5722`.

ADR-007 and ADR-008 already split Storefront and Mobile off `@fastfood/ui-web`. Admin was still the production consumer of Operations `AppShell`. Layering Stitch on that chrome would freeze the old layout. A0 therefore retires production Admin visual chrome first.

Document 32 still locks shared primitives for Admin/Ops **infrastructure**. This ADR scopes the **visual** exception: production Admin appearance follows Stitch, implemented in later authorized phases.

## Decision

1. Production Admin visual authority order is: Stitch `screen.png` → `code.html` → `DESIGN.md` → Stitch MCP → compatible shared primitives → old Admin UI → AI interpretation.
2. A0 replaces production `AppShell` chrome with a labeled neutral rebuild scaffold. It must not claim Stitch completion.
3. `@fastfood/ui-web` and `@fastfood/design-tokens` are **not** deleted. Functional form/table primitives keep them.
4. A1+ may extend the shared operations foundation (preferred) so Stitch can be implemented faithfully. Do not force Stitch to look like the old light/blue Admin. Do not create an uncontrolled parallel app-local design system.
5. Do not import Storefront/Mobile visual language into Admin.
6. Backend/domain/auth/permission/FSM remain authoritative. Unsupported Stitch buttons are classified, not faked.
7. `ADMIN_FULL_UI_ROLLOUT` / A1 implementation stay separately authorized. This ADR does not start A1.

## Alternatives considered

1. Restyle `data-theme="operations"` tokens in place — rejected for A0: would mix old IA chrome with partial Stitch color and break shared primitive coverage without a migration.
2. Delete `@fastfood/ui-web` — rejected: admin primitives and other packages depend on it.
3. Implement golden Stitch screens immediately on top of `AppShell` — rejected by the A0 prompt.

## Consequences

- Production Admin looks like a rebuild scaffold until A1.
- Customer apps are unaffected.

## Migration plan

A0: scaffold (this change).
A1: tokens + shell + four golden routes.
A2–A6: remaining Admin IA in Stitch language.

## Documents/code affected

- `docs/admin-rebuild/*`
- `apps/admin-web` shell/page chrome
- later: `packages/design-tokens` / `packages/ui-web` (A1+, not A0)
