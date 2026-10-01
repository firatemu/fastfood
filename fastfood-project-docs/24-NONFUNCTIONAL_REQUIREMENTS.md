# Non-Functional Requirements

## 1. Availability and resilience

The platform should fail safely. Payment uncertainty must not become false success. Realtime failure must degrade to REST refresh. Notification failure must not roll back a successfully persisted order.

## 2. Performance targets

Baseline targets under normal production load:

- API p95 for ordinary cached/read operations: target < 400 ms excluding external providers.
- API p95 for ordinary transactional mutations: target < 700 ms excluding external providers.
- Storefront Core Web Vitals should meet Google's "good" thresholds on representative mobile conditions where practical.
- Product/category pages must avoid unnecessary client-side JavaScript.
- Admin tables must paginate; no unbounded production lists.

These are engineering targets, not guarantees against provider/network latency.

## 3. Scalability

The system must support scaling API and worker processes independently. Stateless request processing is preferred except for externalized session/cache state.

## 4. Security

No endpoint is considered internal/trusted merely because it is used by Admin Web. Staff endpoints require authentication and authorization.

## 5. Accessibility

Target WCAG 2.2 AA behavior for web interfaces where applicable. Critical mobile workflows must be usable with platform accessibility semantics.

## 6. Responsive design

Web must support phone, tablet, laptop, and desktop layouts. Admin must remain usable on tablet/mobile for emergency access even if desktop is the primary dense-data experience.

## 7. Data integrity

- no float money,
- database constraints for key invariants,
- idempotent retry boundaries,
- explicit state transitions,
- transaction boundaries around coupled financial/state changes.

## 8. Localization

Initial product language may be Turkish, but UI copy must not be hardcoded deeply into business logic. Application structure should permit future localization.

## 9. Timezone

Canonical persistence and API timestamps are UTC. Business display uses Europe/Istanbul unless future branch-specific requirements change this through an ADR.

## 10. Maintainability

The project must favor explicit code, typed contracts, small modules, and centralized conventions over clever abstractions. An AI agent should be able to locate the owner of a business rule quickly.

## 11. Observability

Every production request/error should be traceable using a correlation/request identifier. Critical queue/provider failures must surface operationally.
