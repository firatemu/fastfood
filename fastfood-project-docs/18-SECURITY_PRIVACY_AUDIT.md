# Security, Privacy, and Audit

## 1. Security posture

Security is a design constraint, not a final phase. Every feature must address authentication, authorization, validation, data exposure, abuse, audit, and failure behavior.

## 2. Authentication controls

- OTP request rate limits,
- OTP attempt limits,
- session rotation/revocation,
- strong staff credential hashing with Argon2id,
- MFA for privileged production staff,
- no production fake-OTP mode,
- no secrets in source control.

## 3. Authorization controls

- permission checks,
- resource/branch scope checks,
- ownership checks,
- backend enforcement on every sensitive endpoint,
- least privilege role defaults.

## 4. Input/output security

- validate DTOs,
- sanitize/encode output by context,
- restrict file types and sizes,
- avoid storing provider secrets/pan/card data,
- avoid logging secrets, OTPs, tokens, full payment payloads, or unnecessary personal data.

## 5. Web security

Use production-appropriate:

- HTTPS,
- secure cookies,
- HttpOnly refresh/session cookies,
- SameSite policy,
- CSRF protection for cookie-authenticated mutation flows,
- CORS allowlist,
- security headers,
- Content Security Policy compatible with required providers,
- clickjacking protection,
- rate limiting.

## 6. Mobile security

- refresh/session secrets in SecureStore,
- no secrets in AsyncStorage,
- TLS only,
- do not embed server secrets in app bundles,
- permission prompts must be purpose-specific,
- location access limited to delivery need.

## 7. Payment security

FASTFOOD must not store card PAN/CVV. Provider-hosted/approved payment flows handle card data. Logs and audit metadata must use provider references, not card details.

## 8. Audit log

Critical operations record:

- actor,
- action,
- resource type/id,
- prior/new values where safe,
- reason where required,
- timestamp,
- request/correlation ID,
- branch scope context,
- IP/device metadata only where policy permits.

Audit logs must be tamper-resistant at application level; ordinary users cannot edit audit records.

## 9. Sensitive data

Personal data includes customer phone, address, coordinates, and courier location. Access is purpose-limited.

## 10. Privacy / KVKK readiness

The system should support data minimization, defined retention, customer data export/deletion workflows where legally appropriate, and controlled access. Legal retention obligations for transaction/fiscal records must be confirmed before production policy is finalized.

Implemented customer self-service deletion: ADR-023 (personal data removed immediately; orders kept as de-identified records; refused while an order is open).

## 11. Dependency security

CI should include dependency vulnerability checks and lockfile integrity. Major dependency upgrades follow document 46.

Implementation-level controls are expanded in `44-SECURITY_IMPLEMENTATION_BASELINE.md`.
