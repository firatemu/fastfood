# FASTFOOD — Consolidated Architecture Decision Records (ADRs)

> **Status:** Authoritative registry of all accepted architectural decisions for FASTFOOD / BURGER HOME.  
> **Last Updated:** 2026-10-24  
> **Consolidation Note:** Consolidates historical individual ADR records (ADR-001 through ADR-023) into a single, unified reference.

---

## 1. ADR Index and Status Summary

| ADR         | Title                                           | Status       | Date       | Scope              | Key Decision                                                                                                      |
| ----------- | ----------------------------------------------- | ------------ | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **ADR-001** | Redis 8 Baseline                                | `ACCEPTED`   | 2026-09-16 | Backend / Infra    | Baseline Redis Open Source 8.10 with Valkey compatibility. Native redis client only.                              |
| **ADR-002** | NestJS Swagger 12.x Baseline                    | `ACCEPTED`   | 2026-09-21 | API / Tooling      | `@nestjs/swagger` 12.x paired with `@fastify/swagger` 9.x. Manual schema overrides forbidden.                     |
| **ADR-003** | Canonical Phase Numbering Reconciliation        | `ACCEPTED`   | 2026-09-21 | Governance         | Reconciles roadmap: Phase 0 (Spec/Lock), Phase 1 (Foundation), Phases 2–10 (Features/Hardening).                  |
| **ADR-004** | Phase 3 Auth / Crypto Baseline                  | `ACCEPTED`   | 2026-09-25 | Security / API     | Native Node `crypto` + WebCrypto. Argon2id for passwords, RS256 JWT for auth tokens.                              |
| **ADR-006** | Storefront Product Detail Read Surface          | `ACCEPTED`   | 2026-09-19 | Storefront         | Public catalog reads via canonical REST endpoints. Modifiers and stock resolved server-side.                      |
| **ADR-007** | Storefront Independent Stitch Visual System     | `ACCEPTED`   | 2026-09-21 | Storefront         | "BURGER HOME" warm editorial aesthetic (Plus Jakarta Sans, mustard accents, dark chocolate canvas).               |
| **ADR-008** | Mobile Independent Stitch Visual System         | `ACCEPTED`   | 2026-09-21 | Customer Mobile    | Platform-native React Native implementation matching BURGER HOME visual identity without shared DOM/CSS.          |
| **ADR-009** | Admin Independent Stitch Visual System          | `SUPERSEDED` | 2026-10-06 | Admin Web          | Superseded by ADR-019 (Navy operations theme).                                                                    |
| **ADR-010** | Customer Registration Phone OTP Suspension      | `ACTIVE`     | 2026-10-22 | Auth / Customer    | OTP temporarily suspended during UI maturation; registration uses Phone + Password + KVKK consent.                |
| **ADR-011** | OrderFlowRail Drops BRANCH_ASSIGNED             | `ACCEPTED`   | 2026-09-23 | Customer UI        | Customer-facing order progress hides internal branch assignment step, focusing on customer milestones.            |
| **ADR-012** | Drop BRANCH_ACCEPTED from Order Flow            | `ACCEPTED`   | 2026-10-22 | FSM / Order Engine | Orders transition directly from `PAID` to `PREPARING` upon kitchen action. Redundant accept gate dropped.         |
| **ADR-013** | Admin Orders Data Grid                          | `ACCEPTED`   | 2026-10-22 | Admin Web          | High-density data grid with real-time SSE updates, inline FSM action triggers, and multi-filter bar.              |
| **ADR-014** | Admin Staff Lifecycle & RS256 Authorization     | `ACCEPTED`   | 2026-09-26 | Security / RBAC    | RS256 staff token verification with request-time status checks in Redis/DB to instantly invalidate revoked staff. |
| **ADR-015** | Branch Administrators & Page Permissions        | `ACCEPTED`   | 2026-09-26 | RBAC / Admin       | Explicit branch managers assigned to branches. Super admin bypass allowed for emergency ops.                      |
| **ADR-016** | Admin-Created Staff & Managed Passwords         | `ACCEPTED`   | 2026-09-26 | Admin / Auth       | Staff accounts created by Super Admins with secure temporary passwords and mandatory initial rotation.            |
| **ADR-017** | Home Merchandising Slider                       | `ACCEPTED`   | 2026-09-26 | Storefront         | Server-driven hero promo carousel with active slides managed from Admin Catalog.                                  |
| **ADR-018** | Configurable Home Slider Playback               | `ACCEPTED`   | 2026-09-26 | Storefront         | Configurable autoplay intervals with hover/touch pause and keyboard navigation.                                   |
| **ADR-019** | Admin Visual System — "Navy" Design Set         | `ACCEPTED`   | 2026-10-07 | Admin Web          | Deep Navy theme (`surface #0b1326`, orange action `#f97316`, high-contrast typography, zero gradients).           |
| **ADR-020** | Burger Builder Removal from Customer UI         | `ACCEPTED`   | 2026-10-22 | Customer UI        | Custom burger builder removed; replaced with rich ingredient modifiers on core menu items.                        |
| **ADR-021** | VPS Coolify Sandbox Deployment                  | `ACTIVE`     | 2026-10-11 | Infra / Demo       | Authorized single VPS environment on Coolify (`*.azem.cloud`) using sandbox/mock third-party providers.           |
| **ADR-022** | Real iyzico Sandbox Checkout Form               | `ACCEPTED`   | 2026-10-12 | Payments           | Integrated iyzico Checkout Form (3DS) in sandbox mode. Card PAN/CVV never touches FASTFOOD backend.               |
| **ADR-023** | Google Play Testing & Customer Account Deletion | `ACTIVE`     | 2026-10-12 | Mobile / Play      | Authorized Google Play closed testing track release + compliant self-service account deletion endpoint.           |

