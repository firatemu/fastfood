# ADR-016: Administrator-created staff accounts and managed passwords

Status: Accepted  
Date: 2026-09-26  
Decision owners: Human owner (explicit account/password instructions and confirmation in chat on 2026-09-26)

## Context

ADR-014 introduced staff invitations. The administrator created a
`PENDING_VERIFICATION` account and shared a one-time setup link so the staff
member could choose a password. The owner now requires direct account creation,
administrator-selected passwords, and no staff self-service password change.
The owner also confirmed that administrators may reset another staff member's
password later.

## Decision

1. `POST /admin/users` creates an immediately active staff account with an
   administrator-provided initial password. The password is 12–256 characters
   and is hashed with the project's existing staff password hasher before
   persistence. The raw password and hash are never returned, logged, or
   written to the audit record.
2. A Super Admin may create a user for any active branch, assign a global
   Super Admin without a branch, or appoint a Branch Admin to an unassigned
   branch. Non-Super-Admin staff may create only ordinary staff in their own
   single branch. Branch Admins may assign only permissions they hold. The
   API remains authoritative for role, branch, and permission checks.
3. Staff cannot change their own password. A scoped administrator may set a
   new password for another staff account. Self-reset through the admin route
   is rejected. Password reset revokes every active target session and writes
   an audit record that contains no password or password hash.
4. A password reset activates a legacy `PENDING_VERIFICATION` or `LOCKED`
   staff account; a `DISABLED` account remains disabled until separately
   restored by an administrator. Resetting a pending account consumes its
   outstanding setup challenges. If that legacy account is the assigned Branch
   Admin, the branch is activated as part of setup completion.
5. New accounts do not receive invitation/setup links. Existing email-change
   verification remains a separate one-time link flow. Pending accounts left
   from the previous lifecycle must be activated through an administrator-set
   password; the public staff invitation-accept endpoint and page are retired.
6. Branch assignment remains one branch for every non-Super-Admin staff
   account. Creating the Branch Admin for an inactive branch completes that
   branch's initial administrator assignment and activates the branch, as the
   prior invitation-acceptance flow did.

## Alternatives considered

- Keep invitations and let users choose their password: rejected because the
  owner explicitly requires administrators to create accounts and set
  passwords.
- Add a user self-service password-change or recovery flow: rejected because
  the owner explicitly prohibits staff password changes.
- Allow an administrator to reset their own password through this route:
  rejected because credential administration is scoped to another account and
  resetting one's own account would invalidate the acting session.

## Consequences

- Administrators are responsible for communicating initial and reset passwords
  through a secure channel. The Admin UI displays a password only while it is
  being entered; it is not recoverable after submission.
- Lost passwords require a scoped administrator reset. That reset immediately
  invalidates the account's current sessions.
- The existing role hierarchy, per-user permission behavior, branch scopes,
  reversible disable policy, and audit history remain in force.
- No database schema change is required. Existing pending accounts can be
  converted through the password-reset operation.
- Customer password rules and customer self-service endpoints are unchanged.
- No deployment or remote database operation is authorized.

## Migration plan

1. Replace the Admin user's invitation form with direct account creation and
   administrator-set password fields.
2. Change `POST /admin/users` to validate and persist the password hash in the
   existing transaction with status `ACTIVE`, roles, branch scope, permissions,
   and audit event.
3. Add an authorized admin password-reset endpoint with self-reset rejection,
   session revocation, and audit logging.
4. Retire the staff invitation acceptance and resend paths while retaining the
   separate email-change confirmation flow.
5. Update the Admin lifecycle documentation and generated OpenAPI contract.

## Documents/code affected

- `fastfood-project-docs/02-ACTORS_ROLES_RBAC.md`
- `fastfood-project-docs/admin-panel/ADMIN_PANEL_CRUD_AND_INTERACTION_SPEC.md`
- `docs/admin-rebuild/04_ADMIN_CAPABILITY_MATRIX.md`
- `docs/admin-rebuild/12_ADMIN_HUMAN_QA_CHECKLIST.md`
- `apps/api/src/modules/admin/admin-user.controller.ts`
- `apps/api/src/modules/admin/admin-user.service.ts`
- `apps/api/src/modules/auth/staff/staff-auth.controller.ts`
- `apps/api/src/modules/auth/staff/staff-auth.service.ts`
- `apps/admin-web/src/app/users/`
- `apps/admin-web/src/app/invite/accept/page.tsx` (removed); email-change confirmation remains available at `/invite/confirm-email`.
