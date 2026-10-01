# Actors, Roles, Permissions, and Scope Model

## 1. Actor classes

FASTFOOD distinguishes between customer identities and staff identities.

### Customer actors

- Guest Customer
- Registered Customer

### Staff actors

- Super Admin
- Head Office Admin
- Catalog Manager
- Finance/Payment Operator
- Reporting User
- Courier Manager
- Branch Manager
- Branch Operator / Kitchen Operator
- Courier

Roles are not hardcoded as authorization logic. Authorization is permission-based, with roles acting as permission bundles.

For Admin / Operations staff, the owner-approved three-tier account structure
is defined by ADR-015:

- `SUPER_ADMIN` has global branch scope and all administrative permissions.
- `BRANCH_ADMIN` administers one branch and may manage that branch's staff and
  their delegated permissions. A branch has at most one assigned branch admin.
- `BRANCH_USER` is an ordinary staff account assigned to exactly one branch.

Other catalog/finance/operations roles remain reusable permission bundles.
Ordinary staff permission edits are per-user overrides; they do not change the
shared role bundle.

## 2. Permission model

A permission is a stable capability string such as:

- `catalog.products.read`
- `catalog.products.write`
- `catalog.prices.write`
- `branches.read`
- `branches.write`
- `orders.read`
- `orders.update_status`
- `orders.reassign_branch`
- `payments.read`
- `payments.refund`
- `loyalty.settings.write`
- `reports.read`
- `couriers.read`
- `couriers.assign`
- `audit.read`

Permission names use lower-case dotted namespaces. Permissions must not be inferred from UI routes.

The canonical Admin menu permission registry explicitly lists page keys. Each
page exposes separate `admin.page.<page>.view`, `.create`, `.update`, and
`.delete` permission codes. Unsupported actions are not granted or rendered.
Sensitive operations (for example `payments.refund` and
`orders.reassign_branch`) remain separate permissions in addition to the page
action grant.

## 3. Resource scope

Permission alone is insufficient. Staff access also depends on resource scope.

Canonical scope dimensions include:

- organization-wide,
- branch set,
- own courier identity,
- own customer identity,
- resource ownership.

Examples:

- A Branch Manager may have `orders.read`, but only for orders whose current branch is in the manager's branch scope.
- A Courier may read only delivery jobs assigned to that courier or explicitly available for secure QR claim.
- A Customer may read only orders owned by that customer account or an authorized guest-order access token.

## 4. Default role intent

| Role | Default scope | Typical capabilities |
|---|---|---|
| Super Admin | Global | All administrative capabilities, security-sensitive actions |
| Branch Admin | Exactly one assigned branch | Own-branch operations, staff account creation, user permission management |
| Branch User | Exactly one assigned branch | Only the pages and actions granted for that branch |
| Courier | Own identity | Own delivery tasks and eligible secure claim actions |

Additional page and action grants are assigned to individual staff accounts;
branch admins cannot grant a capability they do not currently hold.

## 5. Locked restrictions

- Branch staff cannot edit central product prices unless explicitly granted a separate global permission, which is not part of default branch roles.
- Branch staff cannot view data for branches outside their scope.
- Admin staff belong to no more than one branch; all non-Super-Admin staff
  belong to exactly one branch. Super Admin is global and does not require a
  branch assignment.
- Branch administrators can manage only staff in their own branch and can
  grant only permissions they hold. Only Super Admin can appoint/transfer a
  branch administrator or grant the Super Admin role.
- Staff accounts are created directly by an authorized administrator with an
  initial password. Staff cannot change their own password; an authorized
  administrator may reset another staff member's password within scope. A
  reset revokes the target's active sessions. See ADR-016.
- Courier users cannot browse arbitrary customer records.
- Customer support-style impersonation is not included in V1.
- UI visibility does not replace API authorization.
- Every sensitive mutation must be authorized again at the API boundary.

## 6. Scope changes

Changing a user's role or branch scope must:

1. create an audit record,
2. invalidate or refresh effective permission cache,
3. take effect on the next protected request,
4. optionally revoke active sessions for high-risk privilege removal.

## 7. Separation of duties

High-risk actions such as refunds, user privilege changes, and production configuration changes must be separately permissioned. A user who can view payments does not automatically gain refund permission.

Detailed guard behavior is locked in `39-AUTHORIZATION_IMPLEMENTATION_CONTRACT.md`.
