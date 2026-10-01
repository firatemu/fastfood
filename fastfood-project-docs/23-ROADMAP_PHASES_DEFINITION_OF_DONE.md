# Roadmap, Phases, and Definition of Done

## 1. Sequencing principle

The project must be built foundation-first. AI agents must not jump directly to feature screens while architecture, design-system, database, and security contracts remain unimplemented.

## Phase 0 — Documentation and implementation lock

Deliverables:

- this documentation set approved,
- open business decisions explicitly listed,
- toolchain/version matrix locked,
- design tokens locked,
- pricing formula locked,
- auth/authorization contract locked,
- database conventions locked.

**Gate:** no unresolved technical choice that would cause two agents to create incompatible foundations.

## Phase 1 — Repository foundation

Deliverables:

- pnpm workspace,
- Turborepo,
- application/package skeletons,
- shared TypeScript/ESLint/format config,
- CI skeleton,
- environment validation,
- Docker local dependencies,
- no business feature implementation beyond foundation smoke endpoints/screens.

## Phase 2 — Design system

Deliverables:

- design tokens,
- Storefront and Operations themes,
- `ui-web`,
- `ui-native`,
- core form/navigation/feedback components,
- accessibility baseline.

## Phase 3 — Backend core and identity

Deliverables:

- Prisma schema foundation,
- migrations,
- auth/session infrastructure,
- staff/customer identity,
- RBAC + resource scope,
- audit framework,
- error/response contract,
- OpenAPI foundation.

## Phase 4 — Catalog and branch foundation

Deliverables:

- catalog/category/product/variant/modifier/allergen/media,
- branch management,
- branch availability,
- service areas/PostGIS,
- routing engine,
- admin management screens.

## Phase 5 — Storefront and cart

Deliverables:

- public storefront,
- product discovery,
- product detail/customization,
- cart,
- customer account shell,
- address/map flow.

## Phase 6 — Pricing, checkout, loyalty, payment

Deliverables:

- pricing engine,
- server quotes,
- loyalty ledger/reservation,
- checkout flow,
- iyzico sandbox integration,
- idempotency,
- payment verification/reconciliation,
- failure recovery.

## Phase 7 — Order, branch, and kitchen operations

Deliverables:

- order state machine,
- automatic branch assignment,
- branch order dashboard,
- kitchen board,
- manual reassignment,
- realtime operational events,
- notifications foundation.

## Phase 8 — Courier system

Deliverables:

- courier auth,
- courier mobile UI,
- assignment,
- QR claim,
- pickup/delivery states,
- Google Maps navigation,
- live location capability,
- courier metrics.

## Phase 9 — Reporting, refunds, hardening

Deliverables:

- reports,
- refund flow,
- operational dashboards,
- security hardening,
- performance tuning,
- accessibility pass,
- development observability hardening,
- local backup/restore rehearsal where useful.

## Phase 10 — Integrated human validation and stabilization

Deliverables:

- all active V1 feature paths integrated in the development environment,
- automated acceptance/E2E suites green,
- customer, admin/branch, kitchen, and courier human test scenarios executed,
- identified blocking defects corrected and re-tested,
- accessibility and responsive behavior human-reviewed,
- sandbox iyzico end-to-end flow human-tested,
- map/address and courier-location flows human-tested on supported development devices,
- documentation synchronized with implemented behavior,
- product-owner acceptance record for the development milestone.

This phase does **not** authorize staging or production deployment.

## Future release/deployment readiness — inactive

Production readiness is intentionally outside the active roadmap. It may be activated only by an explicit future product-owner decision. Production credentials, real SMS/OTP, real iyzico credentials, Coolify deployment, public domains, TLS, store distribution, and production infrastructure must not be configured before that decision.

## Definition of Done for every phase

A phase is done only when:

- scope deliverables are implemented,
- tests pass,
- security rules are enforced,
- no critical TODO placeholders remain,
- documentation matches implementation,
- lint/type/build are green,
- migrations are reproducible,
- new configuration is documented,
- cross-app contracts remain consistent.
