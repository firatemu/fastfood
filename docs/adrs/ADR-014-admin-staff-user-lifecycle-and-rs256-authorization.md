# ADR-014: Staff lifecycle management and request-time authorization

Status: Accepted  
Date: 2026-09-25  
Decision owners: Human owner (explicit instruction in chat on 2026-09-25)

> Staff invitation/setup and password-lifecycle decisions in item 4 are
> superseded by ADR-016. Request-time authorization, branch scope, audit, and
> the remaining user-lifecycle decisions continue to apply.

## Context

The `/users` page previously listed staff and assigned roles only. The
owner authorized expanding it to a complete staff lifecycle and explicitly
approved replacing the permissive staff bearer guard as a prerequisite.
The previous guard accepted a predictable `staff-<uuid>-<timestamp>`
bearer in normal runtime and assigned every permission. This contradicted
the locked RS256, active-session, permission, and branch-scope contracts.

The existing schema already provides `User`, `StaffProfile`, `Session`,
`UserRole`, `RolePermission`, `UserBranchScope`, `AuthIdentity`,
`EmailVerificationChallenge`, and append-only `AuditLog` records. There is
no mail delivery worker. No schema migration or runtime dependency is needed.

## Decision

1. Staff access tokens use RS256 with the configured issuer, audience, and
   access-token TTL. Each guarded request verifies the signature and claims,
   then reloads the session and current staff account from Prisma. Revoked or
   expired sessions, disabled accounts, non-staff actors, and invalid tokens
   are rejected. Effective permissions and assigned branch IDs are resolved
   from current role/scope rows on every request.
2. A staff user may only be listed or managed by an actor whose assigned
   branches intersect that user’s scopes. Explicit branch IDs in a route,
   query, or body must be inside the actor’s scope. Branch list responses are
   filtered to assigned branches. Staff reports for branches, sales, products,
   and couriers are calculated only over assigned branch IDs. Empty staff scope
   grants no branch access.
3. Role assignment requires `users.write` and role-grant authority. A
   `SUPER_ADMIN` may grant all roles; an `HQ_ADMIN` may grant any role other
   than `SUPER_ADMIN`; other staff may only grant roles they already hold.
   Self role removal and self branch-scope edits are rejected. The last active
   `HQ_ADMIN` cannot be disabled or unassigned, and actors cannot disable
   themselves.
4. Invites create `PENDING_VERIFICATION` staff with assigned roles and branch
   scopes. A cryptographically random token is stored only as a hash, expires
   after 24 hours, and is consumed once when the invitee sets a password. The
   authorized administrator receives the raw setup link once in the UI to
   share through a secure channel. The link is never written to logs or audit
   data. A mail worker can be added later under its own delivery design.
5. Display-name edits are immediate and audited. Email changes create a
   separate one-time verification challenge; the existing email remains the
   login identifier until confirmation. Disable is reversible, revokes every
   active session, and records an audit event. Role and branch-scope changes
   are audited as well.
6. The user list remains bounded at 50 rows per API response. TanStack Table
   supplies sorting and client pagination for that response. Server-side
   search/pagination is deferred until a list-query contract is approved.

## Consequences

- Permission or scope changes take effect on the next request because guards
  no longer trust a token permission snapshot.
- Invitation setup links require manual secure sharing until an authorized
  email-delivery worker exists. The UI states the expiry and single-use rule.
- Staff with no assigned branch scopes see no staff users and cannot access
  branch resources. Existing staff assignments must be reviewed if local
  operators expect branch access.
- ADR-004 remains authoritative for scrypt and zero runtime dependencies;
  its statement that staff JWT verification is deferred is superseded by this
  ADR. No production or staging operation is authorized.

## Documents / code affected

- `apps/api/src/modules/auth/staff/staff-access-token.ts`
- `apps/api/src/modules/auth/staff/staff-auth.service.ts`
- `apps/api/src/modules/auth/staff/staff-auth.controller.ts`
- `apps/api/src/modules/auth/guards/auth.guard.ts`
- `apps/api/src/modules/auth/guards/resource-scope.guard.ts`
- `apps/api/src/modules/branch/policies/branch-scope.policy.ts`
- `apps/api/src/modules/reporting/reporting.controller.ts`
- `apps/api/src/modules/reporting/reporting.service.ts`
- `apps/api/src/modules/admin/admin-user.controller.ts`
- `apps/api/src/modules/admin/admin-user.service.ts`
- `apps/admin-web/src/app/users/`
- `apps/admin-web/src/app/invite/`
