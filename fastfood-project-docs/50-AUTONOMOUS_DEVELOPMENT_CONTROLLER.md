# 50 — Autonomous Development Controller

- **Document number:** 50
- **Status:** Accepted (bootstrap + 2026-09-18 full-project autonomous
  execution migration)
- **Scope:** Repository-native orchestration/control layer for AI coding work inside
  an explicitly authorized FASTFOOD execution mode. This document authorizes the
  controller's data model, FSM, evidence handling, and migration to
  full-project autonomous execution. It does **not** authorize deployment,
  production, or any change to a locked contract in document 32.

This document is the canonical specification for the controller. Code lives at
`packages/dev-controller/`. Cursor rules in `.cursor/rules/` reference this
document.

---

## 1. Purpose

The Autonomous Development Controller (the "controller") is a deterministic
control plane around AI coding work. It is NOT a second AI agent. It does
NOT inspect, repair, or invent code. It governs:

- whether work is authorized at all,
- what work item is currently in scope,
- what state the work item is in,
- whether a transition is allowed,
- whether retries remain within budget,
- whether human review is required,
- whether evidence is sufficient,
- whether the next phase is reachable.

The coding agent remains responsible for execution-plane work. The controller
never pretends it can semantically decide whether an unknown business
requirement is correct.

## 2. Control plane vs execution plane

| | Control plane | Execution plane |
|---|---|---|
| **Identity** | `@fastfood/dev-controller` package (CLI + state) | Coding agent (Cursor, the active AI coding environment / human owner) |
| **Domain** | authorization, FSM, retry budget, scope, evidence | code inspection, implementation, diagnosis, repair, tests |
| **Outputs** | machine-readable state JSON + structured `ControllerResult` | code changes + verification command outputs |
| **Decision power** | validation against contracts; never semantically chooses | proposes and executes |

The two planes are kept separate by design. The controller exposes only the
smallest API surface needed to record and gate transitions.

## 3. Authorization model

The controller never uses only its private state to decide authorization.
The single source of truth is `PROJECT_STATUS.md`.

- The controller reads the canonical view (`Phase 0 status`, `Phase 1
  authorization`, `Current mode`, `Deployment`, `Production`,
  `Autonomous execution`, `Next authorized repository task`) from
  `PROJECT_STATUS.md` on every mutation.
- Every implementation-related transition validates the requested phase
  against `PROJECT_STATUS.md` first.
- Human-owned fields (`Current mode`, `Deployment`, `Production`,
  `Phase 1 authorization`, `Human acceptance`, `Autonomous execution`) are
  read-only from the controller's perspective.

Consequence: for the bootstrap state, `Phase 1` is `NOT AUTHORIZED`. Any
synthetic attempt to begin Phase 1 work must be rejected. The synthetic
test in `src/tests/03-authz-block.test.ts` enforces this.

## 4. State machine

The controller exposes a closed finite-state machine for work items:

```
PENDING → IN_PROGRESS → VERIFYING → TECHNICALLY_COMPLETE
PENDING → IN_PROGRESS → VERIFYING → REPAIR_REQUIRED → IN_PROGRESS
PENDING → IN_PROGRESS → VERIFYING → REPAIR_REQUIRED → BLOCKED
PENDING → IN_PROGRESS → VERIFYING → BLOCKED
*                       → BLOCKED

Intermediate phase boundary (PHASE_BOUNDARY_REACHED):
TECHNICALLY_COMPLETE     → READY_FOR_NEXT_PHASE_AUTHORIZATION
REPAIR_REQUIRED           → READY_FOR_NEXT_PHASE_AUTHORIZATION
BLOCKED                  → READY_FOR_NEXT_PHASE_AUTHORIZATION
*                        → READY_FOR_NEXT_PHASE_AUTHORIZATION (intermediate)
READY_FOR_NEXT_PHASE_AUTHORIZATION → PENDING  (next phase begun → reset)

Final project gate (PROJECT_HUMAN_GATE):
TECHNICALLY_COMPLETE     → HUMAN_REVIEW_REQUIRED
BLOCKED                  → HUMAN_REVIEW_REQUIRED
HUMAN_REVIEW_REQUIRED    → PENDING  (human-unblocked → reset)
```

