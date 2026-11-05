/**
 * Parser compatibility test — verifies that the post-reconciliation
 * PROJECT_STATUS.md (canonical numbering) still parses correctly into
 * the controller's ProjectStatusView.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { parseProjectStatusView, isPhaseAuthorized } from '../authz.js';

/**
 * Resolve the canonical PROJECT_STATUS.md by walking up from this file
 * until the repository root marker is found. Hardcoding an absolute path
 * made the test machine-specific; walking up keeps it portable across
 * developer machines and CI runners.
 */
function resolveProjectStatusPath(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'PROJECT_STATUS.md');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('PROJECT_STATUS.md not found while walking up from the test file');
}

const PS_PATH = resolveProjectStatusPath();

/**
 * Extract the canonical value of a `**Label**` table row straight from the
 * source document. The parser test asserts round-trip fidelity, so the
 * expectation is derived from the canonical file instead of being hardcoded
 * — a hardcoded task id silently rots whenever the human owner updates
 * PROJECT_STATUS.md.
 */
function canonicalRowValue(raw: string, label: string): string {
  const pattern = new RegExp(`^\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*\`([^\`]+)\`\\s*\\|`, 'm');
  const match = pattern.exec(raw);
  if (!match?.[1]) throw new Error(`row not found in PROJECT_STATUS.md: ${label}`);
  return match[1];
}

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
    // Technical development is complete; the current authorized task is the
    // one the human owner recorded. Asserted against the canonical file so
    // the expectation tracks owner updates instead of rotting.
    expect(view.nextAuthorizedTask).toBe(canonicalRowValue(raw, 'Next authorized repository task'));
    expect(view.nextAuthorizedTask).toBe('ADMIN_VISUAL_NAVY_A9_COMPLETE');
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
