import { describe, expect, it } from 'vitest';

import { isPhaseAuthorized } from '../authz.js';
import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir, writeSyntheticManifest } from './helpers.js';

describe('3. unauthorized phase start rejected', () => {
  it('Phase 1 is rejected even when a manifest file exists', async () => {
    const t = useTmpStateDir();
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    // Pre-create a synthetic Phase 1 manifest. (Synthetic only — no real
    // Phase 1 work, just proves the controller rejects the attempt.)
    writeSyntheticManifest(t.stateDir(), 'PHASE_1_FAKE', {
      id: 'PHASE_1_FAKE',
      phase: 'PHASE_1',
      title: 'synthetic phase 1 attempt',
      objective: 'must be rejected by the controller',
      contractReferences: [],
      dependencies: [],
      allowedPaths: ['packages/api/**'],
      forbiddenPaths: [],
      verificationCommands: ['echo ok'],
      maxRepairAttempts: 3,
      requiresHumanAcceptance: true,
      status: 'ACTIVE',
    });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    // Synthetic phase 1 attempt: must fail at the authorization gate.
    const r = await store.beginWorkItem({
      manifest: {
        id: 'PHASE_1_FAKE',
        phase: 'PHASE_1',
        title: 'synthetic phase 1 attempt',
        objective: 'must be rejected by the controller',
        contractReferences: [],
        dependencies: [],
        allowedPaths: ['packages/api/**'],
        forbiddenPaths: [],
        verificationCommands: ['echo ok'],
        maxRepairAttempts: 3,
        requiresHumanAcceptance: true,
        status: 'ACTIVE',
      },
      changedPaths: ['packages/api/src/main.ts'],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
  });

  it('isPhaseAuthorized() rejects PHASE_1 directly', () => {
    const v = syntheticClosedStatus();
    const r = isPhaseAuthorized(v, 'PHASE_1');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
  });

  it('isPhaseAuthorized() accepts PHASE_0 when closed', () => {
    const v = syntheticClosedStatus();
    const r = isPhaseAuthorized(v, 'PHASE_0');
    expect(r.ok).toBe(true);
  });
});
