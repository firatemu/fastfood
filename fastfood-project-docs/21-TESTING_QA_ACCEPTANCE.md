# Testing, QA, and Acceptance Strategy

## 1. Testing philosophy

Tests protect business contracts, not only code coverage numbers. Critical payment, pricing, loyalty, authorization, branch routing, and state-machine behavior must be exercised at the appropriate level.

## 2. Test layers

- **Unit tests:** pure domain rules, calculations, mapping, validation helpers.
- **Integration tests:** NestJS modules with database/Redis/provider fakes or test containers.
- **Contract/API tests:** HTTP behavior, auth, validation, error codes, idempotency.
- **Web E2E:** Playwright for storefront/admin critical journeys.
- **Mobile E2E:** Maestro for customer/courier critical journeys.
- **Security regression tests:** ownership/scope/IDOR, rate limits, webhook validation, privileged actions.

## 3. Mandatory critical-path coverage

Before production, automated coverage must include at least:

1. Guest checkout happy path.
2. Registered customer checkout.
3. Map address required validation.
4. Out-of-service-area rejection.
5. Correct branch routing.
6. Product variant/modifier validation.
7. Minimum-order rule.
8. Loyalty reservation + successful payment.
9. Loyalty reservation + failed payment release.
10. Duplicate payment callback/webhook.
11. Order state authorization.
12. Branch scope isolation.
13. Courier QR concurrency where only one courier wins.
14. Courier cannot access another courier's delivery.
15. Refund authorization/idempotency.
16. Realtime reconnect followed by REST resynchronization.

## 4. Financial calculation tests

Pricing tests must use exact integer expectations. Snapshot-only assertions are insufficient for financial correctness.

## 5. Database integration

Integration tests should use real PostgreSQL/PostGIS behavior for spatial and transactional rules that mocks cannot represent reliably.

## 6. Provider testing

Use provider adapters and sandbox environments. Unit tests use deterministic fakes. Production credentials must never be used in CI.

## 7. Test data

Seeded test data must be deterministic. Tests must not depend on order created by a previous unrelated test unless the suite explicitly owns that shared fixture and serializes access.

## 8. Definition of passed feature

A feature is not accepted until:

- requirements are implemented,
- automated tests relevant to its risk pass,
- error/empty/loading states are handled,
- authorization is tested,
- audit/observability requirements are satisfied,
- docs are updated if behavior changed.

The tool-specific contract is in `41-TESTING_TOOLCHAIN_CONTRACT.md`.
