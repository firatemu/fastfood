# ADR-004 — Phase 3 Auth / Crypto Baseline (no new runtime dependency)

## Status

Accepted (2026-09-18, Phase 3 P3-004 manifest).

## Context

Phase 3 work item P3-004 ships the canonical auth + crypto
infrastructure per document 44 (Security Implementation Baseline):

- Customer OTP infrastructure (HMAC-SHA-256 verifier, 180s TTL,
  5 verify attempts, request rate limit, single-use).
- Staff credential infrastructure (Argon2id baseline
  `m=19456 KiB, t=2, p=1`, RS256 JWT 15-minute TTL with `iss` / `aud`
  validation, opaque 256-bit CSPRNG refresh tokens, SHA-256 hash
  storage, rotation on use, suspicious reuse revokes session family).

The Phase 3 preparation artifact §5 listed a candidate dependency
set (`@nestjs/passport`, `@nestjs/jwt`, `argon2`, `jose`, `cookie`,
`rate-limiter-flexible`) gated behind this ADR.

Per document 32 §10 ("Dependency introduction rule") and document 46
("Change Control and ADR Protocol"), every new cross-cutting runtime
dependency introduction requires an ADR.

## Decision

The Phase 3 auth / crypto baseline ships with **zero new runtime
dependencies**. The implementation uses Node.js 24's built-in
`node:crypto` module only.

Specifically:

- **Staff password hashing** uses `crypto.scrypt` with parameters
  `N=2^15, r=8, p=1, dkLen=64`. Per OWASP Password Storage Cheat Sheet
  (2026 ed.), scrypt with these parameters is an acceptable
  Argon2id-equivalent when the Argon2id native binding cannot be
  installed. The locked `m=19456 KiB, t=2, p=1` baseline remains the
  reference target; this ADR records the temporary substitution under
  Phase 3 with a future ADR path to migrate to the native binding if
  the team later chooses to add it.
- **Customer OTP HMAC verifier** uses `crypto.createHmac('sha256', …)`
  with a server-side pepper read from `OTP_HMAC_PEPPER` env var.
  The default value in development is a non-production placeholder
  string; production deployment requires the env var to be set.
- **Refresh tokens** use `crypto.randomBytes(32)` for opaque token
  generation. The server stores only `crypto.createHash('sha256')
.update(token).digest('hex')` (64-char hex).
- **JWT verification** is **not implemented in Phase 3**. The auth
  module ships a stub `AuthGuard` that accepts requests already
  carrying `authenticatedUserId` (set by the auth service during
  request-time integration tests / unit tests). Production JWT
  signing + verification is deferred to a future ADR when the team
  chooses to introduce `@nestjs/jwt` or `jose`. The auth module is
  structured so the stub can be replaced by a real JWT verifier
  without changing any consumer.

> **Superseded for staff requests by ADR-014 (2026-09-25):** staff access
> tokens are now signed and verified with Node.js `node:crypto` RS256 using
> the configured key paths, issuer, audience, and TTL. Current session,
> account status, permissions, and branch scopes are resolved from storage.
> This adds no runtime dependency and does not change the customer-token path.

- **Rate limiting** uses a simple in-process bucket counter with a
  `RATE_LIMIT_*` env var policy. A distributed Redis-backed
  rate-limiter (`rate-limiter-flexible`) is deferred until the
  Phase 6 checkout / payment work, when cross-process coordination
  is required.

## Alternatives considered

1. **`argon2` + `jose` + `@nestjs/passport` + `@nestjs/jwt` +
   `cookie` + `rate-limiter-flexible`** — recommended by the
   preparation artifact but increases the dependency surface and
   adds a binding step that fails on systems without native
   compilation. Rejected for Phase 3 to preserve the no-deployment /
   fast-iteration posture. Each remains a valid upgrade path under a
   future ADR.
2. **Use only `jose` + `@nestjs/jwt` (skip Argon2id)** — keeps the
   dependency list shorter but introduces a different runtime
   dependency with similar tradeoffs. Rejected because the same
   gains are achievable with Node's built-in `node:crypto`.
3. **Use the same as the Phase 2 design system / `jose` /
   `@nestjs/passport` / `argon2`** — would mirror what other
   production NestJS applications do. Rejected for the same reasons
   as option 1.

## Consequences

- **Positive**: zero new runtime dependencies for Phase 3;
  smaller attack surface; faster local builds; no native binding
  requirements; consistent with the project's `node:`-only
  server-side primitives.
- **Positive**: the stub `AuthGuard` makes the controller's
  integration-test surface deterministic; consumers do not need a
  full JWT verifier to exercise the canonical guard sequence.
- **Negative**: when a future ADR migrates to native Argon2id +
  jose, the customer / staff password hashing paths will need to
  rehash on next login (existing `crypto.scrypt` hashes are not
  interoperable with Argon2id). The migration is purely
  backward-compatible at the JWT / session / OTP layer because
  those are JWT/HMAC/CSPRNG primitives that do not change.
- **Negative**: until a future ADR adds a distributed rate limiter,
  cross-process rate-limit coordination is best-effort. This is
  acceptable for Phase 3 because no Phase 3 endpoint is under
  load; Phase 6 checkout + payment will revisit.

## Migration plan (future, if Argon2id / jose are adopted)

1. Add the new runtime dependencies under a Phase-N ADR that
   cites this ADR-004 as the predecessor.
2. Introduce a `PasswordHasher` interface; ship the existing
   `scryptHasher` as the v1 implementation, add the Argon2id
   implementation as v2.
3. Rehash on next login: when verifying a staff password, if the
   stored hash uses the v1 algorithm, rehash with v2 and persist.
4. The customer / staff OTP / refresh / JWT layers remain unchanged.

## Documents / code affected

- `apps/api/src/common/crypto/password-hasher.ts` (new)
- `apps/api/src/common/crypto/otp-verifier.ts` (new)
- `apps/api/src/common/crypto/refresh-token.ts` (new)
- `apps/api/src/common/crypto/index.ts` (new)
- `apps/api/src/modules/auth/auth.module.ts` (registers the helpers)
- `packages/config/src/schemas.ts` (adds `OTP_HMAC_PEPPER`,
  `REFRESH_TOKEN_TTL_DAYS`, `ACCESS_TOKEN_TTL_MINUTES`,
  `OTP_TTL_SECONDS`, `OTP_MAX_VERIFY_ATTEMPTS`,
  `OTP_REQUEST_COOLDOWN_SECONDS`,
  `PASSWORD_SCRYPT_MAXMEM_KIB`, `PASSWORD_SCRYPT_COST`,
  `PASSWORD_SCRYPT_BLOCK_SIZE`, `PASSWORD_SCRYPT_PARALLELIZATION`)
- `fastfood-project-docs/36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md`
  (records the new env-var defaults)
- `fastfood-project-docs/44-SECURITY_IMPLEMENTATION_BASELINE.md`
  (no contract change; the locked baseline remains the reference)

## Reviewers

- Document 46 ADR protocol (this file).
- Document 32 §10 dependency introduction rule (no new runtime
  dependency introduced).

## Date

2026-09-18.
