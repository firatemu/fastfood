# AI Agent Development Protocol

## 1. Purpose

This file governs how an AI coding agent must work inside the FASTFOOD repository. It is not the task prompt itself; it is a persistent project behavior contract.

## 2. Read-before-write rule

Before making implementation changes, the agent must read:

1. `00-FASTFOOD_PRODUCT_AND_SYSTEM_SPEC.md`
2. `32-IMPLEMENTATION_LOCK_IN.md`
3. the domain document(s) relevant to the task,
4. the implementation contract(s) relevant to the task,
5. existing nearby code/patterns.

An agent must not begin by scaffolding a preferred personal stack.

## 3. No silent architecture decisions

The agent must not silently:

- switch ORM,
- add GraphQL,
- add microservices,
- create a second design system,
- change money representation,
- change auth model,
- change pricing order,
- change database naming strategy,
- change package manager/monorepo tool,
- replace provider contracts,
- introduce a new state transition.

## 3A. Current no-deployment rule

The repository is in **Development-Only / Human-Validation Mode**. The agent must not perform or prepare an executable remote deployment unless the product owner later explicitly changes this policy.

Forbidden current actions include:

- Coolify/VPS deployment or setup,
- staging/production environment deployment,
- production provider/credential configuration,
- deployment workflow creation or activation,
- remote database migration,
- production domain/TLS configuration,
- App Store / Play Store / TestFlight or equivalent release.

Allowed work includes local Docker/Compose, localhost applications, simulator/emulator/device development, sandbox providers, CI verification, local build verification, and human testing.

If a task seems to imply deployment, stop that portion and report that deployment is deferred by document 49. Do not interpret “finish”, “release-ready”, or “build the project” as permission to deploy.

## 4. No speculative scope expansion

If a requested feature is outside V1 or absent from the task, do not build it “for completeness”. Keep extension points simple and documented.

## 5. Work in bounded phases

For a coding task, the agent should:

1. identify affected requirements/docs,
2. inspect existing implementation,
3. state intended files/modules internally or in requested work log,
4. implement the smallest complete vertical change,
5. update tests,
6. run targeted checks,
7. run required broader checks,
8. update documentation when behavior/contract changed.

## 6. Preserve source-of-truth priority

If existing code conflicts with these documents, do not copy the conflict. Determine whether code is stale or documentation intentionally changed. For locked decisions, documentation wins until an approved ADR says otherwise.

## 7. Avoid duplicate concepts

Before creating a helper/component/type/service:

- search repository for existing equivalent,
- extend canonical shared component if appropriate,
- use canonical contract package.

Examples of forbidden duplication:

- `Button2`, `NewButton`, `CustomSaveButton` instead of extending design system,
- local `OrderStatus` type when canonical type exists,
- app-local price calculator,
- second `apiClient` implementation.

## 8. Database changes

Before changing schema:

- read entity and Prisma conventions,
- modify canonical Prisma schema,
- create migration,
- update seed if needed,
- update affected contracts/tests,
- never use production `db push` as migration strategy.

## 9. Security checklist for every endpoint

The agent must reason about:

- authentication,
- permission,
- scope/ownership,
- validation,
- rate/abuse where relevant,
- idempotency where retryable,
- audit where critical,
- personal-data exposure,
- logging safety.

## 10. UI checklist for every screen

The agent must use centralized tokens/components and handle:

- responsive layout,
- loading,
- empty,
- error,
- validation,
- disabled/loading actions,
- accessibility,
- permission state where applicable.

## 11. Financial code rule

Any pricing/loyalty/refund code must cite/follow document 37 conceptually and include explicit tests with integer expected values.

## 12. Output discipline

When running in an interactive coding agent, do not flood the user with low-level narration. Report meaningful findings, changed files, tests run, and unresolved blockers. Do not expose hidden chain-of-thought.

## 12.A Cross-platform customer UI (Web + Mobile)

For every customer-facing capability change, the agent must:

1. Produce the Sync Plan required by
   `.cursor/rules/45-customer-ui-sync.mdc` before editing
   `apps/storefront-web/src` or `apps/customer-mobile/app`.
2. Apply Web **and** Mobile in the same pass.
3. Update `@fastfood/contracts` and `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md`
   in the same change.
4. Capture both client typechecks (`storefront-web`, `customer-mobile`)
   in the completion report; one of them being green does not finish the task.

Authority: `docs/customer-platform/CUSTOMER_CHANGE_POLICY.md` (same-task
implementation) and
`docs/customer-platform/CROSS_PLATFORM_SYNC_FOUNDATION.md` (drift policy).
A single-client implementation is a contract violation; halt and escalate.

## 13. When blocked by documentation

If a truly material business rule is missing and no safe existing contract resolves it:

- do not invent a permanent rule,
- mark the exact decision needed,
- propose the smallest options,
- do not implement conflicting assumptions across modules.

Technical details already locked in documents are not blockers and must not be re-asked.

## 14. Completion claim

An agent may say a task is complete only after applicable lint/type/tests/build checks have actually passed or it clearly states which check could not be run and why.

## 15. Controlled autonomous execution inside the authorized phase/task

Autonomy means the agent may independently iterate on implementation and
technical failures **inside** the currently authorized task/phase. Autonomy
**does not** include authority to:

- enter another phase (document 23 / `PROJECT_STATUS.md`),
- change a locked architecture (document 32),
- invent or change a business rule (document 37, document 49 §11),
- deploy or activate production services (document 49 §3),
- bypass a human acceptance gate (document 49 §6).

Repair loop:

```
IMPLEMENT
  → VERIFY
  → FAILURE?
    → ROOT-CAUSE ANALYSIS
    → REPAIR
    → RETEST
    → LOOP
  → COMPLETE
```

The loop terminates when checks pass **or** when a hard-stop condition
(§16) is reached. Routine coding and test failures are agent
responsibilities; material ambiguity and authorization decisions are
human-owner responsibilities.

The agent may not mark an item complete because the work was attempted.
Completion requires execution evidence.

## 16. Hard-stop / escalation conditions

The autonomous loop MUST stop and escalate to the human owner when:

- a missing material business decision is required,
- authoritative contracts contradict each other,
- a locked architectural change would be required,
- a dependency / major-version change requires approval/ADR,
- a destructive or high-risk data operation is not already authorized,
- any production / staging / release operation is implied,
- a phase boundary or human acceptance gate is reached,
- the failure cannot be safely resolved from existing contracts,
- repeated repair attempts indicate architectural uncertainty rather than
  an ordinary coding defect.

Do not invent a rule just to keep the loop moving.
