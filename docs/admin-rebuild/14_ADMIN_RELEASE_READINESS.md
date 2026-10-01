# 14 — Admin release readiness (technical)

Not PRODUCTION_READY. Not HUMAN_ACCEPTED. Local/dev Admin UI transformation only.

| Area | Classification |
| --- | --- |
| Shell / navigation | READY |
| Design fidelity (Stitch golden four) | READY_WITH_KNOWN_LIMITATION (real data, not screenshot demo; 390 is operational fallback) |
| Dashboard | READY |
| Orders | READY |
| KDS | READY |
| Catalog | READY_WITH_KNOWN_LIMITATION |
| Branch / fulfillment | READY_WITH_KNOWN_LIMITATION (no dispatch board; no service-area update/delete) |
| Customers / loyalty | READY_WITH_KNOWN_LIMITATION (read-only; no adjustment) |
| Promotions | READY_WITH_KNOWN_LIMITATION (isActive-only update) |
| Payments / refunds | READY_WITH_KNOWN_LIMITATION (no global refund list; no PAN) |
| Reports | READY_WITH_KNOWN_LIMITATION (no export/date query) |
| Users / roles / permissions | READY_FOR_HUMAN_QA (direct user creation; role catalog read-only) |
| Audit | READY_WITH_KNOWN_LIMITATION (no detail payload; may be empty) |
| Settings | READY_WITH_KNOWN_LIMITATION (may be empty; secrets redacted) |
| Responsive | READY_WITH_KNOWN_LIMITATION (390 header wraps; sync age hidden) |
| Accessibility | READY_WITH_KNOWN_LIMITATION (contract + landmarks; live axe still gated) |
| Security | READY (backend RBAC; no client privilege trust) |
| Test suite | HUMAN_QA_REQUIRED (automated gates pass; owner journeys remain) |
| Backend gaps | BACKEND_CAPABILITY_ABSENT (see matrix; not UI defects) |
| Customer-client impact | READY (no customer contract change in A6; existing Admin mutations already consumed by customer APIs) |
| Production deploy | BLOCKED (policy: PROHIBITED / DEFERRED) |

Human QA pack: `12_ADMIN_HUMAN_QA_CHECKLIST.md`, `13_ADMIN_HUMAN_QA_TEST_DATA.md`.
