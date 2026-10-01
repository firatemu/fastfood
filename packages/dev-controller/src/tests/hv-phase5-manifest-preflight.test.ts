/**
 * MANIFEST VALIDATION — pre-flight schema check for the planned
 * Phase 5 preparation artifact. Mirrors the planned manifest
 * bodies in
 * `project-reports/governance/CANONICAL_PHASE_5_AUTONOMOUS_PREPARATION.md`.
 *
 * Does NOT initialize Phase 5 controller runtime state. Only
 * validates syntactic validity against `ManifestSchema` plus
 * structural invariants.
 */
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
    id: 'P5-001',
    phase: 'PHASE_5',
    title: 'Cart Prisma schema + canonical migration set',
    objective:
      'Forward-only canonical Prisma migration set extends the schema with cart entities (Cart, CartLineItem, CartLineModifier, CartLineRemoval) per document 09 + 31 §"Checkout/payment" + 16 + 35.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
      'fastfood-project-docs/16-DATA_MODEL_DATABASE.md',
      'fastfood-project-docs/35-DATABASE_PRISMA_CONVENTIONS.md',
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
      'fastfood-project-docs/06-STOREFRONT_CUSTOMER_EXPERIENCE.md',
    ],
    dependencies: ['P4-003'],
    allowedPaths: [
      'apps/api/prisma/schema.prisma',
      'apps/api/prisma/migrations/**',
      'apps/api/prisma/seed.ts',
      'apps/api/prisma.config.ts',
      'packages/domain-types/src/**',
      'packages/contracts/src/**',
    ],
    forbiddenPaths: [
      'apps/api/src/modules/**',
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api prisma:validate',
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/contracts build',
      'pnpm --filter @fastfood/domain-types build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Phase 5 ships a forward-only canonical migration set under apps/api/prisma/migrations/. Money-bearing columns use BIGINT per document 35 §5.',
    evidenceRequirements: [
      'prisma:validate PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'contracts build PASS evidence',
      'domain-types build PASS evidence',
    ],
  },
  {
    id: 'P5-002',
    phase: 'PHASE_5',
    title: 'Cart domain service (add / update / remove / merge)',
    objective:
      'Cart domain service: add-line, update-line, remove-line, clear, get-cart, guest-vs-customer merge. In-memory backing store; full persistence under the Session table wired by P5-006.',
    contractReferences: [
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
      'fastfood-project-docs/06-STOREFRONT_CUSTOMER_EXPERIENCE.md',
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
    ],
    dependencies: ['P5-001'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/test/**',
      'packages/contracts/src/**',
      'packages/validation/src/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/contracts build',
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
      'contracts build PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P5-003',
    phase: 'PHASE_5',
    title: 'Cart RBAC ownership (CartOwnershipPolicy)',
    objective:
      'CartOwnershipPolicy enforces that only the cart owner can read / mutate it. Implements the canonical ResourcePolicy<TResource, TPrincipal> interface from apps/api/src/modules/auth/policies/resource-policy.ts.',
    contractReferences: [
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
    ],
    dependencies: ['P5-001', 'P5-002'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/src/modules/auth/policies/**',
      'apps/api/test/**',
      'packages/contracts/src/**',
      'packages/validation/src/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P5-004',
    phase: 'PHASE_5',
    title: 'Cart quote endpoint (additive-only minimum quote)',
    objective:
      'POST /api/v1/storefront/cart/quote returns the authoritative price quote per document 37 §3 minimum (subtotal + variant delta + modifier delta). Full pricing formula (loyalty / discounts / delivery fee / minimum-order / rounding) ships under Phase 6.',
    contractReferences: [
      'fastfood-project-docs/37-PRICING_CALCULATION_CONTRACT.md',
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
    ],
    dependencies: ['P5-002'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/test/**',
      'packages/contracts/src/**',
      'packages/validation/src/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Phase 5 ships additive-only pricing per document 37 §3 minimum. The full pricing formula (discounts / loyalty / fees / rounding / minimum-order) lands under Phase 6 per the same document.',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P5-005',
    phase: 'PHASE_5',
    title: 'Cart validation (active + branch + quantity + modifiers)',
    objective:
      'Add-to-cart validates: product is active, branch serves it, quantity is positive, modifiers conform to selection-min/max. Centralized in CartValidationService so the controller surface stays thin.',
    contractReferences: [
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
      'fastfood-project-docs/08-CATALOG_PRODUCT_CUSTOMIZATION.md',
    ],
    dependencies: ['P5-002'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/src/modules/catalog/**',
      'apps/api/test/**',
      'packages/contracts/src/**',
      'packages/validation/src/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P5-006',
    phase: 'PHASE_5',
    title: 'Storefront cart endpoints + envelope',
    objective:
      'Storefront cart endpoints under /api/v1/storefront/cart/** with canonical envelope per document 40 §2. Endpoints: GET /cart, POST /cart/lines, PATCH /cart/lines/:id, DELETE /cart/lines/:id, DELETE /cart, POST /cart/merge (guest->customer).',
    contractReferences: [
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
      'fastfood-project-docs/06-STOREFRONT_CUSTOMER_EXPERIENCE.md',
    ],
    dependencies: ['P5-002', 'P5-005'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/test/**',
      'packages/contracts/src/**',
      'packages/validation/src/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/api openapi:export',
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
      'openapi:export PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P5-007',
    phase: 'PHASE_5',
    title: 'OutboxEvent emission for cart mutations',
    objective:
      'OutboxEvent emission paths for cart mutations (CartLineAdded / CartLineUpdated / CartLineRemoved) per document 17 §4. Transactional helper.',
    contractReferences: [
      'fastfood-project-docs/17-API_EVENTS_REALTIME.md',
      'fastfood-project-docs/18-SECURITY_PRIVACY_AUDIT.md',
      'fastfood-project-docs/45-OBSERVABILITY_LOGGING_CONTRACT.md',
    ],
    dependencies: ['P5-002'],
    allowedPaths: [
      'apps/api/src/modules/cart/**',
      'apps/api/src/common/audit/**',
      'apps/api/src/common/outbox/**',
      'apps/api/test/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/observability build',
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/contracts build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'observability build PASS evidence',
      'api build PASS evidence',
      'contracts build PASS evidence',
    ],
  },
  {
    id: 'P5-008',
    phase: 'PHASE_5',
    title: 'Storefront cart smoke test',
    objective:
      'End-to-end cart smoke test (Phase 5: Vitest-based API integration test simulating the storefront cart flow; Playwright is wired in tests/e2e/ for Phase 10).',
    contractReferences: [
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
      'fastfood-project-docs/06-STOREFRONT_CUSTOMER_EXPERIENCE.md',
    ],
    dependencies: ['P5-006'],
    allowedPaths: [
      'apps/api/test/integration/**',
      'apps/api/src/modules/cart/**',
      'apps/api/src/modules/catalog/**',
      'tests/e2e/**',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Phase 5 ships an in-process integration smoke test under apps/api/test/integration/. Playwright Web smoke lives under tests/e2e/ (Phase 10).',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P5-009',
    phase: 'PHASE_5',
    title: 'Negative-test matrix (cart endpoints)',
    objective:
      'Negative-test matrix for every protected cart endpoint (document 39 §10): unauthenticated / wrong-permission / wrong-scope / correct-scope.',
    contractReferences: [
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P5-006'],
    allowedPaths: ['apps/api/src/modules/cart/**', 'apps/api/test/**', 'tests/api/**'],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/api test:integration',
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence',
      'api build PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P5-010',
    phase: 'PHASE_5',
    title: 'Phase 5 verification pipeline + DoD',
    objective:
      'Phase 5 verification pipeline + DoD. Wire the cart build into the root verification pipeline and verify Phase 5 Definition of Done.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P5-009'],
    allowedPaths: [
      'package.json',
      'turbo.json',
      'apps/api/**',
      'packages/config/**',
      'packages/contracts/**',
      'packages/domain-types/**',
      'packages/validation/**',
      'packages/observability/**',
      'apps/api/prisma/**',
      'tests/**',
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
    ],
    forbiddenPaths: [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
      'packages/ui-web/**',
      'packages/ui-native/**',
    ],
    verificationCommands: [
      'pnpm format:check',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test:unit --force',
      'pnpm db:validate',
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/contracts build',
      'pnpm --filter @fastfood/domain-types build',
      'pnpm --filter @fastfood/validation build',
      'pnpm --filter @fastfood/config build',
      'pnpm --filter @fastfood/observability build',
      'pnpm --filter @fastfood/dev-controller test:unit',
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
      'db:validate PASS evidence',
      'per-package build PASS evidence',
      'dev-controller test:unit PASS evidence',
    ],
  },
];

describe('Phase 5 MANIFEST VALIDATION — preparation pre-flight', () => {
  for (const m of PLANNED) {
    it(`planned manifest ${m.id} is valid against ManifestSchema`, () => {
      const parsed = ManifestSchema.safeParse(m);
      expect(parsed.success).toBe(true);
    });
  }

  it('every planned manifest phase is PHASE_5 (canonical)', () => {
    for (const m of PLANNED) {
      expect(m.phase).toBe('PHASE_5');
    }
  });

  it('every planned manifest id matches the canonical P5-NNN pattern', () => {
    for (const m of PLANNED) {
      expect(m.id).toMatch(/^P5-0\d\d$/);
    }
  });

  it('every planned manifest requires human acceptance (deferred to final gate)', () => {
    for (const m of PLANNED) {
      expect(m.requiresHumanAcceptance).toBe(true);
    }
  });

  it('every planned manifest declares at least one allowedPaths or forbiddenPaths entry', () => {
    for (const m of PLANNED) {
      expect(m.allowedPaths.length + m.forbiddenPaths.length).toBeGreaterThan(0);
    }
  });

  it('every planned manifest maxRepairAttempts is 3 (bounded)', () => {
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

  it('P5-001 prisma:validate target matches work item', () => {
    const m = PLANNED.find((x) => x.id === 'P5-001')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/api prisma:validate'))).toBe(
      true,
    );
  });

  it('P5-006 includes openapi:export', () => {
    const m = PLANNED.find((x) => x.id === 'P5-006')!;
    expect(m.verificationCommands.some((c) => c.includes('openapi:export'))).toBe(true);
  });

  it('P5-007 includes observability build (audit log uses structured-logger helpers)', () => {
    const m = PLANNED.find((x) => x.id === 'P5-007')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/observability build'))).toBe(
      true,
    );
  });

  it('P5-008 + P5-009 include test:integration for HTTP-boundary coverage', () => {
    for (const id of ['P5-008', 'P5-009']) {
      const m = PLANNED.find((x) => x.id === id)!;
      expect(m.verificationCommands.some((c) => c.includes('test:integration'))).toBe(true);
    }
  });

  it('P5-009 allowedPaths includes tests/api/**', () => {
    const m = PLANNED.find((x) => x.id === 'P5-009')!;
    expect(m.allowedPaths).toContain('tests/api/**');
  });

  it('P5-010 verification includes db:validate + dev-controller test:unit', () => {
    const m = PLANNED.find((x) => x.id === 'P5-010')!;
    expect(m.verificationCommands.some((c) => c.includes('pnpm db:validate'))).toBe(true);
    expect(
      m.verificationCommands.some((c) => c.includes('@fastfood/dev-controller test:unit')),
    ).toBe(true);
  });

  it('every planned manifest forbids every Phase 6+ app/business surface', () => {
    const phaseSixPlusApps = [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
    ];
    for (const m of PLANNED) {
      for (const guard of phaseSixPlusApps) {
        expect(m.forbiddenPaths).toContain(guard);
      }
    }
  });

  it('every planned manifest forbids the UI design-system packages', () => {
    for (const m of PLANNED) {
      expect(m.forbiddenPaths).toContain('packages/ui-web/**');
      expect(m.forbiddenPaths).toContain('packages/ui-native/**');
    }
  });

  it('dependency graph is acyclic (P5-001..P5-010 with cross-phase deps to P4-003)', () => {
    const ids = PLANNED.map((m) => m.id);
    const byId = new Map(PLANNED.map((m) => [m.id, m]));
    // P5-001 depends on P4-003 from Phase 4.
    const externalDeps = new Set<string>(['P4-003']);
    const allKnown = new Set<string>([...ids, ...externalDeps]);
    const visited = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string): boolean => {
      if (stack.has(id)) return false;
      if (visited.has(id)) return true;
      stack.add(id);
      const m = byId.get(id);
      if (m) {
        for (const dep of m.dependencies) {
          expect(allKnown.has(dep)).toBe(true);
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
