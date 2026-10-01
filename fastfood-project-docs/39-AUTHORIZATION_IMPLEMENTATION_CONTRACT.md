# Authorization Implementation Contract

## 1. Objective

Authorization must be predictable and composable. This contract defines the required backend enforcement sequence and naming so separate coding sessions do not invent incompatible guard systems.

## 2. Canonical protection sequence

For protected staff endpoints:

```text
AuthGuard
  -> AccountStatusGuard
  -> RbacGuard
  -> ResourceScopeGuard / resource policy
  -> domain-specific transition policy
```

Not every endpoint needs every guard, but equivalent checks must occur in this logical order.

## 3. Canonical components

### `AuthGuard`

Responsibilities:

- verify access token/session identity,
- attach authenticated principal,
- reject expired/invalid credentials.

It does not decide branch scope.

### `AccountStatusGuard`

Responsibilities:

- ensure staff/customer identity is active,
- ensure session has not been revoked,
- enforce relevant staff-account restrictions.

### `RbacGuard`

Responsibilities:

- read required permission metadata,
- resolve effective permissions,
- reject missing capability.

Canonical decorator concept:

```ts
@RequirePermissions('orders.read')
```

Admin routes additionally require the canonical menu page action associated
with the route: `admin.page.<page>.view|create|update|delete`. The page keys
are declared explicitly in the shared permissions registry. Existing sensitive
business permissions are additive requirements. `SUPER_ADMIN` is the only
staff role that bypasses permission checks.

### `ResourceScopeGuard` / policy

Responsibilities:

- enforce branch scope,
- ownership,
- courier assignment scope,
- other resource-specific access.

Reusable policy helpers may include:

- `BranchScopePolicy`
- `OrderAccessPolicy`
- `CourierDeliveryPolicy`
- `CustomerOwnershipPolicy`

Do not create dozens of unrelated guard naming schemes for each controller.

## 4. Branch scope

Branch-scoped queries must apply scope at query/service level, not fetch all and filter in frontend.

Example:

```text
principal.branchIds = [A, B]
GET /admin/orders?branchId=C
=> 403 if C is not allowed, or query constrained to allowed branches according to endpoint contract
```

Admin staff are assigned at most one branch. Every active non-Super-Admin staff
account must be assigned exactly one branch. A Super Admin has global scope.
Branch-scoped list services apply the principal's branch ID in their database
query even when a caller omits `branchId`; a missing scope never means global
access. Branch administrators are unique per branch, and only Super Admin can
appoint or transfer that assignment.

For a single-resource endpoint, unauthorized access should not leak sensitive existence information unnecessarily.

## 5. Customer ownership

Customer access to `/orders/:id` must validate ownership. Knowing an order UUID/order number does not grant access.

Guest order access requires a secure guest-access credential tied to the order/checkout.

## 6. Courier scope

Courier may access:

- own assigned active/history deliveries,
- limited eligible claim resource through secure QR claim endpoint.

Courier cannot query an arbitrary delivery and receive customer details before authorization.

## 7. Permission cache

Permission caching may use Redis, but database/identity state remains authoritative. Cache invalidation occurs on role/scope change. Security must fail safely if cache is unavailable.

## 8. Frontend permission UX

Frontend may use effective permissions to hide/disable unavailable actions, but backend always repeats enforcement.

The current effective-permission payload drives menu visibility, direct-route
gating, and CRUD controls. Individual grants replace the user's role-derived
permissions once custom-permission mode is enabled. This remains a UX layer;
the API applies the same page/action and sensitive-operation checks.

## 9. High-risk actions

Refund, privilege changes, production settings, and manual financial/loyalty adjustments require dedicated permissions and audit reason where configured.

## 10. Tests

Each protected resource must include negative tests for:

- unauthenticated,
- authenticated without permission,
- permission but wrong branch/resource scope,
- correct permission and scope.
