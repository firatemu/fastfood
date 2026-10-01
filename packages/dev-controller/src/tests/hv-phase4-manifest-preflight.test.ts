/**
 * MANIFEST VALIDATION — pre-flight schema check for the planned
 * Phase 4 preparation artifact. Mirrors the planned manifest
 * bodies in
 * `project-reports/governance/CANONICAL_PHASE_4_AUTONOMOUS_PREPARATION.md`.
 *
 * Does NOT initialize Phase 4 controller runtime state. Only
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
    id: 'P4-001',
    phase: 'PHASE_4',
    title: 'Catalog + branch Prisma schema + canonical migration set',
    objective:
      'Forward-only canonical Prisma migration set extends the schema with the catalog + branch entities (Category, Product, ProductMedia, ProductVariant, ModifierGroup, Modifier, ProductModifierGroup, IngredientRemovalOption, Allergen, ProductAllergen, BranchProductAvailability, Branch, BranchOperatingHours, ServiceArea) per document 31 + 16 + 35.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
      'fastfood-project-docs/16-DATA_MODEL_DATABASE.md',
      'fastfood-project-docs/35-DATABASE_PRISMA_CONVENTIONS.md',
      'fastfood-project-docs/08-CATALOG_PRODUCT_CUSTOMIZATION.md',
      'fastfood-project-docs/13-BRANCH_SERVICE_AREA_ROUTING.md',
    ],
    dependencies: ['P3-001'],
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
      'Phase 4 ships a forward-only canonical migration set under apps/api/prisma/migrations/. PostGIS geometry column for ServiceArea requires the postgis extension (enabled by Phase 0 migration).',
    evidenceRequirements: [
      'prisma:validate PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'contracts build PASS evidence',
      'domain-types build PASS evidence',
    ],
  },
  {
    id: 'P4-002',
    phase: 'PHASE_4',
    title: 'Branch + service area + operating hours (schema level)',
    objective:
      'Service-area PostGIS shape + spatial index added; Branch / BranchOperatingHours / ServiceArea constraints + indexes; BranchProductAvailability model. Document 13 §2-§5.',
    contractReferences: [
      'fastfood-project-docs/13-BRANCH_SERVICE_AREA_ROUTING.md',
      'fastfood-project-docs/16-DATA_MODEL_DATABASE.md',
      'fastfood-project-docs/35-DATABASE_PRISMA_CONVENTIONS.md',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
    ],
    dependencies: ['P4-001'],
    allowedPaths: [
      'apps/api/prisma/schema.prisma',
      'apps/api/prisma/migrations/**',
      'apps/api/prisma/seed.ts',
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
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'prisma:validate PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P4-003',
    phase: 'PHASE_4',
    title: 'Catalog + branch domain services + BranchScopePolicy',
    objective:
      'Catalog domain service: category tree, product CRUD, variants, modifier groups, ingredient removal options, branch availability. BranchScopePolicy enforced on every read / mutation per document 39 §4.',
    contractReferences: [
      'fastfood-project-docs/08-CATALOG_PRODUCT_CUSTOMIZATION.md',
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
    ],
    dependencies: ['P4-001', 'P4-002'],
    allowedPaths: [
      'apps/api/src/modules/catalog/**',
      'apps/api/src/modules/branch/**',
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
    id: 'P4-004',
    phase: 'PHASE_4',
    title: 'Allergen registry + branch operating hours',
    objective:
      'Allergen CRUD endpoints under /api/v1/admin/allergens + branch operating hours CRUD under /api/v1/admin/branches/:branchId/operating-hours (special-day overrides as part of BranchOperatingHours JSONB).',
    contractReferences: [
      'fastfood-project-docs/08-CATALOG_PRODUCT_CUSTOMIZATION.md',
      'fastfood-project-docs/13-BRANCH_SERVICE_AREA_ROUTING.md',
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
    ],
    dependencies: ['P4-001'],
    allowedPaths: [
      'apps/api/src/modules/catalog/**',
      'apps/api/src/modules/branch/**',
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
    id: 'P4-005',
    phase: 'PHASE_4',
    title: 'Branch routing engine (point-in-polygon)',
    objective:
      'Routing engine: point-in-polygon assignment of customer coordinates to a branch. Uses ServiceArea polygons via the in-memory store. PostGIS production wiring deferred to a later phase.',
    contractReferences: [
      'fastfood-project-docs/13-BRANCH_SERVICE_AREA_ROUTING.md',
      'fastfood-project-docs/09-CART_CHECKOUT_PRICING.md',
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
    ],
    dependencies: ['P4-002'],
    allowedPaths: [
      'apps/api/src/modules/branch/routing/**',
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
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Phase 4 ships an in-memory point-in-polygon implementation. PostGIS spatial index is enabled by the Phase 0 extension migration; production wiring lands in a later phase.',
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
    id: 'P4-006',
    phase: 'PHASE_4',
    title: 'Admin endpoints (catalog + branch)',
    objective:
      'Admin endpoints under /api/v1/admin/** with canonical envelope. RBAC permissions from branches.read / branches.write / branches.service_areas.write / catalog.products.read / catalog.products.write / catalog.prices.write / catalog.media.write. Document 29.',
    contractReferences: [
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
    ],
    dependencies: ['P4-003', 'P4-004', 'P4-005'],
    allowedPaths: [
      'apps/api/src/modules/admin/**',
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
    id: 'P4-007',
    phase: 'PHASE_4',
    title: 'AuditLog + OutboxEvent emission for catalog / branch mutations',
    objective:
      'AuditLog + OutboxEvent emission paths for catalog / branch mutations. Transactional helper. Document 18 §8 + 17 §4.',
    contractReferences: [
      'fastfood-project-docs/18-SECURITY_PRIVACY_AUDIT.md',
      'fastfood-project-docs/17-API_EVENTS_REALTIME.md',
      'fastfood-project-docs/45-OBSERVABILITY_LOGGING_CONTRACT.md',
    ],
    dependencies: ['P4-003', 'P4-004', 'P4-005'],
    allowedPaths: [
      'apps/api/src/modules/catalog/**',
      'apps/api/src/modules/branch/**',
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
    id: 'P4-008',
    phase: 'PHASE_4',
    title: 'Negative-test matrix (admin endpoints)',
    objective: 'Negative-test matrix for every protected admin endpoint. Document 39 §10.',
    contractReferences: [
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P4-006'],
    allowedPaths: [
      'apps/api/src/modules/admin/**',
      'apps/api/src/modules/catalog/**',
      'apps/api/src/modules/branch/**',
      'apps/api/test/**',
      'tests/api/**',
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
    id: 'P4-009',
    phase: 'PHASE_4',
    title: 'Phase 4 verification pipeline + DoD',
    objective:
      'Phase 4 verification pipeline + DoD audit. Wire the catalog + branch build into the root verification pipeline.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
    ],
    dependencies: ['P4-008'],
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
  {
    id: 'P4-010',
    phase: 'PHASE_4',
    title: 'Zero-new-runtime-dependency audit',
    objective:
      'Confirm Phase 4 ships with zero new runtime dependencies. Run pnpm list --depth=0 across all workspace packages and document the dependency surface.',
    contractReferences: [
      'fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md',
      'fastfood-project-docs/46-CHANGE_CONTROL_ADR_PROTOCOL.md',
    ],
    dependencies: ['P4-009'],
    allowedPaths: [
      'pnpm-lock.yaml',
      'apps/api/package.json',
      'packages/config/package.json',
      'packages/contracts/package.json',
      'packages/domain-types/package.json',
      'packages/validation/package.json',
      'packages/observability/package.json',
      'packages/dev-controller/**',
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
      'pnpm list --depth=0 --filter @fastfood/*',
      'pnpm --filter @fastfood/api test:unit',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    notes:
      'Per ADR-004 Phase 4 ships with zero new runtime dependencies. The audit script enumerates the dependency surface of every workspace package and confirms no new entries.',
    evidenceRequirements: ['pnpm list output captured as evidence', 'api test:unit PASS evidence'],
  },
];

describe('Phase 4 MANIFEST VALIDATION — preparation pre-flight', () => {
  for (const m of PLANNED) {
    it(`planned manifest ${m.id} is valid against ManifestSchema`, () => {
      const parsed = ManifestSchema.safeParse(m);
      expect(parsed.success).toBe(true);
    });
  }

  it('every planned manifest phase is PHASE_4 (canonical)', () => {
    for (const m of PLANNED) {
      expect(m.phase).toBe('PHASE_4');
    }
  });

  it('every planned manifest id matches the canonical P4-NNN pattern', () => {
    for (const m of PLANNED) {
      expect(m.id).toMatch(/^P4-0\d\d$/);
    }
  });

  it('every planned manifest requires human acceptance', () => {
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

  it('P4-001 prisma:validate target matches work item', () => {
    const m = PLANNED.find((x) => x.id === 'P4-001')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/api prisma:validate'))).toBe(
      true,
    );
  });

  it('P4-003 / P4-004 / P4-005 / P4-006 / P4-008 include test:integration for HTTP-boundary coverage', () => {
    for (const id of ['P4-003', 'P4-004', 'P4-005', 'P4-006', 'P4-008']) {
      const m = PLANNED.find((x) => x.id === id)!;
      expect(m.verificationCommands.some((c) => c.includes('test:integration'))).toBe(true);
    }
  });

  it('P4-006 includes openapi:export', () => {
    const m = PLANNED.find((x) => x.id === 'P4-006')!;
    expect(m.verificationCommands.some((c) => c.includes('openapi:export'))).toBe(true);
  });

  it('P4-007 includes observability build (audit log uses structured-logger helpers)', () => {
    const m = PLANNED.find((x) => x.id === 'P4-007')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/observability build'))).toBe(
      true,
    );
  });

  it('P4-008 allowedPaths includes tests/api/**', () => {
    const m = PLANNED.find((x) => x.id === 'P4-008')!;
    expect(m.allowedPaths).toContain('tests/api/**');
  });

  it('P4-009 verification includes db:validate + dev-controller test:unit', () => {
    const m = PLANNED.find((x) => x.id === 'P4-009')!;
    expect(m.verificationCommands.some((c) => c.includes('pnpm db:validate'))).toBe(true);
    expect(
      m.verificationCommands.some((c) => c.includes('@fastfood/dev-controller test:unit')),
    ).toBe(true);
  });

  it('every planned manifest forbids every Phase 5+ app/business surface', () => {
    const phaseFivePlusApps = [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
    ];
    for (const m of PLANNED) {
      for (const guard of phaseFivePlusApps) {
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

  it('dependency graph is acyclic (P4-001..P4-010 with P3-001 cross-phase dependency)', () => {
    const ids = PLANNED.map((m) => m.id);
    const byId = new Map(PLANNED.map((m) => [m.id, m]));
    // External dependency: P4-001 depends on the completed P3-001 from Phase 3.
    const externalDeps = new Set<string>(['P3-001']);
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
