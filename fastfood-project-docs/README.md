# FASTFOOD Project Documentation — Authoritative Contracts

**Language:** English  
**Audience:** Product owner, human developers, AI coding agents, reviewers, and future maintainers  
**Status:** Authoritative contract set. Canonical development is technically complete; final human validation is pending.

## Start here

Read `00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md` first, then `32-IMPLEMENTATION_LOCK_IN.md`, then `49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md` before any implementation work.

**Current hard rule:** no staging/production/remote deployment and no production provider credentials. CI verification + local development + human testing only.


## Source-of-truth rule

These documents are project contracts. Critical architecture, pricing, security, authorization, naming, version, and state-machine decisions must not be silently changed in code. See `46-CHANGE_CONTROL_ADR_PROTOCOL.md`.

## Numbered documents

- [`00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md`](./00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md) — FASTFOOD Product & System Specification
- [`01-VISION_SCOPE_PRINCIPLES.md`](./01-VISION_SCOPE_PRINCIPLES.md) — Vision, Scope, and Product Principles
- [`02-ACTORS_ROLES_RBAC.md`](./02-ACTORS_ROLES_RBAC.md) — Actors, Roles, Permissions, and Scope Model
- [`03-ARCHITECTURE_TECHNOLOGY.md`](./03-ARCHITECTURE_TECHNOLOGY.md) — Architecture and Technology
- [`04-MONOREPO_SOURCE_STRUCTURE.md`](./04-MONOREPO_SOURCE_STRUCTURE.md) — Monorepo and Source Structure
- [`05-DESIGN_SYSTEM.md`](./05-DESIGN_SYSTEM.md) — Design System (tokens and shared themes)
- [`06-STOREFRONT_CUSTOMER_EXPERIENCE.md`](./06-STOREFRONT_CUSTOMER_EXPERIENCE.md) — Storefront and Customer Experience
- [`07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md`](./07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md) — Authentication, Account, Address, and Geolocation
- [`08-CATALOG_PRODUCT_CUSTOMIZATION.md`](./08-CATALOG_PRODUCT_CUSTOMIZATION.md) — Catalog, Product, Variant, Modifier, and Allergen Model
- [`09-CART_CHECKOUT_PRICING.md`](./09-CART_CHECKOUT_PRICING.md) — Cart, Checkout, and Pricing Overview
- [`10-PAYMENT_IYZICO_REFUND.md`](./10-PAYMENT_IYZICO_REFUND.md) — iyzico Payment, Verification, Cancellation, and Refund
- [`11-LOYALTY_POINTS_PROMOTIONS.md`](./11-LOYALTY_POINTS_PROMOTIONS.md) — Loyalty Points and Promotions
- [`12-ORDER_LIFECYCLE_STATE_MACHINE.md`](./12-ORDER_LIFECYCLE_STATE_MACHINE.md) — Order Lifecycle and State Machine
- [`13-BRANCH_SERVICE_AREA_ROUTING.md`](./13-BRANCH_SERVICE_AREA_ROUTING.md) — Branch, Service Area, and Routing Rules
- [`14-ADMIN_BRANCH_KITCHEN_OPERATIONS.md`](./14-ADMIN_BRANCH_KITCHEN_OPERATIONS.md) — Admin, Branch, and Kitchen Operations
- [`15-COURIER_DELIVERY_TRACKING_QR.md`](./15-COURIER_DELIVERY_TRACKING_QR.md) — Courier, Delivery Tracking, and QR Claim
- [`16-DATA_MODEL_DATABASE.md`](./16-DATA_MODEL_DATABASE.md) — Data Model and Database Principles
- [`17-API_EVENTS_REALTIME.md`](./17-API_EVENTS_REALTIME.md) — API, Domain Events, Queues, and Realtime
- [`18-SECURITY_PRIVACY_AUDIT.md`](./18-SECURITY_PRIVACY_AUDIT.md) — Security, Privacy, and Audit
- [`19-REPORTING_ANALYTICS.md`](./19-REPORTING_ANALYTICS.md) — Reporting and Analytics
- [`20-NOTIFICATIONS_INTEGRATIONS.md`](./20-NOTIFICATIONS_INTEGRATIONS.md) — Notifications and External Integrations
- [`21-TESTING_QA_ACCEPTANCE.md`](./21-TESTING_QA_ACCEPTANCE.md) — Testing, QA, and Acceptance Strategy
- [`22-DEVOPS_ENVIRONMENTS_CICD_OBSERVABILITY.md`](./22-DEVOPS_ENVIRONMENTS_CICD_OBSERVABILITY.md) — DevOps, Environments, CI/CD, and Observability
- [`23-ROADMAP_PHASES_DEFINITION_OF_DONE.md`](./23-ROADMAP_PHASES_DEFINITION_OF_DONE.md) — Roadmap, Phases, and Definition of Done
- [`24-NONFUNCTIONAL_REQUIREMENTS.md`](./24-NONFUNCTIONAL_REQUIREMENTS.md) — Non-Functional Requirements
- [`25-DECISIONS_ASSUMPTIONS_OPEN_ITEMS.md`](./25-DECISIONS_ASSUMPTIONS_OPEN_ITEMS.md) — Decisions, Assumptions, and Open Business Items
- [`26-FUNCTIONAL_REQUIREMENTS_MATRIX.md`](./26-FUNCTIONAL_REQUIREMENTS_MATRIX.md) — Functional Requirements Matrix
- [`27-EDGE_CASES_FAILURE_RECOVERY.md`](./27-EDGE_CASES_FAILURE_RECOVERY.md) — Edge Cases, Failure Modes, and Recovery
- [`28-UX_SITEMAP_SCREEN_INVENTORY.md`](./28-UX_SITEMAP_SCREEN_INVENTORY.md) — UX Sitemap and Screen Inventory
- [`29-API_ENDPOINT_CATALOG.md`](./29-API_ENDPOINT_CATALOG.md) — API Endpoint Catalog
- [`30-SEQUENCE_AND_STATE_DIAGRAMS.md`](./30-SEQUENCE_AND_STATE_DIAGRAMS.md) — Sequence and State Diagrams
- [`31-DATABASE_ENTITY_CATALOG.md`](./31-DATABASE_ENTITY_CATALOG.md) — Database Entity Catalog
- [`32-IMPLEMENTATION_LOCK_IN.md`](./32-IMPLEMENTATION_LOCK_IN.md) — Implementation Lock-In Contract
- [`33-TOOLCHAIN_VERSION_MATRIX.md`](./33-TOOLCHAIN_VERSION_MATRIX.md) — Toolchain Version Matrix
- [`34-CODEBASE_CONVENTIONS.md`](./34-CODEBASE_CONVENTIONS.md) — Codebase Conventions
- [`35-DATABASE_PRISMA_CONVENTIONS.md`](./35-DATABASE_PRISMA_CONVENTIONS.md) — Database and Prisma Conventions
- [`36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md`](./36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md) — System Defaults and Business Configuration
- [`37-PRICING_CALCULATION_CONTRACT.md`](./37-PRICING_CALCULATION_CONTRACT.md) — Pricing Calculation Contract
- [`38-DESIGN_FOUNDATION_TOKENS.md`](./38-DESIGN_FOUNDATION_TOKENS.md) — Design Foundation Tokens
- [`39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md`](./39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md) — Authorization Implementation Contract
- [`40-API_RESPONSE_ERROR_CONTRACT.md`](./40-API_RESPONSE_ERROR_CONTRACT.md) — API Response and Error Contract
- [`41-TESTING_TOOLCHAIN_CONTRACT.md`](./41-TESTING_TOOLCHAIN_CONTRACT.md) — Testing Toolchain Contract
- [`42-DEPLOYMENT_RUNTIME_CONTRACT.md`](./42-DEPLOYMENT_RUNTIME_CONTRACT.md) — Deployment and Runtime Contract
- [`43-AI_AGENT_DEVELOPMENT_PROTOCOL.md`](./43-AI_AGENT_DEVELOPMENT_PROTOCOL.md) — AI Agent Development Protocol
- [`44-SECURITY_IMPLEMENTATION_BASELINE.md`](./44-SECURITY_IMPLEMENTATION_BASELINE.md) — Security Implementation Baseline
- [`45-OBSERVABILITY_LOGGING_CONTRACT.md`](./45-OBSERVABILITY_LOGGING_CONTRACT.md) — Observability and Logging Contract
- [`46-CHANGE_CONTROL_ADR_PROTOCOL.md`](./46-CHANGE_CONTROL_ADR_PROTOCOL.md) — Change Control and ADR Protocol
- [`47-GLOSSARY_CANONICAL_TERMS.md`](./47-GLOSSARY_CANONICAL_TERMS.md) — Glossary and Canonical Terms
- [`48-REPOSITORY_BOOTSTRAP_ACCEPTANCE_CHECKLIST.md`](./48-REPOSITORY_BOOTSTRAP_ACCEPTANCE_CHECKLIST.md) — Repository Bootstrap Acceptance Checklist
- [`49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md`](./49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md) — Active Development-Only / Human-Validation Execution Policy
- [`50-AUTONOMOUS_DEVELOPMENT_CONTROLLER.md`](./50-AUTONOMOUS_DEVELOPMENT_CONTROLLER.md) — Autonomous Development Controller Contract

## Canonical AI reading order

For every coding task: 00 → 32 → 49 → relevant domain document(s) → relevant implementation contract(s) → existing code.

Do not read the whole numbered set by default. Use this index to select only
the task-relevant domain and implementation contracts. Current design/QA
routing lives in `../docs/README.md`.

For checkout/payment: 09 → 10 → 11 → 12 → 32 → 36 → 37 → 40 → 44.

For branch/courier: 13 → 14 → 15 → 12 → 39 → 40 → 44.

## Important

This documentation intentionally contains deterministic development defaults. Real production business data (branches, menu, actual commercial fees, credentials, legal text) must be supplied before any future launch; agents must not invent production facts. Production/release execution is currently prohibited by document 49.
