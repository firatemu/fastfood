# Development Execution and Human Validation Policy

## 1. Authority and status

**Status: ACTIVE — mandatory until explicitly changed by the product owner.**

This document defines the current execution boundary for the FASTFOOD project. It overrides any older/current wording that might otherwise be interpreted as authorization to deploy, release, or configure production infrastructure.

The project is intentionally being built through iterative feature development, automated verification, and human testing before any production/release phase exists.

### 1.1 Current operating mode

**`FULL_PROJECT_AUTONOMOUS_DEVELOPMENT`** (effective 2026-09-18).

The human owner recorded `FULL_CANONICAL_PROJECT_AUTONOMOUS_EXECUTION = AUTHORIZED`
in `PROJECT_STATUS.md`. Under this mode:

- The Autonomous Development Controller is armed (`controllerArmed = true`)
  and runs in `FULL_PROJECT_AUTONOMOUS_DEVELOPMENT` execution mode.
- Every remaining canonical roadmap development phase is authorized at
  the project level. The controller auto-advances through them after each
  phase passes its technical gates.
- Human testing is deferred until the FINAL project human gate (after
  every planned development phase is technically complete).
- Hard-stop conditions (CONTRACT_CONFLICT, RETRY_BUDGET_EXHAUSTED,
  FORBIDDEN_PATH_REQUIRED, etc.) still stop the autonomous loop for
  human resolution.

The historical `DEVELOPMENT_ONLY_HUMAN_VALIDATION` mode remains
supported for cases where the human owner records only a per-phase
authorization row. The two modes are governed by the
`executionMode` row of the runtime state and the
`Project autonomous execution` row of `PROJECT_STATUS.md`.

## 2. Permitted execution contexts

Permitted execution contexts:

- local developer machine,
- project-controlled local Docker services,
- localhost web/API execution,
- local network exposure only when deliberately needed for development-device testing,
- emulator/simulator,
- locally installed development mobile build,
- automated CI verification environment,
- third-party sandbox/test environments such as iyzico sandbox.

## 3. Explicitly prohibited actions

Unless the product owner later gives an explicit new instruction changing this policy, neither a human developer nor an AI agent may:

1. deploy FASTFOOD to a VPS/cloud/remote server,
2. configure or trigger Coolify deployment,
3. create a staging deployment,
4. create a production deployment,
5. create public staging/production domains or TLS setup for FASTFOOD,
6. configure production secrets or real production provider credentials,
7. switch iyzico from sandbox/test to production,
8. enable production SMS OTP,
9. execute migrations against any remote staging/production database,
10. upload/publish production container artifacts as part of a release pipeline,
11. create/enable CD jobs that deploy after CI,
12. publish customer/courier apps to App Store, Google Play, TestFlight, Play internal/beta track, or equivalent remote release channel,
13. mark the project “production ready” solely because automated tests pass.

## 4. CI versus CD

CI is active and required. CD is inactive and prohibited.

CI may:

- install dependencies,
- lint,
- format-check,
- type-check,
- run tests,
- build applications,
- validate Prisma migrations/schema,
- run security/dependency checks,
- run browser E2E tests in ephemeral CI infrastructure.

CI must not:

- deploy,
- publish releases,
- mutate remote persistent environments,
- use production credentials.

## 5. Provider policy

During this mode:

- iyzico: sandbox/test only,
- OTP/SMS: fake/test provider only,
- maps: development-restricted key/configuration only when needed,
- object storage: local MinIO by default,
- push notifications: development/test path only when the relevant feature phase requires it,
- email/SMS/WhatsApp integrations: fake/sandbox/test adapter unless separately approved for development.

No fallback may silently call a production provider.

## 6. Human testing is a required quality gate

A feature is not considered accepted merely because it compiles or automated tests pass.

For each substantial feature/phase:

1. implementation is completed against the authoritative documents,
2. lint/type/unit/integration/E2E checks applicable to the change pass,
3. the feature is exercised in an integrated development environment,
4. a human tester validates expected behavior and UX,
5. defects are recorded/corrected,
6. affected tests are re-run,
7. the human tester/product owner explicitly accepts the feature or returns it for further work.

Human acceptance should focus on both happy paths and important edge/failure paths.

### 6.1 Human-acceptance deferral policy (intermediate phases)

As recorded in `PROJECT_STATUS.md`, human testing was **deferred until project
completion** for intermediate development phases. The lifecycle is:

```
PHASE IMPLEMENTATION → AUTOMATED VALIDATION → TECHNICAL PHASE COMPLETION
→ WAIT FOR EXPLICIT OWNER AUTHORIZATION FOR NEXT PHASE
...
FINAL PLANNED DEVELOPMENT PHASE → FULL AUTOMATED REGRESSION
→ HUMAN TESTING → HUMAN ACCEPTANCE → HUMAN-REQUESTED FIXES IF NEEDED
```

For every phase that is NOT the final planned development phase, the
controller records the runtime state as:

```
PHASE_TECHNICALLY_COMPLETE = YES
PHASE_HUMAN_ACCEPTANCE = DEFERRED_UNTIL_PROJECT_COMPLETION
HUMAN_REVIEW_REQUIRED = NO
READY_FOR_NEXT_PHASE_AUTHORIZATION = YES
```

