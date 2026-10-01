# Implementation Lock-In Contract

## 1. Purpose

This document eliminates implementation ambiguity for human and AI developers. Decisions here are mandatory until intentionally changed through the ADR process.

## 2. Locked stack

| Concern | Locked choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js 24 LTS |
| Package manager | pnpm 12 |
| Monorepo | pnpm workspaces + Turborepo 2 |
| Web | Next.js 16 App Router |
| Mobile | Expo SDK 57 / React Native 0.86 |
| Backend | NestJS 12 modular monolith + Fastify adapter |
| ORM | Prisma ORM 7 |
| Database | PostgreSQL 18 |
| Geospatial | PostGIS 3.6 stable |
| Cache/queue infra | Redis 8 |
| Queue | BullMQ 6 |
| Realtime | Socket.IO |
| API | REST + OpenAPI |
| Validation contracts | Zod is canonical; Nest uses one project-owned Zod validation pipe/adapter; no duplicate class-validator schema |
| Server state clients | TanStack Query |
| Lightweight client state | Zustand where local/global client state is actually needed |
| Web forms | React Hook Form + shared validation schemas |
| Web styling | Tailwind CSS + CSS variables generated from design tokens |
| Accessible web primitives | Radix primitives may be used inside `ui-web`; feature code consumes project components |
| Native styling | React Native StyleSheet/token helpers from `design-tokens`; no second independent token system |
| Icons | Lucide web/native families through project wrappers |
| Unit/integration tests | Vitest |
| Lint / formatting | ESLint 9 + Prettier 3 |
| Backend structured logging | Pino through project Nest integration |
| Web E2E | Playwright |
| Mobile E2E | Maestro |
| CI | GitHub Actions |
| Future deployment target (inactive) | Docker + Coolify on Ubuntu 24.04 LTS VPS; **no deployment is permitted in the current development-only phase** |
| Object storage contract | S3-compatible, local MinIO |
| Maps | Google Maps Platform |
| Payment | iyzico |

## 2A. Locked current execution mode

Until explicitly changed by the product owner through the documented change-control process:

- execution is local/development/test only,
- GitHub Actions is verification-only,
- remote staging/production deployment is prohibited,
- Coolify setup/deployment is prohibited,
- production credentials/providers are prohibited,
- mobile store/TestFlight/remote release is prohibited,
- human testing is a required acceptance gate.

Document 49 governs the detailed current execution policy. Future deployment architecture remains a design reference, not an active task.

## 3. Locked backend patterns

- Modular monolith, not microservices.
- Controllers are thin.
- Domain/application logic does not live in controllers.
- Prisma access is isolated behind module repositories/infrastructure services where domain complexity justifies it.
- Cross-module writes use application services/events, not arbitrary imports into another module's repository.
- Critical DB + event consistency uses transactional outbox or an explicitly equivalent durable pattern.
- Provider calls are behind adapters.
- Queue handlers are idempotent.

## 4. Locked database patterns

- Table/column names: `snake_case`.
- Prisma model names: `PascalCase`.
- Prisma/application properties: `camelCase`.
- Primary IDs: UUIDv7.
- Human business references are separate fields.
- Money persistence: PostgreSQL `BIGINT` / Prisma `BigInt`, never float/decimal for canonical totals.
- Money API representation: base-10 integer **string** in minor units, never JSON floating point.
- API timestamps: UTC ISO 8601.
- Business timezone: `Europe/Istanbul`.

## 5. Locked authentication patterns

- Customer: phone OTP/passwordless.
- Development: fake OTP provider only outside production.
- Staff: normalized login identifier + Argon2id password. HQ/admin/branch baseline identifier is email; courier baseline identifier is phone. The API accepts one normalized `identifier` field and persists an explicit identifier type.
- Privileged staff in production: RFC 6238 TOTP MFA required; SMS is not the privileged-staff MFA factor.
- Access token: RS256 JWT, 15-minute TTL, minimal claims, issuer/audience validated.
- Refresh credential: opaque 256-bit random token, only a SHA-256 token hash is stored server-side, rotated on use.
- Web access token: memory only; web refresh credential: Secure + HttpOnly + SameSite=Lax cookie scoped to the refresh/session endpoint family.
- Mobile access token: memory only; mobile refresh credential: Expo SecureStore.
- Browser business mutations use `Authorization: Bearer <access-token>`; refresh endpoints enforce strict allowed-origin checks.

## 6. Locked authorization pattern

Protected backend execution conceptually follows:

```text
Authentication
  -> Account/Session status
  -> Permission check
  -> Resource scope/ownership policy
  -> Domain transition policy
```

Concrete decorators/guards are defined in document 39.

## 7. Locked UI rule

Feature code cannot create a new foundational component because it is faster. If the design system lacks a required primitive, extend `ui-web` or `ui-native`, then consume it.

## 8. Locked financial rule

Document 37 is the only pricing formula authority. An agent must never infer its own ordering for discount, fee, loyalty, rounding, or minimum-order checks.

## 9. Locked API rule

Document 40 defines response/error shape. Do not return ad-hoc `{success: true}` in one module and raw Prisma objects in another.

## 10. Dependency introduction rule

A new runtime dependency is allowed only when:

- an existing locked tool does not solve the need reasonably,
- dependency is actively maintained and license-compatible,
- it does not duplicate an existing core responsibility,
- the reason is documented in the change/PR description,
- architecture-impacting additions receive an ADR.

## 11. AI rule

When an AI agent encounters a missing implementation detail, it must:

1. search these documents and existing code,
2. follow established patterns,
3. choose the smallest reversible local detail if still necessary,
4. never change a locked architectural/business decision silently,
5. surface a documentation gap instead of creating a conflicting subsystem.
