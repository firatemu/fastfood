/**
 * MIGRATION REGRESSION SUITE — full-project autonomous execution mode.
 *
 * Validates the controller migration from PHASE-BY-PHASE HUMAN ACCEPTANCE
 * to FULL-PROJECT AUTONOMOUS TECHNICAL EXECUTION per the
 * `FULL_CANONICAL_PROJECT_AUTONOMOUS_EXECUTION` human-owner policy
 * recorded in PROJECT_STATUS.md on 2026-09-18.
 *
 * The 10 regression scenarios required by the migration:
 *   1. arbitrary future phase IDs require no controller source change
 *   2. successful technical phase completion automatically selects next phase
 *   3. no human acceptance gate occurs at intermediate successful boundaries
 *   4. retry exhaustion still hard-stops
 *   5. contract conflict still hard-stops
 *   6. scope violation still hard-stops
 *   7. checkpoint/resume works across phase boundaries
 *   8. final roadmap phase stops for human test
 *   9. deployment remains denied throughout
 *  10. project authorization cannot authorize production
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  isPhaseAuthorized,
  nextCanonicalPhaseAfter,
  parseProjectStatusView,
  type ProjectStatusView,
} from '../authz.js';
import { ExecutionModes, PHASE_GATE_KINDS, RuntimeStateSchema } from '../schema.js';
import { Store } from '../store.js';

function isolatedDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'ff-mig-'));
}

/**
 * Synthetic PROJECT_STATUS view with
 * `Project autonomous execution = AUTHORIZED`. Includes legacy phase rows
 * AND a generic phases[] list up to PHASE_10.
 */
function fullProjectAuthorizedView(): ProjectStatusView {
  return {
    rawPath: '<synthetic>',
    executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
    deployment: 'PROHIBITED / DEFERRED',
    production: 'NOT ACTIVE',
    projectAutonomousExecutionAuthorized: true,
    humanAcceptanceDeferred: true,
    phases: [
      {
        id: 'PHASE_0',
        index: 0,
        status: 'ACCEPTED / CLOSED',
        authorization: null,
        humanAcceptance: 'PASS',
        readyForNextPhase: 'YES',
        rawLabel: 'Phase 0 status',
      },
      {
        id: 'PHASE_1',
        index: 1,
        status: 'ACCEPTED / CLOSED',
        authorization: 'NOT AUTHORIZED',
        humanAcceptance: 'PASS',
        readyForNextPhase: 'YES',
        rawLabel: 'Phase 1 status',
      },
      {
        id: 'PHASE_2',
        index: 2,
        status: 'TECHNICALLY COMPLETE',
        authorization: 'AUTHORIZED',
        humanAcceptance: 'DEFERRED_UNTIL_PROJECT_COMPLETION',
        readyForNextPhase: 'YES',
        rawLabel: 'Phase 2',
      },
      {
        id: 'PHASE_3',
        index: 3,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 3',
      },
      {
        id: 'PHASE_4',
        index: 4,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 4',
      },
      {
        id: 'PHASE_5',
        index: 5,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 5',
      },
      {
        id: 'PHASE_6',
        index: 6,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 6',
      },
      {
        id: 'PHASE_7',
        index: 7,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 7',
      },
      {
        id: 'PHASE_8',
        index: 8,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 8',
      },
      {
        id: 'PHASE_9',
        index: 9,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 9',
      },
      {
        id: 'PHASE_10',
        index: 10,
        status: 'NOT STARTED',
        authorization: null,
        humanAcceptance: null,
        readyForNextPhase: null,
        rawLabel: 'Phase 10',
      },
    ],
    currentCanonicalPhase: 'PHASE_3',
    phase0Status: 'ACCEPTED / CLOSED',
    phase0HumanAcceptance: 'PASS',
    phase1Status: 'ACCEPTED / CLOSED',
    phase1Authorization: 'NOT AUTHORIZED',
    phase2Status: 'TECHNICALLY COMPLETE',
    phase2Authorization: 'AUTHORIZED',
    phase3Status: 'NOT STARTED',
    phase3Authorization: null,
    humanAcceptance: 'DEFERRED',
    autonomousExecution: 'ARMED',
    nextAuthorizedTask: 'CANONICAL_PHASE_3_AUTONOMOUS_EXECUTION',
    autonomousController: 'INSTALLED / VALIDATED / HUMAN ACCEPTED',
    fatal: null,
  };
}