### Gate taxonomy

The controller distinguishes four gate kinds:

| Gate | Meaning | Blocking? |
|---|---|---|
| `TECHNICAL_PHASE_GATE` | Default internal discriminator | No |
| `OWNER_NEXT_PHASE_AUTHORIZATION_GATE` | Intermediate phase boundary; wait only for next-phase authorization | Owner-only authorization (no human testing) |
| `FINAL_PROJECT_HUMAN_GATE` | Final project human gate; all planned development phases technically complete | Human testing becomes blocking |

The runtime state records `phaseGateKind` so that the same state machine can encode intermediate vs final-project semantics without overloading the human-gate flag.

### Allowed transitions

- `null → PENDING`
- `PENDING → IN_PROGRESS`
- `IN_PROGRESS → VERIFYING`
- `VERIFYING → TECHNICALLY_COMPLETE`
- `VERIFYING → REPAIR_REQUIRED`
- `VERIFYING → BLOCKED`
- `REPAIR_REQUIRED → IN_PROGRESS`
- `REPAIR_REQUIRED → BLOCKED`
- `TECHNICALLY_COMPLETE → READY_FOR_NEXT_PHASE_AUTHORIZATION`
- `TECHNICALLY_COMPLETE → HUMAN_REVIEW_REQUIRED` (final gate only)
- `BLOCKED → READY_FOR_NEXT_PHASE_AUTHORIZATION`
- `BLOCKED → HUMAN_REVIEW_REQUIRED` (final gate only)
- `READY_FOR_NEXT_PHASE_AUTHORIZATION → PENDING` (next phase begun → reset)
- `HUMAN_REVIEW_REQUIRED → PENDING` (human-unblocked → reset)

### Forbidden transitions (rejected by the controller)

- `BLOCKED → IN_PROGRESS` without explicit human reset.
- `READY_FOR_NEXT_PHASE_AUTHORIZATION → IN_PROGRESS` (or any non-PENDING state).
- `HUMAN_REVIEW_REQUIRED → IN_PROGRESS` (or any non-PENDING state).
- `READY_FOR_NEXT_PHASE_AUTHORIZATION` / `HUMAN_REVIEW_REQUIRED` → next-phase
  (the controller does not advance phases).
- `TECHNICALLY_COMPLETE → IN_PROGRESS` (no rewind to retry).
- Any self-loop.
- `null → IN_PROGRESS` (must pass through `PENDING` first).

### Phase boundary semantics

`phaseBoundaryReached = true` means:

- All current-phase technical work is complete.
- All automated gates passed.
- No next-phase work may begin without explicit owner authorization.

For an intermediate phase, the controller records:

```
currentWorkItemState = READY_FOR_NEXT_PHASE_AUTHORIZATION
phaseBoundaryReached = true
phaseGateKind = OWNER_NEXT_PHASE_AUTHORIZATION_GATE
humanGateRequired = false
humanAcceptanceDeferred = true
```

For the final project, the controller records:

```
currentWorkItemState = HUMAN_REVIEW_REQUIRED
phaseBoundaryReached = true
phaseGateKind = FINAL_PROJECT_HUMAN_GATE
humanGateRequired = true
humanAcceptanceDeferred = false
```

The runtime schema rejects cross-pollination: `HUMAN_REVIEW_REQUIRED`
is only valid with `phaseGateKind = FINAL_PROJECT_HUMAN_GATE`, and
`READY_FOR_NEXT_PHASE_AUTHORIZATION` is only valid with
`phaseGateKind = OWNER_NEXT_PHASE_AUTHORIZATION_GATE` / `TECHNICAL_PHASE_GATE`.

## 5. Work manifests

A work manifest is a version-controlled JSON document that declares an
authorized task. Manifests live under `.fastfood-controller/manifests/<id>.json`
in the synthetic bootstrap; future authorized phases will store real manifests
under the same convention.

