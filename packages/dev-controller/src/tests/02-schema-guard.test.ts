import { describe, expect, it } from 'vitest';

import { atomicWriteFile, atomicReadJson } from '../atomic.js';
import { RuntimeStateSchema } from '../schema.js';
import { Store } from '../store.js';

import { syntheticClosedStatus, useTmpStateDir } from './helpers.js';

describe('2. invalid state schema rejected', () => {
  const t = useTmpStateDir();
  it('rejects an unknown top-level field', async () => {
    const dir = t.stateDir();
    const f = `${dir}/state.json`;
    await atomicWriteFile(
      f,
      JSON.stringify(
        {
          schemaVersion: 1,
          controllerVersion: 'broken',
          executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
          currentPhase: 'PHASE_0',
          phaseAuthorization: 'AUTHORIZED',
          controllerArmed: false,
          currentWorkItemId: null,
          currentWorkItemState: null,
          attempt: 0,
          maxAttempts: 3,
          lastTransition: null,
          lastFailureClass: null,
          humanGateRequired: false,
          phaseBoundaryReached: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notAField: 'extra',
        },
        null,
        2,
      ),
    );
    // Direct Zod validation must reject.
    const parsed = RuntimeStateSchema.safeParse(await atomicReadJson(f));
    expect(parsed.success).toBe(false);
  });

  it('rejects controllerArmed !== false during bootstrap', async () => {
    const store = new Store({
      stateDir: t.stateDir(),
      projectStatusView: syntheticClosedStatus(),
      dryRun: false,
    });
    const dir = t.stateDir();
    const f = `${dir}/state.json`;
    await atomicWriteFile(
      f,
      JSON.stringify({
        schemaVersion: 1,
        controllerVersion: 'broken',
        executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
        currentPhase: 'PHASE_0',
        phaseAuthorization: 'AUTHORIZED',
        controllerArmed: true, // ← violation
        currentWorkItemId: null,
        currentWorkItemState: null,
        attempt: 0,
        maxAttempts: 3,
        lastTransition: null,
        lastFailureClass: null,
        humanGateRequired: false,
        phaseBoundaryReached: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    const r = await store.loadState();
    expect(r.ok).toBe(false);
    expect(r.code).toBe('STATE_CORRUPTED');
  });
});
