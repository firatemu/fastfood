# FASTFOOD Product & System Specification

**Document version:** 2.1  
**Language:** English  
**Status:** Approved baseline before implementation  
**Project type:** Single-company, multi-branch fast-food commerce and delivery platform  
**Primary channels:** Storefront Web, Customer Mobile, Admin/Branch Web, Courier Mobile, Courier Web
**Architecture style:** TypeScript monorepo + modular monolith backend  
**Purpose:** Human + AI source of truth

---

## 1. Purpose of this documentation set

This documentation is the authoritative roadmap for the FASTFOOD project. It defines the product behavior, domain rules, technical architecture, security boundaries, implementation conventions, default values, pricing formulas, authorization model, database conventions, testing requirements, future deployment reference, current development-only execution policy, observability rules, and AI-agent operating protocol.

The objective is not merely to describe the desired product. The objective is to make implementation **deterministic**. An AI coding agent, developer, reviewer, or future team member must be able to read these files and reach the same architectural and business conclusions.

### 1.1 Mandatory interpretation rule

If a critical choice is explicitly defined in this documentation, it is **not a suggestion**. It is a project contract.

Examples:

- Prisma is the ORM. An agent must not replace it with TypeORM or Drizzle.
- pnpm + Turborepo is the monorepo toolchain. An agent must not introduce Nx.
- Monetary values use integer minor units. An agent must not introduce floating-point money calculations.
- PostgreSQL table and column names use `snake_case`. Application properties use `camelCase`.
- Authorization is enforced in the backend. Hiding a button in the frontend is never sufficient authorization.
- Payment success redirects are not proof of payment. Provider verification is mandatory.

Any requested change to a locked decision must first update the relevant specification and, where required, create an ADR as defined in `46-CHANGE_CONTROL_ADR_PROTOCOL.md`.

## 2. Product summary

FASTFOOD is a commerce and delivery operating platform for one restaurant brand with multiple physical branches.

The platform contains three operational environments and four primary application surfaces:

1. **Customer commerce environment**
   - Storefront Web
   - Customer Mobile App for iOS and Android
2. **Head Office / Branch operations environment**
   - Admin/Branch Web
3. **Courier operations environment**
   - Courier Mobile App for iOS and Android

All applications share one backend platform and one canonical business model.

FASTFOOD is **not SaaS**. There is no tenant model. Multi-branch support is required, but all branches belong to the same organization.

## 3. Core customer capabilities

Customers must be able to:

- browse categories and products,
- view multiple product images,
- inspect allergen and product information,
- choose product variants such as 100 g / 130 g,
- add paid modifiers such as extra cheese,
- remove removable ingredients such as tomato or onion,
- add products to a cart,
- edit cart customizations,
- use guest checkout,
- create an account,
- authenticate and manage profile information,
- manage multiple saved addresses,
- select the exact delivery point on a map,
- see whether an address is serviceable,
- use loyalty points before payment,
- complete online payment through iyzico,
- see order status and timeline,
- review order history,
- reorder from a previous order where still valid,
- receive order notifications,
- see courier progress when live tracking is enabled.

## 4. Core operations capabilities

Head Office administrators must be able to:

- manage products, categories, variants, modifiers, allergens, images, visibility, and availability,
- manage branches and operating hours,
- manage service areas and branch routing priorities,
- view all orders across all branches,
- manually reassign an order to another branch when permitted,
- manage users, roles, permissions, and branch scopes,
- manage couriers,
- manage loyalty settings,
- initiate authorized cancellations/refunds,
- inspect payment status,
- view operational and commercial reports,
- inspect audit history.

Branch users must be limited to resources within their permitted branch scope. They cannot modify centrally managed product prices or catalog content. A branch may be granted permission to mark a centrally managed product temporarily unavailable for its own branch.

## 5. Courier capabilities

Courier users must be able to:

- sign in to the courier app,
- see only authorized delivery jobs,
- see customer name, phone number, address, location, delivery note, and order details necessary for delivery,
- claim an eligible delivery using a secure QR token,
- receive a manually assigned delivery,
- mark pickup and delivery status,
- open the destination in Google Maps,
- publish live location only during eligible active delivery states and with required device permission,
- view their own completed-delivery history and performance summary.

## 6. Locked technology baseline

The implementation baseline is:

- **Language:** TypeScript
- **Runtime:** Node.js 24 LTS
- **Package manager:** pnpm 12
- **Monorepo orchestration:** Turborepo 2
- **Storefront Web:** Next.js 16 App Router
- **Admin Web:** Next.js 16 App Router
- **Customer Mobile:** React Native through Expo SDK 57
- **Courier Mobile:** React Native through Expo SDK 57
- **Courier Web:** Next.js 16 App Router; browser operations client for the same courier-scoped API
- **Backend:** NestJS 12 modular monolith
- **ORM:** Prisma ORM 7
- **Database:** PostgreSQL 18
- **Geospatial:** PostGIS 3.6 stable line
- **Cache / coordination:** Redis 8
- **Background jobs:** BullMQ 6 using Redis
- **Realtime:** Socket.IO through NestJS WebSocket gateways
- **API style:** REST + OpenAPI, versioned under `/api/v1`
- **Object storage interface:** S3-compatible API
- **Local object storage:** MinIO
- **Maps:** Google Maps Platform
- **Payments:** iyzico with test credentials outside production
- **Web E2E:** Playwright
- **Unit/integration test runner:** Vitest
- **Mobile E2E:** Maestro
- **CI:** GitHub Actions
- **Current execution mode:** local/development-only; remote deployment and production operations are prohibited until explicit human approval
- **Future deployment reference (inactive):** Docker containers on an Ubuntu 24.04 LTS VPS through Coolify

