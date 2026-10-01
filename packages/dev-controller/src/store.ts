import path from 'node:path';

import { atomicReadJson, atomicWriteFile } from './atomic.js';
import { isPhaseAuthorized, type ProjectStatusView } from './authz.js';
import { validateEvidence } from './evidence.js';
import { acquireLock, releaseLock, type AcquiredLock } from './locking.js';
import {
  RuntimeStateSchema,
  buildInitialRuntimeState,
  type ControllerResult,
  type FailureClass,
  type RuntimeState,
  type WorkItemState,
} from './schema.js';
import { failResult, okResult } from './schema.js';
import type { Manifest } from './schema.js';
import { validateScope } from './scope.js';
import { isTransitionAllowed, nextStateAfterFailure } from './state.js';

/**
 * Store facade. Every transition is bounded and locked.
 *
 * One invocation = one allowed transition (or one dry-run / validate).
 * The controller never runs an unbounded retry loop here; the caller is the
 * bounded CLI / agent invocation.
 */

export interface StoreOptions {
  readonly stateDir: string;
  readonly projectStatusView: ProjectStatusView;
  readonly dryRun: boolean;
}

export class Store {
  readonly #opts: StoreOptions;

  constructor(opts: StoreOptions) {
    this.#opts = opts;
  }

  get stateFile(): string {
    return path.join(this.#opts.stateDir, 'state.json');
  }

  /** Returns the state directory itself (not a file path inside it). */
  get stateDir(): string {
    return this.#opts.stateDir;
  }

  get manifestsDir(): string {
    return path.join(this.#opts.stateDir, 'manifests');
  }

  get evidenceDir(): string {
    return path.join(this.#opts.stateDir, 'evidence');
  }

  async #withLock<T>(fn: (lock: AcquiredLock) => Promise<T>): Promise<T> {
    const lock = await acquireLock(this.#opts.stateDir);
    try {
      return await fn(lock);
    } finally {
      await releaseLock(lock);
    }
  }

  async #readStateUnchecked(): Promise<RuntimeState | null> {
    return atomicReadJson<RuntimeState>(this.stateFile);
  }

  async loadState(): Promise<ControllerResult & { state?: RuntimeState }> {
    const s = await this.#readStateUnchecked();
    if (!s) {
      return failResult('STATE_MISSING', `no runtime state at ${this.stateFile}`);
    }
    const parsed = RuntimeStateSchema.safeParse(s);
    if (!parsed.success) {
      return failResult(
        'STATE_CORRUPTED',
        `corrupted runtime state at ${this.stateFile}; refusing to use it`,
      );
    }
    return { ok: true, code: 'OK', message: 'state loaded', state: parsed.data };
  }

  async initializeIfMissing(input: {
    phase: string;
    maxAttempts: number;
    controllerArmed?: boolean;
    executionMode?: 'DEVELOPMENT_ONLY_HUMAN_VALIDATION' | 'FULL_PROJECT_AUTONOMOUS_DEVELOPMENT';
  }): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const existing = await this.#readStateUnchecked();
      if (existing) {
        const parsed = RuntimeStateSchema.safeParse(existing);
        if (!parsed.success) {
          return failResult(
            'STATE_CORRUPTED',
            `refusing to overwrite corrupted state at ${this.stateFile}`,
          );
        }
        if (this.#opts.dryRun) {
          return okResult('DRY_RUN', 'would skip initialize: state already exists', {
            state: parsed.data,
          });
        }
        return okResult(
          'STATE_EXISTS',
          'state already exists; initialize is idempotent and did not overwrite',
          { state: parsed.data },
        );
      }
      const authz = isPhaseAuthorized(this.#opts.projectStatusView, input.phase);
      if (!authz.ok) {
        return failResult(authz.code, `cannot initialize controller: ${authz.message}`);
      }
      const next = buildInitialRuntimeState({
        phase: input.phase,
        phaseAuthorization: 'AUTHORIZED',
        maxAttempts: input.maxAttempts,
        controllerArmed: input.controllerArmed ?? false,
        executionMode: input.executionMode,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', 'would initialize runtime state', { state: next });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(next, null, 2));
      return okResult('INITIALIZED', 'runtime state initialized', { state: next });
    });
  }

  async beginWorkItem(input: {
    manifest: Manifest;
    changedPaths: readonly string[];
  }): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) {
        return stateResult;
      }
      const s = stateResult.state;
      if (s.phaseAuthorization !== 'AUTHORIZED') {
        return failResult(
          'AUTHORIZATION_FAILURE',
          `phase ${s.currentPhase} is NOT AUTHORIZED in PROJECT_STATUS.md`,
        );
      }
      // Reject a manifest whose phase does not match the current controller phase.
      if (input.manifest.phase !== s.currentPhase) {
        return failResult(
          'AUTHORIZATION_FAILURE',
          `manifest phase '${input.manifest.phase}' does not match controller phase '${s.currentPhase}'`,
        );
      }
      if (s.currentWorkItemId !== null || s.currentWorkItemState !== null) {
        return failResult(
          'BLOCKED',
          'a work item is already in progress; complete or block it first',
        );
      }
      const scope = validateScope(input.manifest, input.changedPaths);
      if (!scope.ok) {
        return failResult('SCOPE_VIOLATION', 'manifest scope violation', {
          violations: scope.violations,
        });
      }
      if (!isTransitionAllowed(null, 'PENDING')) {
        return failResult('INVALID_TRANSITION', 'PENDING is not reachable from empty');
      }
      // Init state for the new work item.
      //
      // The manifest's `requiresHumanAcceptance` flag is metadata about
      // whether the work item's final completion must be human-accepted.
      // It is NOT the same as `humanGateRequired`, which tracks whether
      // the work item is *currently* blocked on a human gate. The latter
      // is set true when we transition into HUMAN_REVIEW_REQUIRED and is
      // cleared on human reset back to PENDING. Beginning a work item
      // does not by itself create a human gate — work can begin.
      const now = new Date().toISOString();
      const next: RuntimeState = RuntimeStateSchema.parse({
        ...s,
        currentWorkItemId: input.manifest.id,
        currentWorkItemState: 'PENDING',
        attempt: 0,
        maxAttempts: input.manifest.maxRepairAttempts,
        lastTransition: { at: now, from: null, to: 'PENDING' },
        humanGateRequired: s.humanGateRequired,
        updatedAt: now,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', 'would begin work item', { state: next });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(next, null, 2));
      return okResult('WORK_ITEM_BEGUN', `work item ${input.manifest.id} begun`, { state: next });
    });
  }

