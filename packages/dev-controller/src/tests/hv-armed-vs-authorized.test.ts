/**
 * CRITICAL NEGATIVE TEST — proves that the autonomous controller
 * "armed" state is independent of "phase authorized" state.
 *
 * Invariant: ARMED + PHASE_1_AUTHORIZED=NO → PHASE_1 WORK DENIED.
 *
 * This test does NOT modify any real controller state. It uses a
 * synthetic ProjectStatusView that mirrors the project table exactly.
 */
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { isPhaseAuthorized, type ProjectStatusView } from '../authz.js';
import { Store } from '../store.js';

function isolated(): string {
  const d = mkdtempSync(path.join(tmpdir(), 'ff-armed-vs-authz-'));
  mkdirSync(path.join(d, 'manifests'), { recursive: true });
  mkdirSync(path.join(d, 'evidence'), { recursive: true });
  return d;
}

/**
 * Build a synthetic ProjectStatusView that mirrors the real
 * PROJECT_STATUS.md EXACTLY: ARMED + Phase 1 NOT AUTHORIZED.
 *
 * This view is what the controller sees when reading PROJECT_STATUS.md
 * after the human-owner acceptance step has flipped
 * `Autonomous execution` to `ARMED`. Phase 1 authorization is still
 * `NOT AUTHORIZED`.
 */
function armedButPhase1NotAuthorized(): ProjectStatusView {
  return {
    rawPath: '<synthetic>',
    executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
    deployment: 'PROHIBITED / DEFERRED',
    production: 'NOT ACTIVE',
    phase0Status: 'ACCEPTED / CLOSED',
    phase0HumanAcceptance: 'PASS',
    phase1Status: 'NOT STARTED',
    phase1Authorization: 'NOT AUTHORIZED',
    phase2Status: 'NOT STARTED',
    phase2Authorization: 'NOT AUTHORIZED',
    humanAcceptance: 'PASS',
    // ARMED — this is the only field that changed.
    autonomousExecution: 'ARMED',
    nextAuthorizedTask: 'PHASE_1_AUTONOMOUS_EXECUTION_PREPARATION',
    autonomousController: 'INSTALLED / VALIDATED / HUMAN ACCEPTED',
    fatal: null,
  };
}

describe('ARMED != AUTHORIZED — Phase 1 still denied', () => {
  it('isPhaseAuthorized() rejects PHASE_1 even when autonomous execution is ARMED', () => {
    const view = armedButPhase1NotAuthorized();
    const r = isPhaseAuthorized(view, 'PHASE_1');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
  });

  it('Store.initializeIfMissing({ phase: "PHASE_1" }) is rejected even when ARMED', async () => {
    const dir = isolated();
    try {
      const view = armedButPhase1NotAuthorized();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      const r = await store.initializeIfMissing({ phase: 'PHASE_1', maxAttempts: 3 });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('AUTHORIZATION_FAILURE');
      // No real state file written.
      expect(
        (() => {
          try {
            readFileSync(path.join(dir, 'state.json'), 'utf8');
            return true;
          } catch {
            return false;
          }
        })(),
      ).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Synthetic PHASE_1 manifest is rejected at begin even when ARMED', async () => {
    const dir = isolated();
    try {
      const view = armedButPhase1NotAuthorized();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      // PHASE_0 init succeeds — proves ARMED did not break normal flow.
      const init = await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
      expect(init.ok).toBe(true);
      // A PHASE_1 manifest attempted against a PHASE_0 controller state is
      // rejected by manifest-phase-vs-controller-phase consistency.
      const r = await store.beginWorkItem({
        manifest: {
          id: 'PHASE_1_SYNTHETIC',
          phase: 'PHASE_1',
          title: 'synthetic PHASE_1 attempt',
          objective: 'must be rejected even when ARMED',
          contractReferences: [],
          dependencies: [],
          allowedPaths: ['packages/**'],
          forbiddenPaths: [],
          verificationCommands: ['echo ok'],
          maxRepairAttempts: 3,
          requiresHumanAcceptance: true,
          status: 'ACTIVE',
        },
        changedPaths: [],
      });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('AUTHORIZATION_FAILURE');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ARMED controller still does NOT mutate PROJECT_STATUS or real state', async () => {
    const dir = isolated();
    try {
      const view = armedButPhase1NotAuthorized();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      // Multiple denied operations should never write the controller
      // state file or attempt to record progress in PROJECT_STATUS.
      await store.initializeIfMissing({ phase: 'PHASE_1', maxAttempts: 3 });
      await store.beginWorkItem({
        manifest: {
          id: 'X',
          phase: 'PHASE_1',
          title: 't',
          objective: 'o',
          contractReferences: [],
          dependencies: [],
          allowedPaths: ['packages/**'],
          forbiddenPaths: [],
          verificationCommands: ['echo ok'],
          maxRepairAttempts: 3,
          requiresHumanAcceptance: true,
          status: 'ACTIVE',
        },
        changedPaths: [],
      });
      // No state file created.
      const stateExists = (() => {
        try {
          readFileSync(path.join(dir, 'state.json'), 'utf8');
          return true;
        } catch {
          return false;
        }
      })();
      expect(stateExists).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
