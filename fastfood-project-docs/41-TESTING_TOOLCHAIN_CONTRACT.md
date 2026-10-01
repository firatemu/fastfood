# Testing Toolchain Contract

## 1. Locked tools

- Unit/integration: **Vitest 5**
- React component behavior: **React Testing Library** where appropriate
- Web browser E2E: **Playwright 1.63** baseline
- Mobile E2E: **Maestro**
- API integration: Nest test application + HTTP client such as Supertest-compatible approach, selected once and reused
- CI: **GitHub Actions**

Do not introduce Jest beside Vitest without an approved migration reason.

## 2. Test locations

Tests should live near the owning package/module for unit tests and in dedicated E2E areas for cross-application workflows.

Suggested:

```text
apps/storefront-web/e2e/
apps/admin-web/e2e/
apps/customer-mobile/.maestro/
apps/courier-mobile/.maestro/
apps/api/test/
```

## 3. Coverage policy

Coverage percentage is a signal, not the acceptance criterion. Critical domain modules need meaningful branch coverage and explicit edge-case tests.

Mandatory test-heavy modules:

- Pricing
- Loyalty
- Payment
- Branch routing
- Authorization policies
- Order state machine
- Courier QR claim
- Refund allocation

## 4. Database tests

Use isolated test databases/schema lifecycle. Spatial queries and transaction races should be tested against real PostgreSQL/PostGIS, ideally through ephemeral containers in CI where practical.

## 5. Concurrency tests

Explicitly test:

- two loyalty reservations,
- duplicate payment callbacks,
- two QR claims,
- concurrent order transitions,
- idempotent retry behavior.

## 6. Web E2E baseline

Playwright projects include at least a Chromium production-like path. Pre-release production acceptance should include Chromium, WebKit, and Firefox for critical storefront journeys as practical.

Trace/screenshots/video retention should favor failure diagnostics without storing unnecessary personal test data.

## 7. Mobile E2E baseline

Maestro flows cover critical customer and courier happy paths and permission/error states. Use accessibility IDs/labels designed for stable testing; do not rely only on fragile coordinates.

## 8. Test accounts

CI uses synthetic accounts and provider sandbox credentials. Never copy production customer information into automated test fixtures.

## 9. Flaky tests

Flaky tests are defects. Retries may collect diagnostics but must not become a permanent mechanism that hides unstable tests.

## 10. CI order

Canonical fast-to-slow pipeline:

1. install/frozen lockfile
2. format/lint
3. typecheck
4. unit tests
5. schema/migration checks
6. build
7. integration tests
8. web E2E
9. mobile E2E on designated workflows/builds