  async advanceTo(input: { to: WorkItemState }): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) return stateResult;
      const s = stateResult.state;
      const from = s.currentWorkItemState;
      if (from === null) {
        return failResult('INVALID_TRANSITION', 'no work item to advance');
      }
      if (!isTransitionAllowed(from, input.to)) {
        return failResult('INVALID_TRANSITION', `transition ${from} → ${input.to} is forbidden`, {
          from,
          to: input.to,
        });
      }
      const now = new Date().toISOString();
      const next: RuntimeState = RuntimeStateSchema.parse({
        ...s,
        currentWorkItemState: input.to,
        lastTransition: { at: now, from, to: input.to },
        updatedAt: now,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', `would advance ${from} → ${input.to}`, { state: next });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(next, null, 2));
      return okResult('STATE_ADVANCED', `${from} → ${input.to}`, { state: next });
    });
  }

  async recordFailure(input: { failureClass: FailureClass }): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) return stateResult;
      const s = stateResult.state;
      const from = s.currentWorkItemState;
      if (from === null) {
        return failResult('INVALID_TRANSITION', 'no work item to fail');
      }
      const { next, retryable } = nextStateAfterFailure(
        from,
        input.failureClass,
        s.attempt,
        s.maxAttempts,
      );
      if (next === from) {
        return failResult('INVALID_TRANSITION', 'failure classification produced no-op');
      }
      if (!isTransitionAllowed(from, next)) {
        return failResult(
          'INVALID_TRANSITION',
          `failure classification ${input.failureClass} produced forbidden transition ${from} → ${next} (attempt=${s.attempt}/${s.maxAttempts}, retryable=${retryable})`,
        );
      }
      // Count the attempt regardless of outcome: a BLOCKED failure has
      // still consumed one of the budget slots, so attempt becomes the new
      // count. RETRYABLE failures increment too.
      const nextAttempt = s.attempt + 1;
      const now = new Date().toISOString();
      // Phase-boundary failure classification always sets the phase boundary
      // flag. The actual gate the controller lands in is decided by the FSM
      // (READY_FOR_NEXT_PHASE_AUTHORIZATION for intermediate phases,
      // HUMAN_REVIEW_REQUIRED for the final project gate).
      const phaseBoundary =
        input.failureClass === 'PHASE_BOUNDARY_REACHED' ||
        input.failureClass === 'PROJECT_HUMAN_GATE'
          ? true
          : s.phaseBoundaryReached;
      // humanGateRequired is true ONLY for the FINAL project human gate.
      // Intermediate phase-boundary does NOT set it.
      const humanGate =
        next === 'HUMAN_REVIEW_REQUIRED' && input.failureClass === 'PROJECT_HUMAN_GATE'
          ? true
          : false;
      // Discriminator that distinguishes the two gate kinds. Intermediate
      // PHASE_BOUNDARY_REACHED → TECHNICAL_PHASE_GATE /
      // OWNER_NEXT_PHASE_AUTHORIZATION_GATE (we map TECHNICAL_PHASE_GATE
      // for the deferred-human case to be explicit). The final project
      // gate → FINAL_PROJECT_HUMAN_GATE.
      const phaseGateKind =
        next === 'HUMAN_REVIEW_REQUIRED'
          ? 'FINAL_PROJECT_HUMAN_GATE'
          : next === 'READY_FOR_NEXT_PHASE_AUTHORIZATION'
            ? 'OWNER_NEXT_PHASE_AUTHORIZATION_GATE'
            : s.phaseGateKind;
      const humanAcceptanceDeferred = next !== 'HUMAN_REVIEW_REQUIRED';
      const nextState: RuntimeState = RuntimeStateSchema.parse({
        ...s,
        currentWorkItemState: next,
        attempt: nextAttempt,
        lastFailureClass: input.failureClass,
        lastTransition: { at: now, from, to: next, reason: input.failureClass },
        humanGateRequired: humanGate,
        phaseBoundaryReached: phaseBoundary,
        phaseGateKind,
        humanAcceptanceDeferred,
        updatedAt: now,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', `would record failure ${input.failureClass} → ${next}`, {
          state: nextState,
        });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(nextState, null, 2));
      return okResult(
        'FAILURE_RECORDED',
        `${from} → ${next} (attempt=${nextAttempt}/${s.maxAttempts})`,
        { state: nextState },
      );
    });
  }

  async completeWorkItem(input: { evidence: unknown }): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) return stateResult;
      const s = stateResult.state;
      const from = s.currentWorkItemState;
      const evidenceCheck = validateEvidence(input.evidence);
      if (!evidenceCheck.ok) {
        return evidenceCheck;
      }
      if (from !== 'VERIFYING' && from !== 'REPAIR_REQUIRED' && from !== 'IN_PROGRESS') {
        return failResult(
          'INVALID_TRANSITION',
          `cannot complete from state ${from}; expected VERIFYING/REPAIR_REQUIRED/IN_PROGRESS`,
        );
      }
      const to: WorkItemState = 'TECHNICALLY_COMPLETE';
      if (!isTransitionAllowed(from, to)) {
        return failResult('INVALID_TRANSITION', `forbidden ${from} → ${to}`);
      }
      const now = new Date().toISOString();
      const next: RuntimeState = RuntimeStateSchema.parse({
        ...s,
        currentWorkItemState: to,
        lastTransition: { at: now, from, to },
        updatedAt: now,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', `would complete work item`, { state: next });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(next, null, 2));
      return okResult('WORK_ITEM_COMPLETE', 'work item technically complete', { state: next });
    });
  }

  /**
   * Release a completed (TECHNICALLY_COMPLETE) work item so the next one
   * can be begun. This is the bounded, audited exit from a work-item
   * lifecycle when no human gate is active. It does NOT mark the work
   * item as human-accepted; the audit log + evidence files remain the
   * record of acceptance. The phase-level human gate at the end of
   * Phase 2 is enforced separately by transition into
   * HUMAN_REVIEW_REQUIRED via `recordFailure({ failureClass:
   * 'PHASE_BOUNDARY_REACHED' })` on the final work item.
   *
   * Allowed only from TECHNICALLY_COMPLETE.
   */
  async releaseCompletedWorkItem(): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) return stateResult;
      const s = stateResult.state;
      if (s.currentWorkItemState !== 'TECHNICALLY_COMPLETE') {
        return failResult(
          'INVALID_TRANSITION',
          `cannot release work item from state ${s.currentWorkItemState}; expected TECHNICALLY_COMPLETE`,
        );
      }
      const now = new Date().toISOString();
      const next: RuntimeState = RuntimeStateSchema.parse({
        ...s,
        currentWorkItemId: null,
        currentWorkItemState: null,
        humanGateRequired: false,
        attempt: 0,
        lastTransition: {
          at: now,
          from: 'TECHNICALLY_COMPLETE',
          to: null,
          reason: 'release_for_next_work_item',
        },
        updatedAt: now,
      });
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', 'would release completed work item', { state: next });
      }
      await atomicWriteFile(this.stateFile, JSON.stringify(next, null, 2));
      return okResult('WORK_ITEM_RELEASED', 'work item released; ready for next', {
        state: next,
      });
    });
  }

  async checkpoint(): Promise<ControllerResult> {
    return this.#withLock(async () => {
      const stateResult = await this.loadState();
      if (!stateResult.ok || !stateResult.state) return stateResult;
      const s = stateResult.state;
      const checkpoint = {
        schemaVersion: s.schemaVersion,
        controllerVersion: s.controllerVersion,
        executionMode: s.executionMode,
        currentPhase: s.currentPhase,
        phaseAuthorization: s.phaseAuthorization,
        currentWorkItemId: s.currentWorkItemId,
        currentWorkItemState: s.currentWorkItemState,
        attempt: s.attempt,
        lastVerificationResult:
          s.currentWorkItemState === 'TECHNICALLY_COMPLETE'
            ? 'PASS'
            : s.currentWorkItemState === 'REPAIR_REQUIRED'
              ? 'FAIL'
              : s.currentWorkItemState === 'BLOCKED'
                ? 'FAIL'
                : 'NOT_RUN',
        humanGateRequired: s.humanGateRequired,
        capturedAt: new Date().toISOString(),
      };
      if (this.#opts.dryRun) {
        return okResult('DRY_RUN', 'would checkpoint', { checkpoint });
      }
      const path = `${this.stateDir}/checkpoint-${checkpoint.capturedAt.replace(/[:.]/g, '-')}.json`;
      await atomicWriteFile(path, JSON.stringify(checkpoint, null, 2));
      return okResult('CHECKPOINT_WRITTEN', path, { checkpoint, path });
    });
  }
}

