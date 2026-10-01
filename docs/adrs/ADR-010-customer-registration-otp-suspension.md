# ADR-010: Phone OTP is suspended for customer registration

Status: Accepted
Date: 2026-09-23
Decision owners: Human owner (explicit instruction in chat on 2026-09-23)

## Context

`fastfood-project-docs/07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md` §2 declares
"Canonical production customer authentication is phone-based OTP/passwordless
authentication." The companion detail in
`packages/contracts/src/customer-capability-registry.ts` records the
`phone-otp` capability as `IMPLEMENTED + AUTOMATICALLY_SUPPORTED`, paired
with a customer-facing note: "OTP-verifies the phone during registration;
sign-in is now phone + password."

A human owner request on 2026-09-23 explicitly asked that the OTP step be
bypassed for the duration of UI maturation so that a new customer can
register with phone + password + KVKK only, with no SMS proof-of-ownership
check. Scope is the customer registration flow. Login (phone + password),
staff authentication (TOTP), and existing OTP infrastructure remain
unchanged.

The locked rule (07 §2) is preserved in the canonical document with an
"askıda" (suspended) marker; the underlying OTP endpoints and code paths
remain mounted so suspension is reversible by configuration alone.

## Decision

1. Customer registration on `apps/storefront-web` and
   `apps/customer-mobile` accepts
   `phoneNormalized + password + displayName + kvkkAccepted +
   newsletterOptIn?` and creates the user directly without SMS
   verification.
2. A new endpoint `POST /auth/customer/register-phone` is introduced in
   `apps/api`. It is gated by a runtime flag
   `CUSTOMER_REGISTRATION_OTP_SUSPENDED` (default `false`). When `true`,
   the endpoint is the only path that creates a customer with a phone
   identity; when `false`, it returns `OTP_SUSPENDED` and clients fall
   back to the OTP flow.
3. The phone remains a required, normalized identity field. The user
   record created by the new path is flagged `phoneVerified: false`.
   Re-enabling OTP automatically flips the flag.
4. While the flag is on, the existing `/auth/customer/otp/request` and
   `/auth/customer/otp/verify` endpoints return
   `503 { code: OTP_SUSPENDED }` so the UI does not silently keep
   calling them.
5. `auth/customer/methods.otp` returns `false` while the flag is on.
6. The `phone-otp` capability in
   `packages/contracts/src/customer-capability-registry.ts` moves from
   `IMPLEMENTED` to `DEFERRED_WITH_APPROVED_REASON` for both web and
   mobile, paired with `CHANGE_REQUIRED` impact. The capability remains
   in the registry so re-enablement is auditable. The mirror row in
   `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md` updates in the
   same commit.
7. Re-enabling OTP is a config flip. No code change is required.

## Alternatives considered

1. Delete OTP code paths entirely — rejected: the human owner asked for
   "suspension," not removal; deletion would also drop related unit +
   integration coverage and the SMS provider configuration.
2. Add a `smsVerified: false` shadow flag with no UI behavior change —
   rejected: that does nothing; the user wants the OTP step gone from
   the register flow.
3. Branch per environment via `NODE_ENV` — rejected: too coarse; the
   flag is a single boolean readable from runtime configuration.

## Consequences

- A new customer can register without SMS verification.
- Phone-spoofed accounts become possible at the registration boundary
  until the customer later proves ownership or the flag is reverted.
- The `otp` tier of `auth/customer/methods` returns `false` while the
  flag is on; the UI must hide the OTP step.
- Customer capability matrix drift check passes after both rows are
  updated.
- `07-AUTH §2` retains its canonical sentence and gains a "Status"
  marker noting the suspension.
- No effect on customer login (still password) or staff auth (TOTP).

## Migration plan

- Phase 1 (this commit): ADR + 07 §2 note + capability registry rows.
- Phase 2: `packages/config` flag + service-level gate +
  `/register-phone` endpoint + tests (unit + integration).
- Phase 3: Web `apps/storefront-web/auth-page.tsx` consumes the new
  endpoint and removes the OTP step; sync per rule 45 in
  `apps/customer-mobile`.
- Phase 4: Verification gates — `pnpm format:check && pnpm lint &&
  pnpm typecheck && pnpm test:unit --force && pnpm
  check:customer-platform` all green.

## Documents/code affected

- `fastfood-project-docs/07-AUTH_ACCOUNT_ADDRESS_GEOLOCATION.md` §2
- `packages/contracts/src/customer-capability-registry.ts`
  (`phone-otp` row)
- `docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md` (mirror row)
- `packages/config/src/schemas.ts` (env
  `CUSTOMER_REGISTRATION_OTP_SUSPENDED`)
- `apps/api/src/modules/auth/customer/customer-auth.controller.ts`
  (new `/register-phone`, OTP endpoints gated)
- `apps/api/src/modules/auth/customer/customer-auth.service.ts`
  (new `registerByPhoneAndPassword`, gate `requestOtp`/`verifyOtp`,
  change `methods()`)
- `apps/storefront-web/src/components/storefront/auth-page.tsx`
  (consume new endpoint)
- `apps/storefront-web/src/lib/storefront/auth.ts` (new helper)
- `apps/customer-mobile/app/(auth)` register surface (sync per rule 45)
- `apps/customer-mobile/lib/` (new helper)
- `PROJECT_STATUS.md` (factual work item record)
