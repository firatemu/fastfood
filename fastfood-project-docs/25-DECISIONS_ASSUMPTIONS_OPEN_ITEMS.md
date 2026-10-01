# Decisions, Assumptions, and Open Business Items

## 1. Purpose

This file lists only items that are legitimately business/operations data or future scope. It must not be used to leave core implementation decisions ambiguous.

## 2. Locked decisions

- single company, multi-branch,
- modular monolith,
- TypeScript monorepo,
- Next.js web,
- Expo mobile,
- NestJS backend,
- Prisma 7,
- PostgreSQL/PostGIS,
- Redis/BullMQ,
- iyzico,
- Google Maps,
- guest checkout,
- map pin required for saved delivery address,
- loyalty reservation before payment and confirmation after delivered,
- QR courier claim,
- live courier tracking capability,
- centralized design system,
- Docker/Coolify deployment baseline.

## 3. Business values with deterministic system defaults

Values such as loyalty rate, minimum order, delivery fee, courier limits, and SLA thresholds are not technically open. They have canonical default/seed behavior in document 36.

Production operation may change values through authorized configuration where marked mutable.

## 4. Production business data that must be supplied before launch

- real branch names/codes,
- branch addresses/coordinates,
- operating hours,
- service-area polygons/neighborhood mapping,
- actual menu/catalog,
- actual prices,
- actual allergen data,
- actual product images,
- production loyalty commercial policy if different from baseline,
- production minimum-order/delivery-fee values,
- production SMS provider credentials/configuration,
- production iyzico credentials,
- production Google Maps credentials,
- production storage endpoint/credentials,
- legal/privacy page content,
- support/contact information.

## 5. Future decisions, not blockers for V1 architecture

- pickup launch,
- scheduled orders,
- cash-on-delivery,
- third-party delivery integration,
- POS integration,
- fiscal invoice provider,
- advanced campaign engine,
- dynamic branch-load balancing,
- ingredient inventory.

## 6. Rule for AI agents

An item listed as future scope must not be implemented merely because an agent believes it would be useful. Scope expansion requires explicit instruction and documentation update.
