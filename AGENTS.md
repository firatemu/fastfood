# FASTFOOD — AI Coding Agent Instructions

This file is the repository-wide entry contract for any AI coding agent
working inside the FASTFOOD repository. It is short, tool-independent, and
defers the canonical product/architecture/business rules to
`./fastfood-project-docs/`.

## 1. Sources of truth

Primary documentation: `./fastfood-project-docs/`

Task-specific documentation routing: `./docs/README.md`

Mandatory baseline reading before any non-trivial action:

- `00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md`
- `32-IMPLEMENTATION_LOCK_IN.md`
- `43-AI_AGENT_DEVELOPMENT_PROTOCOL.md`
- `46-CHANGE_CONTROL_ADR_PROTOCOL.md`
- `49-DEVELOPMENT_EXECUTION_AND_HUMAN_VALIDATION_POLICY.md`
- `PROJECT_STATUS.md`
- task-specific domain/implementation documents
- existing nearby code and tests

Do not preload historical phase reports or completed implementation prompts.
The active repository intentionally retains only the final technical summary
and final human-test plan under `project-reports/final/`. Read those only when
the task concerns project-wide completion or acceptance evidence.

Precedence for conflicts:

1. explicit current user instruction,
2. active development execution policy (document 49),
3. implementation lock-in (document 32),
4. domain/product specifications (documents 06–20),
5. existing code, provided it does not violate a higher-level contract.

Material contract changes require an ADR (document 46).

## 2. Current execution mode

`FULL_PROJECT_AUTONOMOUS_DEVELOPMENT` at `FINAL_PROJECT_HUMAN_GATE`

Canonical development is technically complete. The active work is local human
visual/functional validation; final acceptance remains human-owned.

**Exception (ADR-021, 2026-10-11):** the owner activated one VPS environment
on Coolify (`burger|adminburger|kuryeburger|qrburger|mapburger|apiburger.azem.cloud`)
with sandbox/fake providers and Android release APK sideloading. Everything
below remains prohibited outside that scope.

**NO OTHER DEPLOYMENT.** No staging, production, Coolify, VPS/cloud release,
public domain/TLS setup, production credentials, remote migrations, CD
pipeline activation, app-store / Play Store / TestFlight release, or
production provider activation.

Allowed: local development, Docker Compose local infrastructure, sandbox
providers, CI verification, emulators/simulators/local development devices,
automated tests, and human testing.

## 3. Phase authorization

Before implementing code, the agent must read `PROJECT_STATUS.md`.

The agent may work only on a phase/task that is explicitly authorized in
`PROJECT_STATUS.md` or by an explicit human-owner instruction in the current
conversation.

Technical readiness statements such as `READY_FOR_PHASE_N`,
`TECHNICALLY_READY`, `TESTS_PASS`, `PHASE_N_COMPLETE`,
`TECHNICALLY_READY_FOR_HUMAN_ACCEPTANCE` are **not** authorization to enter
the next phase.

Only an explicit human-owner authorization or an already-recorded authorized
state in `PROJECT_STATUS.md` may open the next phase. Phase boundaries
and human acceptance gates are hard-stop boundaries for autonomous execution.

The agent may never declare `HUMAN_ACCEPTED` or `PHASE_0_ACCEPTED` on its
own.

## 4. Engineering rules (locked contracts)

- Respect the locked stack and version matrix (document 33).
- Preserve the monorepo dependency direction.
- Use canonical shared design tokens and components.
- Use the canonical Zod contracts and API / error envelope (document 40).
- Follow Prisma/database naming, UUIDv7, UTC, `Europe/Istanbul` business
  timezone, and money-as-`BigInt` contracts (documents 35 + 37).
- Enforce authentication, permission, resource/branch/ownership, and domain
  transition policies server-side.
- Provider calls stay behind adapters. Retryable/critical workflows must be
  idempotent.
- Search before creating duplicate helpers/types/components/services.
- Use canonical migrations, not ad-hoc schema drift.
- Keep secrets and PII out of logs and source.
- Customer-facing capability or behavior change: classify **both**
  `apps/storefront-web` and `apps/customer-mobile` as `CHANGE_REQUIRED`,
  `AUTOMATICALLY_SUPPORTED`, or `NOT_APPLICABLE`. A cross-platform
  customer capability is not complete until both are evaluated. If a
  client is `CHANGE_REQUIRED`, implement it in the same task unless
  blocked or explicitly deferred. Canonical registry:
  `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`. Before any
  customer-UI edit, produce the Sync Plan in
  `.cursor/rules/45-customer-ui-sync.mdc`.

## 5. Controlled autonomous execution within authorized scope

Inside an explicitly authorized phase/task, the agent may execute the loop:

```
READ → INSPECT → PLAN → IMPLEMENT → TARGETED VERIFY
      → DIAGNOSE → REPAIR → RETEST → BROADER VERIFY → REPORT
```

The agent must NOT stop to ask the human owner about routine compiler,
lint, unit-test, integration-test, or implementation errors that can be
resolved deterministically from the repository contracts and code.

Repairs must address root causes, not symptoms. Forbidden workarounds:

- deleting or weakening valid tests,
- adding arbitrary ignores / lint disables / type laxity,
- changing a business rule or architecture silently,
- widening scope beyond the authorized phase.

## 6. Hard-stop / escalation conditions

The autonomous loop MUST stop and escalate to the human owner when:

- a missing material business decision is required,
- authoritative contracts contradict each other,
- a locked architectural change would be required,
- a dependency/major-version change requires approval/ADR,
- a destructive or high-risk data operation is not already authorized,
- any production / staging / release operation is implied,
- a phase boundary or human acceptance gate is reached,
- the failure cannot be safely resolved from existing contracts,
- repeated repair attempts indicate architectural uncertainty rather than
  an ordinary coding defect.

Do not invent a rule just to keep the loop moving.

## 7. Completion discipline

A coding task is complete only when its applicable format/lint/type/test/build
checks have actually passed. Completion requires evidence (exit codes,
captured logs). Do not claim PASS without execution evidence.

`HUMAN_ACCEPTED` is human-owned; the agent may only declare
`TECHNICALLY_READY_FOR_HUMAN_ACCEPTANCE`.

## 8. Safety and data

Use synthetic development data. Never place secrets in source control. Never
use production credentials. Do not log passwords, OTPs, tokens, payment
secrets, or unnecessary PII.

## 9. When documentation is unclear

Do not invent a permanent business rule. Identify the exact ambiguity and
the smallest decision required. Locked technical decisions are not
ambiguities and must not be re-litigated.