---

## 2. Core Architectural Decisions in Detail

### ADR-001: Canonical Redis 8 Baseline

- **Context:** Monorepo caching, session invalidation, and rate limiting require high-throughput in-memory storage.
- **Decision:** Redis Open Source 8.10 is the canonical baseline. The implementation must remain compatible with open-source Valkey. Direct Redis commands must use the native driver without vendor-locked extensions.

### ADR-002: NestJS Swagger 12.x Baseline

- **Context:** OpenAPI contracts must be generated cleanly from NestJS controllers running Fastify.
- **Decision:** Locked to `@nestjs/swagger` 12.x and `@fastify/swagger` 9.x. All response types and request bodies must be driven by canonical Zod contracts and DTO classes without manual swagger schema monkeypatching.

### ADR-003: Canonical Phase Numbering Reconciliation

- **Context:** Historical phase naming drifted between early planning documents and implementation reality.
- **Decision:** Phase 0 = Product/System Architecture & Implementation Lock; Phase 1 = Monorepo Foundation; Phases 2–10 = Canonical business domains (Auth, Catalog, Cart/Checkout, Orders, Kitchen, Courier, Loyalty, Operations, Final Hardening).

### ADR-004: Phase 3 Auth / Crypto Baseline

- **Context:** Password hashing, token signing, and encryption require robust, standard cryptography without untrusted third-party packages.
- **Decision:** Argon2id is locked for password hashing. JWT access tokens use RS256 asymmetric keys (private key signs on API, public key verifies). WebCrypto and Node.js native `crypto` modules are used exclusively.

### ADR-006: Storefront Product Detail Read Surface

- **Context:** Product detail pages (PDP) need structured modifier trees, variant prices, and allergen disclosures.
- **Decision:** Product resolution supports both UUIDv7 and URL slugs. Price calculations for modifier choices are validated strictly server-side.

### ADR-007: Storefront Independent "BURGER HOME" Visual System

- **Context:** Customer web storefront required an authentic, editorial, warm culinary brand identity.
- **Decision:** The "BURGER HOME" visual language uses a warm palette (mustard accents `#feb300`, deep background `#1b120c`, cream surface `#fffcf9`, Plus Jakarta Sans typography). Components adhere to strict token hierarchies.

### ADR-008: Mobile Independent Visual System

- **Context:** Customer mobile app (React Native / Expo) needs the same BURGER HOME brand presence without attempting to share web CSS or HTML DOM primitives.
- **Decision:** Native React Native StyleSheet implementation using shared color/token values. Web DOM/CSS sharing is strictly prohibited.

