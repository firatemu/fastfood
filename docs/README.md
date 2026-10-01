# FASTFOOD Task Documentation Map

Use this file to select the smallest documentation set needed for a task. The
numbered contracts in `../fastfood-project-docs/` remain authoritative.

## Always read

- `../AGENTS.md`
- `../PROJECT_STATUS.md`
- `../fastfood-project-docs/00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md`
- `../fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md`
- `../fastfood-project-docs/43-AI_AGENT_DEVELOPMENT_PROTOCOL.md`
- `../fastfood-project-docs/49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md`

Then read only the section relevant to the task.

## Architecture decisions

`adrs/` contains accepted decisions. ADRs are historical by nature and must not
be deleted; a later decision supersedes an older one explicitly.

## Customer cross-platform work

- `customer-platform/CUSTOMER_CHANGE_POLICY.md`
- `customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`
- `customer-platform/CROSS_PLATFORM_SYNC_FOUNDATION.md`

Any customer-facing capability change must classify both Storefront Web and
Customer Mobile.

## Admin human QA or visual work

- `admin-rebuild/03_ADMIN_DESIGN_FOUNDATION.md`
- `admin-rebuild/04_ADMIN_CAPABILITY_MATRIX.md`
- `admin-rebuild/12_ADMIN_HUMAN_QA_CHECKLIST.md`
- `admin-rebuild/13_ADMIN_HUMAN_QA_TEST_DATA.md`
- `admin-rebuild/14_ADMIN_RELEASE_READINESS.md`

## Storefront human QA or visual work

- `storefront-rebuild/03_STOREFRONT_DESIGN_FOUNDATION.md`
- `storefront-rebuild/04_CAPABILITY_GAP_MATRIX.md`
- `storefront-rebuild/15_HUMAN_QA_CHECKLIST.md`
- `storefront-rebuild/16_HUMAN_QA_TEST_DATA.md`
- `storefront-rebuild/17_STOREFRONT_RELEASE_READINESS.md`

## Customer Mobile human QA or visual work

- `mobile-rebuild/03_MOBILE_DESIGN_FOUNDATION.md`
- `mobile-rebuild/04_MOBILE_CAPABILITY_MAPPING.md`
- `mobile-rebuild/12_HUMAN_QA_CHECKLIST.md`
- `mobile-rebuild/13_HUMAN_QA_TEST_DATA.md`
- `mobile-rebuild/14_MOBILE_RELEASE_READINESS.md`

## Courier Web

- `../fastfood-project-docs/15-COURIER_DELIVERY_TRACKING_QR.md`
- `../fastfood-project-docs/29-API_ENDPOINT_CATALOG.md`
- `../fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md`
- `../fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md`
- `../fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md`
- `../fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md`
- `../apps/courier-web/README.md`

## API contract

- `openapi/openapi.json` is generated from the current API and should be
  refreshed when endpoints or schemas change.

## Final project evidence

Only use these for project-wide completion or acceptance work:

- `../project-reports/final/FULL_PROJECT_AUTONOMOUS_COMPLETION_REPORT.md`
- `../project-reports/final/FULL_PROJECT_HUMAN_TEST_PLAN.md`

Intermediate prompts, phase reports, screenshots, audits, plans, and generated
AI repository cards were removed from the active tree after consolidation.
