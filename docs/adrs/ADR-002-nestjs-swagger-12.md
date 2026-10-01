# ADR-002: `@nestjs/swagger` 12.x baseline + `@fastify/static` transitive dependency

- **Status:** Accepted
- **Date:** 2026-09-16
- **Decision owners:** Foundation engineering
- **Supersedes:** none
- **Superseded by:** none

## Context

Document 32 (`32-IMPLEMENTATION_LOCK_IN.md`) requires:

- NestJS 12 modular monolith
- REST + OpenAPI
- Zod is canonical for validation; one project-owned Zod validation pipe
- Dependency introduction rule (document 32 §10): a new runtime dependency is allowed only when an existing locked tool does not solve the need, the dependency is maintained and license-compatible, it does not duplicate an existing core responsibility, the reason is documented, and architecture-impacting additions receive an ADR.

Document 46 (`46-CHANGE_CONTROL_ADR_PROTOCOL.md`) requires an Architecture Decision Record for "introduction of a new cross-cutting runtime dependency" and "major framework upgrade with behavioral impact".

Document 33 (`33-TOOLCHAIN_VERSION_MATRIX.md`) previously had no explicit baseline for `@nestjs/swagger`. The implementation depends on `@nestjs/swagger` (for the OpenAPI document + Swagger UI under `/api/docs`) and on `@fastify/static` (transitive peer required for Swagger UI's static assets under `@nestjs/swagger@12`).

The originally attempted pin `@nestjs/swagger@11` failed to build under Node 24 LTS because `@nestjs/swagger@11` imports `@nestjs/common/interfaces` and `@nestjs/common/interfaces/http/http-server.interface` as deep imports, which do not have ESM-compatible `exports` entries in `@nestjs/common@12`. Under Node 24 + ESM, these deep imports throw `ERR_MODULE_NOT_FOUND`.

The Phase 0 implementation works because `@nestjs/swagger@12.0.1` (the latest `12.x` aligned with NestJS 12) ships ESM-compatible exports and depends on `@fastify/static@^8.0.0` for the Swagger UI static assets.

## Decision

- Canonical baseline: `@nestjs/swagger` **12.x** aligned with `NestJS 12.x` (currently `12.0.1`).
- Accept the transitive `@fastify/static` peer (currently `8.2.0`) as a project dependency.

## Alternatives considered

1. **Downgrade to `@nestjs/swagger@11.x` to match the originally attempted pin**
   - Rejected. `@nestjs/swagger@11` does not load under Node 24 + ESM because of the `@nestjs/common/interfaces` deep-import incompatibility. Downgrading would force us off Node 24 or onto a manual patch of upstream code — both break the locked stack.
2. **Replace `@nestjs/swagger` with a different OpenAPI generator (e.g. hand-rolled Zod-to-OpenAPI)**
   - Rejected for Phase 0. The decision would be premature and document 32 explicitly names `@nestjs/swagger` is acceptable. Re-introducing a second OpenAPI source would violate the "no duplicate core responsibility" rule (document 32 §10).
3. **Stay on the version-12 line as-is (current implementation)**
   - Accepted. Aligns with NestJS 12, ESM-compatible under Node 24, and uses the canonical upstream-supported major.

## Consequences

- `@nestjs/swagger` and `@fastify/static` are added to `apps/api/package.json` with exact patches (`12.0.1`, `8.2.0`).
- Document 33 is updated with an explicit row for `@nestjs/swagger` and a note that `@fastify/static` is the transitive peer required by Swagger UI under the 12.x line.
- No other workspace package gains a direct dependency on these — `@nestjs/swagger` and `@fastify/static` are scoped to the API because OpenAPI generation belongs to the backend per document 03.
- The implementation already passes: `pnpm build` succeeds, the API boots, `/api/docs` and `/api/docs-json` are reachable.

## Migration plan

None required — the implementation already uses these versions. This ADR makes
the locked baseline explicit and records the resolved compatibility decision.

## Documents / code affected

- `apps/api/package.json` — `@nestjs/swagger@12.0.1`, `@fastify/static@8.2.0`.
- `fastfood-project-docs/33-TOOLCHAIN_VERSION_MATRIX.md` — explicit row added.
