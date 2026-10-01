import { describe, expect, it } from 'vitest';

import { validateScope } from '../scope.js';

describe('11/12/13. scope guard', () => {
  const baseManifest = {
    id: 'T',
    phase: 'PHASE_0',
    title: 't',
    objective: 'o',
    contractReferences: [],
    dependencies: [],
    allowedPaths: ['packages/dev-controller/src/*'],
    forbiddenPaths: ['packages/dev-controller/src/cli.ts'],
    verificationCommands: ['echo ok'],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: false,
    status: 'ACTIVE' as const,
  };

  it('11. all files inside allowed scope → PASS', () => {
    const r = validateScope({ ...baseManifest }, [
      'packages/dev-controller/src/store.ts',
      'packages/dev-controller/src/authz.ts',
    ]);
    // eslint-disable-next-line no-restricted-syntax
    console.log('test 11 manifest:', JSON.stringify(baseManifest));
    expect(r.ok).toBe(true);
  });

  it('12. one file outside allowed scope → BLOCK', () => {
    const r = validateScope({ ...baseManifest }, [
      'packages/dev-controller/src/store.ts',
      'packages/dev-controller/other/authz.ts',
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].reason).toBe('OUTSIDE_ALLOWED');
  });

  it('13. explicitly forbidden path → BLOCK', () => {
    const r = validateScope({ ...baseManifest }, [
      'packages/dev-controller/src/store.ts',
      'packages/dev-controller/src/cli.ts',
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.some((v) => v.reason === 'FORBIDDEN')).toBe(true);
  });
});
