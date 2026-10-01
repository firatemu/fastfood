/**
 * Parser compatibility test — verifies that the post-reconciliation
 * PROJECT_STATUS.md (canonical numbering) still parses correctly into
 * the controller's ProjectStatusView.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { parseProjectStatusView, isPhaseAuthorized } from '../authz.js';

const PS_PATH = path.resolve('/home/azem/projects/fastfood/PROJECT_STATUS.md');

describe('Post-reconciliation PROJECT_STATUS parser compatibility', () => {
  it('parses the canonical PROJECT_STATUS.md correctly', () => {
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    expect(view.executionMode).toBe('FULL_PROJECT_AUTONOMOUS_DEVELOPMENT');
    expect(view.deployment).toBe('PROHIBITED / DEFERRED');
    expect(view.production).toBe('NOT ACTIVE');
    expect(view.projectAutonomousExecutionAuthorized).toBe(true);
    // After Phase 10 technical completion the final human gate is open —
    // acceptance is no longer deferred (FAR remediation may pause the gate).
    expect(view.humanAcceptanceDeferred).toBe(false);
    // Phase 0 (canonical = docs)
    expect(view.phase0Status).toBe('ACCEPTED / CLOSED');
    expect(view.phase0HumanAcceptance).toBe('PASS');
    // Phase 1 (canonical = repository foundation, accepted)
    expect(view.phase1Status).toBe('ACCEPTED / CLOSED');
    // Phase 1 authorization row still exists, value = NOT AUTHORIZED
    // (semantically reserved for future canonical Phase 1 sub-phases).
    expect(view.phase1Authorization).toBe('NOT AUTHORIZED');
    // Phase 2: human-authorized, technically complete, human acceptance deferred.
    expect(view.phase2Authorization).toBe('AUTHORIZED');
    // Phase 3: human-authorized at the preparation level.
    expect(view.phase3Authorization).toBe('AUTHORIZED');
    // Autonomous
    expect(view.autonomousExecution).toBe('ARMED');
    expect(view.autonomousController).toBe('INSTALLED / VALIDATED / HUMAN ACCEPTED');
    // Technical development is complete; Admin / Operations human QA
    // is the current authorized task at the final human gate.
    expect(view.nextAuthorizedTask).toBe('LOCAL_HUMAN_QA_OPERATIONS_ADMIN');
    expect(view.fatal).toBeNull();
  });

  it('PHASE_1 manifest is REJECTED (canonical Phase 1 authorization row = NOT AUTHORIZED)', () => {
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    const r = isPhaseAuthorized(view, 'PHASE_1');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AUTHORIZATION_FAILURE');
  });

  it('PHASE_2 manifest is ACCEPTED (human-authorized for canonical Phase 2)', () => {
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    const r = isPhaseAuthorized(view, 'PHASE_2');
    expect(r.ok).toBe(true);
    expect(r.code).toBe('OK');
  });

  it('PHASE_3 manifest is ACCEPTED (human-authorized at the preparation level)', () => {
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    const r = isPhaseAuthorized(view, 'PHASE_3');
    expect(r.ok).toBe(true);
    expect(r.code).toBe('OK');
  });

  it('generic phase parser populated phases[] for PHASE_0..3', () => {
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    const ids = view.phases.map((p) => p.id).sort();
    expect(ids).toContain('PHASE_0');
    expect(ids).toContain('PHASE_2');
    expect(ids).toContain('PHASE_3');
    expect(view.phases.find((p) => p.index === 0)?.humanAcceptance).toBe('PASS');
    expect(view.phases.find((p) => p.index === 2)?.authorization).toBe('AUTHORIZED');
    expect(view.phases.find((p) => p.index === 3)?.authorization).toBe('AUTHORIZED');
  });

  it('PHASE_0 grant is granted at table level because phase0Status = ACCEPTED/CLOSED', () => {
    // The controller's authorization function grants PHASE_0 when the
    // table says so. The semantic that canonical Phase 0 = docs-only
    // (no code mandate) is enforced by the human owner and ADR-003, not
    // by the controller's runtime logic. This test asserts the
    // table-level authorization, which is the controller's data-driven
    // contract.
    const raw = readFileSync(PS_PATH, 'utf8');
    const view = parseProjectStatusView(raw);
    const r = isPhaseAuthorized(view, 'PHASE_0');
    expect(r.ok).toBe(true);
  });
});
