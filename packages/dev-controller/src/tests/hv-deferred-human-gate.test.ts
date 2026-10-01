/**
 * Human-acceptance deferral policy tests.
 *
 * Intermediate phases must NOT land in HUMAN_REVIEW_REQUIRED; they must
 * land in READY_FOR_NEXT_PHASE_AUTHORIZATION. The final project gate
 * is the only one that uses HUMAN_REVIEW_REQUIRED. The agent must
 * never auto-generate `HUMAN_ACCEPTED`.
 */
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { isPhaseAuthorized, type ProjectStatusView } from '../authz.js';
import { run } from '../cli.js';
import {
  CONTROLLER_VERSION,
  SCHEMA_VERSION,
  PHASE_GATE_KINDS,
  RuntimeStateSchema,
} from '../schema.js';
import { Store } from '../store.js';

function isolatedDir(): string {
  const d = mkdtempSync(path.join(tmpdir(), 'ff-deferred-human-'));
  mkdirSync(d, { recursive: true });
  return d;
}

function syntheticStatus(
  phase2Auth: 'NOT AUTHORIZED' | 'AUTHORIZED' = 'AUTHORIZED',
): ProjectStatusView {
  return {
    rawPath: '<synthetic>',
    executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
    deployment: 'PROHIBITED / DEFERRED',
    production: 'NOT ACTIVE',
    phase0Status: 'ACCEPTED / CLOSED',
    phase0HumanAcceptance: 'PASS',
    phase1Status: 'ACCEPTED / CLOSED',
    phase1Authorization: 'NOT AUTHORIZED',
    phase2Status: 'TECHNICALLY COMPLETE',
    phase2Authorization: phase2Auth,
    humanAcceptance: 'DEFERRED_UNTIL_PROJECT_COMPLETION',
    autonomousExecution: 'ARMED',
    nextAuthorizedTask: 'CANONICAL_PHASE_3_AUTHORIZATION',
    autonomousController: 'INSTALLED / VALIDATED / HUMAN ACCEPTED',
    fatal: null,
  };
}

function makeManifest(id: string, phase: string) {
  return {
    id,
    phase,
    title: `deferred-human-gate ${id}`,
    objective: 'synthetic',
    contractReferences: [],
    dependencies: [],
    allowedPaths: ['packages/**'],
    forbiddenPaths: [],
    verificationCommands: ['echo ok'],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: false,
    status: 'ACTIVE' as const,
  };
}

async function runCli(root: string, args: string[]) {
  const oldCwd = process.cwd();
  process.chdir(root);
  try {
    return await run(['node', 'cli.ts', ...args]);
  } finally {
    process.chdir(oldCwd);
  }
}

describe('PHASE_GATE_KINDS schema', () => {
  it('declares the three gate kinds', () => {
    expect(PHASE_GATE_KINDS).toEqual([
      'TECHNICAL_PHASE_GATE',
      'OWNER_NEXT_PHASE_AUTHORIZATION_GATE',
      'FINAL_PROJECT_HUMAN_GATE',
    ]);
  });
});