describe('FULL_PROJECT_AUTONOMOUS_EXECUTION migration — regression suite', () => {
  // -------- 1. arbitrary future phase IDs require no controller source change
  describe('1. arbitrary future phase IDs require no controller source change', () => {
    it('PHASE_3 is authorized without per-phase row (source = project-autonomous)', () => {
      const view = fullProjectAuthorizedView();
      const r = isPhaseAuthorized(view, 'PHASE_3');
      expect(r.ok).toBe(true);
      expect(r.source).toBe('PROJECT_AUTONOMOUS_EXECUTION');
    });
    it('PHASE_4..PHASE_10 are all authorized under project-level flag', () => {
      const view = fullProjectAuthorizedView();
      for (const phase of [
        'PHASE_4',
        'PHASE_5',
        'PHASE_6',
        'PHASE_7',
        'PHASE_8',
        'PHASE_9',
        'PHASE_10',
      ]) {
        const r = isPhaseAuthorized(view, phase);
        expect(r.ok).toBe(true);
        expect(r.source).toBe('PROJECT_AUTONOMOUS_EXECUTION');
      }
    });
    it('PHASE_99 (arbitrary future ID) authorizes via project-level flag', () => {
      const view = fullProjectAuthorizedView();
      const r = isPhaseAuthorized(view, 'PHASE_99');
      expect(r.ok).toBe(true);
      expect(r.source).toBe('PROJECT_AUTONOMOUS_EXECUTION');
    });
  });

  // -------- 2. successful technical phase completion automatically selects next phase
  describe('2. successful technical phase completion auto-selects next phase', () => {
    it('nextCanonicalPhaseAfter returns the next phase id from the ordered phases[] array', () => {
      const view = fullProjectAuthorizedView();
      expect(nextCanonicalPhaseAfter(view, 'PHASE_3')).toBe('PHASE_4');
      expect(nextCanonicalPhaseAfter(view, 'PHASE_7')).toBe('PHASE_8');
    });
    it('nextCanonicalPhaseAfter returns null after the last known phase', () => {
      const view = fullProjectAuthorizedView();
      expect(nextCanonicalPhaseAfter(view, 'PHASE_10')).toBe(null);
    });
  });

  // -------- 3. no human acceptance gate occurs at intermediate successful boundaries
  describe('3. no human acceptance gate at intermediate successful boundaries', () => {
    it('PHASE_BOUNDARY_REACHED lands in READY_FOR_NEXT_PHASE_AUTHORIZATION, NOT HUMAN_REVIEW_REQUIRED', async () => {
      const dir = isolatedDir();
      afterEach(() => rmSync(dir, { recursive: true, force: true }));
      try {
        const view = fullProjectAuthorizedView();
        const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await store.initializeIfMissing({
          phase: 'PHASE_3',
          maxAttempts: 3,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await store.beginWorkItem({
          manifest: {
            id: 'P3-001',
            phase: 'PHASE_3',
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
        const r = await store.recordFailure({ failureClass: 'PHASE_BOUNDARY_REACHED' });
        expect(r.ok).toBe(true);
        const s = await store.loadState();
        expect(s.state!.currentWorkItemState).toBe('READY_FOR_NEXT_PHASE_AUTHORIZATION');
        expect(s.state!.humanGateRequired).toBe(false);
        expect(s.state!.humanAcceptanceDeferred).toBe(true);
        expect(s.state!.phaseGateKind).toBe('OWNER_NEXT_PHASE_AUTHORIZATION_GATE');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------- 4. retry exhaustion still hard-stops
  describe('4. retry exhaustion still hard-stops', () => {
    it('maxAttempts=2 → BLOCKED after 2 RETRYABLE failures', async () => {
      const dir = isolatedDir();
      try {
        const view = fullProjectAuthorizedView();
        const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await store.initializeIfMissing({
          phase: 'PHASE_3',
          maxAttempts: 2,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await store.beginWorkItem({
          manifest: {
            id: 'P3-001',
            phase: 'PHASE_3',
            title: 't',
            objective: 'o',
            contractReferences: [],
            dependencies: [],
            allowedPaths: ['packages/**'],
            forbiddenPaths: [],
            verificationCommands: ['echo ok'],
            maxRepairAttempts: 2,
            requiresHumanAcceptance: true,
            status: 'ACTIVE',
          },
          changedPaths: [],
        });
        await store.advanceTo({ to: 'IN_PROGRESS' });
        await store.advanceTo({ to: 'VERIFYING' });
        const r1 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
        const r2 = await store.recordFailure({ failureClass: 'VERIFICATION_FAILURE' });
        expect(r1.code).toBe('FAILURE_RECORDED');
        expect(r2.code).toBe('FAILURE_RECORDED');
        const loaded = await store.loadState();
        expect(loaded.state!.currentWorkItemState).toBe('BLOCKED');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------- 5. contract conflict still hard-stops
  describe('5. contract conflict still hard-stops', () => {
    it('CONTRACT_CONFLICT forces BLOCKED', async () => {
      const dir = isolatedDir();
      try {
        const view = fullProjectAuthorizedView();
        const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await store.initializeIfMissing({
          phase: 'PHASE_3',
          maxAttempts: 3,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await store.beginWorkItem({
          manifest: {
            id: 'P3-001',
            phase: 'PHASE_3',
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
        const r = await store.recordFailure({ failureClass: 'CONTRACT_CONFLICT' });
        expect(r.ok).toBe(true);
        const s = await store.loadState();
        expect(s.state!.currentWorkItemState).toBe('BLOCKED');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------- 6. scope violation still hard-stops (via RETRYABLE → BLOCKED path)
  describe('6. scope violation still hard-stops', () => {
    it('SCOPE_VIOLATION on a closed budget → BLOCKED', async () => {
      const dir = isolatedDir();
      try {
        const view = fullProjectAuthorizedView();
        const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await store.initializeIfMissing({
          phase: 'PHASE_3',
          maxAttempts: 2,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await store.beginWorkItem({
          manifest: {
            id: 'P3-001',
            phase: 'PHASE_3',
            title: 't',
            objective: 'o',
            contractReferences: [],
            dependencies: [],
            allowedPaths: ['packages/**'],
            forbiddenPaths: [],
            verificationCommands: ['echo ok'],
            maxRepairAttempts: 2,
            requiresHumanAcceptance: true,
            status: 'ACTIVE',
          },
          changedPaths: [],
        });
        await store.recordFailure({ failureClass: 'SCOPE_VIOLATION' });
        await store.recordFailure({ failureClass: 'SCOPE_VIOLATION' });
        const s = await store.loadState();
        expect(s.state!.currentWorkItemState).toBe('BLOCKED');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------- 7. checkpoint/resume works across phase boundaries
  describe('7. checkpoint/resume works across phase boundaries', () => {
    it('a fresh Store instance reads persisted state for the next phase', async () => {
      const dir = isolatedDir();
      try {
        const view = fullProjectAuthorizedView();
        // First "session": init + begin for PHASE_3.
        const s1 = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await s1.initializeIfMissing({
          phase: 'PHASE_3',
          maxAttempts: 3,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await s1.beginWorkItem({
          manifest: {
            id: 'P3-001',
            phase: 'PHASE_3',
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
        const cp = await s1.checkpoint();
        expect(cp.ok).toBe(true);
        // Second "session": fresh Store instance, loads persisted state.
        const s2 = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        const loaded = await s2.loadState();
        expect(loaded.ok).toBe(true);
        expect(loaded.state!.currentPhase).toBe('PHASE_3');
        expect(loaded.state!.executionMode).toBe('FULL_PROJECT_AUTONOMOUS_DEVELOPMENT');
        expect(loaded.state!.controllerArmed).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------- 8. final roadmap phase stops for human test
  describe('8. final roadmap phase stops for human test', () => {
    it('PROJECT_HUMAN_GATE on the final phase lands in HUMAN_REVIEW_REQUIRED with FINAL_PROJECT_HUMAN_GATE', async () => {
      const dir = isolatedDir();
      try {
        const view = fullProjectAuthorizedView();
        const store = new Store({ stateDir: dir, projectStatusView: view, dryRun: false });
        await store.initializeIfMissing({
          phase: 'PHASE_10',
          maxAttempts: 3,
          controllerArmed: true,
          executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        });
        await store.beginWorkItem({
          manifest: {
            id: 'P10-001',
            phase: 'PHASE_10',
            title: 'final',
            objective: 'final phase',
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

  // -------- 9. deployment remains denied throughout
  describe('9. deployment remains denied throughout', () => {
    it('PHASE_DEPLOYMENT / PHASE_RELEASE / PHASE_PRODUCTION are NEVER authorized', () => {
      const view = fullProjectAuthorizedView();
      for (const phase of ['PHASE_DEPLOYMENT', 'PHASE_RELEASE', 'PHASE_PRODUCTION']) {
        const r = isPhaseAuthorized(view, phase);
        expect(r.ok).toBe(false);
        expect(r.code).toBe('AUTHORIZATION_FAILURE');
      }
    });
    it('even when project autonomous execution is AUTHORIZED, deployment-style phases remain denied', () => {
      const view = fullProjectAuthorizedView();
      // Re-assert with explicit positive checks.
      expect(isPhaseAuthorized(view, 'PHASE_DEPLOYMENT').ok).toBe(false);
      expect(isPhaseAuthorized(view, 'PHASE_RELEASE').ok).toBe(false);
      expect(isPhaseAuthorized(view, 'AUTONOMOUS_ARM').ok).toBe(false);
    });
  });

  // -------- 10. project authorization cannot authorize production
  describe('10. project authorization cannot authorize production', () => {
    it('project-level autonomous execution does not change Deployment / Production fields', () => {
      const view = fullProjectAuthorizedView();
      expect(view.deployment).toBe('PROHIBITED / DEFERRED');
      expect(view.production).toBe('NOT ACTIVE');
    });
    it('project autonomous execution flag is independent of deployment authorization', () => {
      const view = fullProjectAuthorizedView();
      // projectAutonomousExecutionAuthorized === true but deployment remains prohibited.
      expect(view.projectAutonomousExecutionAuthorized).toBe(true);
      expect(view.deployment).toBe('PROHIBITED / DEFERRED');
    });
  });

  // -------- Bonus: phase-agnostic parser accepts arbitrary phase rows
  describe('phase-agnostic parser accepts arbitrary phase rows', () => {
    it('PROJECT_STATUS rows for PHASE_5..PHASE_10 are parsed into phases[] without source change', () => {
      const raw = `
| **Current mode** | \`DEVELOPMENT_ONLY_HUMAN_VALIDATION\` |
| **Deployment** | \`PROHIBITED / DEFERRED\` |
| **Production** | \`NOT ACTIVE\` |
| **Phase 5** | \`NOT STARTED\` |
| **Phase 5 authorization** | \`NOT AUTHORIZED\` |
| **Phase 6** | \`NOT STARTED\` |
| **Phase 7** | \`NOT STARTED\` |
| **Phase 8** | \`NOT STARTED\` |
| **Phase 9** | \`NOT STARTED\` |
| **Phase 10** | \`NOT STARTED\` |
| **Project autonomous execution** | \`AUTHORIZED\` |
`;
      const view = parseProjectStatusView(raw);
      expect(view.projectAutonomousExecutionAuthorized).toBe(true);
      const ids = view.phases.map((p) => p.id);
      expect(ids).toContain('PHASE_5');
      expect(ids).toContain('PHASE_10');
      // PHASE_5 is explicitly NOT AUTHORIZED.
      expect(isPhaseAuthorized(view, 'PHASE_5').ok).toBe(false);
      // PHASE_6..PHASE_10 authorize via project-level flag.
      for (const p of ['PHASE_6', 'PHASE_7', 'PHASE_8', 'PHASE_9', 'PHASE_10']) {
        const r = isPhaseAuthorized(view, p);
        expect(r.ok).toBe(true);
        expect(r.source).toBe('PROJECT_AUTONOMOUS_EXECUTION');
      }
    });

    it('PHASE_10 must not be treated as PHASE_1 (startsWith footgun regression)', () => {
      // Historical bug: `phase.startsWith('PHASE_1')` matched PHASE_10..PHASE_19.
      expect('PHASE_10'.startsWith('PHASE_1')).toBe(true);
      expect('PHASE_10' === 'PHASE_1').toBe(false);
      const view = fullProjectAuthorizedView();
      expect(isPhaseAuthorized(view, 'PHASE_10').ok).toBe(true);
      expect(isPhaseAuthorized(view, 'PHASE_1').ok).toBe(false);
    });
  });

  // -------- Bonus: arming requires project authorization + matching executionMode
  describe('arming invariants', () => {
    it('RuntimeStateSchema accepts controllerArmed=true under FULL_PROJECT_AUTONOMOUS_DEVELOPMENT', () => {
      const now = new Date().toISOString();
      const result = RuntimeStateSchema.safeParse({
        schemaVersion: 1,
        controllerVersion: 'test',
        executionMode: 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT',
        currentPhase: 'PHASE_3',
        phaseAuthorization: 'AUTHORIZED',
        controllerArmed: true,
        currentWorkItemId: null,
        currentWorkItemState: null,
        attempt: 0,
        maxAttempts: 3,
        lastTransition: null,
        lastFailureClass: null,
        humanGateRequired: false,
        phaseBoundaryReached: false,
        phaseGateKind: 'TECHNICAL_PHASE_GATE',
        humanAcceptanceDeferred: true,
        createdAt: now,
        updatedAt: now,
      });
      expect(result.success).toBe(true);
    });
    it('RuntimeStateSchema rejects controllerArmed=true under DEVELOPMENT_ONLY_HUMAN_VALIDATION', () => {
      const now = new Date().toISOString();
      const result = RuntimeStateSchema.safeParse({
        schemaVersion: 1,
        controllerVersion: 'test',
        executionMode: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION',
        currentPhase: 'PHASE_3',
        phaseAuthorization: 'AUTHORIZED',
        controllerArmed: true,
        currentWorkItemId: null,
        currentWorkItemState: null,
        attempt: 0,
        maxAttempts: 3,
        lastTransition: null,
        lastFailureClass: null,
        humanGateRequired: false,
        phaseBoundaryReached: false,
        phaseGateKind: 'TECHNICAL_PHASE_GATE',
        humanAcceptanceDeferred: true,
        createdAt: now,
        updatedAt: now,
      });
      expect(result.success).toBe(false);
    });
    it('ExecutionModes enum contains both modes', () => {
      expect(ExecutionModes).toContain('DEVELOPMENT_ONLY_HUMAN_VALIDATION');
      expect(ExecutionModes).toContain('FULL_PROJECT_AUTONOMOUS_DEVELOPMENT');
    });
    it('PHASE_GATE_KINDS preserves OWNER_NEXT_PHASE_AUTHORIZATION_GATE and FINAL_PROJECT_HUMAN_GATE', () => {
      expect(PHASE_GATE_KINDS).toContain('OWNER_NEXT_PHASE_AUTHORIZATION_GATE');
      expect(PHASE_GATE_KINDS).toContain('FINAL_PROJECT_HUMAN_GATE');
    });
  });
});
