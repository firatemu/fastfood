# Security Implementation Baseline

## 1. Password hashing

Staff passwords use Argon2id with the baseline parameters `m=19456 KiB`, `t=2`, `p=1` (19 MiB memory, two iterations, one degree of parallelism). Store the encoded Argon2id hash only. Never log plaintext passwords.

These parameters are the minimum project baseline. Production benchmarking may increase cost through a security ADR/config migration, but an agent must not lower the baseline simply for test speed.

## 2. OTP

- 6-digit numeric customer OTP generated with a cryptographically secure RNG in production,
- store only an HMAC-SHA-256 verification value keyed by a server secret/pepper (plus challenge metadata), never plaintext OTP,
- 180-second TTL baseline,
- five verification attempts,
- resend/request rate limits,
- challenge invalidated after successful verification,
- fake provider hard-disabled in production.

## 3. Token/session strategy

- access token: RS256 JWT, 15-minute TTL, `iss` and `aud` validation required, minimal identity/session claims only,
- rotating refresh session TTL: 30 days,
- refresh credential: 256-bit CSPRNG opaque token,
- only SHA-256 refresh-token hash is stored server-side,
- rotation invalidates prior refresh credential,
- suspicious token reuse revokes the session family and creates a security/audit event,
- tokens never contain permissions as the sole source of authorization truth; permissions/scopes are enforced server-side against current account state.

## 4. Web credential transport

The web access token is held in memory and sent as an `Authorization: Bearer` header for business API requests. It is not persisted in localStorage/sessionStorage.

The refresh credential is carried in a cookie with:

- `HttpOnly`
- `Secure` in HTTPS environments
- `SameSite=Lax` baseline
- path restricted to the refresh/session endpoint family where practical
- no unnecessary parent-domain scope

Refresh/session endpoints enforce the explicit production web origin allowlist. If a future endpoint performs business mutations using cookie authentication, it must additionally implement the project CSRF protection pattern before release.

## 5. Privileged staff MFA

Privileged staff roles use RFC 6238 TOTP through an authenticator application in production. TOTP secrets are encrypted at rest; recovery codes are random, single-use, and stored hashed. SMS OTP is not the privileged-staff MFA factor. MFA enrollment/reset is audited and requires reauthentication/authorized recovery procedure.

## 6. Mobile credential storage

Use Expo SecureStore/platform secure storage for refresh/session material. Access tokens may reside only in memory where practical and are refreshed from secure session material.

## 7. Rate limits

Apply rate limiting at least to:

- OTP request/verify,
- staff login,
- refresh abuse patterns,
- payment initialization,
- guest order-access endpoints,
- QR claim,
- upload endpoints.

Rate limits consider account/phone, IP, device/session, and endpoint risk as appropriate.

## 8. Headers

Web/API deployments use secure HTTP headers. CSP must explicitly account for iyzico/Google Maps assets and be tested rather than disabled globally.

## 9. File upload

For product images:

- MIME/type validation,
- size limit,
- image decode/processing validation where implemented,
- generated safe storage key,
- no user-controlled executable path,
- no serving uploaded SVG/script as trusted application code unless separately sanitized/approved.

## 10. SQL

Prisma parameterization is preferred. Raw SQL, especially PostGIS queries, must use parameterized APIs. String interpolation of user input into SQL is forbidden.

## 11. SSRF/provider requests

Server-side external calls target configured known providers. Do not fetch arbitrary user-provided URLs from privileged server network paths.

## 12. Logs

Never log:

- passwords,
- OTP values,
- refresh/access tokens,
- authorization headers,
- payment card details,
- full provider secret payloads,
- unnecessary full addresses/phone numbers.

Use redaction for structured log fields.

## 13. IDOR testing

Resource endpoints must have tests proving a user cannot access another customer's order, another courier's delivery, or another branch's restricted records merely by changing an ID.

## 14. Audit

Audit these categories at minimum:

- privilege/role/scope changes,
- branch reassignment,
- refund initiation/result,
- manual loyalty adjustment,
- critical production business setting change,
- branch sold-out override changes,
- high-risk account state changes.

## 15. Production readiness

Before production:

- remove/disable dev bypasses,
- validate secret rotation procedures,
- validate backups,
- run dependency/security scan,
- run authorization regression suite,
- verify CORS/CSP/cookie configuration against real domains.
