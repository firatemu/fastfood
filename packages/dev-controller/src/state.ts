import type { FailureClass, WorkItemState } from './schema.js';
import { HARD_STOP_FAILURES, RETRYABLE_FAILURES } from './schema.js';

/**
 * Closed finite-state machine for the controller's work-item lifecycle.
 *
 * Two distinct gate states:
 *
 *   - `READY_FOR_NEXT_PHASE_AUTHORIZATION` — intermediate phase technical
 *     completion. Human testing is deferred until project completion.
 *     Wait only for explicit owner authorization of the next phase.
 *
 *   - `HUMAN_REVIEW_REQUIRED` — FINAL project gate. All planned
 *     development phases are technically complete; the owner must now
 *     perform human testing before project acceptance.
 *
 * Allowed transitions are explicit. Forbidden transitions must fail
 * closed.
 */

type Transition = {
  readonly from: WorkItemState | null;
  readonly to: WorkItemState;
};

const ALLOWED: readonly Transition[] = [
  { from: null, to: 'PENDING' },
  { from: 'PENDING', to: 'IN_PROGRESS' },
  { from: 'PENDING', to: 'REPAIR_REQUIRED' },
  { from: 'PENDING', to: 'BLOCKED' },
  { from: 'PENDING', to: 'READY_FOR_NEXT_PHASE_AUTHORIZATION' },
  { from: 'PENDING', to: 'HUMAN_REVIEW_REQUIRED' },
  { from: 'IN_PROGRESS', to: 'VERIFYING' },
  { from: 'IN_PROGRESS', to: 'REPAIR_REQUIRED' },
  { from: 'IN_PROGRESS', to: 'BLOCKED' },
  { from: 'IN_PROGRESS', to: 'READY_FOR_NEXT_PHASE_AUTHORIZATION' },
  { from: 'IN_PROGRESS', to: 'HUMAN_REVIEW_REQUIRED' },
  { from: 'VERIFYING', to: 'TECHNICALLY_COMPLETE' },
  { from: 'VERIFYING', to: 'REPAIR_REQUIRED' },
  { from: 'VERIFYING', to: 'BLOCKED' },
  { from: 'VERIFYING', to: 'READY_FOR_NEXT_PHASE_AUTHORIZATION' },
  { from: 'VERIFYING', to: 'HUMAN_REVIEW_REQUIRED' },
  { from: 'REPAIR_REQUIRED', to: 'IN_PROGRESS' },
  { from: 'REPAIR_REQUIRED', to: 'BLOCKED' },
  { from: 'TECHNICALLY_COMPLETE', to: 'READY_FOR_NEXT_PHASE_AUTHORIZATION' },
  { from: 'TECHNICALLY_COMPLETE', to: 'HUMAN_REVIEW_REQUIRED' },
  { from: 'BLOCKED', to: 'READY_FOR_NEXT_PHASE_AUTHORIZATION' },
  { from: 'BLOCKED', to: 'HUMAN_REVIEW_REQUIRED' },
  { from: 'READY_FOR_NEXT_PHASE_AUTHORIZATION', to: 'PENDING' }, // next phase begun → reset
  { from: 'HUMAN_REVIEW_REQUIRED', to: 'PENDING' }, // human-unblocked → reset
  // Forbidden: any gate state → NEXT_PHASE / any non-PENDING state. Phase
  // advance must be a separate authorized task recorded in
  // PROJECT_STATUS.md.
];

const ALLOWED_FROM_TO = new Map<string, true>();
for (const t of ALLOWED) {
  ALLOWED_FROM_TO.set(`${t.from ?? '__null__'}→${t.to}`, true);
}

export function isTransitionAllowed(from: WorkItemState | null, to: WorkItemState): boolean {
  return ALLOWED_FROM_TO.has(`${from ?? '__null__'}→${to}`) ?? false;
}

/**
 * Forbidden transition matrix for diagnostics + tests.
 */
export function forbiddenTransitions(): readonly {
  from: WorkItemState | null;
  to: WorkItemState;
}[] {
  const all: { from: WorkItemState | null; to: WorkItemState }[] = [];
  const states: (WorkItemState | null)[] = [
    null,
    'PENDING',
    'IN_PROGRESS',
    'VERIFYING',
    'REPAIR_REQUIRED',
    'TECHNICALLY_COMPLETE',
    'BLOCKED',
    'READY_FOR_NEXT_PHASE_AUTHORIZATION',
    'HUMAN_REVIEW_REQUIRED',
  ];
  const targets: WorkItemState[] = [
    'PENDING',
    'IN_PROGRESS',
    'VERIFYING',
    'REPAIR_REQUIRED',
    'TECHNICALLY_COMPLETE',
    'BLOCKED',
    'READY_FOR_NEXT_PHASE_AUTHORIZATION',
    'HUMAN_REVIEW_REQUIRED',
  ];
  for (const from of states) {
    for (const to of targets) {
      if (from === to) continue;
      if (!isTransitionAllowed(from, to)) {
        all.push({ from, to });
      }
    }
  }
  return all;
}

/**
 * Classify a failure and return the next state.
 * Uses the closed retry/failure vocabulary — no AI inference.
 *
 * The caller (`recordFailure` in store.ts) increments `attempt` only when
 * `retryable` is true. The "budget exhausted" condition is therefore
 * `attempt + 1 > maxAttempts`: this is the call that would push the
 * counter past the limit.
 */
export function nextStateAfterFailure(
  from: WorkItemState,
  failureClass: FailureClass,
  attempt: number,
  maxAttempts: number,
): { next: WorkItemState; retryable: boolean } {
  if (!RETRYABLE_FAILURES.has(failureClass) && !HARD_STOP_FAILURES.has(failureClass)) {
    // Unknown / unsafe classification → fail closed.
    return { next: 'BLOCKED', retryable: false };
  }

  // Phase-boundary and gate markers are always HARD_STOP and must be
  // evaluated FIRST so they always win over the budget check.
  if (HARD_STOP_FAILURES.has(failureClass)) {
    if (failureClass === 'PHASE_BOUNDARY_REACHED') {
      // Intermediate phase boundary → owner next-phase authorization gate.
      return { next: 'READY_FOR_NEXT_PHASE_AUTHORIZATION', retryable: false };
    }
    if (failureClass === 'PROJECT_HUMAN_GATE') {
      // Final project gate → owner human testing gate.
      return { next: 'HUMAN_REVIEW_REQUIRED', retryable: false };
    }
    return { next: 'BLOCKED', retryable: false };
  }

  // RETRYABLE: honor budget. The call that consumes the last remaining
  // retry budget transitions to BLOCKED. After this call, retryable=false
  // and attempt is set to maxAttempts.
  if (attempt + 1 >= maxAttempts) {
    return { next: 'BLOCKED', retryable: false };
  }

  // From REPAIR_REQUIRED the next state must be IN_PROGRESS (retry),
  // not REPAIR_REQUIRED (no self-loop in the FSM).
  if (from === 'REPAIR_REQUIRED') {
    return { next: 'IN_PROGRESS', retryable: true };
  }
  return { next: 'REPAIR_REQUIRED', retryable: true };
}