Under the historical `DEVELOPMENT_ONLY_HUMAN_VALIDATION` mode, the autonomous
loop stopped at each intermediate phase boundary for explicit owner
authorization of the next phase. Under the current
`FULL_PROJECT_AUTONOMOUS_DEVELOPMENT` mode, those technically complete phases
auto-advanced as authorized by `PROJECT_STATUS.md`. Neither mode requested
manual acceptance at intermediate phase boundaries.

Human testing becomes blocking only when every planned development
phase is technically complete. At that point the controller records
`PROJECT_HUMAN_GATE` → `HUMAN_REVIEW_REQUIRED` and the autonomous
loop stops for human validation.

This deferral policy does NOT remove any prohibition from §3, §10,
or §11 of this document.

## 7. Human test evidence

For major phases, keep a concise record containing:

- feature/phase,
- test date,
- build/commit reference when available,
- scenarios tested,
- devices/browsers used where relevant,
- defects found,
- retest result,
- accepted / needs changes status.

The exact storage format may be a project Markdown test record during development.

## 8. Local test data policy

Development data must be synthetic/deterministic. Do not copy real customer personal data into local fixtures.

Seed data must support repeated human testing and reset workflows. IDs, phone numbers, addresses, orders, branch names, and payment records in seeds must be fictional unless the product owner intentionally provides non-sensitive test business data.

## 9. Database/migration policy during development

Schema changes still require canonical Prisma migrations. “Development-only” does not mean uncontrolled schema drift.

Allowed:

- local migration creation,
- local migration apply/reset,
- CI migration validation,
- deterministic local seed/reset.

Prohibited:

- remote production/staging migration,
- replacing migration history with ad-hoc database edits,
- treating `db push` as the canonical migration workflow.

## 10. Future production architecture

Existing production/Coolify sections in the project documentation are retained only to prevent future architectural rework. They are dormant requirements. Agents must not implement deployment-specific work simply because those sections exist.

## 11. Activation of a future release phase

Deployment/release work can begin only after a future explicit instruction from the product owner. A valid activation requires all of the following:

- explicit human authorization in the conversation/task,
- update of this document/status,
- update of `PROJECT_STATUS.md`,
- dedicated release/deployment scope,
- human-test milestone accepted,
- production business/provider data intentionally supplied.

No AI agent may infer this authorization from phrases such as “complete the application”, “make it ready”, “finish Phase 10”, “run all checks”, or “prepare for testing”.

## 12. Conflict rule

If another document says “deploy”, “production”, “staging”, “Coolify”, “production provider”, or similar:

- its architectural/security guidance may still be informative,
- its execution steps are dormant during the active development-only mode,
- this document wins on whether those actions may actually be performed.

## 13. Autonomous execution inside an authorized phase

For the avoidance of doubt: this document alone does not grant autonomous
execution authority. Autonomous technical execution (planning, writing
code, running local verifications, repairing ordinary test/build failures,
auto-advancing through canonical phases) is permitted **only** when:

- the phase/task is explicitly authorized in `PROJECT_STATUS.md` (per-phase
  row) OR the human owner has recorded
  `Project autonomous execution = AUTHORIZED` (project-level), AND
- `executionMode` matches the recorded authorization mode.

Autonomous execution remains subject to every prohibition in §3. In
particular, autonomous execution does not grant authority to:

- cross the FINAL project human gate (this document §6, §11); the
  controller records `PROJECT_HUMAN_GATE` → `HUMAN_REVIEW_REQUIRED`
  when the FINAL canonical development phase passes its technical
  gates and the autonomous loop stops there for human testing,
- alter the locked architecture or any business rule (document 32, 37),
- perform any of the actions enumerated in §3 (deploy, Coolify, public
  domain/TLS, production secrets, real iyzico production, real production
  SMS, remote migrations, production container publishing, CD jobs,
  app-store / TestFlight release, "production-ready" self-declaration),
- alter the deployment / production fields of `PROJECT_STATUS.md`,
- mutate the `Project autonomous execution` row without an explicit
  human-owner instruction.

Under `FULL_PROJECT_AUTONOMOUS_DEVELOPMENT`, auto-advancing to the next
canonical phase is an internal orchestrator action gated on
`PHASE_BOUNDARY_REACHED` + the ordered `phases[]` array in
`PROJECT_STATUS.md`. The controller does not invent phases, does not skip
canonical phases, and does not advance when an explicit
`NOT AUTHORIZED` row is recorded for that phase.

## 13. Cross-platform customer UI (Web + Mobile)

Customer-facing capability edits in `apps/storefront-web/src` or
`apps/customer-mobile/app` are bound by
`.cursor/rules/45-customer-ui-sync.mdc` and
`docs/customer-platform/CUSTOMER_CHANGE_POLICY.md`. The autonomous loop:

1. Refuses to claim a customer-UI task complete with only one client
   updated. The completion report must include **both**
   `pnpm --filter @fastfood/storefront-web typecheck` and
   `pnpm --filter @fastfood/customer-mobile typecheck` outputs (or a
   recorded reason for skipping one, e.g. `NOT_APPLICABLE`).
2. Refuses to mark a capability `IMPLEMENTED` in the registry before
   both `webStatus` and `mobileStatus` are recorded for the same id.
3. Treats registry divergence between clients as drift; the lagging
   client is always the one brought into compliance, never the other
   way around.
4. Halt conditions:
   - any customer-UI task where one client was skipped and the other
     updated,
   - any registry edit that fails `pnpm check:customer-platform`,
   - any drift detected between Web and Mobile for the same capability id.
