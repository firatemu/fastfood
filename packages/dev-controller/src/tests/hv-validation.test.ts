/**
 * HV-* validation harness — operational scenario verification of the
 * Autonomous Development Controller. Drives the controller through 10
 * scenarios (HV-01 … HV-10) and produces per-scenario PASS/FAIL evidence.
 *
 * The harness uses the controller's actual exported APIs:
 *   - `Store` for state-machine transitions
 *   - `isPhaseAuthorized` for authorization
 *   - `validateScope` for scope guard
 *   - synthetic ProjectStatusView for fake authorization context
 *
 * All scenarios run in isolated tmp directories under `/tmp/ff-hv-XXXXXX`.
 * No real controller state (`/home/azem/projects/fastfood/.fastfood-controller/`)
 * or PROJECT_STATUS.md is mutated.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import { isPhaseAuthorized, type ProjectStatusView } from '../authz.js';
import type { Manifest } from '../schema.js';
import { validateScope } from '../scope.js';
import { Store } from '../store.js';

function isolatedDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'ff-hv-'));
}

function syntheticStatus(
  phase0Closed: boolean,
  phase1Auth: 'NOT AUTHORIZED' | 'AUTHORIZED' = 'NOT AUTHORIZED',
): ProjectStatusView {
  return {
    rawPath: '<synthetic>',
    executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
    deployment: 'PROHIBITED / DEFERRED',
    production: 'NOT ACTIVE',
    phase0Status: phase0Closed ? 'ACCEPTED / CLOSED' : 'NOT STARTED',
    phase0HumanAcceptance: phase0Closed ? 'PASS' : 'PENDING',
    phase1Status: 'NOT STARTED',
    phase1Authorization: phase1Auth,
    phase2Status: 'NOT STARTED',
    phase2Authorization: 'NOT AUTHORIZED',
    humanAcceptance: phase0Closed ? 'PASS' : 'PENDING',
    autonomousExecution: 'NOT YET ARMED',
    nextAuthorizedTask: 'AUTONOMOUS_CONTROLLER_HUMAN_VALIDATION',
    autonomousController: 'INSTALLED / VALIDATED',
    fatal: null,
  };
}

function makeManifest(id: string, phase: string, overrides: Partial<Manifest> = {}): Manifest {
  return {
    id,
    phase,
    title: `HV ${id}`,
    objective: `operational validation scenario ${id}`,
    contractReferences: [],
    dependencies: [],
    allowedPaths: ['validation-safe/**'],
    forbiddenPaths: [],
    verificationCommands: ['echo ok'],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    ...overrides,
  };
}

function evidencePass(command = 'echo ok', exitCode = 0) {
  return {
    command,
    startedAt: '2026-09-17T10:00:00.000Z',
    finishedAt: '2026-09-17T10:00:05.000Z',
    exitCode,
    result: 'PASS' as const,
  };
}

describe('HV-01 Unauthorized Phase 1 denial', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('Phase 1 init rejected, status unchanged', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const r = isPhaseAuthorized(view, 'PHASE_1');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
    // Store-level: even if a manifest exists, init must fail closed.
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    const r2 = await store.initializeIfMissing({ phase: 'PHASE_1', maxAttempts: 3 });
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe('AUTHORIZATION_FAILURE');
  });
});

describe('HV-02 Normal synthetic lifecycle', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('PENDING → IN_PROGRESS → VERIFYING → TECHNICALLY_COMPLETE with valid evidence', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    const init = await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    expect(init.ok).toBe(true);
    const begin = await store.beginWorkItem({
      manifest: makeManifest('HV-02', 'PHASE_0', { requiresHumanAcceptance: false }),
      changedPaths: [],
    });
    expect(begin.ok).toBe(true);
    expect((await store.loadState()).state!.currentWorkItemState).toBe('PENDING');
    expect((await store.advanceTo({ to: 'IN_PROGRESS' })).ok).toBe(true);
    expect((await store.advanceTo({ to: 'VERIFYING' })).ok).toBe(true);
    const complete = await store.completeWorkItem({ evidence: evidencePass() });
    expect(complete.ok).toBe(true);
    expect((await store.loadState()).state!.currentWorkItemState).toBe('TECHNICALLY_COMPLETE');
  });
});

describe('HV-03 Failure → repair → recovery', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('VERIFICATION_FAILURE → REPAIR_REQUIRED → IN_PROGRESS → VERIFYING → TECHNICALLY_COMPLETE', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await store.beginWorkItem({
      manifest: makeManifest('HV-03', 'PHASE_0', { requiresHumanAcceptance: false }),
      changedPaths: [],
    });
    await store.advanceTo({ to: 'IN_PROGRESS' });
    await store.advanceTo({ to: 'VERIFYING' });
    const r1 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r1.code).toBe('FAILURE_RECORDED');
    expect((await store.loadState()).state!.currentWorkItemState).toBe('REPAIR_REQUIRED');
    expect((await store.loadState()).state!.attempt).toBe(1);
    // Recovery: re-enter IN_PROGRESS, VERIFYING, complete.
    expect((await store.advanceTo({ to: 'IN_PROGRESS' })).ok).toBe(true);
    expect((await store.advanceTo({ to: 'VERIFYING' })).ok).toBe(true);
    const c = await store.completeWorkItem({ evidence: evidencePass() });
    expect(c.ok).toBe(true);
    expect((await store.loadState()).state!.currentWorkItemState).toBe('TECHNICALLY_COMPLETE');
  });
});

describe('HV-04 Retry budget exhaustion', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('maxAttempts=2 → BLOCKED after 2 RETRYABLE failures; no silent reset', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 2 });
    await store.beginWorkItem({
      manifest: makeManifest('HV-04', 'PHASE_0', {
        requiresHumanAcceptance: false,
        maxRepairAttempts: 2,
      }),
      changedPaths: [],
    });
    await store.advanceTo({ to: 'IN_PROGRESS' });
    await store.advanceTo({ to: 'VERIFYING' });
    const r1 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r1.code).toBe('FAILURE_RECORDED');
    const r2 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r2.code).toBe('FAILURE_RECORDED');
    const loaded = await store.loadState();
    expect(loaded.state!.currentWorkItemState).toBe('BLOCKED');
    expect(loaded.state!.attempt).toBe(2);
    // Further automatic repair attempt must be rejected.
    const r3 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
    expect(r3.ok).toBe(false);
    expect(loaded.state!.attempt).toBe(2); // unchanged
  });
});

describe('HV-05 Scope violation', () => {
  it('out-of-scope path blocks', () => {
    const m = makeManifest('HV-05', 'PHASE_0', {
      allowedPaths: ['validation-safe/**'],
    });
    const r = validateScope(m, ['validation-safe/a.ts', 'other-path/b.ts']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.some((v) => v.reason === 'OUTSIDE_ALLOWED')).toBe(true);
  });
  it('explicit forbidden path blocks', () => {
    const m = makeManifest('HV-05b', 'PHASE_0', {
      allowedPaths: ['validation-safe/**'],
      forbiddenPaths: ['validation-safe/never-touch.ts'],
    });
    const r = validateScope(m, ['validation-safe/never-touch.ts']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.some((v) => v.reason === 'FORBIDDEN')).toBe(true);
  });
});

describe('HV-06 Checkpoint / resume', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('a fresh Store instance reads persisted state (resume)', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    // First "session": init + begin.
    const s1 = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await s1.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await s1.beginWorkItem({
      manifest: makeManifest('HV-06', 'PHASE_0', { requiresHumanAcceptance: false }),
      changedPaths: [],
    });
    const cp = await s1.checkpoint();
    expect(cp.ok).toBe(true);
    // Second "session": fresh Store instance.
    const s2 = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    const loaded = await s2.loadState();
    expect(loaded.ok).toBe(true);
    expect(loaded.state!.currentWorkItemId).toBe('HV-06');
    expect(loaded.state!.currentWorkItemState).toBe('PENDING');
    expect(loaded.state!.currentPhase).toBe('PHASE_0');
    expect(loaded.state!.attempt).toBe(0);
  });
});

describe('HV-07 Intermediate phase boundary stops for next-phase authorization', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('PHASE_BOUNDARY_REACHED → READY_FOR_NEXT_PHASE_AUTHORIZATION; controller STOPS without human gate', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await store.beginWorkItem({
      manifest: makeManifest('HV-07', 'PHASE_0'),
      changedPaths: [],
    });
    const r = await store.recordFailure({ failureClass: 'PHASE_BOUNDARY_REACHED' });
    expect(r.ok).toBe(true);
    const s = await store.loadState();
    expect(s.state!.currentWorkItemState).toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
    expect(s.state!.phaseBoundaryReached).toBe(true);
    expect(s.state!.humanGateRequired).toBe(false);
    expect(s.state!.humanAcceptanceDeferred).toBe(true);
    expect(s.state!.phaseGateKind).toBe('OWNER_NEXT_PHASE_AUTHORIZATION_GATE');
  });

  it('PROJECT_HUMAN_GATE → HUMAN_REVIEW_REQUIRED; final project human gate', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    await store.beginWorkItem({
      manifest: makeManifest('HV-07-final', 'PHASE_0'),
      changedPaths: [],
    });
    const r = await store.recordFailure({ failureClass: 'PROJECT_HUMAN_GATE' });
    expect(r.ok).toBe(true);
    const s = await store.loadState();
    expect(s.state!.currentWorkItemState).toBe('HUMAN_REVIEW_REQUIRED');
    expect(s.state!.phaseGateKind).toBe('FINAL_PROJECT_HUMAN_GATE');
  });
});

describe('HV-08 Corrupted state fail-closed', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('schema-invalid state → STATE_CORRUPTED', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const f = path.join(dir, 'state.json');
    writeFileSync(
      f,
      JSON.stringify({
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
        createdAt: '2026-09-17T10:00:00.000Z',
        updatedAt: '2026-09-17T10:00:00.000Z',
        injectedField: 'unexpected',
      }),
    );
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    const loaded = await store.loadState();
    expect(loaded.ok).toBe(false);
    expect(loaded.code).toBe('STATE_CORRUPTED');
  });
});

describe('HV-09 Concurrency lock', () => {
  const dir = isolatedDir();
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('LOCK_BUSY when second writer contends', async () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    // Write a lock file with a PID that is NOT alive (1 is init / not running
    // in practice) and acquire with stale recovery path. Instead, simulate
    // a live lock by writing it with a known live PID.
    const lockPath = path.join(dir, 'LOCK');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }),
      { mode: 0o600 },
    );
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    // First acquire attempt should throw LockBusyError because the live PID
    // holds the lock.
    let busy = false;
    try {
      await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    } catch (err) {
      if ((err as Error).name === 'LockBusyError') busy = true;
    }
    expect(busy).toBe(true);
    // Cleanup: remove the lock so other tests do not see it.
    rmSync(lockPath, { force: true });
  });
});

describe('HV-10 No bypass capability', () => {
  it('isPhaseAuthorized rejects PHASE_DEPLOYMENT / PHASE_RELEASE', () => {
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    expect(isPhaseAuthorized(view, 'PHASE_DEPLOYMENT').ok).toBe(false);
    expect(isPhaseAuthorized(view, 'PHASE_RELEASE').ok).toBe(false);
    expect(isPhaseAuthorized(view, 'AUTONOMOUS_ARM').ok).toBe(false);
  });
  it('Store refuses a manifest whose phase is not the controller phase', async () => {
    const dir = isolatedDir();
    afterEach(() => rmSync(dir, { recursive: true, force: true }));
    const view = syntheticStatus(true, 'NOT AUTHORIZED');
    const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
    await store.initializeIfMissing({ phase: 'PHASE_0', maxAttempts: 3 });
    const r = await store.beginWorkItem({
      manifest: makeManifest('HV-10', 'PHASE_DEPLOYMENT', {
        phase: 'PHASE_DEPLOYMENT',
      } as unknown as Manifest),
      changedPaths: [],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
  });
});
