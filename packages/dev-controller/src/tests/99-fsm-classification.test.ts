import { describe, expect, it } from 'vitest';

import { HARD_STOP_FAILURES, RETRYABLE_FAILURES, FailureClasses } from '../schema.js';
import { nextStateAfterFailure } from '../state.js';

describe('classification correctness (additional safety)', () => {
  it('every failure class is RETRYABLE xor HARD_STOP', () => {
    for (const fc of FailureClasses) {
      const r = RETRYABLE_FAILURES.has(fc);
      const h = HARD_STOP_FAILURES.has(fc);
      expect(r !== h).toBe(true); // exactly one of them
    }
  });

  it('PHASE_BOUNDARY_REACHED lands intermediate phases in READY_FOR_NEXT_PHASE_AUTHORIZATION', () => {
    for (const from of [
      'PENDING',
      'IN_PROGRESS',
      'VERIFYING',
      'REPAIR_REQUIRED',
      'TECHNICALLY_COMPLETE',
      'BLOCKED',
      'READY_FOR_NEXT_PHASE_AUTHORIZATION',
    ] as const) {
      const r = nextStateAfterFailure(from, 'PHASE_BOUNDARY_REACHED', 0, 3);
      expect(r.next).toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
      expect(r.retryable).toBe(false);
    }
  });

  it('PROJECT_HUMAN_GATE lands the final project in HUMAN_REVIEW_REQUIRED', () => {
    for (const from of [
      'PENDING',
      'IN_PROGRESS',
      'VERIFYING',
      'REPAIR_REQUIRED',
      'TECHNICALLY_COMPLETE',
      'BLOCKED',
    ] as const) {
      const r = nextStateAfterFailure(from, 'PROJECT_HUMAN_GATE', 0, 3);
      expect(r.next).toBe('HUMAN_REVIEW_REQUIRED');
      expect(r.retryable).toBe(false);
    }
  });

  it('unknown classification falls closed to BLOCKED', () => {
    // Type system prevents this at compile time, but the runtime guard
    // for any future failure class is BLOCKED + not-retryable.
    const result = nextStateAfterFailure('VERIFYING', 'UNKNOWN_UNSAFE_FAILURE' as never, 0, 3);
    expect(result.next).toBe('BLOCKED');
    expect(result.retryable).toBe(false);
  });
});