/**
 * Compute the next authorized transition for the current state, if any.
 * Used by `controller:status` to surface "what can I do next" safely.
 */
export function nextAllowedTransition(state: RuntimeState): WorkItemState | null {
  const from = state.currentWorkItemState;
  if (from === null) {
    // Empty: must call begin-work-item (no auto-transition).
    return null;
  }
  const candidates: WorkItemState[] = [
    'PENDING',
    'IN_PROGRESS',
    'VERIFYING',
    'REPAIR_REQUIRED',
    'TECHNICALLY_COMPLETE',
    'BLOCKED',
    'READY_FOR_NEXT_PHASE_AUTHORIZATION',
    'HUMAN_REVIEW_REQUIRED',
  ];
  for (const cand of candidates) {
    if (cand !== from && isTransitionAllowed(from, cand)) {
      return cand;
    }
  }
  return null;
}

/**
 * Convenience: report whether the controller has any active work.
 */
export function hasActiveWork(state: RuntimeState): boolean {
  if (state.currentWorkItemId === null) return false;
  if (state.currentWorkItemState === null) return false;
  if (state.currentWorkItemState === 'HUMAN_REVIEW_REQUIRED') return false;
  if (state.currentWorkItemState === 'READY_FOR_NEXT_PHASE_AUTHORIZATION') return false;
  if (state.currentWorkItemState === 'BLOCKED') return false;
  if (state.currentWorkItemState === 'TECHNICALLY_COMPLETE') return false;
  return true;
}

export function formatStateSummary(s: RuntimeState): string {
  const lines: string[] = [];
  lines.push(`schemaVersion     : ${s.schemaVersion}`);
  lines.push(`controllerVersion : ${s.controllerVersion}`);
  lines.push(`executionMode     : ${s.executionMode}`);
  lines.push(`currentPhase      : ${s.currentPhase}`);
  lines.push(`phaseAuthorization: ${s.phaseAuthorization}`);
  lines.push(`controllerArmed   : ${s.controllerArmed}`);
  lines.push(`currentWorkItem   : ${s.currentWorkItemId ?? '-'}`);
  lines.push(`workItemState     : ${s.currentWorkItemState ?? '-'}`);
  lines.push(`attempt           : ${s.attempt}/${s.maxAttempts}`);
  lines.push(`lastFailure       : ${s.lastFailureClass ?? '-'}`);
  lines.push(`humanGateRequired : ${s.humanGateRequired}`);
  lines.push(`phaseBoundaryReached: ${s.phaseBoundaryReached}`);
  lines.push(`createdAt         : ${s.createdAt}`);
  lines.push(`updatedAt         : ${s.updatedAt}`);
  return lines.join('\n');
}
