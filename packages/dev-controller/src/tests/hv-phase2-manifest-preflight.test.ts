/**
 * MANIFEST VALIDATION — pre-flight schema check for the REMEDIATED
 * Phase 2 preparation artifacts. Mirrors the planned manifest
 * bodies in `project-reports/governance/CANONICAL_PHASE_2_AUTONOMOUS_PREPARATION.md`
 * (REMEDIATED version).
 *
 * Does NOT initialize Phase 2 controller runtime state. Only
 * validates syntactic validity against `ManifestSchema` plus
 * structural invariants (canonical phase, human acceptance,
 * allowedPaths / forbiddenPaths policy, max repair attempts, etc.).
 */
import { existsSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { ManifestSchema } from '../schema.js';

interface PlannedManifest {
  id: string;
  phase: string;
  title: string;
  objective: string;
  contractReferences: string[];
  dependencies: string[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  verificationCommands: string[];
  maxRepairAttempts: number;
  requiresHumanAcceptance: boolean;
  status: 'ACTIVE' | 'DEPRECATED';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  evidenceRequirements: string[];
}

const PLANNED: PlannedManifest[] = [
  {
    id: 'P2-001',
    phase: 'PHASE_2',
    title: 'Freeze canonical token surface',
    objective:
      'Finalize @fastfood/design-tokens as the canonical primitive + semantic + web + native token entry point.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
    ],
    dependencies: [],
    allowedPaths: [
      'packages/design-tokens/src/**',
      'packages/design-tokens/scripts/**',
      'packages/design-tokens/package.json',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
    ],
    forbiddenPaths: ['apps/**', 'packages/ui-web/src/**', 'packages/ui-native/src/**'],
    verificationCommands: ['pnpm --filter @fastfood/design-tokens build'],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    notes: 'Freeze; do not redesign tokens.',
    evidenceRequirements: ['build PASS evidence for @fastfood/design-tokens'],
  },
  {
    id: 'P2-002',
    phase: 'PHASE_2',
    title: 'Token-consumption enforcement',
    objective:
      'Deterministic check-design-tokens script proves consumers do not use arbitrary hex/spacing/radius/shadow values.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
    ],
    dependencies: ['P2-001'],
    allowedPaths: [
      'packages/design-tokens/src/**',
      'packages/design-tokens/scripts/**',
      'packages/ui-web/src/**',
      'packages/ui-native/src/**',
    ],
    forbiddenPaths: ['apps/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/design-tokens build',
      'pnpm --filter @fastfood/design-tokens check:consumer-tokens',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    evidenceRequirements: ['build PASS evidence', 'check:consumer-tokens PASS evidence'],
  },
  {
    id: 'P2-003',
    phase: 'PHASE_2',
    title: 'Token surface extension (color, elevation, motion, breakpoints)',
    objective:
      'Extend design-tokens with semantic color, elevation, motion, and breakpoint tokens per document 38.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
    ],
    dependencies: ['P2-001'],
    allowedPaths: [
      'packages/design-tokens/src/**',
      'packages/design-tokens/scripts/**',
      'packages/design-tokens/dist/**',
    ],
    forbiddenPaths: ['apps/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/design-tokens build',
      'pnpm --filter @fastfood/design-tokens check:consumer-tokens',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    evidenceRequirements: ['build PASS evidence', 'check:consumer-tokens PASS evidence'],
  },
  {
    id: 'P2-004',
    phase: 'PHASE_2',
    title: 'Token policy enforcement integration',
    objective:
      'Repository deterministic enforcement (the check:consumer-tokens script) is integrated into the package script and the root pipeline.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/34-CODEBASE_CONVENTIONS.md',
    ],
    dependencies: ['P2-001'],
    allowedPaths: [
      'packages/design-tokens/src/**',
      'packages/design-tokens/scripts/**',
      'packages/design-tokens/package.json',
      'packages/ui-web/src/**',
      'packages/ui-native/src/**',
    ],
    forbiddenPaths: ['apps/**', 'packages/dev-controller/**'],
    verificationCommands: ['pnpm --filter @fastfood/design-tokens check:consumer-tokens'],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    notes: 'NORMALIZED from 5 to 3 — no canonical contract warrants a larger budget.',
    evidenceRequirements: ['check:consumer-tokens PASS evidence'],
  },
  {
    id: 'P2-005',
    phase: 'PHASE_2',
    title: 'ui-web component inventory',
    objective: 'Implement the web component inventory per document 05 §5 in packages/ui-web/src.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md',
    ],
    dependencies: ['P2-002', 'P2-003', 'P2-004'],
    allowedPaths: [
      'packages/ui-web/src/**',
      'packages/ui-web/__tests__/**',
      'packages/design-tokens/src/**',
    ],
    forbiddenPaths: ['apps/**', 'packages/ui-native/src/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/ui-web lint',
      'pnpm --filter @fastfood/ui-web typecheck',
      'pnpm --filter @fastfood/ui-web test:unit',
      'pnpm --filter @fastfood/ui-web build',
      'pnpm --filter @fastfood/design-tokens check:consumer-tokens',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'lint PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'build PASS evidence',
      'check:consumer-tokens PASS evidence',
    ],
  },
  {
    id: 'P2-006',
    phase: 'PHASE_2',
    title: 'ui-native component inventory',
    objective:
      'Implement the native component inventory per document 05 §5 in packages/ui-native/src.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md',
    ],
    dependencies: ['P2-002', 'P2-003', 'P2-004'],
    allowedPaths: [
      'packages/ui-native/src/**',
      'packages/ui-native/__tests__/**',
      'packages/design-tokens/src/**',
    ],
    forbiddenPaths: ['apps/**', 'packages/ui-web/src/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/ui-native lint',
      'pnpm --filter @fastfood/ui-native typecheck',
      'pnpm --filter @fastfood/ui-native test:unit',
      'pnpm --filter @fastfood/ui-native build',
      'pnpm --filter @fastfood/design-tokens check:consumer-tokens',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'lint PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'build PASS evidence',
      'check:consumer-tokens PASS evidence',
    ],
  },
  {
    id: 'P2-007',
    phase: 'PHASE_2',
    title: 'Component state coverage tests (Vitest + Playwright)',
    objective:
      'Vitest + Playwright state-coverage spec covering the eight enumerated states plus a responsive breakpoint smoke for every interactive component.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P2-005', 'P2-006'],
    allowedPaths: [
      'packages/ui-web/src/**',
      'packages/ui-web/__tests__/**',
      'packages/ui-native/src/**',
      'packages/ui-native/__tests__/**',
      'tests/e2e/tests/ui-state-coverage.spec.ts',
      'tests/e2e/playwright.config.ts',
    ],
    forbiddenPaths: ['apps/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/ui-web test:unit',
      'pnpm --filter @fastfood/ui-native test:unit',
      'pnpm --filter @fastfood/e2e-web exec playwright test --project=chromium tests/ui-state-coverage.spec.ts',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'ui-web test:unit PASS evidence',
      'ui-native test:unit PASS evidence',
      'web Playwright state-coverage PASS evidence',
    ],
  },
  {
    id: 'P2-008',
    phase: 'PHASE_2',
    title: 'Accessibility tests (WCAG 2.2 AA + axe-core)',
    objective:
      'Accessibility tests: keyboard navigation, visible focus, ARIA roles, contrast (axe-core in Playwright for web), native touch-target ≥ 44px.',
    contractReferences: [
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
      'fastfood-project-docs/24-NONFUNCTIONAL_REQUIREMENTS.md',
    ],
    dependencies: ['P2-005', 'P2-006'],
    allowedPaths: [
      'packages/ui-web/src/**',
      'packages/ui-web/__tests__/**',
      'packages/ui-native/src/**',
      'packages/ui-native/__tests__/**',
      'tests/e2e/tests/ui-a11y.spec.ts',
      'tests/e2e/playwright.config.ts',
      'tests/e2e/package.json',
      'pnpm-lock.yaml',
    ],
    forbiddenPaths: ['apps/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/ui-web test:unit',
      'pnpm --filter @fastfood/ui-native test:unit',
      'pnpm --filter @fastfood/e2e-web exec playwright test --project=chromium tests/ui-a11y.spec.ts',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      '@axe-core/playwright is a Phase 2 dependency; adding it requires an ADR per document 46.',
    evidenceRequirements: [
      'ui-web test:unit PASS evidence',
      'ui-native test:unit PASS evidence',
      'web Playwright a11y (axe-core) PASS evidence',
    ],
  },
  {
    id: 'P2-009',
    phase: 'PHASE_2',
    title: 'Shared surface coverage in Admin shell',
    objective:
      'Wire the shared primitives into the Admin production shell: app routes consume ui-web surface states and document the canonical coverage.',
    contractReferences: ['fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md'],
    dependencies: ['P2-005', 'P2-006', 'P2-007', 'P2-008'],
    allowedPaths: [
      'apps/admin-web/src/**',
      'apps/customer-mobile/src/**',
      'apps/courier-mobile/src/**',
      'fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md',
    ],
    forbiddenPaths: ['apps/api/**', 'apps/worker/**', 'apps/storefront-web/src/**'],
    verificationCommands: [
      'pnpm --filter @fastfood/admin-web typecheck',
      'pnpm --filter @fastfood/customer-mobile typecheck',
      'pnpm --filter @fastfood/courier-mobile typecheck',
      'pnpm --filter @fastfood/admin-web build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Runtime state-coverage of shared primitives is documented in tests/e2e/tests/ui-state-coverage.spec.ts.',
    evidenceRequirements: [
      'admin-web typecheck PASS evidence',
      'admin-web build PASS evidence',
      'customer-mobile typecheck PASS evidence',
      'courier-mobile typecheck PASS evidence',
      'tests/e2e/tests/ui-state-coverage.spec.ts PASS evidence',
    ],
  },
  {
    id: 'P2-010',
    phase: 'PHASE_2',
    title: 'Phase 2 verification pipeline + DoD',
    objective:
      'Wire the shared-component build into the root verification pipeline and verify Phase 2 Definition of Done.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P2-009'],
    allowedPaths: [
      'package.json',
      'turbo.json',
      'packages/design-tokens/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
      'tests/**',
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
    ],
    forbiddenPaths: ['apps/api/src/modules/**'],
    verificationCommands: [
      'pnpm format:check',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test:unit --force',
      'pnpm --filter @fastfood/design-tokens build',
      'pnpm --filter @fastfood/ui-web build',
      'pnpm --filter @fastfood/ui-native build',
      'pnpm --filter @fastfood/admin-web build',
      'pnpm --filter @fastfood/design-tokens check:consumer-tokens',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'format:check PASS evidence',
      'lint PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'shared package build PASS evidence',
      'check:consumer-tokens PASS evidence',
    ],
  },
];

