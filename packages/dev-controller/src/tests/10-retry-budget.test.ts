import { describe, expect, it } from 'vitest';

import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir } from './helpers.js';

describe('10. retry budget exhaustion hard-stops', () => {
  const t = useTmpStateDir();
  it('budget=3 → BLOCKED after 3 repair failures', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await store.beginWorkItem({
      manifest: {
        id: 'TEST-BUDGET',
        phase: 'PHASE_0',
        title: 't',
        objective: 'o',
        contractReferences: [],
        dependencies: [],
        allowedPaths: ['packages/**'],
        forbiddenPaths: [],
        verificationCommands: ['echo ok'],
        maxRepairAttempts: 3,
        requiresHumanAcceptance: false,
        status: 'ACTIVE' as const,
      },
      changedPaths: [],
    });
    // Three failed repairs. After 3 successful RETRYABLE repairs, attempt
    // is 3, which exceeds the budget. The controller must record the third
    // failure as FAILURE_RECORDED and transition the state to BLOCKED.
    const r1 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r1.code).toBe('FAILURE_RECORDED');
    const r2 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r2.code).toBe('FAILURE_RECORDED');
    const r3 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r3.code).toBe('FAILURE_RECORDED');
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemState).toBe('BLOCKED');
    expect(loaded.state!.attempt).toBe(3);
  });
});