Exact version policy is defined in `33-TOOLCHAIN_VERSION_MATRIX.md`.

## 7. Architectural principles

### 7.1 Modular monolith first

The backend is a modular monolith. Domain boundaries must be clear enough that future extraction is possible, but services must not be split into microservices without measured need and an approved ADR.

Canonical backend domains include:

- Auth
- Identity
- Customer
- Catalog
- Branch
- Service Area
- Cart
- Pricing
- Checkout
- Payment
- Loyalty
- Promotion
- Order
- Kitchen
- Courier
- Delivery
- Notification
- Reporting
- Audit
- Media
- Configuration

### 7.2 One source of business truth

The backend is authoritative for:

- price calculation,
- discount calculation,
- loyalty redemption,
- payment state,
- order state,
- branch routing,
- authorization,
- serviceability,
- refund state,
- final totals.

Frontend-calculated totals are presentation estimates only until validated by the backend.

### 7.3 Centralized design system

No application may create arbitrary production UI styling outside the design system without an approved design-system change.

The project contains:

- shared design tokens,
- shared web component library,
- shared native component library,
- Storefront theme,
- Operations theme.

Changing one semantic token such as `action.save.background` must update every component that consumes that token.

### 7.4 Security by construction

Security is part of every feature's Definition of Done. Authentication, authorization, input validation, idempotency, auditability, secure secret handling, rate limiting, ownership checks, and safe failure handling must not be deferred to a later hardening phase.

## 8. Critical business decisions

The following decisions are locked for V1 unless explicitly changed through the change-control process:

- Guest checkout is supported.
- Customer identity supports phone-based OTP authentication; development uses a fake provider, production uses a real SMS provider.
- Delivery is the active V1 order type.
- Pickup is architecturally reserved but not required in the initial customer UX.
- Online card payment is processed through iyzico.
- An address cannot be saved without a map-selected latitude and longitude.
- Branch selection is calculated from service area rules and may be manually changed by authorized users.
- Loyalty redemption uses a reservation workflow; failed payment must release reserved points.
- Loyalty earning becomes final after the order reaches `DELIVERED`.
- Loyalty is ledger-based; balance is derived and reconciled from ledger entries.
- Kitchen/branch operational statuses are included in V1.
- QR courier claiming uses a signed/opaque token, never a predictable raw order ID.
- Competing courier claims are resolved atomically.
- Live courier location capability is included in the architecture and may be controlled by feature flag.
- A courier may hold multiple active deliveries up to the configured limit.
- Branch-specific minimum order, delivery fee, operating hours, and availability are supported.
- Central catalog pricing is the default. The schema may support branch price overrides, but they are disabled by default.
- Scheduled orders, ingredient-level ERP inventory, dine-in, cash-on-delivery, POS, fiscal invoice integration, and third-party delivery aggregators are outside mandatory V1 scope unless later approved.

## 9. Canonical end-to-end order flow

The target happy path is:

**Catalog discovery → product customization → cart → map-verified address → serviceability check → branch resolution → pricing validation → loyalty reservation → iyzico payment initialization → provider verification → order confirmation → branch acceptance → preparation → ready → courier assignment/QR claim → pickup → on-the-way → delivered → loyalty earning finalization → reporting/audit.**

Every failure point must have an explicit recovery path. See `27-EDGE_CASES_FAILURE_RECOVERY.md`.

## 10. Documentation precedence

If documents appear to conflict, use this precedence order:

1. `32-IMPLEMENTATION_LOCK_IN.md`
2. Explicit calculation/security/authorization contracts (`37`, `39`, `40`, `44`, `45`)
3. Domain-specific numbered specification (`06`-`20`)
4. Architecture and data documents (`03`, `04`, `16`, `17`, `31`, `35`)
5. General product documents (`00`, `01`, `24`)
6. Examples, diagrams, and explanatory notes

A newer documented ADR may intentionally override a previous rule. In that case the ADR and updated source documents together become authoritative.

## 11. Definition of project success

FASTFOOD is not considered ready merely because a customer can submit an order. Production readiness requires the complete customer-to-delivery path to be secure, observable, reversible where required, tested, documented, and operationally usable across branch and courier workflows.

The final acceptance gate is defined in `48-REPOSITORY_BOOTSTRAP_ACCEPTANCE_CHECKLIST.md` and the phase gates in `23-ROADMAP_PHASES_DEFINITION_OF_DONE.md`.
