# FASTFOOD Documentation Directory

Welcome to the centralized documentation hub for the **FASTFOOD / BURGER HOME** commerce and fulfillment platform.

This directory contains the operational, architectural, and quality assurance documentation for the monorepo.

---

## 1. Quick Navigation

| Document                                                                 | Purpose                                                                                                                          |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **[CONSOLIDATED_PROJECT_HISTORY.md](./CONSOLIDATED_PROJECT_HISTORY.md)** | Full development roadmap history (Phases 0–10), UI transformations (Admin, Storefront, Mobile), and technical deliverables.      |
| **[ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)**             | Authoritative consolidated Architecture Decision Records (ADR-001 through ADR-023).                                              |
| **[QA_TEST_GUIDE.md](./QA_TEST_GUIDE.md)**                               | End-to-end human testing guide, local stack bring-up, seed credentials, test cards, and scenario checklists.                     |
| **[customer-platform/](./customer-platform/)**                           | Cross-platform policy and canonical **[Customer Capability Matrix](./customer-platform/CUSTOMER_CAPABILITY_MATRIX.md)**.         |
| **[release/](./release/)**                                               | Production release readiness and **[Google Play Console Guide](./release/PLAY_CONSOLE_CUSTOMER.md)** for Android closed testing. |
| **[openapi/](./openapi/)**                                               | Generated OpenAPI 3.0 specification (`openapi.json`) for the backend API.                                                        |

---

## 2. Core Technical Baseline

Before undertaking non-trivial changes, engineers and AI assistants must review the baseline system specifications in `../fastfood-project-docs/`:

- `../AGENTS.md` — AI pair-programming and engineering contract.
- `../PROJECT_STATUS.md` — Current execution state and human gate authorizations.
- `../fastfood-project-docs/00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md` — Comprehensive product specification.
- `../fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md` — Core architectural lock-in contracts.
- `../fastfood-project-docs/49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md` — Execution policies.

---

## 3. Platform Architecture Overview

```
                               ┌─────────────────────────┐
                               │       Client Apps       │
                               │  Storefront (Web :3100) │
                               │  Admin & Ops (Web :3101)│
                               │  Courier Portal  (:3102)│
                               │  QR In-Dining    (:3104)│
                               │  Customer Mobile (Expo) │
                               └────────────┬────────────┘
                                            │ REST / SSE
                                            ▼
                               ┌─────────────────────────┐
                               │   NestJS Fastify API    │
                               │      (Port 4000)        │
                               └──────┬────────────┬─────┘
                                      │            │
                         PostgreSQL 16│            │Redis 8
                          (Prisma 7)  │            │(Sessions & Cache)
                                      ▼            ▼
                               ┌─────────────┐┌─────────────┐
                               │  Postgres   ││    Redis    │
                               │  Database   ││  In-Memory  │
                               └─────────────┘└─────────────┘
```

---

## 4. Maintenance & Governance

- **Customer UI Parity:** Any customer capability change must evaluate both Storefront Web and Customer Mobile using `pnpm customer-ui:sync:plan` and be validated with `pnpm check:customer-platform`.
- **Architectural Changes:** Any substantial stack or protocol change must be recorded in `ARCHITECTURE_DECISIONS.md`.
- **API Spec Refresh:** After modifying NestJS endpoints or Zod schemas, refresh the OpenAPI contract via `pnpm --filter @fastfood/api openapi:export`.
