import { describe, expect, it } from 'vitest';

import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir } from './helpers.js';

const ev = (result: 'PASS' | 'FAIL' | 'NOT_RUN', exitCode: 0) => ({
  command: 'pnpm exec vitest run --reporter=basic',
  startedAt: '2026-09-16T10:00:00.000Z',
  finishedAt: '2026-09-16T10:00:05.000Z',
  exitCode,
  result,
});

describe('6/7/8/9. verification, evidence validity, repair, retry budget', () => {
  const t = useTmpStateDir();
  async function startAt(state: 'IN_PROGRESS' | 'VERIFYING', workItemId = 'TEST-006') {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await store.beginWorkItem({
      manifest: {
        id: workItemId,
        phase: 'PHASE_0',
        title: 'synthetic',
        objective: 'evidence + retry',
        contractReferences: [],
        dependencies: [],
        allowedPaths: ['packages/**'],
        forbiddenPaths: [],
        verificationCommands: ['pnpm exec vitest run --reporter=basic'],
        maxRepairAttempts: 3,
        requiresHumanAcceptance: false,
        status: 'ACTIVE' as const,
      },
      changedPaths: [],
    });
    if (state === 'VERIFYING') {
      await store.advanceTo({ to: 'IN_PROGRESS' });
      await store.advanceTo({ to: 'VERIFYING' });
    } else {
      await store.advanceTo({ to: 'IN_PROGRESS' });
    }
    return store;
  }

  it('6. valid verification PASS recorded', async () => {
    const store = await startAt('VERIFYING');
    const r = await store.completeWorkItem({ evidence: ev('PASS', 0) });
    expect(r.ok).toBe(true);
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemState).toBe('TECHNICALLY_COMPLETE');
  });

  it('7. PASS with non-zero exit code rejected', async () => {
    const store = await startAt('VERIFYING');
    const r = await store.completeWorkItem({ evidence: ev('PASS', 1) });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('EVIDENCE_INVALID');
  });

  it('8. failed verification enters repair state', async () => {
    const store = await startAt('VERIFYING');
    const r = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r.ok).toBe(true);
    expect(r.code).toBe('FAILURE_RECORDED');
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemState).toBe('REPAIR_REQUIRED');
    expect(loaded.state!.attempt).toBe(1);
  });

  it('9. repair attempt increments', async () => {
    const store = await startAt('VERIFYING');
    expect((await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' })).ok).toBe(true);
    expect((await store.loadState()).state!.attempt).toBe(1);
    expect((await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' })).ok).toBe(true);
    expect((await store.loadState()).state!.attempt).toBe(2);
  });
});
