# 17 — Storefront release-readiness audit

Local/dev technical readiness for **human QA**. This is **not** `PRODUCTION_READY` and **not** `HUMAN_ACCEPTED`.

`STOREFRONT_UI_TRANSFORM` may be set to `TECHNICALLY_READY_FOR_HUMAN_QA` only after Phase 8 gates pass.

Classification vocabulary:

- **READY** — implemented, tests exist, no known functional hole for local QA
- **READY_WITH_KNOWN_LIMITATION** — works with an approved product deviation
- **EXTERNAL_PROVIDER_BLOCKED** — architecture present; live provider/credentials missing
- **HUMAN_QA_REQUIRED** — technically complete; needs a human on the journeys
- **BLOCKED** — cannot enter human QA

---

## Summary

| Area                                        | Class                              |
| ------------------------------------------- | ---------------------------------- |
| Frontend Storefront                         | HUMAN_QA_REQUIRED                  |
| Backend customer APIs                       | READY                              |
| Database migrations (local)                 | READY                              |
| Auth (OTP / password)                       | HUMAN_QA_REQUIRED                  |
| Payments (iyzico hosted)                    | HUMAN_QA_REQUIRED                  |
| Catalog / cart / checkout                   | HUMAN_QA_REQUIRED                  |
| Orders / tracking                           | HUMAN_QA_REQUIRED                  |
| Account / Club / support / notifications    | HUMAN_QA_REQUIRED                  |
| Builder / branches / deals / legal / search | HUMAN_QA_REQUIRED                  |
| Monitoring / logging                        | READY_WITH_KNOWN_LIMITATION        |
| External providers                          | EXTERNAL_PROVIDER_BLOCKED (subset) |
| Test suite                                  | READY                              |
| Production deploy                           | BLOCKED (policy)                   |

Nothing in this table authorizes Coolify, TLS, staging, or production.

---

## Area notes

### Frontend

READY for local serving at `:3100`. Independent BURGER HOME visual system. No `@fastfood/ui-web` or `design-tokens`. Phase 8 polish: skip link, focus-visible, reduced-motion, mobile Izgarada icon, dining banner below header, sanitized errors, payment poll stop, Builder chip labels.

Still **HUMAN_QA_REQUIRED** for coherence across journeys.

### Backend APIs

READY. Customer routes under `/api/v1` (`storefront/*`, `checkout/*`, `/me/*`). Ownership enforced server-side.

### Database migrations

READY for local/dev. Latest Storefront-related: `00000000000016_storefront_completeness`. Do not run production migrations.

### Auth

OTP + email/password READY. Google/Apple **EXTERNAL_PROVIDER_BLOCKED** without credentials. Session cannot be spoofed from the Storefront.

### Payments

iyzico hosted/3DS READY for sandbox when credentials exist. Masterpass / kapıda / card vault **EXTERNAL_PROVIDER_BLOCKED**. No PAN/CVV fields.

### Catalog, cart, checkout

READY. Quote is price authority. Guest checkout READY. `/address` is serviceability only (intentional).

### Orders / tracking

READY. OSM map **READY_WITH_KNOWN_LIMITATION** (not owned tiles). Masked call **EXTERNAL_PROVIDER_BLOCKED**.

### Account / Club / support / notifications

READY with approved deviations: welcome = promotion not wallet; SYSTEM chat receipt; table QR is not auth and not `DINE_IN`.

### Builder / branches / content / deals / search / legal

READY. Search is case-insensitive catalog `q`, not Elasticsearch. Legal company registry unconfigured rather than invented.

### Monitoring / logging

READY_WITH_KNOWN_LIMITATION. Local logs must not contain OTP/PAN. No production APM assumed.

### Test suite

READY. Storefront unit + Playwright (phases 1–8) + API unit/integration including persistence-restart. External-provider cases assert unavailability, not fake success.

### Production

BLOCKED. Deployment remains `PROHIBITED / DEFERRED`.

---

## External blockers (not QA failures)

- Google OAuth live exchange
- Apple OAuth live exchange
- Masterpass
- iyzico card-on-file / tokenization
- Masked phone calling
- Owned map tile provider (OSM used)

## HUMAN_QA_REQUIRED (all customer journeys)

Every row in `15_HUMAN_QA_CHECKLIST.md`. Technical gates cannot substitute for a human walking guest order, authenticated order, Builder, account, Club, table QR, and payment sandbox.

## Intentional deviations (not defects)

- Welcome reward is promotion `BHCLUBWELCOME`
- No `DINE_IN` fulfillment
- SYSTEM support receipt
- OSM map
- `/address` serviceability flow
- `/menu` aliases Home
- Legal registry unconfigured
- Builder is a flagged catalog product

## Verdict

**TECHNICALLY_READY_FOR_HUMAN_QA** once Phase 8 commands in the Phase 8 report pass.

Not human accepted. Not production ready. Not deployed.
