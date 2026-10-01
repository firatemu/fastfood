# Architecture and Technology

## 1. Architecture overview

FASTFOOD uses a TypeScript monorepo containing deployable applications and shared packages. The backend is a NestJS modular monolith backed by PostgreSQL/PostGIS and Redis.

## 2. Deployable applications

- `apps/storefront-web` — customer-facing Next.js commerce site
- `apps/admin-web` — head-office and branch operations Next.js application
- `apps/customer-mobile` — Expo/React Native iOS + Android application
- `apps/courier-mobile` — Expo/React Native iOS + Android application
- `apps/api` — NestJS REST/WebSocket API
- `apps/worker` — BullMQ worker process using the same domain packages where appropriate

The API and worker may initially be built from the same backend source tree but must run as separate process entry points so queue workload cannot block request handling.

## 3. Shared packages

Canonical packages include:

- `packages/config`
- `packages/eslint-config`
- `packages/tsconfig`
- `packages/contracts`
- `packages/domain-types`
- `packages/validation`
- `packages/design-tokens`
- `packages/ui-web`
- `packages/ui-native`
- `packages/api-client`
- `packages/observability`
- `packages/test-utils`

Shared packages must not become a dumping ground. A package needs a clear responsibility and stable public exports.

## 4. Backend modular monolith

Backend modules own their domain behavior. Cross-module writes must occur through explicit application services/events rather than direct table manipulation from unrelated modules.

The canonical module internal structure is:

```text
module/
  application/
  domain/
  infrastructure/
  presentation/
```

Very small modules may omit an empty layer only when the remaining structure is still explicit and no architectural boundary is bypassed. Controllers must not contain domain logic and repository/database details must not leak into unrelated modules.

## 5. API architecture

- NestJS uses the **Fastify** HTTP adapter (`@nestjs/platform-fastify`). Express must not be introduced as a second server adapter.
- REST is the primary request/response API.
- OpenAPI is generated from backend contracts. Shared Zod contracts are canonical for reusable request/response validation; Nest uses one project-owned Zod validation adapter and must not duplicate the same validation rules with `class-validator`.
- All public application endpoints are versioned under `/api/v1`.
- Socket.IO is used for realtime order/courier events.
- Queue jobs are used for work that does not need to block an HTTP response.

## 6. Database architecture

PostgreSQL is the system of record. PostGIS stores and queries branch service areas and location data.

Redis is not the source of truth for orders, payments, loyalty balances, or permissions. Redis is used for:

- short-lived cache,
- rate-limit state,
- distributed coordination,
- queue backend,
- ephemeral realtime support,
- locks where appropriate.

Loss of Redis must not corrupt canonical business records.

## 7. External adapters

Every external provider must sit behind a project-owned adapter interface.

Examples:

- `PaymentGateway` → iyzico adapter
- `SmsProvider` → development fake / production provider
- `ObjectStorage` → S3-compatible adapter
- `MapsProvider` → Google Maps adapter
- `PushNotificationProvider` → Expo push adapter

Domain logic must depend on the project interface, not provider-specific response shapes.

## 8. Why Next.js and Expo are separate presentation apps

The storefront web channel is SEO- and performance-sensitive. It uses Next.js App Router to preserve web-native rendering, metadata, caching, image optimization, and storefront performance capabilities.

Mobile uses Expo/React Native. Business contracts, API clients, validation logic, domain types, and design tokens are shared. Pixel-level component implementation may differ between web and native where platform behavior requires it.

The goal is **one product architecture and maximum sensible code sharing**, not forcing every platform through a single rendering technology.

## 9. Forbidden architectural shortcuts

Without an ADR, agents must not introduce:

- microservices,
- GraphQL,
- a second ORM,
- a second database engine,
- a second queue system,
- direct frontend database access,
- provider-specific business logic inside controllers,
- duplicated design-token definitions,
- per-app copies of canonical API types.