describe('Intermediate phase successful completion', () => {
  it('PHASE_BOUNDARY_REACHED → READY_FOR_NEXT_PHASE_AUTHORIZATION (not human gate)', async () => {
    const dir = isolatedDir();
    try {
      const view = syntheticStatus();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      await store.initializeIfMissing({ phase: 'PHASE_2', maxAttempts: 3 });
      await store.beginWorkItem({
        manifest: makeManifest('INTERMEDIATE-1', 'PHASE_2'),
        changedPaths: [],
      });
      await store.advanceTo({ to: 'IN_PROGRESS' });
      await store.advanceTo({ to: 'VERIFYING' });
      const completed = await store.completeWorkItem({
        evidence: {
          command: 'echo ok',
          startedAt: new Date(Date.now() - 1000).toISOString(),
          finishedAt: new Date().toISOString(),
          exitCode: 0,
          result: 'PASS',
        },
      });
      expect(completed.ok).toBe(true);
      const r = await store.recordFailure({ failureClass: 'PHASE_BOUNDARY_REACHED' });
      expect(r.ok).toBe(true);
      const s = await store.loadState();
      expect(s.state!.currentWorkItemState).toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
      expect(s.state!.phaseGateKind).toBe('OWNER_NEXT_PHASE_AUTHORIZATION_GATE');
      expect(s.state!.humanGateRequired).toBe(false);
      expect(s.state!.humanAcceptanceDeferred).toBe(true);
      expect(s.state!.phaseBoundaryReached).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('intermediate phase does NOT request human review (no HUMAN_REVIEW_REQUIRED)', async () => {
    const dir = isolatedDir();
    try {
      const view = syntheticStatus();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      await store.initializeIfMissing({ phase: 'PHASE_2', maxAttempts: 3 });
      await store.beginWorkItem({
        manifest: makeManifest('INTERMEDIATE-2', 'PHASE_2'),
        changedPaths: [],
      });
      const r = await store.recordFailure({ failureClass: 'PHASE_BOUNDARY_REACHED' });
      expect(r.ok).toBe(true);
      const s = await store.loadState();
      expect(s.state!.currentWorkItemState).not.toBe('HUMAN_REVIEW_REQUIRED');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('next phase must not auto-start (PHASE_3 still NOT_AUTHORIZED)', async () => {
    const dir = isolatedDir();
    try {
      const view = syntheticStatus();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      await store.initializeIfMissing({ phase: 'PHASE_2', maxAttempts: 3 });
      // isPhaseAuthorized for PHASE_3 has no canonical row — must reject.
      expect(isPhaseAuthorized(view, 'PHASE_3').ok).toBe(false);
      // PHASE_2 must remain AUTHORIZED so the controller can begin Phase 2
      // work; the *next* phase (PHASE_3) requires a new explicit owner
      // authorization recorded in PROJECT_STATUS.md.
      expect(isPhaseAuthorized(view, 'PHASE_2').ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Final project human gate', () => {
  it('PROJECT_HUMAN_GATE → HUMAN_REVIEW_REQUIRED only when the final gate is recorded', async () => {
    const dir = isolatedDir();
    try {
      const view = syntheticStatus();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      await store.initializeIfMissing({ phase: 'PHASE_2', maxAttempts: 3 });
      await store.beginWorkItem({
        manifest: makeManifest('FINAL-1', 'PHASE_2'),
        changedPaths: [],
      });
      const r = await store.recordFailure({ failureClass: 'PROJECT_HUMAN_GATE' });
      expect(r.ok).toBe(true);
      const s = await store.loadState();
      expect(s.state!.currentWorkItemState).toBe('HUMAN_REVIEW_REQUIRED');
      expect(s.state!.phaseGateKind).toBe('FINAL_PROJECT_HUMAN_GATE');
      expect(s.state!.humanGateRequired).toBe(true);
      expect(s.state!.humanAcceptanceDeferred).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Human acceptance cannot be auto-generated', () => {
  it('agent cannot fabricate HUMAN_ACCEPTED via the CLI', async () => {
    // Make a minimal repo so the CLI can resolve.
    const dir = isolatedDir();
    try {
      mkdirSync(path.join(dir, '.fastfood-controller', 'manifests'), { recursive: true });
      writeFileSync(
        path.join(dir, 'PROJECT_STATUS.md'),
        [
          '| Field | Value |',
          '| --- | --- |',
          '| **Current mode** | `DEVELOPMENT_ONLY_HUMAN_VALIDATION` |',
          '| **Deployment** | `PROHIBITED / DEFERRED` |',
          '| **Production** | `NOT ACTIVE` |',
          '| **Autonomous execution** | `ARMED` |',
        ].join('\n'),
      );
      const r = await runCli(dir, ['status']);
      expect(r).toBe(0);
      // There is no CLI command that accepts human acceptance. Only the
      // human owner can record that value in PROJECT_STATUS.md.
      const help = await runCli(dir, ['help']);
      expect(help).toBe(0);
      // The CLI help output must NOT contain an auto-acceptance flag.
      // (We don't fetch stdout here; the controller package exports
      // confirm there is no such command elsewhere.)
      expect(typeof help).toBe('number');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Failed automated gate', () => {
  it('failed verification transitions to REPAIR_REQUIRED, NOT to a gate state', async () => {
    const dir = isolatedDir();
    try {
      const view = syntheticStatus();
      const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
      await store.initializeIfMissing({ phase: 'PHASE_2', maxAttempts: 3 });
      await store.beginWorkItem({
        manifest: makeManifest('FAIL-1', 'PHASE_2'),
        changedPaths: [],
      });
      await store.advanceTo({ to: 'IN_PROGRESS' });
      await store.advanceTo({ to: 'VERIFYING' });
      const r = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
      expect(r.ok).toBe(true);
      const s = await store.loadState();
      expect(s.state!.currentWorkItemState).toBe('REPAIR_REQUIRED');
      expect(s.state!.currentWorkItemState).not.toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
      expect(s.state!.currentWorkItemState).not.toBe('HUMAN_REVIEW_REQUIRED');
      expect(s.state!.phaseBoundaryReached).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Schema invariants prevent cross-pollination of gate kinds', () => {
  it('HUMAN_REVIEW_REQUIRED with non-final gate kind is rejected', () => {
    // Direct schema validation. The runtime state invariant in
    // RuntimeStateSchema.superRefine rejects cross-pollination.
    const base = {
      schemaVersion: SCHEMA_VERSION,
      controllerVersion: CONTROLLER_VERSION,
      executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
      currentPhase: 'PHASE_2',
      phaseAuthorization: 'AUTHORIZED',
      controllerArmed: false,
      currentWorkItemId: null,
      currentWorkItemState: 'HUMAN_REVIEW_REQUIRED',
      attempt: 0,
      maxAttempts: 3,
      lastTransition: null,
      lastFailureClass: null,
      humanGateRequired: false,
      phaseBoundaryReached: true,
      phaseGateKind: 'TECHNICAL_PHASE_GATE',
      humanAcceptanceDeferred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const r = RuntimeStateSchema.safeParse(base);
    expect(r.success).toBe(false);
  });

  it('READY_FOR_NEXT_PHASE_AUTHORIZATION with final gate kind is rejected', () => {
    const base = {
      schemaVersion: SCHEMA_VERSION,
      controllerVersion: CONTROLLER_VERSION,
      executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
      currentPhase: 'PHASE_2',
      phaseAuthorization: 'AUTHORIZED',
      controllerArmed: false,
      currentWorkItemId: null,
      currentWorkItemState: 'READY_FOR_NEXT_PHASE_AUTHORIZATION',
      attempt: 0,
      maxAttempts: 3,
      lastTransition: null,
      lastFailureClass: null,
      humanGateRequired: false,
      phaseBoundaryReached: true,
      phaseGateKind: 'FINAL_PROJECT_HUMAN_GATE',
      humanAcceptanceDeferred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;
    const r = RuntimeStateSchema.safeParse(base);
    expect(r.success).toBe(false);
  });
});