A manifest has at minimum:

```ts
{
  id: string;               // work item id (matches runtime state.currentWorkItemId)
  phase: string;            // must match a phase authorized in PROJECT_STATUS.md
  title: string;
  objective: string;
  contractReferences: string[];
  dependencies: string[];
  allowedPaths: string[];   // repo-relative globs; at least one must be set or
  forbiddenPaths: string[]; // forbiddenPaths must be set (default-deny forbidden)
  verificationCommands: string[]; // each ≤ 2048 chars, no newlines, no absolute cd paths
  maxRepairAttempts: number; // 0..10, default 3
  requiresHumanAcceptance: boolean; // default true
  status: 'ACTIVE' | 'DEPRECATED'; // default 'ACTIVE'
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  evidenceRequirements?: string[];
}
```

Runtime state never mutates the manifest. The manifest is the canonical
definition; the controller enforces it.

## 6. Retry / self-healing policy

`maxRepairAttempts` is configurable per manifest. The default is **3**.

Each `VERIFYING → REPAIR_REQUIRED` transition increments the attempt count.
When `attempt < maxAttempts`, the controller may enter `REPAIR_REQUIRED`
and then re-enter `IN_PROGRESS` on the next cycle. When `attempt >=
maxAttempts`, the controller forces `BLOCKED` and never retries without
explicit human reset.

Attempts are never auto-reset. Human reset must be a separate transition
(`HUMAN_REVIEW_REQUIRED → PENDING`).

## 7. Failure classification

The controller accepts only the closed vocabulary:

```
ROUTINE_IMPLEMENTATION_FAILURE    RETRYABLE
VERIFICATION_FAILURE              RETRYABLE
SCOPE_VIOLATION                    RETRYABLE
AUTHORIZATION_FAILURE             HARD_STOP
CONTRACT_CONFLICT                  HARD_STOP
ARCHITECTURE_DECISION_REQUIRED     HARD_STOP
DEPENDENCY_APPROVAL_REQUIRED       HARD_STOP
DESTRUCTIVE_OPERATION_REQUIRED    HARD_STOP
DEPLOYMENT_OPERATION_BLOCKED       HARD_STOP
PHASE_BOUNDARY_REACHED             HARD_STOP (intermediate phase → READY_FOR_NEXT_PHASE_AUTHORIZATION)
PROJECT_HUMAN_GATE                 HARD_STOP (final project → HUMAN_REVIEW_REQUIRED)
RETRY_BUDGET_EXHAUSTED             HARD_STOP
UNKNOWN_UNSAFE_FAILURE             HARD_STOP (fails closed)
```

Every class is RETRYABLE xor HARD_STOP — checked in
`src/tests/99-fsm-classification.test.ts`.

The controller does NOT use AI inference to invent classifications. The
execution agent supplies one of the allowed values; the controller validates
the resulting transition.

## 8. Verification evidence

A verification gate may be marked PASS only when evidence is supplied:

```ts
{
  command: string;          // required, ≤ 2048 chars, no newlines, no absolute cd paths
  startedAt: string;        // ISO 8601 UTC
  finishedAt: string;       // ISO 8601 UTC
  exitCode: number;         // 0..255
  result: 'PASS' | 'FAIL' | 'NOT_RUN';
  summary?: string;
  evidenceFile?: string;    // optional larger-log reference (relative path)
}
```

The controller rejects:

- `PASS` with `exitCode !== 0`.
- `PASS` with empty `command` (proves the gate did not actually run).
- Any record that fails Zod schema validation.

Evidence files are stored at
`.fastfood-controller/evidence/<workItemId>/evidence-<finishedAt>.json` for
resume/debug. The controller keeps the state file tiny — no large logs.

## 9. Checkpoint / resume

The controller supports safe resume after Cursor restart, terminal restart,
or model context loss. A checkpoint file is written at
`.fastfood-controller/checkpoint-<capturedAt>.json` and contains:

```ts
{
  schemaVersion, controllerVersion, executionMode,
  currentPhase, phaseAuthorization,
  currentWorkItemId, currentWorkItemState, attempt,
  lastVerificationResult, humanGateRequired, capturedAt
}
```

Every mutable state write is atomic (write to `*.tmp-<pid>-<seq>` then
`rename`). No partial state files are observable. No daemon is required.

The CLI does not need to be restarted. A future agent / session may invoke
the CLI again at any time and resume from the persisted state.

## 10. Concurrency guard

A POSIX-friendly repository-local lockfile at `.fastfood-controller/LOCK`
prevents two concurrent invocations from corrupting state.

- The lock holds the owner PID + acquired timestamp.
- Stale locks (owner PID no longer alive) are auto-broken.
- Lock acquisition failure is reported as a failure (`LOCK_BUSY` /
  `LockBusyError`) and never corrupts state.

## 11. Phase boundary / human gate

The controller exposes two distinct gates that both stop the
autonomous loop, but with very different meaning.

### Intermediate phase gate

When the controller records `PHASE_BOUNDARY_REACHED` it enters:

```
currentWorkItemState = READY_FOR_NEXT_PHASE_AUTHORIZATION
phaseBoundaryReached = true
phaseGateKind        = OWNER_NEXT_PHASE_AUTHORIZATION_GATE
humanGateRequired    = false
humanAcceptanceDeferred = true
```

The autonomous loop STOPS, but only for explicit owner authorization
of the next phase. **Human testing is NOT requested at intermediate
phase boundaries.** The owner may authorize Phase N+1 only after
every planned development phase is technically complete; until then,
the controller waits.

### Final project gate

When the controller records `PROJECT_HUMAN_GATE` (only when every
planned development phase is technically complete) it enters:

```
currentWorkItemState = HUMAN_REVIEW_REQUIRED
phaseBoundaryReached = true
phaseGateKind        = FINAL_PROJECT_HUMAN_GATE
humanGateRequired    = true
humanAcceptanceDeferred = false
```

Only here does the autonomous loop STOPS for human testing. The owner
must now perform human validation (visual fidelity, accessibility,
cross-platform flows, integration behavior) and may record
`PHASE_HUMAN_ACCEPTED = YES` (final project only).

### What the controller does NOT do

- It never authorizes the next phase on its own.
- It never writes `HUMAN_ACCEPTED = YES`.
- It never mutates `PROJECT_STATUS.md` automatically.
- It never generates next-phase work.
- It never interprets a phase boundary as a request for human
  testing — that is reserved for the final project gate.

Synthetic proof: `src/tests/14-25-cli.test.ts` (test 20) and
`src/tests/99-fsm-classification.test.ts` verify that
`PHASE_BOUNDARY_REACHED` lands in `READY_FOR_NEXT_PHASE_AUTHORIZATION`
and that no `start-next-phase` / `auto-authorize` command exists.

The CLI exposes exactly these commands:

```
help, status, validate, init, begin, verify, repair, complete, block,
checkpoint, advance, release
```

## 12. CLI

| Command | Required args | Effect |
|---|---|---|
| `help` | — | Print usage. |
| `status` | — | Print current state + next-allowed transition. |
| `validate` | — | Run invariant checks; non-zero exit on failure. |
| `init` | `--phase <PHASE>`, `--max-attempts <N>` (optional, default 3) | Initialize runtime state for an authorized phase. |
| `begin` | `--work-item <ID>`, `--manifest <path>` (optional if in `.fastfood-controller/manifests/`), `--changed <p>...` (optional) | Start a work item if authorized and within scope. |
| `verify` | `--evidence '<json>'` | Record evidence for the current work item. |
| `repair` | `--failure <CLASS>` | Record a failure; controller computes next state. |
| `complete` | `--evidence '<json>'` | Mark current work item `TECHNICALLY_COMPLETE`. |
| `block` | `--force` | Force `BLOCKED` from an FSM-supported state. |
| `checkpoint` | — | Write a checkpoint file. |

Every mutating command supports `--dry-run` (validates + shows intended
state change without writing).

