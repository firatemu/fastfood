import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeEach, afterEach } from 'vitest';

/**
 * Test helpers: an isolated tmp state directory per test.
 * Never touches the real `.fastfood-controller/` directory.
 */

export function useTmpStateDir(): { stateDir: () => string; cleanup: () => void } {
  let dir: string = mkdtempSync(path.join(tmpdir(), 'ff-controller-'));
  mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  mkdirSync(path.join(dir, 'evidence'), { recursive: true });
  beforeEach(() => {
    // Reset to a fresh directory on every test run so tests are fully isolated.
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(path.join(tmpdir(), 'ff-controller-'));
    mkdirSync(path.join(dir, 'manifests'), { recursive: true });
    mkdirSync(path.join(dir, 'evidence'), { recursive: true });
  });
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });
  return {
    stateDir: () => dir,
    cleanup: () => {
      if (dir) rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Minimal fake PROJECT_STATUS view with Phase 0 closed + Phase 1 NOT AUTHORIZED.
 * Synthetic — does NOT read the real PROJECT_STATUS.md.
 */
export function syntheticClosedStatus() {
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
    autonomousExecution: 'NOT YET ARMED',
    nextAuthorizedTask: 'AUTONOMOUS_DEVELOPMENT_CONTROLLER_BOOTSTRAP',
    autonomousController: 'NOT YET INSTALLED',
    fatal: null,
  };
}

export function writeSyntheticManifest(
  stateDir: string,
  id: string,
  data: Record<string, unknown>,
): void {
  const p = path.join(stateDir, 'manifests', `${id}.json`);
  writeFileSync(p, JSON.stringify(data, null, 2));
}
