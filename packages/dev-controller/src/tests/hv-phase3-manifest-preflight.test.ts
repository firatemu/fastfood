/**
 * MANIFEST VALIDATION — pre-flight schema check for the planned
 * Phase 3 preparation artifact. Mirrors the planned manifest
 * bodies in
 * `project-reports/governance/CANONICAL_PHASE_3_AUTONOMOUS_PREPARATION.md`.
 *
 * Does NOT initialize Phase 3 controller runtime state. Only
 * validates syntactic validity against `ManifestSchema` plus
 * structural invariants (canonical phase, human acceptance,
 * allowedPaths / forbiddenPaths policy, max repair attempts, etc.).
 *
 * The planned manifests below are PLANNING FIXTURES only — they
 * have NOT been installed under `.fastfood-controller/manifests/`
 * and MUST NOT be until the human owner separately authorizes
 * Phase 3 execution.
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
    id: 'P3-001',
    phase: 'PHASE_3',
    title: 'Prisma schema + canonical migration set (identity entities)',
    objective:
      'Forward-only canonical Prisma migration set extends the schema with the canonical identity entities (User, StaffProfile, CustomerProfile, Session, Role, Permission, UserRole, UserBranchScope, Address, AuditLog, OutboxEvent, BusinessSetting) per document 31 §"Identity and authorization" + §"Platform".',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
      'fastfood-project-docs/35-DATABASE_PRISMA_CONVENTIONS.md',
      'fastfood-project-docs/16-DATA_MODEL_DATABASE.md',
    ],
    dependencies: [],
    allowedPaths: [
      'apps/api/prisma/schema.prisma',
      'apps/api/prisma/migrations/**',
      'apps/api/prisma/seed.ts',
      'apps/api/prisma.config.ts',
      'packages/domain-types/src/**',
      'packages/contracts/src/**',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
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
      'Phase 3 ships a forward-only canonical migration set under apps/api/prisma/migrations/. No `db push`; the migration must be reproducible via `prisma migrate dev` against the local Docker Postgres stack and CI-validated via `pnpm db:validate`.',
    evidenceRequirements: [
      'prisma:validate PASS evidence',
      'typecheck PASS evidence',
      'test:unit PASS evidence',
      'contracts build PASS evidence',
      'domain-types build PASS evidence',
    ],
  },
  {
    id: 'P3-002',
    phase: 'PHASE_3',
    title: 'Canonical /api/v1 envelope + OpenAPI export wiring',
    objective:
      'Wire the canonical success / list / error envelope (document 40) for every new module controller and regenerate the OpenAPI artifact under docs/openapi/. X-Request-Id + X-Correlation-Id propagation is verified end-to-end.',
    contractReferences: [
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
      'fastfood-project-docs/17-API_EVENTS_REALTIME.md',
      'fastfood-project-docs/45-OBSERVABILITY_LOGGING_CONTRACT.md',
    ],
    dependencies: ['P3-001'],
    allowedPaths: [
      'apps/api/src/common/http/**',
      'apps/api/src/common/pino/**',
      'apps/api/src/modules/health/**',
      'apps/api/src/main.ts',
      'apps/api/scripts/export-openapi.ts',
      'packages/contracts/src/**',
      'docs/openapi/**',
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
      'pnpm --filter @fastfood/api typecheck',
      'pnpm --filter @fastfood/api lint',
      'pnpm --filter @fastfood/api test:unit',
      'pnpm --filter @fastfood/contracts build',
      'pnpm --filter @fastfood/api openapi:export',
      'pnpm --filter @fastfood/api build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'LOW',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'contracts build PASS evidence',
      'openapi:export PASS evidence',
      'api build PASS evidence',
    ],
  },
  {
    id: 'P3-003',
    phase: 'PHASE_3',
    title: 'Canonical guard sequence',
    objective:
      'Implement the canonical guard sequence (AuthGuard → AccountStatusGuard → RbacGuard → ResourceScopeGuard) per document 39 §2. Permission metadata uses @RequirePermissions against @fastfood/domain-types dotted codes (no inline string literals). Resource-scope policies implement the canonical ResourcePolicy<TResource, TPrincipal> interface from apps/api/src/modules/auth/policies/resource-policy.ts.',
    contractReferences: [
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/02-ACTORS_ROLES_RBAC.md',
      'fastfood-project-docs/07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md',
    ],
    dependencies: ['P3-001', 'P3-002'],
    allowedPaths: [
      'apps/api/src/modules/auth/**',
      'packages/domain-types/src/**',
      'apps/api/src/common/database/**',
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
      'pnpm --filter @fastfood/api build',
      'pnpm --filter @fastfood/domain-types build',
      'pnpm --filter @fastfood/contracts build',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence (guard-sequence unit tests)',
      'api build PASS evidence',
      'domain-types build PASS evidence',
      'contracts build PASS evidence',
    ],
  },
  {
    id: 'P3-004',
    phase: 'PHASE_3',
    title: 'Crypto / session infrastructure (Argon2id, RS256 JWT, refresh rotation)',
    objective:
      'Customer OTP infrastructure (HMAC-SHA-256 verifier, 180s TTL, 5 verify attempts, request rate limit, single-use) + staff credential infrastructure (Argon2id baseline m=19456/t=2/p=1, RS256 JWT 15-min TTL with iss/aud validation, opaque 256-bit CSPRNG refresh tokens, SHA-256 hash storage, rotation on use, suspicious reuse revokes session family). Bounded dependency introductions (argon2, jose, @nestjs/passport, @nestjs/jwt, cookie, rate-limiter-flexible) each require an ADR per document 46.',
    contractReferences: [
      'fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md',
      'fastfood-project-docs/36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md',
      'fastfood-project-docs/32-IMPLEMENTATION_LOCK_IN.md',
      'fastfood-project-docs/46-CHANGE_CONTROL_ADR_PROTOCOL.md',
    ],
    dependencies: ['P3-001', 'P3-002', 'P3-003'],
    allowedPaths: [
      'apps/api/src/modules/auth/**',
      'apps/api/src/common/crypto/**',
      'apps/api/src/common/http/**',
      'apps/api/test/**',
      'docs/adrs/ADR-NNN-auth-crypto-baseline.md',
      'pnpm-lock.yaml',
      'apps/api/package.json',
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
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'HIGH',
    notes:
      'New runtime dependency introductions (argon2, jose, @nestjs/passport, @nestjs/jwt, cookie, rate-limiter-flexible) are ADR-gated per document 46. The ADR is committed under docs/adrs/ before any dependency is added to apps/api/package.json or pnpm-lock.yaml.',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence (crypto primitive unit tests)',
      'api build PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P3-005',
    phase: 'PHASE_3',
    title: 'Customer auth endpoints',
    objective:
      'Land customer auth endpoints under /api/v1/auth/customer/* (otp/request, otp/verify) + session endpoints (/api/v1/auth/refresh, /api/v1/auth/logout, /api/v1/auth/sessions, DELETE /api/v1/auth/sessions/:sessionId). All served under the canonical envelope. HTTP boundary integration tests cover happy path + OTP cooldown + OTP attempt limit + refresh-rotation + session-revocation.',
    contractReferences: [
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
      'fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md',
    ],
    dependencies: ['P3-001', 'P3-002', 'P3-003', 'P3-004'],
    allowedPaths: [
      'apps/api/src/modules/auth/**',
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
    id: 'P3-006',
    phase: 'PHASE_3',
    title: 'Staff auth endpoints',
    objective:
      'Land staff auth endpoints (/api/v1/auth/staff/login, /api/v1/auth/staff/mfa/verify) + session endpoints reused from the customer module. Argon2id verification path is unit-tested for hash/verify round-trip + timing-safe compare. Phase 3 ships the MFA endpoint contract with a development MFA-disable path; real TOTP enrolment + production-only enforcement is deferred to Phase 10 per the roadmap.',
    contractReferences: [
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
      'fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md',
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
    ],
    dependencies: ['P3-001', 'P3-002', 'P3-003', 'P3-004'],
    allowedPaths: [
      'apps/api/src/modules/auth/**',
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
    notes:
      'MFA endpoint contract ships with a development MFA-disable flag (NODE_ENV=development + ALLOW_DEV_MFA_BYPASS=true); the bypass is hard-disabled in non-development builds via the env validator.',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence (staff login + MFA contract)',
      'api build PASS evidence',
      'openapi:export PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P3-007',
    phase: 'PHASE_3',
    title: 'Customer /me shell + addresses + ownership policy',
    objective:
      'Land customer /me shell endpoints (GET /api/v1/me, PATCH /api/v1/me) + address endpoints (GET / POST / PATCH / DELETE /api/v1/me/addresses/:addressId) under the canonical envelope. Address write requires map-confirmed coordinates (lat / lng) per document 07 §7-§8. CustomerOwnershipPolicy enforces ownership on every customer-owned resource; IDOR is explicitly tested.',
    contractReferences: [
      'fastfood-project-docs/29-API_ENDPOINT_CATALOG.md',
      'fastfood-project-docs/07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md',
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/40-API_RESPONSE_ERROR_CONTRACT.md',
    ],
    dependencies: ['P3-001', 'P3-002', 'P3-003', 'P3-005'],
    allowedPaths: [
      'apps/api/src/modules/customer/**',
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
      'pnpm --filter @fastfood/api openapi:export',
      'pnpm --filter @fastfood/api prisma:validate',
    ],
    maxRepairAttempts: 3,
    requiresHumanAcceptance: true,
    status: 'ACTIVE',
    riskLevel: 'MEDIUM',
    notes:
      'Serviceability decision (whether a given address can be delivered to by a branch) is deferred to Phase 4 per the roadmap. Phase 3 only persists coordinates + ownership.',
    evidenceRequirements: [
      'api typecheck PASS evidence',
      'api lint PASS evidence',
      'api test:unit PASS evidence',
      'api test:integration PASS evidence (ownership enforcement + IDOR negative)',
      'api build PASS evidence',
      'openapi:export PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P3-008',
    phase: 'PHASE_3',
    title: 'AuditLog + transactional OutboxEvent primitives',
    objective:
      'AuditLog write path (append-only, immutable from feature code) + OutboxEvent enqueue path (transactional outbox pattern over Prisma $transaction) are implemented as shared services in apps/api/src/common/audit/** and apps/api/src/common/outbox/**. No external side-effect may be issued before the database transaction is committed per document 17 §4.',
    contractReferences: [
      'fastfood-project-docs/18-SECURITY_PRIVACY_AUDIT.md',
      'fastfood-project-docs/17-API_EVENTS_REALTIME.md',
      'fastfood-project-docs/45-OBSERVABILITY_LOGGING_CONTRACT.md',
      'fastfood-project-docs/31-DATABASE_ENTITY_CATALOG.md',
    ],
    dependencies: ['P3-001', 'P3-002'],
    allowedPaths: [
      'apps/api/src/common/audit/**',
      'apps/api/src/common/outbox/**',
      'apps/api/test/**',
      'packages/observability/src/**',
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
      'api test:unit PASS evidence (outbox + audit unit tests)',
      'observability build PASS evidence',
      'api build PASS evidence',
      'contracts build PASS evidence',
    ],
  },
  {
    id: 'P3-009',
    phase: 'PHASE_3',
    title: 'Negative-test matrix (unauthenticated / wrong-permission / wrong-scope / correct)',
    objective:
      'Every protected endpoint shipped by P3-003..P3-007 has explicit negative tests for: unauthenticated, authenticated without permission, authenticated with permission but wrong scope, authenticated with correct permission and scope. The matrix lives in tests/api/** (new directory) and re-uses the @fastfood/api integration harness. Per document 39 §10 and document 41 §3.',
    contractReferences: [
      'fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
      'fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md',
    ],
    dependencies: ['P3-003', 'P3-005', 'P3-006', 'P3-007'],
    allowedPaths: [
      'apps/api/src/modules/auth/**',
      'apps/api/src/modules/customer/**',
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
      'api test:unit PASS evidence (negative cases)',
      'api test:integration PASS evidence (negative matrix at HTTP boundary)',
      'api build PASS evidence',
      'prisma:validate PASS evidence',
    ],
  },
  {
    id: 'P3-010',
    phase: 'PHASE_3',
    title: 'Phase 3 verification pipeline + DoD',
    objective:
      'Wire the backend core and identity build into the root verification pipeline and verify Phase 3 Definition of Done. The audit covers: (a) root format/lint/typecheck/unit green; (b) per-package builds green; (c) Prisma schema valid; (d) OpenAPI artifact regenerated and committed; (e) every new ADR recorded under docs/adrs/; (f) controller invariants preserved (controllerArmed === false); (g) doc-vs-code consistency check for new entity additions + endpoint additions + configuration additions.',
    contractReferences: [
      'fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md',
      'fastfood-project-docs/41-TESTING_TOOLCHAIN_CONTRACT.md',
      'fastfood-project-docs/22-DEVOPS_ENVIRONMENTS_CICD_OBSERVABILITY.md',
    ],
    dependencies: ['P3-009'],
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

describe('Phase 3 MANIFEST VALIDATION — preparation pre-flight', () => {
  for (const m of PLANNED) {
    it(`planned manifest ${m.id} is valid against ManifestSchema`, () => {
      const parsed = ManifestSchema.safeParse(m);
      expect(parsed.success).toBe(true);
    });
  }

  it('every planned manifest phase is PHASE_3 (canonical)', () => {
    for (const m of PLANNED) {
      expect(m.phase).toBe('PHASE_3');
    }
  });

  it('every planned manifest id matches the canonical P3-NNN pattern', () => {
    for (const m of PLANNED) {
      expect(m.id).toMatch(/^P3-0\d\d$/);
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

  it('P3-001 prisma:validate target matches work item', () => {
    const m = PLANNED.find((x) => x.id === 'P3-001')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/api prisma:validate'))).toBe(
      true,
    );
  });

  it('P3-002 openapi:export target matches work item', () => {
    const m = PLANNED.find((x) => x.id === 'P3-002')!;
    expect(m.verificationCommands.some((c) => c.includes('openapi:export'))).toBe(true);
  });

  it('P3-004 ADR-gated dependency surface allowedPaths includes docs/adrs and lockfile', () => {
    const m = PLANNED.find((x) => x.id === 'P3-004')!;
    expect(m.allowedPaths).toContain('docs/adrs/ADR-NNN-auth-crypto-baseline.md');
    expect(m.allowedPaths).toContain('pnpm-lock.yaml');
    expect(m.allowedPaths).toContain('apps/api/package.json');
  });

  it('P3-005 / P3-006 / P3-007 include test:integration for HTTP-boundary coverage', () => {
    for (const id of ['P3-005', 'P3-006', 'P3-007']) {
      const m = PLANNED.find((x) => x.id === id)!;
      expect(m.verificationCommands.some((c) => c.includes('test:integration'))).toBe(true);
    }
  });

  it('P3-008 includes observability build (audit log uses structured-logger helpers)', () => {
    const m = PLANNED.find((x) => x.id === 'P3-008')!;
    expect(m.verificationCommands.some((c) => c.includes('@fastfood/observability build'))).toBe(
      true,
    );
  });

  it('P3-009 negative-test matrix allowedPaths includes tests/api/**', () => {
    const m = PLANNED.find((x) => x.id === 'P3-009')!;
    expect(m.allowedPaths).toContain('tests/api/**');
  });

  it('P3-010 verification includes db:validate + dev-controller test:unit', () => {
    const m = PLANNED.find((x) => x.id === 'P3-010')!;
    expect(m.verificationCommands.some((c) => c.includes('pnpm db:validate'))).toBe(true);
    expect(
      m.verificationCommands.some((c) => c.includes('@fastfood/dev-controller test:unit')),
    ).toBe(true);
  });

  it('every planned manifest forbids every Phase 4+ app/business surface', () => {
    const phaseFourPlusApps = [
      'apps/storefront-web/**',
      'apps/admin-web/**',
      'apps/customer-mobile/**',
      'apps/courier-mobile/**',
      'apps/worker/**',
    ];
    for (const m of PLANNED) {
      for (const guard of phaseFourPlusApps) {
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

  it('dependency graph is acyclic (P3-001..P3-010)', () => {
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