### ADR-010: Customer Registration Phone OTP Suspension

- **Context:** SMS delivery in local development and sandbox testing causes friction during rapid UI maturation.
- **Decision:** SMS OTP verification during customer registration is suspended. Customers register with Phone, Password, and KVKK consent. OTP endpoints return `OTP_SUSPENDED` until production SMS gateway activation.

### ADR-011 & ADR-012: Streamlined Order Lifecycle State Machine

- **Context:** Order flow contained redundant internal states (`BRANCH_ASSIGNED`, `BRANCH_ACCEPTED`) that confused customers and delayed kitchen dispatch.
- **Decision:**
  - Customer order timeline skips `BRANCH_ASSIGNED` and shows customer-relevant progress.
  - State machine drops `BRANCH_ACCEPTED`. Once paid (`PAID`), orders transition directly to `PREPARING` as soon as the kitchen board acts on them.

### ADR-013: Admin Orders Data Grid

- **Context:** Operations staff require real-time visibility into incoming orders with rapid state transition capability.
- **Decision:** Built high-density tabular grid with Server-Sent Events (SSE) live polling, status chips, multi-select branch filtering, and inline one-click status advancement buttons.

### ADR-014, ADR-015 & ADR-016: Enterprise Staff & RBAC Lifecycle

- **Context:** Branch security requires granular role permissions, isolated branch scopes, and immediate credential revocation.
- **Decision:**
  - Staff tokens are checked against database/cache status on every privileged request.
  - Branch managers are explicitly assigned to branches. Super Admins retain global emergency bypass capabilities.
  - Staff accounts are provisioned by administrators with secure temporary credentials.

### ADR-017 & ADR-018: Storefront Merchandising Slider

- **Context:** Storefront home required dynamic promotional banners manageable without code deployments.
- **Decision:** Server-driven slide carousel populated via `GET /storefront/catalog/home-slides`. Features configurable autoplay duration, hover-to-pause, and responsive picture tags.

### ADR-019: Admin Visual System — "Navy" Operations Theme

- **Context:** Operational dashboard needed a modern, dark, fatigue-reducing interface for kitchen, courier, and manager users.
- **Decision:** Superseded ADR-009. Locked Admin Web to deep Navy palette (`#0b1326` background, `#131b2e` low surface, `#f97316` action orange, JetBrains Mono for monetary/order codes). Fake controls and decorative gradients are forbidden.

### ADR-020: Burger Builder Removal from Customer Surfaces

- **Context:** Custom sandwich builder added disproportionate complexity to checkout quotes and kitchen workflows.
- **Decision:** Removed standalone `/builder` route. Rich customization is handled directly via product modifiers on curated menu items.

### ADR-021: VPS Coolify Sandbox Deployment

- **Context:** Need for a real-world testing environment accessible on mobile devices and preview browsers.
- **Decision:** Authorized deployment of monorepo containers to Coolify VPS on `*.azem.cloud` domains with fake/sandbox providers only. Production credentials remain strictly prohibited.

### ADR-022: Real iyzico Sandbox Checkout Form Integration

- **Context:** Secure credit card payments requiring 3D Secure verification.
- **Decision:** Standardized on iyzico Checkout Form (3DS). The customer is directed to iyzico's hosted iframe/gateway; card PAN and CVC never touch or pass through FASTFOOD servers.

### ADR-023: Google Play Closed Testing & Account Deletion Compliance

- **Context:** Google Play Store guidelines require functional account deletion and closed track testing before public release.
- **Decision:** Customer mobile app permitted for Google Play Internal / Closed Testing tracks (signed AAB). Self-service account deletion implemented in app (`Hesabım > Güvenlik > Hesabı Sil`) and web (`/hesap-silme`).

---

## 3. Policy for New Architecture Decisions

1. Any architectural deviation or stack update must be proposed as a new numbered ADR.
2. An ADR must document: Title, Status, Context, Decision, Consequences, and Affected Workspaces.
3. Obsolete decisions are marked `SUPERSEDED` with a direct link to the superseding ADR.
