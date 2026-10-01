import { describe, expect, it } from 'vitest';

import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir } from './helpers.js';

describe('1. valid state initialization', () => {
  const t = useTmpStateDir();
  it('initializes runtime state for an authorized phase', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    const r = await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    expect(r.ok).toBe(true);
    const loaded = await store.loadState();
    expect(loaded.ok).toBe(true);
    expect(loaded.state!.currentPhase).toBe('PHASE_0');
    expect(loaded.state!.attempt).toBe(0);
    expect(loaded.state!.maxAttempts).toBe(3);
  });

  it('initialize is idempotent and does not overwrite existing state', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    const r1 = await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    expect(r1.ok).toBe(true);
    const r2 = await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 7 });
    expect(r2.code).toBe('STATE_EXISTS');
    const loaded = await store.loadState();
    expect(loaded.state!.maxAttempts).toBe(3);
  });
});
