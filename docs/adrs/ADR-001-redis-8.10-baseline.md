# ADR-001: Canonical Redis 8 baseline

- **Status:** Accepted
- **Date:** 2026-09-16
- **Decision owners:** Foundation engineering
- **Supersedes:** none
- **Superseded by:** none

## Context

Document 33 (`33-TOOLCHAIN_VERSION_MATRIX.md`) section 4 specifies:

> Redis Open Source | 8.10.x | current security-patched stable 8.x line compatible with deployment image

Document 46 (`46-CHANGE_CONTROL_ADR_PROTOCOL.md`) requires an Architecture Decision Record for any breaking toolchain change.

During Phase 0 implementation the Docker Compose file initially used `redis:8.0-bookworm`. That tag predates the 8.10 line and is therefore not aligned with document 33.

## Decision

Pin local infrastructure Redis to **`redis:8.10.1-trixie`**.

- `8.10.1` is the latest production-grade patch available on Docker Hub for the Redis 8.10 line as of 2026-09-16.
- The `trixie` suffix selects the Debian 13 slim base image, which is the current Redis upstream default and the variant the Redis upstream maintainers publish together with the binary tag.
- The same Docker tag is safe for use as the deployment image baseline (document 22 §3, document 49 §3) because Redis upstream signs and publishes both tags identically.

The Docker Compose file is updated to:

```yaml
redis:
  image: redis:8.10.1-trixie
```

## Alternatives considered

1. **`redis:8.10` (floating minor tag)**
   - Rejected. Pin policy in document 33 mandates an exact patch; floating tags silently change.
2. **`redis:8.0-bookworm` (existing choice)**
   - Rejected. Predates the 8.10 line; not aligned with document 33 baseline.
3. **Vendor a redis-server tarball**
   - Rejected for Phase 0. The deployment-image reference (document 22) keeps Redis in Docker. A vendored binary would require an ADR + image-policy change beyond this scope.

## Consequences

- `docker compose -f infrastructure/docker/docker-compose.yml pull redis` after pulling this change moves local infra to Redis 8.10.1.
- Phase 3+ code that depends on Redis 8-specific commands (e.g. RESP3, function definitions) is now unblocked.
- Existing local volumes persist; Redis will perform an in-place major-version-style upgrade. Local dev data is synthetic (document 49 §8) so this is acceptable.
- The integration test (`apps/api/test/integration/health.integration.test.ts`) connects to Redis with `ioredis` and is version-agnostic; no test change is required.

## Migration plan

1. `pnpm install` (no change — Redis is not a node dependency).
2. `pnpm infra:down && docker volume rm fastfood-local_redis-data && pnpm infra:up` to recreate the Redis container on the new image. (Volumes are dev-only and disposable per document 49 §8.)
3. `redis-cli INFO server` must report `redis_version:8.10.1`.

## Documents / code affected

- `infrastructure/docker/docker-compose.yml` — Redis image tag.
- `fastfood-project-docs/33-TOOLCHAIN_VERSION_MATRIX.md` — add explicit `Redis Open Source | 8.10.x | exact patch (8.10.1-trixie) | tag pinned in docker-compose.yml`. The existing "current security-patched stable 8.x line" guidance is retained as the upgrade policy, but the implementation is no longer ambiguous.
