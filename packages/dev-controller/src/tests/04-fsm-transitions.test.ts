import { describe, expect, it } from 'vitest';

import { isTransitionAllowed, forbiddenTransitions } from '../state.js';
import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir } from './helpers.js';

describe('4. authorized synthetic work item begins', () => {
  const t = useTmpStateDir();
  it('PENDING → IN_PROGRESS after begin', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    const manifest = {
      id: 'TEST-001',
      phase: 'PHASE_0',
      title: 'synthetic test',
      objective: 'prove FSM begin flow',
      contractReferences: [],
      dependencies: [],
      allowedPaths: ['packages/**'],
      forbiddenPaths: [],
      verificationCommands: ['echo ok'],
      maxRepairAttempts: 3,
      requiresHumanAcceptance: false,
      status: 'ACTIVE' as const,
    };
    const r = await store.beginWorkItem({ manifest, changedPaths: [] });
    expect(r.ok).toBe(true);
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemId).toBe('TEST-001');
    expect(loaded.state!.currentWorkItemState).toBe('PENDING');
  });

  it('verify allows advance PENDING → IN_PROGRESS → VERIFYING', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    const manifest = {
      id: 'TEST-002',
      phase: 'PHASE_0',
      title: 'synthetic',
      objective: 'transitions',
      contractReferences: [],
      dependencies: [],
      allowedPaths: ['packages/**'],
      forbiddenPaths: [],
      verificationCommands: ['echo ok'],
      maxRepairAttempts: 3,
      requiresHumanAcceptance: false,
      status: 'ACTIVE' as const,
    };
    await store.beginWorkItem({ manifest, changedPaths: [] });
    // PENDING → IN_PROGRESS is allowed.
    expect(isTransitionAllowed('PENDING', 'IN_PROGRESS')).toBe(true);
    const r1 = await store.advanceTo({ to: 'IN_PROGRESS' });
    expect(r1.ok).toBe(true);
    const r2 = await store.advanceTo({ to: 'VERIFYING' });
    expect(r2.ok).toBe(true);
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemState).toBe('VERIFYING');
  });

  it('forbidden transitions are listed and rejected', () => {
    const list = forbiddenTransitions();
    // Spot-check: BLOCKED → IN_PROGRESS must be forbidden.
    expect(list.some((t) => t.from === 'BLOCKED' && t.to === 'IN_PROGRESS')).toBe(true);
    // HUMAN_REVIEW_REQUIRED → IN_PROGRESS must be forbidden.
    expect(list.some((t) => t.from === 'HUMAN_REVIEW_REQUIRED' && t.to === 'IN_PROGRESS')).toBe(
      true,
    );
    // TECHNICALLY_COMPLETE → IN_PROGRESS must be forbidden.
    expect(list.some((t) => t.from === 'TECHNICALLY_COMPLETE' && t.to === 'IN_PROGRESS')).toBe(
      true,
    );
  });

  it('5. invalid state transition rejected', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    const manifest = {
      id: 'TEST-003',
      phase: 'PHASE_0',
      title: 'synthetic',
      objective: 'invalid transition',
      contractReferences: [],
      dependencies: [],
      allowedPaths: ['packages/**'],
      forbiddenPaths: [],
      verificationCommands: ['echo ok'],
      maxRepairAttempts: 3,
      requiresHumanAcceptance: false,
      status: 'ACTIVE' as const,
    };
    await store.beginWorkItem({ manifest, changedPaths: [] });
    // PENDING → TECHNICALLY_COMPLETE is forbidden.
    const r = await store.advanceTo({ to: 'TECHNICALLY_COMPLETE' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('INVALID_TRANSITION');
  });
});