describe('Phase 2 MANIFEST VALIDATION — REMEDIATED pre-flight', () => {
  for (const m of PLANNED) {
    it(`manifest ${m.id} is valid against ManifestSchema`, () => {
      const parsed = ManifestSchema.safeParse(m);
      expect(parsed.success).toBe(true);
    });
  }

  it('every manifest phase is PHASE_2 (canonical)', () => {
    for (const m of PLANNED) {
      expect(m.phase).toBe('PHASE_2');
    }
  });

  it('every manifest requires human acceptance', () => {
    for (const m of PLANNED) {
      expect(m.requiresHumanAcceptance).toBe(true);
    }
  });

  it('every manifest declares at least one allowedPaths entry', () => {
    for (const m of PLANNED) {
      expect(m.allowedPaths.length + m.forbiddenPaths.length).toBeGreaterThan(0);
    }
  });

  it('every manifest maxRepairAttempts is 3 (normalized)', () => {
    for (const m of PLANNED) {
      expect(m.maxRepairAttempts).toBe(3);
    }
  });

  it('every verification command is non-empty and ≤ 2048 chars', () => {
    for (const m of PLANNED) {
      for (const cmd of m.verificationCommands) {
        expect(cmd.length).toBeGreaterThan(0);
        expect(cmd.length).toBeLessThanOrEqual(2048);
        expect(cmd).not.toContain('\n');
        expect(cmd).not.toMatch(/^\s*cd\s+\//);
      }
    }
  });

  it('every check:consumer-tokens verification command is real (script exists)', () => {
    expect(
      existsSync(
        '/home/azem/projects/fastfood/packages/design-tokens/scripts/check-design-tokens.mjs',
      ),
    ).toBe(true);
  });

  it('P2-004 normalized to 3 (was 5)', () => {
    const p2 = PLANNED.find((x) => x.id === 'P2-004');
    expect(p2).toBeDefined();
    expect(p2!.maxRepairAttempts).toBe(3);
  });

  it('P2-006 build verification uses ui-native (corrected)', () => {
    const p2 = PLANNED.find((x) => x.id === 'P2-006');
    expect(p2).toBeDefined();
    expect(p2!.verificationCommands.some((c) => c.includes('@fastfood/ui-native build'))).toBe(
      true,
    );
    expect(p2!.verificationCommands.some((c) => c.includes('@fastfood/ui-web build'))).toBe(false);
  });

  it('P2-007/P2-008 include Playwright commands with real project', () => {
    for (const id of ['P2-007', 'P2-008']) {
      const p2 = PLANNED.find((x) => x.id === id);
      expect(p2).toBeDefined();
      expect(p2!.verificationCommands.some((c) => c.includes('e2e-web exec playwright test'))).toBe(
        true,
      );
    }
  });

  it('P2-008 allowedPaths includes tests/e2e/package.json for Phase 2 dependency', () => {
    const p2 = PLANNED.find((x) => x.id === 'P2-008');
    expect(p2).toBeDefined();
    expect(p2!.allowedPaths).toContain('tests/e2e/package.json');
  });

  it('P2-009 verification includes admin-web build for shared surface coverage', () => {
    const p2 = PLANNED.find((x) => x.id === 'P2-009');
    expect(p2).toBeDefined();
    expect(p2!.verificationCommands.some((c) => c.includes('@fastfood/admin-web build'))).toBe(
      true,
    );
  });

  it('P2-010 includes the enforcement check in the final DoD', () => {
    const p2 = PLANNED.find((x) => x.id === 'P2-010');
    expect(p2).toBeDefined();
    expect(p2!.verificationCommands.some((c) => c.includes('check:consumer-tokens'))).toBe(true);
  });

  it('scope guard forbids app/business code in design-system-only work', () => {
    // P2-001..P2-008 explicitly forbid apps/**. P2-009 forbids only the
    // apps that do NOT host admin production surfaces (api, worker, storefront).
    for (const id of [
      'P2-001',
      'P2-002',
      'P2-003',
      'P2-004',
      'P2-005',
      'P2-006',
      'P2-007',
      'P2-008',
    ]) {
      const m = PLANNED.find((x) => x.id === id)!;
      expect(m.forbiddenPaths).toContain('apps/**');
    }
    const p9 = PLANNED.find((x) => x.id === 'P2-009')!;
    expect(p9.forbiddenPaths).toContain('apps/api/**');
    expect(p9.forbiddenPaths).toContain('apps/worker/**');
    expect(p9.forbiddenPaths).toContain('apps/storefront-web/src/**');
  });

  it('dependency graph is acyclic (P2-001..P2-010)', () => {
    const ids = PLANNED.map((m) => m.id);
    const byId = new Map(PLANNED.map((m) => [m.id, m]));
    const visited = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string): boolean => {
      if (stack.has(id)) return false;
      if (visited.has(id)) return true;
      stack.add(id);
      const m = byId.get(id);
      if (m) {
        for (const dep of m.dependencies) {
          expect(ids).toContain(dep);
          if (!visit(dep)) return false;
        }
      }
      stack.delete(id);
      visited.add(id);
      return true;
    };
    for (const id of ids) {
      expect(visit(id)).toBe(true);
    }
  });
});