Every command supports `--json` for machine-readable output.

There is **no** command that bypasses human gates or auto-advances the phase.

Root scripts: `pnpm controller:<sub>` (see root `package.json`).

## 13. Recovery

If runtime state is missing, corrupted, or cannot be validated against the
schema, the controller refuses to use it and reports `STATE_MISSING` /
`STATE_CORRUPTED`. The operator must intervene (human reset or fresh
`init`). The controller never invents or guesses.

If the lockfile is stale (owning PID dead), it is auto-broken. If the
lockfile is held by a live process, the controller reports `LOCK_BUSY`.

## 14. Invariants

- `controllerArmed` is `true` ONLY when
  `executionMode === 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT'` AND the
  `Project autonomous execution = AUTHORIZED` row is present in
  `PROJECT_STATUS.md`. Under `DEVELOPMENT_ONLY_HUMAN_VALIDATION`,
  `controllerArmed` is forced to `false`.
- Human-owned fields of `PROJECT_STATUS.md` are read-only.
- `PHASE_1` is never auto-authorized by the controller.
- No CLI subcommand mutates deployment / production fields.
- `PHASE_DEPLOYMENT` / `PHASE_RELEASE` / `PHASE_PRODUCTION` /
  `AUTONOMOUS_ARM` are NEVER authorized regardless of any project-level
  flag.
- Failure classifications are RETRYABLE xor HARD_STOP.
- `PASS` evidence requires `exitCode === 0` and non-empty `command`.
- Stale locks auto-break; live locks block without corruption.
- No unbounded loop, no background daemon, no network I/O, no telemetry.

## 15. Non-goals

The controller is NOT:

- a deployment / release automation,
- a business-rule invention engine,
- an architecture decision maker,
- a human acceptance surrogate,
- a phase auto-advance controller,
- an infinite autonomous loop.

All of the above are explicitly out of scope. The controller enforces
gates; it does not invent actions.

## 16. Repository location

- **Workspace package:** `packages/dev-controller/`
- **CLI entrypoint:** `src/cli.ts`
- **State root:** `.fastfood-controller/` (gitignored)
- **Manifest root:** `.fastfood-controller/manifests/` (gitignored)
- **Evidence root:** `.fastfood-controller/evidence/` (gitignored)
- **Lockfile:** `.fastfood-controller/LOCK` (gitignored)

The package is `private: true`, has no `main` / `exports` / `dist`, and is
consumed source-only. It is NOT a runtime dependency of any app or shared
business package. Verified by `pnpm list --depth=0` showing zero reverse
dependencies on `@fastfood/dev-controller` from `apps/*` or any business
`packages/*`.

## 17. Cursor rule integration

The four `.cursor/rules/*.mdc` files are unchanged. They reference this
document. No new rule was added during the bootstrap because the existing
`30-verification-and-stop-gates.mdc` already enforces the no-fake-PASS
discipline that the controller relies on. The controller is referenced
from `PROJECT_STATUS.md` as the upcoming `AUTONOMOUS_CONTROLLER_HUMAN_VALIDATION`
task.

## 18. Arming model

```
CONTROLLER_INSTALLED         = YES
CONTROLLER_VALIDATED          = YES
CONTROLLER_HUMAN_ACCEPTED     = YES
EXECUTION_MODE                = FULL_PROJECT_AUTONOMOUS_DEVELOPMENT
                               (per PROJECT_STATUS row, 2026-09-18)
PROJECT_AUTONOMOUS_EXECUTION  = AUTHORIZED
CONTROLLER_ARMED              = YES
DEPLOYMENT_AUTHORIZED         = NO
PRODUCTION_ACTIVE             = NO
```

The controller is armed when the human owner records
`Project autonomous execution = AUTHORIZED` in `PROJECT_STATUS.md`
and the `init` / `arm` CLI commands are invoked with
`--execution-mode FULL_PROJECT_AUTONOMOUS_DEVELOPMENT` /
`--arm`. Arming never equals deployment authorization.
