# ADR-015: Branch administrators and per-user page permissions

Status: Accepted  
Date: 2026-09-25  
Decision owners: Human owner (explicit instruction in chat on 2026-09-25)

## Context

The owner defined three staff levels: a global Super Admin, one administrator
for each branch, and staff users assigned to one branch. Each menu page must
be independently grantable per user, with separate view, create, update, and
delete capabilities where that page supports the action. Existing
`RolePermission` bundles and coarse feature permissions cannot express that
model by themselves. Existing `UserBranchScope` permits more than one branch
per staff member and does not identify each branch's administrator.

## Decision

1. A staff account has zero or one branch scope. Ordinary staff and branch
   administrators must have exactly one assigned branch. A Super Admin is
   global and may have no branch scope. Database uniqueness and service
   validation enforce the limit; ambiguous legacy multi-branch assignments
   fail closed until corrected.
2. `BranchAdministrator` records the single administrator assigned to a
   branch. It is unique by both branch and user. A branch can be awaiting its
   first administrator while existing local data is reconciled; new active
   branches must have an administrator. A transfer is an atomic replacement
   that revokes the previous branch-admin role and assigns the new one.
3. Roles remain reusable baseline bundles. When `customPermissionsEnabled` is
   false, effective permissions come from active roles. When true, the user's
   direct permission assignments replace role permissions, including when the
   explicit set is empty. This lets an administrator grant or remove each
   user's access without changing a shared role.
4. Every admin menu item has stable `admin.page.<page>.view`, `.create`,
   `.update`, and `.delete` permission codes. Page keys are an explicit
   canonical registry, not inferred from arbitrary URLs. Sensitive business
   actions such as refunds and order reassignment keep their own permission
   codes and are enforced in addition to page/action permissions.
5. `SUPER_ADMIN` bypasses permission and branch-scope checks. Only a Super
   Admin may grant or transfer `BRANCH_ADMIN` or `SUPER_ADMIN`. A branch
   administrator can manage users in their own branch and may grant only
   permissions they currently hold. Branch admins cannot manage global roles
   or global system settings.
6. API authorization remains authoritative. The admin UI uses the same
   effective-permission response to hide inaccessible menu pages and block
   direct page navigation. Every admin mutation is checked against its page
   action permission at the API boundary. Branch-owned queries are constrained
   by the authenticated branch scope in the service/query layer.
7. Permission changes take effect on the next request and are audited.
   Account disable is reversible, rejects disabling oneself or a branch's
   only assigned administrator, and revokes active sessions. Super Admin role
   removal and account disable both protect the last active Super Admin.

## Alternatives considered

- Add a role record for every user: rejected because it duplicates reusable
  roles and makes user-specific grants appear as shared roles.
- Treat role membership as user permission editing: rejected because it
  cannot independently remove one page/action from one user.
- Enforce page access only in the frontend: rejected because it does not
  protect API data or mutations.
- Keep multiple branches per staff user: rejected because it conflicts with
  the owner's one-user/one-branch rule.

## Consequences

- A Prisma migration is required for direct permission grants, single-branch
  uniqueness, and branch-administrator assignments. It backfills existing
  valid `BRANCH_ADMIN` assignments and fails rather than choosing a branch
  when legacy duplicate scopes, branch administrators, or dual Super Admin /
  Branch Admin roles exist.
- Existing branches without an administrator must be assigned one before
  they can be newly activated; local existing branches are surfaced for
  administrator assignment.
- Existing feature permissions remain for sensitive operations and are
  included in the user's permission editor.
- Customer-facing apps are unchanged; the scope applies to admin/staff
  authorization and branch-owned operational data.
- No deployment or remote migration is authorized.

## Migration plan

1. Add branch-administrator and direct per-user permission tables, the custom
   permission mode flag, and one-branch uniqueness with a duplicate-data
   precondition.
2. Rename the seeded `HQ_ADMIN` system role to `SUPER_ADMIN`; seed canonical
   page/action permissions and the `BRANCH_ADMIN` / `BRANCH_USER` bundles.
3. Update staff principal resolution, guards, user lifecycle routes, branch
   scoped query paths, and admin navigation/permission editor.
4. Keep the migration local and unapplied to any remote database. Human QA
   must verify Super Admin, branch admin, and ordinary staff accounts.

## Documents / code affected

- `fastfood-project-docs/02-ACTORS_ROLES_RBAC.md`
- `fastfood-project-docs/39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md`
- `apps/api/prisma/schema.prisma` and the canonical Prisma migration
- `apps/api/src/modules/auth/`
- `apps/api/src/modules/admin/`
- `apps/admin-web/src/components/ops/`
- `apps/admin-web/src/app/users/`
- `packages/domain-types/src/permissions.ts`
